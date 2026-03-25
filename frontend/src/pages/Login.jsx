import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { ArrowLeft, User, Lock, Eye, EyeOff } from 'lucide-react';
import { PulsoLogo } from './Landing';

// Custom complex overlapping wave divider (imitating the reference image's 'cloud' edge, but tailored to PULSO colors)
const WaveDivider = () => (
    <div className="absolute top-0 right-0 h-full w-24 translate-x-full hidden md:block z-20 pointer-events-none">
        {/* Deep orange layered shadows for depth */}
        <svg viewBox="0 0 100 800" preserveAspectRatio="none" className="absolute top-0 left-0 h-full w-full text-orange-700/30 fill-current translate-x-6 drop-shadow-lg">
            <path d="M0,0 C60,100 0,250 50,400 C100,550 20,650 40,800 L0,800 L0,0 Z" />
        </svg>
        <svg viewBox="0 0 100 800" preserveAspectRatio="none" className="absolute top-0 left-0 h-full w-full text-orange-600/50 fill-current translate-x-3 drop-shadow-md">
            <path d="M0,0 C80,150 10,300 60,450 C110,600 10,700 20,800 L0,800 L0,0 Z" />
        </svg>
        {/* Main solid wave matching the left pane background */}
        <svg viewBox="0 0 100 800" preserveAspectRatio="none" className="absolute top-0 left-0 h-full w-full text-orange-500 fill-current drop-shadow-xl">
            <path d="M0,0 C40,120 -10,280 40,420 C90,560 -10,680 10,800 L0,800 L0,0 Z" />
        </svg>
    </div>
);

export default function Login() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [forgotToast, setForgotToast] = useState(false);
    const fadeUp = {
        hidden: { opacity: 0, y: 15 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } }
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const formData = new URLSearchParams();
            formData.append('username', email);
            formData.append('password', password);

            const response = await fetch('http://localhost:8000/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: formData
            });

            if (response.ok) {
                const data = await response.json();
                localStorage.setItem('pulso_token', data.access_token);
                localStorage.setItem('pulso_user', JSON.stringify(data.user));
                
                // Redirect based on role: gov staff → Position Dashboard, residents → citizen dashboard
                const GOV_ROLES = [
                    'city_engineer','asst_city_engineer','admin_officer','admin_clerk',
                    'records_officer','division_chief','design_engineer','estimator',
                    'cad_operator','project_engineer','construction_foreman','field_worker',
                    'building_inspector','electrical_inspector','mechanical_inspector',
                    'dispatcher','manager','system_admin',
                ];
                if (GOV_ROLES.includes(data.user.role)) {
                    navigate('/gov/my-dashboard');
                } else {
                    navigate('/dashboard');
                }
            } else {
                const errData = await response.json();
                setError(errData.detail || 'Failed to login');
            }
        } catch (err) {
            setError('Network error. Is the backend running?');
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = (e) => {
        e.preventDefault();
        setForgotToast(true);
        setTimeout(() => setForgotToast(false), 4000);
    };

    return (
        <div className="min-h-screen font-sans bg-slate-100 dark:bg-slate-950 flex items-center justify-center p-4 sm:p-8 transition-colors">

            {/* Absolute Back Button */}
            <a href="/" className="absolute top-8 left-8 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors flex items-center gap-2 font-bold z-50 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md px-4 py-2 rounded-full shadow-sm hover:shadow-md">
                <ArrowLeft size={20} /> {t('login.home')}
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
                        <h2 className="text-2xl font-display font-medium mb-8">{t('login.welcome')}</h2>

                        {/* Enlarged White Circle for Logo (matching the reference image's rocket circle) */}
                        <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center shadow-xl mb-4 transform hover:scale-105 transition-transform duration-300">
                            {/* We scale the PulsoLogo slightly larger inside its container */}
                            <div className="scale-[1.8]">
                                <PulsoLogo />
                            </div>
                        </div>
                        <h1 className="text-3xl font-extrabold tracking-tight mb-8">{t('login.pulso')}</h1>

                        <p className="text-orange-50 text-sm leading-relaxed max-w-xs font-medium">
                            {t('login.description')}
                        </p>
                    </motion.div>
                </div>

                {/* Right Side: Form */}
                <div className="md:w-7/12 p-8 md:p-14 lg:p-20 flex flex-col justify-center relative bg-white dark:bg-slate-900 z-10 transition-colors">
                    <motion.div initial="hidden" animate="visible" variants={fadeUp}>
                        <h2 className="text-3xl font-display font-bold text-slate-900 dark:text-white mb-8 md:mb-10 text-center md:text-left">
                            {t('login.signInAccount')}
                        </h2>

                        {error && (
                            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-2xl text-sm font-bold border border-red-100 dark:border-red-800">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleLogin} className="flex flex-col gap-5">
                            <div>
                                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-2 pl-1">{t('login.mobileOrEmail')}</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                                        <User size={18} />
                                    </div>
                                    <input
                                        type="text"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full bg-slate-50 dark:bg-slate-800/50 border-none text-slate-900 dark:text-white placeholder-slate-400 text-sm rounded-2xl focus:ring-2 focus:ring-orange-500 block pl-12 p-4 transition-all outline-none shadow-sm"
                                        placeholder={t('login.enterCredential')}
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-2 pl-1">{t('login.password')}</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                                        <Lock size={18} />
                                    </div>
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full bg-slate-50 dark:bg-slate-800/50 border-none text-slate-900 dark:text-white placeholder-slate-400 text-sm rounded-2xl focus:ring-2 focus:ring-orange-500 block pl-12 pr-12 p-4 transition-all outline-none shadow-sm"
                                        placeholder={t('login.enterPassword')}
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-orange-500 transition-colors focus:outline-none"
                                        aria-label={showPassword ? "Hide password" : "Show password"}
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                                <div className="flex justify-end mt-2">
                                    <button type="button" onClick={handleForgotPassword} className="text-xs font-bold text-slate-500 hover:text-orange-500 transition-colors">{t('login.forgotPassword')}</button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="mt-4 flex justify-center w-full bg-gradient-to-r from-orange-500 to-orange-400 hover:from-orange-600 hover:to-orange-500 text-white p-4 rounded-2xl font-bold text-base transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-70"
                            >
                                {loading ? 'Signing in...' : t('login.signIn')}
                            </button>
                        </form>

                        <p className="text-center text-sm text-slate-600 dark:text-slate-400 font-medium mt-10">
                            {t('login.noAccount')}{' '}
                            <a href="/register" className="text-orange-600 dark:text-orange-400 font-bold hover:underline decoration-2 underline-offset-4">
                                {t('login.signUp')}
                            </a>
                        </p>
                    </motion.div>
                </div>
            </motion.div>

            {/* Forgot Password Toast */}
            {forgotToast && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-slate-900 dark:bg-slate-700 text-white px-6 py-3 rounded-2xl shadow-xl text-sm font-bold z-50 animate-fade-in-up">
                    Please contact your Barangay Admin to reset your password.
                </div>
            )}
        </div>
    );
}
