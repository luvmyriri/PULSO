import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, 
  ChevronRight, 
  MapPin, 
  AlertTriangle, 
  Calendar, 
  HardHat, 
  Building2, 
  ExternalLink, 
  X, 
  PlusCircle, 
  Loader2, 
  Clock, 
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Radio
} from 'lucide-react';

const CATEGORIES = ['All', 'Advisories', 'Events', 'Infrastructure'];

const DEFAULT_NEWS = [
  {
    id: 'local-1',
    category: 'Advisories',
    priority: 'urgent',
    headline: 'Emergency Maynilad Pipeline Repair: Temporary Water Interruption',
    excerpt: 'Emergency repair of 600mm distribution pipe along Zabarte Road. Temporary water service interruption affects Brgy. 171, 175, and 178 until 6:00 PM today. Water delivery tankers deployed.',
    barangay: 'Brgy. 171 / 175 / 178',
    image_url: null,
    source_url: 'https://caloocancity.gov.ph',
    posted_by: 'Engr. R. Ramos (City Engineering Dept)',
    published_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'local-2',
    category: 'Infrastructure',
    priority: 'normal',
    headline: 'Major Asphalt Overlay & Drainage Rehabilitation Along Samson Road',
    excerpt: 'City Engineering road maintenance crews have initiated Phase 2 asphalt resurfacing and box culvert expansion along the Samson Road corridor to prevent seasonal monsoon flooding.',
    barangay: 'Brgy. 73 / 77 / 80',
    image_url: null,
    source_url: 'https://caloocancity.gov.ph',
    posted_by: 'Public Works Division',
    published_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'local-3',
    category: 'Events',
    priority: 'normal',
    headline: 'Caloocan Mega Civic Job Fair & Skills Registration at Sports Complex',
    excerpt: 'Over 45 accredited employers offering 2,500+ local government and engineering technician openings. Free NBI clearance, SSS, and PhilHealth assistance desks available onsite.',
    barangay: 'Bagumbong, North Caloocan',
    image_url: null,
    source_url: 'https://caloocancity.gov.ph',
    posted_by: 'Caloocan PESO & LGU',
    published_at: new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'local-4',
    category: 'Advisories',
    priority: 'normal',
    headline: 'PULSO 24/7 Rapid Pothole & Streetlight Repair Protocol Activated',
    excerpt: 'City Maintenance crews now operate on accelerated 24-hour response cycles for all verified streetlight outages and road hazard tickets submitted through the PULSO citizen desk.',
    barangay: 'All 188 Barangays',
    image_url: null,
    source_url: 'https://caloocancity.gov.ph',
    posted_by: 'Office of the City Mayor',
    published_at: new Date(Date.now() - 28 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'local-5',
    category: 'Infrastructure',
    priority: 'normal',
    headline: 'Smart LED Streetlight Modernization: Phase 3 Completed in District 1',
    excerpt: '350 high-efficiency solar-backed LED fixtures installed across Camarin, improving nighttime visibility and reducing municipal public works energy consumption by 40%.',
    barangay: 'Brgy. 165 - 170',
    image_url: null,
    source_url: 'https://caloocancity.gov.ph',
    posted_by: 'Electrical Engineering Division',
    published_at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()
  }
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

function getCategoryIcon(category) {
  switch (category?.toLowerCase()) {
    case 'advisories':
    case 'advisory':
      return AlertTriangle;
    case 'events':
    case 'event':
      return Calendar;
    case 'infrastructure':
      return HardHat;
    default:
      return Building2;
  }
}

export default function CityNewsWidget() {
  const [news, setNews] = useState(DEFAULT_NEWS);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [activeModalItem, setActiveModalItem] = useState(null);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [isStaffUser, setIsStaffUser] = useState(false);
  const timerRef = useRef(null);

  // Form state for non-technical staff CMS write path
  const [adminForm, setAdminForm] = useState({
    category: 'Advisories',
    headline: '',
    excerpt: '',
    priority: 'normal',
    barangay: '',
    source_url: '',
    posted_by: 'City Engineering Department'
  });
  const [adminImageFile, setAdminImageFile] = useState(null);
  const [adminSubmitting, setAdminSubmitting] = useState(false);
  const [adminSuccess, setAdminSuccess] = useState(false);
  const [adminError, setAdminError] = useState('');

  // Check if current user is civic/government staff
  useEffect(() => {
    try {
      const stored = localStorage.getItem('currentUser') || localStorage.getItem('user');
      if (stored) {
        const u = JSON.parse(stored);
        if (['manager', 'dispatcher', 'admin_clerk', 'staff', 'engineer'].includes(u.role?.toLowerCase())) {
          setIsStaffUser(true);
        }
      }
    } catch (e) {
      // ignore
    }
  }, []);

  // Lock background body scroll when either modal is active
  useEffect(() => {
    if (activeModalItem || showAdminModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [activeModalItem, showAdminModal]);

  // Fetch real-time news from backend with graceful fallback
  const fetchNews = async () => {
    try {
      const res = await fetch('/api/news?limit=15');
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.items) && data.items.length > 0) {
          const sanitized = data.items.map(item => ({
            ...item,
            image_url: item.image_url && !item.image_url.includes('unsplash') && !item.image_url.startsWith('/news/') ? item.image_url : null
          }));
          setNews(sanitized);
        }
      }
    } catch (err) {
      console.warn('Using local municipal news fallback:', err);
    }
  };

  useEffect(() => {
    fetchNews();
  }, []);

  // Listen for reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    const handler = (e) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  // Filter items by category
  const filteredItems = useMemo(() => {
    if (selectedCategory === 'All') return news;
    return news.filter(
      (item) => item.category?.toLowerCase() === selectedCategory.toLowerCase()
    );
  }, [news, selectedCategory]);

  // Keep currentIndex bounded
  useEffect(() => {
    if (currentIndex >= filteredItems.length) {
      setCurrentIndex(0);
    }
  }, [filteredItems, currentIndex]);

  const currentItem = filteredItems[currentIndex] || DEFAULT_NEWS[0];
  const isUrgent = currentItem?.priority === 'urgent';

  // Autoplay rotation: 7 seconds, pauses on hover/focus, paused if urgent until dismissed/interacted
  useEffect(() => {
    if (isPaused || prefersReducedMotion || filteredItems.length <= 1) return;
    
    // Slow down rotation if urgent to allow thorough reading (10s), otherwise 7s
    const intervalTime = isUrgent ? 10000 : 7000;

    timerRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % filteredItems.length);
    }, intervalTime);

    return () => clearInterval(timerRef.current);
  }, [isPaused, prefersReducedMotion, filteredItems.length, isUrgent]);

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + filteredItems.length) % filteredItems.length);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % filteredItems.length);
  };

  const handleCategorySelect = (cat) => {
    setSelectedCategory(cat);
    setCurrentIndex(0);
  };

  // Staff CMS Submission Handler
  const handleAdminSubmit = async (e) => {
    e.preventDefault();
    setAdminSubmitting(true);
    setAdminError('');

    try {
      const formData = new FormData();
      formData.append('category', adminForm.category);
      formData.append('headline', adminForm.headline);
      formData.append('excerpt', adminForm.excerpt);
      formData.append('priority', adminForm.priority);
      if (adminForm.barangay) formData.append('barangay', adminForm.barangay);
      if (adminForm.source_url) formData.append('source_url', adminForm.source_url);
      if (adminForm.posted_by) formData.append('posted_by', adminForm.posted_by);
      if (adminImageFile) formData.append('image', adminImageFile);

      const res = await fetch('/api/news', {
        method: 'POST',
        body: formData
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to post news announcement.');
      }

      const created = await res.json();
      setAdminSuccess(true);
      await fetchNews();

      setTimeout(() => {
        setAdminSuccess(false);
        setShowAdminModal(false);
        setAdminForm({
          category: 'Advisories',
          headline: '',
          excerpt: '',
          priority: 'normal',
          barangay: '',
          source_url: '',
          posted_by: 'City Engineering Department'
        });
        setAdminImageFile(null);
        setSelectedCategory('All');
        setCurrentIndex(0);
      }, 1200);
    } catch (err) {
      setAdminError(err.message || 'Error creating news post.');
    } finally {
      setAdminSubmitting(false);
    }
  };

  const CategoryIcon = getCategoryIcon(currentItem?.category);

  return (
    <>
      <div
        className="relative w-full rounded-2xl overflow-hidden shadow-sm hover:shadow-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 group select-none transition-colors"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onFocus={() => setIsPaused(true)}
        onBlur={() => setIsPaused(false)}
        onTouchStart={() => setIsPaused(true)}
        onTouchEnd={() => setIsPaused(false)}
        role="region"
        aria-roledescription="carousel"
        aria-label="Caloocan City News Feed"
      >
        {/* Top News Category Filter Tabs */}
        <div className="bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 px-2.5 py-2 flex items-center justify-between text-xs font-mono-data overflow-x-auto">
          <div className="flex items-center gap-1.5 shrink-0" role="tablist" aria-label="News categories">
            {CATEGORIES.map((cat) => {
              const isActive = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  aria-label={`Show ${cat} news`}
                  onClick={() => handleCategorySelect(cat)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] sm:text-[11px] font-semibold transition-all cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'bg-[#ff6b00] text-white shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/80 dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/5'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          {/* Right Action: Live Feed indicator OR Staff Post Notice shortcut */}
          <div className="flex items-center gap-1.5 shrink-0 px-1">
            {isStaffUser && (
              <button
                type="button"
                onClick={() => setShowAdminModal(true)}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#ff6b00]/10 hover:bg-[#ff6b00]/20 text-[#ff6b00] text-[10px] font-bold transition-colors cursor-pointer border border-[#ff6b00]/30"
                title="Post new City Announcement"
              >
                <PlusCircle size={11} />
                <span>Post Notice</span>
              </button>
            )}
          </div>
        </div>

        {/* Visual Viewport with Fixed Aspect Ratio (Matching Landmark Card) */}
        <div className="relative aspect-[16/10] sm:aspect-[16/9] w-full overflow-hidden bg-slate-100 dark:bg-slate-950">
          <AnimatePresence mode="wait">
            <motion.div
              key={`${currentItem?.id}-${selectedCategory}`}
              initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0 }}
              transition={{ duration: prefersReducedMotion ? 0.02 : 0.35 }}
              className="absolute inset-0"
            >
              {currentItem?.image_url ? (
                <img
                  src={currentItem.image_url}
                  alt={currentItem.headline}
                  className="w-full h-full object-cover object-center"
                  loading="eager"
                  onError={(e) => {
                    // Fallback to category artwork if broken
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                /* Themed Fallback Graphic when no image is provided - Never a blank space */
                <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-100 via-orange-50/40 to-slate-200 dark:from-slate-900 dark:via-orange-950/20 dark:to-slate-950 p-6 text-center relative overflow-hidden">
                  <div className="absolute -right-8 -bottom-8 opacity-10 dark:opacity-5 pointer-events-none">
                    <img src="/engineering-logo.jpg" alt="" className="w-48 h-48 rounded-full" />
                  </div>
                  <div className="w-14 h-14 rounded-2xl bg-[#ff6b00]/10 dark:bg-[#ff6b00]/20 text-[#ff6b00] flex items-center justify-center mb-2.5 shadow-inner">
                    <CategoryIcon size={28} />
                  </div>
                  <span className="text-[11px] font-mono-data uppercase tracking-widest text-[#ff6b00] font-bold">
                    Official Caloocan {currentItem?.category} Notice
                  </span>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Floating Top Status Badge + Relative Timestamp */}
          <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5">
            {isUrgent ? (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-600 text-white shadow-md text-[10px] font-mono-data font-black uppercase tracking-wider animate-pulse">
                <AlertTriangle size={11} className="shrink-0" />
                <span>Urgent Advisory</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/95 dark:bg-slate-950/85 text-slate-800 dark:text-orange-400 border border-slate-200/90 dark:border-white/10 shadow-sm backdrop-blur-md text-[10px] font-mono-data font-bold uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span>{currentItem?.category || 'News'}</span>
                <span className="opacity-40">•</span>
                <span className="text-slate-500 dark:text-slate-400">{formatRelativeTime(currentItem?.published_at)}</span>
              </div>
            )}
          </div>

          {/* Side Prev/Next Arrows */}
          {filteredItems.length > 1 && (
            <div className="absolute inset-y-0 left-2 right-2 flex items-center justify-between pointer-events-none z-10">
              <button
                type="button"
                onClick={handlePrev}
                className="pointer-events-auto p-2 rounded-full bg-white/90 dark:bg-slate-950/80 text-slate-800 dark:text-white hover:bg-[#ff6b00] hover:text-white dark:hover:bg-[#ff6b00] border border-slate-200/80 dark:border-white/10 backdrop-blur-xs shadow-md transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b00]"
                aria-label="Previous update"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="pointer-events-auto p-2 rounded-full bg-white/90 dark:bg-slate-950/80 text-slate-800 dark:text-white hover:bg-[#ff6b00] hover:text-white dark:hover:bg-[#ff6b00] border border-slate-200/80 dark:border-white/10 backdrop-blur-xs shadow-md transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b00]"
                aria-label="Next update"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>

        {/* Dedicated Information Card (Clean Layout Below Photo) */}
        <div 
          className="p-4 sm:p-5 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 text-left transition-colors"
          aria-live="polite"
        >
          {/* Location & Relative Time Tag */}
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 mb-1">
            <MapPin size={12} className="text-[#ff6b00] shrink-0" />
            <span className="truncate font-medium">{currentItem?.barangay || 'Caloocan City'}</span>
            <span className="opacity-40">•</span>
            <Clock size={11} className="text-slate-400 shrink-0" />
            <span className="shrink-0">{formatRelativeTime(currentItem?.published_at)}</span>
          </div>

          {/* Headline */}
          <h3 className="font-heading font-extrabold text-base sm:text-lg text-slate-900 dark:text-white leading-tight line-clamp-2">
            {currentItem?.headline}
          </h3>

          {/* Excerpt */}
          <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed font-normal line-clamp-2">
            {currentItem?.excerpt}
          </p>

          {/* Read More Action Bar */}
          <div className="mt-3 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setActiveModalItem(currentItem)}
              className="inline-flex items-center gap-1 text-xs font-bold text-[#ff6b00] hover:text-[#e65c00] transition-colors cursor-pointer group/btn"
              aria-label={`Read full details: ${currentItem?.headline}`}
            >
              <span>Read details</span>
              <ArrowRight size={13} className="transition-transform group-hover/btn:translate-x-0.5" />
            </button>

            {/* Pagination Numbers & Dots */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono-data text-slate-500 dark:text-slate-400 font-semibold">
                {currentIndex + 1} of {filteredItems.length}
              </span>

              <div className="flex items-center gap-1">
                {filteredItems.map((item, idx) => (
                  <button
                    key={item.id || idx}
                    type="button"
                    onClick={() => setCurrentIndex(idx)}
                    className={`h-1.5 rounded-full transition-all cursor-pointer ${
                      idx === currentIndex
                        ? 'w-4 bg-[#ff6b00]'
                        : 'w-1.5 bg-slate-300 dark:bg-slate-700 hover:bg-slate-400'
                    }`}
                    aria-label={`Go to news item ${idx + 1}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── PORTALED MODALS: Mounted to document.body with z-[9999] to completely overlay the navbar ── */}
      {typeof document !== 'undefined' && createPortal(
        <>
          {/* ── MODAL: Full Article / Announcement Detail View ── */}
          <AnimatePresence>
            {activeModalItem && (
              <div 
                className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
                role="dialog"
                aria-modal="true"
                aria-labelledby="modal-headline"
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  transition={{ duration: 0.2 }}
                  className="relative w-full max-w-xl max-h-[90vh] flex flex-col bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
                >
                  {/* Modal Header Strip */}
                  <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80">
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono-data font-black uppercase tracking-wider ${
                        activeModalItem.priority === 'urgent'
                          ? 'bg-red-600 text-white'
                          : 'bg-[#ff6b00] text-white'
                      }`}>
                        {activeModalItem.priority === 'urgent' ? 'Urgent Advisory' : activeModalItem.category}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-mono-data">
                        {formatRelativeTime(activeModalItem.published_at)}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveModalItem(null)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      aria-label="Close dialog"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  {/* Modal Scrollable Content */}
                  <div className="overflow-y-auto p-5 sm:p-6 space-y-4">
                    {activeModalItem.image_url && (
                      <div className="w-full aspect-[16/9] rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                        <img 
                          src={activeModalItem.image_url} 
                          alt="" 
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}

                    <div className="space-y-2">
                      {activeModalItem.barangay && (
                        <div className="inline-flex items-center gap-1.5 text-xs text-[#ff6b00] font-semibold">
                          <MapPin size={13} />
                          <span>{activeModalItem.barangay}</span>
                        </div>
                      )}
                      <h2 id="modal-headline" className="font-heading font-extrabold text-xl sm:text-2xl text-slate-900 dark:text-white leading-snug">
                        {activeModalItem.headline}
                      </h2>
                    </div>

                    <div className="pt-2 text-sm leading-relaxed text-slate-700 dark:text-slate-300 whitespace-pre-line font-normal">
                      {activeModalItem.excerpt}
                    </div>

                    {/* Official Audit Trail */}
                    <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
                      <div className="flex items-center gap-2">
                        <ShieldCheck size={15} className="text-[#ff6b00]" />
                        <span>Issued by: <strong className="text-slate-800 dark:text-slate-200">{activeModalItem.posted_by || 'City Engineering Office'}</strong></span>
                      </div>

                      {activeModalItem.source_url && (
                        <a
                          href={activeModalItem.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-[#ff6b00] hover:underline font-bold"
                        >
                          <span>Official Source Bulletin</span>
                          <ExternalLink size={12} />
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Modal Footer */}
                  <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setActiveModalItem(null)}
                      className="px-5 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-700 font-bold text-xs transition-colors cursor-pointer"
                    >
                      Close
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* ── MODAL: Staff / Engineering Non-Technical CMS Write Path ── */}
          <AnimatePresence>
            {showAdminModal && (
              <div 
                className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
                role="dialog"
                aria-modal="true"
                aria-labelledby="admin-modal-title"
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  transition={{ duration: 0.2 }}
                  className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]"
                >
                  {/* Header */}
                  <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-[#ff6b00]/10 text-[#ff6b00]">
                        <PlusCircle size={16} />
                      </div>
                      <div>
                        <h3 id="admin-modal-title" className="font-heading font-bold text-sm text-slate-900 dark:text-white">
                          Publish City Announcement
                        </h3>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          City Engineering &amp; LGU Staff Desk
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowAdminModal(false)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  {/* Form Body */}
                  <form onSubmit={handleAdminSubmit} className="overflow-y-auto p-5 space-y-3.5 text-xs text-left">
                    {adminSuccess ? (
                      <div className="py-8 text-center flex flex-col items-center gap-2">
                        <CheckCircle2 size={36} className="text-emerald-500 animate-bounce" />
                        <h4 className="font-heading font-bold text-base text-slate-900 dark:text-white">
                          Announcement Published!
                        </h4>
                        <p className="text-xs text-slate-500">Live feed has been synchronized.</p>
                      </div>
                    ) : (
                      <>
                        {adminError && (
                          <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50 flex items-center gap-2">
                            <AlertTriangle size={14} className="shrink-0" />
                            <span>{adminError}</span>
                          </div>
                        )}

                        {/* Category & Priority */}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                              Category <span className="text-red-500">*</span>
                            </label>
                            <select
                              value={adminForm.category}
                              onChange={(e) => setAdminForm({ ...adminForm, category: e.target.value })}
                              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                              required
                            >
                              <option value="Advisories">Advisories</option>
                              <option value="Infrastructure">Infrastructure</option>
                              <option value="Events">Events</option>
                              <option value="General">General</option>
                            </select>
                          </div>

                          <div>
                            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                              Priority
                            </label>
                            <select
                              value={adminForm.priority}
                              onChange={(e) => setAdminForm({ ...adminForm, priority: e.target.value })}
                              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                            >
                              <option value="normal">Normal (Feed Rotation)</option>
                              <option value="urgent">Urgent (Pinned to Top)</option>
                            </select>
                          </div>
                        </div>

                        {/* Headline */}
                        <div>
                          <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Headline <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Scheduled Water Interruption in Brgy. 171"
                            value={adminForm.headline}
                            onChange={(e) => setAdminForm({ ...adminForm, headline: e.target.value })}
                            className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                            required
                          />
                        </div>

                        {/* Excerpt / Body */}
                        <div>
                          <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Notice Details / Excerpt <span className="text-red-500">*</span>
                          </label>
                          <textarea
                            rows={3}
                            placeholder="Provide clear public details, affected zones, and expected timeline..."
                            value={adminForm.excerpt}
                            onChange={(e) => setAdminForm({ ...adminForm, excerpt: e.target.value })}
                            className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white leading-relaxed resize-none"
                            required
                          />
                        </div>

                        {/* Barangay & Department */}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                              Barangay / Area
                            </label>
                            <input
                              type="text"
                              placeholder="e.g. Brgy. 77 / 80"
                              value={adminForm.barangay}
                              onChange={(e) => setAdminForm({ ...adminForm, barangay: e.target.value })}
                              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                            />
                          </div>

                          <div>
                            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                              Issuing Official / Office
                            </label>
                            <input
                              type="text"
                              placeholder="e.g. City Engineering Office"
                              value={adminForm.posted_by}
                              onChange={(e) => setAdminForm({ ...adminForm, posted_by: e.target.value })}
                              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                            />
                          </div>
                        </div>

                        {/* Source URL */}
                        <div>
                          <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Official Link / URL (Optional)
                          </label>
                          <input
                            type="url"
                            placeholder="https://caloocancity.gov.ph/bulletin"
                            value={adminForm.source_url}
                            onChange={(e) => setAdminForm({ ...adminForm, source_url: e.target.value })}
                            className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                          />
                        </div>

                        {/* Cover Image Upload */}
                        <div>
                          <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Cover Photo (Optional, Max 5MB)
                          </label>
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={(e) => setAdminImageFile(e.target.files[0] || null)}
                            className="w-full text-[11px] text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#ff6b00]/10 file:text-[#ff6b00] hover:file:bg-[#ff6b00]/20 cursor-pointer"
                          />
                        </div>

                        {/* Action Buttons */}
                        <div className="pt-2 flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setShowAdminModal(false)}
                            className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 font-bold transition-colors cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={adminSubmitting}
                            className="px-5 py-2 rounded-xl bg-[#ff6b00] hover:bg-[#e65c00] text-white font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
                          >
                            {adminSubmitting ? (
                              <>
                                <Loader2 size={14} className="animate-spin" />
                                <span>Publishing...</span>
                              </>
                            ) : (
                              <span>Publish Notice</span>
                            )}
                          </button>
                        </div>
                      </>
                    )}
                  </form>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </>,
        document.body
      )}
    </>
  );
}
