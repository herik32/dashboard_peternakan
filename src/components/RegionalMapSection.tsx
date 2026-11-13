import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  APIProvider,
  Map as GoogleMap,
  InfoWindow,
  useMap,
} from '@vis.gl/react-google-maps';
import { FilterState, LivestockRecord } from '../types/livestock';
import {
  getRegionalComparisonData,
  formatIdNumber,
  RegionComparisonItem,
} from '../utils/aggregations';
import {
  MapPin,
  Layers,
  Beef,
  Egg,
  Scissors,
  Compass,
  Filter,
  Info,
  Loader2,
} from 'lucide-react';

interface RegionalMapSectionProps {
  records: LivestockRecord[];
  filters: FilterState;
  onSelectRegion: (kabupatenKota: string) => void;
}

type MapMetric = 'populasi' | 'pemotongan' | 'produksiDaging' | 'produksiTelur';

interface MetricConfig {
  id: MapMetric;
  label: string;
  unit: string;
  icon: React.ComponentType<{ className?: string }>;
}

const METRIC_OPTIONS: MetricConfig[] = [
  { id: 'populasi', label: 'Populasi', unit: 'ekor', icon: Layers },
  { id: 'pemotongan', label: 'Pemotongan', unit: 'ekor', icon: Scissors },
  { id: 'produksiDaging', label: 'Produksi Daging', unit: 'kg', icon: Beef },
  { id: 'produksiTelur', label: 'Produksi Telur', unit: 'kg', icon: Egg },
];

interface ColorTier {
  level: number;
  label: string;
  rangeLabel: string;
  min: number;
  max: number | null; // null = tak terhingga (>)
  fillColor: string;
  badgeTextColor: string;
}

const GREEN_PALETTE = [
  { fill: '#dcfce7', text: '#14532d', name: 'Hijau Sangat Muda' },
  { fill: '#86efac', text: '#14532d', name: 'Hijau Muda' },
  { fill: '#22c55e', text: '#ffffff', name: 'Hijau Sedang' },
  { fill: '#15803d', text: '#ffffff', name: 'Hijau Tua' },
  { fill: '#14532d', text: '#ffffff', name: 'Hijau Pekat' },
];

const NO_DATA_COLOR = '#e2e8f0';

const KALBAR_CENTER = { lat: -0.25, lng: 110.95 };
const KALBAR_DEFAULT_ZOOM = 7;

/**
 * Normalisasi nama wilayah agar penulisan seperti:
 * "PONTIANAK" / "Kota Pontianak", "SINGKAWANG" / "Kota Singkawang",
 * "KAB. KUBU RAYA" / "Kabupaten Kubu Raya" / "KUBU RAYA" tetap cocok 100% dengan poligon GeoJSON.
 */
function normalizeRegionKey(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/^(kabupaten|kab\.?|kota)\s+/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function niceStep(rawStep: number): number {
  if (rawStep <= 0) return 100;
  if (rawStep <= 10) return Math.ceil(rawStep);
  const exp = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const frac = rawStep / exp;
  const multipliers = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];
  const chosen = multipliers.find((m) => frac <= m) ?? 10;
  return chosen * exp;
}

function buildColorTiers(values: number[]): ColorTier[] {
  const positive = values.filter((v) => v > 0);
  if (positive.length === 0) {
    return GREEN_PALETTE.map((p, idx) => ({
      level: idx + 1,
      label: p.name,
      rangeLabel: `${idx * 100 + 1} – ${(idx + 1) * 100}`,
      min: idx * 100 + 1,
      max: (idx + 1) * 100,
      fillColor: p.fill,
      badgeTextColor: p.text,
    }));
  }

  const maxVal = Math.max(...positive);
  const step = niceStep(maxVal / 5);

  return GREEN_PALETTE.map((p, idx) => {
    const min = idx === 0 ? 1 : idx * step + 1;
    const max = idx === 4 ? null : (idx + 1) * step;
    const rangeLabel =
      max === null
        ? `> ${formatIdNumber(idx * step)}`
        : `${formatIdNumber(min)} – ${formatIdNumber(max)}`;

    return {
      level: idx + 1,
      label: p.name,
      rangeLabel,
      min,
      max,
      fillColor: p.fill,
      badgeTextColor: p.text,
    };
  });
}

