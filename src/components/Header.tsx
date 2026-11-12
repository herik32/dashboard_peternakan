import React from 'react';
import { UserRole, QualityIssue } from '../types/livestock';
import {
  UserCheck,
  FileCheck2,
  Info,
  Lock,
  LogOut,
  ShieldCheck,
} from 'lucide-react';

interface HeaderProps {
  role: UserRole;
  isAuthenticated: boolean;
  onRoleClick: (targetRole: UserRole) => void;
  onLogout: () => void;
  latestYear: number | null;
  issues: QualityIssue[];
  onOpenQualityPanel: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  role,
  isAuthenticated,
  onRoleClick,
  onLogout,
  latestYear,
  issues,
  onOpenQualityPanel,
}) => {
  const errorCount = issues.filter((i) => i.severity === 'error').length;
  const warningCount = issues.filter((i) => i.severity === 'warning').length;

  return (
    <header className="bg-emerald-950 text-white border-b border-emerald-900 shadow-md">
      {/* Top Banner Notice: Data Simulasi */}
      <div className="bg-emerald-900/90 text-emerald-100 text-xs px-4 py-1.5 flex flex-wrap items-center justify-between border-b border-emerald-800/60 gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30">
            <Info className="w-3.5 h-3.5" />
            Data simulasi - bukan data resmi
          </span>
          <span className="hidden sm:inline text-emerald-200/80">
            Prototipe Sistem Informasi Statistik Peternakan Disbunnak Prov. Kalbar
          </span>
        </div>
        <div className="text-emerald-300 font-mono text-[11px]">
          {latestYear ? `Data per Tahun ${latestYear}` : 'Data kosong (0 baris)'}
        </div>
      </div>

      {/* Main Header Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 sm:py-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Brand & Agency Title */}
          <div className="flex items-center gap-3.5">
            <img
              src="/assets/aistudio/Logo_Provinsi_KalBar_8fa6b06e.png"
              alt="Logo Pemerintah Provinsi Kalimantan Barat"
              className="h-11 sm:h-12 w-auto object-contain shrink-0 drop-shadow-md"
            />
            <div>
              <div className="text-[11px] sm:text-xs uppercase tracking-wider text-emerald-300/90 font-medium leading-tight">
                <div>DINAS PERKEBUNAN DAN PETERNAKAN</div>
                <div className="text-[10px] sm:text-[11px] text-emerald-400/90">PROVINSI KALIMANTAN BARAT</div>
              </div>
              <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-white tracking-tight leading-tight">
                Dashboard Statistik Peternakan
              </h1>
            </div>
          </div>

          {/* Controls: Role Switcher & Quality Button */}
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
            {/* Quality Button - Hanya ditampilkan pada peran Pengelola Data */}
            {role === 'pengelola' && (
              <button
                onClick={onOpenQualityPanel}
                type="button"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-900/80 hover:bg-emerald-800 border border-emerald-700/80 text-emerald-100 transition-colors cursor-pointer shadow-sm"
                title="Buka panel Kualitas Data"
              >
                <FileCheck2 className="w-4 h-4 text-emerald-300" />
                <span>Kualitas Data</span>
                {errorCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-600 text-white">
                    {errorCount} Galat
                  </span>
                )}
                {errorCount === 0 && warningCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500/80 text-emerald-950">
                    {warningCount} Peringatan
                  </span>
                )}
                {errorCount === 0 && warningCount === 0 && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                )}
              </button>
            )}


            {/* Role Switcher */}
            <div className="flex items-center bg-emerald-900/90 p-1 rounded-lg border border-emerald-700/70">
              <span className="text-[11px] text-emerald-300/80 px-2 font-medium flex items-center gap-1">
                <UserCheck className="w-3.5 h-3.5" />
                Peran:
              </span>
              <button
                type="button"
                onClick={() => onRoleClick('pimpinan')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all cursor-pointer ${
                  role === 'pimpinan'
                    ? 'bg-emerald-700 text-white shadow-sm font-semibold'
                    : 'text-emerald-200 hover:text-white'
                }`}
              >
                Pimpinan
              </button>
              <button
                type="button"
                onClick={() => onRoleClick('pengelola')}
                className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md transition-all cursor-pointer ${
                  role === 'pengelola'
                    ? 'bg-emerald-700 text-white shadow-sm font-semibold'
                    : 'text-emerald-200 hover:text-white'
                }`}
              >
                {!isAuthenticated && <Lock className="w-3 h-3 text-emerald-300" />}
                <span>Pengelola Data</span>
              </button>
            </div>

            {/* If Pengelola & Authenticated: Show Logout Button */}
            {role === 'pengelola' && isAuthenticated && (
              <button
                type="button"
                onClick={onLogout}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-rose-900/60 hover:bg-rose-900 border border-rose-700/70 text-rose-200 transition-colors cursor-pointer"
                title="Keluar dari akun Pengelola Data"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Keluar</span>
              </button>
            )}
          </div>
        </div>

        {/* Role Explanation Tagline */}
        <div className="mt-2 text-[11px] text-emerald-300/70 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span>
              {role === 'pimpinan'
                ? 'Mode Pimpinan: Menjelajah visualisasi statistik untuk evaluasi dan rapat pimpinan.'
                : 'Mode Pengelola Data: Dilengkapi menu validasi, pengosongan data, pengunggahan berkas CSV, dan unduh templat.'}
            </span>
            {role === 'pengelola' && isAuthenticated && (
              <span className="inline-flex items-center gap-1 px-2 py-0.2 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                Terotentikasi
              </span>
            )}
          </div>
          <span className="hidden sm:inline italic text-[10px] text-emerald-400/60">
            *Fitur login aktif untuk melindungi hak pengubahan data.
          </span>
        </div>
      </div>
    </header>
  );
};
