/**
 * Logika Agregasi Data Sesuai Matriks Perilaku Filter
 * dan Perhitungan Statistik untuk Grafik
 */

import { FilterState, LivestockRecord, MetricSummary } from '../types/livestock';
import { REGION_NAMES, LIVESTOCK_NAMES } from './constants';

const idNumberFormatter = new Intl.NumberFormat('id-ID');
const idPercentFormatter = new Intl.NumberFormat('id-ID', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export function formatIdNumber(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) {
    return 'Tidak ada data';
  }
  return idNumberFormatter.format(val);
}

export function formatIdPercent(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) {
    return '0%';
  }
  return `${idPercentFormatter.format(val)}%`;
}

export function isAllRegions(kabKota: string | undefined): boolean {
  if (!kabKota) return true;
  const k = kabKota.toLowerCase();
  return (
    k === 'seluruh provinsi' ||
    k === 'semua wilayah' ||
    k === 'seluruh wilayah' ||
    k === 'semua'
  );
}

export function isAllLivestock(jenis: string | undefined): boolean {
  if (!jenis) return true;
  const j = jenis.toLowerCase();
  return (
    j === 'semua jenis' ||
    j === 'semua komoditas' ||
    j === 'semua'
  );
}

/**
 * Filter data dasar sesuai kondisi filter
 */
export function filterRecords(
  records: LivestockRecord[],
  tahun?: number | 'Semua',
  kabupatenKota?: string,
  jenisTernak?: string
): LivestockRecord[] {
  return records.filter((r) => {
    if (tahun !== undefined && tahun !== 'Semua' && r.tahun !== tahun) {
      return false;
    }
    if (
      kabupatenKota !== undefined &&
      !isAllRegions(kabupatenKota) &&
      r.kabupatenKota.toLowerCase() !== kabupatenKota.toLowerCase()
    ) {
      return false;
    }
    if (
      jenisTernak !== undefined &&
      !isAllLivestock(jenisTernak) &&
      r.jenisTernak.toLowerCase() !== jenisTernak.toLowerCase()
    ) {
      return false;
    }
    return true;
  });
}

/**
 * F3: Kartu Ringkasan
 * Mengikuti KETIGA filter: Tahun, Kab/Kota, Jenis Ternak
 */
export function getSummaryMetrics(
  records: LivestockRecord[],
  filters: FilterState
): MetricSummary {
  const filtered = filterRecords(
    records,
    filters.tahun,
    filters.kabupatenKota,
    filters.jenisTernak
  );

  if (filtered.length === 0) {
    return {
      populasi: null,
      pemotongan: null,
      produksiDaging: null,
      produksiTelur: null,
      rowCount: 0,
    };
  }

  let totalPop = 0;
  let totalPot = 0;
  let totalDag = 0;
  let totalTel: number | null = null;
  let hasTelurData = false;

  for (const r of filtered) {
    totalPop += r.populasi;
    totalPot += r.pemotongan;
    totalDag += r.produksiDaging;
    if (r.produksiTelur !== null) {
      totalTel = (totalTel ?? 0) + r.produksiTelur;
      hasTelurData = true;
    }
  }

  return {
    populasi: totalPop,
    pemotongan: totalPot,
    produksiDaging: totalDag,
    produksiTelur: hasTelurData ? totalTel : null,
    rowCount: filtered.length,
  };
}

/**
 * F4: Grafik 1 - Tren (Line Chart)
 * TIDAK dipengaruhi filter Tahun (selalu 5 tahun terakhir yang tersedia pada data).
 * Dipengaruhi Kab/Kota dan Jenis Ternak.
 */
export interface TrendPoint {
  tahun: number;
  populasi: number | null;
  pemotongan: number | null;
  produksiDaging: number | null;
  produksiTelur: number | null;
  hasData: boolean;
}

export interface TrendDataResult {
  data: TrendPoint[];
  availableYearsCount: number;
  isLessThan5Years: boolean;
  yearsSpan: string;
}

