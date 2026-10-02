import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  GoogleMap,
  MarkerF,
  PolygonF,
} from '@react-google-maps/api';
import { useGoogleMaps } from '../../contexts/GoogleMapsContext';
import {
  MapPin,
  Droplets,
  Zap,
  Route as RoadIcon,
  Search,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  Clock,
  HardHat,
  ChevronDown,
  Check,
  Layers,
  Compass,
  Loader2,
} from 'lucide-react';
import {
  NORTH_CALOOCAN_PATH,
  SOUTH_CALOOCAN_PATH,
  NORTH_CALOOCAN_CENTROID,
  SOUTH_CALOOCAN_CENTROID,
  COMBINED_CALOOCAN_BOUNDS,
} from '../../data/caloocanBoundaries';
import { useTheme } from '../../contexts/ThemeContext';

const CALOOCAN_CENTER = { lat: 14.7104, lng: 121.0298 };

// Civic Zero-Clutter Map Styles (zero commercial POIs, high contrast civic roads & borders)
const DARK_BASE_RULES = [
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { elementType: 'geometry', stylers: [{ color: '#0c1322' }] },
  { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#0c1322' }] },
  { featureType: 'landscape.natural', elementType: 'geometry', stylers: [{ color: '#0b111e' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#070b14' }] },
  { featureType: 'water', elementType: 'labels.text', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#1e293b' }, { weight: 1 }] },
  { featureType: 'administrative.country', elementType: 'geometry.stroke', stylers: [{ color: '#334155' }] },
  { featureType: 'administrative.province', elementType: 'geometry.stroke', stylers: [{ color: '#243247' }] },
];

const DARK_CIVIC_MAP_STYLE = [
  ...DARK_BASE_RULES,
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#293952' }, { weight: 1.5 }] },
  { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#8193aa' }] },
  { featureType: 'road.highway', elementType: 'labels.text.stroke', stylers: [{ color: '#0c1322' }, { weight: 3 }] },
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#1c283a' }, { weight: 1.2 }] },
  { featureType: 'road.arterial', elementType: 'labels.text.fill', stylers: [{ color: '#64748b' }] },
  { featureType: 'road.arterial', elementType: 'labels.text.stroke', stylers: [{ color: '#0c1322' }, { weight: 3 }] },
  { featureType: 'road.local', elementType: 'geometry', stylers: [{ color: '#141d2c' }, { weight: 0.8 }] },
  { featureType: 'road.local', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#7b8ea5' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.stroke', stylers: [{ color: '#0c1322' }, { weight: 3 }] },
  { featureType: 'administrative.neighborhood', elementType: 'labels.text.fill', stylers: [{ color: '#546478' }] },
  { featureType: 'administrative.neighborhood', elementType: 'labels.text.stroke', stylers: [{ color: '#0c1322' }, { weight: 2 }] },
];

const LIGHT_BASE_RULES = [
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { elementType: 'geometry', stylers: [{ color: '#f8fafc' }] },
  { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#f8fafc' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#e2e8f0' }] },
  { featureType: 'water', elementType: 'labels.text', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#cbd5e1' }] },
];

const LIGHT_CIVIC_MAP_STYLE = [
  ...LIGHT_BASE_RULES,
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#cbd5e1' }] },
  { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#475569' }] },
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#e2e8f0' }] },
  { featureType: 'road.arterial', elementType: 'labels.text.fill', stylers: [{ color: '#64748b' }] },
  { featureType: 'road.local', elementType: 'geometry', stylers: [{ color: '#f1f5f9' }] },
  { featureType: 'road.local', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#334155' }] },
  { featureType: 'administrative.neighborhood', elementType: 'labels.text.fill', stylers: [{ color: '#64748b' }] },
];

const getMarkerSVG = (category, status, isSelected = false) => {
  let color = '#ff6b00'; // Default PULSO orange
  const stat = (status || '').toLowerCase();
  if (stat.includes('resolve')) color = '#10b981'; // Emerald
  else if (stat.includes('dispatch')) color = '#3b82f6'; // Blue
  else if (stat.includes('progress')) color = '#f59e0b'; // Amber

  const cat = (category || '').toLowerCase();
  let svgIcon = '';
  if (cat.includes('water') || cat.includes('leak') || cat.includes('drain')) {
    svgIcon = `<path d="M12 22a7.5 7.5 0 0 0 7.5-7.5c0-4.14-7.5-12.5-7.5-12.5S4.5 10.36 4.5 14.5A7.5 7.5 0 0 0 12 22z" fill="white"/>`;
  } else if (cat.includes('power') || cat.includes('light') || cat.includes('electric') || cat.includes('zap')) {
    svgIcon = `<path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="white"/>`;
  } else {
    // Road / Infrastructure
    svgIcon = `<path d="M12 2a6 6 0 0 0-6 6v2H4v2h16v-2h-2V8a6 6 0 0 0-6-6zm0 2a4 4 0 0 1 4 4v2H8V8a4 4 0 0 1 4-4z" fill="white"/>`;
  }

  const strokeColor = isSelected ? '#ff6b00' : '#ffffff';
  const strokeWidth = isSelected ? '3' : '2';

  const svgString = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 48" width="40" height="48">
      <defs>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="2.5" flood-color="rgba(0,0,0,0.35)"/>
        </filter>
      </defs>
      <path d="M20 46 C20 46, 36 28, 36 18 A16 16 0 0 0 4 18 C4 28, 20 46, 20 46 Z" fill="${color}" stroke="${strokeColor}" stroke-width="${strokeWidth}" filter="url(#shadow)"/>
      <circle cx="20" cy="18" r="11" fill="rgba(0,0,0,0.18)"/>
      <g transform="translate(10, 8) scale(0.8)">
        ${svgIcon}
      </g>
    </svg>
  `.trim().replace(/\n/g, '').replace(/\s+/g, ' ');

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svgString)}`;
};

const DISTRICT_OPTIONS = [
  {
    id: 'all',
    label: 'All 188 Barangays',
    shortLabel: 'All 188 Barangays',
    badge: '188 Brgys',
    icon: Layers,
    description: 'Citywide Caloocan (North & South)',
  },
  {
    id: 'North Caloocan',
    label: 'North District',
    shortLabel: 'North District',
    badge: 'Brgy 165–188',
    icon: Compass,
    description: 'Camarin, Bagong Silang, Tala, Deparo',
  },
  {
    id: 'South Caloocan',
    label: 'South District',
    shortLabel: 'South District',
    badge: 'Brgy 1–164',
    icon: MapPin,
    description: 'Monumento, Grace Park, Sangandaan',
  },
];

const CALOOCAN_INCIDENTS = [
  {
    id: 'PUL-2026-0482',
    category: 'water',
    title: 'Main Pipeline Pressure Leak',
    barangay: 'Brgy. 174, Camarin Road cor. Zabarte',
    district: 'North Caloocan',
    status: 'In Progress',
    statusBadge: 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border-amber-300 dark:border-amber-800',
    crew: 'Maynilad & City Water Division Team 2',
    time: '45 mins ago',
    coordinates: '14.7523° N, 121.0421° E',
    lat: 14.7523,
    lng: 121.0421,
    icon: Droplets,
  },
  {
    id: 'PUL-2026-0479',
    category: 'power',
    title: '4 Streetlights Non-Operational',
    barangay: 'Brgy. 176, Bagong Silang (Phase 4)',
    district: 'North Caloocan',
    status: 'Dispatched',
    statusBadge: 'bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300 border-blue-300 dark:border-blue-800',
    crew: 'City Electrical Maintenance Crew #3',
    time: '1.5 hrs ago',
    coordinates: '14.7645° N, 121.0552° E',
    lat: 14.7645,
    lng: 121.0552,
    icon: Zap,
  },
  {
    id: 'PUL-2026-0465',
    category: 'road',
    title: 'Asphalt Pavement Restoration Complete',
    barangay: 'Monumento Circle, South Caloocan',
    district: 'South Caloocan',
    status: 'Resolved',
    statusBadge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
    crew: 'Highway Maintenance Division - South',
    time: 'Resolved today',
    coordinates: '14.6572° N, 120.9841° E',
    lat: 14.6572,
    lng: 120.9841,
    icon: RoadIcon,
  },
  {
    id: 'PUL-2026-0458',
    category: 'road',
    title: 'Storm Canal Declogging & Cover Repair',
    barangay: 'Brgy. 168, Deparo Road',
    district: 'North Caloocan',
    status: 'In Progress',
    statusBadge: 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border-amber-300 dark:border-amber-800',
    crew: 'Drainage & Flood Control Unit A',
    time: 'In progress',
    coordinates: '14.7350° N, 121.0180° E',
    lat: 14.7350,
    lng: 121.0180,
    icon: RoadIcon,
  },
  {
    id: 'PUL-2026-0441',
    category: 'power',
    title: 'Secondary Cable Insulator Replacement',
    barangay: 'Brgy. 182, Pangarap Village',
    district: 'North Caloocan',
    status: 'Resolved',
    statusBadge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
    crew: 'Meralco Caloocan & LGU Crew',
    time: 'Resolved yesterday',
    coordinates: '14.7810° N, 121.0820° E',
    lat: 14.7810,
    lng: 121.0820,
    icon: Zap,
  },
];

export default function MapPreviewSection() {
  const { theme } = useTheme();
  const [activeCategory, setActiveCategory] = useState('all');
  const [districtFilter, setDistrictFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIncident, setSelectedIncident] = useState(CALOOCAN_INCIDENTS[0]);
  const [isDistrictOpen, setIsDistrictOpen] = useState(false);
  const districtDropdownRef = useRef(null);
  const mapRef = useRef(null);

  const isDarkMode =
    theme === 'dark'
      ? true
      : theme === 'light'
      ? false
      : typeof document !== 'undefined'
      ? document.documentElement.classList.contains('dark')
      : false;

  const { isLoaded } = useGoogleMaps();

  const activeStyles = useMemo(
    () => (isDarkMode ? DARK_CIVIC_MAP_STYLE : LIGHT_CIVIC_MAP_STYLE),
    [isDarkMode]
  );

  const mapOptions = useMemo(
    () => ({
      styles: activeStyles,
      disableDefaultUI: true,
      zoomControl: false,
      gestureHandling: 'greedy',
      minZoom: 10,
      maxZoom: 18,
    }),
    [activeStyles]
  );

  // Dynamically update Google Map styles whenever theme changes
  useEffect(() => {
    if (mapRef.current && window.google && window.google.maps) {
      mapRef.current.setOptions({
        styles: activeStyles,
      });
    }
  }, [activeStyles]);

  const onMapLoad = useCallback((mapInstance) => {
    mapRef.current = mapInstance;
    mapInstance.setOptions({
      styles: isDarkMode ? DARK_CIVIC_MAP_STYLE : LIGHT_CIVIC_MAP_STYLE,
    });
    if (window.google && window.google.maps) {
      const bounds = new window.google.maps.LatLngBounds(
        new window.google.maps.LatLng(COMBINED_CALOOCAN_BOUNDS.southWest.lat, COMBINED_CALOOCAN_BOUNDS.southWest.lng),
        new window.google.maps.LatLng(COMBINED_CALOOCAN_BOUNDS.northEast.lat, COMBINED_CALOOCAN_BOUNDS.northEast.lng)
      );
      mapInstance.fitBounds(bounds, { top: 30, right: 30, bottom: 30, left: 30 });
    }
  }, [isDarkMode]);

  const onMapUnmount = useCallback(() => {
    mapRef.current = null;
  }, []);

  // Sync map center/bounds when district filter changes
  useEffect(() => {
    if (!mapRef.current || !window.google || !window.google.maps) return;
    if (districtFilter === 'North Caloocan') {
      mapRef.current.panTo(NORTH_CALOOCAN_CENTROID);
      mapRef.current.setZoom(12);
    } else if (districtFilter === 'South Caloocan') {
      mapRef.current.panTo(SOUTH_CALOOCAN_CENTROID);
      mapRef.current.setZoom(13);
    } else {
      const bounds = new window.google.maps.LatLngBounds(
        new window.google.maps.LatLng(COMBINED_CALOOCAN_BOUNDS.southWest.lat, COMBINED_CALOOCAN_BOUNDS.southWest.lng),
        new window.google.maps.LatLng(COMBINED_CALOOCAN_BOUNDS.northEast.lat, COMBINED_CALOOCAN_BOUNDS.northEast.lng)
      );
      mapRef.current.fitBounds(bounds, { top: 30, right: 30, bottom: 30, left: 30 });
    }
  }, [districtFilter]);

  const handleSelectIncident = (incident) => {
    setSelectedIncident(incident);
    if (mapRef.current && incident?.lat && incident?.lng) {
      mapRef.current.panTo({ lat: incident.lat, lng: incident.lng });
      if (mapRef.current.getZoom() < 13) {
        mapRef.current.setZoom(14);
      }
    }
  };

  const handleZoomIn = () => {
    if (mapRef.current) {
      mapRef.current.setZoom((mapRef.current.getZoom() || 11) + 1);
    }
  };

  const handleZoomOut = () => {
    if (mapRef.current) {
      mapRef.current.setZoom((mapRef.current.getZoom() || 11) - 1);
    }
  };

  useEffect(() => {
    function handleClickOutside(event) {
      if (districtDropdownRef.current && !districtDropdownRef.current.contains(event.target)) {
        setIsDistrictOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedDistrict = DISTRICT_OPTIONS.find((opt) => opt.id === districtFilter) || DISTRICT_OPTIONS[0];
  const SelectedDistrictIcon = selectedDistrict.icon;

  const filteredIncidents = CALOOCAN_INCIDENTS.filter((item) => {
    const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
    const matchesDistrict = districtFilter === 'all' || item.district === districtFilter;
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.barangay.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesDistrict && matchesSearch;
  });

  return (
    <section
      id="map-preview"
      aria-label="Civic Utility Map Preview"
      className="py-10 sm:py-16 bg-white dark:bg-[#070a12] border-b border-slate-200 dark:border-slate-800 transition-colors"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6 sm:mb-8">
          <div className="max-w-2xl text-left">
            <div className="inline-flex items-center gap-1.5 text-xs font-mono-data font-bold uppercase tracking-wider text-[#ff6b00] mb-2">
              <MapPin size={14} />
              <span>Caloocan Municipal GIS Live Feed</span>
            </div>
            <h2 className="font-heading font-extrabold text-2xl sm:text-3xl md:text-4xl text-slate-900 dark:text-white">
              Live utility repairs across Caloocan
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1.5">
              Verified public map showing active municipal roadworks, water main repairs, and streetlight fixes underway across North and South Caloocan.
            </p>
          </div>

          <a
            href="/register"
            className="inline-flex items-center gap-2 self-start md:self-auto px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 text-xs font-bold transition-colors shadow-2xs cursor-pointer whitespace-nowrap"
          >
            <span>Open Resident Map View</span>
            <ExternalLink size={14} />
          </a>
        </div>

        {/* Filter Controls Bar - Fully Responsive Wrap */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 mb-6">
          
          {/* Category Filters */}
          <div className="flex flex-wrap items-center gap-1.5" role="tablist" aria-label="Hazard categories">
            {[
              { id: 'all', label: 'All Repairs' },
              { id: 'water', label: 'Water Leaks' },
              { id: 'power', label: 'Streetlights & Power' },
              { id: 'road', label: 'Roads & Drainage' },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold transition-colors cursor-pointer ${
                  activeCategory === cat.id
                    ? 'bg-[#ff6b00] text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* District & Search Controls - Mobile width adaptive */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full lg:w-auto">
            {/* Custom Designed Civic District Filter Dropdown */}
            <div className="relative w-full sm:w-auto" ref={districtDropdownRef}>
              <button
                type="button"
                onClick={() => setIsDistrictOpen(!isDistrictOpen)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setIsDistrictOpen(false);
                }}
                className={`w-full sm:w-auto flex items-center justify-between gap-2.5 px-3 py-1.5 rounded-xl border transition-all text-xs font-semibold shadow-2xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b00] ${
                  isDistrictOpen
                    ? 'bg-white dark:bg-slate-800 border-[#ff6b00] ring-2 ring-orange-500/20 text-slate-900 dark:text-white'
                    : 'bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700/80 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
                }`}
                aria-haspopup="listbox"
                aria-expanded={isDistrictOpen}
                aria-label="Filter by Caloocan District"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-5 h-5 rounded-md bg-orange-500/10 text-[#ff6b00] flex items-center justify-center shrink-0">
                    <SelectedDistrictIcon size={12} />
                  </div>
                  <span className="truncate">{selectedDistrict.label}</span>
                </div>
                <ChevronDown
                  size={14}
                  className={`text-slate-400 transition-transform duration-200 shrink-0 ${
                    isDistrictOpen ? 'rotate-180 text-[#ff6b00]' : ''
                  }`}
                />
              </button>

              {/* Floating Custom Dropdown Menu */}
              {isDistrictOpen && (
                <div
                  role="listbox"
                  aria-label="Caloocan District Options"
                  className="absolute left-0 sm:left-auto sm:right-0 top-full mt-1.5 w-full sm:w-72 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 p-1.5 animate-in fade-in zoom-in-95 duration-150"
                >
                  <div className="px-2.5 py-1 text-[10px] font-mono-data font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800/80 mb-1 flex items-center justify-between">
                    <span>District Sector</span>
                    <span className="text-[#ff6b00]">188 Barangays</span>
                  </div>
                  <div className="space-y-0.5">
                    {DISTRICT_OPTIONS.map((opt) => {
                      const isSelected = districtFilter === opt.id;
                      const OptIcon = opt.icon;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          role="option"
                          aria-selected={isSelected}
                          onClick={() => {
                            setDistrictFilter(opt.id);
                            setIsDistrictOpen(false);
                          }}
                          className={`w-full flex items-center justify-between gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors cursor-pointer group ${
                            isSelected
                              ? 'bg-orange-50 dark:bg-orange-950/50 text-[#ff6b00]'
                              : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          <div className="flex items-start gap-2.5 min-w-0">
                            <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                              isSelected 
                                ? 'bg-[#ff6b00] text-white shadow-2xs' 
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:text-[#ff6b00]'
                            }`}>
                              <OptIcon size={13} />
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="text-xs font-bold leading-tight truncate">
                                {opt.label}
                              </span>
                              <span className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight truncate mt-0.5">
                                {opt.description}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className={`text-[9.5px] font-mono-data px-1.5 py-0.5 rounded font-semibold ${
                              isSelected
                                ? 'bg-orange-100 dark:bg-orange-900/60 text-[#ff6b00]'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                            }`}>
                              {opt.badge}
                            </span>
                            {isSelected && <Check size={14} className="text-[#ff6b00]" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-auto min-w-0 sm:min-w-[200px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search street or barangay..."
                className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#ff6b00]"
              />
            </div>
          </div>

        </div>

        {/* Map Preview Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 p-3 sm:p-5">
          
          {/* Left Canvas: Real Google Maps Caloocan System View with Light/Dark Parity */}
          <div className="lg:col-span-7 relative min-h-[380px] sm:min-h-[460px] h-[380px] sm:h-[460px] lg:h-auto rounded-xl overflow-hidden bg-slate-100 dark:bg-[#0a0f1d] border border-slate-200 dark:border-slate-800 shadow-inner select-none transition-colors">
            
            {isLoaded ? (
              <GoogleMap
                mapContainerStyle={{ width: '100%', height: '100%' }}
                center={CALOOCAN_CENTER}
                zoom={11}
                onLoad={onMapLoad}
                onUnmount={onMapUnmount}
                options={mapOptions}
              >
                {/* North Caloocan Boundary Polygon */}
                <PolygonF
                  paths={NORTH_CALOOCAN_PATH}
                  options={{
                    fillColor: '#ff6b00',
                    fillOpacity: isDarkMode ? 0.08 : 0.05,
                    strokeColor: '#ff6b00',
                    strokeOpacity: 0.85,
                    strokeWeight: 2,
                    clickable: false,
                  }}
                />

                {/* South Caloocan Boundary Polygon */}
                <PolygonF
                  paths={SOUTH_CALOOCAN_PATH}
                  options={{
                    fillColor: '#ff6b00',
                    fillOpacity: isDarkMode ? 0.08 : 0.05,
                    strokeColor: '#ff6b00',
                    strokeOpacity: 0.85,
                    strokeWeight: 2,
                    clickable: false,
                  }}
                />

                {/* Real Caloocan System Markers */}
                {filteredIncidents.map((rep) => {
                  const isSelected = selectedIncident?.id === rep.id;
                  return (
                    <MarkerF
                      key={rep.id}
                      position={{ lat: rep.lat, lng: rep.lng }}
                      zIndex={isSelected ? 500 : 150}
                      title={`${rep.id}: ${rep.title}`}
                      onClick={() => handleSelectIncident(rep)}
                      icon={
                        window.google && window.google.maps
                          ? {
                              url: getMarkerSVG(rep.category, rep.status, isSelected),
                              scaledSize: new window.google.maps.Size(isSelected ? 42 : 32, isSelected ? 50 : 38),
                              anchor: new window.google.maps.Point(isSelected ? 21 : 16, isSelected ? 50 : 38),
                            }
                          : undefined
                      }
                    />
                  );
                })}
              </GoogleMap>
            ) : (
              /* Loading / Fallback Cartographic Container */
              <div className="w-full h-full flex flex-col items-center justify-center relative bg-slate-100 dark:bg-[#0a0f1d] p-6 text-center">
                <div
                  className="absolute inset-0 opacity-40 dark:opacity-20 text-slate-300 dark:text-[#38bdf8]"
                  style={{
                    backgroundImage: `
                      linear-gradient(to right, currentColor 1px, transparent 1px),
                      linear-gradient(to bottom, currentColor 1px, transparent 1px)
                    `,
                    backgroundSize: '40px 40px'
                  }}
                />
                <div className="relative z-10 flex flex-col items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center text-[#ff6b00]">
                    <Loader2 size={22} className="animate-spin" />
                  </div>
                  <div>
                    <span className="text-xs font-bold font-heading text-slate-800 dark:text-slate-200 block">
                      Initializing Caloocan GIS Engine...
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Loading civic boundary layers and live utility pins
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Map Zoom Controls */}
            <div className="absolute top-3 right-3 z-10 pointer-events-auto flex items-center gap-1 bg-white/95 dark:bg-slate-950/85 backdrop-blur-md rounded-lg p-1 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white shadow-xs">
              <button
                type="button"
                onClick={handleZoomIn}
                className="p-1 hover:bg-slate-100 dark:hover:bg-white/10 rounded cursor-pointer transition-colors"
                title="Zoom In"
                aria-label="Zoom In"
              >
                <ZoomIn size={14} />
              </button>
              <button
                type="button"
                onClick={handleZoomOut}
                className="p-1 hover:bg-slate-100 dark:hover:bg-white/10 rounded cursor-pointer transition-colors"
                title="Zoom Out"
                aria-label="Zoom Out"
              >
                <ZoomOut size={14} />
              </button>
            </div>

            {/* Selected Pin Bottom Info Bar */}
            {selectedIncident && (
              <div className="absolute bottom-3 left-3 right-3 z-10 pointer-events-auto bg-white/95 dark:bg-slate-950/90 backdrop-blur-md border border-slate-200/90 dark:border-white/15 rounded-xl p-2.5 sm:p-3.5 text-slate-900 dark:text-white flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-left shadow-lg transition-colors">
                <div className="truncate">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] sm:text-[10px] font-mono-data font-bold text-[#ff6b00] uppercase">
                      {selectedIncident.district}
                    </span>
                    <span className="text-slate-400 dark:text-slate-500 text-[9px]">•</span>
                    <span className="text-[9px] sm:text-[10px] font-mono-data text-slate-500 dark:text-slate-300">
                      {selectedIncident.coordinates}
                    </span>
                  </div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate mt-0.5">
                    {selectedIncident.title}
                  </h4>
                  <span className="text-[10px] sm:text-[11px] text-slate-600 dark:text-slate-300 truncate block">
                    {selectedIncident.barangay}
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
                  <span className={`text-[9px] sm:text-[10px] font-mono-data font-bold px-2 py-0.5 rounded-md border ${selectedIncident.statusBadge}`}>
                    {selectedIncident.status}
                  </span>
                </div>
              </div>
            )}

          </div>

          {/* Right Column: Live Incident Feed & Crew Details */}
          <div className="lg:col-span-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-200 dark:border-slate-800 text-left">
                <div>
                  <h3 className="font-heading font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                    Public Works Activity Feed
                  </h3>
                  <span className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400">
                    Showing {filteredIncidents.length} verified reports
                  </span>
                </div>
                <span className="text-[9px] sm:text-[10px] font-mono-data font-bold uppercase px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                  Live Dispatch
                </span>
              </div>

              {/* Feed List */}
              <div className="space-y-2 overflow-y-auto max-h-[300px] sm:max-h-[350px] pr-1">
                {filteredIncidents.map((rep) => {
                  const Icon = rep.icon;
                  const isSelected = selectedIncident?.id === rep.id;

                  return (
                    <button
                      key={rep.id}
                      type="button"
                      onClick={() => handleSelectIncident(rep)}
                      className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-white dark:bg-slate-800/90 border-[#ff6b00] shadow-sm ring-1 ring-[#ff6b00]/30'
                          : 'bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-7 h-7 rounded-lg bg-orange-500/10 text-[#ff6b00] flex items-center justify-center shrink-0">
                            <Icon size={13} />
                          </div>
                          <div className="truncate">
                            <span className="text-[9px] sm:text-[10px] font-mono-data font-bold text-slate-400 block">
                              {rep.id}
                            </span>
                            <h4 className="font-heading font-bold text-xs text-slate-900 dark:text-white leading-tight truncate">
                              {rep.title}
                            </h4>
                          </div>
                        </div>

                        <span className={`text-[8px] sm:text-[9px] font-mono-data font-bold px-1.5 py-0.5 rounded shrink-0 border ${rep.statusBadge}`}>
                          {rep.status}
                        </span>
                      </div>

                      <div className="text-[10px] sm:text-[11px] text-slate-600 dark:text-slate-400 pl-9 truncate">
                        {rep.barangay}
                      </div>

                      <div className="flex items-center justify-between text-[9px] sm:text-[10px] font-mono-data text-slate-400 mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-800/80 pl-9">
                        <span className="flex items-center gap-1 truncate max-w-[140px] sm:max-w-[160px]">
                          <HardHat size={11} className="text-[#ff6b00] shrink-0" />
                          <span className="truncate">{rep.crew}</span>
                        </span>
                        <span className="flex items-center gap-1 shrink-0 ml-1">
                          <Clock size={11} /> {rep.time}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bottom Direct Action Button */}
            <div className="mt-3 pt-2.5 border-t border-slate-200 dark:border-slate-800">
              <a
                href="/register"
                className="w-full flex items-center justify-center gap-2 py-2.5 sm:py-3 px-4 rounded-xl bg-[#ff6b00] hover:bg-[#e65c00] text-white text-xs font-bold font-heading tracking-wide transition-colors shadow-sm"
              >
                <span>Report an Issue in Your Barangay</span>
              </a>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
}
