import React, { useState, lazy, Suspense } from 'react';
import OfficialBanner from '../components/landing/OfficialBanner';
import CivicNavbar from '../components/landing/CivicNavbar';
import HeroSection from '../components/landing/HeroSection';
import QuickActionsSection from '../components/landing/QuickActionsSection';
import CivicFooter from '../components/landing/CivicFooter';
import TrackReportModal from '../components/landing/TrackReportModal';
import LegalModal from '../components/LegalModal';

// Lazy-load below-the-fold components for ultra-fast initial paint
const MapPreviewSection = lazy(() => import('../components/landing/MapPreviewSection'));
const HowItWorksSection = lazy(() => import('../components/landing/HowItWorksSection'));
const EmergencyHotlinesSection = lazy(() => import('../components/landing/EmergencyHotlinesSection'));

// Lightweight section skeleton fallback for smooth below-the-fold loading
function SectionSkeleton({ height = 'h-72', title = 'Loading...' }) {
  return (
    <div className={`w-full ${height} max-w-7xl mx-auto my-8 px-4 flex items-center justify-center`} aria-busy="true">
      <div className="w-full h-full rounded-2xl bg-slate-100 dark:bg-slate-900/50 animate-pulse border border-slate-200/60 dark:border-slate-800 flex flex-col items-center justify-center text-slate-400 dark:text-slate-600 text-xs font-mono-data">
        <span className="w-6 h-6 rounded-full border-2 border-[#ff6b00] border-t-transparent animate-spin mb-2" />
        <span>{title}</span>
      </div>
    </div>
  );
}

/**
 * Landing (PULSO Civic Portal)
 * ─────────────────────────────────────────────────────────────────────────────
 * Professional civic portal redesigned for non-technical Caloocan City residents.
 * - Clarity: What PULSO does and how to use it in one plain sentence.
 * - Fast path: Direct 1-tap action to report an issue or track status.
 * - Credibility: Official city branding, live snapshot, and real utility activity.
 * - Supporting attraction slideshow showcasing Caloocan landmarks.
 * - Theme toggle parity: Dark navy/black base with orange accent & light mode.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export default function Landing() {
  const [isTrackModalOpen, setIsTrackModalOpen] = useState(false);
  const [legalModal, setLegalModal] = useState({ isOpen: false, tab: 'privacy' });

  return (
    <div className="min-h-screen w-full flex flex-col bg-[#fffbf9] dark:bg-[#070a12] text-slate-900 dark:text-slate-100 font-sans selection:bg-[#ff6b00] selection:text-white transition-colors duration-200 overflow-x-clip">
      
      {/* Skip to Main Content Link for Keyboard / Screen Reader Accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 px-4 py-2 bg-[#ff6b00] text-white text-xs font-bold rounded-lg shadow-lg"
      >
        Skip to main content
      </a>

      {/* Official Republic of the Philippines / Caloocan City Header Ribbon */}
      <OfficialBanner />

      {/* Semantic Navigation Header */}
      <CivicNavbar onOpenTrackModal={() => setIsTrackModalOpen(true)} />

      {/* 3. Main Landmark Content */}
      <main id="main-content" className="flex-1 focus:outline-hidden">
        
        {/* Section 1: Hero (One-sentence purpose + single primary CTA + Supporting Landmark Slideshow) */}
        <HeroSection onOpenTrackModal={() => setIsTrackModalOpen(true)} />

        {/* Section 3: Quick Actions (4 large tappable cards with vertical mobile stack) */}
        <QuickActionsSection onOpenTrackModal={() => setIsTrackModalOpen(true)} />

        {/* Section 4: Map Preview (Visual proof with real Caloocan barangay pins) */}
        <Suspense fallback={<SectionSkeleton height="h-96" title="Loading Caloocan Utility Map..." />}>
          <MapPreviewSection />
        </Suspense>

        {/* Section 5: How It Works (3-step plain-language visual guide) */}
        <Suspense fallback={<SectionSkeleton height="h-72" title="Loading Process Guide..." />}>
          <HowItWorksSection />
        </Suspense>

        {/* Section 6: Emergency & Utility Hotlines */}
        <Suspense fallback={<SectionSkeleton height="h-64" title="Loading Hotlines Directory..." />}>
          <EmergencyHotlinesSection />
        </Suspense>

      </main>

      {/* 4. Semantic Footer (City government affiliation, contacts, legal compliance) */}
      <CivicFooter
        onOpenLegalModal={(tab) => setLegalModal({ isOpen: true, tab })}
      />

      {/* Interactive Citizen Tracking Lookup Modal */}
      <TrackReportModal
        isOpen={isTrackModalOpen}
        onClose={() => setIsTrackModalOpen(false)}
      />

      {/* Official Legal & Citizen's Charter Modal */}
      <LegalModal
        isOpen={legalModal.isOpen}
        onClose={() => setLegalModal((prev) => ({ ...prev, isOpen: false }))}
        initialTab={legalModal.tab}
      />

    </div>
  );
}
