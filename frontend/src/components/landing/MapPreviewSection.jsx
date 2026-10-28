import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  GoogleMap,
  MarkerF,
  PolygonF,
} from '@react-google-maps/api';
import { useGoogleMaps } from '../../contexts/GoogleMapsContext';
import CaloocanBoundaryLayer from '../CaloocanBoundaryLayer';
import ReportDensityLayer from '../maps/ReportDensityLayer';
import {
  MapPin,
  Droplets,
  Zap,
  Waves,
  Lightbulb,
  Signpost,
  Trash2,
  Search,
  SlidersHorizontal,
  ListFilter,
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
  Flame,
  X,
  RefreshCw,
  AlertTriangle,
  ShieldCheck,
  Info,
  Activity,
  CheckCircle2,
  Building2
} from 'lucide-react';
import {
  NORTH_CALOOCAN_PATH,
  SOUTH_CALOOCAN_PATH,
  NORTH_CALOOCAN_CENTROID,
  SOUTH_CALOOCAN_CENTROID,
  COMBINED_CALOOCAN_BOUNDS,
} from '../../data/caloocanBoundaries';
import caloocanBorderData from '../../data/caloocan_simplified_boundary.json';
import { useTheme } from '../../contexts/ThemeContext';
import { API_BASE_URL } from '../../utils/apiBase';

const CALOOCAN_CENTER = { lat: 14.7104, lng: 121.0298 };

// Caloocan geographical restriction bounding box allowing both North and South Caloocan to be freely panned and centered
const CALOOCAN_RESTRICTION_BOUNDS = {
  north: 14.840,
  south: 14.580,
  west: 120.910,
  east: 121.150,
};

