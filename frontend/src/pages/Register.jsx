import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { ArrowLeft, User, Phone, MapPin, Lock, Chrome, Twitter, Facebook, CheckSquare } from 'lucide-react';
import { PulsoLogo } from './Landing';

// Custom complex overlapping wave divider matching Login.jsx
const WaveDivider = () => (
    <div className="absolute top-0 right-0 h-full w-24 translate-x-full hidden md:block z-20 pointer-events-none">
        <svg viewBox="0 0 100 800" preserveAspectRatio="none" className="absolute top-0 left-0 h-full w-full text-orange-700/30 fill-current translate-x-6 drop-shadow-lg">
            <path d="M0,0 C60,100 0,250 50,400 C100,550 20,650 40,800 L0,800 L0,0 Z" />
        </svg>
        <svg viewBox="0 0 100 800" preserveAspectRatio="none" className="absolute top-0 left-0 h-full w-full text-orange-600/50 fill-current translate-x-3 drop-shadow-md">
            <path d="M0,0 C80,150 10,300 60,450 C110,600 10,700 20,800 L0,800 L0,0 Z" />
        </svg>
        <svg viewBox="0 0 100 800" preserveAspectRatio="none" className="absolute top-0 left-0 h-full w-full text-orange-500 fill-current drop-shadow-xl">
            <path d="M0,0 C40,120 -10,280 40,420 C90,560 -10,680 10,800 L0,800 L0,0 Z" />
        </svg>
    </div>
);

const AppleIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M16.365 21.49c-1.282.91-2.584.89-3.774.24-1.206-.65-2.281-.65-3.518-.01-1.168.61-2.378.68-3.486-.14-4.809-3.51-6.182-10.74-2.126-14.3.111-.09.227-.18.347-.26.234-.14.48-.28.74-.4 1.258-.59 2.508-.47 3.565.11.968.53 1.543.53 2.58-.02 1.353-.69 2.7-.73 3.935-.15 1.542.74 2.525 2.06 3.018 3.53-3.235 1.48-2.659 5.86.435 7.14-1.042 2.01-2.27 3.65-3.69 4.26-.06.02-.124.05-.188.08-.6.28-1.23.47-1.844.47zM15.42 6.81c-.05.01-.12.01-.18.01-1.82 0-3.32-1.39-3.6-3.14-.02-.13-.03-.26-.03-.39 0-.07.01-.14.01-.2 1.94-.09 3.56 1.45 3.79 3.32.01.12.01.25.01.4z" />
    </svg>
);

