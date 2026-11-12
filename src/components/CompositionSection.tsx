import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from 'recharts';
import { FilterState, LivestockRecord } from '../types/livestock';
import {
  getCompositionData,
  formatIdNumber,
  formatIdPercent,
  CompositionItem,
} from '../utils/aggregations';
import { getSpeciesColor } from '../utils/constants';
import { generateCompositionNarrative } from '../utils/narratives';
import {
  PieChart as PieIcon,
  Sparkles,
  Egg,
  Beef,
  Layers,
  Scissors,
  Info,
} from 'lucide-react';

interface CompositionSectionProps {
  records: LivestockRecord[];
  filters: FilterState;
}

type MetricType = 'populasi' | 'pemotongan' | 'daging' | 'telur';

interface MetricOption {
  id: MetricType;
  label: string;
  unit: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  activeBg: string;
  activeBorder: string;
  activeText: string;
}

const METRIC_OPTIONS: MetricOption[] = [
  {
    id: 'populasi',
    label: 'Populasi',
    unit: 'ekor',
    icon: Layers,
    color: '#0284c7', // sky-600
    activeBg: 'bg-sky-50',
    activeBorder: 'border-sky-500',
    activeText: 'text-sky-800 font-bold',
  },
  {
    id: 'pemotongan',
    label: 'Pemotongan',
    unit: 'ekor',
    icon: Scissors,
    color: '#d97706', // amber-600
    activeBg: 'bg-amber-50',
    activeBorder: 'border-amber-500',
    activeText: 'text-amber-800 font-bold',
  },
  {
    id: 'daging',
    label: 'Produksi Daging',
    unit: 'kg',
    icon: Beef,
    color: '#dc2626', // red-600
    activeBg: 'bg-rose-50',
    activeBorder: 'border-rose-500',
    activeText: 'text-rose-800 font-bold',
  },
  {
    id: 'telur',
    label: 'Produksi Telur',
    unit: 'kg',
    icon: Egg,
    color: '#9333ea', // purple-600
    activeBg: 'bg-purple-50',
    activeBorder: 'border-purple-500',
    activeText: 'text-purple-800 font-bold',
  },
];

interface CustomDonutTooltipProps {
  active?: boolean;
  payload?: any[];
  unit: string;
}

const CustomDonutTooltip: React.FC<CustomDonutTooltipProps> = ({
  active,
  payload,
  unit,
}) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-900 text-white px-3 py-2 rounded-lg shadow-xl text-xs border border-slate-700">
        <div className="font-semibold text-emerald-400 flex items-center gap-1.5">
          <span
            className="w-3 h-3 rounded-full inline-block shrink-0 shadow-xs"
            style={{ backgroundColor: data.color }}
          ></span>
          <span>{data.jenisTernak}</span>
          {data.isSelected && (
            <span className="text-[10px] bg-amber-500 text-slate-950 font-bold px-1.5 py-0.2 rounded ml-1">
              Dipilih di Filter
            </span>
          )}
        </div>
        <div className="mt-1.5 flex items-baseline justify-between gap-4">
          <span className="font-mono text-sm font-bold">
            {formatIdNumber(data.value)} {unit}
          </span>
          <span className="text-emerald-300 font-semibold font-mono text-xs">
            {formatIdPercent(data.percentage)}
          </span>
        </div>
      </div>
    );
  }
  return null;
};

