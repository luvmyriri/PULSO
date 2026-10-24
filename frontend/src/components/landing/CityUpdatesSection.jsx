import { Link } from 'react-router-dom';
import React, { useState, useEffect, useRef } from 'react';
import { 
  Megaphone, 
  ChevronLeft, 
  ChevronRight, 
  ArrowRight, 
  X, 
  Calendar, 
  MapPin, 
  ExternalLink,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';

const UPDATES_DATA = [
  {
    id: 'up-1',
    date: 'OCT 10, 2026',
    category: 'ROAD MAINTENANCE',
    categoryColor: 'bg-[#ff6b00] text-white',
    title: 'Road Repair Works on Bagumbong Road',
    image: '/updates/slide-1-hq.jpg',
    location: 'Bagumbong Road, North Caloocan',
    details: 'City Engineering road crews have initiated asphalt patching, pothole sealing, and road foundation leveling along Bagumbong Road. Two lanes remain open with traffic assistance from barangay personnel.',
    status: 'In Progress',
    division: 'Road Maintenance & Asphalt Division'
  },
  {
    id: 'up-2',
    date: 'OCT 08, 2026',
    category: 'DRAINAGE',
    categoryColor: 'bg-[#0284c7] text-white',
    title: 'Drainage Clearing Operations in Camarin',
    image: '/updates/slide-2-hq.jpg',
    location: 'Camarin Corridor, District 1',
    details: 'Preventive silt clearing and declogging of subterranean storm culverts across Camarin to maintain maximum stormwater discharge capacity and prevent flash street flooding during monsoon downpours.',
    status: 'Completed',
    division: 'Flood Mitigation & Drainage Division'
  },
  {
    id: 'up-3',
    date: 'OCT 05, 2026',
    category: 'STREETLIGHTS',
    categoryColor: 'bg-[#f59e0b] text-white',
    title: 'Installation of New LED Streetlights in Barangay 176',
    image: '/updates/slide-3-hq.jpg',
    location: 'Barangay 176 (Bagong Silang), Caloocan',
    details: 'Over 120 smart high-efficiency LED luminaires installed along primary and secondary access streets in Barangay 176, eliminating dark spots and improving neighborhood nighttime pedestrian safety.',
    status: 'Completed',
    division: 'Electrical Engineering & Utilities'
  },
  {
    id: 'up-4',
    date: 'OCT 02, 2026',
    category: 'INFRASTRUCTURE',
    categoryColor: 'bg-[#10b981] text-white',
    title: 'Ongoing Sidewalk Improvement in Tala',
    image: '/updates/slide-4-hq.jpg',
    location: 'Tala District, North Caloocan',
    details: 'Construction of barrier-protected pedestrian walkways and tactile paving along Tala commercial corridors to ensure safe, barrier-free passage for students, seniors, and PWDs.',
    status: 'In Progress',
    division: 'Civil Works & Public Facilities'
  },
  {
    id: 'up-5',
    date: 'SEP 28, 2026',
    category: 'ROAD MAINTENANCE',
    categoryColor: 'bg-[#ff6b00] text-white',
    title: 'Asphalt Resurfacing along Samson Road Thoroughfare',
    image: '/updates/featured-1.jpg',
    location: 'Samson Road, South Caloocan',
    details: 'Phase 2 heavy milling and polymer-modified hot asphalt overlay along Samson Road from Monumento circle to C-4 boundary. Nighttime operations completed with fresh reflective striping.',
    status: 'Completed',
    division: 'Road Maintenance Division'
  },
  {
    id: 'up-6',
    date: 'SEP 24, 2026',
    category: 'DRAINAGE',
    categoryColor: 'bg-[#0284c7] text-white',
    title: 'Tullahan Tributary Silt Excavation & Trash Rack Upgrades',
    image: '/updates/slide-2-hq.jpg',
    location: 'Brgy. 165 - 170, Tullahan Catchment',
    details: 'Heavy dredging equipment cleared 18 metric tons of debris and river sediment at regional pumping station intake channels to guarantee unrestricted discharge into major waterways.',
    status: 'Operational',
    division: 'Flood Control & Drainage Infrastructure'
  },
  {
    id: 'up-7',
    date: 'SEP 20, 2026',
    category: 'STREETLIGHTS',
    categoryColor: 'bg-[#f59e0b] text-white',
    title: 'Solar Hybrid Light Units Deployed in Deparo Corridors',
    image: '/updates/slide-3-hq.jpg',
    location: 'Deparo & Llano, North Caloocan',
    details: 'Deployment of 85 off-grid solar-hybrid lighting posts along unpowered boundary roads, featuring lithium storage cells and automated twilight illumination sensors.',
    status: 'Completed',
    division: 'Electrical Engineering Division'
  },
  {
    id: 'up-8',
    date: 'SEP 15, 2026',
    category: 'INFRASTRUCTURE',
    categoryColor: 'bg-[#10b981] text-white',
    title: 'Emergency Footbridge Reinforcement & Structural Audit',
    image: '/updates/slide-4-hq.jpg',
    location: 'Monumento Civic Zone',
    details: 'Comprehensive structural load testing and non-destructive weld inspections conducted on high-traffic civic pedestrian overpasses, with refreshed non-slip epoxy stair coatings applied.',
    status: 'Completed',
    division: 'Structural Engineering & Building Safety'
  }
];

export default function CityUpdatesSection() {
  const [currentPage, setCurrentPage] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [selectedUpdate, setSelectedUpdate] = useState(null);
  const [viewAllModalOpen, setViewAllModalOpen] = useState(false);

  // 4 cards per page on desktop
  const itemsPerPage = 4;
  const totalPages = Math.ceil(UPDATES_DATA.length / itemsPerPage);

  const handleNext = () => {
    setCurrentPage((prev) => (prev + 1) % totalPages);
  };

  const handlePrev = () => {
    setCurrentPage((prev) => (prev - 1 + totalPages) % totalPages);
  };

  // Automatic slideshow cycle every 6 seconds (pauses on hover)
  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      setCurrentPage((prev) => (prev + 1) % totalPages);
    }, 6000);
    return () => clearInterval(timer);
  }, [isPaused, totalPages]);

  // Lock body scroll and notify components (e.g. ScrollToTop) when updates modal is active
  useEffect(() => {
    if (selectedUpdate || viewAllModalOpen) {
      document.body.style.overflow = 'hidden';
      window.dispatchEvent(new CustomEvent('pulso:updates-modal-active', { detail: { active: true } }));
      document.body.setAttribute('data-updates-modal-active', 'true');
    } else {
      document.body.style.overflow = '';
      window.dispatchEvent(new CustomEvent('pulso:updates-modal-active', { detail: { active: false } }));
      document.body.removeAttribute('data-updates-modal-active');
    }

    return () => {
      document.body.style.overflow = '';
      window.dispatchEvent(new CustomEvent('pulso:updates-modal-active', { detail: { active: false } }));
      document.body.removeAttribute('data-updates-modal-active');
    };
  }, [selectedUpdate, viewAllModalOpen]);

  const startIndex = currentPage * itemsPerPage;
  const visibleCards = UPDATES_DATA.slice(startIndex, startIndex + itemsPerPage);

  return (
    <section
      id="city-updates"
      aria-label="City Updates Slideshow"
      className="pt-2 pb-8 sm:pt-6 sm:pb-12 lg:py-14 bg-white dark:bg-[#070a12] border-b border-slate-200/90 dark:border-slate-800 transition-colors scroll-mt-[56px] sm:scroll-mt-[64px] lg:scroll-mt-[73px]"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="w-full max-w-[1760px] mx-auto px-4 sm:px-8 lg:px-12 xl:px-16">
        
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4 mb-4 sm:mb-8">
          
          {/* Left: Title + Subtitle */}
          <div className="text-left">
            <h2 className="font-heading font-black text-xl sm:text-2xl text-[#0f2347] dark:text-white leading-tight">
              City Updates
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5 font-normal">
              Latest announcements and activities from the City Engineering Department.
            </p>
          </div>

          {/* Right: View All Updates Link */}
          <button
            type="button"
            onClick={() => setViewAllModalOpen(true)}
            className="self-start sm:self-center inline-flex items-center gap-1 text-xs sm:text-sm font-heading font-bold text-[#ff6b00] hover:text-[#e65c00] transition-colors cursor-pointer group whitespace-nowrap"
          >
            <span>View All Updates</span>
            <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </button>

        </div>

        {/* Carousel / Slideshow Canvas */}
        <div className="relative">
          
          {/* Left Floating Arrow Button */}
          <button
            type="button"
            onClick={handlePrev}
            className="hidden md:flex absolute -left-4 lg:-left-5 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-md items-center justify-center text-slate-700 dark:text-slate-200 hover:text-[#ff6b00] hover:border-[#ff6b00]/40 hover:scale-105 active:scale-95 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b00]"
            aria-label="Previous city updates"
          >
            <ChevronLeft size={20} />
          </button>

          {/* Right Floating Arrow Button */}
          <button
            type="button"
            onClick={handleNext}
            className="hidden md:flex absolute -right-4 lg:-right-5 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-md items-center justify-center text-slate-700 dark:text-slate-200 hover:text-[#ff6b00] hover:border-[#ff6b00]/40 hover:scale-105 active:scale-95 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b00]"
            aria-label="Next city updates"
          >
            <ChevronRight size={20} />
          </button>

          {/* 4 Minimalist Update Cards Grid (2 rows on mobile, 4 columns on desktop) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 lg:gap-6">
            {visibleCards.map((card) => (
              <div
                key={card.id}
                onClick={() => setSelectedUpdate(card)}
                className="rounded-xl sm:rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-200 group flex flex-col text-left cursor-pointer"
              >
                {/* Top Image Container */}
                <div className="h-28 sm:h-36 lg:h-44 w-full relative overflow-hidden bg-slate-100 dark:bg-slate-800">
                  <img
                    src={card.image}
                    alt={card.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 select-none"
                    loading="lazy"
                  />

                  {/* Dark Vignette Overlay for Crisp Contrast */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 pointer-events-none" />

                  {/* Top-Left Date Badge: Light in light mode, dark in dark mode */}
                  <div className="absolute top-2 left-2 sm:top-3 sm:left-3 bg-white/95 dark:bg-[#0a192f]/90 text-slate-800 dark:text-white border border-slate-200/90 dark:border-white/10 backdrop-blur-md text-[9px] sm:text-[11px] font-mono-data font-bold px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded sm:rounded-md tracking-wider uppercase shadow-xs">
                    {card.date}
                  </div>

                  {/* Bottom-Left Category Pill */}
                  <div className={`absolute bottom-2 left-2 sm:bottom-3 sm:left-3 text-[8px] sm:text-[10px] font-mono-data font-black uppercase px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded sm:rounded-md shadow-xs tracking-wider ${card.categoryColor}`}>
                    {card.category}
                  </div>
                </div>

                {/* Bottom Body: Title & Arrow */}
                <div className="p-2.5 sm:p-4 lg:p-5 flex items-center justify-between gap-2 sm:gap-3 flex-1 bg-white dark:bg-slate-900">
                  <h3 className="font-heading font-bold text-xs sm:text-[15px] text-slate-900 dark:text-white group-hover:text-[#ff6b00] transition-colors leading-snug line-clamp-2">
                    {card.title}
                  </h3>
                  
                  <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-md sm:rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center justify-center shrink-0 group-hover:bg-orange-50 dark:group-hover:bg-orange-950/40 transition-colors">
                    <ArrowRight size={14} className="text-slate-400 dark:text-slate-500 group-hover:text-[#ff6b00] group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>
              </div>
            ))}
          </div>

        </div>

        {/* Center Pagination Dots */}
        <div className="flex items-center justify-center gap-2 mt-6 sm:mt-8">
          {Array.from({ length: totalPages }).map((_, idx) => {
            const isActive = idx === currentPage;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrentPage(idx)}
                className={`transition-all duration-200 cursor-pointer rounded-full ${
                  isActive
                    ? 'w-5 h-2 bg-[#ff6b00]'
                    : 'w-2 h-2 bg-slate-300 dark:bg-slate-700 hover:bg-slate-400 dark:hover:bg-slate-600'
                }`}
                aria-label={`Go to slide page ${idx + 1}`}
              />
            );
          })}
        </div>

      </div>

      {/* Single Bulletin Detail Modal (Bottom panel on mobile, centered modal on desktop) */}
      {selectedUpdate && (
        <div 
          className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
          onClick={() => setSelectedUpdate(null)}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-xl rounded-t-3xl sm:rounded-3xl bg-white dark:bg-slate-900 border-t sm:border border-slate-200 dark:border-slate-800 shadow-2xl p-5 sm:p-8 text-left max-h-[88vh] sm:max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom duration-300 sm:duration-200 sm:slide-in-from-bottom-0 sm:zoom-in-95"
          >
            {/* Mobile Drag Indicator Handle */}
            <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 mx-auto mb-4 sm:hidden" />
            
            <button
              type="button"
              onClick={() => setSelectedUpdate(null)}
              className="absolute top-4 right-4 sm:top-5 sm:right-5 z-30 p-2 rounded-full bg-white/95 dark:bg-slate-900/90 text-slate-700 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800 shadow-md backdrop-blur-md transition-all cursor-pointer border border-slate-200/80 dark:border-white/10"
              aria-label="Close modal"
            >
              <X size={18} />
            </button>

            {/* Modal Image */}
            <div className="h-48 sm:h-56 w-full rounded-2xl overflow-hidden mb-5 relative">
              <img src={selectedUpdate.image} alt={selectedUpdate.title} className="w-full h-full object-cover" />
              <div className="absolute top-3 left-3 bg-white/95 dark:bg-[#0a192f]/90 text-slate-800 dark:text-white border border-slate-200/90 dark:border-white/10 backdrop-blur-md text-xs font-mono-data font-bold px-3 py-1 rounded-md shadow-sm">
                {selectedUpdate.date}
              </div>
              <div className={`absolute bottom-3 left-3 text-xs font-mono-data font-black px-3 py-1 rounded-md ${selectedUpdate.categoryColor}`}>
                {selectedUpdate.category}
              </div>
            </div>

            <h3 className="font-heading font-black text-xl sm:text-2xl text-slate-900 dark:text-white leading-tight mb-2">
              {selectedUpdate.title}
            </h3>

            <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 font-semibold mb-4">
              <MapPin size={14} className="text-[#ff6b00]" />
              <span>{selectedUpdate.location}</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed mb-6">
              <p>{selectedUpdate.details}</p>
              <div className="mt-4 pt-3 border-t border-slate-200/70 dark:border-slate-700/60 flex items-center justify-between text-xs font-mono-data text-slate-500">
                <span>Division: {selectedUpdate.division}</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">● {selectedUpdate.status}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 sm:gap-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:pb-0">
              <button
                type="button"
                onClick={() => setSelectedUpdate(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-heading font-bold text-xs cursor-pointer shrink-0 transition-colors"
              >
                Close
              </button>
              <Link
                to="/report"
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#ff6b00] hover:bg-[#e65c00] text-white font-heading font-bold text-xs shadow-xs cursor-pointer transition-colors"
              >
                <span>Report an Issue in this Area</span>
                <ArrowRight size={14} />
              </Link>
            </div>

          </div>
        </div>
      )}

      {/* View All Updates Modal (Bottom panel on mobile, centered modal on desktop) */}
      {viewAllModalOpen && (
        <div 
          className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
          onClick={() => setViewAllModalOpen(false)}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-4xl rounded-t-3xl sm:rounded-3xl bg-white dark:bg-slate-900 border-t sm:border border-slate-200 dark:border-slate-800 shadow-2xl p-5 sm:p-8 text-left max-h-[88vh] sm:max-h-[90vh] flex flex-col animate-in slide-in-from-bottom duration-300 sm:duration-200 sm:slide-in-from-bottom-0 sm:zoom-in-95"
          >
            {/* Mobile Drag Indicator Handle */}
            <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 mx-auto mb-4 sm:hidden" />
            
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-orange-500/10 text-[#ff6b00] flex items-center justify-center">
                  <Megaphone size={18} />
                </div>
                <div>
                  <h3 className="font-heading font-black text-lg sm:text-xl text-slate-900 dark:text-white">
                    All City Updates &amp; Public Notices
                  </h3>
                  <p className="text-xs text-slate-500">
                    Archive of City Engineering Department advisories and civil projects
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setViewAllModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
            </div>

            <div className="overflow-y-auto py-4 space-y-3 flex-1 pr-1">
              {UPDATES_DATA.map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    setViewAllModalOpen(false);
                    setSelectedUpdate(item);
                  }}
                  className="p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-[#ff6b00]/60 dark:hover:border-[#ff6b00]/60 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <img src={item.image} alt="" className="w-14 h-14 rounded-xl object-cover shrink-0 hidden xs:block" />
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[9px] font-mono-data font-black px-2 py-0.5 rounded ${item.categoryColor}`}>
                          {item.category}
                        </span>
                        <span className="text-[11px] font-mono-data text-slate-400">
                          {item.date}
                        </span>
                      </div>
                      <h4 className="font-heading font-bold text-sm text-slate-900 dark:text-white group-hover:text-[#ff6b00] transition-colors">
                        {item.title}
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                        <MapPin size={12} className="text-[#ff6b00]" />
                        <span>{item.location}</span>
                      </p>
                    </div>
                  </div>

                  <ArrowRight size={16} className="text-slate-400 group-hover:text-[#ff6b00] group-hover:translate-x-1 transition-all shrink-0 self-end sm:self-center" />
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setViewAllModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-heading font-bold text-xs cursor-pointer hover:bg-slate-200"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

    </section>
  );
}
