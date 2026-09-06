import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Landmark, Building2, GraduationCap, MapPin } from 'lucide-react';

const ATTRACTIONS = [
  {
    id: 'monumento',
    name: 'Andres Bonifacio Monumento',
    district: 'South Caloocan District',
    location: 'Monumento Circle, Brgy. 77 / 80',
    description: 'Historic Katipunan landmark and primary transit hub linking South Caloocan to Metro Manila.',
    image: '/attractions/monumento.jpg',
    icon: Landmark,
    shortLabel: 'Monumento',
    subLabel: 'South'
  },
  {
    id: 'city-hall',
    name: 'Caloocan City Hall Complex',
    district: 'Central Municipal Operations',
    location: '8th Ave & Camarin Rd Hubs',
    description: 'Headquarters of the City Engineering Department coordinating 24/7 public works dispatch.',
    image: '/attractions/city_hall.jpg',
    icon: Building2,
    shortLabel: 'City Hall',
    subLabel: 'Central'
  },
  {
    id: 'ucc',
    name: 'University of Caloocan City (UCC)',
    district: 'North Caloocan District',
    location: 'Camarin & Biglang Awa Campuses',
    description: 'Premier local state university anchoring community infrastructure and academic growth.',
    image: '/attractions/ucc.jpg',
    icon: GraduationCap,
    shortLabel: 'UCC',
    subLabel: 'North'
  }
];

export default function AttractionSlideshow() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    const handler = (e) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    if (isPaused || prefersReducedMotion) return;
    timerRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % ATTRACTIONS.length);
    }, 6000);
    return () => clearInterval(timerRef.current);
  }, [isPaused, prefersReducedMotion]);

  const current = ATTRACTIONS[currentIndex];
  const IconComponent = current.icon;

  return (
    <div
      className="relative w-full rounded-2xl overflow-hidden shadow-sm hover:shadow-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 group select-none transition-colors"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
      role="region"
      aria-roledescription="carousel"
      aria-label="Caloocan Landmarks Slideshow"
    >
      {/* Top District Selector Tabs - Light/Dark Theme Parity */}
      <div className="bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 px-2.5 py-2 flex items-center justify-between text-xs font-mono-data overflow-x-auto">
        <div className="flex items-center gap-1.5 shrink-0">
          {ATTRACTIONS.map((att, idx) => (
            <button
              key={att.id}
              type="button"
              onClick={() => setCurrentIndex(idx)}
              className={`px-2.5 py-1 rounded-lg text-[10px] sm:text-[11px] font-semibold transition-all cursor-pointer whitespace-nowrap ${
                idx === currentIndex
                  ? 'bg-[#ff6b00] text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/80 dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/5'
              }`}
              aria-label={`View ${att.shortLabel} (${att.subLabel})`}
            >
              <span>{att.shortLabel}</span>
              <span className="opacity-80 ml-1">({att.subLabel})</span>
            </button>
          ))}
        </div>

        <span className="hidden sm:inline text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider px-2 shrink-0">
          188 Barangays
        </span>
      </div>

      {/* Clean Landmark Image Viewport (Zero text overlapping the photo) */}
      <div className="relative aspect-[16/10] sm:aspect-[16/9] w-full overflow-hidden bg-slate-100 dark:bg-slate-950">
        <AnimatePresence mode="wait">
          <motion.div
            key={current.id}
            initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0 }}
            transition={{ duration: prefersReducedMotion ? 0.05 : 0.35 }}
            className="absolute inset-0"
          >
            <img
              src={current.image}
              alt={`${current.name}, Caloocan City`}
              className="w-full h-full object-cover object-center"
              loading="eager"
            />
          </motion.div>
        </AnimatePresence>

        {/* Floating Top District Pill - Light/Dark Theme Parity */}
        <div className="absolute top-3 left-3 z-10">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/95 dark:bg-slate-950/80 text-slate-800 dark:text-orange-400 border border-slate-200/90 dark:border-white/10 shadow-sm backdrop-blur-md text-[10px] font-mono-data font-bold uppercase tracking-wider">
            <IconComponent size={12} className="shrink-0 text-[#ff6b00]" />
            <span>{current.district}</span>
          </div>
        </div>

        {/* Arrow Navigation (Side buttons with light/dark theme support) */}
        <div className="absolute inset-y-0 left-2 right-2 flex items-center justify-between pointer-events-none z-10">
          <button
            type="button"
            onClick={() => setCurrentIndex((prev) => (prev - 1 + ATTRACTIONS.length) % ATTRACTIONS.length)}
            className="pointer-events-auto p-2 rounded-full bg-white/90 dark:bg-slate-950/80 text-slate-800 dark:text-white hover:bg-[#ff6b00] hover:text-white dark:hover:bg-[#ff6b00] border border-slate-200/80 dark:border-white/10 backdrop-blur-xs shadow-md transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b00]"
            aria-label="Previous landmark"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            onClick={() => setCurrentIndex((prev) => (prev + 1) % ATTRACTIONS.length)}
            className="pointer-events-auto p-2 rounded-full bg-white/90 dark:bg-slate-950/80 text-slate-800 dark:text-white hover:bg-[#ff6b00] hover:text-white dark:hover:bg-[#ff6b00] border border-slate-200/80 dark:border-white/10 backdrop-blur-xs shadow-md transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b00]"
            aria-label="Next landmark"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Dedicated Information Card (Placed cleanly BELOW the photo to eliminate overlap) */}
      <div className="p-4 sm:p-5 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 text-left transition-colors">
        
        {/* Location Subtitle */}
        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 mb-1">
          <MapPin size={12} className="text-[#ff6b00] shrink-0" />
          <span className="truncate">{current.location}</span>
        </div>

        {/* Landmark Heading */}
        <h3 className="font-heading font-extrabold text-base sm:text-lg text-slate-900 dark:text-white leading-tight">
          {current.name}
        </h3>

        {/* Description */}
        <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed font-normal line-clamp-2">
          {current.description}
        </p>

        {/* Bottom Pagination & Dots */}
        <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80">
          <span className="text-[10px] font-mono-data text-slate-500 dark:text-slate-400 font-semibold">
            Landmark {currentIndex + 1} of {ATTRACTIONS.length}
          </span>
          <div className="flex items-center gap-1.5">
            {ATTRACTIONS.map((att, idx) => (
              <button
                key={att.id}
                type="button"
                onClick={() => setCurrentIndex(idx)}
                className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                  idx === currentIndex
                    ? 'w-6 bg-[#ff6b00]'
                    : 'w-1.5 bg-slate-300 dark:bg-slate-700 hover:bg-slate-400 dark:hover:bg-slate-500'
                }`}
                aria-label={`Go to landmark ${idx + 1}: ${att.name}`}
              />
            ))}
          </div>
        </div>

      </div>

    </div>
  );
}