export const CompositionSection: React.FC<CompositionSectionProps> = ({
  records,
  filters,
}) => {
  const [activeMetric, setActiveMetric] = useState<MetricType>('populasi');

  const composition = getCompositionData(records, filters);

  const activeConfig = useMemo(() => {
    return METRIC_OPTIONS.find((opt) => opt.id === activeMetric) ?? METRIC_OPTIONS[0];
  }, [activeMetric]);

  // Dapatkan daftar data & total sesuai metrik terpilih
  const { currentItems, currentTotal } = useMemo(() => {
    let rawItems: CompositionItem[] = [];
    let total = 0;

    switch (activeMetric) {
      case 'populasi':
        rawItems = composition.populasiComposition;
        total = composition.totalPopulasi;
        break;
      case 'pemotongan':
        rawItems = composition.pemotonganComposition;
        total = composition.totalPemotongan;
        break;
      case 'daging':
        rawItems = composition.meatComposition;
        total = composition.totalMeat;
        break;
      case 'telur':
        rawItems = composition.eggComposition;
        total = composition.totalEgg;
        break;
    }

    // Pasangkan warna unik untuk setiap jenis ternak
    const styledItems = rawItems.map((item, idx) => {
      const color = getSpeciesColor(item.jenisTernak, idx);
      return {
        ...item,
        color,
        fill: color,
      };
    });

    return {
      currentItems: styledItems,
      currentTotal: total,
    };
  }, [composition, activeMetric]);

  const narrative = useMemo(() => {
    return generateCompositionNarrative(
      currentItems,
      activeConfig.label,
      activeConfig.unit,
      filters
    );
  }, [currentItems, activeConfig, filters]);

  const ActiveIcon = activeConfig.icon;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 sm:p-5 mb-6">
      {/* Header Card & Filter Chips */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <PieIcon className="w-4 h-4" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900">
              Grafik 3: Komposisi per Jenis Ternak
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Proporsi {activeConfig.label.toLowerCase()} per komoditas ternak (Tahun {filters.tahun})
            {filters.jenisTernak !== 'Semua Jenis' && (
              <span className="font-semibold text-amber-700 ml-1">
                • Komoditas "{filters.jenisTernak}" ditonjolkan
              </span>
            )}
            .
          </p>
        </div>

        {/* Behavioral Chips */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mr-1.5"></span>
            Filter berlaku: Tahun ({filters.tahun}), {filters.kabupatenKota}
          </span>
          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mr-1.5"></span>
            Tidak dipengaruhi: Komoditas (semua jenis tetap tampil)
          </span>
        </div>
      </div>

      {/* Panel Pilihan Data (Tabs Metrik) */}
      <div className="mt-4 mb-3">
        <label className="block text-xs font-semibold text-slate-700 mb-2">
          Pilih Data yang Ditampilkan pada Grafik Donut:
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {METRIC_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const isSelected = activeMetric === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setActiveMetric(opt.id)}
                className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border text-xs sm:text-sm font-medium transition-all ${
                  isSelected
                    ? `${opt.activeBg} ${opt.activeBorder} ${opt.activeText} shadow-xs ring-1 ring-slate-300`
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isSelected ? '' : 'text-slate-400'}`} />
                <span>{opt.label}</span>
                <span className="text-[11px] opacity-75 font-normal">({opt.unit})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Single Donut Chart Container */}
      <div className="p-4 sm:p-5 rounded-xl border border-slate-100 bg-slate-50/60 my-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 pb-2 border-b border-slate-200/60">
          <div className="flex items-center gap-2">
            <ActiveIcon className="w-4 h-4 text-emerald-700" />
            <span className="text-sm font-bold text-slate-800">
              Komposisi {activeConfig.label}
            </span>
            <span className="text-xs text-slate-500 font-normal">
              ({filters.kabupatenKota}, {filters.tahun})
            </span>
          </div>
          <div className="flex items-center gap-1.5 self-start sm:self-auto">
            <span className="text-xs text-slate-500 font-medium">Total Akumulasi:</span>
            <span className="text-xs sm:text-sm font-mono px-2.5 py-1 rounded-md bg-white border border-slate-200 text-slate-800 font-bold shadow-2xs">
              {formatIdNumber(currentTotal)} {activeConfig.unit}
            </span>
          </div>
        </div>

        {currentTotal > 0 && currentItems.length > 0 ? (
          <div>
            <div className="w-full h-64 sm:h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip content={<CustomDonutTooltip unit={activeConfig.unit} />} />
                  <Pie
                    data={currentItems}
                    dataKey="value"
                    nameKey="jenisTernak"
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={105}
                    paddingAngle={2.5}
                    stroke="#ffffff"
                    strokeWidth={2}
                  >
                    {currentItems.map((entry, index) => (
                      <Cell
                        key={`donut-cell-${entry.jenisTernak}-${index}`}
                        fill={entry.color}
                        stroke={entry.isSelected ? '#0f172a' : '#ffffff'}
                        strokeWidth={entry.isSelected ? 3.5 : 1.5}
                        className="transition-all cursor-pointer hover:opacity-90"
                      />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Custom Legend Grid with distinct colors and detailed percentages */}
            <div className="mt-3 pt-3 border-t border-slate-200/80">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Rincian Kontribusi per Jenis Ternak:
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {currentItems.map((item, idx) => (
                  <div
                    key={`legend-${item.jenisTernak}-${idx}`}
                    className={`flex items-center gap-2 p-2 rounded-lg border text-xs transition-all ${
                      item.isSelected
                        ? 'bg-amber-50/80 border-amber-300 font-bold ring-1 ring-amber-400'
                        : 'bg-white border-slate-200/70 text-slate-700'
                    }`}
                  >
                    <span
                      className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs"
                      style={{ backgroundColor: item.color }}
                    ></span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium text-slate-800" title={item.jenisTernak}>
                        {item.jenisTernak}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono flex items-center justify-between">
                        <span>{formatIdNumber(item.value)} {activeConfig.unit}</span>
                        <span className="font-semibold text-emerald-700 ml-1">
                          {formatIdPercent(item.percentage)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="w-full h-64 flex flex-col items-center justify-center text-slate-400 text-xs italic">
            <Info className="w-6 h-6 mb-2 text-slate-300" />
            <span>Tidak ada data {activeConfig.label.toLowerCase()} yang tercatat untuk filter ini</span>
            {activeMetric === 'telur' && (
              <span className="text-[11px] text-slate-400 mt-1">
                (Produksi telur umumnya hanya dihasilkan oleh jenis unggas petelur dan itik)
              </span>
            )}
          </div>
        )}
      </div>

      {/* F7: Automatic Explanation Box */}
      <div className="mt-3 p-3 bg-emerald-50/70 border border-emerald-200 rounded-lg">
        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900 mb-1">
          <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
          <span>Penjelasan otomatis</span>
        </div>
        <p className="text-xs sm:text-sm text-emerald-950 leading-relaxed font-sans">
          {narrative}
        </p>
      </div>
    </div>
  );
};
