import React from 'react';
import { MetricSummary, FilterState } from '../types/livestock';
import { formatIdNumber } from '../utils/aggregations';
import { Users, Scissors, Beef, Egg, HelpCircle } from 'lucide-react';

interface SummaryCardsProps {
  summary: MetricSummary;
  filters: FilterState;
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({ summary, filters }) => {
  const cards = [
    {
      id: 'populasi',
      title: 'Populasi Ternak',
      value: summary.populasi,
      unit: 'ekor',
      icon: Users,
      color: 'emerald',
      bgColor: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      iconBg: 'bg-emerald-100 text-emerald-800',
    },
    {
      id: 'pemotongan',
      title: 'Pemotongan Ternak',
      value: summary.pemotongan,
      unit: 'ekor',
      icon: Scissors,
      color: 'sky',
      bgColor: 'bg-sky-50 text-sky-800 border-sky-200',
      iconBg: 'bg-sky-100 text-sky-800',
    },
    {
      id: 'produksiDaging',
      title: 'Produksi Daging',
      value: summary.produksiDaging,
      unit: 'kg',
      icon: Beef,
      color: 'amber',
      bgColor: 'bg-amber-50 text-amber-900 border-amber-200',
      iconBg: 'bg-amber-100 text-amber-800',
    },
    {
      id: 'produksiTelur',
      title: 'Produksi Telur',
      value: summary.produksiTelur,
      unit: 'kg',
      icon: Egg,
      color: 'purple',
      bgColor: 'bg-purple-50 text-purple-900 border-purple-200',
      iconBg: 'bg-purple-100 text-purple-800',
    },
  ];

  return (
    <section className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Ringkasan Indikator Utama ({filters.tahun} • {filters.kabupatenKota} • {filters.jenisTernak})
        </h2>
        <span className="text-[11px] text-slate-500 font-medium">
          {summary.rowCount > 0
            ? `${summary.rowCount} baris data terkait`
            : '0 baris data'}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {cards.map((card) => {
          const Icon = card.icon;
          const hasData = card.value !== null && card.value !== undefined;
          const displayValue = hasData ? formatIdNumber(card.value) : 'Tidak ada data';

          return (
            <div
              key={card.id}
              className={`rounded-xl p-4 border bg-white shadow-xs hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between`}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <span className="text-xs font-semibold text-slate-600 block">
                    {card.title}
                  </span>
                  <div className="mt-1 flex items-baseline gap-1.5 flex-wrap">
                    {hasData ? (
                      <>
                        <span className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 font-mono">
                          {displayValue}
                        </span>
                        <span className="text-xs font-medium text-slate-500">
                          {card.unit}
                        </span>
                      </>
                    ) : (
                      <span className="text-sm font-semibold text-slate-400 italic">
                        Tidak ada data
                      </span>
                    )}
                  </div>
                </div>

                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${card.iconBg}`}
                >
                  <Icon className="w-5 h-5" />
                </div>
              </div>

              {/* Footer status per card */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span>Filter aktif: 3 kriteria</span>
                <span className="font-mono text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                  Satuan: {card.unit}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
