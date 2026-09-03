import React from 'react';
import { useTranslation } from 'react-i18next';
import { ShieldCheck, PhoneCall, Mail, MapPin, ExternalLink, ArrowUp } from 'lucide-react';
import Branding from '../Branding';

/**
 * CivicFooter
 * ─────────────────────────────────────────────────────────────────────────────
 * Official Philippine LGU Footer conforming to national accessibility standards,
 * Data Privacy Act (RA 10173) provisions, and direct portal navigation.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export default function CivicFooter({ onOpenLegalModal }) {
  const { t } = useTranslation();

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer
      role="contentinfo"
      aria-label="Official Municipal Portal Footer"
      className="bg-slate-900 dark:bg-[#03060c] text-slate-300 border-t border-slate-800 transition-colors pt-12 pb-8 text-left"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Top Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 pb-10 border-b border-slate-800">
          
          {/* Col 1: Branding & Municipal Trust Anchor (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="flex items-center gap-3">
              <Branding size="h-10 w-10" className="shrink-0" showText={false} />
              <div className="flex flex-col">
                <span className="font-heading font-black text-xl sm:text-2xl text-white tracking-tight leading-tight">
                  City Engineering Department
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] font-mono-data uppercase tracking-wider text-slate-400 font-semibold">
                    Lungsod ng Caloocan
                  </span>
                  <span className="text-slate-600 text-[10px]">•</span>
                  <span className="text-[10px] font-mono-data font-bold text-[#ff6b00] uppercase tracking-wider">
                    Powered by PULSO
                  </span>
                </div>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-sm font-normal">
              Official Public Utility &amp; Infrastructure Locator System operated by the City Engineering Department. Empowering citizens with direct reporting, rapid work order dispatch, and 24/7 public safety tracking across all 188 barangays.
            </p>

            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/90 text-slate-300 text-xs font-mono-data border border-slate-700">
              <ShieldCheck size={14} className="text-emerald-400" />
              <span>Republic Act No. 10173 (Data Privacy Act) Compliant</span>
            </div>
          </div>

          {/* Col 2: Citizen Portals (2 cols) */}
          <div className="lg:col-span-2">
            <h4 className="font-heading font-bold text-xs uppercase tracking-wider text-white mb-3.5">
              Portal Access
            </h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li>
                <a href="/login" className="hover:text-[#ff6b00] transition-colors font-medium">
                  Resident Sign In
                </a>
              </li>
              <li>
                <a href="/register" className="hover:text-[#ff6b00] transition-colors font-medium">
                  Citizen Registration
                </a>
              </li>
              <li>
                <a href="/gov" className="hover:text-[#ff6b00] transition-colors font-medium flex items-center gap-1">
                  <span>Government Gateway</span>
                  <ExternalLink size={11} />
                </a>
              </li>
              <li>
                <a href="/dispatcher" className="hover:text-[#ff6b00] transition-colors font-medium">
                  Dispatch Operations
                </a>
              </li>
            </ul>
          </div>

          {/* Col 3: Municipal Office Locations (2 cols) */}
          <div className="lg:col-span-2">
            <h4 className="font-heading font-bold text-xs uppercase tracking-wider text-white mb-3.5">
              Office Locations
            </h4>
            <div className="space-y-3 text-xs text-slate-400">
              <div>
                <strong className="text-slate-200 block">North Caloocan Hub:</strong>
                <span>City Hall Complex, Camarin Road, Caloocan City</span>
              </div>
              <div>
                <strong className="text-slate-200 block">South Caloocan Hub:</strong>
                <span>City Hall, 8th Avenue cor. F. Roxas, Caloocan City</span>
              </div>
            </div>
          </div>

          {/* Col 4: Official Contacts (3 cols) */}
          <div className="lg:col-span-3">
            <h4 className="font-heading font-bold text-xs uppercase tracking-wider text-white mb-3.5">
              Contact &amp; Assistance
            </h4>
            <ul className="space-y-2.5 text-xs text-slate-400">
              <li className="flex items-center gap-2">
                <PhoneCall size={13} className="text-[#ff6b00] shrink-0" />
                <span>Caloocan Rescue: <strong className="text-white font-mono-data">(02) 8888-2256</strong></span>
              </li>
              <li className="flex items-center gap-2">
                <PhoneCall size={13} className="text-slate-400 shrink-0" />
                <span>City Engineering: <strong className="text-white font-mono-data">(02) 8362-0220</strong></span>
              </li>
              <li className="flex items-center gap-2">
                <Mail size={13} className="text-slate-400 shrink-0" />
                <span className="font-mono-data text-[11px] text-slate-300">engineering@caloocan.gov.ph</span>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Bar: Copyright & Compliance */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div className="text-center sm:text-left">
            &copy; {new Date().getFullYear()} City Government of Caloocan. All rights reserved.
          </div>

          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={() => onOpenLegalModal && onOpenLegalModal('privacy')}
              className="hover:text-[#ff6b00] transition-colors cursor-pointer"
            >
              Privacy Policy
            </button>
            <button
              type="button"
              onClick={() => onOpenLegalModal && onOpenLegalModal('terms')}
              className="hover:text-[#ff6b00] transition-colors cursor-pointer"
            >
              Citizen&apos;s Charter
            </button>
            <button
              type="button"
              onClick={scrollToTop}
              className="inline-flex items-center gap-1 text-slate-400 hover:text-white transition-colors cursor-pointer ml-2"
              title="Back to Top"
            >
              <span>Back to top</span>
              <ArrowUp size={13} />
            </button>
          </div>
        </div>

      </div>
    </footer>
  );
}
