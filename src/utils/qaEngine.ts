import { LivestockRecord } from '../types/livestock';
import { formatIdNumber, formatIdPercent } from './aggregations';
import { getSpeciesColor } from './constants';

export type QAIntent =
  | 'ranking'
  | 'single_value'
  | 'comparison'
  | 'trend'
  | 'composition'
  | 'summary_table'
  | 'out_of_scope';

export type QAMetric =
  | 'populasi'
  | 'pemotongan'
  | 'produksiDaging'
  | 'produksiTelur'
  | 'semua';

export type QAGroupBy = 'kabupatenKota' | 'jenisTernak' | 'tahun' | 'none';

export interface QAQueryPlan {
  intent: QAIntent;
  metric: QAMetric;
  aggregation: 'sum' | 'avg' | 'max' | 'min';
  years: number[];
  useLatestYearIfUnspecified: boolean;
  regions: string[];
  livestockTypes: string[];
  groupBy: QAGroupBy;
  sortOrder: 'desc' | 'asc' | 'year_asc' | 'none';
  limit: number;
  highlightMode: 'highest' | 'lowest' | 'none';
  preferredVisuals: string[];
  title: string;
  outOfScopeReason: string;
}

export interface QAKpiHighlight {
  label: string;
  value: string;
  sublabel?: string;
  isPrimary?: boolean;
}

export interface QAResultRow {
  label: string; // kabupatenKota, jenisTernak, tahun, atau label ringkasan
  populasi: number;
  pemotongan: number;
  produksiDaging: number;
  produksiTelur: number | null;
  primaryValue: number;
  sharePercent: number;
  isHighlighted: boolean;
  color: string;
}

export interface QAExecutionResult {
  plan: QAQueryPlan;
  isOutOfScope: boolean;
  hasData: boolean;
  title: string;
  answerText: string;
  kpiHighlights: QAKpiHighlight[];
  rows: QAResultRow[];
  chartType: 'bar' | 'line' | 'pie' | 'none';
  primaryMetric: Exclude<QAMetric, 'semua'>;
  metricLabel: string;
  metricUnit: string;
  showAllMetricsInTable: boolean;
  appliedScope: {
    yearsLabel: string;
    regionsLabel: string;
    livestockLabel: string;
  };
}

const METRIC_META: Record<
  Exclude<QAMetric, 'semua'>,
  { label: string; unit: string; color: string }
> = {
  populasi: { label: 'Populasi', unit: 'ekor', color: '#15803d' },
  pemotongan: { label: 'Pemotongan', unit: 'ekor', color: '#0284c7' },
  produksiDaging: { label: 'Produksi Daging', unit: 'kg', color: '#ea580c' },
  produksiTelur: { label: 'Produksi Telur', unit: 'kg', color: '#8b5cf6' },
};

function normalizeMatch(requestedList: string[], availableList: string[]): string[] {
  if (!requestedList || requestedList.length === 0) return [];
  const matched = new Set<string>();

  for (const req of requestedList) {
    const q = req.trim().toLowerCase();
    if (!q) continue;

    // 1. Exact case-insensitive match
    const exact = availableList.find((a) => a.toLowerCase() === q);
    if (exact) {
      matched.add(exact);
      continue;
    }

    // 2. Partial match (e.g. "Pontianak" -> "Kota Pontianak", "Kabupaten Sintang" -> "Sintang")
    const stripped = q
      .replace(/^kabupaten\s+/i, '')
      .replace(/^kab\.\s*/i, '')
      .replace(/^kota\s+/i, '')
      .trim();

    const partials = availableList.filter((a) => {
      const al = a.toLowerCase();
      return (
        al.includes(stripped) ||
        stripped.includes(al) ||
        al.includes(q)
      );
    });

    for (const p of partials) {
      matched.add(p);
    }
  }

  return Array.from(matched);
}

function getMetricValue(
  row: {
    populasi: number;
    pemotongan: number;
    produksiDaging: number;
    produksiTelur: number | null;
  },
  metric: Exclude<QAMetric, 'semua'>
): number {
  switch (metric) {
    case 'populasi':
      return row.populasi;
    case 'pemotongan':
      return row.pemotongan;
    case 'produksiDaging':
      return row.produksiDaging;
    case 'produksiTelur':
      return row.produksiTelur ?? 0;
  }
}

