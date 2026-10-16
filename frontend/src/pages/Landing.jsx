import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Navigate } from 'react-router-dom';
import OfficialBanner from '../components/landing/OfficialBanner';
import CivicNavbar from '../components/landing/CivicNavbar';
import HeroSection from '../components/landing/HeroSection';
import QuickActionsSection from '../components/landing/QuickActionsSection';
import CivicFooter from '../components/landing/CivicFooter';
import TrackReportModal from '../components/landing/TrackReportModal';
import LegalModal from '../components/LegalModal';
import MobileAppTutorial from '../components/mobile/MobileAppTutorial';
import MobileAppSplashScreen from '../components/mobile/MobileAppSplashScreen';
import PulsoPulseLine from '../components/common/PulsoPulseLine';
import { isInstalledApp, isTutorialCompleted } from '../utils/appContext';
import { getAuthToken } from '../utils/authSession';

// Lazy-load below-the-fold components for ultra-fast initial paint
const MapPreviewSection = lazy(() => import('../components/landing/MapPreviewSection'));
const HowItWorksSection = lazy(() => import('../components/landing/HowItWorksSection'));
const EmergencyHotlinesSection = lazy(() => import('../components/landing/EmergencyHotlinesSection'));

// Lightweight section skeleton fallback with signature traveling pulse line
function SectionSkeleton({ height = 'h-72', title = 'Loading...' }) {
  return (
    <div className={`w-full ${height} max-w-7xl mx-auto my-8 px-4 flex items-center justify-center`} aria-busy="true">
      <div className="w-full h-full rounded-2xl bg-slate-100 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800 flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 text-xs font-sans gap-3">
        <div className="w-36">
          <PulsoPulseLine />
        </div>
        <span>{title}</span>
      </div>
    </div>
  );
}

/**
 * Landing (PULSO Civic Portal)
 * ─────────────────────────────────────────────────────────────────────────────
 * - Public Website: Retains full civic portal landing page (Hero, Map, News, etc.)
 * - Installed Mobile App: Does NOT render landing page.
 *   - First launch: routes to 5-step MobileAppTutorial.
 *   - Returning user: routes to resident dashboard (if signed in) or guest report flow.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export default function Landing() {
  const inApp = isInstalledApp();
  const tutorialCompleted = isTutorialCompleted();
  const isAuthenticated = Boolean(getAuthToken());

  // Cold start splash state
  const [splashFinished, setSplashFinished] = useState(() => {
    if (typeof window === 'undefined') return true;
    if (!inApp) return true;
    return Boolean(sessionStorage.getItem('pulso_session_started'));
  });

  // Hide static placeholder HTML splash once React mounts
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const initialSplash = document.getElementById('pulso-initial-splash');
      if (initialSplash) {
        initialSplash.style.display = 'none';
      }
    }
  }, []);

  // 1. Installed Mobile App Context:
  if (inApp) {
    // Show splash screen on cold start
    if (!splashFinished) {
      return (
        <MobileAppSplashScreen
          onFinish={() => {
            sessionStorage.setItem('pulso_session_started', 'true');
            setSplashFinished(true);
          }}
        />
      );
    }

    if (!tutorialCompleted) {
      return <MobileAppTutorial />;
    }

    if (isAuthenticated) {
      return <Navigate to="/dashboard" replace />;
    }

    // Returning unauthenticated app user: send straight to guest Report flow
    return <Navigate to="/report" replace />;
  }

  // 2. Public Website Context: Render current website landing page unchanged
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