export default function Register() {
    const { t } = useTranslation();
    const fadeUp = {
        hidden: { opacity: 0, y: 15 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } }
    };

    return (
        <div className="min-h-screen font-sans bg-slate-100 dark:bg-slate-950 flex items-center justify-center p-4 sm:p-8 transition-colors">

            {/* Absolute Back Button */}
            <a href="/" className="absolute top-8 left-8 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors flex items-center gap-2 font-bold z-50 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md px-4 py-2 rounded-full shadow-sm hover:shadow-md">
                <ArrowLeft size={20} /> {t('register.home')}
            </a>

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className="w-full max-w-5xl bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[600px] relative transition-colors"
            >
                {/* Left Side: Presentation / Branding */}
                <div className="md:w-5/12 bg-gradient-to-br from-orange-600 to-orange-500 relative flex flex-col justify-center items-center p-12 text-center text-white z-10">
                    <WaveDivider />

                    <motion.div initial="hidden" animate="visible" variants={fadeUp} className="flex flex-col items-center">
                        <h2 className="text-2xl font-display font-medium mb-8">{t('register.welcome')}</h2>

                        <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center shadow-xl mb-4 transform hover:scale-105 transition-transform duration-300">
                            <div className="scale-[1.8]">
                                <PulsoLogo />
                            </div>
                        </div>
                        <h1 className="text-3xl font-extrabold tracking-tight mb-8">{t('register.pulso')}</h1>

                        <p className="text-orange-50 text-sm leading-relaxed max-w-xs font-medium">
                            {t('register.desc')}
                        </p>
                    </motion.div>
                </div>

                {/* Right Side: Form */}
                <div className="md:w-7/12 p-8 md:p-14 lg:p-16 flex flex-col justify-center relative bg-white dark:bg-slate-900 z-10 transition-colors">
                    <motion.div initial="hidden" animate="visible" variants={fadeUp}>
                        <h2 className="text-3xl font-display font-bold text-slate-900 dark:text-white mb-6 md:mb-8 text-center md:text-left">
                            {t('register.createAccount')}
                        </h2>

                        <form action="/dashboard" className="flex flex-col gap-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-2 pl-1">{t('register.fullName')}</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                                            <User size={16} />
                                        </div>
                                        <input
                                            type="text"
                                            className="w-full bg-slate-50 dark:bg-slate-800/50 border-none text-slate-900 dark:text-white placeholder-slate-400 text-sm rounded-2xl focus:ring-2 focus:ring-orange-500 block pl-11 p-3.5 transition-all outline-none shadow-sm"
                                            placeholder={t('register.enterFullName')}
                                            required
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-2 pl-1">{t('register.mobile')}</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                                            <Phone size={16} />
                                        </div>
                                        <input
                                            type="tel"
                                            className="w-full bg-slate-50 dark:bg-slate-800/50 border-none text-slate-900 dark:text-white placeholder-slate-400 text-sm rounded-2xl focus:ring-2 focus:ring-orange-500 block pl-11 p-3.5 transition-all outline-none shadow-sm"
                                            placeholder={t('register.mobilePlaceholder')}
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-2 pl-1">{t('register.barangay')}</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                                        <MapPin size={16} />
                                    </div>
                                    <select className="w-full bg-slate-50 dark:bg-slate-800/50 border-none text-slate-900 dark:text-white text-sm rounded-2xl focus:ring-2 focus:ring-orange-500 block pl-11 p-3.5 transition-all outline-none appearance-none shadow-sm" required defaultValue="">
                                        <option value="" disabled className="text-slate-400">{t('register.selectArea')}</option>
                                        <option value="176">{t('register.brgy_bs')}</option>
                                        <option value="tala">{t('register.brgy_tala')}</option>
                                        <option value="camarin">{t('register.brgy_camarin')}</option>
                                        <option value="deparo">{t('register.brgy_deparo')}</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-2 pl-1">{t('register.password')}</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                                        <Lock size={16} />
                                    </div>
                                    <input
                                        type="password"
                                        className="w-full bg-slate-50 dark:bg-slate-800/50 border-none text-slate-900 dark:text-white placeholder-slate-400 text-sm rounded-2xl focus:ring-2 focus:ring-orange-500 block pl-11 p-3.5 transition-all outline-none shadow-sm"
                                        placeholder={t('register.enterPassword')}
                                        required
                                    />
                                </div>
                            </div>

                            {/* Terms Checkbox */}
                            <div className="flex flex-row items-center gap-2 mt-2 pl-1">
                                <input type="checkbox" id="terms" className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 bg-slate-100 border-none" required />
                                <label htmlFor="terms" className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                                    {t('register.terms')}
                                </label>
                            </div>

                            <button
                                type="submit"
                                className="mt-4 w-full bg-gradient-to-r from-orange-500 to-orange-400 hover:from-orange-600 hover:to-orange-500 text-white p-3.5 rounded-2xl font-bold text-base transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                            >
                                {t('register.signUp')}
                            </button>
                        </form>

                        <p className="text-center text-sm text-slate-600 dark:text-slate-400 font-medium mt-8">
                            {t('register.haveAccount')}{' '}
                            <a href="/login" className="text-orange-600 dark:text-orange-400 font-bold hover:underline decoration-2 underline-offset-4">
                                {t('register.signIn')}
                            </a>
                        </p>
                    </motion.div>
                </div>
            </motion.div>
        </div>
    );
}
