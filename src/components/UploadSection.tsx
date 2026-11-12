import React, { useRef, useState } from 'react';
import { LivestockRecord, ValidationResult, UploadMode } from '../types/livestock';
import { parseCSVtoRecords } from '../utils/validator';
import { getCSVTemplate } from '../utils/simulator';
import {
  UploadCloud,
  FileSpreadsheet,
  Download,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  Trash2,
  PlusCircle,
  RefreshCw,
  Info,
  AlertTriangle,
} from 'lucide-react';

interface UploadSectionProps {
  onDataLoaded: (records: LivestockRecord[], validation: ValidationResult, mode: UploadMode) => void;
  onClearData: () => void;
  onResetToSample: () => void;
  currentRecordCount: number;
}

export const UploadSection: React.FC<UploadSectionProps> = ({
  onDataLoaded,
  onClearData,
  onResetToSample,
  currentRecordCount,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadMode, setUploadMode] = useState<UploadMode>('overwrite');
  const [isConfirmingClear, setIsConfirmingClear] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
    details?: string[];
  } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setFeedback(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const { records, validation } = parseCSVtoRecords(text);

        if (!validation.isValid) {
          const errors = validation.issues.filter((i) => i.severity === 'error');
          setFeedback({
            type: 'error',
            message: `Berkas ditolak: ${errors[0]?.message || 'Data tidak memenuhi syarat validasi.'}`,
            details: errors.slice(0, 5).map((e) => e.message),
          });
          setIsProcessing(false);
          return;
        }

        // Panggil fungsi callback dengan mode yang dipilih
        onDataLoaded(records, validation, uploadMode);

        const modeText =
          uploadMode === 'overwrite'
            ? 'menggantikan seluruh data sebelumnya'
            : 'digabungkan dengan data yang sudah ada';

        setFeedback({
          type: 'success',
          message: `Berhasil! Sebanyak ${records.length} baris data dari berkas CSV telah ${modeText}.`,
        });
      } catch (err: any) {
        setFeedback({
          type: 'error',
          message: `Gagal memproses berkas CSV: ${err.message || 'Format tidak dikenal'}`,
        });
      } finally {
        setIsProcessing(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };

    reader.onerror = () => {
      setFeedback({
        type: 'error',
        message: 'Gagal membaca berkas dari perangkat Anda.',
      });
      setIsProcessing(false);
    };

    reader.readAsText(file);
  };

  const handleDownloadTemplate = () => {
    const templateContent = getCSVTemplate();
    const blob = new Blob([templateContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'Templat_Statistik_Peternakan_7Kolom.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleConfirmClear = () => {
    onClearData();
    setIsConfirmingClear(false);
    setFeedback({
      type: 'info',
      message: 'Seluruh data di memori telah berhasil dikosongkan. Anda dapat mengunggah berkas baru atau memulihkan data contoh sewaktu-waktu.',
    });
  };

  return (
    <div className="bg-emerald-900/10 border-2 border-emerald-800/30 rounded-xl p-4 sm:p-5 mb-6">
      {/* Top Header of Section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4 pb-3 border-b border-emerald-800/20">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse"></span>
            <h3 className="text-sm sm:text-base font-bold text-emerald-950 flex items-center gap-1.5">
              <FileSpreadsheet className="w-4 h-4 text-emerald-800" />
              Kelola & Perbarui Data Statistik (Khusus Pengelola Data)
            </h3>
          </div>
          <p className="text-xs text-slate-600 mt-0.5">
            Kelola data aktif di memori: kosongkan data, unggah CSV baru (timpa atau gabung), atau unduh templat data.
            Saat ini terdapat <strong className="text-emerald-900">{currentRecordCount} baris aktif</strong>.
          </p>
        </div>

        {/* Global Dataset Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Tombol: Kosongkan Seluruh Data */}
          <button
            onClick={() => setIsConfirmingClear(true)}
            type="button"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-rose-50 border border-rose-300 text-rose-700 hover:bg-rose-100 shadow-xs transition-colors cursor-pointer"
            title="Kosongkan seluruh data aktif dari memori aplikasi"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
            <span>Kosongkan Data ({currentRecordCount})</span>
          </button>

          {/* Tombol: Unduh Templat CSV */}
          <button
            onClick={handleDownloadTemplate}
            type="button"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 hover:text-emerald-800 shadow-xs transition-colors cursor-pointer"
            title="Unduh templat berkas CSV 7 kolom baku dengan baris contoh"
          >
            <Download className="w-3.5 h-3.5 text-emerald-700" />
            <span>Unduh Templat CSV</span>
          </button>

          {/* Tombol: Gunakan Data Contoh */}
          <button
            onClick={() => {
              onResetToSample();
              setFeedback({
                type: 'info',
                message: 'Data simulasi bawaan (2019-2024, 14 kabupaten/kota) berhasil dipulihkan.',
              });
            }}
            type="button"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-800 text-white hover:bg-emerald-700 shadow-xs transition-colors cursor-pointer"
            title="Pulihkan data simulasi 6 tahun untuk 14 kabupaten/kota"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Pulihkan Data Contoh</span>
          </button>
        </div>
      </div>

      {/* Opsi Mode Upload: Ganti Seluruh Data vs Tambahkan ke Data yang Ada */}
      <div className="mb-4 bg-white/90 p-3.5 rounded-lg border border-emerald-800/20 shadow-xs">
        <label className="block text-xs font-bold text-slate-800 mb-2">
          Pilihan Mode Pengunggahan Berkas:
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Opsi 1: Overwrite (Ganti Seluruh Data) */}
          <label
            onClick={() => setUploadMode('overwrite')}
            className={`p-3 rounded-lg border cursor-pointer transition-all flex items-start gap-2.5 ${
              uploadMode === 'overwrite'
                ? 'bg-emerald-50 border-emerald-600 ring-2 ring-emerald-600/30'
                : 'bg-slate-50 border-slate-200 hover:bg-white'
            }`}
          >
            <input
              type="radio"
              name="upload-mode"
              checked={uploadMode === 'overwrite'}
              onChange={() => setUploadMode('overwrite')}
              className="mt-0.5 text-emerald-700 focus:ring-emerald-600"
            />
            <div>
              <div className="text-xs font-bold text-slate-900 flex items-center gap-1">
                <RefreshCw className="w-3.5 h-3.5 text-emerald-700" />
                Ganti Seluruh Data (Timpa / Overwrite)
              </div>
              <div className="text-[11px] text-slate-600 mt-0.5 leading-snug">
                Data aktif saat ini akan dihapus dan digantikan seluruhnya oleh baris data dari berkas CSV baru.
              </div>
            </div>
          </label>

          {/* Opsi 2: Append (Tambahkan ke Data yang Ada) */}
          <label
            onClick={() => setUploadMode('append')}
            className={`p-3 rounded-lg border cursor-pointer transition-all flex items-start gap-2.5 ${
              uploadMode === 'append'
                ? 'bg-emerald-50 border-emerald-600 ring-2 ring-emerald-600/30'
                : 'bg-slate-50 border-slate-200 hover:bg-white'
            }`}
          >
            <input
              type="radio"
              name="upload-mode"
              checked={uploadMode === 'append'}
              onChange={() => setUploadMode('append')}
              className="mt-0.5 text-emerald-700 focus:ring-emerald-600"
            />
            <div>
              <div className="text-xs font-bold text-slate-900 flex items-center gap-1">
                <PlusCircle className="w-3.5 h-3.5 text-emerald-700" />
                Tambahkan ke Data yang Ada (Gabung / Append)
              </div>
              <div className="text-[11px] text-slate-600 mt-0.5 leading-snug">
                Menyisipkan baris baru ke data aktif. Jika terdapat tahun & wilayah & komoditas yang sama, data diperbarui.
              </div>
            </div>
          </label>
        </div>
      </div>

      {/* Upload Drop Area */}
      <div className="bg-white rounded-lg border border-dashed border-emerald-600/50 p-4 text-center hover:bg-emerald-50/40 transition-colors">
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          onChange={handleFileUpload}
          className="hidden"
          id="csv-file-upload"
        />
        <label
          htmlFor="csv-file-upload"
          className="cursor-pointer flex flex-col items-center justify-center gap-2"
        >
          <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center">
            <UploadCloud className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs sm:text-sm font-semibold text-emerald-900 block">
              {isProcessing
                ? 'Memvalidasi data...'
                : `Klik untuk memilih berkas CSV (${uploadMode === 'overwrite' ? 'Ganti Seluruh Data' : 'Tambahkan ke Data yang Ada'})`}
            </span>
            <span className="text-[11px] text-slate-500">
              Format: 7 kolom wajib (Tahun, Kabupaten/Kota, Jenis Ternak, Populasi, Pemotongan, Daging, Telur)
            </span>
          </div>
        </label>
      </div>

      {/* Feedback Messages */}
      {feedback && (
        <div
          className={`mt-3 p-3 rounded-lg text-xs flex items-start gap-2.5 border ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
              : feedback.type === 'error'
              ? 'bg-rose-50 text-rose-900 border-rose-300'
              : 'bg-sky-50 text-sky-900 border-sky-300'
          }`}
        >
          {feedback.type === 'success' && (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          )}
          {feedback.type === 'error' && (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          )}
          {feedback.type === 'info' && (
            <Info className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
          )}
          <div className="flex-1">
            <div className="font-semibold">{feedback.message}</div>
            {feedback.details && feedback.details.length > 0 && (
              <ul className="mt-1 list-disc list-inside space-y-0.5 text-[11px]">
                {feedback.details.map((d, i) => (
                  <li key={i}>{d}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Modal Dialog Konfirmasi Kosongkan Data */}
      {isConfirmingClear && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900">
                  Konfirmasi Pengosongan Data
                </h4>
                <p className="text-xs text-slate-500">
                  Tindakan ini akan mengosongkan {currentRecordCount} baris data aktif di memori.
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 mb-4 bg-slate-50 p-3 rounded-lg border border-slate-200 leading-relaxed">
              Setelah dikosongkan, seluruh grafik, kartu ringkasan, dan tabel akan menampilkan status <strong>"Tidak ada data"</strong>.
              Anda dapat mengunggah berkas CSV baru atau menekan tombol <strong>"Pulihkan Data Contoh"</strong> kapan saja.
            </p>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsConfirmingClear(false)}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmClear}
                className="px-4 py-1.5 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors cursor-pointer shadow-xs"
              >
                Ya, Kosongkan Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
