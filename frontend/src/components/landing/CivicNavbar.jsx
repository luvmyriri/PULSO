import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Menu, X, PhoneCall, LogIn, UserPlus, LogOut, ArrowRight, User } from 'lucide-react';
import Branding from '../Branding';
import ThemeToggle from '../ThemeToggle';

/**
 * CivicNavbar
 * ─────────────────────────────────────────────────────────────────────────────
 * Persistent Top Navigation Bar adhering to the Sign-In Visibility Addendum:
 * - Persistent/sticky top-right placement (banking/gov standard).
 * - Filled, high-contrast button (orange accent) for "Sign In".
 * - Paired with secondary outlined "Create Account" button for new residents.
 * - Both actions remain pinned and visible in the collapsed mobile header.
 * - State-Aware: Replaces Sign In with recognizable account badge (avatar + name)
 *   when a session is detected in localStorage.
 * - Accessible: aria-labels, 4.5:1+ contrast ratio, keyboard focus rings.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export default function CivicNavbar({ onOpenTrackModal, mode }) {
  const { t, i18n } = useTranslation();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 15);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // State awareness: Detect active user session from localStorage
  useEffect(() => {
    try {
      const token = localStorage.getItem('pulso_token');
      const userStr = localStorage.getItem('pulso_user');
      if (token && userStr) {
        const parsed = JSON.parse(userStr);
        if (parsed && (parsed.full_name || parsed.name || parsed.email)) {
          setCurrentUser(parsed);
        }
      }
    } catch {
      setCurrentUser(null);
    }
  }, []);

  const handleSignOut = (e) => {
    e?.preventDefault();
    const wasGov = currentUser?.role && currentUser.role !== 'resident';
    localStorage.removeItem('pulso_token');
    localStorage.removeItem('pulso_user');
    setCurrentUser(null);
    window.location.href = wasGov ? '/gov' : '/login';
  };

  const getUserDestination = (user) => {
    if (!user) return '/dashboard';
    const role = user.role;
    if (role === 'lgu_official' || role === 'admin' || (role && role !== 'resident' && role !== 'dispatcher' && role !== 'field_responder')) {
      return '/gov';
    }
    if (role === 'dispatcher') return '/dispatcher';
    if (role === 'field_responder') return '/responder';
    return '/dashboard';
  };

  const getInitials = (user) => {
    if (!user) return 'U';
    const name = user.full_name || user.name || user.email || 'User';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const getDisplayName = (user) => {
    if (!user) return 'Resident';
    const name = user.full_name || user.name || user.email?.split('@')[0] || 'Resident';
    return name.length > 15 ? `${name.slice(0, 13)}…` : name;
  };

  const changeLanguage = (lang) => {
    i18n.changeLanguage(lang);
  };

  const scrollTo = (id) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      const offset = 75;
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = element.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    } else {
      window.location.href = `/#${id}`;
    }
  };

  const navLinks = [
    { label: t('landing.nav.report', 'Report Issue'), onClick: () => scrollTo('report-section') },
    { label: t('landing.nav.track', 'Track Report'), onClick: () => { setMobileMenuOpen(false); if (onOpenTrackModal) onOpenTrackModal(); else scrollTo('quick-actions'); } },
    { label: t('landing.nav.map', 'Live Map'), onClick: () => scrollTo('map-preview') },
    { label: t('landing.nav.howItWorks', 'How It Works'), onClick: () => scrollTo('how-it-works') },
    { label: t('landing.nav.hotlines', 'Hotlines'), onClick: () => scrollTo('hotlines') },
  ];

  return (
    <header className="sticky top-0 left-0 right-0 z-50 transition-all duration-200">
      <nav
        aria-label="Official Citizen Navigation"
        className={`w-full transition-all duration-200 ${
          scrolled
            ? 'bg-white/95 dark:bg-[#070a12]/95 backdrop-blur-md shadow-sm border-b border-slate-200 dark:border-slate-800 py-2 sm:py-2.5'
            : 'bg-white dark:bg-[#070a12] border-b border-slate-200/90 dark:border-slate-800 py-2.5 sm:py-3.5'
        }`}
      >
        <div className="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8 flex items-center justify-between gap-1.5 sm:gap-4">
          
          {/* Brand Logo & Municipal Identity: City Engineering Department Logo + Stacked LGU Hierarchy */}
          <a
            href="/"
            className="flex items-center gap-2 sm:gap-3 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b00] rounded-xl p-0.5 sm:p-1 shrink-0"
            aria-label="Caloocan City - City Engineering Department - Powered by PULSO Home"
          >
            {/* Official City Engineering Department Logo */}
            <img 
              src="/city-engineering-logo.png" 
              alt="City Engineering Department Logo" 
              className="h-8 w-8 xs:h-9 xs:w-9 sm:h-10 sm:w-10 aspect-square object-contain drop-shadow-sm rounded-full bg-white border border-slate-200 dark:border-slate-700 shrink-0 group-hover:scale-105 transition-transform duration-200"
            />

            <div className="flex flex-col text-left shrink-0 leading-tight">
              <span className="font-heading font-black text-[11px] sm:text-xs lg:text-[13px] tracking-tight text-slate-900 dark:text-white uppercase leading-none">
                CALOOCAN CITY
              </span>
              <span className="font-heading font-black text-xs sm:text-sm lg:text-base text-slate-800 dark:text-slate-100 tracking-tight leading-tight mt-0.5">
                <span className="xs:hidden">City Engineering Dept</span>
                <span className="hidden xs:inline">City Engineering Department</span>
              </span>
              <div className="flex items-center gap-1 text-[9px] sm:text-[11px] font-mono-data text-slate-400 dark:text-slate-500 leading-none mt-0.5">
                <span>powered by:</span>
                <span className="font-heading font-black text-[#ff6b00] uppercase tracking-wider">PULSO</span>
              </div>
            </div>
          </a>

          {/* Desktop Navigation Links */}
          <div className="hidden xl:flex items-center gap-5 xl:gap-6 text-xs xl:text-[13px] font-semibold text-slate-700 dark:text-slate-200 shrink-0">
            {navLinks.map((item, idx) => (
              <button
                key={idx}
                onClick={item.onClick}
                className="hover:text-[#ff6b00] dark:hover:text-[#ff6b00] transition-colors py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b00] rounded cursor-pointer whitespace-nowrap"
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Desktop Controls & Persistent Auth Area */}
          <div className="hidden md:flex items-center gap-2 sm:gap-2.5 shrink-0">
            
            {/* Language Toggle (EN / TL) */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 text-xs font-bold border border-slate-200/80 dark:border-slate-700">
              <button
                type="button"
                onClick={() => changeLanguage('en')}
                className={`px-2 py-1 rounded transition-colors cursor-pointer ${
                  !i18n.language?.startsWith('tl')
                    ? 'bg-white dark:bg-slate-700 text-[#ff6b00] shadow-xs font-black'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                aria-label="Switch to English"
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => changeLanguage('tl')}
                className={`px-2 py-1 rounded transition-colors cursor-pointer ${
                  i18n.language?.startsWith('tl')
                    ? 'bg-white dark:bg-slate-700 text-[#ff6b00] shadow-xs font-black'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                aria-label="Palitan sa Tagalog"
              >
                TL
              </button>
            </div>

            {/* Theme Toggle */}
            <ThemeToggle />

            {/* STATE-AWARE AUTHENTICATION WIDGET */}
            {currentUser ? (
              /* Already Signed In: Recognizable Account Indicator */
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl p-1 pr-2 shadow-2xs">
                <a
                  href={getUserDestination(currentUser)}
                  className="flex items-center gap-2 group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b00] rounded-lg"
                  aria-label={`Go to ${getDisplayName(currentUser)}'s account dashboard`}
                >
                  <div className="w-8 h-8 rounded-lg bg-[#ff6b00] text-white flex items-center justify-center text-xs font-mono-data font-black shadow-xs group-hover:scale-105 transition-transform">
                    {getInitials(currentUser)}
                  </div>
                  <div className="flex flex-col text-left leading-tight">
                    <span className="font-heading font-bold text-xs text-slate-900 dark:text-white group-hover:text-[#ff6b00] transition-colors truncate max-w-[110px]">
                      {getDisplayName(currentUser)}
                    </span>
                    <span className="text-[10px] font-mono-data font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                      Active
                    </span>
                  </div>
                </a>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="p-1 text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors ml-0.5 cursor-pointer rounded"
                  title="Sign out"
                  aria-label="Sign out of account"
                >
                  <LogOut size={14} />
                </button>
              </div>
            ) : mode === 'register' || (typeof window !== 'undefined' && window.location.pathname === '/register') ? (
              /* Register Context: Already registered? [ Sign In ] */
              <div className="flex items-center gap-2.5">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium hidden lg:inline">
                  Already registered?
                </span>
                <a
                  href="/login"
                  className="inline-flex items-center gap-2 px-4 py-2 sm:py-2.5 rounded-xl bg-[#ff6b00] hover:bg-[#e65c00] active:scale-[0.98] text-white text-xs sm:text-[13px] font-heading font-extrabold tracking-wide transition-all shadow-sm hover:shadow-md hover:shadow-orange-500/25 whitespace-nowrap cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#ff6b00]"
                  aria-label="Sign in to your account"
                >
                  <LogIn size={15} className="shrink-0" />
                  <span>Sign In</span>
                </a>
              </div>
            ) : (
              /* Not Signed In: Paired Create Account + Filled High-Contrast Sign In */
              <div className="flex items-center gap-2">
                {/* Secondary: Create Account (Outlined) */}
                <a
                  href="/register"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white hover:bg-slate-50 dark:bg-slate-800/90 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 hover:border-[#ff6b00] hover:text-[#ff6b00] dark:hover:border-[#ff6b00] dark:hover:text-[#ff6b00] text-xs sm:text-[13px] font-bold tracking-wide transition-all shadow-2xs hover:shadow-xs whitespace-nowrap cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b00]"
                  aria-label="Create a resident account"
                >
                  <UserPlus size={15} className="text-[#ff6b00] shrink-0" />
                  <span>Create Account</span>
                </a>

                {/* Primary Auth: Sign In (Filled Orange Accent - Highest Visual Rank) */}
                <a
                  href="/login"
                  className="inline-flex items-center gap-2 px-4.5 py-2 sm:py-2.5 rounded-xl bg-[#ff6b00] hover:bg-[#e65c00] active:scale-[0.98] text-white text-xs sm:text-[13px] font-heading font-extrabold tracking-wide transition-all shadow-sm hover:shadow-md hover:shadow-orange-500/25 whitespace-nowrap cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#ff6b00]"
                  aria-label="Sign in to your account"
                >
                  <LogIn size={15} className="shrink-0" />
                  <span>Sign In</span>
                </a>
              </div>
            )}

          </div>

          {/* Mobile Right Controls - Clean, fully responsive & pinned */}
          <div className="flex items-center gap-1.5 xs:gap-2 md:hidden shrink-0">
            {currentUser ? (
              /* Mobile Signed-In Avatar Pill */
              <a
                href={getUserDestination(currentUser)}
                className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-orange-50 dark:bg-slate-800 border border-orange-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white shrink-0"
                aria-label={`Go to ${getDisplayName(currentUser)}'s account`}
              >
                <span className="w-5 h-5 rounded bg-[#ff6b00] text-white flex items-center justify-center text-[9px] font-black">
                  {getInitials(currentUser)}
                </span>
                <span className="max-w-[65px] truncate text-[11px] font-heading">
                  {getDisplayName(currentUser)}
                </span>
              </a>
            ) : mode === 'register' || (typeof window !== 'undefined' && window.location.pathname === '/register') ? (
              <a
                href="/login"
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#ff6b00] text-white font-bold text-xs shadow-2xs whitespace-nowrap"
                aria-label="Sign in to your account"
              >
                <LogIn size={13} />
                <span>Sign In</span>
              </a>
            ) : mode === 'login' || (typeof window !== 'undefined' && window.location.pathname === '/login') ? (
              <a
                href="/register"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-xs shadow-2xs whitespace-nowrap"
                aria-label="Create a resident account"
              >
                <UserPlus size={13} className="text-[#ff6b00]" />
                <span className="text-[11px]">Sign Up</span>
              </a>
            ) : (
              /* Mobile Not Signed-In: Clean Sign In button (Sign up available in mobile drawer) */
              <a
                href="/login"
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#ff6b00] text-white font-bold text-xs shadow-2xs whitespace-nowrap"
                aria-label="Sign in to your account"
              >
                <LogIn size={13} />
                <span>Sign In</span>
              </a>
            )}

            <ThemeToggle className="hidden sm:flex" />

            {/* Mobile Hamburger Toggle for Secondary Nav Links - guaranteed shrink-0 visibility */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="shrink-0 p-1.5 sm:p-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b00] cursor-pointer"
              aria-label={mobileMenuOpen ? 'Close Menu' : 'Open Menu'}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>

        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div
            id="mobile-navigation"
            className="md:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#070a12] px-4 pt-3 pb-6 space-y-3 shadow-xl"
          >
            <div className="space-y-1">
              {navLinks.map((item, idx) => (
                <button
                  key={idx}
                  onClick={item.onClick}
                  className="w-full text-left py-2.5 px-3 rounded-xl text-sm font-bold text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between px-2">
              <span className="text-xs font-semibold text-slate-500">Language:</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => changeLanguage('en')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                    !i18n.language?.startsWith('tl')
                      ? 'bg-[#ff6b00] text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  English
                </button>
                <button
                  type="button"
                  onClick={() => changeLanguage('tl')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                    i18n.language?.startsWith('tl')
                      ? 'bg-[#ff6b00] text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  Tagalog
                </button>
              </div>
            </div>

            {/* Theme Row in Mobile Drawer */}
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between px-2">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Theme:</span>
              <ThemeToggle size={14} />
            </div>

            {/* Mobile Drawer Auth Actions */}
            {currentUser ? (
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2">
                <a
                  href={getUserDestination(currentUser)}
                  className="flex items-center justify-between w-full py-3 px-4 rounded-xl bg-orange-50 dark:bg-slate-800 border border-orange-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold text-sm"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-md bg-[#ff6b00] text-white flex items-center justify-center text-xs font-bold">
                      {getInitials(currentUser)}
                    </span>
                    <span>{getDisplayName(currentUser)}</span>
                  </div>
                  <ArrowRight size={16} className="text-[#ff6b00]" />
                </a>

                <button
                  type="button"
                  onClick={handleSignOut}
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50/50 dark:bg-red-950/20 text-red-600 dark:text-red-400 font-bold text-xs"
                >
                  <LogOut size={14} />
                  <span>Sign Out</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <a
                  href="/register"
                  className="flex items-center justify-center gap-1.5 w-full py-3 text-center rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/90 text-slate-900 dark:text-white font-bold text-xs sm:text-sm hover:border-[#ff6b00] hover:text-[#ff6b00] transition-colors shadow-2xs"
                  aria-label="Create a resident account"
                >
                  <UserPlus size={14} className="text-[#ff6b00]" />
                  <span>Create Account</span>
                </a>
                <a
                  href="/login"
                  className="flex items-center justify-center gap-1.5 w-full py-3 text-center rounded-xl bg-[#ff6b00] text-white font-bold text-xs sm:text-sm shadow-sm hover:bg-[#e65c00] transition-colors"
                  aria-label="Sign in to your account"
                >
                  <LogIn size={14} />
                  <span>Sign In</span>
                </a>
              </div>
            )}

            <a
              href="tel:0288882256"
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 font-bold text-xs border border-red-200 dark:border-red-900"
            >
              <PhoneCall size={14} /> Emergency: (02) 8888-2256
            </a>
          </div>
        )}
      </nav>
    </header>
  );
}