function getTierForValue(
  val: number | null | undefined,
  tiers: ColorTier[]
): ColorTier | null {
  if (val === null || val === undefined || val <= 0) return null;
  for (const tier of tiers) {
    if (tier.max === null) {
      if (val >= tier.min) return tier;
    } else if (val >= tier.min && val <= tier.max) {
      return tier;
    }
  }
  return tiers[tiers.length - 1] ?? null;
}

function getMetricValue(
  item: RegionComparisonItem | undefined,
  metric: MapMetric
): number | null {
  if (!item || !item.hasData) return null;
  switch (metric) {
    case 'populasi':
      return item.populasi;
    case 'pemotongan':
      return item.pemotongan;
    case 'produksiDaging':
      return item.produksiDaging;
    case 'produksiTelur':
      return item.produksiTelur;
  }
}

interface GeoJsonFeatureCollection {
  type: 'FeatureCollection';
  features: Array<{
    type: 'Feature';
    properties: {
      kabupatenKota: string;
      provinsi: string;
      centroidLat: number;
      centroidLng: number;
    };
    geometry: unknown;
  }>;
}

interface ActiveRegionPopup {
  geoName: string;
  regionKey: string;
  position: { lat: number; lng: number };
}

interface KalbarDataLayerProps {
  geoJson: GeoJsonFeatureCollection | null;
  regionLookup: Record<string, RegionComparisonItem>;
  tiers: ColorTier[];
  activeMetric: MapMetric;
  selectedFilterRegion: string;
  activePopupKey: string | null;
  onHoverRegion: (
    info: { kabupatenKota: string; value: number | null; tier: ColorTier | null } | null
  ) => void;
  onClickRegion: (popup: ActiveRegionPopup) => void;
  resetSignal: number;
}

function processGeoPoints(
  geometry: google.maps.LatLng | google.maps.Data.Geometry,
  callback: (latLng: google.maps.LatLng) => void,
  thisArg: google.maps.LatLngBounds
): void {
  if (geometry instanceof google.maps.LatLng) {
    callback.call(thisArg, geometry);
  } else if (geometry instanceof google.maps.Data.Point) {
    callback.call(thisArg, geometry.get());
  } else {
    const geomWithArray = geometry as google.maps.Data.Geometry & {
      getArray?: () => Array<google.maps.LatLng | google.maps.Data.Geometry>;
    };
    if (typeof geomWithArray.getArray === 'function') {
      geomWithArray.getArray().forEach((g) => {
        processGeoPoints(g, callback, thisArg);
      });
    }
  }
}

