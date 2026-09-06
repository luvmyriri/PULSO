import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { 
    MapPinned, ArrowRight,
    Menu, X, Route as RouteIcon, Zap, Shield,
    Users, CheckCircle2, ClipboardCheck, Camera,
    Bot, Headphones, Wrench, ExternalLink,
    UserCheck, Accessibility, Heart, FileText, Droplets, Lightbulb,
    Building2, User,
    AlertTriangle, PhoneCall, Plus, Compass, Home, Search, Activity
} from 'lucide-react';
import ResidentBranding from '../components/ResidentBranding';
import ResidentCinematicHero from '../components/ResidentCinematicHero';
import ResidentThemeToggle from '../components/ResidentThemeToggle';
import TermsModal from '../components/TermsModal';
import { getUser } from '../utils/auth';
import '../index.css';

export default function Landing() {
    const { t, i18n } = useTranslation();
    const [scrolled, setScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const user = getUser();

    // Modal state for legal content
    const [modalConfig, setModalConfig] = useState({
        isOpen: false,
        type: 'terms'
    });

    const openModal = (type) => {
        setModalConfig({
            isOpen: true,
            type: type
        });
    };

    const closeModal = () => {
        setModalConfig(prev => ({ ...prev, isOpen: false }));
    };

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const toggleLanguage = () => {
        const nextLang = i18n.language === 'tl' ? 'en' : 'tl';
        i18n.changeLanguage(nextLang);
    };

    const scrollToFeatures = () => {
        document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
    };

    return (
        <div className="min-h-screen flex flex-col font-sans bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 relative transition-colors duration-300 pb-16 md:pb-0">
            
            {/* ── TOP FIXED NAVBAR ────────────────────────────────────────────── */}
            <nav className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${
                scrolled 
                    ? 'bg-white/90 dark:bg-slate-900/90 backdrop-blur-md shadow-sm py-3 border-b border-slate-200/80 dark:border-slate-800/80' 
                    : 'bg-transparent py-5'
            }`}>
                <div className="w-full max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 flex justify-between items-center gap-3 lg:gap-4 xl:gap-6">
                    {/* Left: Branding */}
                    <div className="flex items-center flex-shrink-0">
                        <ResidentBranding size={scrolled ? "h-9" : "h-10"} isOverHero={!scrolled} />
                    </div>

                    {/* Center: Anchor Links — white when over hero (transparent), slate when scrolled */}
                    <ul className={`hidden lg:flex items-center gap-2.5 lg:gap-3 xl:gap-5 2xl:gap-8 text-xs xl:text-[13px] 2xl:text-sm font-semibold transition-colors duration-300 ${
                        scrolled
                            ? 'text-slate-600 dark:text-slate-300'
                            : 'text-white/90 drop-shadow-sm'
                    }`}>
                        <li className="whitespace-nowrap"><a href="#features" className="hover:text-orange-400 transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-orange-500 rounded px-1.5 py-1 whitespace-nowrap">{t('landing.nav.scope', 'Infrastructure Scope')}</a></li>
                        <li className="whitespace-nowrap"><a href="#howitworks" className="hover:text-orange-400 transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-orange-500 rounded px-1.5 py-1 whitespace-nowrap">{t('landing.nav.howitworks', 'How It Works')}</a></li>
                        <li className="whitespace-nowrap"><a href="#solutions" className="hover:text-orange-400 transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-orange-500 rounded px-1.5 py-1 whitespace-nowrap">{t('landing.solutions.badge', 'Utility Sectors')}</a></li>
                        <li className="whitespace-nowrap"><a href="#cityservices" className="hover:text-orange-400 transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-orange-500 rounded px-1.5 py-1 whitespace-nowrap">{t('landing.nav.services', 'City Services')}</a></li>
                        <li className="whitespace-nowrap"><a href="#about" className="hover:text-orange-400 transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-orange-500 rounded px-1.5 py-1 whitespace-nowrap">{t('landing.nav.about', 'Engineering Office')}</a></li>
                    </ul>

                    {/* Right: Actions with responsive equal breathing room */}
                    <div className="hidden md:flex items-center gap-2 lg:gap-2.5 xl:gap-3 2xl:gap-4 flex-shrink-0">
                        {/* Language Switcher */}
                        <button
                            type="button"
                            onClick={toggleLanguage}
                            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold font-sans tracking-wider transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-orange-500 cursor-pointer border whitespace-nowrap ${
                                scrolled
                                    ? 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                                    : 'border-white/30 text-white/90 hover:bg-white/15'
                            }`}
                            aria-label="Toggle language"
                        >
                            {i18n.language === 'tl' ? 'EN' : 'TL'}
                        </button>

                        {/* Theme Switcher Toggle */}
                        <ResidentThemeToggle size={14} isOverHero={!scrolled} />

                        {/* Visual Subtle Divider between Preferences and CTAs */}
                        <span className={`h-5 w-px transition-colors ${scrolled ? 'bg-slate-200 dark:bg-slate-800' : 'bg-white/25'}`} aria-hidden="true" />

                        {/* Secondary: Track link */}
                        <Link
                            to="/track"
                            className={`text-xs font-bold px-2.5 xl:px-3.5 py-2 rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-orange-500 whitespace-nowrap ${
                                scrolled
                                    ? 'text-slate-700 dark:text-slate-300 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                                    : 'text-white/90 hover:text-white hover:bg-white/10'
                            }`}
                        >
                            {t('landing.nav.track', 'Track a Report')}
                        </Link>

                        {/* Resident Login / Account Section */}
                        {user ? (
                            <Link
                                to="/app"
                                className="flex items-center gap-1.5 xl:gap-2 bg-orange-600 hover:bg-orange-700 text-white px-3.5 xl:px-4.5 py-2 xl:py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-orange-500 cursor-pointer whitespace-nowrap"
                            >
                                <User size={15} className="shrink-0" />
                                <span>{user.name ? user.name.split(' ')[0] : t('landing.nav.dashboard', 'Dashboard')}</span>
                            </Link>
                        ) : (
                            <Link
                                to="/login"
                                className="flex items-center gap-1.5 xl:gap-2 bg-orange-600 hover:bg-orange-700 text-white px-3.5 xl:px-4.5 py-2 xl:py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-orange-500 cursor-pointer whitespace-nowrap"
                            >
                                <User size={15} className="shrink-0" />
                                <span>{t('landing.nav.login', 'Sign In')}</span>
                            </Link>
                        )}

                        {/* Discrete Staff Gateway */}
                        <Link
                            to="/gov"
                            title="Government and Staff Gateway"
                            className={`p-2 xl:p-2.5 rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-orange-500 border whitespace-nowrap shrink-0 ${
                                scrolled
                                    ? 'text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-200/60 dark:border-slate-800/60'
                                    : 'text-white/70 hover:text-white border-white/20 hover:bg-white/15'
                            }`}
                        >
                            <Shield size={16} />
                        </Link>
                    </div>

                    {/* Mobile Menu Toggle */}
                    <button 
                        className={`md:hidden p-2 rounded-lg focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-orange-500 transition-colors ${
                            scrolled ? 'text-slate-800 dark:text-slate-200' : 'text-white'
                        }`}
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        aria-label="Toggle navigation menu"
                    >
                        {mobileMenuOpen ? <X size={26} /> : <Menu size={26} />}
                    </button>
                </div>

                {/* Mobile Navigation Dropdown */}
                {mobileMenuOpen && (
                    <div className="absolute top-full left-0 w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl shadow-2xl py-6 px-6 flex flex-col gap-3 md:hidden transition-colors border-b border-slate-200 dark:border-slate-800">
                        <a href="#features" className="text-slate-800 dark:text-slate-200 font-bold py-2 border-b border-slate-100 dark:border-slate-800" onClick={() => setMobileMenuOpen(false)}>{t('landing.nav.scope', 'Infrastructure Scope')}</a>
                        <a href="#howitworks" className="text-slate-800 dark:text-slate-200 font-bold py-2 border-b border-slate-100 dark:border-slate-800" onClick={() => setMobileMenuOpen(false)}>{t('landing.nav.howitworks', 'How It Works')}</a>
                        <a href="#cityservices" className="text-slate-800 dark:text-slate-200 font-bold py-2 border-b border-slate-100 dark:border-slate-800" onClick={() => setMobileMenuOpen(false)}>{t('landing.nav.services', 'City Services')}</a>
                        <a href="#about" className="text-slate-800 dark:text-slate-200 font-bold py-2 mb-2" onClick={() => setMobileMenuOpen(false)}>{t('landing.nav.about', 'Engineering Office')}</a>

                        <div className="flex items-center justify-between py-2 border-t border-slate-100 dark:border-slate-800">
                            <span className="text-xs font-bold text-slate-500">Language / Theme</span>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={toggleLanguage}
                                    className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-bold"
                                >
                                    {i18n.language === 'tl' ? 'EN' : 'TL'}
                                </button>
                                <ResidentThemeToggle size={14} />
                            </div>
                        </div>

                        {user ? (
                            <Link 
                                to="/app" 
                                onClick={() => setMobileMenuOpen(false)} 
                                className="w-full justify-center flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-5 py-3 rounded-xl font-bold text-sm transition-all shadow-md"
                            >
                                <User size={16} />
                                <span>{user.name ? user.name.split(' ')[0] : t('landing.nav.dashboard', 'Dashboard')}</span>
                            </Link>
                        ) : (
                            <Link 
                                to="/login" 
                                onClick={() => setMobileMenuOpen(false)} 
                                className="w-full justify-center flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-5 py-3 rounded-xl font-bold text-sm transition-all shadow-md"
                            >
                                <User size={16} />
                                <span>{t('landing.nav.login', 'Sign In')}</span>
                            </Link>
                        )}

                        <Link 
                            to="/report" 
                            onClick={() => setMobileMenuOpen(false)} 
                            className="w-full justify-center flex items-center gap-2 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-5 py-2.5 rounded-xl font-bold text-xs transition-all border border-slate-200 dark:border-slate-700"
                        >
                            <span>{t('landing.nav.report', 'Report an Issue')}</span>
                            <ArrowRight size={14} />
                        </Link>

                        <Link 
                            to="/track" 
                            onClick={() => setMobileMenuOpen(false)} 
                            className="w-full justify-center flex items-center gap-2 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-5 py-2.5 rounded-xl font-bold text-xs transition-all border border-slate-200 dark:border-slate-700"
                        >
                            {t('landing.nav.track', 'Track a Report')}
                        </Link>

                        <Link 
                            to="/gov" 
                            onClick={() => setMobileMenuOpen(false)} 
                            className="w-full justify-center flex items-center gap-2 text-slate-500 dark:text-slate-400 py-2 text-xs font-semibold"
                        >
                            <Shield size={14} />
                            <span>Staff Gateway (Government)</span>
                        </Link>
                    </div>
                )}
            </nav>

            {/* ── CIVIC APERTURE HERO ─────────────────────────────────────────── */}
            <ResidentCinematicHero onExplore={scrollToFeatures} />

            {/* ── CIVIC ONBOARDING & PRIORITY EMERGENCY CLUSTER ────────────────── */}
            <section className="relative z-20 max-w-7xl 2xl:max-w-[1600px] mx-auto px-6 sm:px-8 lg:px-12 w-full pt-8 sm:pt-12 pb-14 sm:pb-16 space-y-6 sm:space-y-7">
                {/* 24/7 Hotline Emergency Alert Card */}
                <div className="rounded-2xl border border-amber-200/90 dark:border-amber-800/50 border-l-4 border-l-amber-500 bg-amber-50/80 dark:bg-amber-950/25 p-5 sm:p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-5 transition-colors">
                    <div className="flex items-start sm:items-center gap-4">
                        <div className="p-3 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 shrink-0 mt-0.5 sm:mt-0">
                            <AlertTriangle size={22} strokeWidth={2.2} />
                        </div>
                        <div>
                            <span className="inline-block px-2.5 py-0.5 rounded-full bg-amber-100/90 dark:bg-amber-900/40 text-amber-900 dark:text-amber-200 border border-amber-200/70 dark:border-amber-800/50 text-[10px] font-bold uppercase tracking-wider mb-1">
                                {t('landing.emergency.badge', 'Life / Safety Emergency')}
                            </span>
                            <p className="text-xs sm:text-sm text-slate-800 dark:text-amber-100/90 font-medium leading-relaxed">
                                {t('landing.emergency.notice', 'For life-threatening emergencies, open flood hazards, or downed live power cables, please call the 24/7 hotline immediately.')}
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 shrink-0 w-full md:w-auto justify-end">
                        <a
                            href="tel:911"
                            className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-1.5 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-red-400 whitespace-nowrap"
                        >
                            <PhoneCall size={14} />
                            <span>{t('landing.emergency.call911', 'Dial 911')}</span>
                        </a>
                        <a
                            href="tel:8881234"
                            className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-1.5 border border-slate-700/60 dark:border-slate-700 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-amber-400 whitespace-nowrap"
                        >
                            <PhoneCall size={14} />
                            <span>{t('landing.emergency.rescueHotline', 'Caloocan Rescue: (02) 888-1234')}</span>
                        </a>
                    </div>
                </div>

                {/* 3-Step Quick Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 xl:gap-7">
                    <div className="p-6 rounded-2xl border border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-slate-900/90 shadow-xs hover:shadow-md hover:border-orange-300 dark:hover:border-slate-700 transition-all flex items-start gap-4.5">
                        <div className="w-11 h-11 rounded-xl bg-orange-50 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400 border border-orange-200/80 dark:border-orange-800/60 flex items-center justify-center font-mono font-bold text-sm shrink-0">
                            01
                        </div>
                        <div>
                            <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white tracking-tight">
                                {t('landing.quickSteps.step1Title', 'Pin Location & Boundary')}
                            </h3>
                            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                                {t('landing.quickSteps.step1Desc', 'Tag the exact spot across North or South Caloocan via GPS or interactive map.')}
                            </p>
                        </div>
                    </div>

                    <div className="p-6 rounded-2xl border border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-slate-900/90 shadow-xs hover:shadow-md hover:border-blue-300 dark:hover:border-slate-700 transition-all flex items-start gap-4.5">
                        <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-200/80 dark:border-blue-800/60 flex items-center justify-center font-mono font-bold text-sm shrink-0">
                            02
                        </div>
                        <div>
                            <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white tracking-tight">
                                {t('landing.quickSteps.step2Title', 'Upload Photo Evidence')}
                            </h3>
                            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                                {t('landing.quickSteps.step2Desc', 'Capture true-color photos with automatic non-blocking advisory AI triage.')}
                            </p>
                        </div>
                    </div>

                    <div className="p-6 rounded-2xl border border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-slate-900/90 shadow-xs hover:shadow-md hover:border-emerald-300 dark:hover:border-slate-700 transition-all flex items-start gap-4.5">
                        <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800/60 flex items-center justify-center font-mono font-bold text-sm shrink-0">
                            03
                        </div>
                        <div>
                            <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white tracking-tight">
                                {t('landing.quickSteps.step3Title', 'Follow Live Resolution')}
                            </h3>
                            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                                {t('landing.quickSteps.step3Desc', 'Track the 6-stage repair timeline publicly or link it seamlessly to your account.')}
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── INFRASTRUCTURE SCOPE SECTION ─────────────────────────────────── */}
            <section id="features" className="py-20 bg-white dark:bg-slate-900/50 border-y border-slate-200 dark:border-slate-800 transition-colors">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center max-w-3xl mx-auto mb-14">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 text-xs font-bold uppercase tracking-wider mb-2">
                            <Compass size={14} />
                            <span>{t('landing.features.badge', 'Infrastructure Scope')}</span>
                        </div>
                        <h2 className="font-display font-bold text-3xl sm:text-4xl text-slate-900 dark:text-white">
                            {t('landing.features.title', 'TYPES OF PUBLIC INFRASTRUCTURE')}
                        </h2>
                        <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 mt-2">
                            {t('landing.features.subtitle', 'Public infrastructure managed across Caloocan City by the City Engineering Department.')}
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 hover:shadow-md transition-all">
                            <div className="w-12 h-12 bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 rounded-xl flex items-center justify-center mb-4">
                                <RouteIcon size={24} />
                            </div>
                            <h3 className="font-bold text-base text-slate-900 dark:text-white mb-2">{t('landing.features.f1_title', 'Horizontal Infrastructure')}</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{t('landing.features.f1_desc', 'Roads, local bridges, alleys, pathways, and parking areas.')}</p>
                        </div>

                        <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 hover:shadow-md transition-all">
                            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center mb-4">
                                <Building2 size={24} />
                            </div>
                            <h3 className="font-bold text-base text-slate-900 dark:text-white mb-2">{t('landing.features.f2_title', 'Vertical Infrastructure')}</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{t('landing.features.f2_desc', 'City halls, public schools, local health centers, multipurpose gyms, and municipal warehouses.')}</p>
                        </div>

                        <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 hover:shadow-md transition-all">
                            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center mb-4">
                                <Droplets size={24} />
                            </div>
                            <h3 className="font-bold text-base text-slate-900 dark:text-white mb-2">{t('landing.features.f3_title', 'Drainage & Water Systems')}</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{t('landing.features.f3_desc', 'Open canals, underground lateral storm drains, sewer lines, and declogging networks.')}</p>
                        </div>

                        <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 hover:shadow-md transition-all">
                            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 rounded-xl flex items-center justify-center mb-4">
                                <MapPinned size={24} />
                            </div>
                            <h3 className="font-bold text-base text-slate-900 dark:text-white mb-2">{t('landing.features.f4_title', 'Public Spaces')}</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{t('landing.features.f4_desc', 'City parks, plazas, monuments, and open recreational grounds.')}</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── HOW IT WORKS (5-STEP PULSELINE) ──────────────────────────────── */}
            <section id="howitworks" className="py-20 bg-slate-50 dark:bg-slate-950 transition-colors">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center max-w-3xl mx-auto mb-14">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 text-xs font-bold uppercase tracking-wider mb-2">
                            <ClipboardCheck size={14} />
                            <span>{t('landing.howitworks.badge', 'Simple Process')}</span>
                        </div>
                        <h2 className="font-display font-bold text-3xl sm:text-4xl text-slate-900 dark:text-white">
                            {t('landing.howitworks.title', 'HOW PULSO WORKS')}
                        </h2>
                        <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 mt-2">
                            {t('landing.howitworks.subtitle', 'From reporting a problem to completing repairs in Caloocan City.')}
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-5 gap-6 relative">
                        {[
                            { icon: <UserCheck size={20} />, key: 's1', num: '1', title: 'Problem Logged', desc: 'Citizens report utility hazards on the city map with no account required.' },
                            { icon: <Camera size={20} />, key: 's2', num: '2', title: 'AI Triage & Map', desc: 'Geospatial validation verifies boundary, category, and duplicate proximity.' },
                            { icon: <Bot size={20} />, key: 's3', num: '3', title: 'Work Order Auth', desc: 'City engineers authorize prioritized engineering work orders.' },
                            { icon: <Headphones size={20} />, key: 's4', num: '4', title: 'Crew Dispatched', desc: 'District field crews deploy materials and heavy equipment.' },
                            { icon: <Wrench size={20} />, key: 's5', num: '5', title: 'Repair Completed', desc: 'Photographic proof uploaded and ticket closed on public registry.' },
                        ].map((step) => (
                            <div key={step.key} className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center flex flex-col items-center shadow-sm">
                                <div className="w-12 h-12 rounded-2xl bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 flex items-center justify-center font-bold mb-3 shadow-inner">
                                    {step.icon}
                                </div>
                                <span className="text-[10px] font-mono font-bold text-orange-600 uppercase tracking-widest">Step 0{step.num}</span>
                                <h3 className="font-bold text-sm text-slate-900 dark:text-white mt-1 mb-1.5">{t(`landing.howitworks.${step.key}_title`, step.title)}</h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{t(`landing.howitworks.${step.key}_desc`, step.desc)}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── ESSENTIAL CITY SERVICES ──────────────────────────────────────── */}
            <section id="solutions" className="py-20 bg-white dark:bg-slate-900/50 border-y border-slate-200 dark:border-slate-800 transition-colors">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center max-w-3xl mx-auto mb-14">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-xs font-bold uppercase tracking-wider mb-2">
                            <Zap size={14} />
                            <span>{t('landing.solutions.badge', 'Utility Sectors')}</span>
                        </div>
                        <h2 className="font-display font-bold text-3xl sm:text-4xl text-slate-900 dark:text-white">
                            {t('landing.solutions.title', 'ESSENTIAL CITY SERVICES')}
                        </h2>
                        <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 mt-2">
                            {t('landing.solutions.subtitle', 'Comprehensive engineering support across critical civic systems.')}
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
                            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4">
                                <Droplets size={22} />
                            </div>
                            <h3 className="font-bold text-base text-slate-900 dark:text-white mb-2">{t('landing.solutions.s1_title', 'Water Supply & Distribution')}</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4">{t('landing.solutions.s1_desc', 'Monitor water pressure, detect pipe leaks, and check main distribution lines.')}</p>
                            <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                                <li className="flex items-center gap-2"><CheckCircle2 size={13} className="text-blue-500" /> {t('landing.solutions.s1_l1', 'Live pressure telemetry')}</li>
                                <li className="flex items-center gap-2"><CheckCircle2 size={13} className="text-blue-500" /> {t('landing.solutions.s1_l2', 'Rapid leak containment')}</li>
                            </ul>
                        </div>

                        <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
                            <div className="w-10 h-10 rounded-xl bg-yellow-100 dark:bg-yellow-950/60 text-yellow-600 dark:text-yellow-400 flex items-center justify-center mb-4">
                                <Lightbulb size={22} />
                            </div>
                            <h3 className="font-bold text-base text-slate-900 dark:text-white mb-2">{t('landing.solutions.s2_title', 'Power & Street Lighting')}</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4">{t('landing.solutions.s2_desc', 'Track underground power cables and fix street light outages fast.')}</p>
                            <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                                <li className="flex items-center gap-2"><CheckCircle2 size={13} className="text-yellow-600" /> {t('landing.solutions.s2_l1', 'Grid outage mapping')}</li>
                                <li className="flex items-center gap-2"><CheckCircle2 size={13} className="text-yellow-600" /> {t('landing.solutions.s2_l2', 'Night streetlight patrols')}</li>
                            </ul>
                        </div>

                        <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
                            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-4">
                                <RouteIcon size={22} />
                            </div>
                            <h3 className="font-bold text-base text-slate-900 dark:text-white mb-2">{t('landing.solutions.s3_title', 'Roads & Bridges')}</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4">{t('landing.solutions.s3_desc', 'Pavement condition indexing, pothole patching, and bridge structural inspections.')}</p>
                            <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                                <li className="flex items-center gap-2"><CheckCircle2 size={13} className="text-amber-600" /> {t('landing.solutions.s3_l1', 'Continuous road surveys')}</li>
                                <li className="flex items-center gap-2"><CheckCircle2 size={13} className="text-amber-600" /> {t('landing.solutions.s3_l2', 'Heavy vehicle route monitoring')}</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── CITY SERVICES PORTAL GATEWAY ─────────────────────────────────── */}
            <section id="cityservices" className="py-20 bg-slate-50 dark:bg-slate-950 transition-colors">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center max-w-3xl mx-auto mb-14">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-xs font-bold uppercase tracking-wider mb-2">
                            <ExternalLink size={14} />
                            <span>{t('landing.services.badge', 'City Portals')}</span>
                        </div>
                        <h2 className="font-display font-bold text-3xl sm:text-4xl text-slate-900 dark:text-white">
                            {t('landing.services.title', 'CALOOCAN PUBLIC SERVICES GATEWAY')}
                        </h2>
                        <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 mt-2">
                            {t('landing.services.subtitle', 'Direct access to specialized citizen welfare and city administration portals.')}
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between">
                            <div>
                                <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3">
                                    <Users size={22} />
                                </div>
                                <h3 className="font-bold text-base text-slate-900 dark:text-white">{t('landing.services.senior_title', 'Senior Citizen Portal')}</h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-4">{t('landing.services.senior_desc', 'Senior ID registration and verification records.')}</p>
                            </div>
                            <a href="http://oscanew.caloocanservices.online/" target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1">
                                <span>{t('landing.services.senior_l1', 'Open Portal')}</span>
                                <ExternalLink size={12} />
                            </a>
                        </div>

                        <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between">
                            <div>
                                <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-3">
                                    <Accessibility size={22} />
                                </div>
                                <h3 className="font-bold text-base text-slate-900 dark:text-white">{t('landing.services.pwd_title', 'PWD Welfare Portal')}</h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-4">{t('landing.services.pwd_desc', 'Assistance directory for Persons with Disability.')}</p>
                            </div>
                            <a href="https://pwd.caloocanservices.online/" target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1">
                                <span>{t('landing.services.pwd_l1', 'Open Portal')}</span>
                                <ExternalLink size={12} />
                            </a>
                        </div>

                        <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between">
                            <div>
                                <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-3">
                                    <Heart size={22} />
                                </div>
                                <h3 className="font-bold text-base text-slate-900 dark:text-white">{t('landing.services.solo_title', 'Solo Parent Portal')}</h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-4">{t('landing.services.solo_desc', 'Benefits tracking and single parent support.')}</p>
                            </div>
                            <a href="https://soloparent.caloocanservices.online/" target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1">
                                <span>{t('landing.services.solo_l1', 'Open Portal')}</span>
                                <ExternalLink size={12} />
                            </a>
                        </div>

                        <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between">
                            <div>
                                <div className="w-10 h-10 rounded-xl bg-teal-100 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center mb-3">
                                    <FileText size={22} />
                                </div>
                                <h3 className="font-bold text-base text-slate-900 dark:text-white">{t('landing.services.gad_title', 'GAD Plan Portal')}</h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-4">{t('landing.services.gad_desc', 'Gender and Development project directory.')}</p>
                            </div>
                            <a href="https://gadplan.caloocanservices.online/" target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1">
                                <span>{t('landing.services.gad_l1', 'Open Portal')}</span>
                                <ExternalLink size={12} />
                            </a>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── ABOUT LGU OFFICE ────────────────────────────────────────────── */}
            <section id="about" className="py-20 bg-white dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-800 transition-colors">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                    <div>
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 text-xs font-bold uppercase tracking-wider mb-3">
                            <Users size={14} />
                            <span>{t('landing.about.badge', 'About Us')}</span>
                        </div>
                        <h2 className="font-display font-bold text-3xl sm:text-4xl text-slate-900 dark:text-white leading-tight">
                            {t('landing.about.title', 'CITY ENGINEERING OFFICE')}
                        </h2>
                        <div className="mt-4 space-y-3 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                            <p dangerouslySetInnerHTML={{ __html: t('landing.about.p1', 'The <strong>City Engineering Office of Caloocan</strong> is tasked with planning, designing, constructing, and maintaining public infrastructure across all 188 barangays.').replace('<1>', '<strong>').replace('</1>', '</strong>') }} />
                            <p>{t('landing.about.p2', 'Through PULSO, our engineers bridge real-time citizen reports with field work crews to deliver accountable, transparent, and prompt public repairs.')}</p>
                        </div>

                        <div className="grid grid-cols-3 gap-4 mt-8 pt-8 border-t border-slate-100 dark:border-slate-800">
                            <div>
                                <span className="font-display font-bold text-2xl sm:text-3xl text-slate-900 dark:text-white">{t('landing.about.stat1_val', '188')}</span>
                                <span className="block text-[11px] font-bold text-orange-600 uppercase tracking-wider mt-0.5">{t('landing.about.stat1_lbl', 'Barangays Covered')}</span>
                            </div>
                            <div>
                                <span className="font-display font-bold text-2xl sm:text-3xl text-slate-900 dark:text-white">{t('landing.about.stat2_val', '24/7')}</span>
                                <span className="block text-[11px] font-bold text-orange-600 uppercase tracking-wider mt-0.5">{t('landing.about.stat2_lbl', 'Operations Monitoring')}</span>
                            </div>
                            <div>
                                <span className="font-display font-bold text-2xl sm:text-3xl text-slate-900 dark:text-white">{t('landing.about.stat3_val', '<24h')}</span>
                                <span className="block text-[11px] font-bold text-orange-600 uppercase tracking-wider mt-0.5">{t('landing.about.stat3_lbl', 'Triage Target')}</span>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-3xl p-6 sm:p-8 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md space-y-4">
                        <h3 className="font-bold text-base text-slate-900 dark:text-white">Municipal Jurisdiction Bounds</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                            PULSO operates exclusively within the governed territorial boundaries of Caloocan City North and South.
                        </p>
                        <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono space-y-1 text-slate-700 dark:text-slate-300">
                            <div>South Sector: 14.6300°N - 14.6780°N · 120.9500°E - 121.0120°E</div>
                            <div>North Sector: 14.6850°N - 14.8200°N · 120.9950°E - 121.1400°E</div>
                        </div>
                        <div className="pt-2 flex gap-3">
                            <Link
                                to="/report"
                                className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-orange-500"
                            >
                                Report an Issue Now
                            </Link>
                            <Link
                                to="/track"
                                className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-orange-500"
                            >
                                Track a Ticket
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── COMPREHENSIVE FOOTER ─────────────────────────────────────────── */}
            <footer className="bg-slate-900 text-slate-300 pt-16 pb-12 border-t border-slate-800">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
                        <div className="space-y-4">
                            <ResidentBranding size="h-9" forceLightText={true} />
                            <p className="text-xs text-slate-400 leading-relaxed">
                                {t('landing.footer.desc', 'PULSO: Transparent City Engineering Management & Public Works Reporting for Caloocan City.')}
                            </p>
                        </div>

                        <div>
                            <h4 className="text-white font-bold text-sm uppercase tracking-wider mb-4">Portals</h4>
                            <ul className="space-y-2 text-xs">
                                <li><Link to="/report" className="hover:text-orange-400 transition-colors">Report an Issue (No Account)</Link></li>
                                <li><Link to="/track" className="hover:text-orange-400 transition-colors">Track a Report</Link></li>
                                <li><Link to="/login" className="hover:text-orange-400 transition-colors">Resident Sign In</Link></li>
                                <li><Link to="/gov" className="hover:text-orange-400 transition-colors">Government & Staff Gateway</Link></li>
                            </ul>
                        </div>

                        <div>
                            <h4 className="text-white font-bold text-sm uppercase tracking-wider mb-4">Office & Contacts</h4>
                            <ul className="space-y-2 text-xs text-slate-400">
                                <li>City Engineering Department</li>
                                <li>Caloocan City Hall, Camarin Rd</li>
                                <li>Direct Hotline: (02) 888-1234</li>
                                <li>National Emergency: 911</li>
                            </ul>
                        </div>

                        <div>
                            <h4 className="text-white font-bold text-sm uppercase tracking-wider mb-4">Legal & Privacy</h4>
                            <ul className="space-y-2 text-xs">
                                <li><button onClick={() => openModal('privacy')} className="hover:text-orange-400 text-left transition-colors">Privacy Policy (RA 10173)</button></li>
                                <li><button onClick={() => openModal('terms')} className="hover:text-orange-400 text-left transition-colors">Terms of Service</button></li>
                                <li><button onClick={() => openModal('cookies')} className="hover:text-orange-400 text-left transition-colors">Cookie Policy</button></li>
                            </ul>
                        </div>
                    </div>

                    <div className="pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
                        <p>&copy; {new Date().getFullYear()} City Government of Caloocan. All rights reserved.</p>
                        <p className="font-mono">PULSO v0.2 · Civic Aperture</p>
                    </div>
                </div>
            </footer>

            {/* ── MOBILE 5-DESTINATION BOTTOM NAVIGATION BAR ──────────────────── */}
            <div className="md:hidden fixed bottom-0 left-0 w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 z-50 px-4 py-2 flex items-center justify-between shadow-2xl">
                {/* 1. Home */}
                <Link to="/" className="flex flex-col items-center gap-1 text-slate-600 dark:text-slate-400 hover:text-orange-600 dark:hover:text-orange-400 text-[10px] font-bold focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-orange-500 rounded p-1">
                    <Home size={18} />
                    <span>{t('landing.mobileNav.home', 'Home')}</span>
                </Link>

                {/* 2. Track */}
                <Link to="/track" className="flex flex-col items-center gap-1 text-slate-600 dark:text-slate-400 hover:text-orange-600 dark:hover:text-orange-400 text-[10px] font-bold focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-orange-500 rounded p-1">
                    <Search size={18} />
                    <span>{t('landing.mobileNav.track', 'Track')}</span>
                </Link>

                {/* 3. Elevated Report Button */}
                <Link 
                    to="/report" 
                    className="w-14 h-14 rounded-full bg-orange-600 text-white shadow-lg -mt-6 flex items-center justify-center border-4 border-white dark:border-slate-900 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-orange-500 hover:scale-105 active:scale-95 transition-transform"
                    aria-label="Report an issue"
                >
                    <Plus size={28} strokeWidth={2.8} />
                </Link>

                {/* 4. Updates */}
                <a href="#cityservices" className="flex flex-col items-center gap-1 text-slate-600 dark:text-slate-400 hover:text-orange-600 dark:hover:text-orange-400 text-[10px] font-bold focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-orange-500 rounded p-1">
                    <Activity size={18} />
                    <span>{t('landing.mobileNav.updates', 'Updates')}</span>
                </a>

                {/* 5. Account */}
                <Link to="/login" className="flex flex-col items-center gap-1 text-slate-600 dark:text-slate-400 hover:text-orange-600 dark:hover:text-orange-400 text-[10px] font-bold focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-orange-500 rounded p-1">
                    <User size={18} />
                    <span>{t('landing.mobileNav.account', 'Account')}</span>
                </Link>
            </div>

            {/* Legal Terms Modal */}
            <TermsModal 
                isOpen={modalConfig.isOpen} 
                onClose={closeModal} 
                type={modalConfig.type} 
            />
        </div>
    );
}
