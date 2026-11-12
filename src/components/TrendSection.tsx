import React, { useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { FilterState, LivestockRecord } from '../types/livestock';
import { getTrendData, formatIdNumber } from '../utils/aggregations';
import { generateTrendNarrative } from '../utils/narratives';
import { TrendingUp, Info, Sparkles, Grid } from 'lucide-react';

interface TrendSectionProps {
  records: LivestockRecord[];
  filters: FilterState;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string | number;
  unit: string;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({
  active,
  payload,
  label,
  unit,
}) => {
  if (active && payload && payload.length) {
    const val = payload[0].value;
    return (
      <div className="bg-slate-900 text-white px-3 py-2 rounded-lg shadow-xl text-xs border border-slate-700">
        <div className="font-semibold text-emerald-400">Tahun {label}</div>
        <div className="mt-1 flex items-baseline gap-1">
          <span className="font-mono text-sm font-bold">
            {val !== null && val !== undefined ? formatIdNumber(val) : 'Tidak ada data'}
          </span>
          <span className="text-slate-300 text-[11px]">{unit}</span>
        </div>
      </div>
    );
  }
  return null;
};

export const TrendSection: React.FC<TrendSectionProps> = ({ records, filters }) => {
  const [activeTab, setActiveTab] = useState<'grid' | 'populasi' | 'pemotongan' | 'daging' | 'telur'>('grid');

  const trendResult = getTrendData(records, filters);
  const narrative = generateTrendNarrative(trendResult, filters);

  const panels = [
    {
      id: 'populasi',
      title: 'Tren Populasi Ternak',
      dataKey: 'populasi',
      unit: 'ekor',
      stroke: '#166534', // forest green
      accent: 'emerald',
    },
    {
      id: 'pemotongan',
      title: 'Tren Pemotongan Ternak',
      dataKey: 'pemotongan',
      unit: 'ekor',
      stroke: '#0284c7', // sky blue
      accent: 'sky',
    },
    {
      id: 'daging',
      title: 'Tren Produksi Daging',
      dataKey: 'produksiDaging',
      unit: 'kg',
      stroke: '#d97706', // amber
      accent: 'amber',
    },
    {
      id: 'telur',
      title: 'Tren Produksi Telur',
      dataKey: 'produksiTelur',
      unit: 'kg',
      stroke: '#8b5cf6', // purple
      accent: 'purple',
    },
  ];

  const displayedPanels =
    activeTab === 'grid'
      ? panels
      : panels.filter((p) => p.id === activeTab);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 sm:p-5 mb-6">
      {/* Header Card & Filter Chips */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900">
              Grafik 1: Tren 5 Tahun Terakhir ({trendResult.yearsSpan})
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Perkembangan populasi, pemotongan, dan produksi per tahun
            {trendResult.isLessThan5Years && ' (data tersedia kurang dari 5 tahun)'}.
          </p>
        </div>

        {/* Behavioral Chips */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mr-1.5"></span>
            Filter berlaku: {filters.kabupatenKota}, {filters.jenisTernak}
          </span>
          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mr-1.5"></span>
            Tidak dipengaruhi: Filter Tahun
          </span>
        </div>
      </div>

      {/* View Switcher Tabs (Semua 4 Panel vs Fokus per Indikator - seperti pada Grafik 2) */}
      <div className="flex items-center justify-between mt-3 mb-2 flex-wrap gap-2">
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs">
          <button
            onClick={() => setActiveTab('grid')}
            type="button"
            className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer flex items-center gap-1 ${
              activeTab === 'grid'
                ? 'bg-white text-slate-800 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
            <span>4 Panel (Grid 2x2)</span>
          </button>
          <button
            onClick={() => setActiveTab('populasi')}
            type="button"
            className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
              activeTab === 'populasi'
                ? 'bg-white text-slate-800 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Populasi
          </button>
          <button
            onClick={() => setActiveTab('pemotongan')}
            type="button"
            className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
              activeTab === 'pemotongan'
                ? 'bg-white text-slate-800 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Pemotongan
          </button>
          <button
            onClick={() => setActiveTab('daging')}
            type="button"
            className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
              activeTab === 'daging'
                ? 'bg-white text-slate-800 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Daging
          </button>
          <button
            onClick={() => setActiveTab('telur')}
            type="button"
            className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
              activeTab === 'telur'
                ? 'bg-white text-slate-800 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Telur
          </button>
        </div>

        <div className="text-[11px] text-slate-500 hidden sm:block">
          {activeTab === 'grid' ? 'Menampilkan 4 panel terpisah' : `Fokus indikator: ${displayedPanels[0]?.title}`}
        </div>
      </div>

      {/* Panels Display: Grid 2x2 Desktop, 1 Kolom Mobile, atau Single Tab View */}
      <div
        className={`grid gap-4 my-3 ${
          activeTab === 'grid' ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'
        }`}
      >
        {displayedPanels.map((panel) => {
          const hasAnyData = trendResult.data.some(
            (d) => (d as any)[panel.dataKey] !== null
          );
          const chartHeight = activeTab === 'grid' ? 200 : 320;

          return (
            <div
              key={panel.id}
              className="p-3.5 rounded-lg border border-slate-100 bg-slate-50/60 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-700">
                  {panel.title}
                </span>
                <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-600">
                  Satuan: {panel.unit}
                </span>
              </div>

              {hasAnyData ? (
                <div style={{ width: '100%', height: chartHeight }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={trendResult.data}
                      margin={{ top: 10, right: 20, left: 0, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis
                        dataKey="tahun"
                        tick={{ fontSize: 11, fill: '#64748b' }}
                        axisLine={{ stroke: '#cbd5e1' }}
                      />
                      <YAxis
                        tick={{ fontSize: 10, fill: '#64748b' }}
                        axisLine={{ stroke: '#cbd5e1' }}
                        tickFormatter={(val) => {
                          if (val >= 1000000) return `${(val / 1000000).toFixed(1)}jt`;
                          if (val >= 1000) return `${(val / 1000).toFixed(0)}rb`;
                          return val;
                        }}
                      />
                      <Tooltip
                        content={<CustomTooltip unit={panel.unit} />}
                      />
                      <Line
                        type="monotone"
                        dataKey={panel.dataKey}
                        stroke={panel.stroke}
                        strokeWidth={2.5}
                        dot={{ r: 4, fill: panel.stroke, strokeWidth: 2, stroke: '#fff' }}
                        activeDot={{ r: 6 }}
                        connectNulls={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div
                  style={{ height: chartHeight }}
                  className="w-full flex flex-col items-center justify-center text-slate-400 text-xs italic"
                >
                  <Info className="w-5 h-5 mb-1 text-slate-300" />
                  Tidak ada data untuk komoditas ini
                </div>
              )}
            </div>
          );
        })}
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
