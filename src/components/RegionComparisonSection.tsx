import React, { useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts';
import { FilterState, LivestockRecord } from '../types/livestock';
import {
  getRegionalComparisonData,
  formatIdNumber,
  RegionComparisonItem,
} from '../utils/aggregations';
import { generateRegionalNarrative } from '../utils/narratives';
import { BarChart3, Sparkles, MapPin, Eye, Grid } from 'lucide-react';

interface RegionComparisonSectionProps {
  records: LivestockRecord[];
  filters: FilterState;
}

interface CustomBarTooltipProps {
  active?: boolean;
  payload?: any[];
  unit: string;
}

const CustomBarTooltip: React.FC<CustomBarTooltipProps> = ({
  active,
  payload,
  unit,
}) => {
  if (active && payload && payload.length) {
    const data: RegionComparisonItem = payload[0].payload;
    return (
      <div className="bg-slate-900 text-white px-3 py-2 rounded-lg shadow-xl text-xs border border-slate-700">
        <div className="font-semibold text-emerald-400 flex items-center gap-1">
          <MapPin className="w-3 h-3" />
          {data.kabupatenKota}
          {data.isSelected && (
            <span className="text-[10px] bg-amber-500 text-slate-950 font-bold px-1.5 py-0.2 rounded ml-1">
              Dipilih
            </span>
          )}
        </div>
        <div className="mt-1 flex items-baseline gap-1">
          <span className="font-mono text-sm font-bold">
            {data.hasData ? formatIdNumber(payload[0].value) : 'Tidak ada data'}
          </span>
          <span className="text-slate-300 text-[11px]">{unit}</span>
        </div>
      </div>
    );
  }
  return null;
};

export const RegionComparisonSection: React.FC<RegionComparisonSectionProps> = ({
  records,
  filters,
}) => {
  const [activeTab, setActiveTab] = useState<'grid' | 'populasi' | 'pemotongan' | 'daging' | 'telur'>('grid');

  const regional = getRegionalComparisonData(records, filters);
  const narrative = generateRegionalNarrative(regional.items, filters);

  const panels = [
    {
      id: 'populasi',
      title: 'Perbandingan Populasi Ternak',
      data: regional.byPopulasi,
      dataKey: 'populasi',
      unit: 'ekor',
      defaultColor: '#0284c7', // sky
      highlightColor: '#d97706', // amber highlight
    },
    {
      id: 'pemotongan',
      title: 'Perbandingan Pemotongan Ternak',
      data: regional.byPemotongan,
      dataKey: 'pemotongan',
      unit: 'ekor',
      defaultColor: '#16a34a', // emerald
      highlightColor: '#d97706',
    },
    {
      id: 'daging',
      title: 'Perbandingan Produksi Daging',
      data: regional.byDaging,
      dataKey: 'produksiDaging',
      unit: 'kg',
      defaultColor: '#ea580c', // orange
      highlightColor: '#15803d',
    },
    {
      id: 'telur',
      title: 'Perbandingan Produksi Telur',
      data: regional.byTelur,
      dataKey: 'produksiTelur',
      unit: 'kg',
      defaultColor: '#9333ea', // purple
      highlightColor: '#d97706',
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
              <BarChart3 className="w-4 h-4" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900">
              Grafik 2: Perbandingan 14 Wilayah Kabupaten/Kota
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Peringkat wilayah diurutkan dari nilai terbesar (Tahun {filters.tahun})
            {filters.kabupatenKota !== 'Seluruh Provinsi' && (
              <span className="font-semibold text-amber-700 ml-1">
                • Wilayah "{filters.kabupatenKota}" disorot
              </span>
            )}
            .
          </p>
        </div>

        {/* Behavioral Chips */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mr-1.5"></span>
            Filter berlaku: Tahun ({filters.tahun}), {filters.jenisTernak}
          </span>
          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mr-1.5"></span>
            Tidak dipengaruhi: Wilayah ({filters.kabupatenKota !== 'Seluruh Provinsi' ? 'hanya sorot' : 'tanpa filter'})
          </span>
        </div>
      </div>

      {/* View Switcher Tabs (Semua 4 Panel vs Fokus per Indikator) */}
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

        {filters.kabupatenKota !== 'Seluruh Provinsi' && (
          <div className="flex items-center gap-1.5 text-xs text-amber-800 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200">
            <span className="w-2.5 h-2.5 rounded-sm bg-amber-600 inline-block"></span>
            <span>Warna oranye/sorot menandai wilayah: <strong>{filters.kabupatenKota}</strong></span>
          </div>
        )}
      </div>

      {/* Panels Display */}
      <div
        className={`grid gap-4 my-3 ${
          activeTab === 'grid' ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'
        }`}
      >
        {displayedPanels.map((panel) => {
          const chartHeight = activeTab === 'grid' ? 420 : 480;

          return (
            <div
              key={panel.id}
              className="p-3.5 rounded-lg border border-slate-100 bg-slate-50/60 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-800">
                  {panel.title}
                </span>
                <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-600">
                  Satuan: {panel.unit}
                </span>
              </div>

              {panel.data.length > 0 && panel.data.some((d) => (d as any)[panel.dataKey] > 0) ? (
                <div style={{ width: '100%', height: chartHeight }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={panel.data}
                      margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                      <XAxis
                        type="number"
                        tick={{ fontSize: 10, fill: '#64748b' }}
                        tickFormatter={(val) => {
                          if (val >= 1000000) return `${(val / 1000000).toFixed(1)}jt`;
                          if (val >= 1000) return `${(val / 1000).toFixed(0)}rb`;
                          return val;
                        }}
                      />
                      <YAxis
                        type="category"
                        dataKey="kabupatenKota"
                        tick={{ fontSize: 11, fill: '#334155' }}
                        width={95}
                        interval={0}
                      />
                      <Tooltip content={<CustomBarTooltip unit={panel.unit} />} />
                      <Bar dataKey={panel.dataKey} radius={[0, 4, 4, 0]}>
                        {panel.data.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.isSelected ? panel.highlightColor : panel.defaultColor}
                            stroke={entry.isSelected ? '#b45309' : undefined}
                            strokeWidth={entry.isSelected ? 2 : 0}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div
                  style={{ height: chartHeight }}
                  className="w-full flex flex-col items-center justify-center text-slate-400 text-xs italic"
                >
                  Tidak ada data produksi untuk komoditas ini
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