// Civic Zero-Clutter Map Styles
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
  { featureType: 'administrative.locality', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative.neighborhood', stylers: [{ visibility: 'off' }] },
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
  { featureType: 'administrative.locality', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative.neighborhood', stylers: [{ visibility: 'off' }] },
];

function formatRelativeTime(dateString) {
  if (!dateString) return 'Recent';
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffSecs = Math.floor((now - date) / 1000);
    if (isNaN(diffSecs) || diffSecs < 0) return 'Just now';
    if (diffSecs < 60) return 'Just now';
    const diffMins = Math.floor(diffSecs / 60);
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch (e) {
    return 'Recent';
  }
}

const getPinCategoryKey = (category) => {
  const cat = (category || '').toLowerCase();
  return /traffic|road sign|signage/.test(cat) ? 'traffic'
    : /safety|hazard/.test(cat) ? 'safety'
    : /street light|streetlight|lighting|lamp/.test(cat) ? 'lighting'
    : /electric|wiring|cable|power line/.test(cat) ? 'electrical'
    : /drain|flood|gutter/.test(cat) ? 'drainage'
    : /water|pipe/.test(cat) ? 'water'
    : /waste|garbage/.test(cat) ? 'waste'
    : /building|facilit/.test(cat) ? 'buildings' : 'roads';
};

const PIN_CATEGORY_COLORS = {
  roads: '#EA580C', drainage: '#06B6D4', lighting: '#F59E0B',
  water: '#0EA5E9', safety: '#F43F5E', traffic: '#A855F7',
  buildings: '#6366F1', electrical: '#EAB308', waste: '#10B981',
};

const getMarkerSVG = (category, isSelected = false) => {
  const road = `<path d="M4 19L9 5M20 19L15 5M12 7V9M12 13V15M12 19V21" stroke="white" stroke-width="2.3" stroke-linecap="round" fill="none"/>`;
  const variants = {
    roads: { color: PIN_CATEGORY_COLORS.roads, icon: road },
    drainage: { color: PIN_CATEGORY_COLORS.drainage, icon: `<path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" stroke="white" stroke-width="2" stroke-linecap="round" fill="none"/>` },
    lighting: { color: PIN_CATEGORY_COLORS.lighting, icon: `<path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4.5 12.4c.9.8 1.5 2 1.5 3.1h6c0-1.1.6-2.3 1.5-3.1A7 7 0 0 0 12 2z" stroke="white" stroke-width="2" stroke-linecap="round" fill="none"/>` },
    water: { color: PIN_CATEGORY_COLORS.water, icon: `<path d="M12 22a7.5 7.5 0 0 0 7.5-7.5c0-4.14-7.5-12.5-7.5-12.5S4.5 10.36 4.5 14.5A7.5 7.5 0 0 0 12 22z" fill="white"/>` },
    safety: { color: PIN_CATEGORY_COLORS.safety, icon: `<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>` },
    traffic: { color: PIN_CATEGORY_COLORS.traffic, icon: `<path d="M12 3v3M18.5 6H5.5a1.5 1.5 0 0 0-1.5 1.5v3A1.5 1.5 0 0 0 5.5 12H18.5l3.5-3-3.5-3zM12 12v9" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>` },
    buildings: { color: PIN_CATEGORY_COLORS.buildings, icon: `<path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18ZM6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2ZM18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2ZM10 6h4M10 10h4M10 14h4M10 18h4" stroke="white" stroke-width="2" stroke-linecap="round" fill="none"/>` },
    electrical: { color: PIN_CATEGORY_COLORS.electrical, icon: `<path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="white"/>` },
    waste: { color: PIN_CATEGORY_COLORS.waste, icon: `<path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>` },
  };
  const key = getPinCategoryKey(category);
  const { color, icon } = variants[key];
  const strokeWidth = isSelected ? 3 : 2.5;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 46" width="40" height="46"><path d="M20 44c0 0 16-15.5 16-24a16 16 0 0 0-32 0c0 8.5 16 24 16 24z" fill="${color}" stroke="white" stroke-width="${strokeWidth}"/><g transform="translate(10,8) scale(0.8)">${icon}</g></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

const ISSUE_CATEGORIES = [
  { id: 'all', label: 'All categories' },
  { id: 'road', label: 'Roads & bridges' },
  { id: 'water', label: 'Water & drainage' },
  { id: 'power', label: 'Streetlights & power' },
  { id: 'facilities', label: 'Public facilities' },
  { id: 'safety', label: 'Public safety & hazards' },
  { id: 'traffic', label: 'Traffic & road signs' },
];

const MAP_VIEW_OPTIONS = [
  { id: 'pins', label: 'Report pins' },
  { id: 'heatmap', label: 'Barangay heatmap' },
  { id: 'density', label: 'Density gradient' },
  { id: 'both', label: 'Heatmap + pins' },
];

const MAP_VIEW_LABELS = {
  pins: 'Report pins',
  heatmap: 'Barangay heatmap',
  density: 'Density gradient',
  both: 'Heatmap + pins',
};

const getCategoryIcon = (category) => ({
  roads: RoadLaneIcon,
  drainage: Waves,
  lighting: Lightbulb,
  water: Droplets,
  safety: AlertTriangle,
  traffic: Signpost,
  buildings: Building2,
  electrical: Zap,
  waste: Trash2,
})[getPinCategoryKey(category)];

const RoadLaneIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M4 19L9 5M20 19L15 5M12 7V9M12 13V15M12 19V21" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" />
  </svg>
);

const DISTRICT_OPTIONS = [
  {
    id: 'all',
    label: 'All barangays',
    shortLabel: 'All barangays',
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

export default function MapPreviewSection() {
  const { theme } = useTheme();
  const [activeCategory, setActiveCategory] = useState('all');
  const [districtFilter, setDistrictFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isDistrictOpen, setIsDistrictOpen] = useState(false);
  const [mapViewMode, setMapViewMode] = useState('pins'); // 'heatmap' | 'density' | 'pins' | 'both'
  const [hoveredBarangay, setHoveredBarangay] = useState(null);
  const [selectedBarangay, setSelectedBarangay] = useState(null);

  const [heatmapData, setHeatmapData] = useState({
    total_reports: 0,
    barangay_counts: {},
    barangay_details: {},
    raw_points: [],
    max_count: 0,
    reports: [],
    last_updated: null
  });
  const [loadingReports, setLoadingReports] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [currentZoom, setCurrentZoom] = useState(11);

  const districtDropdownRef = useRef(null);
  const districtDropdownMobileRef = useRef(null);
  const mapViewDropdownRef = useRef(null);
  const [isMapViewOpen, setIsMapViewOpen] = useState(false);
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [draftCategory, setDraftCategory] = useState(activeCategory);
  const [draftViewMode, setDraftViewMode] = useState(mapViewMode);

  const handleOpenFilterSheet = () => {
    setDraftCategory(activeCategory);
    setDraftViewMode(mapViewMode);
    setIsFilterSheetOpen(true);
  };

  const handleApplyFilters = () => {
    setActiveCategory(draftCategory);
    setMapViewMode(draftViewMode);
    setIsFilterSheetOpen(false);
  };

  const handleResetFilters = () => {
    setDraftCategory('all');
    setDraftViewMode('pins');
  };
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

  // Dynamic fetch directly from authoritative database endpoint
  const fetchHeatmapData = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoadingReports(true);
      setIsRefreshing(true);
      const res = await fetch(`${API_BASE_URL}/api/reports/heatmap?_t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        setHeatmapData(data);
        if (data.reports && data.reports.length > 0) {
          setSelectedIncident((prev) => prev ? (data.reports.find(r => r.id === prev.id) || null) : null);
        } else {
          setSelectedIncident(null);
        }
      }
    } catch (err) {
      console.warn('Real-time report heatmap fetch issue:', err);
    } finally {
      if (!isSilent) setLoadingReports(false);
      setIsRefreshing(false);
    }
  }, []);

  // Initial load and periodic dynamic polling (every 20s)
  useEffect(() => {
    fetchHeatmapData();
    const pollInterval = setInterval(() => {
      fetchHeatmapData(true);
    }, 20000);
    return () => clearInterval(pollInterval);
  }, [fetchHeatmapData]);

  // Parse all 188 barangays once from GeoJSON boundary file
  const barangayList = useMemo(() => {
    if (!caloocanBorderData?.features) return [];
    return caloocanBorderData.features.map((feature, i) => {
      const props = feature.properties || {};
      const bnum = props.brgy_num;
      const sector = (props.sector || 'South').toLowerCase();
      const isNorth = sector === 'north';

      const coords = feature.geometry?.coordinates;
      const allPts = [];
      if (feature.geometry?.type === 'MultiPolygon') {
        for (const poly of coords || []) {
          for (const ring of poly || []) {
            for (const c of ring || []) allPts.push({ lng: c[0], lat: c[1] });
          }
        }
      } else {
        for (const ring of coords || []) {
          for (const c of ring || []) allPts.push({ lng: c[0], lat: c[1] });
        }
      }

      const centroid = allPts.length > 0 ? {
        lat: allPts.reduce((sum, p) => sum + p.lat, 0) / allPts.length,
        lng: allPts.reduce((sum, p) => sum + p.lng, 0) / allPts.length,
      } : null;

      const paths = feature.geometry?.type === 'MultiPolygon'
        ? feature.geometry.coordinates.map(poly => poly[0].map(c => ({ lng: c[0], lat: c[1] })))
        : feature.geometry?.coordinates?.[0]
          ? [feature.geometry.coordinates[0].map(c => ({ lng: c[0], lat: c[1] }))]
          : [];

      return {
        id: props.ADM4_PCODE || bnum || `brgy-${i}`,
        bnum: Number(bnum),
        displayName: props.display_name || `Brgy. ${bnum}`,
        sector: isNorth ? 'north' : 'south',
        paths,
        centroid
      };
    });
  }, []);

  // Compute active barangays with reports in real database
  const activeBarangaysWithReports = useMemo(() => {
    return barangayList.filter(b => {
      const count = heatmapData.barangay_counts[String(b.bnum)] || 0;
      return count > 0 && b.centroid;
    });
  }, [barangayList, heatmapData.barangay_counts]);

  // Points for smooth canvas density heatmap
  const densityPoints = useMemo(() => {
    const raw = heatmapData.raw_points || [];
    return raw.map((p) => ({
      location: window.google?.maps?.LatLng
        ? new window.google.maps.LatLng(p.lat, p.lng)
        : { lat: p.lat, lng: p.lng },
      weight: p.weight || 1
    }));
  }, [heatmapData.raw_points]);

  // Dynamic max count from database for graduated scales
  const maxCount = useMemo(() => {
    return Math.max(1, heatmapData.max_count || 1);
  }, [heatmapData.max_count]);

  // Dynamic graduated color calculation based on real database records
  const getBarangayPolygonOptions = useCallback((brgy) => {
    const bKey = String(brgy.bnum);
    const count = heatmapData.barangay_counts[bKey] || 0;
    const isHovered = hoveredBarangay === brgy.bnum;
    const isSelected = selectedBarangay === brgy.bnum;

    if (count === 0) {
      return {
        fillColor: isDarkMode ? '#1e293b' : '#f8fafc',
        fillOpacity: isHovered ? 0.20 : (isDarkMode ? 0.04 : 0.02),
        strokeColor: isHovered ? '#ff6b00' : (isDarkMode ? '#334155' : '#cbd5e1'),
        strokeOpacity: isHovered ? 0.8 : 0.35,
        strokeWeight: isHovered ? 2.0 : 0.8,
        zIndex: isHovered ? 15 : 2,
        clickable: true
      };
    }

    // Dynamic gradient scaling according to real database count relative to maximum
    const ratio = count / maxCount;
    let fillColor = '#f59e0b'; // Low concentration
    let fillOpacity = isDarkMode ? 0.36 : 0.26;
    let strokeColor = '#f59e0b';
    let strokeWeight = 1.4;

    if (ratio >= 0.65 || count >= 8) {
      // Hotspot concentration
      fillColor = '#ea580c';
      fillOpacity = isDarkMode ? 0.72 : 0.58;
      strokeColor = '#dc2626';
      strokeWeight = 2.4;
    } else if (ratio >= 0.30 || count >= 3) {
      // Moderate concentration
      fillColor = '#ff6b00';
      fillOpacity = isDarkMode ? 0.52 : 0.42;
      strokeColor = '#ff6b00';
      strokeWeight = 1.8;
    }

    if (isHovered || isSelected) {
      fillOpacity = Math.min(0.88, fillOpacity + 0.18);
      strokeWeight = 3.0;
      strokeColor = isDarkMode ? '#ffffff' : '#0f172a';
    }

    return {
      fillColor,
      fillOpacity,
      strokeColor,
      strokeOpacity: 0.95,
      strokeWeight,
      zIndex: isSelected ? 30 : (isHovered ? 20 : 10),
      clickable: true
    };
  }, [heatmapData.barangay_counts, hoveredBarangay, selectedBarangay, isDarkMode, maxCount]);

  // Centroid badge SVG icon for active barangays
  const getBadgeIcon = useCallback((bnum, count) => {
    if (typeof window === 'undefined' || !window.google?.maps) return undefined;
    const isSelected = selectedBarangay === bnum;
    const ratio = count / maxCount;
    let bg = '#f59e0b';
    if (ratio >= 0.65 || count >= 8) bg = '#ea580c';
    else if (ratio >= 0.30 || count >= 3) bg = '#ff6b00';

    const stroke = isSelected ? '#ffffff' : (isDarkMode ? '#030712' : '#ffffff');
    const text = `${count}`;
    const width = Math.max(30, text.length * 8 + 18);
    const height = 24;

    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
        <defs>
          <filter id="bshadow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="1.5" stdDeviation="2" flood-color="rgba(0,0,0,0.45)"/>
          </filter>
        </defs>
        <rect x="1.5" y="1.5" width="${width - 3}" height="${height - 3}" rx="10.5" fill="${bg}" stroke="${stroke}" stroke-width="${isSelected ? '2.5' : '1.8'}" filter="url(#bshadow)"/>
        <text x="${width / 2}" y="15.5" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="900" fill="#ffffff" text-anchor="middle">${text}</text>
      </svg>
    `.trim().replace(/\n/g, '').replace(/\s+/g, ' ');

    return {
      url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
      scaledSize: new window.google.maps.Size(width, height),
      anchor: new window.google.maps.Point(width / 2, height / 2)
    };
  }, [selectedBarangay, isDarkMode, maxCount]);

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
      restriction: {
        latLngBounds: CALOOCAN_RESTRICTION_BOUNDS,
        strictBounds: false,
      },
    }),
    [activeStyles]
  );

  useEffect(() => {
    if (mapRef.current && window.google && window.google.maps) {
      mapRef.current.setOptions({ styles: activeStyles });
    }
  }, [activeStyles]);

  const onMapLoad = useCallback((mapInstance) => {
    mapRef.current = mapInstance;
    mapInstance.setOptions({
      styles: isDarkMode ? DARK_CIVIC_MAP_STYLE : LIGHT_CIVIC_MAP_STYLE,
      minZoom: 10,
      maxZoom: 18,
      restriction: {
        latLngBounds: CALOOCAN_RESTRICTION_BOUNDS,
        strictBounds: false,
      },
    });
    if (window.google && window.google.maps) {
      const bounds = new window.google.maps.LatLngBounds(
        new window.google.maps.LatLng(COMBINED_CALOOCAN_BOUNDS.southWest.lat, COMBINED_CALOOCAN_BOUNDS.southWest.lng),
        new window.google.maps.LatLng(COMBINED_CALOOCAN_BOUNDS.northEast.lat, COMBINED_CALOOCAN_BOUNDS.northEast.lng)
      );
      mapInstance.fitBounds(bounds, { top: 60, right: 30, bottom: 60, left: 30 });
      setCurrentZoom(mapInstance.getZoom() || 11);
    }
  }, [isDarkMode]);

  const onMapUnmount = useCallback(() => {
    mapRef.current = null;
  }, []);

  // Enforce boundary clamping: prevent user from panning away from Caloocan City
  const enforceCaloocanBounds = useCallback(() => {
    if (!mapRef.current) return;
    const center = mapRef.current.getCenter();
    if (!center) return;
    const lat = center.lat();
    const lng = center.lng();

    const minLat = 14.590;
    const maxLat = 14.830;
    const minLng = 120.920;
    const maxLng = 121.140;

    let clampedLat = lat;
    let clampedLng = lng;

    if (lat < minLat) clampedLat = minLat;
    if (lat > maxLat) clampedLat = maxLat;
    if (lng < minLng) clampedLng = minLng;
    if (lng > maxLng) clampedLng = maxLng;

    if (clampedLat !== lat || clampedLng !== lng) {
      mapRef.current.panTo({ lat: clampedLat, lng: clampedLng });
    }
  }, []);

  // Recenter map directly on Caloocan
  const handleRecenterCaloocan = useCallback(() => {
    if (!mapRef.current || !window.google || !window.google.maps) return;
    setSelectedIncident(null);
    setSelectedBarangay(null);
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
      mapInstanceFitBounds(bounds);
    }
  }, [districtFilter]);

  const mapInstanceFitBounds = (bounds) => {
    if (!mapRef.current) return;
    mapRef.current.fitBounds(bounds, { top: 60, right: 30, bottom: 60, left: 30 });
  };

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
      mapRef.current.fitBounds(bounds, { top: 60, right: 30, bottom: 60, left: 30 });
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

  const handleSelectBarangay = (bnum) => {
    if (selectedBarangay === bnum) {
      setSelectedBarangay(null);
      return;
    }
    setSelectedBarangay(bnum);
    const brgyObj = barangayList.find(b => b.bnum === bnum);
    if (brgyObj?.centroid && mapRef.current) {
      mapRef.current.panTo(brgyObj.centroid);
      if (mapRef.current.getZoom() < 13) {
        mapRef.current.setZoom(14);
      }
    }
  };

  const handleZoomIn = () => {
    if (mapRef.current) {
      const z = mapRef.current.getZoom() || 11;
      if (z < 18) {
        mapRef.current.setZoom(z + 1);
        setCurrentZoom(z + 1);
      }
    }
  };

  const handleZoomOut = () => {
    if (mapRef.current) {
      const z = mapRef.current.getZoom() || 11;
      if (z > 11) {
        mapRef.current.setZoom(z - 1);
        setCurrentZoom(z - 1);
      }
    }
  };

  useEffect(() => {
    function handleClickOutside(event) {
      const isInsideDesktop = districtDropdownRef.current && districtDropdownRef.current.contains(event.target);
      const isInsideMobile = districtDropdownMobileRef.current && districtDropdownMobileRef.current.contains(event.target);
      if (!isInsideDesktop && !isInsideMobile) {
        setIsDistrictOpen(false);
      }
      if (mapViewDropdownRef.current && !mapViewDropdownRef.current.contains(event.target)) {
        setIsMapViewOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isFilterSheetOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setIsFilterSheetOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    const origOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    if (typeof document !== 'undefined') {
      document.body.setAttribute('data-updates-modal-active', 'true');
      window.dispatchEvent(new CustomEvent('pulso:updates-modal-active', { detail: { active: true } }));
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = origOverflow;
      if (typeof document !== 'undefined') {
        document.body.removeAttribute('data-updates-modal-active');
        window.dispatchEvent(new CustomEvent('pulso:updates-modal-active', { detail: { active: false } }));
      }
    };
  }, [isFilterSheetOpen]);

  // Filter the live reports based on category, district, search, and selected barangay
  const filteredReports = useMemo(() => {
    let list = heatmapData.reports || [];

    // Filter by selected barangay from heatmap
    if (selectedBarangay) {
      list = list.filter(r => r.brgy_num === selectedBarangay || (r.barangay && r.barangay.includes(String(selectedBarangay))));
    }

    // Filter by category
    if (activeCategory !== 'all') {
      list = list.filter(r => {
        const cat = (r.category_group || r.category || '').toLowerCase();
        if (activeCategory === 'road') {
          return cat.includes('road') || cat.includes('bridge') || cat.includes('pothole') || cat.includes('asphalt');
        }
        if (activeCategory === 'water') {
          return cat.includes('water') || cat.includes('drain') || cat.includes('leak') || cat.includes('flood') || cat.includes('pipe');
        }
        if (activeCategory === 'power') {
          return cat.includes('power') || cat.includes('light') || cat.includes('electric') || cat.includes('lamp');
        }
        if (activeCategory === 'facilities') {
          return cat.includes('facilit') || cat.includes('building') || cat.includes('park') || cat.includes('hall');
        }
        if (activeCategory === 'safety') {
          return cat.includes('safety') || cat.includes('hazard') || cat.includes('danger') || cat.includes('debris');
        }
        if (activeCategory === 'traffic') {
          return cat.includes('traffic') || cat.includes('sign') || cat.includes('signal');
        }
        return true;
      });
    }

    // Filter by district
    if (districtFilter !== 'all') {
      list = list.filter(r => {
        const d = (r.district || '').toLowerCase();
        return d.includes(districtFilter.toLowerCase().replace(' district', '').replace('district ', ''));
      });
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(r => 
        (r.title && r.title.toLowerCase().includes(q)) ||
        (r.ticket_id && r.ticket_id.toLowerCase().includes(q)) ||
        (r.barangay && r.barangay.toLowerCase().includes(q)) ||
        (r.full_address && r.full_address.toLowerCase().includes(q)) ||
        (r.location_string && r.location_string.toLowerCase().includes(q))
      );
    }

    return list;
  }, [heatmapData.reports, selectedBarangay, activeCategory, districtFilter, searchQuery]);

  const selectedDistrict = DISTRICT_OPTIONS.find((d) => d.id === districtFilter) || DISTRICT_OPTIONS[0];
  const SelectedDistrictIcon = selectedDistrict.icon;

  const selectedBarangayDetail = selectedBarangay ? heatmapData.barangay_details[String(selectedBarangay)] : null;

  return (
    <section
      id="map-preview"
      aria-label="Civic Utility Map Preview"
      className="min-h-[calc(100vh-73px)] pt-5 pb-8 sm:pt-6 sm:pb-12 bg-white dark:bg-[#070a12] border-b border-slate-200 dark:border-slate-800 transition-colors flex flex-col justify-center scroll-mt-[73px]"
    >
      <div className="w-full max-w-[1760px] mx-auto px-4 sm:px-8 lg:px-12 xl:px-16">
        
        {/* Section Header (Community map) */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-3 sm:mb-4">
          <div className="max-w-2xl text-left">
            <h2 className="font-heading font-black text-2xl sm:text-3xl md:text-4xl text-slate-900 dark:text-white tracking-tight">
              Community map
            </h2>
            <p
              id="map-content"
              className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1 scroll-mt-[76px]"
            >
              Explore reports across Caloocan City
            </p>
          </div>
        </div>

        {/* ── MOBILE CONTROLS (Rendered on mobile < lg) ────────────────── */}
        <div className="flex flex-col gap-2.5 sm:gap-3 mb-3.5 sm:mb-4 max-w-xl lg:hidden">
          {/* Row 1: Search reports or places */}
          <div className="relative w-full">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search reports or places"
              className="w-full pl-10 pr-9 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#ff6b00] shadow-2xs transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Row 2: All barangays dropdown */}
          <div className="relative w-full" ref={districtDropdownMobileRef}>
            <button
              type="button"
              onClick={() => setIsDistrictOpen(!isDistrictOpen)}
              className="w-full flex items-center justify-between px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 transition-all text-left cursor-pointer"
            >
              <span className="font-heading font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                {selectedDistrict.label}
              </span>
              <ChevronDown
                size={16}
                className={`text-slate-400 transition-transform duration-200 shrink-0 ml-2 ${
                  isDistrictOpen ? 'rotate-180 text-[#ff6b00]' : ''
                }`}
              />
            </button>

            {isDistrictOpen && (
              <div
                role="listbox"
                className="absolute left-0 top-full mt-1.5 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50 p-1.5 animate-fadeIn"
              >
                {DISTRICT_OPTIONS.map((opt) => {
                  const isSelected = districtFilter === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        setDistrictFilter(opt.id);
                        setIsDistrictOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold text-left transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-orange-50 dark:bg-orange-950/40 text-[#ff6b00]'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex flex-col">
                        <span>{opt.label}</span>
                        <span className="text-[10px] text-slate-400 font-normal">{opt.description}</span>
                      </div>
                      {isSelected && <Check size={14} className="text-[#ff6b00]" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Row 3: Map view & Filters side by side */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* Map view dropdown */}
            <div className="relative flex-1" ref={mapViewDropdownRef}>
              <button
                type="button"
                onClick={() => setIsMapViewOpen(!isMapViewOpen)}
                className="w-full flex items-center justify-between px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="font-heading font-bold text-xs sm:text-sm text-slate-900 dark:text-white whitespace-nowrap">
                    Map view
                  </span>
                  <span className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 truncate">
                    {MAP_VIEW_LABELS[mapViewMode] || 'Report pins'}
                  </span>
                </div>
                <ChevronDown
                  size={16}
                  className={`text-slate-400 transition-transform duration-200 shrink-0 ml-2 ${
                    isMapViewOpen ? 'rotate-180 text-[#ff6b00]' : ''
                  }`}
                />
              </button>

              {isMapViewOpen && (
                <div className="absolute left-0 top-full mt-1.5 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50 p-1.5 animate-fadeIn">
                  {MAP_VIEW_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        setMapViewMode(opt.id);
                        setIsMapViewOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold text-left transition-colors cursor-pointer ${
                        mapViewMode === opt.id
                          ? 'bg-orange-50 dark:bg-orange-950/40 text-[#ff6b00]'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <span>{opt.label}</span>
                      {mapViewMode === opt.id && <Check size={14} className="text-[#ff6b00]" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Filters Button */}
            <button
              type="button"
              onClick={handleOpenFilterSheet}
              className="inline-flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 hover:border-slate-300 dark:hover:border-slate-700 shadow-2xs transition-all cursor-pointer shrink-0"
            >
              <ListFilter size={16} className="text-slate-700 dark:text-slate-300 stroke-[2.2]" />
              <span className="font-heading font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                Filters
              </span>
              {activeCategory !== 'all' && (
                <span className="w-2 h-2 rounded-full bg-[#ff6b00]" />
              )}
            </button>
          </div>
        </div>

        {/* ── DESKTOP CONTROLS (Restored Previous Horizontal Design for Desktop lg+) ── */}
        <div className="hidden lg:flex items-center justify-between gap-3 mb-3.5 sm:mb-4">
          
          {/* Left: View Mode Switcher + Category Filters */}
          <div className="flex flex-wrap items-center gap-2">
            
            {/* View Mode Switcher */}
            <div className="inline-flex items-center p-0.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setMapViewMode('heatmap')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-heading font-bold transition-all cursor-pointer ${
                  mapViewMode === 'heatmap'
                    ? 'bg-[#ff6b00] text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Barangay Polygon Choropleth"
              >
                <Flame size={13} />
                <span>Barangay Heatmap</span>
              </button>

              <button
                type="button"
                onClick={() => setMapViewMode('density')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-heading font-bold transition-all cursor-pointer ${
                  mapViewMode === 'density'
                    ? 'bg-[#ff6b00] text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Smooth Canvas Density Gradient"
              >
                <Activity size={13} />
                <span>Density Gradient</span>
              </button>

              <button
                type="button"
                onClick={() => setMapViewMode('pins')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-heading font-bold transition-all cursor-pointer ${
                  mapViewMode === 'pins'
                    ? 'bg-[#ff6b00] text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Approximate report areas"
              >
                <MapPin size={13} />
                <span>Report Pins</span>
              </button>

              <button
                type="button"
                onClick={() => setMapViewMode('both')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-heading font-bold transition-all cursor-pointer ${
                  mapViewMode === 'both'
                    ? 'bg-[#ff6b00] text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Barangay Polygons + Pins"
              >
                <Layers size={13} />
                <span>Both</span>
              </button>
            </div>

            {/* Category Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5" role="tablist" aria-label="Hazard categories">
              {ISSUE_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    activeCategory === cat.id
                      ? 'bg-[#ff6b00] text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Right: District & Search Controls */}
          <div className="flex items-center gap-2">
            {/* Custom Designed Civic District Filter Dropdown */}
            <div className="relative" ref={districtDropdownRef}>
              <button
                type="button"
                onClick={() => setIsDistrictOpen(!isDistrictOpen)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setIsDistrictOpen(false);
                }}
                className={`flex items-center justify-between gap-2.5 px-3 py-1.5 rounded-xl border transition-all text-xs font-semibold shadow-2xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b00] ${
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

              {isDistrictOpen && (
                <div
                  role="listbox"
                  aria-label="Caloocan District Options"
                  className="absolute right-0 top-full mt-1.5 w-72 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 p-1.5 animate-in fade-in zoom-in-95 duration-150"
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

            {/* Desktop Search Input */}
            <div className="relative min-w-[220px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search ticket, street or barangay..."
                className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#ff6b00]"
              />
            </div>
          </div>

        </div>

        {/* Map Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 p-3 sm:p-5">
          
          {/* Left Canvas: Google Maps Caloocan Heatmap View */}
          <div className="lg:col-span-7 relative min-h-[420px] sm:min-h-[500px] h-[420px] sm:h-[500px] lg:h-auto rounded-xl overflow-hidden bg-slate-100 dark:bg-[#0a0f1d] border border-slate-200 dark:border-slate-800 shadow-inner select-none transition-colors">
            
            {isLoaded ? (
              <GoogleMap
                mapContainerStyle={{ width: '100%', height: '100%' }}
                center={CALOOCAN_CENTER}
                zoom={11}
                onLoad={onMapLoad}
                onUnmount={onMapUnmount}
                onDragEnd={enforceCaloocanBounds}
                onIdle={enforceCaloocanBounds}
                onZoomChanged={() => {
                  if (mapRef.current) {
                    setCurrentZoom(mapRef.current.getZoom() || 11);
                  }
                }}
                options={mapOptions}
              >
                {/* ── 1. Authoritative Caloocan Perimeter Outline ── */}
                <CaloocanBoundaryLayer
                  activeSector="all"
                  isDarkMode={isDarkMode}
                  showBarangays={false}
                  showLabels={false}
                  interactive={false}
                />

                {/* ── 2. All 188 Barangay Heatmap Polygons (When in Heatmap / Both mode) ── */}
                {(mapViewMode === 'heatmap' || mapViewMode === 'both') && barangayList.map((brgy) => {
                  const opts = getBarangayPolygonOptions(brgy);
                  return brgy.paths.map((path, pi) => (
                    <PolygonF
                      key={`hmap-poly-${brgy.id}-${pi}`}
                      paths={path}
                      options={opts}
                      onMouseOver={() => setHoveredBarangay(brgy.bnum)}
                      onMouseOut={() => setHoveredBarangay(null)}
                      onClick={() => handleSelectBarangay(brgy.bnum)}
                    />
                  ));
                })}

                {/* ── 3. Centroid Heatmap Badges on Active Barangays ── */}
                {(mapViewMode === 'heatmap' || mapViewMode === 'both') && activeBarangaysWithReports.map((brgy) => {
                  const count = heatmapData.barangay_counts[String(brgy.bnum)] || 0;
                  const icon = getBadgeIcon(brgy.bnum, count);
                  if (!icon) return null;

                  return (
                    <MarkerF
                      key={`hmap-badge-${brgy.bnum}`}
                      position={brgy.centroid}
                      zIndex={selectedBarangay === brgy.bnum ? 500 : 180}
                      title={`Brgy. ${brgy.bnum}: ${count} ${count === 1 ? 'report' : 'reports'}`}
                      onClick={() => handleSelectBarangay(brgy.bnum)}
                      icon={icon}
                    />
                  );
                })}

                {/* ── 4. Smooth Canvas Density Heatmap Layer (When in Density mode) ── */}
                {mapViewMode === 'density' && densityPoints.length > 0 && (
                  <ReportDensityLayer
                    data={densityPoints}
                    options={{
                      radius: 35,
                      opacity: 0.75,
                      maxIntensity: Math.max(3, maxCount),
                      gradient: [
                        'rgba(0,0,0,0)',
                        'rgba(34,197,94,0.5)',
                        'rgba(234,179,8,0.7)',
                        'rgba(249,115,22,0.9)',
                        'rgba(239,68,68,1)'
                      ]
                    }}
                  />
                )}

                {/* ── 5. Real Individual Report Pins (When in Pins or Both or Density mode) ── */}
                {(mapViewMode === 'pins' || mapViewMode === 'both' || mapViewMode === 'density') && filteredReports.map((rep) => {
                  const isSelected = selectedIncident?.id === rep.id;
                  const width = isSelected ? 30 : 28;
                  const height = isSelected ? 36 : 34;
                  return (
                    <MarkerF
                      key={`pin-${rep.id}`}
                      position={{ lat: rep.lat, lng: rep.lng }}
                      zIndex={isSelected ? 500 : 200}
                      title={`${rep.category} · ${rep.ticket_id}`}
                      onClick={() => handleSelectIncident(rep)}
                      icon={window.google?.maps ? {
                        url: getMarkerSVG(rep.category, isSelected),
                        scaledSize: new window.google.maps.Size(width, height),
                        anchor: new window.google.maps.Point(width / 2, height),
                      } : undefined}
                    />
                  );
                })}
              </GoogleMap>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center relative bg-slate-100 dark:bg-[#0a0f1d] p-6 text-center">
                <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center text-[#ff6b00] mb-3">
                  <Loader2 size={22} className="animate-spin" />
                </div>
                <span className="text-xs font-bold font-heading text-slate-800 dark:text-slate-200 block">
                  Initializing Caloocan Heatmap Engine...
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Querying database records across 188 barangays
                </span>
              </div>
            )}

            {/* Dynamic Heatmap Legend */}
            {mapViewMode !== 'pins' && (
              <div className="absolute top-3 left-3 z-10 pointer-events-auto bg-white/95 dark:bg-slate-950/90 backdrop-blur-md rounded-xl p-2.5 border border-slate-200/90 dark:border-white/10 shadow-md text-left">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Flame size={13} className="text-[#ff6b00]" />
                  <span className="text-[11px] font-heading font-extrabold text-slate-900 dark:text-white">
                    {mapViewMode === 'density' ? 'Density Gradient' : 'Barangay Report Density'}
                  </span>
                </div>
                {mapViewMode === 'density' ? (
                  <div className="flex items-center gap-2 text-[10px] font-mono-data font-semibold">
                    <span className="text-slate-500 dark:text-slate-400">Low</span>
                    <div className="w-24 h-2.5 rounded-full bg-gradient-to-r from-emerald-500 via-amber-400 via-orange-500 to-red-500 shadow-inner"></div>
                    <span className="text-slate-500 dark:text-slate-400">High ({maxCount})</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2.5 text-[10px] font-mono-data font-semibold">
                    <div className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-xs bg-[#f59e0b]" />
                      <span className="text-slate-600 dark:text-slate-300">
                        {maxCount <= 3 ? '1' : `1–${Math.max(1, Math.floor(maxCount * 0.35))}`}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-xs bg-[#ff6b00]" />
                      <span className="text-slate-600 dark:text-slate-300">
                        {maxCount <= 3 ? '2' : `${Math.max(2, Math.floor(maxCount * 0.35) + 1)}–${Math.max(3, Math.floor(maxCount * 0.65))}`}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-xs bg-[#ea580c]" />
                      <span className="text-slate-600 dark:text-slate-300">
                        {maxCount <= 3 ? `${maxCount}+ Hotspot` : `${Math.max(4, Math.floor(maxCount * 0.65) + 1)}+ Hotspot`}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Map Zoom & Recenter Controls */}
            <div className="absolute top-3 right-3 z-10 pointer-events-auto flex items-center gap-1 bg-white/95 dark:bg-slate-950/85 backdrop-blur-md rounded-lg p-1 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white shadow-xs">
              <button
                type="button"
                onClick={handleRecenterCaloocan}
                className="p-1 hover:bg-slate-100 dark:hover:bg-white/10 rounded cursor-pointer transition-colors text-[#ff6b00]"
                title="Recenter on Caloocan City"
                aria-label="Recenter on Caloocan City"
              >
                <Compass size={14} />
              </button>
              <div className="w-[1px] h-3.5 bg-slate-200 dark:bg-slate-700 mx-0.5" />
              <button
                type="button"
                onClick={handleZoomIn}
                disabled={currentZoom >= 18}
                className={`p-1 rounded transition-colors ${
                  currentZoom >= 18
                    ? 'opacity-35 cursor-not-allowed text-slate-400'
                    : 'hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer text-slate-700 dark:text-white'
                }`}
                title="Zoom In"
                aria-label="Zoom In"
              >
                <ZoomIn size={14} />
              </button>
              <button
                type="button"
                onClick={handleZoomOut}
                disabled={currentZoom <= 10}
                className={`p-1 rounded transition-colors ${
                  currentZoom <= 10
                    ? 'opacity-35 cursor-not-allowed text-slate-400'
                    : 'hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer text-slate-700 dark:text-white'
                }`}
                title={currentZoom <= 10 ? 'Minimum zoom reached (Caloocan City bounds)' : 'Zoom Out'}
                aria-label="Zoom Out"
              >
                <ZoomOut size={14} />
              </button>
            </div>

            {/* Selected Barangay Heatmap Card (Floating Overlay) */}
            {selectedBarangay && selectedBarangayDetail && (
              <div className="absolute bottom-3 left-3 right-3 z-20 pointer-events-auto bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border border-[#ff6b00]/60 dark:border-[#ff6b00]/60 rounded-xl p-3 text-slate-900 dark:text-white flex items-center justify-between gap-3 text-left shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-150">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-heading font-black text-[#ff6b00]">
                      {selectedBarangayDetail.display_name}
                    </span>
                    <span className="text-[10px] font-mono-data px-1.5 py-0.5 rounded bg-orange-500/10 text-[#ff6b00] font-bold">
                      {selectedBarangayDetail.total} Real {selectedBarangayDetail.total === 1 ? 'Report' : 'Reports'}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono-data">
                      {selectedBarangayDetail.sector} Caloocan
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-mono-data">
                    <span>Roads: <strong>{selectedBarangayDetail.categories?.road || 0}</strong></span>
                    <span>•</span>
                    <span>Water: <strong>{selectedBarangayDetail.categories?.water || 0}</strong></span>
                    <span>•</span>
                    <span>Lighting: <strong>{selectedBarangayDetail.categories?.power || 0}</strong></span>
                    <span>•</span>
                    <span>Facilities: <strong>{selectedBarangayDetail.categories?.facilities || 0}</strong></span>
                    <span>•</span>
                    <span>Safety: <strong>{selectedBarangayDetail.categories?.safety || 0}</strong></span>
                    <span>•</span>
                    <span>Traffic: <strong>{selectedBarangayDetail.categories?.traffic || 0}</strong></span>
                    {Number(selectedBarangayDetail.categories?.others || 0) > 0 && (
                      <>
                        <span>•</span>
                        <span>Others: <strong>{selectedBarangayDetail.categories?.others || 0}</strong></span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setSelectedBarangay(null)}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 text-[10px] font-bold cursor-pointer transition-colors flex items-center gap-1"
                  >
                    <X size={12} />
                    <span>Clear Filter</span>
                  </button>
                </div>
              </div>
            )}

            {/* Selected Pin Bottom Info Bar (When pin is active and no barangay overlay) */}
            {!selectedBarangay && selectedIncident && (
              <div className="absolute bottom-3 left-3 right-3 sm:right-auto sm:w-[420px] max-w-[calc(100%-1.5rem)] z-10 pointer-events-auto bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 sm:p-3 text-slate-900 dark:text-white text-left shadow-md transition-colors">
                <button type="button" onClick={() => setSelectedIncident(null)} aria-label="Close report preview" className="absolute top-1 right-1 w-11 h-11 flex items-center justify-center rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 focus-visible:outline focus-visible:outline-3 focus-visible:outline-blue-600"><X size={16} aria-hidden="true" /></button>
                <div className="flex-1 min-w-0 pr-10">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[9px] sm:text-[10px] font-mono-data font-bold text-[#ff6b00] uppercase">
                      {selectedIncident.district}
                    </span>
                    <span className="text-slate-400 dark:text-slate-500 text-[9px]">•</span>
                    <span className="text-[9px] sm:text-[10px] font-mono-data text-slate-500 dark:text-slate-300">
                      {selectedIncident.ticket_id}
                    </span>
                    <span className="text-slate-400 dark:text-slate-500 text-[9px]">•</span>
                    <span className="text-[9px] sm:text-[10px] font-mono-data text-slate-400">
                      {formatRelativeTime(selectedIncident.created_at)}
                    </span>
                  </div>
                  <h4 className="font-heading font-bold text-xs sm:text-sm text-slate-900 dark:text-white break-words leading-snug mt-1">
                    {selectedIncident.full_address || selectedIncident.location_string || `${selectedIncident.barangay}, Caloocan City`}
                  </h4>
                  <div className="text-[10px] sm:text-[11px] text-slate-600 dark:text-slate-400 mt-1 flex flex-wrap items-center gap-1.5 font-mono-data">
                    <MapPin size={11} className="text-[#ff6b00] shrink-0" />
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {selectedIncident.public_details_approved ? 'Reported pin' : 'Approximate area'}: {Number(selectedIncident.lat).toFixed(selectedIncident.public_details_approved ? 6 : 3)}, {Number(selectedIncident.lng).toFixed(selectedIncident.public_details_approved ? 6 : 3)}
                    </span>
                    <span className="opacity-40">•</span>
                    <span>{selectedIncident.barangay}</span>
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* Right Canvas: Live Database Reports Activity Docket */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
            
            {/* Docket Header */}
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <h3 className="font-heading font-extrabold text-sm text-slate-900 dark:text-white uppercase tracking-wider">
                  Public Works Activity Feed
                </h3>

                <span className="text-[10px] font-mono-data px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold border border-slate-200 dark:border-slate-700">
                  {filteredReports.length} {filteredReports.length === 1 ? 'Report' : 'Reports'}
                </span>
              </div>

              {/* Feed List */}
              <div className="space-y-2 overflow-y-auto max-h-[300px] sm:max-h-[360px] pr-1 mt-3">
                {loadingReports ? (
                  <div className="py-12 flex flex-col items-center justify-center text-center text-slate-400 space-y-2">
                    <Loader2 size={20} className="animate-spin text-[#ff6b00]" />
                    <span className="text-xs">Querying database reports...</span>
                  </div>
                ) : filteredReports.length === 0 ? (
                  <div className="py-12 flex flex-col items-center justify-center text-center text-slate-400 space-y-1">
                    <Info size={24} className="text-slate-300 dark:text-slate-600 mb-1" />
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300">No reports found</span>
                    <span className="text-[11px]">No active database records match this filter</span>
                    {selectedBarangay && (
                      <button
                        type="button"
                        onClick={() => setSelectedBarangay(null)}
                        className="mt-2 text-xs text-[#ff6b00] font-bold hover:underline cursor-pointer"
                      >
                        Clear Barangay Filter
                      </button>
                    )}
                  </div>
                ) : (
                  filteredReports.map((rep) => {
                    const isSelected = selectedIncident?.id === rep.id;
                    const Icon = getCategoryIcon(rep.category);
                    const iconColor = PIN_CATEGORY_COLORS[getPinCategoryKey(rep.category)];

                    return (
                      <button
                        key={`feed-${rep.id}`}
                        type="button"
                        onClick={() => handleSelectIncident(rep)}
                        className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-white dark:bg-slate-800/90 border-[#ff6b00] shadow-sm ring-1 ring-[#ff6b00]/30'
                            : 'bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div className="flex items-start gap-2.5 min-w-0 flex-1">
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ color: iconColor, backgroundColor: `${iconColor}14` }}>
                              <Icon size={13} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="text-[9px] sm:text-[10px] font-mono-data font-bold text-slate-400 block mb-0.5">
                                {rep.ticket_id}
                              </span>
                              <h4 className="font-heading font-bold text-xs text-slate-900 dark:text-white leading-snug break-words">
                                {rep.full_address || rep.location_string || `${rep.barangay}, Caloocan City`}
                              </h4>
                            </div>
                          </div>
                        </div>

                        <div className="text-[10px] sm:text-[11px] text-slate-600 dark:text-slate-400 pl-9.5 flex flex-wrap items-center gap-1.5 font-mono-data mt-1">
                          <MapPin size={11} className="text-[#ff6b00] shrink-0" />
                          <span className="font-bold text-slate-700 dark:text-slate-300">
                            {Number(rep.lat).toFixed(6)}, {Number(rep.lng).toFixed(6)}
                          </span>
                          <span className="opacity-40">•</span>
                          <span className="font-sans font-medium text-slate-600 dark:text-slate-400">{rep.barangay}</span>
                          <span className="opacity-40">•</span>
                          <span className="text-slate-400">{rep.district}</span>
                        </div>

                        <div className="flex items-center justify-between text-[9px] sm:text-[10px] font-mono-data text-slate-400 mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-800/80 pl-9">
                          <span className="flex items-center gap-1 truncate max-w-[150px]">
                            <HardHat size={11} className="text-[#ff6b00] shrink-0" />
                            <span className="truncate">City Engineering Office</span>
                          </span>
                          <span className="flex items-center gap-1 shrink-0 ml-1">
                            <Clock size={11} /> {formatRelativeTime(rep.created_at)}
                          </span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Quick Action Footer */}
            <div className="p-3.5 rounded-xl bg-orange-50 dark:bg-orange-950/30 border border-orange-200/80 dark:border-orange-900/40 flex items-center justify-between gap-3 text-left">
              <div>
                <span className="text-xs font-bold font-heading text-slate-900 dark:text-white block">
                  Report a civic or public works issue
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">
                  Takes less than 60 seconds with photo evidence and automatic barangay geo-routing.
                </span>
              </div>
              <a
                href="/register"
                className="px-3.5 py-2 rounded-lg bg-[#ff6b00] hover:bg-[#ea580c] text-white text-xs font-bold transition-colors shrink-0 shadow-xs cursor-pointer"
              >
                Report Now
              </a>
            </div>

          </div>

        </div>

      </div>

      {/* ── FILTER REPORTS BOTTOM SHEET (Matching User Reference Image 3) ── */}
      {isFilterSheetOpen && (
        <div
          className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn"
          role="dialog"
          aria-modal="true"
          aria-labelledby="filter-reports-title"
          onClick={() => setIsFilterSheetOpen(false)}
        >
          <div
            className="w-full sm:max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[85vh] animate-slideUp sm:animate-scaleIn"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Mobile Drag Handle */}
            <div className="w-12 h-1 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto my-3 shrink-0" />

            {/* Header: Title + Reset */}
            <div className="px-5 pb-3 flex items-center justify-between shrink-0">
              <h2 id="filter-reports-title" className="font-heading font-black text-xl text-slate-900 dark:text-white">
                Filter reports
              </h2>
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-[#ff6b00] hover:text-[#e65c00] font-heading font-bold text-xs sm:text-sm transition-colors cursor-pointer"
              >
                Reset
              </button>
            </div>

            {/* Content: Scrollable body */}
            <div className="px-5 py-2 overflow-y-auto space-y-5">
              {/* Show on map */}
              <div>
                <h3 className="font-heading font-bold text-xs sm:text-sm text-slate-900 dark:text-white mb-2.5">
                  Show on map
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {MAP_VIEW_OPTIONS.map((opt) => {
                    const isSelected = draftViewMode === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setDraftViewMode(opt.id)}
                        className={`p-3 rounded-xl border text-xs sm:text-sm font-semibold text-center transition-all cursor-pointer ${
                          isSelected
                            ? 'border-[#ff6b00] bg-orange-50/70 dark:bg-orange-950/30 text-[#ff6b00]'
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Report category */}
              <div>
                <h3 className="font-heading font-bold text-xs sm:text-sm text-slate-900 dark:text-white mb-2.5">
                  Report category
                </h3>
                <div className="space-y-1">
                  {ISSUE_CATEGORIES.map((cat) => {
                    const isSelected = draftCategory === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        onClick={() => setDraftCategory(cat.id)}
                        className="w-full flex items-center gap-3 py-2 px-1 text-left transition-colors cursor-pointer group"
                      >
                        <div
                          className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                            isSelected
                              ? 'bg-[#ff6b00]'
                              : 'border border-slate-300 dark:border-slate-600 group-hover:border-slate-400'
                          }`}
                        />
                        <span
                          className={`text-xs sm:text-sm ${
                            isSelected
                              ? 'font-bold text-slate-900 dark:text-white'
                              : 'font-normal text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white'
                          }`}
                        >
                          {cat.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Bottom Apply filters button */}
            <div className="p-4 pt-3 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
              <button
                type="button"
                onClick={handleApplyFilters}
                className="w-full py-3 rounded-xl bg-[#ff6b00] hover:bg-[#e65c00] active:scale-[0.98] text-white font-heading font-bold text-sm shadow-md transition-all cursor-pointer"
              >
                Apply filters
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
