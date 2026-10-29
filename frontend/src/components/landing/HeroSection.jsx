import { Link } from 'react-router-dom';
import React, { useState, useEffect } from 'react';
import { SquarePen, Search, ArrowRight, Smartphone } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import PwaModal from './PwaModal';
import { API_BASE_URL } from '../../utils/apiBase';

/**
 * HeroSection
 * ─────────────────────────────────────────────────────────────────────────────
 * Clean Civic Aperture layout mirroring user's approved design:
 * - Scaled to match the 125% zoom density at standard 100% viewport zoom
 * - Left: Large authoritative headline ("See a problem in your community? Report it here.")
 *   + Plain language explanation
 *   + Large paired CTAs: [Report a Problem ->] & [Track My Report ->]
 *   + Official Mobile App Installation card with scannable QR Code
 * - Right: Grand official Caloocan City Engineering Department seal
 *   + Caption: "Your report helps build a safer city."
 * ─────────────────────────────────────────────────────────────────────────────
 */
export default function HeroSection({ onOpenTrackModal, onOpenPwaModal }) {
  const [internalPwaOpen, setInternalPwaOpen] = useState(false);
  const handleOpenPwa = onOpenPwaModal || (() => setInternalPwaOpen(true));

  const [activeUrl, setActiveUrl] = useState(() => {
    if (typeof window === 'undefined') return 'https://pulso.caloocan.gov.ph';
    return window.location.origin;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const isLocalDev = ['localhost', '127.0.0.1'].includes(window.location.hostname);
    if (!isLocalDev) {
      setActiveUrl(window.location.origin);
      return;
    }

    const controller = new AbortController();
    fetch(`${API_BASE_URL}/api/system/network-ip`, { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.ip) {
          const port = window.location.port ? `:${window.location.port}` : '';
          setActiveUrl(`http://${data.ip}${port}`);
        }
      })
      .catch(() => {
        setActiveUrl(window.location.origin);
      });

    return () => controller.abort();
  }, []);

  return (
    <section
      id="hero-section"
      aria-label="Civic Reporting Hero"
      className="relative flex-1 flex flex-col justify-start lg:justify-center min-h-0 lg:min-h-[calc(100vh-73px)] scroll-mt-[56px] sm:scroll-mt-[64px] lg:scroll-mt-[73px] bg-white dark:bg-[#070a12] transition-colors pt-3 pb-3 sm:pt-5 sm:pb-6 lg:py-6 overflow-hidden"
    >
      <div className="w-full max-w-[1760px] mx-auto px-4 sm:px-8 lg:px-12 xl:px-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 xl:gap-16 items-center">
          
          {/* Left Column: Heading, Subhead & Action Buttons */}
          <div className="lg:col-span-7 xl:col-span-6 2xl:col-span-6 flex flex-col items-start text-left max-w-[760px]">
            
            {/* Main Headline - Scaled to match 125% density */}
            <h1 className="font-heading font-black text-4xl sm:text-5xl md:text-[60px] lg:text-[68px] xl:text-[76px] tracking-tight text-[#0f2347] dark:text-white leading-[1.04] mb-3 sm:mb-3.5">
              See a problem in<br />
              your community?<br />
              <span className="text-[#ff6b00]">Report it here.</span>
            </h1>

            {/* Subhead Explanation */}
            <p className="text-base sm:text-lg lg:text-[18px] text-slate-600 dark:text-slate-300 leading-relaxed mb-4 sm:mb-5 font-normal max-w-[620px]">
              Report public facility damage, community infrastructure concerns, and everyday neighborhood utility issues directly to the City Engineering Department for immediate review and action.
            </p>

            {/* Primary Action Button Pair */}
            <div className="flex flex-nowrap items-center gap-2 sm:gap-3 w-full">
              <Link
                to="/report"
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-6 py-2.5 sm:py-3 rounded-xl bg-[#ff6b00] hover:bg-[#e65c00] active:scale-[0.98] text-white font-heading font-bold text-[11px] sm:text-sm whitespace-nowrap tracking-wide shadow-sm hover:shadow transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#ff6b00]"
              >
                <SquarePen size={16} className="shrink-0" />
                <span>Report a Problem</span>
                <ArrowRight size={14} className="shrink-0" />
              </Link>

              <button
                type="button"
                onClick={onOpenTrackModal}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-6 py-2.5 sm:py-3 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 text-slate-800 dark:text-slate-100 hover:text-slate-900 dark:hover:text-white font-heading font-bold text-[11px] sm:text-sm whitespace-nowrap border border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500 shadow-2xs hover:shadow-xs active:scale-[0.98] transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#ff6b00]"
              >
                <Search size={15} className="text-slate-600 dark:text-slate-300 shrink-0" strokeWidth={1.8} />
                <span>Track My Report</span>
                <ArrowRight size={14} className="text-slate-400 dark:text-slate-400 shrink-0" strokeWidth={1.8} />
              </button>
            </div>

            {/* Mobile App Installation Card with Scannable QR Code */}
              <div className="mt-4 sm:mt-5 pt-3.5 sm:pt-4 border-t border-slate-200/90 dark:border-slate-800 w-full max-w-[620px]">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5 p-3 sm:p-3.5 rounded-2xl bg-slate-50/90 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-2xs hover:border-orange-300 dark:hover:border-slate-700 transition-colors">
                  
                  {/* Left: Scannable QR Code + Details */}
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      type="button"
                      onClick={handleOpenPwa}
                      className="p-1.5 bg-white dark:bg-white rounded-xl border border-slate-200 shadow-2xs shrink-0 cursor-pointer hover:border-[#ff6b00] hover:scale-105 transition-all group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b00]"
                      title="Click to view full installation guide"
                      aria-label="Scan or click QR code to install PULSO Mobile App"
                    >
                      <QRCodeSVG
                        value={activeUrl}
                        size={64}
                        level="M"
                        includeMargin={false}
                        imageSettings={{
                          src: '/city-engineering-logo.png',
                          x: undefined,
                          y: undefined,
                          height: 16,
                          width: 16,
                          excavate: true,
                        }}
                      />
                    </button>

                    <div className="flex flex-col text-left min-w-0">
                      <span className="font-heading font-black text-xs sm:text-sm text-[#0f2347] dark:text-white">
                        Install Mobile App
                      </span>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">
                        Scan with your phone&apos;s camera to install PULSO directly onto your home screen.
                      </p>
                    </div>
                  </div>

                  {/* Right: Install Action Button */}
                  <button
                    type="button"
                    onClick={handleOpenPwa}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-[#0f2347] dark:text-white border border-slate-300 dark:border-slate-700 text-xs font-heading font-bold shadow-2xs hover:shadow-xs transition-all cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b00]"
                  >
                    <Smartphone size={14} className="text-[#ff6b00]" />
                    <span>Install App</span>
                  </button>

                </div>
              </div>

          </div>

          {/* Keep the desktop seal visible regardless of installed-app mode. */}
            <div className="hidden lg:flex lg:col-span-5 xl:col-span-6 2xl:col-span-6 flex-col items-center justify-center text-center w-full">
              <div className="flex flex-col items-center justify-center text-center">

                {/* Grand High-Resolution Caloocan City Engineering Department Seal */}
                <div className="relative group transition-transform duration-300 hover:scale-[1.02]">
                  <img
                    src="/city-engineering-logo-hd.png"
                    alt="Caloocan City Engineering Department Official Seal"
                    className="w-64 h-64 sm:w-80 sm:h-80 md:w-[380px] md:h-[380px] lg:w-[460px] lg:h-[460px] xl:w-[520px] xl:h-[520px] 2xl:w-[580px] 2xl:h-[580px] max-w-full aspect-square object-contain drop-shadow-md select-none"
                  />
                </div>

                {/* Caption text */}
                <p className="font-heading font-bold text-base sm:text-lg md:text-xl text-[#0b1c38] dark:text-white mt-4 sm:mt-5 tracking-tight">
                  Your report helps build a safer city.
                </p>

              </div>
            </div>

        </div>
      </div>

      {/* Progressive Web App QR Code Modal Fallback */}
      <PwaModal isOpen={internalPwaOpen} onClose={() => setInternalPwaOpen(false)} />
    </section>
  );
}
