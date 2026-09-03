import React, { useState, useRef, useEffect } from 'react';
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
  Compass
} from 'lucide-react';

const DISTRICT_OPTIONS = [
  {
    id: 'all',
    label: 'All 188 Barangays',
    shortLabel: 'All 188 Barangays',
    badge: '188 Brgys',
    icon: Layers,
    description: 'Citywide Caloocan (North & South)'
  },
  {
    id: 'North Caloocan',
    label: 'North District',
    shortLabel: 'North District',
    badge: 'Brgy 165–188',
    icon: Compass,
    description: 'Camarin, Bagong Silang, Tala, Deparo'
  },
  {
    id: 'South Caloocan',
    label: 'South District',
    shortLabel: 'South District',
    badge: 'Brgy 1–164',
    icon: MapPin,
    description: 'Monumento, Grace Park, Sangandaan'
  }
];

const CALOOCAN_INCIDENTS = [
  {
    id: 'REP-2026-0482',
    category: 'water',
    title: 'Main Pipeline Pressure Leak',
    barangay: 'Brgy. 174, Camarin Road cor. Zabarte',
    district: 'North Caloocan',
    status: 'In Progress',
    statusBadge: 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border-amber-300 dark:border-amber-800',
    crew: 'Maynilad & City Water Division Team 2',
    time: '45 mins ago',
    coordinates: '14.7523° N, 121.0421° E',
    icon: Droplets,
    top: '32%',
    left: '46%'
  },
  {
    id: 'REP-2026-0479',
    category: 'power',
    title: '4 Streetlights Non-Operational',
    barangay: 'Brgy. 176, Bagong Silang (Phase 4)',
    district: 'North Caloocan',
    status: 'Dispatched',
    statusBadge: 'bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300 border-blue-300 dark:border-blue-800',
    crew: 'City Electrical Maintenance Crew #3',
    time: '1.5 hrs ago',
    coordinates: '14.7645° N, 121.0552° E',
    icon: Zap,
    top: '20%',
    left: '62%'
  },
  {
    id: 'REP-2026-0465',
    category: 'road',
    title: 'Asphalt Pavement Restoration Complete',
    barangay: 'Monumento Circle, South Caloocan',
    district: 'South Caloocan',
    status: 'Resolved',
    statusBadge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
    crew: 'Highway Maintenance Division - South',
    time: 'Resolved today',
    coordinates: '14.6572° N, 120.9841° E',
    icon: RoadIcon,
    top: '78%',
    left: '28%'
  },
  {
    id: 'REP-2026-0458',
    category: 'drainage',
    title: 'Storm Canal Declogging & Cover Repair',
    barangay: 'Brgy. 168, Deparo Road',
    district: 'North Caloocan',
    status: 'In Progress',
    statusBadge: 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border-amber-300 dark:border-amber-800',
    crew: 'Drainage & Flood Control Unit A',
    time: 'In progress',
    coordinates: '14.7350° N, 121.0180° E',
    icon: RoadIcon,
    top: '48%',
    left: '34%'
  },
  {
    id: 'REP-2026-0441',
    category: 'power',
    title: 'Secondary Cable Insulator Replacement',
    barangay: 'Brgy. 182, Pangarap Village',
    district: 'North Caloocan',
    status: 'Resolved',
    statusBadge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
    crew: 'Meralco Caloocan & LGU Crew',
    time: 'Resolved yesterday',
    coordinates: '14.7810° N, 121.0820° E',
    icon: Zap,
    top: '14%',
    left: '74%'
  }
];

