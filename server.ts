import 'dotenv/config';
import express from 'express';
import type { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;

interface QASchemaPayload {
  years: number[];
  regions: string[];
  livestockTypes: string[];
}

interface QAHistoryItem {
  question: string;
  summary: string;
}

interface QARequestBody {
  question: string;
  schema: QASchemaPayload;
  activeFilters?: {
    tahun?: number | 'Semua';
    kabupatenKota?: string;
    jenisTernak?: string;
  };
  history?: QAHistoryItem[];
}

function createGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function generateWithRetry<T>(fn: () => Promise<T>, maxRetries = 2): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      lastError = err;
      const errObj = err as { status?: number; message?: string };
      const status = errObj?.status;
      // Jangan retry jika error 400/401/403/404 (kesalahan klien/kunci/model)
      if (status && status >= 400 && status < 500 && status !== 429) {
        throw err;
      }
      if (attempt < maxRetries) {
        const delayMs = 600 * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }
  throw lastError;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  // Endpoint Tanya-Jawab Bahasa Alami Statistik Peternakan Kalbar
  app.post('/api/qa', async (req: Request, res: Response) => {
    try {
      const body = req.body as QARequestBody;
      const question = (body?.question ?? '').trim();

      if (!question) {
        res.status(400).json({ error: 'Pertanyaan tidak boleh kosong.' });
        return;
      }

      const schema: QASchemaPayload = {
        years: Array.isArray(body?.schema?.years) ? body.schema.years : [],
        regions: Array.isArray(body?.schema?.regions) ? body.schema.regions : [],
        livestockTypes: Array.isArray(body?.schema?.livestockTypes)
          ? body.schema.livestockTypes
          : [],
      };

      if (schema.years.length === 0 && schema.regions.length === 0) {
        res.status(400).json({
          error: 'Dataset saat ini kosong. Silakan muat atau unggah data CSV terlebih dahulu.',
        });
        return;
      }

      const ai = createGeminiClient();
      if (!ai) {
        res.status(500).json({
          error:
            'Kunci API Gemini belum dikonfigurasi pada server. Silakan periksa pengaturan di panel Settings > Secrets.',
        });
        return;
      }

      const historyText =
        Array.isArray(body.history) && body.history.length > 0
          ? body.history
              .slice(-3)
              .map((h, i) => `${i + 1}. Tanya: "${h.question}" -> Ringkasan: "${h.summary}"`)
              .join('\n')
          : 'Tidak ada riwayat sebelumnya.';

      const systemInstruction = `Anda adalah perencana kueri (query planner) untuk sistem analitik Dashboard Statistik Peternakan Provinsi Kalimantan Barat (Dinas Perkebunan dan Peternakan).
Tugas Anda adalah menerjemahkan pertanyaan bahasa alami (Bahasa Indonesia baku maupun kasual) menjadi Rencana Kueri JSON yang presisi agar mesin kalkulasi dapat menghitung angka secara eksak dari dataset.

Metadata dataset aktif yang tersedia:
- Tahun tersedia: ${JSON.stringify(schema.years)}
- Daftar Kabupaten/Kota resmi: ${JSON.stringify(schema.regions)}
- Daftar Jenis Ternak resmi: ${JSON.stringify(schema.livestockTypes)}
- Filter dashboard aktif saat ini (hanya sebagai konteks jika pengguna berkata "saat ini" atau "filter aktif"): ${JSON.stringify(body.activeFilters ?? {})}
- Metrik yang tersedia:
  * "populasi": Populasi ternak (satuan: ekor)
  * "pemotongan": Pemotongan ternak (satuan: ekor)
  * "produksiDaging": Produksi daging (satuan: kg)
  * "produksiTelur": Produksi telur (satuan: kg, hanya tersedia untuk unggas petelur/itik)
  * "semua": Seluruh keempat metrik di atas sekaligus

Riwayat percakapan terakhir (untuk pertanyaan lanjutan):
${historyText}

Aturan pemetaan kueri:
1. "intent":
   - "ranking": mencari tertinggi, terbanyak, terendah, tersedikit, peringkat, top N, atau siapa pemenang antar wilayah/jenis ternak.
   - "single_value": menanyakan total, jumlah, atau nilai spesifik untuk suatu kondisi.
   - "comparison": membandingkan dua atau lebih wilayah, jenis ternak, atau membandingkan seluruh wilayah/jenis ternak.
   - "trend": menanyakan perkembangan, tren, kenaikan, penurunan antar tahun / dari tahun ke tahun.
   - "composition": menanyakan proporsi, persentase, kontribusi, pangsa, komposisi per jenis ternak atau per wilayah.
   - "summary_table": meminta tabel rekapitulasi atau daftar lengkap data.
   - "out_of_scope": pertanyaan di luar topik statistik peternakan (misal cuaca, resep masakan, politik, dll).
2. Pencocokan entitas:
   - Petakan nama kabupaten/kota di pertanyaan ke daftar resmi pada "regions" (misal "Pontianak" -> "Kota Pontianak", "Singkawang" -> "Kota Singkawang", "Kubu Raya" -> "Kubu Raya"). Jika menanyakan "kabupaten mana", "seluruh provinsi", atau "semua wilayah", kosongkan array "regions" ([]).
   - Petakan jenis ternak di pertanyaan ke daftar resmi pada "livestockTypes" (misal "ayam pedaging"/"broiler" -> "Ayam Ras Pedaging", "ayam petelur" -> "Ayam Ras Petelur", "sapi" -> cocokkan ke item yang mengandung "Sapi" di livestockTypes). Jika menanyakan semua jenis ternak atau tidak menyebut komoditas spesifik, kosongkan array "livestockTypes" ([]).
   - Untuk "years": jika menyebut tahun spesifik (misal 2023) atau rentang (misal 2020-2023 -> [2020, 2021, 2022, 2023]), masukkan ke array. Jika tidak menyebut tahun:
     * Jika intent adalah "trend", biarkan "years" kosong ([]) dan set "useLatestYearIfUnspecified" = false agar seluruh tahun ditampilkan.
     * Jika intent selain "trend" (misal ranking/single_value/comparison/composition), set "useLatestYearIfUnspecified" = true (kecuali pengguna jelas meminta "semua tahun" / "keseluruhan tahun" / "total 5 tahun").
3. "groupBy":
   - Pertanyaan "Kabupaten mana..." -> groupBy = "kabupatenKota"
   - Pertanyaan "...per jenis ternak" / komposisi komoditas -> groupBy = "jenisTernak"
   - Pertanyaan "tren..." / "per tahun" -> groupBy = "tahun"
   - Pertanyaan total tunggal untuk 1 wilayah + 1 jenis ternak + 1 tahun -> groupBy = "none" (atau jika 1 tahun & semua jenis, bisa "jenisTernak" agar rincian tampil di tabel/grafik).
4. "sortOrder" & "highlightMode":
   - Jika "tertinggi"/"terbanyak"/"terbesar"/"paling banyak" -> sortOrder = "desc", highlightMode = "highest".
   - Jika "terendah"/"tersedikit"/"terkecil"/"paling sedikit" -> sortOrder = "asc", highlightMode = "lowest".
   - Jika "trend" / groupBy = "tahun" -> sortOrder = "year_asc", highlightMode = "none".
5. "preferredVisuals":
   - Pilih kombinasi visual yang paling informatif dari: "angka", "tabel", "grafik_batang", "grafik_garis", "grafik_donut".
   - Untuk ranking/perbandingan wilayah -> ["angka", "grafik_batang", "tabel"].
   - Untuk tren antar tahun -> ["angka", "grafik_garis", "tabel"].
   - Untuk komposisi/proporsi -> ["angka", "grafik_donut", "tabel"].
   - Untuk nilai tunggal/rekap -> ["angka", "tabel", "grafik_batang"].
6. Pastikan "title" singkat, jelas, dan berbahasa Indonesia baku.`;

      const response = await generateWithRetry(() =>
        ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: question,
          config: {
            systemInstruction,
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                intent: {
                  type: Type.STRING,
                  description:
                    'Salah satu dari: ranking, single_value, comparison, trend, composition, summary_table, out_of_scope',
                },
                metric: {
                  type: Type.STRING,
                  description:
                    'Salah satu dari: populasi, pemotongan, produksiDaging, produksiTelur, semua',
                },
                aggregation: {
                  type: Type.STRING,
                  description: 'Salah satu dari: sum, avg, max, min',
                },
                years: {
                  type: Type.ARRAY,
                  items: { type: Type.INTEGER },
                  description: 'Daftar tahun yang diminta, kosongkan jika semua tahun atau tahun terbaru otomatis',
                },
                useLatestYearIfUnspecified: {
                  type: Type.BOOLEAN,
                  description:
                    'True jika tahun tidak disebut dan pertanyaan merujuk pada kondisi snapshot tahun terbaru',
                },
                regions: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: 'Nama kabupaten/kota persis dari daftar resmi, kosongkan jika semua wilayah',
                },
                livestockTypes: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: 'Nama jenis ternak persis dari daftar resmi, kosongkan jika semua jenis ternak',
                },
                groupBy: {
                  type: Type.STRING,
                  description: 'Salah satu dari: kabupatenKota, jenisTernak, tahun, none',
                },
                sortOrder: {
                  type: Type.STRING,
                  description: 'Salah satu dari: desc, asc, year_asc, none',
                },
                limit: {
                  type: Type.INTEGER,
                  description: 'Jumlah baris jika pengguna menyebut angka seperti top 3 atau 5 besar; 0 untuk tampilkan semua',
                },
                highlightMode: {
                  type: Type.STRING,
                  description: 'Salah satu dari: highest, lowest, none',
                },
                preferredVisuals: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description:
                    'Daftar dari: angka, tabel, grafik_batang, grafik_garis, grafik_donut',
                },
                title: {
                  type: Type.STRING,
                  description: 'Judul singkat hasil analisis dalam Bahasa Indonesia baku',
                },
                outOfScopeReason: {
                  type: Type.STRING,
                  description: 'Penjelasan sopan jika intent adalah out_of_scope, selain itu string kosong',
                },
              },
              required: [
                'intent',
                'metric',
                'aggregation',
                'years',
                'useLatestYearIfUnspecified',
                'regions',
                'livestockTypes',
                'groupBy',
                'sortOrder',
                'limit',
                'highlightMode',
                'preferredVisuals',
                'title',
                'outOfScopeReason',
              ],
            },
          },
        })
      );

      const rawText = (response.text ?? '{}').trim();
      let plan: Record<string, unknown>;
      try {
        plan = JSON.parse(rawText);
      } catch {
        res.status(502).json({
          error: 'Format respons AI tidak valid. Silakan coba ajukan pertanyaan kembali.',
        });
        return;
      }

      res.json({ plan });
    } catch (error: unknown) {
      console.error('Error in /api/qa:', error);
      const errObj = error as { status?: number; message?: string };
      const status = errObj?.status ?? 500;
      const msg = errObj?.message ?? '';

      if (status === 403 || status === 400 || msg.includes('API_KEY') || msg.includes('PERMISSION_DENIED')) {
        res.status(status).json({
          error:
            'Kunci API Gemini tidak valid atau belum memiliki izin. Silakan periksa kunci API di panel Settings > Secrets.',
        });
        return;
      }

      if (status === 429 || msg.includes('RESOURCE_EXHAUSTED')) {
        res.status(429).json({
          error: 'Batas kuota permintaan AI tercapai sementara. Silakan tunggu beberapa saat lalu coba lagi.',
        });
        return;
      }

      res.status(500).json({
        error: 'Terjadi gangguan saat memproses pertanyaan Anda. Silakan coba beberapa saat lagi.',
      });
    }
  });

  // Setup Vite middleware untuk pengembangan atau sajikan dist di produksi
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server berjalan di http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Gagal memulai server:', err);
  process.exit(1);
});
