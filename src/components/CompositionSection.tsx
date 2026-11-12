import React, { useMemo } from 'react';
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
import { PieChart as PieIcon, Sparkles, Egg, Beef, Info } from 'lucide-react';

interface CompositionSectionProps {
  records: LivestockRecord[];
  filters: FilterState;
}

interface CustomDonutTooltipProps {
  active?: boolean;
  payload?: any[];
}

const CustomDonutTooltip: React.FC<CustomDonutTooltipProps> = ({
  active,
  payload,
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
            {formatIdNumber(data.value)} kg
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
  const composition = getCompositionData(records, filters);
  const narrative = generateCompositionNarrative(
    composition.meatComposition,
    composition.eggComposition,
    filters
  );

  // Pasangkan warna unik untuk setiap jenis ternak pada komposisi daging
  const meatItems = useMemo(() => {
    return composition.meatComposition.map((item, idx) => {
      const color = getSpeciesColor(item.jenisTernak, idx);
      return {
        ...item,
        color,
        fill: color, // Penting untuk Recharts legend & pie fill
      };
    });
  }, [composition.meatComposition]);

  // Pasangkan warna unik untuk setiap jenis ternak pada komposisi telur
  const eggItems = useMemo(() => {
    return composition.eggComposition.map((item, idx) => {
      const color = getSpeciesColor(item.jenisTernak, idx + 4);
      return {
        ...item,
        color,
        fill: color,
      };
    });
  }, [composition.eggComposition]);

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
              Grafik 3: Komposisi Produksi per Jenis Ternak
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Proporsi produksi daging dan telur per komoditas ternak (Tahun {filters.tahun})
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

      {/* 2 Donut Charts Side-by-side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4">
        {/* Donut 1: Produksi Daging */}
        <div className="p-4 rounded-lg border border-slate-100 bg-slate-50/60 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Beef className="w-4 h-4 text-amber-700" />
              <span className="text-xs font-bold text-slate-800">
                Komposisi Produksi Daging
              </span>
            </div>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700 font-semibold">
              Total: {formatIdNumber(composition.totalMeat)} kg
            </span>
          </div>

          {composition.totalMeat > 0 ? (
            <div>
              <div className="w-full h-56 sm:h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip content={<CustomDonutTooltip />} />
                    <Pie
                      data={meatItems}
                      dataKey="value"
                      nameKey="jenisTernak"
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={2}
                      stroke="#ffffff"
                      strokeWidth={2}
                    >
                      {meatItems.map((entry, index) => (
                        <Cell
                          key={`meat-cell-${index}`}
                          fill={entry.color}
                          stroke={entry.isSelected ? '#0f172a' : '#ffffff'}
                          strokeWidth={entry.isSelected ? 3.5 : 1.5}
                          className="transition-all cursor-pointer"
                        />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Legenda Khusus dengan Warna Masing-masing Jenis Ternak */}
              <div className="mt-2 pt-2 border-t border-slate-200/70 grid grid-cols-2 sm:grid-cols-3 gap-2">
                {meatItems.map((item, idx) => (
                  <div
                    key={`legend-meat-${idx}`}
                    className={`flex items-center gap-1.5 text-xs p-1 rounded ${
                      item.isSelected ? 'bg-amber-100/70 font-bold ring-1 ring-amber-400' : 'text-slate-700'
                    }`}
                  >
                    <span
                      className="w-3 h-3 rounded-full shrink-0 shadow-xs"
                      style={{ backgroundColor: item.color }}
                    ></span>
                    <span className="truncate text-[11px] font-medium" title={item.jenisTernak}>
                      {item.jenisTernak}
                    </span>
                    <span className="ml-auto font-mono text-[10px] text-slate-500 font-semibold">
                      {formatIdPercent(item.percentage)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="w-full h-64 flex flex-col items-center justify-center text-slate-400 text-xs italic">
              <Info className="w-5 h-5 mb-1 text-slate-300" />
              Tidak ada data produksi daging
            </div>
          )}
        </div>

        {/* Donut 2: Produksi Telur (Hanya Unggas Petelur & Itik) */}
        <div className="p-4 rounded-lg border border-slate-100 bg-slate-50/60 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Egg className="w-4 h-4 text-purple-700" />
              <span className="text-xs font-bold text-slate-800">
                Komposisi Produksi Telur
              </span>
            </div>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700 font-semibold">
              Total: {formatIdNumber(composition.totalEgg)} kg
            </span>
          </div>

          {composition.totalEgg > 0 ? (
            <div>
              <div className="w-full h-56 sm:h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip content={<CustomDonutTooltip />} />
                    <Pie
                      data={eggItems}
                      dataKey="value"
                      nameKey="jenisTernak"
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={3}
                      stroke="#ffffff"
                      strokeWidth={2}
                    >
                      {eggItems.map((entry, index) => (
                        <Cell
                          key={`egg-cell-${index}`}
                          fill={entry.color}
                          stroke={entry.isSelected ? '#0f172a' : '#ffffff'}
                          strokeWidth={entry.isSelected ? 3.5 : 1.5}
                          className="transition-all cursor-pointer"
                        />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Legenda Khusus dengan Warna Masing-masing Jenis Ternak */}
              <div className="mt-2 pt-2 border-t border-slate-200/70 grid grid-cols-2 gap-2">
                {eggItems.map((item, idx) => (
                  <div
                    key={`legend-egg-${idx}`}
                    className={`flex items-center gap-1.5 text-xs p-1 rounded ${
                      item.isSelected ? 'bg-amber-100/70 font-bold ring-1 ring-amber-400' : 'text-slate-700'
                    }`}
                  >
                    <span
                      className="w-3 h-3 rounded-full shrink-0 shadow-xs"
                      style={{ backgroundColor: item.color }}
                    ></span>
                    <span className="truncate text-[11px] font-medium" title={item.jenisTernak}>
                      {item.jenisTernak}
                    </span>
                    <span className="ml-auto font-mono text-[10px] text-slate-500 font-semibold">
                      {formatIdPercent(item.percentage)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="w-full h-64 flex flex-col items-center justify-center text-slate-400 text-xs italic">
              <Info className="w-5 h-5 mb-1 text-slate-300" />
              Tidak ada data produksi telur (hanya Ayam Petelur & Itik)
            </div>
          )}
        </div>
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
