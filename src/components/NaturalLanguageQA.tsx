import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { FilterState, LivestockRecord } from '../types/livestock';
import { formatIdNumber, formatIdPercent } from '../utils/aggregations';
import {
  executeQAPlan,
  QAExecutionResult,
  QAQueryPlan,
} from '../utils/qaEngine';
import {
  MessageSquareText,
  Send,
  Sparkles,
  BarChart2,
  Table as TableIcon,
  LayoutGrid,
  Loader2,
  AlertCircle,
  Trash2,
  ChevronDown,
  ChevronUp,
  HelpCircle,
} from 'lucide-react';

interface NaturalLanguageQAProps {
  records: LivestockRecord[];
  filters: FilterState;
  availableYears: number[];
  availableRegions: string[];
  availableLivestock: string[];
}

interface QAEntry {
  id: string;
  question: string;
  result: QAExecutionResult;
  viewMode: 'both' | 'chart' | 'table';
}

const EXAMPLE_QUESTIONS = [
  'Kabupaten mana dengan populasi sapi tertinggi tahun 2023?',
  'Bagaimana tren produksi daging di seluruh provinsi?',
  'Komposisi produksi telur per jenis ternak tahun 2024',
  'Bandingkan populasi dan pemotongan sapi di Kubu Raya dan Ketapang tahun 2024',
];

const formatCompact = (val: number) => {
  if (val >= 1000000) return `${(val / 1000000).toFixed(1)}jt`;
  if (val >= 1000) return `${(val / 1000).toFixed(0)}rb`;
  return val.toString();
};

const CustomQATooltip: React.FC<{
  active?: boolean;
  payload?: any[];
  unit: string;
  metricLabel: string;
}> = ({ active, payload, unit, metricLabel }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-900 text-white px-3 py-2 rounded-lg shadow-xl text-xs border border-slate-700">
        <div className="font-semibold text-emerald-400">{data.label}</div>
        <div className="mt-1 flex items-baseline gap-1.5">
          <span className="text-slate-300 text-[11px]">{metricLabel}:</span>
          <span className="font-mono text-sm font-bold">
            {formatIdNumber(data.primaryValue)} {unit}
          </span>
        </div>
        {data.sharePercent > 0 && (
          <div className="text-[11px] text-emerald-300 font-mono mt-0.5">
            Kontribusi: {formatIdPercent(data.sharePercent)}
          </div>
        )}
      </div>
    );
  }
  return null;
};

