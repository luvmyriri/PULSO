import { Link } from 'react-router-dom';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { ShieldCheck, PhoneCall, Mail, MapPin, ExternalLink, QrCode } from 'lucide-react';
import Branding from '../Branding';
import { isInstalledApp } from '../../utils/appContext';

/**
 * CivicFooter
 * ─────────────────────────────────────────────────────────────────────────────
 * Official Philippine LGU Footer conforming to national accessibility standards,
 * Data Privacy Act (RA 10173) provisions, and direct portal navigation.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export default function CivicFooter({ onOpenLegalModal, onOpenPwaModal }) {
  const { t } = useTranslation();

  return (
    <footer
      role="contentinfo"
      aria-label="Official Municipal Portal Footer"
      className="civic-footer bg-slate-900 dark:bg-[#03060c] text-slate-300 border-t border-slate-800 transition-colors pt-8 pb-5 text-left"
    >
      <div className="w-full max-w-[1760px] mx-auto px-4 sm:px-8 lg:px-12 xl:px-16">
        
        {/* Top Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6 pb-6 border-b border-slate-800">
          
          {/* Col 1: Branding & Municipal Trust Anchor (5 cols) */}
          <div className="lg:col-span-5 space-y-3">
            <div className="flex items-center gap-3">
              <Branding size="h-8 w-8" className="shrink-0" showText={false} />
              <div className="flex flex-col">
                <span className="font-heading font-black text-lg sm:text-xl text-white tracking-tight leading-tight">
                  City Engineering Department
                </span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] font-mono-data uppercase tracking-wider text-slate-400 font-semibold">
                    Lungsod ng Caloocan
                  </span>
                  <span className="text-slate-500 text-[10px]">•</span>
                  <span className="text-[10px] font-mono-data font-bold text-[#ff6b00] uppercase tracking-wider">
                    Powered by PULSO
                  </span>
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-normal max-w-sm font-normal">
              Official Public Utility &amp; Infrastructure Locator System operated by the City Engineering Department. Empowering citizens with direct reporting, rapid work order dispatch, and 24/7 public safety tracking across all 188 barangays.
            </p>

            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-slate-800/90 text-slate-300 text-[11px] font-mono-data border border-slate-700">
              <ShieldCheck size={13} className="text-emerald-400" />
              <span className="text-slate-300">Republic Act No. 10173 (Data Privacy Act) Compliant</span>
            </div>
          </div>

          {/* Col 2: Citizen Portals (2 cols) */}
          <div className="lg:col-span-2">
            <h4 className="font-heading font-bold text-xs uppercase tracking-wider text-white mb-2">
              Portal Access
            </h4>
            <ul className="space-y-1.5 text-xs">
              <li>
                <Link to="/login" className="text-slate-400 hover:text-[#ff6b00] transition-colors font-medium">
                  Resident Sign In
                </Link>
              </li>
              <li>
                <Link to="/register" className="text-slate-400 hover:text-[#ff6b00] transition-colors font-medium">
                  Citizen Registration
                </Link>
              </li>
              <li>
                <a href="/gov" className="text-slate-400 hover:text-[#ff6b00] transition-colors font-medium flex items-center gap-1">
                  <span>Government Gateway</span>
                  <ExternalLink size={11} />
                </a>
              </li>
              <li>
                <a href="/dispatcher" className="text-slate-400 hover:text-[#ff6b00] transition-colors font-medium">
                  Dispatch Operations
                </a>
              </li>
              {!isInstalledApp() && onOpenPwaModal && (
                <li>
                  <button
                    type="button"
                    onClick={onOpenPwaModal}
                    className="text-slate-400 hover:text-[#ff6b00] transition-colors font-medium flex items-center gap-1.5 cursor-pointer text-left"
                  >
                    <QrCode size={12} className="text-[#ff6b00]" />
                    <span>Install Mobile App</span>
                  </button>
                </li>
              )}
            </ul>
          </div>

          {/* Col 3: Municipal Office Locations (2 cols) */}
          <div className="lg:col-span-2">
            <h4 className="font-heading font-bold text-xs uppercase tracking-wider text-white mb-2">
              Office Locations
            </h4>
            <div className="space-y-2 text-xs">
              <div>
                <strong className="text-white block font-semibold">North Caloocan Hub:</strong>
                <span className="text-slate-400">City Hall Complex, Camarin Road, Caloocan City</span>
              </div>
              <div>
                <strong className="text-white block font-semibold">South Caloocan Hub:</strong>
                <span className="text-slate-400">City Hall, 8th Avenue cor. F. Roxas, Caloocan City</span>
              </div>
            </div>
          </div>

          {/* Col 4: Official Contacts (3 cols) */}
          <div className="lg:col-span-3">
            <h4 className="font-heading font-bold text-xs uppercase tracking-wider text-white mb-2">
              Contact &amp; Assistance
            </h4>
            <ul className="space-y-1.5 text-xs">
              <li className="flex items-center gap-2">
                <PhoneCall size={13} className="text-[#ff6b00] shrink-0" />
                <span className="text-slate-400">Caloocan Rescue: <strong className="text-white font-mono-data">(02) 8888-2256</strong></span>
              </li>
              <li className="flex items-center gap-2">
                <PhoneCall size={13} className="text-slate-400 shrink-0" />
                <span className="text-slate-400">City Engineering: <strong className="text-white font-mono-data">(02) 8362-0220</strong></span>
              </li>
              <li className="flex items-center gap-2">
                <Mail size={13} className="text-slate-400 shrink-0" />
                <span className="font-mono-data text-[11px] text-slate-300">engineering@caloocan.gov.ph</span>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Bar: Copyright & Compliance */}
        <div className="pt-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <div className="text-center sm:text-left text-slate-400">
            &copy; {new Date().getFullYear()} City Government of Caloocan. All rights reserved.
          </div>

          <div className="flex items-center gap-6">
            <a
              href="/privacy.html"
              className="text-slate-400 hover:text-[#ff6b00] transition-colors cursor-pointer focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[#93c5fd]"
            >
              Privacy Policy
            </a>
            <button
              type="button"
              onClick={() => onOpenLegalModal && onOpenLegalModal('terms')}
              className="text-slate-400 hover:text-[#ff6b00] transition-colors cursor-pointer"
            >
              Citizen&apos;s Charter
            </button>

          </div>
        </div>

      </div>
    </footer>
  );
}
