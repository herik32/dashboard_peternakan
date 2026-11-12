/**
 * Generator Penjelasan Otomatis Berbasis Templat (F7)
 * Menghasilkan narasi 1-3 kalimat (maksimal 60 kata), bahasa Indonesia baku,
 * tanpa asumsi penyebab, tanpa prediksi, dan tanpa rekomendasi kebijakan.
 */

import { FilterState } from '../types/livestock';
import {
  TrendDataResult,
  formatIdNumber,
  formatIdPercent,
} from './aggregations';
import { CompositionItem, RegionComparisonItem } from './aggregations';

/**
 * Hitung jumlah kata dalam string
 */
export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Narasi Otomatis Grafik 1 (Tren 5 Tahun Terakhir)
 * Filter aktif: Kab/Kota & Jenis Ternak.
 * Filter tidak berlaku: Tahun.
 */
export function generateTrendNarrative(
  trendResult: TrendDataResult,
  filters: FilterState
): string {
  const { data, yearsSpan } = trendResult;
  const validPoints = data.filter((d) => d.hasData && d.populasi !== null && d.populasi > 0);

  // Jika data kurang dari 2 titik, tidak cukup untuk menyimpulkan tren
  if (validPoints.length < 2) {
    return `Data tidak cukup untuk menyimpulkan tren. Pada ${filters.kabupatenKota} untuk ${filters.jenisTernak}, catatan data periode ${yearsSpan} belum memadai. Tren ini tidak dipengaruhi filter tahun.`;
  }

  const first = validPoints[0];
  const last = validPoints[validPoints.length - 1];

  const firstPop = first.populasi ?? 0;
  const lastPop = last.populasi ?? 0;
  const changePercent =
    firstPop > 0 ? ((lastPop - firstPop) / firstPop) * 100 : 0;
  const absChangeStr = formatIdPercent(Math.abs(changePercent));
  const direction =
    changePercent > 0
      ? 'peningkatan'
      : changePercent < 0
      ? 'penurunan'
      : 'kondisi stabil';

  const lastPopStr = formatIdNumber(lastPop);
  const lastMeatStr = formatIdNumber(last.produksiDaging);

  const text = `Pada ${filters.kabupatenKota} untuk ${filters.jenisTernak}, populasi mencatat ${direction} sebesar ${absChangeStr} dari tahun ${first.tahun} ke ${last.tahun} dengan ${lastPopStr} ekor dan daging ${lastMeatStr} kg pada ${last.tahun}. Tren periode ${yearsSpan} tidak dipengaruhi filter tahun.`;

  return text;
}

/**
 * Narasi Otomatis Grafik 2 (Perbandingan Wilayah)
 * Filter aktif: Tahun & Jenis Ternak.
 * Filter tidak berlaku: Kab/Kota.
 */
export function generateRegionalNarrative(
  items: RegionComparisonItem[],
  filters: FilterState
): string {
  const yearLabel =
    filters.tahun === 'Semua' ? 'tahun berjalan' : `tahun ${filters.tahun}`;

  const validItems = items.filter((i) => i.hasData && i.populasi > 0);

  if (validItems.length === 0) {
    return `Data tidak cukup untuk menyimpulkan tren. Tidak ada data populasi untuk ${filters.jenisTernak} pada ${yearLabel}. Perbandingan seluruh kabupaten/kota tidak dipengaruhi filter wilayah.`;
  }

  const sortedPop = [...validItems].sort((a, b) => b.populasi - a.populasi);
  const highest = sortedPop[0];
  const lowest = sortedPop[sortedPop.length - 1];

  const totalPop = validItems.reduce((acc, cur) => acc + cur.populasi, 0);
  const highShare =
    totalPop > 0 ? (highest.populasi / totalPop) * 100 : 0;

  const highPopStr = formatIdNumber(highest.populasi);
  const lowPopStr = formatIdNumber(lowest.populasi);
  const shareStr = formatIdPercent(highShare);

  let highlightSentence = '';
  if (filters.kabupatenKota !== 'Seluruh Provinsi') {
    const selected = items.find(
      (i) => i.kabupatenKota.toLowerCase() === filters.kabupatenKota.toLowerCase()
    );
    if (selected && selected.hasData) {
      highlightSentence = ` Wilayah terpilih ${selected.kabupatenKota} mencatat ${formatIdNumber(selected.populasi)} ekor.`;
    }
  }

  const text = `Pada ${yearLabel} untuk ${filters.jenisTernak}, ${highest.kabupatenKota} mencatat populasi tertinggi sebesar ${highPopStr} ekor (${shareStr}), sedangkan ${lowest.kabupatenKota} terendah dengan ${lowPopStr} ekor.${highlightSentence} Perbandingan seluruh kabupaten/kota tidak dipengaruhi filter wilayah.`;

  return text;
}

/**
 * Narasi Otomatis Grafik 3 (Komposisi Jenis Ternak)
 * Filter aktif: Tahun & Kab/Kota.
 * Filter tidak berlaku: Jenis Ternak.
 */
export function generateCompositionNarrative(
  meatComposition: CompositionItem[],
  eggComposition: CompositionItem[],
  filters: FilterState
): string {
  const yearLabel =
    filters.tahun === 'Semua' ? 'tahun berjalan' : `tahun ${filters.tahun}`;

  if (meatComposition.length === 0 || meatComposition.every((m) => m.value === 0)) {
    return `Data tidak cukup untuk menyimpulkan tren. Tidak ada data produksi pada ${filters.kabupatenKota} untuk ${yearLabel}. Komposisi seluruh jenis ternak tidak dipengaruhi filter jenis ternak.`;
  }

  const topMeat = meatComposition[0];
  const topMeatValStr = formatIdNumber(topMeat.value);
  const topMeatPctStr = formatIdPercent(topMeat.percentage);

  let eggSentence = '';
  if (eggComposition.length > 0 && eggComposition[0].value > 0) {
    const topEgg = eggComposition[0];
    const topEggValStr = formatIdNumber(topEgg.value);
    const topEggPctStr = formatIdPercent(topEgg.percentage);
    eggSentence = ` Produksi telur didominasi ${topEgg.jenisTernak} sebesar ${topEggValStr} kg (${topEggPctStr}).`;
  }

  const text = `Pada ${filters.kabupatenKota} ${yearLabel}, produksi daging didominasi ${topMeat.jenisTernak} sebesar ${topMeatValStr} kg (${topMeatPctStr}).${eggSentence} Komposisi seluruh jenis ternak tidak dipengaruhi filter jenis ternak.`;

  return text;
}