export function getTrendData(
  records: LivestockRecord[],
  filters: FilterState
): TrendDataResult {
  // Ambil semua tahun unik yang ada pada data
  const allYears = Array.from(new Set(records.map((r) => r.tahun))).sort(
    (a, b) => a - b
  );

  // Ambil maksimal 5 tahun terakhir
  const last5Years =
    allYears.length <= 5 ? allYears : allYears.slice(allYears.length - 5);

  const isLessThan5Years = last5Years.length < 5;
  const yearsSpan =
    last5Years.length > 0
      ? `${last5Years[0]} - ${last5Years[last5Years.length - 1]}`
      : '-';

  const data: TrendPoint[] = last5Years.map((yr) => {
    // Filter hanya Kab/Kota dan Jenis Ternak (Tahun TIDAK berlaku dari filter pengguna)
    const matching = filterRecords(
      records,
      yr,
      filters.kabupatenKota,
      filters.jenisTernak
    );

    if (matching.length === 0) {
      return {
        tahun: yr,
        populasi: null,
        pemotongan: null,
        produksiDaging: null,
        produksiTelur: null,
        hasData: false,
      };
    }

    let pop = 0;
    let pot = 0;
    let dag = 0;
    let tel: number | null = null;
    let hasTelur = false;

    for (const r of matching) {
      pop += r.populasi;
      pot += r.pemotongan;
      dag += r.produksiDaging;
      if (r.produksiTelur !== null) {
        tel = (tel ?? 0) + r.produksiTelur;
        hasTelur = true;
      }
    }

    return {
      tahun: yr,
      populasi: pop,
      pemotongan: pot,
      produksiDaging: dag,
      produksiTelur: hasTelur ? tel : null,
      hasData: true,
    };
  });

  return {
    data,
    availableYearsCount: last5Years.length,
    isLessThan5Years,
    yearsSpan,
  };
}

/**
 * F5: Grafik 2 - Perbandingan Wilayah (Bar Chart Horizontal)
 * Berlaku Tahun, TIDAK Berlaku Kab/Kota (selalu tampil 14 kab/kota), Berlaku Jenis Ternak.
 * Wilayah yang dipilih pada filter diberi sorotan (isSelected = true).
 */
export interface RegionComparisonItem {
  kabupatenKota: string;
  populasi: number;
  pemotongan: number;
  produksiDaging: number;
  produksiTelur: number | null;
  isSelected: boolean;
  hasData: boolean;
}

export function getRegionalComparisonData(
  records: LivestockRecord[],
  filters: FilterState
): {
  items: RegionComparisonItem[];
  byPopulasi: RegionComparisonItem[];
  byPemotongan: RegionComparisonItem[];
  byDaging: RegionComparisonItem[];
  byTelur: RegionComparisonItem[];
  selectedRegion: string;
} {
  if (records.length === 0) {
    return {
      items: [],
      byPopulasi: [],
      byPemotongan: [],
      byDaging: [],
      byTelur: [],
      selectedRegion: filters.kabupatenKota,
    };
  }

  const currentYear =
    filters.tahun === 'Semua' || typeof filters.tahun !== 'number'
      ? Math.max(...records.map((r) => r.tahun))
      : filters.tahun;

  // Dapatkan daftar wilayah unik HANYA dari data yang sedang aktif
  const allRegions = Array.from(
    new Set(records.map((r) => r.kabupatenKota))
  ).sort((a, b) => a.localeCompare(b, 'id'));

  const items: RegionComparisonItem[] = allRegions.map((reg) => {
    // Ambil baris untuk wilayah ini dengan filter Tahun dan Jenis Ternak aktif
    const matching = filterRecords(
      records,
      currentYear,
      reg,
      filters.jenisTernak
    );

    const isSelected =
      !isAllRegions(filters.kabupatenKota) &&
      filters.kabupatenKota.toLowerCase() === reg.toLowerCase();

    if (matching.length === 0) {
      return {
        kabupatenKota: reg,
        populasi: 0,
        pemotongan: 0,
        produksiDaging: 0,
        produksiTelur: null,
        isSelected,
        hasData: false,
      };
    }

    let pop = 0;
    let pot = 0;
    let dag = 0;
    let tel: number | null = null;
    let hasTelur = false;

    for (const r of matching) {
      pop += r.populasi;
      pot += r.pemotongan;
      dag += r.produksiDaging;
      if (r.produksiTelur !== null) {
        tel = (tel ?? 0) + r.produksiTelur;
        hasTelur = true;
      }
    }

    return {
      kabupatenKota: reg,
      populasi: pop,
      pemotongan: pot,
      produksiDaging: dag,
      produksiTelur: hasTelur ? tel : null,
      isSelected,
      hasData: true,
    };
  });

  // Urutkan menurun untuk masing-masing indikator
  const byPopulasi = [...items].sort((a, b) => b.populasi - a.populasi);
  const byPemotongan = [...items].sort((a, b) => b.pemotongan - a.pemotongan);
  const byDaging = [...items].sort((a, b) => b.produksiDaging - a.produksiDaging);
  const byTelur = [...items]
    .filter((a) => a.produksiTelur !== null)
    .sort((a, b) => (b.produksiTelur ?? 0) - (a.produksiTelur ?? 0));

  return {
    items,
    byPopulasi,
    byPemotongan,
    byDaging,
    byTelur,
    selectedRegion: filters.kabupatenKota,
  };
}

