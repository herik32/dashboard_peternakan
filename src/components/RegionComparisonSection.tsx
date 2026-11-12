import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  Legend,
} from 'recharts';
import { FilterState, LivestockRecord } from '../types/livestock';
import {
  getRegionalComparisonData,
  formatIdNumber,
  RegionComparisonItem,
} from '../utils/aggregations';
import { generateRegionalNarrative } from '../utils/narratives';
import { BarChart3, Sparkles, MapPin, Grid, Layers } from 'lucide-react';

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

// Tooltip khusus untuk Grafik Gabungan Perbandingan Wilayah (Dual Axis Y)
const CustomRegionalCombinedTooltip: React.FC<any> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const itemData = payload[0]?.payload as RegionComparisonItem | undefined;
    return (
      <div className="bg-slate-900 text-white p-3 rounded-xl shadow-2xl text-xs border border-slate-700 min-w-[220px]">
        <div className="font-bold text-emerald-400 border-b border-slate-700/80 pb-1.5 mb-2 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5" />
            <span>{label}</span>
          </div>
          {itemData?.isSelected && (
            <span className="text-[10px] bg-amber-500 text-slate-950 font-bold px-1.5 py-0.2 rounded">
              Dipilih di Filter
            </span>
          )}
        </div>
        <div className="space-y-1.5">
          {payload.map((item: any, idx: number) => {
            const isEkor = item.dataKey === 'populasi' || item.dataKey === 'pemotongan';
            const unit = isEkor ? 'ekor' : 'kg';
            return (
              <div key={idx} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-slate-200 text-[11px]">{item.name}</span>
                </div>
                <span className="font-mono font-bold text-white text-[11px]">
                  {item.value !== null && item.value !== undefined
                    ? `${formatIdNumber(item.value)} ${unit}`
                    : 'Tidak ada data'}
                </span>
              </div>
            );
          })}
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
  const [activeTab, setActiveTab] = useState<'gabungan' | 'grid'>('gabungan');

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

  const displayedPanels = panels;

  const formatCompact = (val: number) => {
    if (val >= 1000000) return `${(val / 1000000).toFixed(1)}jt`;
    if (val >= 1000) return `${(val / 1000).toFixed(0)}rb`;
    return val.toString();
  };

  // Data terurut untuk grafik gabungan (diurutkan berdasarkan populasi tertinggi ke terendah)
  const combinedData = useMemo(() => {
    return [...regional.byPopulasi];
  }, [regional.byPopulasi]);

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
              Grafik 2: Perbandingan Wilayah Kabupaten/Kota
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Perbandingan antar wilayah (Tahun {filters.tahun})
            {filters.kabupatenKota !== 'Seluruh Provinsi' && filters.kabupatenKota !== '' && (
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
            Tidak dipengaruhi: Wilayah ({filters.kabupatenKota !== 'Seluruh Provinsi' && filters.kabupatenKota !== '' ? 'hanya sorot' : 'tanpa filter'})
          </span>
        </div>
      </div>

      {/* View Switcher Tabs: Grafik Gabungan Dual Axis, 4 Panel Grid, dan Fokus per Indikator */}
      <div className="flex items-center justify-between mt-3 mb-2 flex-wrap gap-2">
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs">
          <button
            onClick={() => setActiveTab('gabungan')}
            type="button"
            className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'gabungan'
                ? 'bg-emerald-800 text-white shadow-xs font-semibold'
                : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Grafik Gabungan (Dual Axis Y)</span>
          </button>
          <button
            onClick={() => setActiveTab('grid')}
            type="button"
            className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'grid'
                ? 'bg-emerald-800 text-white shadow-xs font-semibold'
                : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
            <span>4 Panel (Grid 2x2)</span>
          </button>
        </div>

        {filters.kabupatenKota !== 'Seluruh Provinsi' && filters.kabupatenKota !== '' && (
          <div className="flex items-center gap-1.5 text-xs text-amber-800 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200">
            <span className="w-2.5 h-2.5 rounded-sm bg-amber-600 inline-block"></span>
            <span>Wilayah terpilih: <strong>{filters.kabupatenKota}</strong></span>
          </div>
        )}
      </div>

      {/* TAMPILAN 1: Grafik Gabungan Perbandingan Wilayah Dual Axis Y */}
      {activeTab === 'gabungan' ? (
        <div className="p-3.5 sm:p-4 rounded-xl border border-slate-200 bg-slate-50/70 my-3">
          {/* Header Legend & Keterangan Sumbu */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 pb-2.5 border-b border-slate-200">
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-slate-800">
                Perbandingan Gabungan Seluruh Wilayah (Dual Axis Y)
              </h4>
              <p className="text-[11px] text-slate-500">
                Menyajikan 4 indikator peternakan untuk tiap kabupaten/kota dalam 1 grafik kluster batang terpadu.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-2xs">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-700"></span>
                <span className="text-[11px] font-semibold text-emerald-900">
                  Sumbu Kiri: Ekor
                </span>
              </div>
              <span className="text-slate-300">|</span>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-600"></span>
                <span className="text-[11px] font-semibold text-orange-900">
                  Sumbu Kanan: Kg
                </span>
              </div>
            </div>
          </div>

          {/* Area Grafik Bar Kluster Dual Axis Y */}
          {combinedData.length > 0 && combinedData.some((d) => d.populasi > 0 || (d.produksiDaging ?? 0) > 0) ? (
            <div className="w-full h-96 sm:h-[420px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={combinedData}
                  margin={{ top: 15, right: 25, left: 10, bottom: 65 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="kabupatenKota"
                    interval={0}
                    angle={-35}
                    textAnchor="end"
                    height={70}
                    tick={(props) => {
                      const { x, y, payload } = props;
                      const isHighlighted =
                        filters.kabupatenKota !== 'Seluruh Provinsi' &&
                        filters.kabupatenKota !== '' &&
                        payload.value.toLowerCase() === filters.kabupatenKota.toLowerCase();
                      return (
                        <g transform={`translate(${x},${y})`}>
                          <text
                            x={0}
                            y={0}
                            dy={12}
                            textAnchor="end"
                            fill={isHighlighted ? '#b45309' : '#334155'}
                            fontWeight={isHighlighted ? 700 : 500}
                            fontSize={10}
                            transform="rotate(-35)"
                          >
                            {payload.value}
                            {isHighlighted ? ' ★' : ''}
                          </text>
                        </g>
                      );
                    }}
                  />

                  {/* Sumbu Y Kiri: Ekor (Populasi & Pemotongan) */}
                  <YAxis
                    yAxisId="left"
                    orientation="left"
                    stroke="#166534"
                    tick={{ fontSize: 10, fill: '#166534' }}
                    axisLine={{ stroke: '#166534' }}
                    tickFormatter={formatCompact}
                    label={{
                      value: 'Satuan: Ekor (Populasi & Pemotongan)',
                      angle: -90,
                      position: 'insideLeft',
                      style: { textAnchor: 'middle', fill: '#166534', fontSize: 10, fontWeight: 600 },
                    }}
                  />

                  {/* Sumbu Y Kanan: Kg (Produksi Daging & Telur) */}
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    stroke="#ea580c"
                    tick={{ fontSize: 10, fill: '#ea580c' }}
                    axisLine={{ stroke: '#ea580c' }}
                    tickFormatter={formatCompact}
                    label={{
                      value: 'Satuan: Kg (Daging & Telur)',
                      angle: 90,
                      position: 'insideRight',
                      style: { textAnchor: 'middle', fill: '#ea580c', fontSize: 10, fontWeight: 600 },
                    }}
                  />

                  <Tooltip content={<CustomRegionalCombinedTooltip />} />
                  <Legend
                    verticalAlign="top"
                    wrapperStyle={{ paddingBottom: '12px' }}
                    formatter={(value) => (
                      <span className="text-xs font-medium text-slate-800 mr-2">
                        {value}
                      </span>
                    )}
                  />

                  {/* Batang 1: Populasi (Ekor, Sumbu Kiri) */}
                  <Bar
                    yAxisId="left"
                    dataKey="populasi"
                    name="Populasi (ekor)"
                    fill="#15803d" // Green
                    radius={[3, 3, 0, 0]}
                  />

                  {/* Batang 2: Pemotongan (Ekor, Sumbu Kiri) */}
                  <Bar
                    yAxisId="left"
                    dataKey="pemotongan"
                    name="Pemotongan (ekor)"
                    fill="#0284c7" // Sky Blue
                    radius={[3, 3, 0, 0]}
                  />

                  {/* Batang 3: Produksi Daging (Kg, Sumbu Kanan) */}
                  <Bar
                    yAxisId="right"
                    dataKey="produksiDaging"
                    name="Produksi Daging (kg)"
                    fill="#ea580c" // Orange
                    radius={[3, 3, 0, 0]}
                  />

                  {/* Batang 4: Produksi Telur (Kg, Sumbu Kanan) */}
                  <Bar
                    yAxisId="right"
                    dataKey="produksiTelur"
                    name="Produksi Telur (kg)"
                    fill="#8b5cf6" // Purple
                    radius={[3, 3, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="w-full h-80 flex flex-col items-center justify-center text-slate-400 text-xs italic">
              Tidak ada data perbandingan wilayah untuk kriteria ini
            </div>
          )}
        </div>
      ) : (
        /* TAMPILAN 2: 4 Panel Horizontal Bar Chart (Grid 2x2 atau Tab Tunggal) */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-3">
          {displayedPanels.map((panel) => {
            const chartHeight = 420;

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
                          tickFormatter={formatCompact}
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
      )}

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
