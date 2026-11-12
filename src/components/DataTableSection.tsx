import React, { useState, useMemo } from 'react';
import { FilterState, LivestockRecord } from '../types/livestock';
import { filterRecords, formatIdNumber } from '../utils/aggregations';
import { recordsToCSV } from '../utils/simulator';
import {
  Table as TableIcon,
  Download,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Layers,
} from 'lucide-react';

interface DataTableSectionProps {
  records: LivestockRecord[];
  filters: FilterState;
}

type SortField =
  | 'tahun'
  | 'kabupatenKota'
  | 'jenisTernak'
  | 'populasi'
  | 'pemotongan'
  | 'produksiDaging'
  | 'produksiTelur';

export const DataTableSection: React.FC<DataTableSectionProps> = ({
  records,
  filters,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('kabupatenKota');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // 1. Filter data menurut ketiga filter aktif
  const filteredData = useMemo(() => {
    return filterRecords(
      records,
      filters.tahun,
      filters.kabupatenKota,
      filters.jenisTernak
    );
  }, [records, filters]);

  // 2. Pencarian teks
  const searchedData = useMemo(() => {
    if (!searchTerm.trim()) return filteredData;
    const term = searchTerm.toLowerCase();
    return filteredData.filter(
      (r) =>
        r.kabupatenKota.toLowerCase().includes(term) ||
        r.jenisTernak.toLowerCase().includes(term) ||
        r.tahun.toString().includes(term) ||
        r.populasi.toString().includes(term) ||
        r.pemotongan.toString().includes(term)
    );
  }, [filteredData, searchTerm]);

  // 3. Urutkan kolom
  const sortedData = useMemo(() => {
    const list = [...searchedData];
    list.sort((a, b) => {
      let valA: any = a[sortField];
      let valB: any = b[sortField];

      // Tangani nilai null untuk produksiTelur
      if (valA === null || valA === undefined) valA = -1;
      if (valB === null || valB === undefined) valB = -1;

      if (typeof valA === 'string') {
        const comp = valA.localeCompare(valB, 'id');
        return sortDirection === 'asc' ? comp : -comp;
      }
      return sortDirection === 'asc' ? valA - valB : valB - valA;
    });
    return list;
  }, [searchedData, sortField, sortDirection]);

  // 4. Paginasi
  const totalPages = Math.ceil(sortedData.length / pageSize) || 1;
  const currentRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  const handleDownloadCSV = () => {
    const csvContent = recordsToCSV(sortedData);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const filename = `Statistik_Peternakan_Kalbar_${filters.tahun}_${filters.kabupatenKota.replace(
      /\s+/g,
      '_'
    )}.csv`;
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="w-3.5 h-3.5 text-emerald-700" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 text-emerald-700" />
    );
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 sm:p-5 mb-6">
      {/* Header and Download Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <TableIcon className="w-4 h-4" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900">
              Tabel Rincian Data Statistik Peternakan
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Daftar data mentah 7 kolom wajib mengikuti filter aktif ({filteredData.length} baris).
          </p>
        </div>

        <button
          onClick={handleDownloadCSV}
          disabled={sortedData.length === 0}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-800 hover:bg-emerald-700 text-white transition-colors cursor-pointer shadow-xs disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed"
          title="Unduh data sesuai filter aktif dalam format CSV 7 kolom"
        >
          <Download className="w-4 h-4" />
          <span>Unduh CSV ({sortedData.length} Baris)</span>
        </button>
      </div>

      {/* Search and Control Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 my-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari wilayah, jenis ternak, tahun..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 outline-none transition-all"
          />
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-600">
          <span>Baris per halaman:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs outline-none"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>

      {/* Table Container with Horizontal Scroll */}
      <div className="overflow-x-auto border border-slate-200 rounded-lg">
        <table className="w-full text-left text-xs text-slate-700 border-collapse">
          <thead className="bg-slate-100/80 text-slate-800 text-[11px] font-bold uppercase tracking-wider border-b border-slate-200">
            <tr>
              <th
                onClick={() => handleSort('tahun')}
                className="py-2.5 px-3 cursor-pointer hover:bg-slate-200/70 transition-colors whitespace-nowrap"
              >
                <div className="flex items-center gap-1">
                  <span>Tahun</span>
                  {renderSortIcon('tahun')}
                </div>
              </th>
              <th
                onClick={() => handleSort('kabupatenKota')}
                className="py-2.5 px-3 cursor-pointer hover:bg-slate-200/70 transition-colors whitespace-nowrap"
              >
                <div className="flex items-center gap-1">
                  <span>Kabupaten / Kota</span>
                  {renderSortIcon('kabupatenKota')}
                </div>
              </th>
              <th
                onClick={() => handleSort('jenisTernak')}
                className="py-2.5 px-3 cursor-pointer hover:bg-slate-200/70 transition-colors whitespace-nowrap"
              >
                <div className="flex items-center gap-1">
                  <span>Jenis Ternak</span>
                  {renderSortIcon('jenisTernak')}
                </div>
              </th>
              <th
                onClick={() => handleSort('populasi')}
                className="py-2.5 px-3 text-right cursor-pointer hover:bg-slate-200/70 transition-colors whitespace-nowrap"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Populasi (ekor)</span>
                  {renderSortIcon('populasi')}
                </div>
              </th>
              <th
                onClick={() => handleSort('pemotongan')}
                className="py-2.5 px-3 text-right cursor-pointer hover:bg-slate-200/70 transition-colors whitespace-nowrap"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Pemotongan (ekor)</span>
                  {renderSortIcon('pemotongan')}
                </div>
              </th>
              <th
                onClick={() => handleSort('produksiDaging')}
                className="py-2.5 px-3 text-right cursor-pointer hover:bg-slate-200/70 transition-colors whitespace-nowrap"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Produksi Daging (kg)</span>
                  {renderSortIcon('produksiDaging')}
                </div>
              </th>
              <th
                onClick={() => handleSort('produksiTelur')}
                className="py-2.5 px-3 text-right cursor-pointer hover:bg-slate-200/70 transition-colors whitespace-nowrap"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Produksi Telur (kg)</span>
                  {renderSortIcon('produksiTelur')}
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {currentRows.length > 0 ? (
              currentRows.map((row, index) => (
                <tr
                  key={row.id || `${row.tahun}-${row.kabupatenKota}-${row.jenisTernak}-${index}`}
                  className="hover:bg-slate-50 transition-colors"
                >
                  <td className="py-2.5 px-3 font-medium text-slate-900 whitespace-nowrap">
                    {row.tahun}
                  </td>
                  <td className="py-2.5 px-3 font-semibold text-slate-800 whitespace-nowrap">
                    {row.kabupatenKota}
                  </td>
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-800">
                      {row.jenisTernak}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-medium whitespace-nowrap">
                    {formatIdNumber(row.populasi)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-medium whitespace-nowrap">
                    {formatIdNumber(row.pemotongan)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-medium whitespace-nowrap">
                    {formatIdNumber(row.produksiDaging)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono whitespace-nowrap">
                    {row.produksiTelur !== null ? (
                      formatIdNumber(row.produksiTelur)
                    ) : (
                      <span className="text-slate-400 italic">Tidak ada data</span>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-400 text-xs italic">
                  Tidak ada data yang sesuai dengan kombinasi filter dan kata kunci pencarian.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mt-3 text-xs text-slate-500">
        <div>
          Menampilkan {sortedData.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} -{' '}
          {Math.min(currentPage * pageSize, sortedData.length)} dari {sortedData.length} baris
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-2.5 py-1 rounded border border-slate-200 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
          >
            Sebelumnya
          </button>
          <span className="px-2 font-medium">
            Hal. {currentPage} dari {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
            className="px-2.5 py-1 rounded border border-slate-200 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
          >
            Berikutnya
          </button>
        </div>
      </div>
    </div>
  );
};