export default function MapPreviewSection() {
  const [activeCategory, setActiveCategory] = useState('all');
  const [districtFilter, setDistrictFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIncident, setSelectedIncident] = useState(CALOOCAN_INCIDENTS[0]);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isDistrictOpen, setIsDistrictOpen] = useState(false);
  const districtDropdownRef = useRef(null);

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
          
          {/* Left Canvas: Cartographic Caloocan Map View with Light/Dark Theme Parity */}
          <div className="lg:col-span-7 relative min-h-[320px] sm:min-h-[440px] rounded-xl overflow-hidden bg-slate-100 dark:bg-[#0a0f1d] border border-slate-200 dark:border-transparent flex flex-col justify-between p-3 sm:p-4 shadow-inner select-none transition-colors">
            
            {/* Cartographic Road Grid */}
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

            {/* Caloocan Major Arterial Roads Layout */}
            <svg
              viewBox="0 0 500 400"
              className="absolute inset-0 w-full h-full pointer-events-none"
              fill="none"
              strokeWidth="2"
            >
              {/* North Caloocan Boundary */}
              <polygon
                points="180,40 260,30 380,50 420,90 390,170 300,200 230,170 170,120"
                stroke="#ff6b00"
                strokeWidth="1.5"
                strokeDasharray="4 3"
                fill="rgba(255,107,0,0.06)"
              />
              {/* South Caloocan Boundary */}
              <polygon
                points="110,260 190,240 220,280 180,360 100,340 70,290"
                stroke="#ff6b00"
                strokeWidth="1.5"
                strokeDasharray="4 3"
                fill="rgba(255,107,0,0.06)"
              />
              {/* Major Corridors */}
              <path d="M 50,300 L 220,280 L 320,190 L 400,80" className="stroke-slate-300 dark:stroke-[#334155]" strokeWidth="3" />
              <path d="M 180,120 L 280,100 L 380,50" className="stroke-slate-300 dark:stroke-[#334155]" strokeWidth="2.5" />
              <path d="M 230,170 L 280,130 L 320,190" className="stroke-slate-300 dark:stroke-[#334155]" strokeWidth="2" />
            </svg>

            {/* Top Toolbar overlay on map */}
            <div className="relative z-10 flex items-center justify-between">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/95 dark:bg-slate-950/85 backdrop-blur-md text-slate-900 dark:text-white text-[10px] sm:text-[11px] font-mono-data border border-slate-200 dark:border-white/10 shadow-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Caloocan GIS View</span>
              </div>

              {/* Map Zoom Controls */}
              <div className="flex items-center gap-1 bg-white/95 dark:bg-slate-950/85 backdrop-blur-md rounded-lg p-1 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white shadow-xs">
                <button
                  type="button"
                  onClick={() => setZoomLevel((z) => Math.min(z + 0.15, 1.4))}
                  className="p-1 hover:bg-slate-100 dark:hover:bg-white/10 rounded cursor-pointer transition-colors"
                  title="Zoom In"
                  aria-label="Zoom In"
                >
                  <ZoomIn size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setZoomLevel((z) => Math.max(z - 0.15, 0.85))}
                  className="p-1 hover:bg-slate-100 dark:hover:bg-white/10 rounded cursor-pointer transition-colors"
                  title="Zoom Out"
                  aria-label="Zoom Out"
                >
                  <ZoomOut size={14} />
                </button>
              </div>
            </div>

            {/* Interactive Pins Container */}
            <div
              className="relative z-10 h-56 sm:h-72 w-full my-auto transition-transform duration-300"
              style={{ transform: `scale(${zoomLevel})` }}
            >
              {filteredIncidents.map((rep) => {
                const isSelected = selectedIncident?.id === rep.id;
                const Icon = rep.icon;

                return (
                  <button
                    key={rep.id}
                    type="button"
                    onClick={() => setSelectedIncident(rep)}
                    style={{ top: rep.top, left: rep.left }}
                    className={`absolute -translate-x-1/2 -translate-y-1/2 flex items-center justify-center p-1.5 sm:p-2 rounded-full transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#ff6b00] text-white scale-125 z-30 shadow-xl ring-4 ring-orange-500/40'
                        : 'bg-white dark:bg-slate-900/90 text-[#ff6b00] dark:text-orange-400 hover:bg-[#ff6b00] hover:text-white dark:hover:bg-[#ff6b00] dark:hover:text-white z-20 shadow-md border border-slate-200 dark:border-white/20'
                    }`}
                    title={`${rep.id}: ${rep.title}`}
                  >
                    <Icon size={13} />
                  </button>
                );
              })}
            </div>

            {/* Selected Pin Bottom Info Bar */}
            {selectedIncident && (
              <div className="relative z-10 bg-white/95 dark:bg-slate-950/90 backdrop-blur-md border border-slate-200/90 dark:border-white/15 rounded-xl p-2.5 sm:p-3.5 text-slate-900 dark:text-white flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-left shadow-md transition-colors">
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
                      onClick={() => setSelectedIncident(rep)}
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
