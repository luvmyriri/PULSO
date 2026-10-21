import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MapPinned, Activity, BrainCircuit, ArrowRight, ActivitySquare, Menu, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Branding from '../components/Branding';

export default function LandingOverlay({ onNavigate }) {
    const { t } = useTranslation();
    const [scrolled, setScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const fadeUp = {
        hidden: { opacity: 0, y: 30 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
        exit: { opacity: 0, y: -20, transition: { duration: 0.3 } }
    };

    const staggerContainer = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
        exit: { opacity: 0, transition: { duration: 0.3 } }
    };

    return (
        <div className="relative min-h-[90vh] flex flex-col overflow-hidden bg-white">
            {/* Background elements */}
            <div className="absolute inset-0 bg-slate-50/50 -z-30" />
            <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-orange-50/50 to-transparent -z-20" />
            <div className="absolute -top-[10%] -right-[5%] w-[40%] aspect-square bg-orange-100/30 blur-[120px] rounded-full -z-10 animate-pulse" />
            <div className="absolute top-[20%] -left-[10%] w-[35%] aspect-square bg-blue-100/20 blur-[100px] rounded-full -z-10" />

            {/* Navigation Overlay */}
            <nav className={`fixed top-0 left-0 w-full z-[100] transition-all duration-300 px-6 lg:px-12 py-4 ${scrolled ? 'bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm' : ''}`}>
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <Branding size="lg" className="hover:scale-105 transition-transform" />

                    <ul className="hidden md:flex items-center gap-10 text-slate-600 font-semibold text-sm">
                        <li className="hover:text-orange-500 cursor-pointer transition-colors px-2 py-1 relative group">
                            {t('landing.nav.home')}
                            <span className="absolute bottom-0 left-0 w-full h-0.5 bg-orange-500 scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></span>
                        </li>
                        <li className="hover:text-orange-500 cursor-pointer transition-colors px-2 py-1">{t('landing.nav.platform')}</li>
                        <li className="hover:text-orange-500 cursor-pointer transition-colors px-2 py-1">{t('landing.nav.solutions')}</li>
                        <li className="hover:text-orange-500 cursor-pointer transition-colors px-2 py-1">{t('landing.nav.about')}</li>
                    </ul>

                    <div className="hidden md:flex gap-4">
                        <button onClick={() => onNavigate('login')} className="flex items-center gap-2 bg-gradient-to-r from-orange-500 to-orange-400 hover:from-orange-600 hover:to-orange-500 text-white px-6 py-2.5 rounded-xl font-bold text-sm transition-all shadow-lg shadow-orange-500/20 hover:shadow-orange-500/40 hover:-translate-y-0.5">
                            {t('landing.nav.login')} <ArrowRight size={16} />
                        </button>
                    </div>

                    <button className="md:hidden text-orange-500 p-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                        {mobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
                    </button>
                </div>

                {mobileMenuOpen && (
                    <div className="absolute top-full left-0 w-full bg-white/95 backdrop-blur-xl border-b border-slate-200 shadow-2xl py-6 px-6 flex flex-col gap-4 md:hidden">
                        <button onClick={() => { onNavigate('login'); setMobileMenuOpen(false); }} className="w-full justify-center flex items-center gap-2 bg-gradient-to-r from-orange-500 to-orange-400 text-white px-5 py-4 rounded-xl font-bold text-lg transition-all shadow-lg">
                            {t('landing.nav.login')}
                        </button>
                    </div>
                )}
            </nav>

            <section className="relative flex-1 flex items-center pt-24 pb-20 pointer-events-none">
                <div className="max-w-7xl mx-auto px-6 lg:px-8 w-full grid grid-cols-1 lg:grid-cols-2 gap-12 mt-12 pointer-events-auto">
                    <motion.div
                        className="max-w-xl bg-white/60 p-8 rounded-3xl backdrop-blur-xl border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
                        variants={staggerContainer}
                    >
                        <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-50 border border-orange-100 text-orange-600 font-bold text-[10px] tracking-widest uppercase mb-6 shadow-sm">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
                            </span>
                            {t('landing.hero.status')}
                        </motion.div>

                        <motion.h1 variants={fadeUp} className="font-display font-bold text-4xl sm:text-5xl lg:text-6xl leading-[1.1] tracking-tight mb-6 text-slate-900 drop-shadow-sm">
                            {t('landing.hero.title1')}<br /><span className="text-gradient">{t('landing.hero.title2')}</span>
                        </motion.h1>

                        <motion.p variants={fadeUp} className="text-lg text-slate-700 mb-8 leading-relaxed font-semibold">
                            {t('landing.hero.subtitle')}
                        </motion.p>

                        <motion.div variants={fadeUp} className="flex flex-wrap gap-4">
                            <button onClick={() => onNavigate('login')} className="bg-gradient-to-r from-orange-500 to-orange-400 hover:from-orange-600 hover:to-orange-500 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 flex items-center gap-2 border border-orange-400">
                                {t('landing.hero.register')}
                            </button>
                            <button className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 flex items-center gap-2 border border-slate-800">
                                {t('landing.hero.docs')}
                            </button>
                        </motion.div>
                    </motion.div>
                </div>
            </section>

            {/* Features Grid below fold */}
            <section id="features" className="relative py-24 bg-white/95 backdrop-blur-md border-t border-slate-200">
                <div className="max-w-7xl mx-auto px-6 lg:px-8">
                    <motion.div className="grid grid-cols-1 md:grid-cols-3 gap-8" variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true }}>
                        <motion.div variants={fadeUp} className="glass-card p-8 rounded-2xl bg-white">
                            <div className="w-14 h-14 bg-orange-100 text-orange-500 rounded-xl flex items-center justify-center mb-6">
                                <MapPinned size={28} />
                            </div>
                            <h3 className="font-display font-bold text-xl mb-3 text-slate-800 uppercase tracking-wide">Geospatial Triage</h3>
                            <p className="text-slate-500 leading-relaxed text-sm">Instant identification and prioritization of critical infrastructure failures using real-time GPS mapping.</p>
                        </motion.div>
                        <motion.div variants={fadeUp} className="glass-card p-8 rounded-2xl bg-white">
                            <div className="w-14 h-14 bg-orange-100 text-orange-500 rounded-xl flex items-center justify-center mb-6">
                                <Activity size={28} />
                            </div>
                            <h3 className="font-display font-bold text-xl mb-3 text-slate-800 uppercase tracking-wide">Predictive Maintenance</h3>
                            <p className="text-slate-500 leading-relaxed text-sm">Leveraging historical data models to anticipate utility repairs before they occur.</p>
                        </motion.div>
                        <motion.div variants={fadeUp} className="glass-card p-8 rounded-2xl bg-white">
                            <div className="w-14 h-14 bg-orange-100 text-orange-500 rounded-xl flex items-center justify-center mb-6">
                                <BrainCircuit size={28} />
                            </div>
                            <h3 className="font-display font-bold text-xl mb-3 text-slate-800 uppercase tracking-wide">AI Optimization</h3>
                            <p className="text-slate-500 leading-relaxed text-sm">Powered by AI integrated into the city grid core to optimize routine maintenance scheduling.</p>
                        </motion.div>
                    </motion.div>
                </div>
            </section>
        </div>
    );
}