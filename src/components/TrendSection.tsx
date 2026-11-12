import React, { useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { FilterState, LivestockRecord } from '../types/livestock';
import { getTrendData, formatIdNumber } from '../utils/aggregations';
import { generateTrendNarrative } from '../utils/narratives';
import {
  TrendingUp,
  Sparkles,
  Layers,
  Grid,
  Eye,
  EyeOff,
  RotateCcw,
  Info,
} from 'lucide-react';

interface TrendSectionProps {
  records: LivestockRecord[];
  filters: FilterState;
}

type SeriesKey = 'populasi' | 'pemotongan' | 'produksiDaging' | 'produksiTelur';

interface SeriesConfig {
  key: SeriesKey;
  name: string;
  unit: string;
  yAxisId: 'left' | 'right';
  stroke: string;
  dashed?: boolean;
}

const SERIES_CONFIG: SeriesConfig[] = [
  {
    key: 'populasi',
    name: 'Populasi (ekor)',
    unit: 'ekor',
    yAxisId: 'left',
    stroke: '#15803d', // Green
  },
  {
    key: 'pemotongan',
    name: 'Pemotongan (ekor)',
    unit: 'ekor',
    yAxisId: 'left',
    stroke: '#0284c7', // Sky Blue
    dashed: true,
  },
  {
    key: 'produksiDaging',
    name: 'Produksi Daging (kg)',
    unit: 'kg',
    yAxisId: 'right',
    stroke: '#ea580c', // Orange
  },
  {
    key: 'produksiTelur',
    name: 'Produksi Telur (kg)',
    unit: 'kg',
    yAxisId: 'right',
    stroke: '#8b5cf6', // Purple
  },
];

// Tooltip khusus untuk 4 Panel Grid satuan
const CustomSingleTooltip: React.FC<{
  active?: boolean;
  payload?: any[];
  label?: string | number;
  unit: string;
}> = ({ active, payload, label, unit }) => {
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

// Tooltip khusus untuk Grafik Gabungan Dual Axis Y
const CustomCombinedTooltip: React.FC<any> = ({
  active,
  payload,
  label,
  visibleSeries,
}) => {
  if (active && payload && payload.length) {
    const visiblePayload = payload.filter(
      (item: any) => visibleSeries[item.dataKey as SeriesKey]
    );

    if (visiblePayload.length === 0) return null;

    return (
      <div className="bg-slate-900 text-white p-3 rounded-xl shadow-2xl text-xs border border-slate-700 min-w-[220px]">
        <div className="font-bold text-emerald-400 border-b border-slate-700/80 pb-1.5 mb-2 flex items-center justify-between">
          <span>Tahun {label}</span>
          <span className="text-[10px] text-slate-400 font-normal">Dual Axis Y</span>
        </div>
        <div className="space-y-1.5">
          {visiblePayload.map((item: any, idx: number) => {
            const isEkor =
              item.dataKey === 'populasi' || item.dataKey === 'pemotongan';
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

export const TrendSection: React.FC<TrendSectionProps> = ({ records, filters }) => {
  // Hanya 2 pilihan tampilan: 'gabungan' (Dual Axis Y) dan 'grid' (4 Panel Grid 2x2)
  const [activeTab, setActiveTab] = useState<'gabungan' | 'grid'>('gabungan');

  // State visibilitas tiap garis data pada Grafik Gabungan
  const [visibleSeries, setVisibleSeries] = useState<Record<SeriesKey, boolean>>({
    populasi: true,
    pemotongan: true,
    produksiDaging: true,
    produksiTelur: true,
  });

  const trendResult = getTrendData(records, filters);
  const narrative = generateTrendNarrative(trendResult, filters);

  const toggleSeries = (key: SeriesKey) => {
    setVisibleSeries((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const showAllSeries = () => {
    setVisibleSeries({
      populasi: true,
      pemotongan: true,
      produksiDaging: true,
      produksiTelur: true,
    });
  };

  const allVisible =
    visibleSeries.populasi &&
    visibleSeries.pemotongan &&
    visibleSeries.produksiDaging &&
    visibleSeries.produksiTelur;

  const showLeftAxis = visibleSeries.populasi || visibleSeries.pemotongan;
  const showRightAxis =
    visibleSeries.produksiDaging || visibleSeries.produksiTelur;

  const formatCompact = (val: number) => {
    if (val >= 1000000) return `${(val / 1000000).toFixed(1)}jt`;
    if (val >= 1000) return `${(val / 1000).toFixed(0)}rb`;
    return val.toString();
  };

  // Konfigurasi 4 panel untuk tampilan Grid 2x2
  const gridPanels = [
    {
      id: 'populasi',
      title: 'Tren Populasi Ternak',
      dataKey: 'populasi',
      unit: 'ekor',
      stroke: '#15803d',
    },
    {
      id: 'pemotongan',
      title: 'Tren Pemotongan Ternak',
      dataKey: 'pemotongan',
      unit: 'ekor',
      stroke: '#0284c7',
    },
    {
      id: 'daging',
      title: 'Tren Produksi Daging',
      dataKey: 'produksiDaging',
      unit: 'kg',
      stroke: '#ea580c',
    },
    {
      id: 'telur',
      title: 'Tren Produksi Telur',
      dataKey: 'produksiTelur',
      unit: 'kg',
      stroke: '#8b5cf6',
    },
  ];

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

      {/* View Switcher: Hanya 2 pilihan yaitu Grafik Gabungan & 4 Panel (Grid 2x2) */}
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

        <div className="text-[11px] text-slate-500 hidden sm:block">
          {activeTab === 'gabungan'
            ? '1 Grafik terpadu dengan 2 Axis Y (Sumbu Kiri: Ekor • Sumbu Kanan: Kg)'
            : 'Menampilkan 4 panel terpisah (grid 2x2 desktop, 1 kolom ponsel)'}
        </div>
      </div>

      {/* KONTEN TAMPILAN 1: Grafik Gabungan Dual Axis Y */}
      {activeTab === 'gabungan' && (
        <div className="my-2">
          {/* Panel Kontrol Interaktif: Klik jenis data untuk menampilkan / sembunyikan garis */}
          <div className="my-2.5 p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-700" />
                <span className="text-xs font-bold text-slate-800">
                  Klik jenis data untuk menampilkan / menyembunyikan garis grafik:
                </span>
              </div>
              {!allVisible && (
                <button
                  type="button"
                  onClick={showAllSeries}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 bg-white hover:bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded cursor-pointer transition-colors shadow-2xs self-start sm:self-auto"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Tampilkan Semua Garis</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {SERIES_CONFIG.map((s) => {
                const isVisible = visibleSeries[s.key];
                return (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => toggleSeries(s.key)}
                    className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg border text-xs font-medium cursor-pointer transition-all select-none ${
                      isVisible
                        ? 'bg-white border-slate-300 shadow-2xs text-slate-900 ring-1 ring-slate-200'
                        : 'bg-slate-100/90 border-dashed border-slate-300 text-slate-400 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`w-3 h-3 rounded-full shrink-0 shadow-xs transition-opacity ${
                          isVisible ? '' : 'opacity-30'
                        }`}
                        style={{ backgroundColor: s.stroke }}
                      />
                      <span
                        className={`truncate font-semibold ${
                          isVisible ? 'text-slate-800' : 'line-through text-slate-400'
                        }`}
                      >
                        {s.name}
                      </span>
                    </div>
                    {isVisible ? (
                      <Eye className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    ) : (
                      <EyeOff className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Area Grafik Dual Axis Y */}
          <div className="p-3.5 sm:p-4 rounded-xl border border-slate-200 bg-slate-50/70">
            {/* Header Keterangan Sumbu */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 pb-2.5 border-b border-slate-200">
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-slate-800">
                  Tren Gabungan Populasi, Pemotongan, Daging & Telur
                </h4>
                <p className="text-[11px] text-slate-500">
                  Grafik terpadu dengan pemisahan sumbu Y: Ekor (kiri) dan Kg (kanan).
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-2xs">
                <div
                  className={`flex items-center gap-1.5 transition-opacity ${
                    showLeftAxis ? '' : 'opacity-40 line-through'
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-700"></span>
                  <span className="text-[11px] font-semibold text-emerald-900">
                    Sumbu Kiri: Ekor
                  </span>
                </div>
                <span className="text-slate-300">|</span>
                <div
                  className={`flex items-center gap-1.5 transition-opacity ${
                    showRightAxis ? '' : 'opacity-40 line-through'
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-orange-600"></span>
                  <span className="text-[11px] font-semibold text-orange-900">
                    Sumbu Kanan: Kg
                  </span>
                </div>
              </div>
            </div>

            {/* Visualisasi LineChart */}
            <div className="w-full h-80 sm:h-96">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={trendResult.data}
                  margin={{ top: 15, right: 25, left: 10, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="tahun"
                    tick={{ fontSize: 11, fill: '#475569' }}
                    axisLine={{ stroke: '#cbd5e1' }}
                  />

                  {/* Sumbu Y Kiri: Ekor (Populasi & Pemotongan) */}
                  <YAxis
                    yAxisId="left"
                    orientation="left"
                    hide={!showLeftAxis}
                    stroke="#166534"
                    tick={{ fontSize: 10, fill: '#166534' }}
                    axisLine={{ stroke: '#166534' }}
                    tickFormatter={formatCompact}
                    label={{
                      value: 'Satuan: Ekor (Populasi & Pemotongan)',
                      angle: -90,
                      position: 'insideLeft',
                      style: {
                        textAnchor: 'middle',
                        fill: '#166534',
                        fontSize: 10,
                        fontWeight: 600,
                      },
                    }}
                  />

                  {/* Sumbu Y Kanan: Kg (Produksi Daging & Telur) */}
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    hide={!showRightAxis}
                    stroke="#ea580c"
                    tick={{ fontSize: 10, fill: '#ea580c' }}
                    axisLine={{ stroke: '#ea580c' }}
                    tickFormatter={formatCompact}
                    label={{
                      value: 'Satuan: Kg (Daging & Telur)',
                      angle: 90,
                      position: 'insideRight',
                      style: {
                        textAnchor: 'middle',
                        fill: '#ea580c',
                        fontSize: 10,
                        fontWeight: 600,
                      },
                    }}
                  />

                  <Tooltip
                    content={
                      <CustomCombinedTooltip visibleSeries={visibleSeries} />
                    }
                  />

                  {/* Legenda yang juga interaktif dan bisa diklik */}
                  <Legend
                    verticalAlign="top"
                    wrapperStyle={{ paddingBottom: '14px' }}
                    onClick={(e: any) => {
                      if (e && e.dataKey) {
                        toggleSeries(e.dataKey as SeriesKey);
                      }
                    }}
                    formatter={(value, entry: any) => {
                      const key = entry.dataKey as SeriesKey;
                      const isVisible = visibleSeries[key];
                      return (
                        <span
                          title="Klik untuk tampilkan / sembunyikan garis ini"
                          className={`text-xs font-semibold cursor-pointer select-none transition-all px-2 py-0.5 rounded inline-flex items-center gap-1.5 ${
                            isVisible
                              ? 'text-slate-800 hover:bg-slate-200/70'
                              : 'text-slate-400 line-through hover:text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          <span
                            className={`w-2.5 h-2.5 rounded-full inline-block transition-opacity ${
                              isVisible ? '' : 'opacity-30'
                            }`}
                            style={{ backgroundColor: entry.color }}
                          />
                          <span>{value}</span>
                          {!isVisible && (
                            <span className="text-[10px] text-slate-400 font-normal no-underline bg-slate-200/70 px-1 rounded">
                              sembunyi
                            </span>
                          )}
                        </span>
                      );
                    }}
                  />

                  {/* Garis 1: Populasi (Ekor, Sumbu Kiri) */}
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="populasi"
                    name="Populasi (ekor)"
                    stroke="#15803d"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: '#15803d', stroke: '#fff', strokeWidth: 2 }}
                    activeDot={{ r: 6 }}
                    connectNulls={false}
                    hide={!visibleSeries.populasi}
                  />

                  {/* Garis 2: Pemotongan (Ekor, Sumbu Kiri) */}
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="pemotongan"
                    name="Pemotongan (ekor)"
                    stroke="#0284c7"
                    strokeWidth={2.5}
                    strokeDasharray="4 2"
                    dot={{ r: 4, fill: '#0284c7', stroke: '#fff', strokeWidth: 2 }}
                    activeDot={{ r: 6 }}
                    connectNulls={false}
                    hide={!visibleSeries.pemotongan}
                  />

                  {/* Garis 3: Produksi Daging (Kg, Sumbu Kanan) */}
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="produksiDaging"
                    name="Produksi Daging (kg)"
                    stroke="#ea580c"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: '#ea580c', stroke: '#fff', strokeWidth: 2 }}
                    activeDot={{ r: 6 }}
                    connectNulls={false}
                    hide={!visibleSeries.produksiDaging}
                  />

                  {/* Garis 4: Produksi Telur (Kg, Sumbu Kanan) */}
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="produksiTelur"
                    name="Produksi Telur (kg)"
                    stroke="#8b5cf6"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: '#8b5cf6', stroke: '#fff', strokeWidth: 2 }}
                    activeDot={{ r: 6 }}
                    connectNulls={false}
                    hide={!visibleSeries.produksiTelur}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* KONTEN TAMPILAN 2: 4 Panel Terpisah (Grid 2x2 Desktop, 1 Kolom Mobile) */}
      {activeTab === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-3">
          {gridPanels.map((panel) => {
            const hasAnyData = trendResult.data.some(
              (d) => (d as any)[panel.dataKey] !== null
            );

            return (
              <div
                key={panel.id}
                className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 flex flex-col justify-between"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-800">
                    {panel.title}
                  </span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700 font-semibold">
                    Satuan: {panel.unit}
                  </span>
                </div>

                {hasAnyData ? (
                  <div className="w-full h-56 sm:h-60">
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
                          tickFormatter={formatCompact}
                        />
                        <Tooltip
                          content={<CustomSingleTooltip unit={panel.unit} />}
                        />
                        <Line
                          type="monotone"
                          dataKey={panel.dataKey}
                          stroke={panel.stroke}
                          strokeWidth={2.5}
                          dot={{
                            r: 4,
                            fill: panel.stroke,
                            strokeWidth: 2,
                            stroke: '#fff',
                          }}
                          activeDot={{ r: 6 }}
                          connectNulls={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="w-full h-56 sm:h-60 flex flex-col items-center justify-center text-slate-400 text-xs italic">
                    <Info className="w-5 h-5 mb-1 text-slate-300" />
                    Tidak ada data untuk komoditas ini
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
