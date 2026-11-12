/**
 * Pembangkit data simulasi deterministik statistik peternakan
 * Menggunakan seed konstan agar angka 100% konsisten antar sesi.
 */

import { LivestockRecord } from '../types/livestock';
import { REGIONS, LIVESTOCK_TYPES } from './constants';

/**
 * Mulberry32 PRNG dengan seed tetap 42
 */
function createPRNG(seed: number) {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateSimulationData(): LivestockRecord[] {
  const prng = createPRNG(424242);
  const records: LivestockRecord[] = [];
  const years = [2019, 2020, 2021, 2022, 2023, 2024];

  for (const year of years) {
    for (const region of REGIONS) {
      // Kasus uji sengaja: hapus semua baris Kota Singkawang tahun 2019
      if (year === 2019 && region.name === 'Kota Singkawang') {
        continue;
      }

      for (const livestock of LIVESTOCK_TYPES) {
        // Derau acak deterministik +/- 3% (kisaran 0.97 - 1.03)
        const noise = 0.97 + prng() * 0.06;

        // Pertumbuhan eksponensial relatif terhadap tahun dasar 2024
        const yearDiff = year - 2024;
        const growthFactor = Math.pow(1 + livestock.growth, yearDiff);

        // Populasi dihitung dan dibulatkan ke bilangan bulat
        const rawPopulasi =
          livestock.pop2024 * region.weight * growthFactor * noise;
        const populasi = Math.max(1, Math.round(rawPopulasi));

        // Pemotongan
        const rawPemotongan = populasi * livestock.ratioSlaughter;
        const pemotongan = Math.max(0, Math.round(rawPemotongan));

        // Produksi Daging
        const produksiDaging = Math.max(0, Math.round(pemotongan * livestock.meatWeight));

        // Produksi Telur (null untuk ternak tanpa produksi telur)
        const produksiTelur =
          livestock.eggYieldPerHead !== null
            ? Math.max(0, Math.round(populasi * livestock.eggYieldPerHead))
            : null;

        records.push({
          id: `${year}-${region.name}-${livestock.name}`,
          tahun: year,
          kabupatenKota: region.name,
          jenisTernak: livestock.name,
          populasi,
          pemotongan,
          produksiDaging,
          produksiTelur,
        });
      }
    }
  }

  return records;
}

/**
 * Format CSV 7 kolom standar
 */
export function recordsToCSV(records: LivestockRecord[]): string {
  const headers = [
    'Tahun',
    'Kabupaten/Kota',
    'Jenis Ternak',
    'Populasi (ekor)',
    'Pemotongan (ekor)',
    'Produksi Daging (kg)',
    'Produksi Telur (kg)',
  ];

  const rows = records.map((r) => [
    r.tahun,
    `"${r.kabupatenKota}"`,
    `"${r.jenisTernak}"`,
    r.populasi,
    r.pemotongan,
    r.produksiDaging,
    r.produksiTelur !== null ? r.produksiTelur : '',
  ]);

  return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
}

/**
 * Templat CSV dengan contoh baris untuk uji unggah pengelola
 */
export function getCSVTemplate(): string {
  return [
    'Tahun,Kabupaten/Kota,Jenis Ternak,Populasi (ekor),Pemotongan (ekor),Produksi Daging (kg),Produksi Telur (kg)',
    '2024,Kubu Raya,Sapi,22800,2736,410400,',
    '2024,Kubu Raya,Kambing,18000,5400,75600,',
    '2024,Kubu Raya,Babi,72000,57600,4032000,',
    '2024,Kubu Raya,Ayam Ras Pedaging,2640000,11880000,14256000,',
    '2024,Kubu Raya,Ayam Ras Petelur,180000,90000,126000,3060000',
    '2024,Kubu Raya,Itik,84000,50400,50400,756000',
    '2024,Kota Pontianak,Sapi,5700,684,102600,',
    '2024,Kota Pontianak,Ayam Ras Petelur,45000,22500,31500,765000',
  ].join('\n');
}