export const NaturalLanguageQA: React.FC<NaturalLanguageQAProps> = ({
  records,
  filters,
  availableYears,
  availableRegions,
  availableLivestock,
}) => {
  const [question, setQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [entries, setEntries] = useState<QAEntry[]>([]);
  const [isExpanded, setIsExpanded] = useState(true);

  const schemaPayload = useMemo(
    () => ({
      years: availableYears,
      regions: availableRegions,
      livestockTypes: availableLivestock,
    }),
    [availableYears, availableRegions, availableLivestock]
  );

  const handleAsk = async (rawQuestion?: string) => {
    const q = (rawQuestion ?? question).trim();
    if (!q || isLoading) return;

    if (records.length === 0) {
      setErrorMsg(
        'Data statistik saat ini kosong. Silakan muat atau unggah berkas CSV terlebih dahulu.'
      );
      return;
    }

    setErrorMsg(null);
    setIsLoading(true);
    setIsExpanded(true);
    if (!rawQuestion) {
      setQuestion('');
    }

    try {
      const history = entries.slice(0, 3).map((e) => ({
        question: e.question,
        summary: e.result.answerText,
      }));

      const resp = await fetch('/api/qa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: q,
          schema: schemaPayload,
          activeFilters: filters,
          history,
        }),
      });

      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(
          data?.error || 'Gagal memproses pertanyaan. Silakan coba lagi.'
        );
      }

      const plan = data.plan as QAQueryPlan;
      const result = executeQAPlan(plan, records);

      const newEntry: QAEntry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        question: q,
        result,
        viewMode: 'both',
      };

      setEntries((prev) => [newEntry, ...prev]);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Terjadi kesalahan jaringan saat menghubungi asisten analitik.';
      setErrorMsg(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const updateEntryViewMode = (
    id: string,
    mode: 'both' | 'chart' | 'table'
  ) => {
    setEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, viewMode: mode } : e))
    );
  };

  return (
    <section className="bg-white rounded-xl border border-emerald-200/90 shadow-xs mb-6 overflow-hidden">
      {/* Header Bar */}
      <div className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-emerald-800 px-4 sm:px-5 py-3 flex items-center justify-between gap-3 text-white">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-emerald-700/80 border border-emerald-500/40 flex items-center justify-center shrink-0">
            <MessageSquareText className="w-4 h-4 text-emerald-200" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm sm:text-base font-bold tracking-tight">
                Agent Tanya-Jawab Bahasa Alami
              </h2>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-400/20 text-amber-200 border border-amber-400/30">
                <Sparkles className="w-3 h-3" />
                Kalkulasi Otomatis
              </span>
            </div>
            <p className="text-[11px] text-emerald-200/85 truncate">
              Ajukan pertanyaan seputar data peternakan — dijawab dengan angka, tabel, dan grafik ({formatIdNumber(records.length)} baris data aktif).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {entries.length > 0 && (
            <button
              type="button"
              onClick={() => setEntries([])}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium bg-emerald-900/80 hover:bg-rose-900/80 text-emerald-200 hover:text-white border border-emerald-700/70 transition-colors cursor-pointer"
              title="Bersihkan riwayat tanya-jawab"
            >
              <Trash2 className="w-3 h-3" />
              <span className="hidden sm:inline">Bersihkan</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsExpanded((v) => !v)}
            className="p-1.5 rounded-md bg-emerald-900/70 hover:bg-emerald-800 text-emerald-100 border border-emerald-700/60 transition-colors cursor-pointer"
            title={isExpanded ? 'Ciutkan panel' : 'Bentangkan panel'}
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="p-4 sm:p-5">
          {/* Form Pertanyaan */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAsk();
            }}
            className="flex flex-col sm:flex-row gap-2"
          >
            <div className="relative flex-1">
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                disabled={isLoading}
                placeholder='Contoh: "Kabupaten mana dengan populasi sapi tertinggi tahun 2023?"'
                className="w-full pl-3.5 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 focus:bg-white transition-all disabled:opacity-60"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading || !question.trim()}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold bg-emerald-800 hover:bg-emerald-700 text-white shadow-xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Menghitung...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Tanyakan</span>
                </>
              )}
            </button>
          </form>

          {/* Contoh Pertanyaan Cepat */}
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1 mr-1">
              <HelpCircle className="w-3 h-3 text-emerald-700" />
              Contoh pertanyaan:
            </span>
            {EXAMPLE_QUESTIONS.map((ex, idx) => (
              <button
                key={idx}
                type="button"
                disabled={isLoading}
                onClick={() => handleAsk(ex)}
                className="text-[11px] px-2.5 py-1 rounded-md bg-emerald-50/80 hover:bg-emerald-100 text-emerald-900 border border-emerald-200/80 transition-colors cursor-pointer disabled:opacity-50 text-left"
              >
                {ex}
              </button>
            ))}
          </div>

          {/* Pesan Galat */}
          {errorMsg && (
            <div className="mt-3 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Daftar Hasil Jawaban */}
          {entries.length > 0 && (
            <div className="mt-4 space-y-4">
              {entries.map((entry) => {
                const { result, viewMode } = entry;
                const showChart =
                  result.hasData &&
                  result.chartType !== 'none' &&
                  (viewMode === 'both' || viewMode === 'chart');
                const showTable =
                  result.hasData &&
                  result.rows.length > 0 &&
                  (viewMode === 'both' || viewMode === 'table');

                return (
                  <div
                    key={entry.id}
                    className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-3"
                  >
                    {/* Header Pertanyaan & Scope */}
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-2 pb-2.5 border-b border-slate-200/80">
                      <div>
                        <div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700">
                          Pertanyaan Anda
                        </div>
                        <div className="text-sm font-bold text-slate-900 mt-0.5">
                          “{entry.question}”
                        </div>
                      </div>

                      {!result.isOutOfScope && (
                        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-white border border-slate-200 text-slate-700">
                            Tahun: <strong>{result.appliedScope.yearsLabel}</strong>
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-white border border-slate-200 text-slate-700">
                            Wilayah: <strong>{result.appliedScope.regionsLabel}</strong>
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-white border border-slate-200 text-slate-700">
                            Komoditas: <strong>{result.appliedScope.livestockLabel}</strong>
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Ringkasan Jawaban Narasi */}
                    <div className="p-3 rounded-lg bg-emerald-50/80 border border-emerald-200 text-xs sm:text-sm text-emerald-950 leading-relaxed">
                      <span className="font-bold text-emerald-900 mr-1.5">
                        Jawaban:
                      </span>
                      {result.answerText}
                    </div>

                    {/* Kartu Angka Utama (KPI Highlights) */}
                    {result.hasData && result.kpiHighlights.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                        {result.kpiHighlights.map((kpi, idx) => (
                          <div
                            key={idx}
                            className={`p-3 rounded-lg border ${
                              kpi.isPrimary
                                ? 'bg-emerald-900 text-white border-emerald-800 shadow-xs'
                                : 'bg-white text-slate-800 border-slate-200'
                            }`}
                          >
                            <div
                              className={`text-[11px] font-medium ${
                                kpi.isPrimary
                                  ? 'text-emerald-200'
                                  : 'text-slate-500'
                              }`}
                            >
                              {kpi.label}
                            </div>
                            <div className="text-base sm:text-lg font-bold font-mono mt-0.5 leading-tight">
                              {kpi.value}
                            </div>
                            {kpi.sublabel && (
                              <div
                                className={`text-[11px] mt-1 ${
                                  kpi.isPrimary
                                    ? 'text-emerald-200/90'
                                    : 'text-slate-500'
                                }`}
                              >
                                {kpi.sublabel}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Switcher Mode Tampilan (Grafik & Tabel / Grafik / Tabel) */}
                    {result.hasData && result.rows.length > 0 && (
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                        <span className="text-xs font-bold text-slate-800">
                          {result.title}
                        </span>
                        <div className="inline-flex items-center gap-1 bg-slate-200/70 p-1 rounded-lg text-[11px]">
                          <button
                            type="button"
                            onClick={() => updateEntryViewMode(entry.id, 'both')}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md font-medium cursor-pointer transition-colors ${
                              viewMode === 'both'
                                ? 'bg-white text-emerald-900 shadow-2xs font-semibold'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            <LayoutGrid className="w-3 h-3" />
                            <span>Grafik & Tabel</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => updateEntryViewMode(entry.id, 'chart')}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md font-medium cursor-pointer transition-colors ${
                              viewMode === 'chart'
                                ? 'bg-white text-emerald-900 shadow-2xs font-semibold'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            <BarChart2 className="w-3 h-3" />
                            <span>Grafik</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => updateEntryViewMode(entry.id, 'table')}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md font-medium cursor-pointer transition-colors ${
                              viewMode === 'table'
                                ? 'bg-white text-emerald-900 shadow-2xs font-semibold'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            <TableIcon className="w-3 h-3" />
                            <span>Tabel</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Konten Visualisasi Grafik & Tabel */}
                    {result.hasData && result.rows.length > 0 && (
                      <div
                        className={`grid gap-4 ${
                          showChart && showTable
                            ? 'grid-cols-1 lg:grid-cols-2'
                            : 'grid-cols-1'
                        }`}
                      >
                        {/* Panel Grafik */}
                        {showChart && (
                          <div className="bg-white rounded-lg border border-slate-200 p-3">
                            <div className="text-[11px] font-semibold text-slate-600 mb-2 flex items-center justify-between">
                              <span>
                                Visualisasi {result.metricLabel} ({result.metricUnit})
                              </span>
                              {result.rows.some((r) => r.isHighlighted) && (
                                <span className="inline-flex items-center gap-1 text-[10px] text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                  <span className="w-2 h-2 rounded-full bg-amber-600"></span>
                                  Disorot (Utama)
                                </span>
                              )}
                            </div>

                            <div className="w-full h-72">
                              <ResponsiveContainer width="100%" height="100%">
                                {result.chartType === 'line' ? (
                                  <LineChart
                                    data={result.rows}
                                    margin={{ top: 10, right: 20, left: 0, bottom: 5 }}
                                  >
                                    <CartesianGrid
                                      strokeDasharray="3 3"
                                      stroke="#e2e8f0"
                                    />
                                    <XAxis
                                      dataKey="label"
                                      tick={{ fontSize: 11, fill: '#475569' }}
                                    />
                                    <YAxis
                                      tick={{ fontSize: 10, fill: '#475569' }}
                                      tickFormatter={formatCompact}
                                    />
                                    <Tooltip
                                      content={
                                        <CustomQATooltip
                                          unit={result.metricUnit}
                                          metricLabel={result.metricLabel}
                                        />
                                      }
                                    />
                                    <Line
                                      type="monotone"
                                      dataKey="primaryValue"
                                      stroke="#15803d"
                                      strokeWidth={2.5}
                                      dot={{
                                        r: 4,
                                        fill: '#15803d',
                                        stroke: '#fff',
                                        strokeWidth: 2,
                                      }}
                                      activeDot={{ r: 6 }}
                                    />
                                  </LineChart>
                                ) : result.chartType === 'pie' ? (
                                  <PieChart>
                                    <Tooltip
                                      content={
                                        <CustomQATooltip
                                          unit={result.metricUnit}
                                          metricLabel={result.metricLabel}
                                        />
                                      }
                                    />
                                    <Pie
                                      data={result.rows}
                                      dataKey="primaryValue"
                                      nameKey="label"
                                      cx="50%"
                                      cy="50%"
                                      innerRadius={55}
                                      outerRadius={90}
                                      paddingAngle={2}
                                      stroke="#ffffff"
                                      strokeWidth={2}
                                    >
                                      {result.rows.map((row, idx) => (
                                        <Cell
                                          key={`qa-pie-${idx}`}
                                          fill={row.color}
                                        />
                                      ))}
                                    </Pie>
                                  </PieChart>
                                ) : (
                                  <BarChart
                                    layout="vertical"
                                    data={result.rows}
                                    margin={{ top: 5, right: 25, left: 25, bottom: 5 }}
                                  >
                                    <CartesianGrid
                                      strokeDasharray="3 3"
                                      horizontal={false}
                                      stroke="#e2e8f0"
                                    />
                                    <XAxis
                                      type="number"
                                      tick={{ fontSize: 10, fill: '#64748b' }}
                                      tickFormatter={formatCompact}
                                    />
                                    <YAxis
                                      type="category"
                                      dataKey="label"
                                      width={100}
                                      interval={0}
                                      tick={{ fontSize: 10, fill: '#334155' }}
                                    />
                                    <Tooltip
                                      content={
                                        <CustomQATooltip
                                          unit={result.metricUnit}
                                          metricLabel={result.metricLabel}
                                        />
                                      }
                                    />
                                    <Bar
                                      dataKey="primaryValue"
                                      radius={[0, 4, 4, 0]}
                                    >
                                      {result.rows.map((row, idx) => (
                                        <Cell
                                          key={`qa-bar-${idx}`}
                                          fill={
                                            row.isHighlighted
                                              ? '#d97706'
                                              : row.color || '#15803d'
                                          }
                                        />
                                      ))}
                                    </Bar>
                                  </BarChart>
                                )}
                              </ResponsiveContainer>
                            </div>
                          </div>
                        )}

                        {/* Panel Tabel */}
                        {showTable && (
                          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden flex flex-col">
                            <div className="px-3 py-2 border-b border-slate-100 bg-slate-50/70 text-[11px] font-semibold text-slate-600 flex items-center justify-between">
                              <span>Rincian Data Terhitung</span>
                              <span className="font-mono text-slate-500">
                                {result.rows.length} baris
                              </span>
                            </div>
                            <div className="overflow-x-auto max-h-72 overflow-y-auto">
                              <table className="w-full text-xs text-left">
                                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 sticky top-0">
                                  <tr>
                                    <th className="px-3 py-2 font-semibold w-10">
                                      No
                                    </th>
                                    <th className="px-3 py-2 font-semibold">
                                      Kategori
                                    </th>
                                    {result.showAllMetricsInTable ? (
                                      <>
                                        <th className="px-3 py-2 font-semibold text-right">
                                          Populasi (ekor)
                                        </th>
                                        <th className="px-3 py-2 font-semibold text-right">
                                          Pemotongan (ekor)
                                        </th>
                                        <th className="px-3 py-2 font-semibold text-right">
                                          Daging (kg)
                                        </th>
                                        <th className="px-3 py-2 font-semibold text-right">
                                          Telur (kg)
                                        </th>
                                      </>
                                    ) : (
                                      <>
                                        <th className="px-3 py-2 font-semibold text-right">
                                          {result.metricLabel} ({result.metricUnit})
                                        </th>
                                        <th className="px-3 py-2 font-semibold text-right">
                                          Pangsa (%)
                                        </th>
                                      </>
                                    )}
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {result.rows.map((row, idx) => (
                                    <tr
                                      key={row.label}
                                      className={
                                        row.isHighlighted
                                          ? 'bg-amber-50/80 font-semibold'
                                          : 'hover:bg-slate-50/80'
                                      }
                                    >
                                      <td className="px-3 py-2 font-mono text-slate-500">
                                        {idx + 1}
                                      </td>
                                      <td className="px-3 py-2 text-slate-800 flex items-center gap-1.5">
                                        {result.chartType === 'pie' && (
                                          <span
                                            className="w-2.5 h-2.5 rounded-full shrink-0"
                                            style={{ backgroundColor: row.color }}
                                          />
                                        )}
                                        <span>{row.label}</span>
                                        {row.isHighlighted && (
                                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-200/80 text-amber-950 font-bold">
                                            Utama
                                          </span>
                                        )}
                                      </td>
                                      {result.showAllMetricsInTable ? (
                                        <>
                                          <td className="px-3 py-2 text-right font-mono text-slate-800">
                                            {formatIdNumber(row.populasi)}
                                          </td>
                                          <td className="px-3 py-2 text-right font-mono text-slate-800">
                                            {formatIdNumber(row.pemotongan)}
                                          </td>
                                          <td className="px-3 py-2 text-right font-mono text-slate-800">
                                            {formatIdNumber(row.produksiDaging)}
                                          </td>
                                          <td className="px-3 py-2 text-right font-mono text-slate-800">
                                            {row.produksiTelur !== null
                                              ? formatIdNumber(row.produksiTelur)
                                              : '-'}
                                          </td>
                                        </>
                                      ) : (
                                        <>
                                          <td className="px-3 py-2 text-right font-mono text-slate-900">
                                            {formatIdNumber(row.primaryValue)}
                                          </td>
                                          <td className="px-3 py-2 text-right font-mono text-emerald-700">
                                            {formatIdPercent(row.sharePercent)}
                                          </td>
                                        </>
                                      )}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </section>
  );
};