export function executeQAPlan(
  plan: QAQueryPlan,
  records: LivestockRecord[]
): QAExecutionResult {
  const primaryMetric: Exclude<QAMetric, 'semua'> =
    plan.metric === 'semua' ? 'populasi' : plan.metric;
  const meta = METRIC_META[primaryMetric] ?? METRIC_META.populasi;

  if (plan.intent === 'out_of_scope') {
    return {
      plan,
      isOutOfScope: true,
      hasData: false,
      title: plan.title || 'Pertanyaan di Luar Cakupan',
      answerText:
        plan.outOfScopeReason ||
        'Maaf, asisten ini khusus menjawab pertanyaan seputar data statistik peternakan Provinsi Kalimantan Barat (populasi, pemotongan, produksi daging, dan produksi telur).',
      kpiHighlights: [],
      rows: [],
      chartType: 'none',
      primaryMetric,
      metricLabel: meta.label,
      metricUnit: meta.unit,
      showAllMetricsInTable: false,
      appliedScope: {
        yearsLabel: '-',
        regionsLabel: '-',
        livestockLabel: '-',
      },
    };
  }

  const availableYears = Array.from(new Set(records.map((r) => r.tahun))).sort(
    (a, b) => a - b
  );
  const availableRegions = Array.from(
    new Set(records.map((r) => r.kabupatenKota).filter(Boolean))
  );
  const availableLivestock = Array.from(
    new Set(records.map((r) => r.jenisTernak).filter(Boolean))
  );

  // Tentukan tahun efektif
  let targetYears: number[] = [];
  if (Array.isArray(plan.years) && plan.years.length > 0) {
    targetYears = plan.years.filter((y) => availableYears.includes(y));
  } else if (
    plan.useLatestYearIfUnspecified &&
    plan.groupBy !== 'tahun' &&
    plan.intent !== 'trend' &&
    availableYears.length > 0
  ) {
    targetYears = [availableYears[availableYears.length - 1]];
  } else {
    targetYears = [...availableYears];
  }

  // Tentukan wilayah & jenis ternak efektif
  const targetRegions = normalizeMatch(plan.regions, availableRegions);
  const targetLivestock = normalizeMatch(plan.livestockTypes, availableLivestock);

  const yearsLabel =
    targetYears.length === 0
      ? 'Tidak tersedia'
      : targetYears.length === availableYears.length && availableYears.length > 1
      ? `${availableYears[0]}–${availableYears[availableYears.length - 1]}`
      : targetYears.join(', ');

  const regionsLabel =
    targetRegions.length === 0
      ? 'Seluruh Provinsi (Semua Kab/Kota)'
      : targetRegions.join(', ');

  const livestockLabel =
    targetLivestock.length === 0
      ? 'Semua Jenis Ternak'
      : targetLivestock.join(', ');

  // Jika pengguna menyebut tahun yang tidak ada dalam dataset sama sekali
  if (
    Array.isArray(plan.years) &&
    plan.years.length > 0 &&
    targetYears.length === 0
  ) {
    return {
      plan,
      isOutOfScope: false,
      hasData: false,
      title: plan.title || 'Data Tidak Ditemukan',
      answerText: `Data untuk tahun ${plan.years.join(', ')} tidak tersedia dalam dataset aktif. Tahun yang tersedia saat ini adalah ${availableYears.join(', ')}.`,
      kpiHighlights: [],
      rows: [],
      chartType: 'none',
      primaryMetric,
      metricLabel: meta.label,
      metricUnit: meta.unit,
      showAllMetricsInTable: false,
      appliedScope: {
        yearsLabel: plan.years.join(', '),
        regionsLabel,
        livestockLabel,
      },
    };
  }

  // Saring records
  const filtered = records.filter((r) => {
    if (targetYears.length > 0 && !targetYears.includes(r.tahun)) return false;
    if (
      targetRegions.length > 0 &&
      !targetRegions.some(
        (reg) => reg.toLowerCase() === r.kabupatenKota.toLowerCase()
      )
    ) {
      return false;
    }
    if (
      targetLivestock.length > 0 &&
      !targetLivestock.some(
        (lv) => lv.toLowerCase() === r.jenisTernak.toLowerCase()
      )
    ) {
      return false;
    }
    return true;
  });

  if (filtered.length === 0) {
    return {
      plan,
      isOutOfScope: false,
      hasData: false,
      title: plan.title || 'Data Tidak Ditemukan',
      answerText: `Tidak ditemukan data yang sesuai untuk ${livestockLabel} di ${regionsLabel} pada tahun ${yearsLabel}.`,
      kpiHighlights: [],
      rows: [],
      chartType: 'none',
      primaryMetric,
      metricLabel: meta.label,
      metricUnit: meta.unit,
      showAllMetricsInTable: false,
      appliedScope: { yearsLabel, regionsLabel, livestockLabel },
    };
  }

  // Tentukan groupBy efektif
  let effectiveGroupBy: QAGroupBy = plan.groupBy;
  if (effectiveGroupBy === 'none') {
    if (plan.intent === 'trend') effectiveGroupBy = 'tahun';
    else if (targetRegions.length !== 1) effectiveGroupBy = 'kabupatenKota';
    else if (targetLivestock.length !== 1) effectiveGroupBy = 'jenisTernak';
    else if (targetYears.length > 1) effectiveGroupBy = 'tahun';
    else effectiveGroupBy = 'jenisTernak';
  }

  // Agregasi per kelompok
  const groupMap = new Map<
    string,
    {
      populasi: number;
      pemotongan: number;
      produksiDaging: number;
      produksiTelur: number | null;
      count: number;
    }
  >();

  for (const r of filtered) {
    const key =
      effectiveGroupBy === 'tahun'
        ? String(r.tahun)
        : effectiveGroupBy === 'jenisTernak'
        ? r.jenisTernak
        : r.kabupatenKota;

    const existing = groupMap.get(key) ?? {
      populasi: 0,
      pemotongan: 0,
      produksiDaging: 0,
      produksiTelur: null,
      count: 0,
    };

    existing.populasi += r.populasi;
    existing.pemotongan += r.pemotongan;
    existing.produksiDaging += r.produksiDaging;
    if (r.produksiTelur !== null) {
      existing.produksiTelur = (existing.produksiTelur ?? 0) + r.produksiTelur;
    }
    existing.count += 1;

    groupMap.set(key, existing);
  }

  // Hitung total agregat keseluruhan
  let grandTotalPop = 0;
  let grandTotalPot = 0;
  let grandTotalDag = 0;
  let grandTotalTel: number | null = null;

  for (const val of groupMap.values()) {
    grandTotalPop += val.populasi;
    grandTotalPot += val.pemotongan;
    grandTotalDag += val.produksiDaging;
    if (val.produksiTelur !== null) {
      grandTotalTel = (grandTotalTel ?? 0) + val.produksiTelur;
    }
  }

  const grandPrimaryTotal = getMetricValue(
    {
      populasi: grandTotalPop,
      pemotongan: grandTotalPot,
      produksiDaging: grandTotalDag,
      produksiTelur: grandTotalTel,
    },
    primaryMetric
  );

  let rows: QAResultRow[] = Array.from(groupMap.entries()).map(
    ([label, agg], idx) => {
      const primaryValue = getMetricValue(agg, primaryMetric);
      const sharePercent =
        grandPrimaryTotal > 0 ? (primaryValue / grandPrimaryTotal) * 100 : 0;

      const color =
        effectiveGroupBy === 'jenisTernak'
          ? getSpeciesColor(label, idx)
          : meta.color;

      return {
        label,
        populasi: agg.populasi,
        pemotongan: agg.pemotongan,
        produksiDaging: agg.produksiDaging,
        produksiTelur: agg.produksiTelur,
        primaryValue,
        sharePercent,
        isHighlighted: false,
        color,
      };
    }
  );

  // Untuk produksiTelur dengan groupBy jenisTernak, saring jenis yang tidak punya telur jika intent komposisi/ranking
  if (
    primaryMetric === 'produksiTelur' &&
    effectiveGroupBy === 'jenisTernak' &&
    rows.some((r) => r.produksiTelur !== null && r.produksiTelur > 0)
  ) {
    rows = rows.filter((r) => r.produksiTelur !== null && r.produksiTelur > 0);
  }

  // Sorting
  if (effectiveGroupBy === 'tahun' || plan.sortOrder === 'year_asc') {
    rows.sort((a, b) => Number(a.label) - Number(b.label));
  } else if (plan.sortOrder === 'asc') {
    rows.sort((a, b) => a.primaryValue - b.primaryValue);
  } else {
    rows.sort((a, b) => b.primaryValue - a.primaryValue);
  }

  // Highlighting
  if (rows.length > 0) {
    if (plan.highlightMode === 'highest' || (plan.intent === 'ranking' && plan.sortOrder !== 'asc')) {
      const maxVal = Math.max(...rows.map((r) => r.primaryValue));
      rows = rows.map((r) => ({
        ...r,
        isHighlighted: r.primaryValue === maxVal,
      }));
    } else if (plan.highlightMode === 'lowest' || plan.sortOrder === 'asc') {
      const minVal = Math.min(...rows.map((r) => r.primaryValue));
      rows = rows.map((r) => ({
        ...r,
        isHighlighted: r.primaryValue === minVal,
      }));
    }
  }

  // Limit jika diminta secara eksplisit (misal Top 5 / 3 besar), namun jika limit <= 1 (user tanya "kabupaten mana tertinggi"), tampilkan semua atau top 14 di grafik agar konteks peringkat terlihat jelas!
  if (plan.limit && plan.limit > 1) {
    rows = rows.slice(0, plan.limit);
  }

  // Tentukan jenis grafik terbaik
  let chartType: 'bar' | 'line' | 'pie' | 'none' = 'bar';
  if (effectiveGroupBy === 'tahun' || plan.intent === 'trend' || plan.preferredVisuals.includes('grafik_garis')) {
    chartType = rows.length > 1 ? 'line' : 'bar';
  } else if (
    (plan.intent === 'composition' || plan.preferredVisuals.includes('grafik_donut')) &&
    rows.length > 1 &&
    rows.length <= 10
  ) {
    chartType = 'pie';
  } else if (rows.length >= 1) {
    chartType = 'bar';
  } else {
    chartType = 'none';
  }

  // Susun KPI Highlights & Jawaban Narasi Eksak
  const kpiHighlights: QAKpiHighlight[] = [];
  let answerText = '';

  const showAllMetricsInTable =
    plan.metric === 'semua' || plan.intent === 'summary_table';

  if (rows.length === 0) {
    answerText = `Tidak ditemukan nilai ${meta.label.toLowerCase()} yang valid untuk kriteria tersebut.`;
  } else if (plan.intent === 'trend' && effectiveGroupBy === 'tahun') {
    const first = rows[0];
    const last = rows[rows.length - 1];
    const diff = last.primaryValue - first.primaryValue;
    const pct =
      first.primaryValue > 0 ? (diff / first.primaryValue) * 100 : null;
    const arah = diff > 0 ? 'meningkat' : diff < 0 ? 'menurun' : 'stabil';

    kpiHighlights.push({
      label: `${meta.label} Tahun ${last.label}`,
      value: `${formatIdNumber(last.primaryValue)} ${meta.unit}`,
      sublabel: `${regionsLabel} • ${livestockLabel}`,
      isPrimary: true,
    });

    if (rows.length >= 2 && pct !== null) {
      kpiHighlights.push({
        label: `Perubahan (${first.label} → ${last.label})`,
        value: `${diff >= 0 ? '+' : ''}${formatIdPercent(pct)}`,
        sublabel: `${diff >= 0 ? '+' : ''}${formatIdNumber(diff)} ${meta.unit}`,
      });
    }

    answerText = `Pada rentang tahun ${first.label}–${last.label} untuk ${livestockLabel} di ${regionsLabel}, ${meta.label.toLowerCase()} tercatat ${arah} dari ${formatIdNumber(first.primaryValue)} ${meta.unit} menjadi ${formatIdNumber(last.primaryValue)} ${meta.unit}${pct !== null ? ` (${diff >= 0 ? '+' : ''}${formatIdPercent(pct)})` : ''}.`;
  } else if (
    plan.intent === 'ranking' ||
    plan.highlightMode === 'highest' ||
    plan.highlightMode === 'lowest'
  ) {
    const winner = rows[0];
    const isLowest = plan.highlightMode === 'lowest' || plan.sortOrder === 'asc';
    const superlative = isLowest ? 'terendah' : 'tertinggi';
    const groupWord =
      effectiveGroupBy === 'kabupatenKota'
        ? 'Kabupaten/Kota'
        : effectiveGroupBy === 'jenisTernak'
        ? 'Jenis Ternak'
        : 'Tahun';

    kpiHighlights.push({
      label: `${groupWord} ${superlative.charAt(0).toUpperCase() + superlative.slice(1)}`,
      value: winner.label,
      sublabel: `${formatIdNumber(winner.primaryValue)} ${meta.unit} (${formatIdPercent(winner.sharePercent)})`,
      isPrimary: true,
    });

    kpiHighlights.push({
      label: `Total ${meta.label} (${yearsLabel})`,
      value: `${formatIdNumber(grandPrimaryTotal)} ${meta.unit}`,
      sublabel: `${livestockLabel}`,
    });

    let runnerUpText = '';
    if (rows.length > 1) {
      const second = rows[1];
      runnerUpText = ` Posisi berikutnya adalah ${second.label} dengan ${formatIdNumber(second.primaryValue)} ${meta.unit} (${formatIdPercent(second.sharePercent)}).`;
    }

    answerText = `${groupWord} dengan ${meta.label.toLowerCase()} ${livestockLabel} ${superlative} pada tahun ${yearsLabel} adalah ${winner.label} sebesar ${formatIdNumber(winner.primaryValue)} ${meta.unit} (${formatIdPercent(winner.sharePercent)} dari total ${formatIdNumber(grandPrimaryTotal)} ${meta.unit}).${runnerUpText}`;
  } else if (plan.intent === 'single_value' || (targetRegions.length === 1 && targetLivestock.length === 1 && targetYears.length === 1)) {
    if (plan.metric === 'semua') {
      kpiHighlights.push(
        {
          label: 'Total Populasi',
          value: `${formatIdNumber(grandTotalPop)} ekor`,
          isPrimary: true,
        },
        {
          label: 'Total Pemotongan',
          value: `${formatIdNumber(grandTotalPot)} ekor`,
        },
        {
          label: 'Produksi Daging',
          value: `${formatIdNumber(grandTotalDag)} kg`,
        }
      );
      if (grandTotalTel !== null) {
        kpiHighlights.push({
          label: 'Produksi Telur',
          value: `${formatIdNumber(grandTotalTel)} kg`,
        });
      }
      answerText = `Untuk ${livestockLabel} di ${regionsLabel} pada tahun ${yearsLabel}, tercatat populasi ${formatIdNumber(grandTotalPop)} ekor, pemotongan ${formatIdNumber(grandTotalPot)} ekor, produksi daging ${formatIdNumber(grandTotalDag)} kg${grandTotalTel !== null ? `, dan produksi telur ${formatIdNumber(grandTotalTel)} kg` : ''}.`;
    } else {
      kpiHighlights.push({
        label: `Total ${meta.label}`,
        value: `${formatIdNumber(grandPrimaryTotal)} ${meta.unit}`,
        sublabel: `${livestockLabel} • ${regionsLabel} (${yearsLabel})`,
        isPrimary: true,
      });

      if (rows.length > 1) {
        const topRow = rows[0];
        kpiHighlights.push({
          label: 'Kontributor Terbesar',
          value: topRow.label,
          sublabel: `${formatIdNumber(topRow.primaryValue)} ${meta.unit} (${formatIdPercent(topRow.sharePercent)})`,
        });
      }

      answerText = `Total ${meta.label.toLowerCase()} ${livestockLabel} di ${regionsLabel} pada tahun ${yearsLabel} adalah sebesar ${formatIdNumber(grandPrimaryTotal)} ${meta.unit}.${rows.length > 1 ? ` Kontributor terbesar berasal dari ${rows[0].label} (${formatIdNumber(rows[0].primaryValue)} ${meta.unit} atau ${formatIdPercent(rows[0].sharePercent)}).` : ''}`;
    }
  } else {
    // comparison, composition, summary_table
    const topRow = rows[0];
    kpiHighlights.push({
      label: `Total ${meta.label}`,
      value: `${formatIdNumber(grandPrimaryTotal)} ${meta.unit}`,
      sublabel: `${regionsLabel} • ${yearsLabel}`,
      isPrimary: true,
    });
    kpiHighlights.push({
      label: 'Tertinggi dalam Daftar',
      value: topRow.label,
      sublabel: `${formatIdNumber(topRow.primaryValue)} ${meta.unit} (${formatIdPercent(topRow.sharePercent)})`,
    });

    const summaryList = rows
      .slice(0, 3)
      .map(
        (r) =>
          `${r.label}: ${formatIdNumber(r.primaryValue)} ${meta.unit} (${formatIdPercent(r.sharePercent)})`
      )
      .join('; ');

    answerText = `Hasil ${meta.label.toLowerCase()} untuk ${livestockLabel} (${yearsLabel}) menunjukkan total ${formatIdNumber(grandPrimaryTotal)} ${meta.unit}. Rincian utama: ${summaryList}.`;
  }

  return {
    plan,
    isOutOfScope: false,
    hasData: true,
    title: plan.title || `Hasil Analisis: ${meta.label}`,
    answerText,
    kpiHighlights,
    rows,
    chartType,
    primaryMetric,
    metricLabel: meta.label,
    metricUnit: meta.unit,
    showAllMetricsInTable,
    appliedScope: {
      yearsLabel,
      regionsLabel,
      livestockLabel,
    },
  };
}
