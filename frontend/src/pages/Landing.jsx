import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
    MapPinned, Activity, BrainCircuit, ArrowRight, ActivitySquare,
    Menu, X, Trash2, Route as RouteIcon, Zap, Shield, BarChart3,
    Users, CheckCircle2, Sun, Moon, Monitor, ClipboardCheck, Camera,
    Bot, Headphones, Wrench, ExternalLink, Clock, Phone, Mail,
    UserCheck, Accessibility, Heart, FileText
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import Branding from '../components/Branding';
import Hero3D from '../Hero3D';
import PremiumHeroBackground from '../components/PremiumHeroBackground';
import ErrorBoundary from '../components/ErrorBoundary';
import '../index.css';

// Using unified Branding component instead of inline SVG

function Landing() {
    const { t } = useTranslation();
    const [scrolled, setScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Animation variants
    const fadeUp = {
        hidden: { opacity: 0, y: 30 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } }
    };

    const staggerContainer = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.2 }
        }
    };

    const { theme, changeTheme } = useTheme();

    return (
        <div className="min-h-screen flex flex-col font-sans bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 relative transition-colors duration-500">
            <PremiumHeroBackground>
                <div className="absolute inset-0">
                    <ErrorBoundary fallback={<div className="w-full h-full" />}>
                        <Hero3D />
                    </ErrorBoundary>
                </div>
                {/* Bottom transition gradient to help text readability */}
                <div className="absolute bottom-0 left-0 w-full h-[30vh] bg-gradient-to-t from-white dark:from-[#020617] to-transparent z-30 pointer-events-none" />
            </PremiumHeroBackground>

            {/* Navbar Fixed */}

            {/* Navbar Fixed */}
            <nav className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${scrolled ? 'glass-nav py-3' : 'bg-transparent py-6'}`}>
                <div className="max-w-7xl mx-auto px-6 lg:px-8 flex justify-between items-center">
                    <div className="flex items-center">
                        <Branding size={scrolled ? "h-9" : "h-11"} />
                    </div>
                    <ul className="hidden md:flex gap-8 items-center text-sm font-medium text-slate-600 dark:text-slate-300">
                        <li><a href="#home" className="hover:text-orange-500 dark:hover:text-orange-400 transition-colors">{t('landing.nav.home')}</a></li>
                        <li><a href="#features" className="hover:text-orange-500 dark:hover:text-orange-400 transition-colors">{t('landing.nav.platform')}</a></li>
                        <li><a href="#solutions" className="hover:text-orange-500 dark:hover:text-orange-400 transition-colors">{t('landing.nav.solutions')}</a></li>
                        <li><a href="#about" className="hover:text-orange-500 dark:hover:text-orange-400 transition-colors">{t('landing.nav.about')}</a></li>
                    </ul>

                    <div className="hidden md:flex gap-4 items-center">
                        {/* Theme Switcher Toggle */}
                        <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1 border border-slate-200 dark:border-slate-700">
                            <button onClick={() => changeTheme('light')} className={`p-1.5 rounded-md transition-all ${theme === 'light' ? 'bg-white dark:bg-slate-600 shadow-sm text-orange-500' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}><Sun size={14} /></button>
                            <button onClick={() => changeTheme('system')} className={`p-1.5 rounded-md transition-all ${theme === 'system' ? 'bg-white dark:bg-slate-600 shadow-sm text-orange-500' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}><Monitor size={14} /></button>
                            <button onClick={() => changeTheme('dark')} className={`p-1.5 rounded-md transition-all ${theme === 'dark' ? 'bg-white dark:bg-slate-600 shadow-sm text-orange-500' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}><Moon size={14} /></button>
                        </div>

                        <a href="/login" className="flex items-center gap-2 bg-gradient-to-r from-orange-500 to-orange-400 hover:from-orange-600 hover:to-orange-500 text-white px-5 py-2.5 rounded-lg font-semibold text-sm transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5">
                            {t('landing.nav.login')} <ArrowRight size={16} />
                        </a>
                    </div>

                    {/* Mobile Menu Toggle */}
                    <button className="md:hidden text-orange-500 p-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                        {mobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
                    </button>
                </div>

                {/* Mobile Navigation Dropdown */}
                {mobileMenuOpen && (
                    <div className="absolute top-full left-0 w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl shadow-2xl py-6 px-6 flex flex-col gap-4 md:hidden transition-colors relative">
                        <div className="absolute -bottom-8 left-0 w-full h-8 bg-gradient-to-b from-slate-200/50 to-transparent dark:from-slate-800/80 dark:to-transparent pointer-events-none"></div>
                        <a href="#home" className="text-slate-800 dark:text-slate-200 font-bold py-2 border-b border-slate-200 dark:border-slate-700" onClick={() => setMobileMenuOpen(false)}>{t('landing.nav.home')}</a>
                        <a href="#features" className="text-slate-800 dark:text-slate-200 font-bold py-2 border-b border-slate-200 dark:border-slate-700" onClick={() => setMobileMenuOpen(false)}>{t('landing.nav.platform')}</a>
                        <a href="#solutions" className="text-slate-800 dark:text-slate-200 font-bold py-2 border-b border-slate-200 dark:border-slate-700" onClick={() => setMobileMenuOpen(false)}>{t('landing.nav.solutions')}</a>
                        <a href="#about" className="text-slate-800 dark:text-slate-200 font-bold py-2 mb-4" onClick={() => setMobileMenuOpen(false)}>{t('landing.nav.about')}</a>

                        {/* Mobile Theme Switcher Toggle */}
                        <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1 border border-slate-200 dark:border-slate-700 mb-2">
                            <button onClick={() => { changeTheme('light'); setMobileMenuOpen(false); }} className={`flex-1 flex justify-center p-2 rounded-md transition-all ${theme === 'light' ? 'bg-white dark:bg-slate-600 shadow-sm text-orange-500' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}><Sun size={18} /></button>
                            <button onClick={() => { changeTheme('system'); setMobileMenuOpen(false); }} className={`flex-1 flex justify-center p-2 rounded-md transition-all ${theme === 'system' ? 'bg-white dark:bg-slate-600 shadow-sm text-orange-500' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}><Monitor size={18} /></button>
                            <button onClick={() => { changeTheme('dark'); setMobileMenuOpen(false); }} className={`flex-1 flex justify-center p-2 rounded-md transition-all ${theme === 'dark' ? 'bg-white dark:bg-slate-600 shadow-sm text-orange-500' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}><Moon size={18} /></button>
                        </div>

                        <a href="/login" className="w-full justify-center flex items-center gap-2 bg-gradient-to-r from-orange-500 to-orange-400 hover:from-orange-600 hover:to-orange-500 text-white px-5 py-3 rounded-lg font-bold text-base transition-all shadow-md">
                            {t('landing.nav.login')} <ArrowRight size={18} />
                        </a>
                    </div>
                )}
            </nav>

            {/* Hero Interactivity */}
            <section id="home" className="relative min-h-[90vh] flex items-center pt-32 pb-20 overflow-hidden transition-colors duration-500">
                {/* Dark Mode Background */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-900/20 via-slate-950 to-slate-950 dark:block hidden z-0"></div>
                
                {/* Light Mode Aurora Borealis Background */}
                <div className="absolute inset-0 dark:hidden overflow-hidden z-0">
                    <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-orange-300/30 rounded-full blur-[120px] mix-blend-multiply opacity-80 animate-blob pointer-events-none"></div>
                    <div className="absolute top-1/4 left-1/4 w-[700px] h-[700px] bg-emerald-300/20 rounded-full blur-[140px] mix-blend-multiply opacity-80 animate-blob animation-delay-2000 pointer-events-none"></div>
                    <div className="absolute -bottom-32 left-1/2 w-[800px] h-[800px] bg-teal-200/30 rounded-full blur-[120px] mix-blend-multiply opacity-70 animate-blob animation-delay-4000 pointer-events-none"></div>
                </div>

                <div className="max-w-7xl mx-auto px-6 lg:px-8 w-full grid grid-cols-1 lg:grid-cols-2 gap-12 mt-12 items-center relative z-10">

                    {/* Left: Copy & Actions */}
                    <motion.div
                        className="max-w-xl bg-white/70 dark:bg-slate-950/70 p-8 rounded-3xl backdrop-blur-3xl border border-white/50 dark:border-slate-700/50 shadow-2xl transition-colors duration-500"
                        initial="hidden"
                        animate="visible"
                        variants={staggerContainer}
                    >


                        <motion.h1 variants={fadeUp} className="font-display font-bold text-4xl sm:text-5xl lg:text-6xl leading-[1.1] tracking-tight mb-6 text-slate-900 dark:text-white">
                            {t('landing.hero.title1')}<br /><span className="text-gradient">{t('landing.hero.title2')}</span>
                        </motion.h1>

                        <motion.p variants={fadeUp} className="text-lg text-slate-600 dark:text-slate-300 mb-8 leading-relaxed font-medium">
                            {t('landing.hero.subtitle')}
                        </motion.p>

                        <motion.div variants={fadeUp} className="flex flex-wrap gap-4">
                            <a href="/register" className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors shadow-lg hover:shadow-xl hover:-translate-y-0.5 flex items-center gap-2">
                                {t('landing.hero.register')}
                            </a>
                            <button className="bg-white/60 dark:bg-slate-800/60 hover:bg-white dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500 px-6 py-3 rounded-lg font-semibold transition-all">
                                {t('landing.hero.docs')}
                            </button>
                        </motion.div>
                    </motion.div>

                    {/* Right side is empty to let the background map shine through clearly */}
                    <div className="hidden lg:block"></div>
                </div>
                
                {/* Clean gradient fade at the bottom of the hero section so it blends into the rest of the page */}
                <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-white dark:from-slate-950 to-transparent pointer-events-none z-20" />
            </section>

            {/* Features Grid */}
            <section id="features" className="relative z-10 py-24 bg-white/10 dark:bg-slate-950/40 backdrop-blur-xl transition-colors">
                <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-b from-slate-200/50 to-transparent dark:from-slate-900/80 dark:to-transparent pointer-events-none"></div>
                <div className="max-w-7xl mx-auto px-6 lg:px-8">
                    <motion.div
                        className="text-center max-w-3xl mx-auto mb-16"
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: "-100px" }}
                        variants={fadeUp}
                    >
                        <h2 className="font-display font-bold text-3xl md:text-4xl tracking-tight mb-4 text-slate-900 dark:text-white">{t('landing.features.title')}</h2>
                        <p className="text-lg text-slate-500 dark:text-slate-400 leading-relaxed max-w-2xl mx-auto">
                            {t('landing.features.subtitle')}
                        </p>
                    </motion.div>

                    <motion.div
                        className="grid grid-cols-1 md:grid-cols-3 gap-8"
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: "-50px" }}
                        variants={staggerContainer}
                    >
                        {/* Feature 1 */}
                        <motion.div variants={fadeUp} className="glass-card p-8 rounded-2xl">
                            <div className="w-14 h-14 bg-orange-100 dark:bg-orange-500/10 text-orange-500 rounded-xl flex items-center justify-center mb-6">
                                <MapPinned size={28} />
                            </div>
                            <h3 className="font-display font-bold text-xl mb-3 text-slate-800 dark:text-slate-100 uppercase tracking-wide">{t('landing.features.f1_title')}</h3>
                            <p className="text-slate-500 dark:text-slate-400 leading-relaxed text-sm">
                                {t('landing.features.f1_desc')}
                            </p>
                        </motion.div>

                        {/* Feature 2 */}
                        <motion.div variants={fadeUp} className="glass-card p-8 rounded-2xl">
                            <div className="w-14 h-14 bg-orange-100 dark:bg-orange-500/10 text-orange-500 rounded-xl flex items-center justify-center mb-6">
                                <Activity size={28} />
                            </div>
                            <h3 className="font-display font-bold text-xl mb-3 text-slate-800 dark:text-slate-100 uppercase tracking-wide">{t('landing.features.f2_title')}</h3>
                            <p className="text-slate-500 dark:text-slate-400 leading-relaxed text-sm">
                                {t('landing.features.f2_desc')}
                            </p>
                        </motion.div>

                        {/* Feature 3 */}
                        <motion.div variants={fadeUp} className="glass-card p-8 rounded-2xl">
                            <div className="w-14 h-14 bg-orange-100 dark:bg-orange-500/10 text-orange-500 rounded-xl flex items-center justify-center mb-6">
                                <BrainCircuit size={28} />
                            </div>
                            <h3 className="font-display font-bold text-xl mb-3 text-slate-800 dark:text-slate-100 uppercase tracking-wide">{t('landing.features.f3_title')}</h3>
                            <p className="text-slate-500 dark:text-slate-400 leading-relaxed text-sm">
                                {t('landing.features.f3_desc')}
                            </p>
                        </motion.div>
                    </motion.div>
                </div>
            </section>

            {/* How It Works Section */}
            <section id="howitworks" className="relative z-10 py-24 bg-slate-50 dark:bg-slate-900 transition-colors">
                <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-b from-slate-200/50 to-transparent dark:from-slate-900/80 dark:to-transparent pointer-events-none"></div>
                <div className="max-w-7xl mx-auto px-6 lg:px-8">
                    <motion.div
                        className="text-center max-w-3xl mx-auto mb-16"
                        initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeUp}
                    >
                        <div className="inline-flex items-center gap-2 text-orange-600 dark:text-orange-400 font-bold text-sm tracking-widest uppercase mb-4">
                            <ClipboardCheck size={16} /> {t('landing.howitworks.badge')}
                        </div>
                        <h2 className="font-display font-bold text-3xl md:text-4xl tracking-tight mb-4 text-slate-900 dark:text-white">{t('landing.howitworks.title')}</h2>
                        <p className="text-lg text-slate-500 dark:text-slate-400 leading-relaxed max-w-2xl mx-auto">
                            {t('landing.howitworks.subtitle')}
                        </p>
                    </motion.div>

                    {/* Steps */}
                    <motion.div
                        className="relative"
                        initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} variants={staggerContainer}
                    >
                        {/* Connector line (desktop) */}
                        <div className="hidden lg:block absolute top-10 left-[10%] right-[10%] h-0.5 bg-gradient-to-r from-orange-200 via-orange-400 to-orange-200 dark:from-orange-500/20 dark:via-orange-500/60 dark:to-orange-500/20" />

                        <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
                            {[
                                { icon: <UserCheck size={22} />, key: 's1', color: 'from-orange-500 to-orange-600' },
                                { icon: <Camera size={22} />, key: 's2', color: 'from-amber-500 to-orange-500' },
                                { icon: <Bot size={22} />, key: 's3', color: 'from-violet-500 to-indigo-500' },
                                { icon: <Headphones size={22} />, key: 's4', color: 'from-blue-500 to-cyan-500' },
                                { icon: <Wrench size={22} />, key: 's5', color: 'from-emerald-500 to-teal-500' },
                            ].map((step, i) => (
                                <motion.div key={step.key} variants={fadeUp} className="flex flex-col items-center text-center group">
                                    <div className="relative mb-6">
                                        <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${step.color} text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                                            {step.icon}
                                        </div>
                                        <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center text-xs font-extrabold shadow-md border-2 border-white dark:border-slate-900">
                                            {i + 1}
                                        </div>
                                    </div>
                                    <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 mb-2">
                                        {t(`landing.howitworks.${step.key}_title`)}
                                    </h3>
                                    <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
                                        {t(`landing.howitworks.${step.key}_desc`)}
                                    </p>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Solutions Section */}
            <section id="solutions" className="relative z-10 py-24 bg-white dark:bg-slate-950 transition-colors">
                <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-b from-slate-200/50 to-transparent dark:from-slate-900/80 dark:to-transparent pointer-events-none"></div>

                <div className="max-w-7xl mx-auto px-6 lg:px-8">
                    <motion.div
                        className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6"
                        initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeUp}
                    >
                        <div className="max-w-2xl">
                            <div className="inline-flex items-center gap-2 text-orange-600 dark:text-orange-400 font-bold text-sm tracking-widest uppercase mb-3">
                                <Shield size={16} /> {t('landing.solutions.badge')}
                            </div>
                            <h2 className="font-display font-bold text-3xl md:text-5xl tracking-tight text-slate-900 dark:text-white leading-tight">
                                {t('landing.solutions.title')}
                            </h2>
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 font-medium max-w-sm">
                            {t('landing.solutions.subtitle')}
                        </p>
                    </motion.div>

                    <motion.div
                        className="grid grid-cols-1 md:grid-cols-3 gap-6"
                        initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} variants={staggerContainer}
                    >
                        {/* Solution 1 */}
                        <motion.div variants={fadeUp} className="group bg-white dark:bg-slate-800 p-1 rounded-3xl shadow-sm hover:shadow-2xl transition-all duration-500 border border-slate-200 dark:border-slate-700 hover:border-emerald-200 dark:hover:border-emerald-500/50">
                            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-[1.3rem] p-8 h-full transition-colors group-hover:bg-emerald-50/50 dark:group-hover:bg-emerald-900/20">
                                <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center mb-6 shadow-sm">
                                    <Trash2 size={24} />
                                </div>
                                <h3 className="font-bold text-xl mb-3 text-slate-900 dark:text-slate-100">{t('landing.solutions.s1_title')}</h3>
                                <p className="text-slate-500 dark:text-slate-400 leading-relaxed text-sm mb-6">
                                    {t('landing.solutions.s1_desc')}
                                </p>
                                <ul className="space-y-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                                    <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-500" /> {t('landing.solutions.s1_l1')}</li>
                                    <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-500" /> {t('landing.solutions.s1_l2')}</li>
                                </ul>
                            </div>
                        </motion.div>

                        {/* Solution 2 */}
                        <motion.div variants={fadeUp} className="group bg-white dark:bg-slate-800 p-1 rounded-3xl shadow-sm hover:shadow-2xl transition-all duration-500 border border-slate-200 dark:border-slate-700 hover:border-orange-200 dark:hover:border-orange-500/50">
                            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-[1.3rem] p-8 h-full transition-colors group-hover:bg-orange-50/50 dark:group-hover:bg-orange-900/20">
                                <div className="w-12 h-12 bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 rounded-xl flex items-center justify-center mb-6 shadow-sm">
                                    <RouteIcon size={24} />
                                </div>
                                <h3 className="font-bold text-xl mb-3 text-slate-900 dark:text-slate-100">{t('landing.solutions.s2_title')}</h3>
                                <p className="text-slate-500 dark:text-slate-400 leading-relaxed text-sm mb-6">
                                    {t('landing.solutions.s2_desc')}
                                </p>
                                <ul className="space-y-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                                    <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-orange-500" /> {t('landing.solutions.s2_l1')}</li>
                                    <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-orange-500" /> {t('landing.solutions.s2_l2')}</li>
                                </ul>
                            </div>
                        </motion.div>

                        {/* Solution 3 */}
                        <motion.div variants={fadeUp} className="group bg-white dark:bg-slate-800 p-1 rounded-3xl shadow-sm hover:shadow-2xl transition-all duration-500 border border-slate-200 dark:border-slate-700 hover:border-yellow-200 dark:hover:border-yellow-500/50">
                            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-[1.3rem] p-8 h-full transition-colors group-hover:bg-yellow-50/50 dark:group-hover:bg-yellow-900/20">
                                <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 rounded-xl flex items-center justify-center mb-6 shadow-sm">
                                    <Zap size={24} />
                                </div>
                                <h3 className="font-bold text-xl mb-3 text-slate-900 dark:text-slate-100">{t('landing.solutions.s3_title')}</h3>
                                <p className="text-slate-500 dark:text-slate-400 leading-relaxed text-sm mb-6">
                                    {t('landing.solutions.s3_desc')}
                                </p>
                                <ul className="space-y-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                                    <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-yellow-600" /> {t('landing.solutions.s3_l1')}</li>
                                    <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-yellow-600" /> {t('landing.solutions.s3_l2')}</li>
                                </ul>
                            </div>
                        </motion.div>
                    </motion.div>
                </div>
            </section>

            {/* City Services Section */}
            <section id="cityservices" className="relative z-10 py-24 bg-slate-50 dark:bg-slate-900 transition-colors">
                <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-b from-slate-200/50 to-transparent dark:from-slate-900/80 dark:to-transparent pointer-events-none"></div>
                <div className="max-w-7xl mx-auto px-6 lg:px-8">
                    <motion.div
                        className="flex flex-col md:flex-row justify-between items-end mb-14 gap-6"
                        initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeUp}
                    >
                        <div>
                            <div className="inline-flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-sm tracking-widest uppercase mb-3">
                                <ExternalLink size={16} /> {t('landing.services.badge')}
                            </div>
                            <h2 className="font-display font-bold text-3xl md:text-5xl tracking-tight text-slate-900 dark:text-white leading-tight">
                                {t('landing.services.title')}
                            </h2>
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 font-medium max-w-sm">
                            {t('landing.services.subtitle')}
                        </p>
                    </motion.div>

                    <motion.div
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
                        initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} variants={staggerContainer}
                    >
                        {/* Senior ID */}
                        <motion.div variants={fadeUp} className="group bg-white dark:bg-slate-800 p-1 rounded-3xl shadow-sm hover:shadow-2xl transition-all duration-500 border border-slate-200 dark:border-slate-700 hover:border-indigo-200 dark:hover:border-indigo-500/50">
                            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-[1.3rem] p-7 h-full flex flex-col group-hover:bg-indigo-50/50 dark:group-hover:bg-indigo-900/20 transition-colors">
                                <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center mb-5 shadow-sm">
                                    <Users size={24} />
                                </div>
                                <h3 className="font-bold text-lg mb-2 text-slate-900 dark:text-slate-100">{t('landing.services.senior_title')}</h3>
                                <p className="text-slate-500 dark:text-slate-400 leading-relaxed text-sm mb-5 flex-grow">{t('landing.services.senior_desc')}</p>
                                <ul className="space-y-2 text-sm">
                                    <li><a href="http://oscanew.caloocanservices.online/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-semibold transition-colors"><CheckCircle2 size={13} /> {t('landing.services.senior_l1')}</a></li>
                                    <li><a href="https://osca.caloocanservices.online/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-semibold transition-colors"><CheckCircle2 size={13} /> {t('landing.services.senior_l2')}</a></li>
                                    <li><a href="https://oscaverify.caloocanservices.online/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-semibold transition-colors"><CheckCircle2 size={13} /> {t('landing.services.senior_l3')}</a></li>
                                </ul>
                            </div>
                        </motion.div>

                        {/* PWD */}
                        <motion.div variants={fadeUp} className="group bg-white dark:bg-slate-800 p-1 rounded-3xl shadow-sm hover:shadow-2xl transition-all duration-500 border border-slate-200 dark:border-slate-700 hover:border-purple-200 dark:hover:border-purple-500/50">
                            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-[1.3rem] p-7 h-full flex flex-col group-hover:bg-purple-50/50 dark:group-hover:bg-purple-900/20 transition-colors">
                                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 rounded-xl flex items-center justify-center mb-5 shadow-sm">
                                    <Accessibility size={24} />
                                </div>
                                <h3 className="font-bold text-lg mb-2 text-slate-900 dark:text-slate-100">{t('landing.services.pwd_title')}</h3>
                                <p className="text-slate-500 dark:text-slate-400 leading-relaxed text-sm mb-5 flex-grow">{t('landing.services.pwd_desc')}</p>
                                <ul className="space-y-2 text-sm">
                                    <li><a href="https://pwd.caloocanservices.online/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 font-semibold transition-colors"><CheckCircle2 size={13} /> {t('landing.services.pwd_l1')}</a></li>
                                    <li><a href="https://pwdverify.caloocanservices.online/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 font-semibold transition-colors"><CheckCircle2 size={13} /> {t('landing.services.pwd_l2')}</a></li>
                                    <li><a href="https://pwd.caloocanservices.online/verify" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 font-semibold transition-colors"><CheckCircle2 size={13} /> {t('landing.services.pwd_l3')}</a></li>
                                </ul>
                            </div>
                        </motion.div>

                        {/* Solo Parent */}
                        <motion.div variants={fadeUp} className="group bg-white dark:bg-slate-800 p-1 rounded-3xl shadow-sm hover:shadow-2xl transition-all duration-500 border border-slate-200 dark:border-slate-700 hover:border-rose-200 dark:hover:border-rose-500/50">
                            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-[1.3rem] p-7 h-full flex flex-col group-hover:bg-rose-50/50 dark:group-hover:bg-rose-900/20 transition-colors">
                                <div className="w-12 h-12 bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 rounded-xl flex items-center justify-center mb-5 shadow-sm">
                                    <Heart size={24} />
                                </div>
                                <h3 className="font-bold text-lg mb-2 text-slate-900 dark:text-slate-100">{t('landing.services.solo_title')}</h3>
                                <p className="text-slate-500 dark:text-slate-400 leading-relaxed text-sm mb-5 flex-grow">{t('landing.services.solo_desc')}</p>
                                <ul className="space-y-2 text-sm">
                                    <li><a href="https://soloparent.caloocanservices.online/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-rose-600 dark:text-rose-400 hover:text-rose-800 dark:hover:text-rose-300 font-semibold transition-colors"><CheckCircle2 size={13} /> {t('landing.services.solo_l1')}</a></li>
                                    <li><a href="https://soloparent.caloocanservices.online/tracker/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-rose-600 dark:text-rose-400 hover:text-rose-800 dark:hover:text-rose-300 font-semibold transition-colors"><CheckCircle2 size={13} /> {t('landing.services.solo_l2')}</a></li>
                                </ul>
                            </div>
                        </motion.div>

                        {/* GAD */}
                        <motion.div variants={fadeUp} className="group bg-white dark:bg-slate-800 p-1 rounded-3xl shadow-sm hover:shadow-2xl transition-all duration-500 border border-slate-200 dark:border-slate-700 hover:border-teal-200 dark:hover:border-teal-500/50">
                            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-[1.3rem] p-7 h-full flex flex-col group-hover:bg-teal-50/50 dark:group-hover:bg-teal-900/20 transition-colors">
                                <div className="w-12 h-12 bg-teal-100 dark:bg-teal-500/20 text-teal-600 dark:text-teal-400 rounded-xl flex items-center justify-center mb-5 shadow-sm">
                                    <FileText size={24} />
                                </div>
                                <h3 className="font-bold text-lg mb-2 text-slate-900 dark:text-slate-100">{t('landing.services.gad_title')}</h3>
                                <p className="text-slate-500 dark:text-slate-400 leading-relaxed text-sm mb-5 flex-grow">{t('landing.services.gad_desc')}</p>
                                <ul className="space-y-2 text-sm">
                                    <li><a href="https://gadplan.caloocanservices.online/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-teal-600 dark:text-teal-400 hover:text-teal-800 dark:hover:text-teal-300 font-semibold transition-colors"><CheckCircle2 size={13} /> {t('landing.services.gad_l1')}</a></li>
                                    <li><a href="https://gadplan.caloocanservices.online/verify.php" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-teal-600 dark:text-teal-400 hover:text-teal-800 dark:hover:text-teal-300 font-semibold transition-colors"><CheckCircle2 size={13} /> {t('landing.services.gad_l2')}</a></li>
                                </ul>
                            </div>
                        </motion.div>
                    </motion.div>

                    {/* Portal CTA */}
                    <motion.div
                        className="mt-10 text-center"
                        initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
                    >
                        <a
                            href="https://caloocanservices.online/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 border-2 border-indigo-300 dark:border-indigo-500/50 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-500 hover:border-indigo-600 dark:hover:border-indigo-500 font-bold px-8 py-3 rounded-xl transition-all duration-300"
                        >
                            {t('landing.services.portal_link')} <ExternalLink size={16} />
                        </a>
                    </motion.div>
                </div>
            </section>

            {/* About LGU Section */}
            <section id="about" className="relative z-10 py-32 bg-white dark:bg-slate-950 overflow-hidden transition-colors">
                <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-b from-slate-200/50 to-transparent dark:from-slate-900/80 dark:to-transparent pointer-events-none"></div>
                <div className="absolute top-1/2 left-0 w-[800px] h-[800px] bg-orange-50 dark:bg-orange-500/5 rounded-full blur-[120px] -translate-y-1/2 -translate-x-1/2 opacity-50 pointer-events-none"></div>

                <div className="max-w-7xl mx-auto px-6 lg:px-8 relative grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

                    {/* Left: Content */}
                    <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeUp}>
                        <div className="inline-flex items-center gap-2 text-orange-600 dark:text-orange-400 font-bold text-sm tracking-widest uppercase mb-4">
                            <Users size={16} /> {t('landing.about.badge')}
                        </div>
                        <h2 className="font-display font-bold text-3xl md:text-5xl tracking-tight text-slate-900 dark:text-white leading-[1.15] mb-6">
                            {t('landing.about.title')}
                        </h2>
                        <div className="space-y-6 text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
                            <p dangerouslySetInnerHTML={{ __html: t('landing.about.p1').replace('<1>', '<strong>').replace('</1>', '</strong>') }} />
                            <p>
                                {t('landing.about.p2')}
                            </p>
                        </div>

                        <div className="mt-10 pt-10 flex flex-col sm:flex-row items-center gap-8 relative">
                            <div className="absolute top-0 left-0 w-full h-8 bg-gradient-to-b from-slate-200/50 to-transparent dark:from-slate-800/50 dark:to-transparent pointer-events-none"></div>
                            <div className="flex flex-col">
                                <span className="text-4xl font-display font-bold text-slate-900 dark:text-white">{t('landing.about.stat1_val')}</span>
                                <span className="text-sm font-bold text-orange-500 uppercase tracking-widest mt-1">{t('landing.about.stat1_lbl')}</span>
                            </div>
                            <div className="hidden sm:block w-px h-12 bg-gradient-to-b from-slate-200 dark:from-slate-800 to-transparent pointer-events-none"></div>
                            <div className="flex flex-col">
                                <span className="text-4xl font-display font-bold text-slate-900 dark:text-white">{t('landing.about.stat2_val')}</span>
                                <span className="text-sm font-bold text-orange-500 uppercase tracking-widest mt-1">{t('landing.about.stat2_lbl')}</span>
                            </div>
                            <div className="hidden sm:block w-px h-12 bg-gradient-to-b from-slate-200 dark:from-slate-800 to-transparent pointer-events-none"></div>
                            <div className="flex flex-col">
                                <span className="text-4xl font-display font-bold text-slate-900 dark:text-white">{t('landing.about.stat3_val')}</span>
                                <span className="text-sm font-bold text-orange-500 uppercase tracking-widest mt-1">{t('landing.about.stat3_lbl')}</span>
                            </div>
                        </div>
                    </motion.div>

                    {/* Right: Graphic / Stats Box */}
                    <motion.div
                        initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeUp}
                        className="relative"
                    >
                        <div className="absolute inset-0 bg-gradient-to-tr from-orange-200 to-orange-50 dark:from-orange-500/20 dark:to-orange-500/5 rounded-3xl transform rotate-3 scale-105 opacity-50"></div>
                        <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-3xl p-10 overflow-hidden transition-colors">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-100 dark:bg-orange-500/20 rounded-bl-[100px] -mr-8 -mt-8 flex items-end pb-6 pl-6">
                                <BarChart3 size={32} className="text-orange-500 dark:text-orange-400" />
                            </div>

                            <h3 className="font-display font-bold text-2xl text-slate-900 dark:text-white mb-2">{t('landing.about.analytics')}</h3>
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-8">{t('landing.about.analytics_desc')}</p>

                            <div className="space-y-6">
                                <div>
                                    <div className="flex justify-between text-sm font-bold mb-2">
                                        <span className="text-slate-700 dark:text-slate-300">{t('landing.about.metric1')}</span>
                                        <span className="text-orange-600 dark:text-orange-400">87%</span>
                                    </div>
                                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-3 rounded-full overflow-hidden">
                                        <div className="bg-orange-500 h-full rounded-full w-[87%] relative overflow-hidden">
                                            <div className="absolute top-0 left-0 w-full h-full bg-white/20 -skew-x-12 translate-x-[-100%] animate-[shimmer_2s_infinite]"></div>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <div className="flex justify-between text-sm font-bold mb-2">
                                        <span className="text-slate-700 dark:text-slate-300">{t('landing.about.metric2')}</span>
                                        <span className="text-slate-900 dark:text-white">92%</span>
                                    </div>
                                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-3 rounded-full overflow-hidden">
                                        <div className="bg-slate-800 dark:bg-slate-400 h-full rounded-full w-[92%]"></div>
                                    </div>
                                </div>

                                <div>
                                    <div className="flex justify-between text-sm font-bold mb-2">
                                        <span className="text-slate-700 dark:text-slate-300">{t('landing.about.metric3')}</span>
                                        <span className="text-slate-900 dark:text-white">64%</span>
                                    </div>
                                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-3 rounded-full overflow-hidden">
                                        <div className="bg-slate-300 dark:bg-slate-600 h-full rounded-full w-[64%]"></div>
                                    </div>
                                </div>
                            </div>

                            <button className="w-full mt-10 border-2 border-slate-200 dark:border-slate-700 hover:border-orange-500 dark:hover:border-orange-500 text-slate-700 dark:text-slate-300 hover:text-orange-600 dark:hover:text-orange-400 font-bold p-3 rounded-xl transition-colors flex items-center justify-center gap-2">
                                {t('landing.about.portal_btn')} <ArrowRight size={16} />
                            </button>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Comprehensive Professional Footer */}
            <footer className="relative z-10 bg-slate-900 pt-24 pb-12 text-slate-300">
                <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-slate-800 to-transparent"></div>
                <div className="max-w-7xl mx-auto px-6 lg:px-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8 mb-16">

                        <div className="flex flex-col gap-6">
                            <Branding size="h-10" />
                            <p className="text-slate-400 text-sm leading-relaxed pr-4">
                                {t('landing.footer.desc')}
                            </p>
                            <div className="flex items-center gap-4 mt-2">
                                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center hover:bg-orange-500 hover:text-white transition-colors cursor-pointer text-slate-400">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" /></svg>
                                </div>
                                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center hover:bg-orange-500 hover:text-white transition-colors cursor-pointer text-slate-400">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" /></svg>
                                </div>
                                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center hover:bg-orange-500 hover:text-white transition-colors cursor-pointer text-slate-400">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" /></svg>
                                </div>
                            </div>
                        </div>

                        {/* Quick Portals */}
                        <div>
                            <h4 className="text-white font-bold text-lg mb-6 tracking-tight">Access Portals</h4>
                            <ul className="flex flex-col gap-3 font-medium text-sm">
                                <li><a href="/login" className="hover:text-orange-400 transition-colors flex items-center gap-2"><ArrowRight size={14} className="text-orange-500" /> Resident Login</a></li>
                                <li><a href="/gov" className="hover:text-orange-400 transition-colors flex items-center gap-2 font-bold text-white bg-white/5 p-2 rounded-lg border border-white/10 hover:bg-orange-500/20 transition-all"><Shield size={14} className="text-orange-500" /> Internal Gateway (Staff)</a></li>
                                <li><a href="/dispatcher" className="hover:text-orange-400 transition-colors flex items-center gap-2"><ArrowRight size={14} className="text-orange-500" /> Engineering Dispatch</a></li>
                                <li><a href="/management" className="hover:text-orange-400 transition-colors flex items-center gap-2"><ArrowRight size={14} className="text-orange-500" /> Command Management</a></li>
                            </ul>
                        </div>

                        {/* City Services */}
                        <div>
                            <h4 className="text-white font-bold text-lg mb-6 tracking-tight">{t('landing.footer.cityservices')}</h4>
                            <ul className="flex flex-col gap-3 font-medium text-sm">
                                <li><a href="http://oscanew.caloocanservices.online/" target="_blank" rel="noopener noreferrer" className="hover:text-orange-400 transition-colors flex items-center gap-2"><ExternalLink size={13} className="text-slate-500" /> {t('landing.footer.cs_senior')}</a></li>
                                <li><a href="https://pwd.caloocanservices.online/" target="_blank" rel="noopener noreferrer" className="hover:text-orange-400 transition-colors flex items-center gap-2"><ExternalLink size={13} className="text-slate-500" /> {t('landing.footer.cs_pwd')}</a></li>
                                <li><a href="https://soloparent.caloocanservices.online/" target="_blank" rel="noopener noreferrer" className="hover:text-orange-400 transition-colors flex items-center gap-2"><ExternalLink size={13} className="text-slate-500" /> {t('landing.footer.cs_solo')}</a></li>
                                <li><a href="https://gadplan.caloocanservices.online/" target="_blank" rel="noopener noreferrer" className="hover:text-orange-400 transition-colors flex items-center gap-2"><ExternalLink size={13} className="text-slate-500" /> {t('landing.footer.cs_gad')}</a></li>
                            </ul>
                        </div>

                        {/* Platform Features */}
                        <div>
                            <h4 className="text-white font-bold text-lg mb-6 tracking-tight">{t('landing.footer.platform')}</h4>
                            <ul className="flex flex-col gap-3 font-medium text-sm">
                                <li><a href="#features" className="hover:text-orange-400 transition-colors flex items-center gap-2"><ActivitySquare size={14} className="text-slate-500" /> {t('landing.features.f1_title')}</a></li>
                                <li><a href="#features" className="hover:text-orange-400 transition-colors flex items-center gap-2"><Activity size={14} className="text-slate-500" /> {t('landing.features.f2_title')}</a></li>
                                <li><a href="#features" className="hover:text-orange-400 transition-colors flex items-center gap-2"><BrainCircuit size={14} className="text-slate-500" /> {t('landing.features.f3_title')}</a></li>
                                <li><a href="#features" className="hover:text-orange-400 transition-colors flex items-center gap-2"><MapPinned size={14} className="text-slate-500" /> Caloocan North Grid</a></li>
                            </ul>
                        </div>

                        {/* Contact Info */}
                        <div>
                            <h4 className="text-white font-bold text-lg mb-6 tracking-tight">{t('landing.footer.contact')}</h4>
                            <ul className="flex flex-col gap-4 text-sm">
                                <li className="flex items-start gap-3">
                                    <div className="p-2 bg-slate-800 rounded-lg text-orange-500 shrink-0"><MapPinned size={16} /></div>
                                    <span className="text-slate-400 leading-relaxed" dangerouslySetInnerHTML={{ __html: t('landing.footer.address') }} />
                                </li>
                                <li className="flex items-center gap-3">
                                    <div className="p-2 bg-slate-800 rounded-lg text-orange-500 shrink-0">
                                        <Phone size={16} />
                                    </div>
                                    <span className="text-slate-400">(02) 336-5576</span>
                                </li>
                                <li className="flex items-center gap-3">
                                    <div className="p-2 bg-slate-800 rounded-lg text-orange-500 shrink-0">
                                        <Clock size={16} />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">{t('landing.footer.hours_label')}</span>
                                        <span className="text-slate-400">{t('landing.footer.hours')}</span>
                                    </div>
                                </li>
                                <li className="flex items-center gap-3">
                                    <div className="p-2 bg-slate-800 rounded-lg text-orange-500 shrink-0">
                                        <Mail size={16} />
                                    </div>
                                    <span className="text-slate-400">engineering@caloocancity.gov.ph</span>
                                </li>
                            </ul>
                        </div>
                    </div>

                    {/* Footer Bottom Sheet */}
                    <div className="pt-8 relative flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-b from-slate-200/50 to-transparent dark:from-slate-800/80 dark:to-transparent pointer-events-none"></div>
                        <div className="text-slate-500 text-sm font-medium">
                            &copy; {new Date().getFullYear()} {t('landing.footer.copyright')}
                        </div>
                        <div className="flex gap-6 text-sm font-medium text-slate-500">
                            <a href="#" className="hover:text-orange-400 transition-colors">{t('landing.footer.privacy')}</a>
                            <a href="#" className="hover:text-orange-400 transition-colors">{t('landing.footer.terms')}</a>
                            <a href="#" className="hover:text-orange-400 transition-colors">{t('landing.footer.cookie')}</a>
                        </div>
                    </div>
                </div>
            </footer>

        </div>
    );
}

export default Landing;
