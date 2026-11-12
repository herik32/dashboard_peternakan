/**
 * Konstanta Kabupaten/Kota, Jenis Ternak, dan Parameter Simulasi
 * Provinsi Kalimantan Barat
 */

export interface RegionConfig {
  name: string;
  weight: number;
}

export const REGIONS: RegionConfig[] = [
  { name: 'Kubu Raya', weight: 0.12 },
  { name: 'Sanggau', weight: 0.11 },
  { name: 'Sintang', weight: 0.10 },
  { name: 'Ketapang', weight: 0.10 },
  { name: 'Landak', weight: 0.09 },
  { name: 'Sambas', weight: 0.09 },
  { name: 'Bengkayang', weight: 0.08 },
  { name: 'Mempawah', weight: 0.07 },
  { name: 'Kapuas Hulu', weight: 0.06 },
  { name: 'Melawi', weight: 0.05 },
  { name: 'Sekadau', weight: 0.05 },
  { name: 'Kayong Utara', weight: 0.03 },
  { name: 'Kota Pontianak', weight: 0.03 },
  { name: 'Kota Singkawang', weight: 0.02 },
];

export const REGION_NAMES = REGIONS.map((r) => r.name);

export interface LivestockConfig {
  name: string;
  pop2024: number;
  growth: number; // e.g. 0.02 for +2.0%
  ratioSlaughter: number; // pemotongan terhadap populasi
  meatWeight: number; // kg per ekor
  eggYieldPerHead: number | null; // kg telur per ekor per tahun, null jika tanpa telur
}

export const LIVESTOCK_TYPES: LivestockConfig[] = [
  {
    name: 'Sapi',
    pop2024: 190000,
    growth: 0.02,
    ratioSlaughter: 0.12,
    meatWeight: 150,
    eggYieldPerHead: null,
  },
  {
    name: 'Kambing',
    pop2024: 150000,
    growth: 0.015,
    ratioSlaughter: 0.30,
    meatWeight: 14,
    eggYieldPerHead: null,
  },
  {
    name: 'Babi',
    pop2024: 600000,
    growth: -0.01,
    ratioSlaughter: 0.80,
    meatWeight: 70,
    eggYieldPerHead: null,
  },
  {
    name: 'Ayam Ras Pedaging',
    pop2024: 22000000,
    growth: 0.03,
    ratioSlaughter: 4.5,
    meatWeight: 1.2,
    eggYieldPerHead: null,
  },
  {
    name: 'Ayam Ras Petelur',
    pop2024: 1500000,
    growth: 0.025,
    ratioSlaughter: 0.5,
    meatWeight: 1.4,
    eggYieldPerHead: 17,
  },
  {
    name: 'Itik',
    pop2024: 700000,
    growth: 0.01,
    ratioSlaughter: 0.6,
    meatWeight: 1.0,
    eggYieldPerHead: 9,
  },
];

export const LIVESTOCK_NAMES = LIVESTOCK_TYPES.map((l) => l.name);

export const MANDATORY_CSV_HEADERS = [
  'Tahun',
  'Kabupaten/Kota',
  'Jenis Ternak',
  'Populasi (ekor)',
  'Pemotongan (ekor)',
  'Produksi Daging (kg)',
  'Produksi Telur (kg)',
] as const;

export const COLOR_PALETTE = {
  emeraldPrimary: '#166534', // forest green
  emeraldLight: '#22c55e',
  emeraldDark: '#14532d',
  emeraldSubtle: '#dcfce7',
  highlight: '#d97706', // amber highlight for selected element
  highlightBg: '#fef3c7',
  neutralBar: '#3b82f6', // soft blue/teal for unselected
  series: [
    '#15803d', // Green (Sapi / Bar 1)
    '#0284c7', // Sky Blue (Kambing / Bar 2)
    '#d97706', // Amber (Babi / Bar 3)
    '#e11d48', // Rose (Ayam Ras Pedaging / Bar 4)
    '#8b5cf6', // Purple (Ayam Ras Petelur / Bar 5)
    '#0d9488', // Teal (Itik / Bar 6)
  ],
};

export const LIVESTOCK_COLORS: Record<string, string> = {
  'Sapi': '#15803d',
  'Kambing': '#0284c7',
  'Babi': '#ea580c',
  'Ayam Ras Pedaging': '#e11d48',
  'Ayam Ras Petelur': '#8b5cf6',
  'Itik': '#0d9488',
};

export const EXTENDED_PALETTE = [
  '#15803d', // Green
  '#0284c7', // Sky Blue
  '#ea580c', // Bright Orange
  '#e11d48', // Crimson Red
  '#8b5cf6', // Violet Purple
  '#0d9488', // Teal
  '#f59e0b', // Amber
  '#6366f1', // Indigo
  '#ec4899', // Pink
  '#14b8a6', // Cyan
  '#84cc16', // Lime
];

export function getSpeciesColor(name: string, index: number = 0): string {
  if (!name) return EXTENDED_PALETTE[index % EXTENDED_PALETTE.length];
  const norm = name.trim().toLowerCase();
  if (norm.includes('sapi')) return '#15803d';
  if (norm.includes('kambing') || norm.includes('domba')) return '#0284c7';
  if (norm.includes('babi')) return '#ea580c';
  if (norm.includes('pedaging') || norm.includes('broiler')) return '#e11d48';
  if (norm.includes('petelur') || norm.includes('layer')) return '#8b5cf6';
  if (norm.includes('itik') || norm.includes('bebek')) return '#0d9488';
  return EXTENDED_PALETTE[index % EXTENDED_PALETTE.length];
}