const KalbarDataLayer: React.FC<KalbarDataLayerProps> = ({
  geoJson,
  regionLookup,
  tiers,
  activeMetric,
  selectedFilterRegion,
  activePopupKey,
  onHoverRegion,
  onClickRegion,
  resetSignal,
}) => {
  const map = useMap();
  const hasLoadedGeoRef = useRef(false);

  // Muat GeoJSON ke map.data dan fitBounds pada pemuatan awal
  useEffect(() => {
    if (!map || !geoJson) return;

    map.data.forEach((f) => {
      map.data.remove(f);
    });

    map.data.addGeoJson(geoJson as unknown as object);
    hasLoadedGeoRef.current = true;

    const bounds = new google.maps.LatLngBounds();
    map.data.forEach((feature) => {
      const geometry = feature.getGeometry();
      if (geometry) {
        processGeoPoints(geometry, bounds.extend, bounds);
      }
    });
    if (!bounds.isEmpty()) {
      map.fitBounds(bounds, { top: 12, right: 12, bottom: 12, left: 12 });
    }
  }, [map, geoJson]);

  // Reset / pusatkan viewport saat tombol ditekan
  useEffect(() => {
    if (!map || resetSignal === 0 || !hasLoadedGeoRef.current) return;
    const bounds = new google.maps.LatLngBounds();
    map.data.forEach((feature) => {
      const geometry = feature.getGeometry();
      if (geometry) {
        processGeoPoints(geometry, bounds.extend, bounds);
      }
    });
    if (!bounds.isEmpty()) {
      map.fitBounds(bounds, { top: 12, right: 12, bottom: 12, left: 12 });
    } else {
      map.setCenter(KALBAR_CENTER);
      map.setZoom(KALBAR_DEFAULT_ZOOM);
    }
  }, [map, resetSignal]);

  // Terapkan style dinamis berdasarkan data wilayah dengan pencocokan normalisasi nama
  useEffect(() => {
    if (!map) return;

    const selectedFilterKey =
      selectedFilterRegion !== 'Seluruh Provinsi' && selectedFilterRegion !== ''
        ? normalizeRegionKey(selectedFilterRegion)
        : '';

    map.data.setStyle((feature: google.maps.Data.Feature) => {
      const geoName = String(feature.getProperty('kabupatenKota') ?? '');
      const key = normalizeRegionKey(geoName);
      const item = regionLookup[key];
      const val = getMetricValue(item, activeMetric);
      const tier = getTierForValue(val, tiers);

      const isFilterSelected = selectedFilterKey !== '' && key === selectedFilterKey;
      const isPopupActive = activePopupKey !== null && key === activePopupKey;

      return {
        fillColor: tier ? tier.fillColor : NO_DATA_COLOR,
        fillOpacity: isFilterSelected || isPopupActive ? 0.9 : 0.78,
        strokeColor: isFilterSelected || isPopupActive ? '#d97706' : '#064e3b',
        strokeWeight: isFilterSelected || isPopupActive ? 3 : 1.3,
        zIndex: isFilterSelected || isPopupActive ? 10 : 1,
        clickable: true,
      };
    });
  }, [
    map,
    regionLookup,
    tiers,
    activeMetric,
    selectedFilterRegion,
    activePopupKey,
  ]);

  // Event listeners hover & klik pada poligon wilayah
  useEffect(() => {
    if (!map) return;

    const overListener = map.data.addListener(
      'mouseover',
      (event: google.maps.Data.MouseEvent) => {
        const geoName = String(event.feature.getProperty('kabupatenKota') ?? '');
        const key = normalizeRegionKey(geoName);
        const item = regionLookup[key];
        const val = getMetricValue(item, activeMetric);
        const tier = getTierForValue(val, tiers);

        map.data.overrideStyle(event.feature, {
          strokeWeight: 3,
          strokeColor: '#0f172a',
          fillOpacity: 0.92,
          zIndex: 20,
        });

        onHoverRegion({
          kabupatenKota: item?.kabupatenKota ?? geoName,
          value: val,
          tier,
        });
      }
    );

    const outListener = map.data.addListener('mouseout', () => {
      map.data.revertStyle();
      onHoverRegion(null);
    });

    const clickListener = map.data.addListener(
      'click',
      (event: google.maps.Data.MouseEvent) => {
        const geoName = String(event.feature.getProperty('kabupatenKota') ?? '');
        const key = normalizeRegionKey(geoName);
        const lat = Number(event.feature.getProperty('centroidLat'));
        const lng = Number(event.feature.getProperty('centroidLng'));

        const position =
          !isNaN(lat) && !isNaN(lng)
            ? { lat, lng }
            : event.latLng
            ? { lat: event.latLng.lat(), lng: event.latLng.lng() }
            : KALBAR_CENTER;

        onClickRegion({ geoName, regionKey: key, position });
      }
    );

    return () => {
      google.maps.event.removeListener(overListener);
      google.maps.event.removeListener(outListener);
      google.maps.event.removeListener(clickListener);
    };
  }, [map, regionLookup, tiers, activeMetric, onHoverRegion, onClickRegion]);

  return null;
};

