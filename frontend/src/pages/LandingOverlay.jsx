import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MapPinned, Activity, BrainCircuit, ArrowRight, ActivitySquare, Menu, X } from 'lucide-react';

// SVG Logo Component
export const PulsoLogo = () => (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="32" height="32" rx="8" fill="#f97316" />
        <path d="M7 16H11L14 8L18 24L21 16H25" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

export default function LandingOverlay({ onNavigate }) {
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
        visible: { opacity: 1, transition: { staggerChildren: 0.15 } },
        exit: { opacity: 0, transition: { duration: 0.3 } }
    };

    return (
        <motion.div
            key="landing-layer"
            initial="hidden"
            animate="visible"
            exit="exit"
            className="relative z-10 flex flex-col min-h-screen"
        >
            {/* Navbar Fixed */}
            <nav className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${scrolled ? 'glass-nav py-3' : 'bg-transparent py-6'}`}>
                <div className="max-w-7xl mx-auto px-6 lg:px-8 flex justify-between items-center">
                    <div className="flex items-center gap-3 text-orange-600 font-extrabold text-2xl tracking-tight">
                        <PulsoLogo />
                        <span>PULSO</span>
                    </div>
                    <ul className="hidden md:flex gap-8 items-center text-sm font-medium text-slate-800 mix-blend-multiply">
                        <li><a href="#features" className="hover:text-orange-500 font-bold transition-colors">Platform</a></li>
                        <li><a href="#about" className="hover:text-orange-500 font-bold transition-colors">About LGU</a></li>
                    </ul>

                    <div className="hidden md:flex gap-4">
                        <button onClick={() => onNavigate('login')} className="flex items-center gap-2 bg-white/90 text-orange-600 border border-orange-200 hover:border-orange-500 hover:text-orange-700 px-5 py-2.5 rounded-lg font-bold text-sm transition-all shadow-sm">
                            Resident Portal
                        </button>
                        <button className="flex items-center gap-2 bg-gradient-to-r from-orange-500 to-orange-400 hover:from-orange-600 hover:to-orange-500 text-white px-5 py-2.5 rounded-lg font-bold text-sm transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5">
                            Engineering <ArrowRight size={16} />
                        </button>
                    </div>

                    <button className="md:hidden text-orange-500 p-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                        {mobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
                    </button>
                </div>

                {mobileMenuOpen && (
                    <div className="absolute top-full left-0 w-full bg-white/95 backdrop-blur-xl border-b border-slate-200 shadow-2xl py-6 px-6 flex flex-col gap-4 md:hidden">
                        <button onClick={() => { onNavigate('login'); setMobileMenuOpen(false); }} className="w-full justify-center flex items-center gap-2 bg-white text-orange-600 border border-orange-200 px-5 py-3 rounded-lg font-bold text-base transition-all shadow-sm">
                            Resident Portal
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


                        <motion.h1 variants={fadeUp} className="font-display font-bold text-4xl sm:text-5xl lg:text-6xl leading-[1.1] tracking-tight mb-6 text-slate-900 drop-shadow-sm">
                            Smart Infrastructure,<br /><span className="text-gradient">Smarter City.</span>
                        </motion.h1>

                        <motion.p variants={fadeUp} className="text-lg text-slate-700 mb-8 leading-relaxed font-semibold">
                            Public Utility and Infrastructure Locator System for Engineering Operations. Integrated with real-time Geospatial Triage and AI-driven Predictive Maintenance.
                        </motion.p>

                        <motion.div variants={fadeUp} className="flex flex-wrap gap-4">
                            <button onClick={() => onNavigate('login')} className="bg-gradient-to-r from-orange-500 to-orange-400 hover:from-orange-600 hover:to-orange-500 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 flex items-center gap-2 border border-orange-400">
                                Open Resident Portal
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
        </motion.div>
    );
}
