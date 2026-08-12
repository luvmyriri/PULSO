import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from 'framer-motion';
import {
    MapPinned, Activity, BrainCircuit, ArrowRight,
    Menu, X, Route as RouteIcon, Shield, BarChart3,
    Users, CheckCircle2, ClipboardCheck, Camera,
    Bot, Headphones, Wrench, ExternalLink,
    UserCheck, Droplets, Lightbulb, ChevronDown, Building2,
    Zap, Radio, Sparkles, HelpCircle, PhoneCall, Plus, Minus, ShieldAlert
} from 'lucide-react';
import Branding from '../components/Branding';
import ThemeToggle from '../components/ThemeToggle';
import LegalModal from '../components/LegalModal';
import '../index.css';

function Landing() {
    const { t } = useTranslation();
    const [scrolled, setScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [activeSection, setActiveSection] = useState('home');
    const [legalModal, setLegalModal] = useState({ isOpen: false, tab: 'privacy' });
    const [openFaq, setOpenFaq] = useState(null);

    // Scroll listener & Scroll-Spy for section switching
    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20);

            const sections = ['home', 'features', 'solutions', 'about', 'faq', 'emergency'];
            const scrollPos = window.scrollY + 200;

            for (const sectionId of sections) {
                const el = document.getElementById(sectionId);
                if (el) {
                    const top = el.offsetTop;
                    const height = el.offsetHeight;
                    if (scrollPos >= top && scrollPos < top + height) {
                        setActiveSection(sectionId);
                        break;
                    }
                }
            }
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const scrollToSection = (id) => {
        setMobileMenuOpen(false);
        setActiveSection(id);
        if (id === 'home') {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }
        const element = document.getElementById(id);
        if (element) {
            const navbarHeight = 80; // fixed navbar offset
            const top = element.getBoundingClientRect().top + window.scrollY - navbarHeight;
            window.scrollTo({ top, behavior: 'smooth' });
        }
    };

    // Animation variants
    const fadeUp = {
        hidden: { opacity: 0, y: 35 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } }
    };

    const sectionTransition = {
        initial: { opacity: 0, y: 45, scale: 0.98 },
        whileInView: { opacity: 1, y: 0, scale: 1 },
        viewport: { once: false, amount: 0.15 },
        transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] }
    };

    const staggerContainer = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.12 }
        }
    };

    return (
        <div className="min-h-screen flex flex-col font-sans bg-[#fffbf9] dark:bg-[#070a12] text-[#2c1d11] dark:text-white relative selection:bg-[#ff6b00] selection:text-white transition-colors duration-300 overflow-x-hidden">
            
            {/* Top Fixed Header Navbar */}
            <nav className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${scrolled ? 'bg-[#fffbf9]/95 dark:bg-[#070a12]/95 backdrop-blur-xl shadow-md border-b border-[#f3e9e2] dark:border-slate-800/80 py-3' : 'bg-transparent border-transparent shadow-none py-4 sm:py-5'}`}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
                    
                    {/* Brand Logo & Title with Caloocan Seal */}
                    <div className="flex items-center gap-3 cursor-pointer" onClick={() => scrollToSection('home')}>
                        <Branding size={scrolled ? "h-7 sm:h-8" : "h-8 sm:h-9"} showText={false} />
                        <div className="flex flex-col">
                            <div className="flex items-center gap-1.5">
                                <span className="text-[#2c1d11] dark:text-white font-black text-lg sm:text-xl tracking-tight leading-none">PULSO</span>
                                <span className="w-1.5 h-1.5 rounded-full bg-[#ff6b00] animate-pulse" />
                            </div>
                            <span className="text-[9px] sm:text-[10px] font-extrabold tracking-widest text-[#ff6b00] uppercase mt-0.5">Caloocan City</span>
                        </div>
                    </div>

                    {/* Navigation Links with Active Indicator Pill */}
                    <ul className="hidden md:flex gap-6 lg:gap-8 items-center text-xs font-bold tracking-wider uppercase">
                        {[
                            { id: 'home', labelKey: 'home', defaultText: 'Home' },
                            { id: 'features', labelKey: 'platform', defaultText: 'Features' },
                            { id: 'solutions', labelKey: 'solutions', defaultText: 'Solutions' },
                            { id: 'about', labelKey: 'about', defaultText: 'About Us' },
                            { id: 'faq', labelKey: 'faq', defaultText: 'FAQ' },
                            { id: 'emergency', labelKey: 'emergency', defaultText: 'Hotlines' },
                        ].map((nav) => (
                            <li key={nav.id} className="relative py-1">
                                <button
                                    onClick={() => scrollToSection(nav.id)}
                                    className={`transition-colors uppercase tracking-wider text-xs font-bold ${activeSection === nav.id ? 'text-[#ff6b00]' : 'text-[#736254] dark:text-slate-300 hover:text-[#ff6b00]'}`}
                                >
                                    {t(`landing.nav.${nav.labelKey}`, nav.defaultText)}
                                </button>
                                {activeSection === nav.id && (
                                    <motion.div
                                        layoutId="activeNavTab"
                                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#ff6b00] rounded-full"
                                        transition={{ type: "spring", stiffness: 400, damping: 35 }}
                                    />
                                )}
                            </li>
                        ))}
                    </ul>

                    {/* Action Button & Theme Toggle */}
                    <div className="hidden md:flex gap-3 lg:gap-4 items-center">
                        <ThemeToggle />
                        <a href="/login" className="relative group overflow-hidden flex items-center gap-2 bg-[#ff6b00] hover:bg-[#e65c00] text-white px-5 lg:px-6 py-2.5 rounded-full font-bold text-xs uppercase tracking-wider transition-all shadow-md hover:shadow-lg hover:shadow-[#ff6b00]/25 hover:-translate-y-0.5 whitespace-nowrap">
                            <span>{t('landing.nav.login', 'Login')}</span>
                            <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                        </a>
                    </div>

                    {/* Mobile Menu Toggle */}
                    <button className="md:hidden text-[#ff6b00] p-2 focus:outline-none" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} aria-label="Toggle Menu">
                        {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </div>

                {/* Mobile Navigation Dropdown */}
                <AnimatePresence>
                    {mobileMenuOpen && (
                        <motion.div 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3 }}
                            className="absolute top-full left-0 w-full bg-[#fffbf9] dark:bg-[#070a12] border-b border-[#f3e9e2] dark:border-slate-800 shadow-xl py-6 px-6 flex flex-col gap-4 md:hidden z-50"
                        >
                            {[
                                { id: 'home', labelKey: 'home', defaultText: 'Home' },
                                { id: 'features', labelKey: 'platform', defaultText: 'Features' },
                                { id: 'solutions', labelKey: 'solutions', defaultText: 'Solutions' },
                                { id: 'about', labelKey: 'about', defaultText: 'About Us' },
                                { id: 'faq', labelKey: 'faq', defaultText: 'FAQ' },
                                { id: 'emergency', labelKey: 'emergency', defaultText: 'Hotlines' },
                            ].map((nav) => (
                                <button
                                    key={nav.id}
                                    onClick={() => scrollToSection(nav.id)}
                                    className={`text-left font-bold py-2 border-b border-[#f3e9e2] dark:border-slate-800 uppercase text-xs tracking-wider transition-colors ${activeSection === nav.id ? 'text-[#ff6b00]' : 'text-[#2c1d11] dark:text-white'}`}
                                >
                                    {t(`landing.nav.${nav.labelKey}`, nav.defaultText)}
                                </button>
                            ))}

                            <div className="flex justify-between items-center py-2 border-b border-[#f3e9e2] dark:border-slate-800">
                                <span className="text-xs font-bold uppercase text-[#736254] dark:text-slate-400">Theme</span>
                                <ThemeToggle />
                            </div>

                            <a href="/login" className="w-full justify-center flex items-center gap-2 bg-[#ff6b00] hover:bg-[#e65c00] text-white px-5 py-3 rounded-full font-bold text-xs uppercase tracking-wider transition-all shadow-md">
                                {t('landing.nav.login', 'Login')} <ArrowRight size={16} />
                            </a>
                        </motion.div>
                    )}
                </AnimatePresence>
            </nav>

            {/* HERO SECTION - Animated Screen Section */}
            <motion.section 
                id="home" 
                {...sectionTransition}
                className="relative min-h-screen flex flex-col justify-center items-center pt-20 pb-12 sm:pt-24 sm:pb-16 overflow-hidden bg-[#fffbf9] dark:bg-[#070a12] border-b border-[#f3e9e2] dark:border-slate-800/80"
            >
                {/* Ambient Radial Mesh Glow Backdrops */}
                <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                    <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[750px] sm:w-[900px] h-[450px] bg-gradient-to-tr from-[#ff6b00]/15 via-[#ff6b00]/10 to-transparent rounded-full blur-[130px]" />
                    <div className="absolute top-1/3 -right-32 w-[350px] h-[350px] bg-amber-500/10 dark:bg-amber-500/15 rounded-full blur-[100px]" />
                    <div className="absolute top-1/3 -left-32 w-[350px] h-[350px] bg-[#ff6b00]/10 dark:bg-[#ff6b00]/15 rounded-full blur-[100px]" />
                </div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full text-center relative z-10">
                    <motion.div
                        className="flex flex-col items-center max-w-4xl mx-auto"
                        initial="hidden"
                        animate="visible"
                        variants={staggerContainer}
                    >
                        {/* Hero Headline */}
                        <motion.h1 
                            variants={fadeUp} 
                            className="font-display font-black text-3xl sm:text-5xl md:text-6xl lg:text-7xl uppercase tracking-tight text-[#2c1d11] dark:text-white leading-[1.06] mb-5 sm:mb-6"
                        >
                            SMART UTILITY <span className="bg-gradient-to-r from-[#ff6b00] via-orange-400 to-[#ff8533] bg-clip-text text-transparent">LOCATOR &amp; MAINTENANCE</span> SYSTEM
                        </motion.h1>

                        {/* Hero Subtitle */}
                        <motion.p 
                            variants={fadeUp} 
                            className="text-sm sm:text-base md:text-lg text-[#736254] dark:text-slate-300 font-medium leading-relaxed mb-8 sm:mb-10 max-w-2xl mx-auto px-2"
                        >
                            {t('landing.hero.subtitle', 'Improving everyday life for Caloocan City residents by helping engineers spot utility hazards early, resolve outages faster, and maintain reliable public services.')}
                        </motion.p>

                        {/* CTA Buttons */}
                        <motion.div 
                            variants={fadeUp} 
                            className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center w-full sm:w-auto"
                        >
                            <a href="/register" className="w-full sm:w-auto bg-[#ff6b00] hover:bg-[#e65c00] text-white px-8 sm:px-9 py-3.5 sm:py-4 rounded-full font-bold text-xs uppercase tracking-wider transition-all shadow-lg hover:shadow-2xl hover:shadow-[#ff6b00]/30 hover:-translate-y-1 flex items-center justify-center gap-2">
                                {t('landing.hero.register', 'Register')} <ArrowRight size={16} />
                            </a>
                            <button onClick={() => scrollToSection('features')} className="w-full sm:w-auto bg-white/90 dark:bg-slate-900/90 backdrop-blur-md hover:bg-[#ffefe5] dark:hover:bg-slate-800 text-[#2c1d11] dark:text-white border border-[#f3e9e2] dark:border-slate-800 px-7 sm:px-8 py-3.5 sm:py-4 rounded-full font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-sm hover:-translate-y-0.5">
                                {t('landing.hero.exploreFeatures', 'Explore Features')} <ChevronDown size={16} className="text-[#ff6b00] animate-bounce" />
                            </button>
                        </motion.div>
                    </motion.div>
                </div>
            </motion.section>

            {/* KEY FEATURES SECTION - Animated Screen Section */}
            <motion.section 
                id="features" 
                {...sectionTransition}
                className="py-16 sm:py-24 bg-[#fffbf9] dark:bg-[#070a12] border-b border-[#f3e9e2] dark:border-slate-800"
            >
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    
                    <motion.div
                        className="text-center max-w-3xl mx-auto mb-10 sm:mb-16"
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: "-100px" }}
                        variants={fadeUp}
                    >
                        <div className="inline-block bg-[#ffefe5] dark:bg-[#ff6b00]/10 text-[#ff6b00] font-bold text-[10px] sm:text-[11px] tracking-widest uppercase px-3.5 py-1 rounded-full border border-[#f3e9e2] dark:border-[#ff6b00]/20 mb-3">
                            {t('landing.features.badge', 'Infrastructure Scope')}
                        </div>
                        <h2 className="font-display font-extrabold text-2xl sm:text-3xl md:text-4xl uppercase tracking-tight text-[#2c1d11] dark:text-white mb-3 sm:mb-4">
                            {t('landing.features.title', 'TYPES OF PUBLIC INFRASTRUCTURE')}
                        </h2>
                        <p className="text-xs sm:text-sm font-medium text-[#736254] dark:text-slate-300 leading-relaxed max-w-xl mx-auto">
                            {t('landing.features.subtitle', 'Public infrastructure managed across Caloocan City by the City Engineering Department.')}
                        </p>
                    </motion.div>

                    {/* Features Grid */}
                    <motion.div
                        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6"
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: "-50px" }}
                        variants={staggerContainer}
                    >
                        {/* Horizontal Infrastructure */}
                        <motion.div variants={fadeUp} className="bg-white dark:bg-slate-900/80 border border-[#f3e9e2] dark:border-slate-800 p-5 sm:p-6 rounded-2xl shadow-sm hover:shadow-md transition-all hover:-translate-y-1">
                            <div className="w-10 sm:w-12 h-10 sm:h-12 bg-[#ffefe5] dark:bg-[#ff6b00]/15 text-[#ff6b00] rounded-xl flex items-center justify-center mb-4 sm:mb-5">
                                <RouteIcon size={22} />
                            </div>
                            <h3 className="font-display font-bold text-sm sm:text-base mb-2 text-[#2c1d11] dark:text-white uppercase tracking-wide">
                                {t('landing.features.f1_title', 'Horizontal Infrastructure')}
                            </h3>
                            <p className="text-[#736254] dark:text-slate-400 leading-relaxed text-xs font-medium">
                                {t('landing.features.f1_desc', 'Roads, local bridges, alleys, pathways, and parking areas.')}
                            </p>
                        </motion.div>

                        {/* Vertical Infrastructure */}
                        <motion.div variants={fadeUp} className="bg-white dark:bg-slate-900/80 border border-[#f3e9e2] dark:border-slate-800 p-5 sm:p-6 rounded-2xl shadow-sm hover:shadow-md transition-all hover:-translate-y-1">
                            <div className="w-10 sm:w-12 h-10 sm:h-12 bg-[#ffefe5] dark:bg-[#ff6b00]/15 text-[#ff6b00] rounded-xl flex items-center justify-center mb-4 sm:mb-5">
                                <Building2 size={22} />
                            </div>
                            <h3 className="font-display font-bold text-sm sm:text-base mb-2 text-[#2c1d11] dark:text-white uppercase tracking-wide">
                                {t('landing.features.f2_title', 'Vertical Infrastructure')}
                            </h3>
                            <p className="text-[#736254] dark:text-slate-400 leading-relaxed text-xs font-medium">
                                {t('landing.features.f2_desc', 'City halls, public schools, local health centers, multipurpose gyms, and municipal warehouses.')}
                            </p>
                        </motion.div>

                        {/* Drainage & Water Systems */}
                        <motion.div variants={fadeUp} className="bg-white dark:bg-slate-900/80 border border-[#f3e9e2] dark:border-slate-800 p-5 sm:p-6 rounded-2xl shadow-sm hover:shadow-md transition-all hover:-translate-y-1">
                            <div className="w-10 sm:w-12 h-10 sm:h-12 bg-[#ffefe5] dark:bg-[#ff6b00]/15 text-[#ff6b00] rounded-xl flex items-center justify-center mb-4 sm:mb-5">
                                <Droplets size={22} />
                            </div>
                            <h3 className="font-display font-bold text-sm sm:text-base mb-2 text-[#2c1d11] dark:text-white uppercase tracking-wide">
                                {t('landing.features.f3_title', 'Drainage & Water Systems')}
                            </h3>
                            <p className="text-[#736254] dark:text-slate-400 leading-relaxed text-xs font-medium">
                                {t('landing.features.f3_desc', 'Open canals, underground lateral storm drains, sewer lines, and declogging networks.')}
                            </p>
                        </motion.div>

                        {/* Public Spaces */}
                        <motion.div variants={fadeUp} className="bg-white dark:bg-slate-900/80 border border-[#f3e9e2] dark:border-slate-800 p-5 sm:p-6 rounded-2xl shadow-sm hover:shadow-md transition-all hover:-translate-y-1">
                            <div className="w-10 sm:w-12 h-10 sm:h-12 bg-[#ffefe5] dark:bg-[#ff6b00]/15 text-[#ff6b00] rounded-xl flex items-center justify-center mb-4 sm:mb-5">
                                <Users size={22} />
                            </div>
                            <h3 className="font-display font-bold text-sm sm:text-base mb-2 text-[#2c1d11] dark:text-white uppercase tracking-wide">
                                {t('landing.features.f4_title', 'Public Spaces')}
                            </h3>
                            <p className="text-[#736254] dark:text-slate-400 leading-relaxed text-xs font-medium">
                                {t('landing.features.f4_desc', 'City parks, plazas, monuments, and open recreational grounds.')}
                            </p>
                        </motion.div>
                    </motion.div>
                </div>
            </motion.section>

            {/* HOW IT WORKS SECTION */}
            <motion.section 
                {...sectionTransition}
                className="py-16 sm:py-24 bg-[#ffffff] dark:bg-[#05080e] border-b border-[#f3e9e2] dark:border-slate-800"
            >
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    
                    <motion.div
                        className="text-center max-w-3xl mx-auto mb-12 sm:mb-16"
                        initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeUp}
                    >
                        <div className="inline-flex items-center gap-2 text-[#ff6b00] font-bold text-xs tracking-widest uppercase mb-3">
                            <ClipboardCheck size={16} /> {t('landing.howitworks.badge', 'Simple Process')}
                        </div>
                        <h2 className="font-display font-extrabold text-2xl sm:text-3xl md:text-4xl uppercase tracking-tight text-[#2c1d11] dark:text-white mb-3 sm:mb-4">
                            {t('landing.howitworks.title', 'HOW PULSO WORKS')}
                        </h2>
                        <p className="text-xs sm:text-sm font-medium text-[#736254] dark:text-slate-400 leading-relaxed max-w-2xl mx-auto">
                            {t('landing.howitworks.subtitle', 'From reporting a problem to completing repairs in Caloocan City.')}
                        </p>
                    </motion.div>

                    <motion.div
                        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-5 relative"
                        initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} variants={staggerContainer}
                    >

                        {[
                            { icon: <UserCheck size={20} />, step: '01', titleKey: 's1_title', descKey: 's1_desc', defTitle: "Problem Logged", defDesc: "Citizens or sensors report a utility issue on the city map." },
                            { icon: <Camera size={20} />, step: '02', titleKey: 's2_title', descKey: 's2_desc', defTitle: "Site Inspection", defDesc: "City inspectors verify the location with photos and GPS tags." },
                            { icon: <Bot size={20} />, step: '03', titleKey: 's3_title', descKey: 's3_desc', defTitle: "Smart Priority", defDesc: "PULSO ranks urgency so critical repairs get fixed first." },
                            { icon: <Headphones size={20} />, step: '04', titleKey: 's4_title', descKey: 's4_desc', defTitle: "Crew Assigned", defDesc: "Engineers send work orders and materials to field teams." },
                            { icon: <Wrench size={20} />, step: '05', titleKey: 's5_title', descKey: 's5_desc', defTitle: "Repair Done", defDesc: "Crews complete the repair and update the map status." },
                        ].map((step, i) => (
                            <motion.div
                                key={i}
                                variants={fadeUp}
                                className="group relative flex flex-col items-center text-center bg-white dark:bg-slate-900/70 border border-[#f3e9e2] dark:border-slate-800 dark:hover:border-[#ff6b00]/50 rounded-2xl p-5 sm:p-6 shadow-sm hover:shadow-md dark:shadow-none transition-all duration-300"
                            >
                                {/* Icon */}
                                <div className="w-12 h-12 rounded-xl bg-[#ffefe5] dark:bg-[#ff6b00]/10 text-[#ff6b00] border border-[#f3e9e2] dark:border-[#ff6b00]/20 flex items-center justify-center mb-4 group-hover:bg-[#ff6b00] group-hover:text-white group-hover:border-[#ff6b00] transition-all duration-300">
                                    {step.icon}
                                </div>

                                <h3 className="font-bold text-xs sm:text-sm text-[#2c1d11] dark:text-white uppercase tracking-wide mb-2">
                                    {t(`landing.howitworks.${step.titleKey}`, step.defTitle)}
                                </h3>
                                <p className="text-[#736254] dark:text-slate-400 text-[11px] sm:text-xs leading-relaxed">
                                    {t(`landing.howitworks.${step.descKey}`, step.defDesc)}
                                </p>

                                {/* Bottom accent bar on hover */}
                                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 group-hover:w-3/4 h-0.5 bg-[#ff6b00] rounded-full transition-all duration-300" />
                            </motion.div>
                        ))}
                    </motion.div>
                </div>
            </motion.section>


            {/* SOLUTIONS SECTION - Animated Screen Section */}
            <motion.section 
                id="solutions" 
                {...sectionTransition}
                className="py-16 sm:py-24 bg-[#fffbf9] dark:bg-[#070a12] border-b border-[#f3e9e2] dark:border-slate-800"
            >
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    
                    <motion.div
                        className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 sm:mb-16 gap-4 sm:gap-6"
                        initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeUp}
                    >
                        <div className="max-w-2xl">
                            <div className="inline-flex items-center gap-2 text-[#ff6b00] font-bold text-xs tracking-widest uppercase mb-2 sm:mb-3">
                                <Shield size={16} /> {t('landing.solutions.badge', 'Utility Sectors')}
                            </div>
                            <h2 className="font-display font-extrabold text-2xl sm:text-4xl md:text-5xl uppercase tracking-tight text-[#2c1d11] dark:text-white leading-tight">
                                {t('landing.solutions.title', 'ESSENTIAL CITY SERVICES')}
                            </h2>
                        </div>
                    </motion.div>

                    <motion.div
                        className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 sm:gap-6"
                        initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} variants={staggerContainer}
                    >
                        {[
                            { key: 's1', icon: <Droplets size={24} />, defTitle: "Water Supply Network", defDesc: "Monitor water pressure, detect pipe leaks, and check main distribution lines." },
                            { key: 's2', icon: <Lightbulb size={24} />, defTitle: "Power & Street Lighting", defDesc: "Track underground power cables and fix street light outages fast." },
                            { key: 's3', icon: <RouteIcon size={24} />, defTitle: "Roads & Drainage", defDesc: "Check drainage flow, reduce flood risks, and inspect road pavement conditions." },
                        ].map((item, i) => (
                            <motion.div key={i} variants={fadeUp} className="bg-white dark:bg-slate-900/80 p-6 sm:p-8 rounded-2xl border border-[#f3e9e2] dark:border-slate-800 shadow-sm hover:shadow-md transition-all hover:-translate-y-1">
                                <div className="w-10 sm:w-12 h-10 sm:h-12 bg-[#ffefe5] dark:bg-[#ff6b00]/15 text-[#ff6b00] rounded-xl flex items-center justify-center mb-5 sm:mb-6">
                                    {item.icon}
                                </div>
                                <h3 className="font-bold text-sm sm:text-base mb-2.5 sm:mb-3 text-[#2c1d11] dark:text-white uppercase tracking-wide">{t(`landing.solutions.${item.key}_title`, item.defTitle)}</h3>
                                <p className="text-[#736254] dark:text-slate-400 leading-relaxed text-xs sm:text-sm mb-4">{t(`landing.solutions.${item.key}_desc`, item.defDesc)}</p>
                                <ul className="space-y-2 text-xs font-semibold text-[#736254] dark:text-slate-300">
                                    <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-[#ff6b00]" /> {t('landing.solutions.l1', 'Live System Status')}</li>
                                    <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-[#ff6b00]" /> {t('landing.solutions.l2', 'Fast Incident Response')}</li>
                                </ul>
                            </motion.div>
                        ))}
                    </motion.div>
                </div>
            </motion.section>

            {/* CITY SERVICES GATEWAY */}
            <motion.section 
                {...sectionTransition}
                className="py-16 sm:py-20 bg-[#ffffff] dark:bg-[#05080e] border-b border-[#f3e9e2] dark:border-slate-800"
            >
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <motion.div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 sm:mb-12 gap-4" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
                        <div>
                            <div className="inline-flex items-center gap-2 text-[#ff6b00] font-bold text-xs tracking-widest uppercase mb-2">
                                <ExternalLink size={15} /> {t('landing.services.badge', 'City Portals')}
                            </div>
                            <h2 className="font-display font-extrabold text-2xl sm:text-3xl md:text-4xl uppercase tracking-tight text-[#2c1d11] dark:text-white">
                                {t('landing.services.title', 'CALOOCAN PUBLIC SERVICES GATEWAY')}
                            </h2>
                        </div>
                    </motion.div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                        {[
                            { key: 'senior', link: "https://osca.caloocanservices.online/", defName: "Senior Citizen Portal", defDesc: "Senior ID registration and verification records." },
                            { key: 'pwd', link: "https://pwd.caloocanservices.online/", defName: "PWD Welfare Portal", defDesc: "Assistance directory for Persons with Disability." },
                            { key: 'solo', link: "https://soloparent.caloocanservices.online/", defName: "Solo Parent Portal", defDesc: "Benefits tracking and single parent support." },
                            { key: 'gad', link: "https://gadplan.caloocanservices.online/", defName: "GAD Plan Portal", defDesc: "Gender and Development project directory." },
                        ].map((srv, i) => (
                            <a key={i} href={srv.link} target="_blank" rel="noopener noreferrer" className="bg-[#fffbf9] dark:bg-slate-900/60 border border-[#f3e9e2] dark:border-slate-800 p-5 sm:p-6 rounded-2xl hover:border-[#ff6b00] transition-colors group">
                                <h4 className="font-bold text-xs sm:text-sm text-[#2c1d11] dark:text-white uppercase tracking-wide group-hover:text-[#ff6b00] transition-colors flex items-center justify-between mb-2">
                                    {t(`landing.services.${srv.key}_title`, srv.defName)} <ExternalLink size={14} className="text-[#736254] dark:text-slate-400 group-hover:text-[#ff6b00]" />
                                </h4>
                                <p className="text-[11px] sm:text-xs text-[#736254] dark:text-slate-400 leading-relaxed">{t(`landing.services.${srv.key}_desc`, srv.defDesc)}</p>
                            </a>
                        ))}
                    </div>
                </div>
            </motion.section>

            {/* ABOUT LGU / CITY ENGINEERING SECTION - Simplified */}
            <motion.section 
                id="about" 
                {...sectionTransition}
                className="py-16 sm:py-24 bg-[#fffbf9] dark:bg-[#070a12] border-b border-[#f3e9e2] dark:border-slate-800"
            >
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-orange-500/10 text-[#ff6b00] rounded-full text-xs font-bold tracking-widest uppercase mb-5 border border-orange-500/20">
                            <Users size={14} /> City Engineering Office of Caloocan
                        </div>
                        <h2 className="font-display font-extrabold text-2xl sm:text-4xl md:text-5xl uppercase tracking-tight text-[#2c1d11] dark:text-white mb-4 leading-[1.1]">
                            PROACTIVE INFRASTRUCTURE <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#ff6b00] to-amber-500">STEWARDSHIP</span>
                        </h2>
                        <p className="text-sm sm:text-base text-[#736254] dark:text-slate-300 leading-relaxed mb-10 font-medium max-w-2xl mx-auto">
                            The City Engineering Office of Caloocan plans, monitors, and maintains public utility infrastructure to prevent outages, spot risks early, and keep communities safe and resilient.
                        </p>

                        <div className="grid grid-cols-3 gap-4 sm:gap-6">
                            <div className="bg-white dark:bg-slate-900/60 p-5 sm:p-6 rounded-2xl border border-[#f3e9e2] dark:border-slate-800 shadow-sm">
                                <span className="text-2xl sm:text-3xl font-display font-black text-[#ff6b00]">100%</span>
                                <span className="block text-[10px] sm:text-xs font-bold text-[#736254] dark:text-slate-300 uppercase tracking-wider mt-2">Caloocan Coverage</span>
                            </div>
                            <div className="bg-white dark:bg-slate-900/60 p-5 sm:p-6 rounded-2xl border border-[#f3e9e2] dark:border-slate-800 shadow-sm">
                                <span className="text-2xl sm:text-3xl font-display font-black text-[#ff6b00]">24/7</span>
                                <span className="block text-[10px] sm:text-xs font-bold text-[#736254] dark:text-slate-300 uppercase tracking-wider mt-2">Live Monitoring</span>
                            </div>
                            <div className="bg-white dark:bg-slate-900/60 p-5 sm:p-6 rounded-2xl border border-[#f3e9e2] dark:border-slate-800 shadow-sm">
                                <span className="text-2xl sm:text-3xl font-display font-black text-[#ff6b00]">&lt;15m</span>
                                <span className="block text-[10px] sm:text-xs font-bold text-[#736254] dark:text-slate-300 uppercase tracking-wider mt-2">Avg. Dispatch</span>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </motion.section>

            {/* NEW SECTION 1: FREQUENTLY ASKED QUESTIONS (FAQ) */}
            <motion.section 
                id="faq" 
                {...sectionTransition}
                className="py-16 sm:py-24 bg-[#ffffff] dark:bg-[#05080e] border-b border-[#f3e9e2] dark:border-slate-800"
            >
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    <motion.div
                        className="text-center mb-12 sm:mb-16"
                        initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
                    >
                        <div className="inline-flex items-center gap-2 text-[#ff6b00] font-bold text-xs tracking-widest uppercase mb-3">
                            <HelpCircle size={16} /> Help Center &amp; Resident FAQ
                        </div>
                        <h2 className="font-display font-extrabold text-2xl sm:text-4xl uppercase tracking-tight text-[#2c1d11] dark:text-white mb-3">
                            FREQUENTLY ASKED QUESTIONS
                        </h2>
                        <p className="text-xs sm:text-sm font-medium text-[#736254] dark:text-slate-400 leading-relaxed">
                            Everything you need to know about reporting utility hazards, resident verification, and dispatch SLAs in Caloocan City.
                        </p>
                    </motion.div>

                    {/* Accordion List */}
                    <div className="space-y-4">
                        {[
                            {
                                id: 1,
                                q: "How do I report a public utility hazard in Caloocan City?",
                                a: "Simply register or sign in to your PULSO resident account. Click 'New Incident Report', upload a photo of the issue (e.g. water leak, power outage, road damage), and PULSO automatically tags your exact GPS coordinates for immediate verification and dispatcher routing."
                            },
                            {
                                id: 2,
                                q: "How does the Automated AI Document Audit verify residency?",
                                a: "During registration, you upload any valid Philippine government-issued ID (e.g., PhilID, Driver's License, UMID, Postal ID). PULSO's automated OCR AI parses your ID details to verify residency within Caloocan City under strict Republic Act No. 10173 (Data Privacy Act) compliance."
                            },
                            {
                                id: 3,
                                q: "What utility networks and areas are covered by PULSO?",
                                a: "PULSO provides full coverage across all barangays in Caloocan City. The platform monitors water distribution mains, electric power and lighting cables, underground drainage networks, and road pavement conditions."
                            },
                            {
                                id: 4,
                                q: "How can I track the progress of my reported incident?",
                                a: "Once submitted, your report appears on your personal Resident Dashboard. You can view live real-time status updates (Received ➔ Dispatched ➔ In Progress ➔ Resolved), along with notes from City Engineering dispatchers."
                            }
                        ].map((faq) => (
                            <div key={faq.id} className="bg-[#fffbf9] dark:bg-slate-900/60 border border-[#f3e9e2] dark:border-slate-800 rounded-2xl overflow-hidden transition-all">
                                <button
                                    onClick={() => setOpenFaq(openFaq === faq.id ? null : faq.id)}
                                    className="w-full p-5 sm:p-6 text-left flex justify-between items-center gap-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                                >
                                    <span className="font-bold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-3">
                                        <span className="w-7 h-7 rounded-xl bg-orange-500/10 text-[#ff6b00] flex items-center justify-center text-xs font-black shrink-0">0{faq.id}</span>
                                        {faq.q}
                                    </span>
                                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center shrink-0">
                                        {openFaq === faq.id ? <Minus size={16} /> : <Plus size={16} />}
                                    </div>
                                </button>
                                <AnimatePresence>
                                    {openFaq === faq.id && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: "auto", opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.3 }}
                                            className="overflow-hidden"
                                        >
                                            <div className="p-5 sm:p-6 pt-0 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-100 dark:border-slate-800/60">
                                                {faq.a}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        ))}
                    </div>
                </div>
            </motion.section>

            {/* NEW SECTION 2: EMERGENCY HOTLINES & CITIZEN SUPPORT */}
            <motion.section 
                id="emergency" 
                {...sectionTransition}
                className="py-16 sm:py-24 bg-[#ffffff] dark:bg-[#05080e] border-b border-[#f3e9e2] dark:border-slate-800"
            >
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    
                    <motion.div className="text-center mb-10 sm:mb-12" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
                        <div className="inline-flex items-center gap-2 text-[#ff6b00] font-bold text-xs tracking-widest uppercase mb-3">
                            <ShieldAlert size={16} /> Emergency Directory
                        </div>
                        <h2 className="font-display font-extrabold text-2xl sm:text-3xl md:text-4xl uppercase tracking-tight text-[#2c1d11] dark:text-white mb-3">
                            DIRECT MUNICIPAL &amp; UTILITY HOTLINES
                        </h2>
                        <p className="text-xs sm:text-sm font-medium text-[#736254] dark:text-slate-300 leading-relaxed max-w-xl mx-auto">
                            For life-threatening emergencies or urgent utility disruptions in Caloocan City, contact local dispatch hubs directly.
                        </p>
                    </motion.div>

                    <motion.div
                        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
                        initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} variants={staggerContainer}
                    >
                        <motion.a variants={fadeUp} href="tel:0288882256" className="bg-white dark:bg-slate-900/60 border border-[#f3e9e2] dark:border-slate-800 hover:border-[#ff6b00] dark:hover:border-[#ff6b00] p-5 rounded-2xl transition-all group flex items-start gap-4 shadow-sm hover:shadow-md">
                            <div className="w-10 h-10 rounded-xl bg-[#ffefe5] dark:bg-[#ff6b00]/15 text-[#ff6b00] flex items-center justify-center shrink-0">
                                <PhoneCall size={20} />
                            </div>
                            <div>
                                <h4 className="font-bold text-[10px] uppercase tracking-wider text-[#736254] dark:text-slate-400 mb-1">Caloocan Rescue &amp; Command</h4>
                                <p className="text-sm sm:text-base font-black text-[#2c1d11] dark:text-white group-hover:text-[#ff6b00] transition-colors">(02) 8888-CALOOCAN</p>
                            </div>
                        </motion.a>

                        <motion.a variants={fadeUp} href="tel:0283620220" className="bg-white dark:bg-slate-900/60 border border-[#f3e9e2] dark:border-slate-800 hover:border-[#ff6b00] dark:hover:border-[#ff6b00] p-5 rounded-2xl transition-all group flex items-start gap-4 shadow-sm hover:shadow-md">
                            <div className="w-10 h-10 rounded-xl bg-[#ffefe5] dark:bg-orange-500/15 text-orange-500 flex items-center justify-center shrink-0">
                                <Wrench size={20} />
                            </div>
                            <div>
                                <h4 className="font-bold text-[10px] uppercase tracking-wider text-[#736254] dark:text-slate-400 mb-1">City Engineering Dispatch</h4>
                                <p className="text-sm sm:text-base font-black text-[#2c1d11] dark:text-white group-hover:text-[#ff6b00] transition-colors">(02) 8362-0220</p>
                            </div>
                        </motion.a>

                        <motion.a variants={fadeUp} href="tel:1626" className="bg-white dark:bg-slate-900/60 border border-[#f3e9e2] dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-400 p-5 rounded-2xl transition-all group flex items-start gap-4 shadow-sm hover:shadow-md">
                            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/15 text-blue-500 flex items-center justify-center shrink-0">
                                <Droplets size={20} />
                            </div>
                            <div>
                                <h4 className="font-bold text-[10px] uppercase tracking-wider text-[#736254] dark:text-slate-400 mb-1">Maynilad Water Hotline</h4>
                                <p className="text-sm sm:text-base font-black text-[#2c1d11] dark:text-white group-hover:text-blue-500 transition-colors">1626</p>
                            </div>
                        </motion.a>

                        <motion.a variants={fadeUp} href="tel:16211" className="bg-white dark:bg-slate-900/60 border border-[#f3e9e2] dark:border-slate-800 hover:border-amber-400 dark:hover:border-amber-400 p-5 rounded-2xl transition-all group flex items-start gap-4 shadow-sm hover:shadow-md">
                            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-500/15 text-amber-500 flex items-center justify-center shrink-0">
                                <Zap size={20} />
                            </div>
                            <div>
                                <h4 className="font-bold text-[10px] uppercase tracking-wider text-[#736254] dark:text-slate-400 mb-1">Meralco Power Outages</h4>
                                <p className="text-sm sm:text-base font-black text-[#2c1d11] dark:text-white group-hover:text-amber-500 transition-colors">16211</p>
                            </div>
                        </motion.a>
                    </motion.div>
                </div>
            </motion.section>

            {/* FOOTER */}
            <footer className="bg-[#fffbf9] dark:bg-[#05080e] border-t border-[#f3e9e2] dark:border-slate-800 text-[#2c1d11] dark:text-white pt-12 sm:pt-16 pb-12 transition-colors duration-300">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 sm:gap-10 pb-10 sm:pb-12 border-b border-[#f3e9e2] dark:border-slate-800">
                        
                        <div className="flex flex-col gap-3">
                            <div className="flex items-center gap-3">
                                <Branding size="h-8 sm:h-9" showText={false} />
                                <span className="text-[#2c1d11] dark:text-white font-extrabold text-lg sm:text-xl tracking-tight">PULSO</span>
                            </div>
                            <p className="text-xs text-[#736254] dark:text-slate-400 leading-relaxed font-medium">
                                {t('landing.footer.desc', 'Smart Utility Locator & Monitoring Platform for Caloocan City.')}
                            </p>
                        </div>

                        <div>
                            <h4 className="text-[#2c1d11] dark:text-white font-bold text-xs uppercase tracking-wider mb-3 sm:mb-4">{t('landing.footer.portals_header', 'Portals')}</h4>
                            <ul className="space-y-2 text-xs font-medium text-[#736254] dark:text-slate-400">
                                <li><a href="/login" className="hover:text-[#ff6b00] transition-colors">{t('landing.footer.resident_portal', 'Resident Portal')}</a></li>
                                <li><a href="/gov" className="hover:text-[#ff6b00] transition-colors font-bold text-[#2c1d11] dark:text-white">{t('landing.footer.gov_gateway', 'Government Gateway')}</a></li>
                                <li><a href="/dispatcher" className="hover:text-[#ff6b00] transition-colors">{t('landing.footer.dispatch_ops', 'Dispatch Operations')}</a></li>
                            </ul>
                        </div>

                        <div>
                            <h4 className="text-[#2c1d11] dark:text-white font-bold text-xs uppercase tracking-wider mb-3 sm:mb-4">{t('landing.footer.office_header', 'Office')}</h4>
                            <ul className="space-y-2 text-xs font-medium text-[#736254] dark:text-slate-400">
                                <li>{t('landing.footer.office_dept', 'City Engineering Department')}</li>
                                <li>{t('landing.footer.office_hall', 'Caloocan City Hall')}</li>
                                <li>{t('landing.footer.office_road', 'Camarin Road, Caloocan City')}</li>
                            </ul>
                        </div>

                        <div>
                            <h4 className="text-[#2c1d11] dark:text-white font-bold text-xs uppercase tracking-wider mb-3 sm:mb-4">{t('landing.footer.contact_header', 'Contact')}</h4>
                            <ul className="space-y-2 text-xs font-medium text-[#736254] dark:text-slate-400">
                                <li>Phone: (02) 8888-CALOOCAN</li>
                                <li>Email: engineering@caloocan.gov.ph</li>
                            </ul>
                        </div>
                    </div>

                    <div className="pt-6 sm:pt-8 flex flex-col sm:flex-row justify-between items-center text-xs font-medium text-[#736254] dark:text-slate-400 gap-4 text-center sm:text-left">
                        <span>&copy; {new Date().getFullYear()} {t('landing.footer.rights', 'LGU Caloocan City. All rights reserved.')}</span>
                        <div className="flex gap-6">
                            <button type="button" onClick={() => setLegalModal({ isOpen: true, tab: 'privacy' })} className="hover:text-[#ff6b00] transition-colors cursor-pointer">{t('landing.footer.privacy', 'Privacy Policy')}</button>
                            <button type="button" onClick={() => setLegalModal({ isOpen: true, tab: 'terms' })} className="hover:text-[#ff6b00] transition-colors cursor-pointer">{t('landing.footer.terms', 'Terms of Service')}</button>
                        </div>
                    </div>
                </div>
            </footer>

            <LegalModal
                isOpen={legalModal.isOpen}
                onClose={() => setLegalModal(prev => ({ ...prev, isOpen: false }))}
                initialTab={legalModal.tab}
            />
        </div>
    );
}

export default Landing;
