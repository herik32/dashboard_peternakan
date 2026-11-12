import React from 'react';
import { FilterState } from '../types/livestock';
import { RotateCcw, Filter as FilterIcon, Calendar, MapPin, Layers } from 'lucide-react';

interface FilterBarProps {
  filters: FilterState;
  onFilterChange: (newFilters: FilterState) => void;
  onReset: () => void;
  availableYears: number[];
  availableRegions: string[];
  availableLivestock: string[];
}

export const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  onFilterChange,
  onReset,
  availableYears,
  availableRegions,
  availableLivestock,
}) => {
  const hasData = availableYears.length > 0;
  const latestYear = hasData ? availableYears[availableYears.length - 1] : null;

  const isDefault =
    hasData &&
    filters.tahun === latestYear &&
    (filters.kabupatenKota === 'Seluruh Provinsi' || availableRegions.length <= 1) &&
    (filters.jenisTernak === 'Semua Jenis' || availableLivestock.length <= 1);

  return (
    <div className="bg-white border-b border-slate-200 shadow-xs sticky top-0 z-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          {/* Label Bar */}
          <div className="flex items-center gap-2 text-slate-700 text-sm font-semibold shrink-0">
            <div className="w-7 h-7 rounded-md bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <FilterIcon className="w-4 h-4" />
            </div>
            <span>Filter Data:</span>
          </div>

          {/* 3 Dropdown Filters - Bersih tanpa hardcoded option bawaan */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 flex-1 max-w-4xl">
            {/* 1. Tahun */}
            <div className="relative">
              <label
                htmlFor="filter-tahun"
                className="block text-[11px] font-medium text-slate-500 mb-0.5 flex items-center gap-1"
              >
                <Calendar className="w-3 h-3 text-emerald-700" />
                Tahun
              </label>
              <select
                id="filter-tahun"
                disabled={availableYears.length === 0}
                value={filters.tahun}
                onChange={(e) =>
                  onFilterChange({
                    ...filters,
                    tahun: e.target.value === '' ? 'Semua' : parseInt(e.target.value, 10),
                  })
                }
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs sm:text-sm font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 outline-none transition-all cursor-pointer disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
              >
                {availableYears.length === 0 ? (
                  <option value="">(Tidak ada data tahun)</option>
                ) : (
                  availableYears.map((yr) => (
                    <option key={yr} value={yr}>
                      Tahun {yr}
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* 2. Kabupaten/Kota */}
            <div className="relative">
              <label
                htmlFor="filter-kabkota"
                className="block text-[11px] font-medium text-slate-500 mb-0.5 flex items-center gap-1"
              >
                <MapPin className="w-3 h-3 text-emerald-700" />
                Kabupaten / Kota
              </label>
              <select
                id="filter-kabkota"
                disabled={availableRegions.length === 0}
                value={filters.kabupatenKota}
                onChange={(e) =>
                  onFilterChange({
                    ...filters,
                    kabupatenKota: e.target.value,
                  })
                }
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs sm:text-sm font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 outline-none transition-all cursor-pointer disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
              >
                {availableRegions.length === 0 ? (
                  <option value="">(Tidak ada data wilayah)</option>
                ) : (
                  <>
                    {availableRegions.length > 1 && (
                      <option value="Seluruh Provinsi">
                        Seluruh Wilayah ({availableRegions.length} Wilayah)
                      </option>
                    )}
                    {availableRegions.map((reg) => (
                      <option key={reg} value={reg}>
                        {reg}
                      </option>
                    ))}
                  </>
                )}
              </select>
            </div>

            {/* 3. Jenis Ternak */}
            <div className="relative">
              <label
                htmlFor="filter-ternak"
                className="block text-[11px] font-medium text-slate-500 mb-0.5 flex items-center gap-1"
              >
                <Layers className="w-3 h-3 text-emerald-700" />
                Jenis Ternak
              </label>
              <select
                id="filter-ternak"
                disabled={availableLivestock.length === 0}
                value={filters.jenisTernak}
                onChange={(e) =>
                  onFilterChange({
                    ...filters,
                    jenisTernak: e.target.value,
                  })
                }
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs sm:text-sm font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 outline-none transition-all cursor-pointer disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
              >
                {availableLivestock.length === 0 ? (
                  <option value="">(Tidak ada data komoditas)</option>
                ) : (
                  <>
                    {availableLivestock.length > 1 && (
                      <option value="Semua Jenis">
                        Semua Komoditas ({availableLivestock.length} Jenis)
                      </option>
                    )}
                    {availableLivestock.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </>
                )}
              </select>
            </div>
          </div>

          {/* Reset Button */}
          <div className="flex items-end self-end sm:self-auto shrink-0 pt-2 sm:pt-0">
            <button
              type="button"
              onClick={onReset}
              disabled={isDefault || !hasData}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                isDefault || !hasData
                  ? 'border-slate-200 text-slate-400 bg-slate-100 cursor-not-allowed'
                  : 'border-slate-300 text-slate-700 bg-white hover:bg-slate-50 hover:text-emerald-800 hover:border-emerald-400 shadow-xs'
              }`}
              title="Kembalikan semua filter ke pengaturan awal"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Atur Ulang Filter</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
