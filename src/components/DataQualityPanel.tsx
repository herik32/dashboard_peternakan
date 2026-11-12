import React from 'react';
import { QualityIssue, ValidationResult } from '../types/livestock';
import {
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  X,
  FileSpreadsheet,
  Calendar,
  Layers,
  MapPin,
} from 'lucide-react';

interface DataQualityPanelProps {
  isOpen: boolean;
  onClose: () => void;
  validation: ValidationResult;
}

export const DataQualityPanel: React.FC<DataQualityPanelProps> = ({
  isOpen,
  onClose,
  validation,
}) => {
  if (!isOpen) return null;

  const errors = validation.issues.filter((i) => i.severity === 'error');
  const warnings = validation.issues.filter((i) => i.severity === 'warning');

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-emerald-950 text-white px-5 py-4 flex items-center justify-between border-b border-emerald-900">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-800 flex items-center justify-center text-emerald-200">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white leading-tight">
                Panel Pemeriksaan Kualitas Data
              </h3>
              <p className="text-xs text-emerald-300/80">
                Laporan validasi otomatis 7 kolom wajib dan integritas statistik
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="p-1 rounded-lg text-emerald-300 hover:text-white hover:bg-emerald-900 transition-colors cursor-pointer"
            title="Tutup panel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-center">
              <span className="text-[11px] text-slate-500 block">Total Baris</span>
              <span className="text-base font-bold text-slate-800 font-mono">
                {validation.totalRows}
              </span>
            </div>
            <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-center">
              <span className="text-[11px] text-slate-500 block">Rentang Tahun</span>
              <span className="text-base font-bold text-slate-800 font-mono">
                {validation.yearRange
                  ? `${validation.yearRange[0]} - ${validation.yearRange[1]}`
                  : '-'}
              </span>
            </div>
            <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-center">
              <span className="text-[11px] text-slate-500 block">Galat (Kritis)</span>
              <span
                className={`text-base font-bold font-mono ${
                  errors.length > 0 ? 'text-rose-600' : 'text-emerald-700'
                }`}
              >
                {errors.length}
              </span>
            </div>
            <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-center">
              <span className="text-[11px] text-slate-500 block">Peringatan</span>
              <span
                className={`text-base font-bold font-mono ${
                  warnings.length > 0 ? 'text-amber-600' : 'text-slate-700'
                }`}
              >
                {warnings.length}
              </span>
            </div>
          </div>

          {/* Overall Status Banner */}
          {errors.length === 0 ? (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-start gap-2.5 text-xs text-emerald-900">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Status Data Valid.</span> Seluruh 7 kolom wajib
                dan format data angka memenuhi syarat operasional dashboard.
              </div>
            </div>
          ) : (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2.5 text-xs text-rose-900">
              <AlertOctagon className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Terdeteksi Galat Data ({errors.length}).</span> Data
                tidak dapat digunakan secara sempurna sebelum diperbaiki.
              </div>
            </div>
          )}

          {/* List of Errors */}
          {errors.length > 0 && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-rose-700 mb-2 flex items-center gap-1.5">
                <AlertOctagon className="w-3.5 h-3.5" />
                Daftar Galat (Wajib Diperbaiki)
              </h4>
              <div className="space-y-2">
                {errors.map((err, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 bg-rose-50/70 border border-rose-200 rounded-lg text-xs"
                  >
                    <div className="font-semibold text-rose-900">{err.message}</div>
                    {err.detail && (
                      <div className="text-rose-700 text-[11px] mt-0.5">{err.detail}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* List of Warnings */}
          {warnings.length > 0 && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-amber-700 mb-2 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                Daftar Peringatan ({warnings.length})
              </h4>
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {warnings.map((warn, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 bg-amber-50/70 border border-amber-200 rounded-lg text-xs"
                  >
                    <div className="font-semibold text-amber-900">{warn.message}</div>
                    {warn.detail && (
                      <div className="text-amber-800 text-[11px] mt-0.5">
                        {warn.detail}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Rules Explanation Note */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-600 space-y-1">
            <span className="font-bold block text-slate-700">Ketentuan Validasi 7 Kolom:</span>
            <p>
              1. Kolom wajib: <code>Tahun</code>, <code>Kabupaten/Kota</code>, <code>Jenis Ternak</code>, <code>Populasi (ekor)</code>, <code>Pemotongan (ekor)</code>, <code>Produksi Daging (kg)</code>, <code>Produksi Telur (kg)</code>.
            </p>
            <p>
              2. Pemotongan melebihi populasi diklasifikasikan sebagai <strong>Peringatan</strong> (bukan galat), karena wajar pada komoditas unggas pedaging dengan beberapa siklus panen setahun.
            </p>
            <p>
              3. Sel kosong pada produksi telur diperbolehkan untuk ternak yang tidak menghasilkan telur (misalnya sapi, kambing, babi).
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            type="button"
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
