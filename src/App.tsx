/**
 * Dashboard Statistik Peternakan Kalimantan Barat
 * Dinas Perkebunan dan Peternakan Provinsi Kalimantan Barat
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  LivestockRecord,
  FilterState,
  UserRole,
  ValidationResult,
  UploadMode,
} from './types/livestock';
import { generateSimulationData } from './utils/simulator';
import { validateRecords } from './utils/validator';
import { getSummaryMetrics } from './utils/aggregations';
import { Header } from './components/Header';
import { FilterBar } from './components/FilterBar';
import { SummaryCards } from './components/SummaryCards';
import { TrendSection } from './components/TrendSection';
import { RegionComparisonSection } from './components/RegionComparisonSection';
import { CompositionSection } from './components/CompositionSection';
import { DataTableSection } from './components/DataTableSection';
import { DataQualityPanel } from './components/DataQualityPanel';
import { UploadSection } from './components/UploadSection';
import { LoginModal } from './components/LoginModal';
import { NaturalLanguageQA } from './components/NaturalLanguageQA';
import { RegionalMapSection } from './components/RegionalMapSection';
export default function App() {
  // 1. Data Aktif di Memori & Penyimpanan Lokal (Persisten saat refresh peramban)
  const [records, setRecords] = useState<LivestockRecord[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('kalbar_livestock_records');
        if (saved !== null) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            return parsed;
          }
        }
      } catch (e) {
        console.error('Gagal memuat data dari localStorage:', e);
      }
    }
    return generateSimulationData();
  });

  // Simpan data otomatis ke localStorage setiap kali terjadi perubahan
  useEffect(() => {
    try {
      localStorage.setItem('kalbar_livestock_records', JSON.stringify(records));
    } catch (e) {
      console.error('Gagal menyimpan data ke localStorage:', e);
    }
  }, [records]);

  // 2. Hasil Validasi Kualitas Data
  const [validation, setValidation] = useState<ValidationResult>(() =>
    validateRecords(records)
  );

  // 3. Peran Pengguna & Status Autentikasi (Persisten selama sesi peramban)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('kalbar_admin_auth') === 'true';
    }
    return false;
  });

  const [role, setRole] = useState<UserRole>(() => {
    if (typeof window !== 'undefined' && sessionStorage.getItem('kalbar_admin_auth') === 'true') {
      return 'pengelola';
    }
    return 'pimpinan';
  });

  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);

  // 4. Modal / Panel Status
  const [isQualityPanelOpen, setIsQualityPanelOpen] = useState(false);
  const [mapsQuotaExceeded, setMapsQuotaExceeded] = useState(false);

  useEffect(() => {
    const handleQuotaExceeded = () => setMapsQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', handleQuotaExceeded);
    return () => {
      window.removeEventListener('gmp-quota-exceeded', handleQuotaExceeded);
    };
  }, []);

  // 5. Daftar Pilihan Filter Berdasarkan Data yang Tersedia (Tanpa Opsi Bawaan Hardcoded)
  const availableYears = useMemo(() => {
    return Array.from(new Set(records.map((r) => r.tahun))).sort((a, b) => a - b);
  }, [records]);

  const latestYear = useMemo(() => {
    return availableYears.length > 0
      ? availableYears[availableYears.length - 1]
      : null;
  }, [availableYears]);

  const availableRegions = useMemo(() => {
    const list = Array.from(
      new Set(records.map((r) => r.kabupatenKota).filter(Boolean))
    );
    return list.sort((a, b) => a.localeCompare(b, 'id'));
  }, [records]);

  const availableLivestock = useMemo(() => {
    const list = Array.from(
      new Set(records.map((r) => r.jenisTernak).filter(Boolean))
    );
    return list.sort((a, b) => a.localeCompare(b, 'id'));
  }, [records]);

  // 6. State Filter Tunggal (F2) - Default ke tahun terbaru sesuai data yang tersedia
  const [filters, setFilters] = useState<FilterState>(() => {
    const years = Array.from(new Set(records.map((r) => r.tahun)));
    const maxYear = years.length > 0 ? Math.max(...years) : 'Semua';
    return {
      tahun: maxYear,
      kabupatenKota: 'Seluruh Provinsi',
      jenisTernak: 'Semua Jenis',
    };
  });

  // Sinkronisasi otomatis nilai filter dengan data yang benar-benar tersedia
  useEffect(() => {
    setFilters((prev) => {
      // 1. Validasi Tahun
      let nextTahun: number | 'Semua' = prev.tahun;
      if (availableYears.length === 0) {
        nextTahun = 'Semua';
      } else if (
        typeof prev.tahun === 'number' &&
        !availableYears.includes(prev.tahun)
      ) {
        nextTahun = availableYears[availableYears.length - 1];
      } else if (prev.tahun === 'Semua' && availableYears.length > 0) {
        nextTahun = availableYears[availableYears.length - 1];
      }

      // 2. Validasi Kabupaten/Kota
      let nextKab = prev.kabupatenKota;
      if (availableRegions.length === 0) {
        nextKab = '';
      } else if (
        prev.kabupatenKota !== 'Seluruh Provinsi' &&
        !availableRegions.includes(prev.kabupatenKota)
      ) {
        nextKab = availableRegions.length > 1 ? 'Seluruh Provinsi' : availableRegions[0];
      }

      // 3. Validasi Jenis Ternak
      let nextJenis = prev.jenisTernak;
      if (availableLivestock.length === 0) {
        nextJenis = '';
      } else if (
        prev.jenisTernak !== 'Semua Jenis' &&
        !availableLivestock.includes(prev.jenisTernak)
      ) {
        nextJenis = availableLivestock.length > 1 ? 'Semua Jenis' : availableLivestock[0];
      }

      if (
        nextTahun === prev.tahun &&
        nextKab === prev.kabupatenKota &&
        nextJenis === prev.jenisTernak
      ) {
        return prev;
      }

      return {
        tahun: nextTahun,
        kabupatenKota: nextKab,
        jenisTernak: nextJenis,
      };
    });
  }, [availableYears, availableRegions, availableLivestock]);

  // Handler Ganti Peran dengan Perlindungan Login
  const handleRoleClick = (targetRole: UserRole) => {
    if (targetRole === 'pengelola') {
      if (isAuthenticated) {
        setRole('pengelola');
      } else {
        setIsLoginModalOpen(true);
      }
    } else {
      setRole('pimpinan');
    }
  };

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('kalbar_admin_auth', 'true');
    }
    setRole('pengelola');
    setIsLoginModalOpen(false);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('kalbar_admin_auth');
    }
    setRole('pimpinan');
  };

  // Handler Atur Ulang Filter
  const handleResetFilters = () => {
    setFilters({
      tahun: latestYear ?? 'Semua',
      kabupatenKota: availableRegions.length > 1 ? 'Seluruh Provinsi' : (availableRegions[0] ?? ''),
      jenisTernak: availableLivestock.length > 1 ? 'Semua Jenis' : (availableLivestock[0] ?? ''),
    });
  };

  // Handler Mengosongkan Data
  const handleClearData = () => {
    setRecords([]);
    setValidation(validateRecords([]));
  };

  // Handler Unggah Data Baru (Mendukung Overwrite & Append/Merge)
  const handleDataLoaded = (
    newRecords: LivestockRecord[],
    newValidation: ValidationResult,
    mode: UploadMode
  ) => {
    if (mode === 'overwrite' || records.length === 0) {
      setRecords(newRecords);
      setValidation(newValidation);
      if (newValidation.yearRange) {
        setFilters((prev) => ({
          ...prev,
          tahun: newValidation.yearRange![1],
        }));
      }
    } else {
      // Mode 'append': Gabungkan data baru dengan data aktif
      const recordMap = new Map<string, LivestockRecord>();

      // Masukkan baris data yang ada
      records.forEach((r) => {
        const key = `${r.tahun}-${r.kabupatenKota.toLowerCase()}-${r.jenisTernak.toLowerCase()}`;
        recordMap.set(key, r);
      });

      // Sisipkan atau perbarui dengan baris data baru
      newRecords.forEach((r) => {
        const key = `${r.tahun}-${r.kabupatenKota.toLowerCase()}-${r.jenisTernak.toLowerCase()}`;
        recordMap.set(key, r);
      });

      const mergedList = Array.from(recordMap.values());
      const val = validateRecords(mergedList);
      setRecords(mergedList);
      setValidation(val);
      if (val.yearRange) {
        setFilters((prev) => ({
          ...prev,
          tahun: val.yearRange![1],
        }));
      }
    }
  };

  // Handler Pemulihan Data Bawaan
  const handleResetToSample = () => {
    const sample = generateSimulationData();
    const val = validateRecords(sample);
    const maxSampleYear =
      val.yearRange ? val.yearRange[1] : Math.max(...sample.map((r) => r.tahun));
    setRecords(sample);
    setValidation(val);
    setFilters({
      tahun: maxSampleYear,
      kabupatenKota: 'Seluruh Provinsi',
      jenisTernak: 'Semua Jenis',
    });
  };

  // 7. Hitung Ringkasan Indikator (F3)
  const summary = useMemo(() => {
    return getSummaryMetrics(records, filters);
  }, [records, filters]);

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-800 flex flex-col font-sans antialiased selection:bg-emerald-200 selection:text-emerald-900">
      {mapsQuotaExceeded && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm">
          <span>
            Google Maps Platform quota reached. If you are the app owner, visit{' '}
            <a
              href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold text-amber-950 hover:text-amber-800"
            >
              maps developer site
            </a>{' '}
            for instructions to update your account.
          </span>
        </div>
      )}
      {/* 1. Header Aplikasi */}
      <Header
        role={role}
        isAuthenticated={isAuthenticated}
        onRoleClick={handleRoleClick}
        onLogout={handleLogout}
        latestYear={records.length > 0 ? latestYear : null}
        issues={validation.issues}
        onOpenQualityPanel={() => setIsQualityPanelOpen(true)}
      />

      {/* 2. Bar Filter Interaktif (F2) */}
      <FilterBar
        filters={filters}
        onFilterChange={setFilters}
        onReset={handleResetFilters}
        availableYears={availableYears}
        availableRegions={availableRegions}
        availableLivestock={availableLivestock}
      />

      {/* Konten Utama */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full">
        {/* Panel Unggah / Kelola Data Khusus Pengelola Data (F9) - Hanya saat Login */}
        {role === 'pengelola' && isAuthenticated && (
          <UploadSection
            onDataLoaded={handleDataLoaded}
            onClearData={handleClearData}
            onResetToSample={handleResetToSample}
            currentRecordCount={records.length}
          />
        )}

        {/* Agent Tanya-Jawab Bahasa Alami */}
        <NaturalLanguageQA
          records={records}
          filters={filters}
          availableYears={availableYears}
          availableRegions={availableRegions}
          availableLivestock={availableLivestock}
        />

        {/* 3. Empat Kartu Ringkasan (F3) */}
        <SummaryCards summary={summary} filters={filters} />

        {/* 4. Grafik 1: Tren 5 Tahun Terakhir (F4) dengan Tampilan 4 Panel / Tab Switcher */}
        <TrendSection records={records} filters={filters} />

        {/* 5. Grafik 2: Perbandingan Wilayah (F5) */}
        <RegionComparisonSection records={records} filters={filters} />

        {/* 5b. Peta Interaktif Kewilayahan Kalimantan Barat */}
        <RegionalMapSection
          records={records}
          filters={filters}
          onSelectRegion={(kab) =>
            setFilters((prev) => ({ ...prev, kabupatenKota: kab }))
          }
        />

        {/* 6. Grafik 3: Komposisi Jenis Ternak (F6) */}
        <CompositionSection records={records} filters={filters} />

        {/* 7. Tabel Data dan Unduh CSV (F8) */}
        <DataTableSection records={records} filters={filters} />
      </main>

      {/* Modal / Dialog Kualitas Data (F1) */}
      <DataQualityPanel
        isOpen={isQualityPanelOpen}
        onClose={() => setIsQualityPanelOpen(false)}
        validation={validation}
      />

      {/* Modal Otentikasi Pengelola Data */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onSuccess={handleLoginSuccess}
      />

      {/* Footer Aplikasi */}
      <footer className="bg-white border-t border-slate-200 mt-12 py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">
              Dinas Perkebunan dan Peternakan Provinsi Kalimantan Barat
            </span>
            <span>•</span>
            <span>Subbagian Perencanaan dan Data Statistik</span>
          </div>
          <div className="text-slate-400 text-center sm:text-right">
            Prototipe Fungsional • Data statistik peternakan 2019–2024
          </div>
        </div>
      </footer>
    </div>
  );
}