export const RegionalMapSection: React.FC<RegionalMapSectionProps> = ({
  records,
  filters,
  onSelectRegion,
}) => {
  const [activeMetric, setActiveMetric] = useState<MapMetric>('populasi');
  const [geoJson, setGeoJson] = useState<GeoJsonFeatureCollection | null>(null);
  const [mapsApiKey, setMapsApiKey] = useState<string>(
    () => (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined) || ''
  );
  const [isLoadingKey, setIsLoadingKey] = useState<boolean>(
    () => !import.meta.env.VITE_GOOGLE_MAPS_API_KEY
  );
  const [hoveredInfo, setHoveredInfo] = useState<{
    kabupatenKota: string;
    value: number | null;
    tier: ColorTier | null;
  } | null>(null);
  const [activePopup, setActivePopup] = useState<ActiveRegionPopup | null>(null);
  const [resetSignal, setResetSignal] = useState(0);

  // Muat API key dari /api/maps-config jika belum tersedia di bundle Vite
  useEffect(() => {
    if (mapsApiKey) {
      setIsLoadingKey(false);
      return;
    }

    let cancelled = false;
    fetch('/api/maps-config')
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data?.apiKey) {
          setMapsApiKey(data.apiKey);
        }
      })
      .catch((err) => {
        console.error('Gagal memuat konfigurasi peta:', err);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingKey(false);
      });

    return () => {
      cancelled = true;
    };
  }, [mapsApiKey]);

  // Muat GeoJSON batas 14 Kabupaten/Kota Kalimantan Barat
  useEffect(() => {
    let cancelled = false;
    fetch('/data/kalbar_kabupaten.geojson')
      .then((r) => r.json())
      .then((data: GeoJsonFeatureCollection) => {
        if (!cancelled && data?.type === 'FeatureCollection') {
          setGeoJson(data);
        }
      })
      .catch((err) => {
        console.error('Gagal memuat GeoJSON Kalimantan Barat:', err);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const regional = useMemo(
    () => getRegionalComparisonData(records, filters),
    [records, filters]
  );

  // Lookup berdasarkan nama wilayah yang dinormalisasi ("Kota Pontianak" & "PONTIANAK" -> "pontianak")
  const regionLookup = useMemo(() => {
    const dict: Record<string, RegionComparisonItem> = {};
    for (const item of regional.items) {
      const key = normalizeRegionKey(item.kabupatenKota);
      dict[key] = item;
    }
    return dict;
  }, [regional.items]);

  const activeMetricConfig = useMemo(
    () => METRIC_OPTIONS.find((m) => m.id === activeMetric) ?? METRIC_OPTIONS[0],
    [activeMetric]
  );

  const colorTiers = useMemo(() => {
    const vals = regional.items
      .map((item) => getMetricValue(item, activeMetric))
      .filter((v): v is number => v !== null);
    return buildColorTiers(vals);
  }, [regional.items, activeMetric]);

  const sortedRegions = useMemo(() => {
    return [...regional.items].sort((a, b) => {
      const va = getMetricValue(a, activeMetric) ?? -1;
      const vb = getMetricValue(b, activeMetric) ?? -1;
      return vb - va;
    });
  }, [regional.items, activeMetric]);

  const handleHover = useCallback(
    (
      info: {
        kabupatenKota: string;
        value: number | null;
        tier: ColorTier | null;
      } | null
    ) => {
      setHoveredInfo(info);
    },
    []
  );

  const handleClick = useCallback((popup: ActiveRegionPopup) => {
    setActivePopup(popup);
  }, []);

  const handleSidebarRegionClick = (kabupatenKota: string) => {
    const key = normalizeRegionKey(kabupatenKota);
    if (!geoJson) {
      onSelectRegion(kabupatenKota);
      return;
    }
    const feat = geoJson.features.find(
      (f) => normalizeRegionKey(f.properties.kabupatenKota) === key
    );
    if (feat) {
      setActivePopup({
        geoName: feat.properties.kabupatenKota,
        regionKey: key,
        position: {
          lat: feat.properties.centroidLat,
          lng: feat.properties.centroidLng,
        },
      });
    } else {
      onSelectRegion(kabupatenKota);
    }
  };

  const activePopupData = activePopup
    ? regionLookup[activePopup.regionKey]
    : undefined;
  const activePopupDisplayName =
    activePopupData?.kabupatenKota ?? activePopup?.geoName ?? '';
  const activePopupValue = getMetricValue(activePopupData, activeMetric);
  const activePopupTier = getTierForValue(activePopupValue, colorTiers);

  const activeFilterKey =
    filters.kabupatenKota !== 'Seluruh Provinsi' && filters.kabupatenKota !== ''
      ? normalizeRegionKey(filters.kabupatenKota)
      : '';

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 sm:p-5 mb-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <MapPin className="w-4 h-4" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900">
              Peta Interaktif Kewilayahan Kalimantan Barat
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Sebaran spasial 14 kabupaten/kota dengan pewarnaan bertingkat sesuai besaran data (Tahun {filters.tahun}, {filters.jenisTernak}).
          </p>
        </div>

        {/* Behavioral Chips */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mr-1.5"></span>
            Filter berlaku: Tahun ({filters.tahun}), {filters.jenisTernak}
          </span>
          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mr-1.5"></span>
            Klik wilayah pada peta untuk rincian & filter
          </span>
        </div>
      </div>

      {/* Pilihan Indikator Data untuk Pewarnaan Peta */}
      <div className="mt-3 mb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-1.5">
          {METRIC_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const isSelected = activeMetric === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setActiveMetric(opt.id)}
                className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-emerald-800 text-white border-emerald-800 shadow-xs font-semibold'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{opt.label}</span>
                <span className="text-[10px] opacity-80">({opt.unit})</span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => {
            setActivePopup(null);
            setResetSignal((s) => s + 1);
          }}
          className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium cursor-pointer transition-colors self-start sm:self-auto"
        >
          <Compass className="w-3.5 h-3.5 text-emerald-700" />
          <span>Pusatkan Peta Kalbar</span>
        </button>
      </div>

      {/* Layout Utama Peta (Lebar Penuh & Lebih Besar) + Panel Legenda & Peringkat di Bawah */}
      <div className="flex flex-col gap-4">
        {/* Area Peta Google Maps */}
        <div className="w-full relative rounded-xl overflow-hidden border border-slate-200 bg-slate-100 h-[520px] sm:h-[620px] lg:h-[700px]">
          {isLoadingKey ? (
            <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 text-xs gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-700" />
              <span>Memuat layanan peta interaktif...</span>
            </div>
          ) : !mapsApiKey ? (
            <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 text-xs p-6 text-center">
              <Info className="w-6 h-6 mb-2 text-amber-600" />
              <p className="font-semibold text-slate-700">
                Kunci API Google Maps belum tersedia.
              </p>
              <p className="mt-1 text-slate-500 max-w-md">
                Silakan pastikan layanan Google Maps Platform telah diaktifkan pada pengaturan aplikasi.
              </p>
            </div>
          ) : (
            <APIProvider apiKey={mapsApiKey} language="id" region="ID">
              <GoogleMap
                defaultCenter={KALBAR_CENTER}
                defaultZoom={KALBAR_DEFAULT_ZOOM}
                gestureHandling="cooperative"
                mapTypeControl={true}
                streetViewControl={false}
                fullscreenControl={true}
                internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                style={{ width: '100%', height: '100%' }}
              >
                <KalbarDataLayer
                  geoJson={geoJson}
                  regionLookup={regionLookup}
                  tiers={colorTiers}
                  activeMetric={activeMetric}
                  selectedFilterRegion={filters.kabupatenKota}
                  activePopupKey={activePopup?.regionKey ?? null}
                  onHoverRegion={handleHover}
                  onClickRegion={handleClick}
                  resetSignal={resetSignal}
                />

                {activePopup && (
                  <InfoWindow
                    position={activePopup.position}
                    onCloseClick={() => setActivePopup(null)}
                    maxWidth={290}
                  >
                    <div className="p-1 text-slate-800 font-sans min-w-[220px]">
                      <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-1.5 mb-2">
                        <span className="font-bold text-sm text-emerald-950">
                          {activePopupDisplayName}
                        </span>
                        {activePopupTier && (
                          <span
                            className="text-[10px] font-bold px-2 py-0.5 rounded"
                            style={{
                              backgroundColor: activePopupTier.fillColor,
                              color: activePopupTier.badgeTextColor,
                              border: '1px solid rgba(0,0,0,0.12)',
                            }}
                          >
                            {activePopupTier.label}
                          </span>
                        )}
                      </div>

                      {activePopupData && activePopupData.hasData ? (
                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between gap-3">
                            <span className="text-slate-500">Populasi:</span>
                            <span className="font-mono font-bold text-slate-900">
                              {formatIdNumber(activePopupData.populasi)} ekor
                            </span>
                          </div>
                          <div className="flex justify-between gap-3">
                            <span className="text-slate-500">Pemotongan:</span>
                            <span className="font-mono font-bold text-slate-900">
                              {formatIdNumber(activePopupData.pemotongan)} ekor
                            </span>
                          </div>
                          <div className="flex justify-between gap-3">
                            <span className="text-slate-500">Prod. Daging:</span>
                            <span className="font-mono font-bold text-slate-900">
                              {formatIdNumber(activePopupData.produksiDaging)} kg
                            </span>
                          </div>
                          <div className="flex justify-between gap-3">
                            <span className="text-slate-500">Prod. Telur:</span>
                            <span className="font-mono font-bold text-slate-900">
                              {activePopupData.produksiTelur !== null
                                ? `${formatIdNumber(activePopupData.produksiTelur)} kg`
                                : 'Tidak ada data'}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs text-slate-500 italic py-1">
                          Tidak ada data untuk kriteria filter ini.
                        </div>
                      )}

                      <div className="mt-2.5 pt-2 border-t border-slate-200 flex gap-1.5">
                        {activeFilterKey === activePopup.regionKey ? (
                          <button
                            type="button"
                            onClick={() => onSelectRegion('Seluruh Provinsi')}
                            className="w-full inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-semibold cursor-pointer transition-colors"
                          >
                            <Filter className="w-3 h-3" />
                            <span>Tampilkan Seluruh Provinsi</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              onSelectRegion(
                                activePopupData?.kabupatenKota ??
                                  activePopup.geoName
                              )
                            }
                            className="w-full inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded bg-emerald-800 hover:bg-emerald-700 text-white text-[11px] font-semibold cursor-pointer transition-colors"
                          >
                            <Filter className="w-3 h-3" />
                            <span>Terapkan ke Filter Wilayah</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </InfoWindow>
                )}
              </GoogleMap>
            </APIProvider>
          )}

          {/* Hover Floating Pill Info */}
          {hoveredInfo && (
            <div className="pointer-events-none absolute top-3 left-1/2 -translate-x-1/2 z-10 bg-slate-900/95 text-white px-3.5 py-2 rounded-lg shadow-xl border border-slate-700 text-xs flex items-center gap-2.5 backdrop-blur-xs">
              <span
                className="w-3 h-3 rounded-sm shrink-0 border border-white/40"
                style={{
                  backgroundColor: hoveredInfo.tier
                    ? hoveredInfo.tier.fillColor
                    : NO_DATA_COLOR,
                }}
              />
              <span className="font-bold text-emerald-300">
                {hoveredInfo.kabupatenKota}
              </span>
              <span className="text-slate-400">•</span>
              <span className="font-mono font-bold">
                {hoveredInfo.value !== null
                  ? `${formatIdNumber(hoveredInfo.value)} ${activeMetricConfig.unit}`
                  : 'Tidak ada data'}
              </span>
            </div>
          )}
        </div>

        {/* Panel Bawah: Legenda Rentang Warna & Daftar Wilayah */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Legenda Skala Warna Hijau */}
          <div className="lg:col-span-5 p-3.5 rounded-xl border border-slate-200 bg-slate-50/70">
            <div className="text-xs font-bold text-slate-800 mb-2 flex items-center justify-between">
              <span>Legenda Warna Data</span>
              <span className="text-[11px] font-mono text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded">
                {activeMetricConfig.label} ({activeMetricConfig.unit})
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-1.5">
              {colorTiers.map((tier) => (
                <div
                  key={tier.level}
                  className="flex items-center justify-between gap-2 text-xs bg-white px-2.5 py-1.5 rounded-md border border-slate-200/80"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-4 h-4 rounded-sm shrink-0 border border-slate-300 shadow-2xs"
                      style={{ backgroundColor: tier.fillColor }}
                    />
                    <span className="font-medium text-slate-700 truncate">
                      {tier.label}
                    </span>
                  </div>
                  <span className="font-mono text-[11px] font-semibold text-slate-900 shrink-0">
                    {tier.rangeLabel}
                  </span>
                </div>
              ))}

              <div className="flex items-center justify-between gap-2 text-xs bg-white px-2.5 py-1.5 rounded-md border border-slate-200/80">
                <div className="flex items-center gap-2">
                  <span
                    className="w-4 h-4 rounded-sm shrink-0 border border-slate-300"
                    style={{ backgroundColor: NO_DATA_COLOR }}
                  />
                  <span className="font-medium text-slate-500">
                    Nol / Tidak ada data
                  </span>
                </div>
                <span className="font-mono text-[11px] text-slate-500">0</span>
              </div>
            </div>
          </div>

          {/* Daftar Ringkas Peringkat Wilayah (Klik untuk Sorot di Peta) */}
          <div className="lg:col-span-7 p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 flex flex-col min-h-0">
            <div className="text-xs font-bold text-slate-800 mb-2 flex items-center justify-between">
              <span>Peringkat Wilayah ({activeMetricConfig.label})</span>
              <span className="text-[10px] text-slate-500 font-normal">
                {sortedRegions.length} wilayah
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 overflow-y-auto max-h-[260px] pr-1">
              {sortedRegions.map((item, idx) => {
                const val = getMetricValue(item, activeMetric);
                const tier = getTierForValue(val, colorTiers);
                const itemKey = normalizeRegionKey(item.kabupatenKota);
                const isSelected =
                  (activeFilterKey !== '' && itemKey === activeFilterKey) ||
                  (activePopup !== null && itemKey === activePopup.regionKey);

                return (
                  <button
                    key={item.kabupatenKota}
                    type="button"
                    onClick={() => handleSidebarRegionClick(item.kabupatenKota)}
                    className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md border text-xs cursor-pointer transition-all text-left ${
                      isSelected
                        ? 'bg-amber-50 border-amber-400 ring-1 ring-amber-400 font-semibold'
                        : 'bg-white border-slate-200/80 hover:bg-emerald-50/60 hover:border-emerald-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono text-[10px] text-slate-400 w-4 shrink-0">
                        {idx + 1}.
                      </span>
                      <span
                        className="w-3 h-3 rounded-sm shrink-0 border border-slate-300"
                        style={{
                          backgroundColor: tier ? tier.fillColor : NO_DATA_COLOR,
                        }}
                      />
                      <span className="truncate text-slate-800">
                        {item.kabupatenKota}
                      </span>
                    </div>
                    <span className="font-mono text-[11px] font-semibold text-slate-900 shrink-0">
                      {val !== null ? formatIdNumber(val) : '-'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