/**
 * F6: Grafik 3 - Komposisi (Donut Chart)
 * Berlaku Tahun, Berlaku Kab/Kota, TIDAK Berlaku Jenis Ternak (menampilkan semua jenis).
 * Jenis ternak tanpa data telur tidak masuk donut telur.
 */
export interface CompositionItem {
  jenisTernak: string;
  value: number;
  percentage: number;
  isSelected: boolean;
}

export function getCompositionData(
  records: LivestockRecord[],
  filters: FilterState
): {
  populasiComposition: CompositionItem[];
  pemotonganComposition: CompositionItem[];
  meatComposition: CompositionItem[];
  eggComposition: CompositionItem[];
  totalPopulasi: number;
  totalPemotongan: number;
  totalMeat: number;
  totalEgg: number;
  selectedLivestock: string;
} {
  if (records.length === 0) {
    return {
      populasiComposition: [],
      pemotonganComposition: [],
      meatComposition: [],
      eggComposition: [],
      totalPopulasi: 0,
      totalPemotongan: 0,
      totalMeat: 0,
      totalEgg: 0,
      selectedLivestock: filters.jenisTernak,
    };
  }

  const currentYear =
    filters.tahun === 'Semua' || typeof filters.tahun !== 'number'
      ? Math.max(...records.map((r) => r.tahun))
      : filters.tahun;

  // Filter hanya Tahun dan Kab/Kota (Jenis Ternak TIDAK menyaring)
  const matching = filterRecords(
    records,
    currentYear,
    filters.kabupatenKota,
    'Semua Jenis'
  );

  // Agregasi per jenis ternak
  const populasiBySpecies = new Map<string, number>();
  const pemotonganBySpecies = new Map<string, number>();
  const meatBySpecies = new Map<string, number>();
  const eggBySpecies = new Map<string, number>();

  for (const r of matching) {
    const curPop = populasiBySpecies.get(r.jenisTernak) ?? 0;
    populasiBySpecies.set(r.jenisTernak, curPop + r.populasi);

    const curPot = pemotonganBySpecies.get(r.jenisTernak) ?? 0;
    pemotonganBySpecies.set(r.jenisTernak, curPot + r.pemotongan);

    const curMeat = meatBySpecies.get(r.jenisTernak) ?? 0;
    meatBySpecies.set(r.jenisTernak, curMeat + r.produksiDaging);

    if (r.produksiTelur !== null && r.produksiTelur > 0) {
      const curEgg = eggBySpecies.get(r.jenisTernak) ?? 0;
      eggBySpecies.set(r.jenisTernak, curEgg + r.produksiTelur);
    }
  }

  const totalPopulasi = Array.from(populasiBySpecies.values()).reduce((a, b) => a + b, 0);
  const totalPemotongan = Array.from(pemotonganBySpecies.values()).reduce((a, b) => a + b, 0);
  const totalMeat = Array.from(meatBySpecies.values()).reduce((a, b) => a + b, 0);
  const totalEgg = Array.from(eggBySpecies.values()).reduce((a, b) => a + b, 0);

  const createCompositionList = (map: Map<string, number>, total: number): CompositionItem[] => {
    return Array.from(map.entries())
      .map(([jenisTernak, value]) => ({
        jenisTernak,
        value,
        percentage: total > 0 ? (value / total) * 100 : 0,
        isSelected:
          !isAllLivestock(filters.jenisTernak) &&
          filters.jenisTernak.toLowerCase() === jenisTernak.toLowerCase(),
      }))
      .sort((a, b) => b.value - a.value);
  };

  const populasiComposition = createCompositionList(populasiBySpecies, totalPopulasi);
  const pemotonganComposition = createCompositionList(pemotonganBySpecies, totalPemotongan);
  const meatComposition = createCompositionList(meatBySpecies, totalMeat);
  const eggComposition = createCompositionList(eggBySpecies, totalEgg);

  return {
    populasiComposition,
    pemotonganComposition,
    meatComposition,
    eggComposition,
    totalPopulasi,
    totalPemotongan,
    totalMeat,
    totalEgg,
    selectedLivestock: filters.jenisTernak,
  };
}
