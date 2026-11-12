/**
 * Tipe data untuk Dashboard Statistik Peternakan Kalimantan Barat
 * Berdasarkan 7 kolom wajib statistik peternakan
 */

export interface LivestockRecord {
  id?: string;
  tahun: number; // Tahun
  kabupatenKota: string; // Kabupaten/Kota
  jenisTernak: string; // Jenis Ternak
  populasi: number; // Populasi (ekor)
  pemotongan: number; // Pemotongan (ekor)
  produksiDaging: number; // Produksi Daging (kg)
  produksiTelur: number | null; // Produksi Telur (kg) - null jika tidak menghasilkan telur
}

export type UserRole = 'pimpinan' | 'pengelola';

export type UploadMode = 'overwrite' | 'append';

export interface FilterState {
  tahun: number | 'Semua';
  kabupatenKota: string; // 'Seluruh Provinsi' atau nama kab/kota spesifik
  jenisTernak: string; // 'Semua Jenis' atau nama jenis ternak spesifik
}

export type IssueSeverity = 'error' | 'warning';

export interface QualityIssue {
  severity: IssueSeverity;
  category: 'Kolom' | 'Nilai' | 'Duplikasi' | 'Kelengkapan' | 'Peringatan Fisik';
  rowNumber?: number;
  message: string;
  detail?: string;
}

export interface ValidationResult {
  isValid: boolean;
  issues: QualityIssue[];
  totalRows: number;
  yearRange: [number, number] | null;
  kabupatenList: string[];
  jenisTernakList: string[];
}

export interface MetricSummary {
  populasi: number | null;
  pemotongan: number | null;
  produksiDaging: number | null;
  produksiTelur: number | null;
  rowCount: number;
}
