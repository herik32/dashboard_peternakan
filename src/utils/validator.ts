/**
 * Validator dan Parser CSV Data Statistik Peternakan
 * Memeriksa 7 kolom wajib, tipe angka, duplikasi, kelengkapan, dan aturan fisik.
 */

import {
  LivestockRecord,
  QualityIssue,
  ValidationResult,
} from '../types/livestock';
import { REGION_NAMES, LIVESTOCK_NAMES, MANDATORY_CSV_HEADERS } from './constants';

/**
 * Normalisasi nama header agar toleran terhadap spasi dan kapitalisasi
 */
function normalizeHeader(header: string): string {
  return header.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Parsing baris CSV dengan dukungan tanda kutip
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

export function validateRecords(records: LivestockRecord[]): ValidationResult {
  const issues: QualityIssue[] = [];

  if (records.length === 0) {
    issues.push({
      severity: 'error',
      category: 'Kelengkapan',
      message: 'Berkas data kosong. Tidak ada baris yang dapat dimuat.',
    });
    return {
      isValid: false,
      issues,
      totalRows: 0,
      yearRange: null,
      kabupatenList: [],
      jenisTernakList: [],
    };
  }

  const seenKeys = new Map<string, number>();
  const yearsSet = new Set<number>();
  const kabSet = new Set<string>();
  const jenisSet = new Set<string>();

  records.forEach((rec, idx) => {
    const rowNum = idx + 2; // Mengingat baris 1 adalah header

    yearsSet.add(rec.tahun);
    kabSet.add(rec.kabupatenKota);
    jenisSet.add(rec.jenisTernak);

    // Cek nilai negatif
    if (rec.populasi < 0) {
      issues.push({
        severity: 'error',
        category: 'Nilai',
        rowNumber: rowNum,
        message: `Nilai Populasi negatif (${rec.populasi}) pada baris ${rowNum}.`,
      });
    }
    if (rec.pemotongan < 0) {
      issues.push({
        severity: 'error',
        category: 'Nilai',
        rowNumber: rowNum,
        message: `Nilai Pemotongan negatif (${rec.pemotongan}) pada baris ${rowNum}.`,
      });
    }
    if (rec.produksiDaging < 0) {
      issues.push({
        severity: 'error',
        category: 'Nilai',
        rowNumber: rowNum,
        message: `Nilai Produksi Daging negatif (${rec.produksiDaging}) pada baris ${rowNum}.`,
      });
    }
    if (rec.produksiTelur !== null && rec.produksiTelur < 0) {
      issues.push({
        severity: 'error',
        category: 'Nilai',
        rowNumber: rowNum,
        message: `Nilai Produksi Telur negatif (${rec.produksiTelur}) pada baris ${rowNum}.`,
      });
    }

    // Peringatan Pemotongan > Populasi (Wajar untuk unggas pedaging siklus ganda, tetap catat peringatan)
    if (rec.pemotongan > rec.populasi) {
      issues.push({
        severity: 'warning',
        category: 'Peringatan Fisik',
        rowNumber: rowNum,
        message: `Pemotongan (${rec.pemotongan.toLocaleString('id-ID')} ekor) melebihi populasi (${rec.populasi.toLocaleString('id-ID')} ekor) pada ${rec.kabupatenKota} (${rec.jenisTernak}, ${rec.tahun}). Wajar jika ternak memiliki beberapa siklus panen setahun.`,
      });
    }

    // Pengecekan nama tidak baku / tidak seragam
    const matchedRegion = REGION_NAMES.find(
      (r) => r.toLowerCase() === rec.kabupatenKota.toLowerCase()
    );
    if (!matchedRegion) {
      issues.push({
        severity: 'warning',
        category: 'Nilai',
        rowNumber: rowNum,
        message: `Nama Kabupaten/Kota "${rec.kabupatenKota}" tidak termasuk dalam 14 wilayah baku Kalimantan Barat.`,
      });
    }

    const matchedLivestock = LIVESTOCK_NAMES.find(
      (l) => l.toLowerCase() === rec.jenisTernak.toLowerCase()
    );
    if (!matchedLivestock) {
      issues.push({
        severity: 'warning',
        category: 'Nilai',
        rowNumber: rowNum,
        message: `Nama Jenis Ternak "${rec.jenisTernak}" tidak termasuk dalam daftar 6 komoditas baku.`,
      });
    }

    // Pengecekan baris ganda
    const key = `${rec.tahun}-${rec.kabupatenKota.toLowerCase()}-${rec.jenisTernak.toLowerCase()}`;
    if (seenKeys.has(key)) {
      const prevRow = seenKeys.get(key);
      issues.push({
        severity: 'error',
        category: 'Duplikasi',
        rowNumber: rowNum,
        message: `Duplikasi data ditemukan pada baris ${rowNum} untuk Tahun ${rec.tahun}, Wilayah ${rec.kabupatenKota}, Jenis ${rec.jenisTernak} (sama dengan baris ${prevRow}).`,
      });
    } else {
      seenKeys.set(key, rowNum);
    }
  });

  // Pengecekan kelengkapan data per wilayah per tahun
  const yearsArr = Array.from(yearsSet).sort((a, b) => a - b);
  for (const year of yearsArr) {
    for (const reg of REGION_NAMES) {
      const hasData = records.some(
        (r) => r.tahun === year && r.kabupatenKota.toLowerCase() === reg.toLowerCase()
      );
      if (!hasData) {
        issues.push({
          severity: 'warning',
          category: 'Kelengkapan',
          message: `Tidak ada catatan data untuk wilayah ${reg} pada tahun ${year}.`,
          detail: 'Nilai pada dashboard untuk wilayah dan tahun ini akan ditampilkan sebagai "Tidak ada data".',
        });
      }
    }
  }

  const hasErrors = issues.some((i) => i.severity === 'error');
  const yearRange: [number, number] | null =
    yearsArr.length > 0 ? [yearsArr[0], yearsArr[yearsArr.length - 1]] : null;

  return {
    isValid: !hasErrors,
    issues,
    totalRows: records.length,
    yearRange,
    kabupatenList: Array.from(kabSet).sort(),
    jenisTernakList: Array.from(jenisSet).sort(),
  };
}

export function parseCSVtoRecords(csvContent: string): {
  records: LivestockRecord[];
  validation: ValidationResult;
} {
  const lines = csvContent
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) {
    const emptyResult: ValidationResult = {
      isValid: false,
      issues: [
        {
          severity: 'error',
          category: 'Kelengkapan',
          message: 'Berkas CSV minimal harus memiliki 1 baris header dan 1 baris data.',
        },
      ],
      totalRows: 0,
      yearRange: null,
      kabupatenList: [],
      jenisTernakList: [],
    };
    return { records: [], validation: emptyResult };
  }

  const headerLine = lines[0];
  const headers = parseCSVLine(headerLine);
  const normalizedHeaders = headers.map(normalizeHeader);

  // Verifikasi 7 kolom wajib
  const missingHeaders: string[] = [];
  const columnIndexMap: Record<string, number> = {};

  for (const reqHeader of MANDATORY_CSV_HEADERS) {
    const normReq = normalizeHeader(reqHeader);
    const foundIdx = normalizedHeaders.findIndex(
      (h) => h === normReq || h.replace(/\s*\(.*?\)/, '') === normReq.replace(/\s*\(.*?\)/, '')
    );

    if (foundIdx === -1) {
      missingHeaders.push(reqHeader);
    } else {
      columnIndexMap[reqHeader] = foundIdx;
    }
  }

  if (missingHeaders.length > 0) {
    const missingResult: ValidationResult = {
      isValid: false,
      issues: [
        {
          severity: 'error',
          category: 'Kolom',
          message: `Berkas ditolak. Kolom wajib berikut tidak ditemukan: ${missingHeaders.join(', ')}.`,
          detail: `Wajib memiliki 7 kolom: ${MANDATORY_CSV_HEADERS.join(', ')}.`,
        },
      ],
      totalRows: lines.length - 1,
      yearRange: null,
      kabupatenList: [],
      jenisTernakList: [],
    };
    return { records: [], validation: missingResult };
  }

  const records: LivestockRecord[] = [];
  const parsingIssues: QualityIssue[] = [];

  for (let i = 1; i < lines.length; i++) {
    const rowNum = i + 1;
    const cols = parseCSVLine(lines[i]);

    if (cols.length < 3) {
      // Baris rusak/kosong
      continue;
    }

    const rawTahun = cols[columnIndexMap['Tahun']];
    const rawKab = cols[columnIndexMap['Kabupaten/Kota']];
    const rawJenis = cols[columnIndexMap['Jenis Ternak']];
    const rawPop = cols[columnIndexMap['Populasi (ekor)']];
    const rawPot = cols[columnIndexMap['Pemotongan (ekor)']];
    const rawDag = cols[columnIndexMap['Produksi Daging (kg)']];
    const rawTel = cols[columnIndexMap['Produksi Telur (kg)']];

    const tahun = parseInt(rawTahun, 10);
    if (isNaN(tahun) || tahun < 1900 || tahun > 2100) {
      parsingIssues.push({
        severity: 'error',
        category: 'Nilai',
        rowNumber: rowNum,
        message: `Format Tahun tidak valid ("${rawTahun}") pada baris ${rowNum}.`,
      });
    }

    if (!rawKab || rawKab.trim() === '') {
      parsingIssues.push({
        severity: 'error',
        category: 'Nilai',
        rowNumber: rowNum,
        message: `Kabupaten/Kota kosong pada baris ${rowNum}.`,
      });
    }

    if (!rawJenis || rawJenis.trim() === '') {
      parsingIssues.push({
        severity: 'error',
        category: 'Nilai',
        rowNumber: rowNum,
        message: `Jenis Ternak kosong pada baris ${rowNum}.`,
      });
    }

    const cleanNum = (str: string | undefined): number => {
      if (!str) return 0;
      // tangani titik ribuan atau koma
      const cleaned = str.replace(/\./g, '').replace(/,/g, '.').trim();
      return parseFloat(cleaned);
    };

    const populasi = cleanNum(rawPop);
    if (isNaN(populasi)) {
      parsingIssues.push({
        severity: 'error',
        category: 'Nilai',
        rowNumber: rowNum,
        message: `Populasi harus berupa angka pada baris ${rowNum}.`,
      });
    }

    const pemotongan = cleanNum(rawPot);
    if (isNaN(pemotongan)) {
      parsingIssues.push({
        severity: 'error',
        category: 'Nilai',
        rowNumber: rowNum,
        message: `Pemotongan harus berupa angka pada baris ${rowNum}.`,
      });
    }

    const produksiDaging = cleanNum(rawDag);
    if (isNaN(produksiDaging)) {
      parsingIssues.push({
        severity: 'error',
        category: 'Nilai',
        rowNumber: rowNum,
        message: `Produksi Daging harus berupa angka pada baris ${rowNum}.`,
      });
    }

    let produksiTelur: number | null = null;
    if (rawTel !== undefined && rawTel.trim() !== '') {
      const val = cleanNum(rawTel);
      if (isNaN(val)) {
        parsingIssues.push({
          severity: 'error',
          category: 'Nilai',
          rowNumber: rowNum,
          message: `Produksi Telur harus berupa angka atau dikosongkan pada baris ${rowNum}.`,
        });
      } else {
        produksiTelur = val;
      }
    }

    records.push({
      id: `${tahun}-${rawKab}-${rawJenis}-${rowNum}`,
      tahun,
      kabupatenKota: rawKab,
      jenisTernak: rawJenis,
      populasi: isNaN(populasi) ? 0 : populasi,
      pemotongan: isNaN(pemotongan) ? 0 : pemotongan,
      produksiDaging: isNaN(produksiDaging) ? 0 : produksiDaging,
      produksiTelur,
    });
  }

  const baseValidation = validateRecords(records);
  const allIssues = [...parsingIssues, ...baseValidation.issues];
  const hasErrors = allIssues.some((i) => i.severity === 'error');

  return {
    records,
    validation: {
      ...baseValidation,
      isValid: !hasErrors,
      issues: allIssues,
    },
  };
}
