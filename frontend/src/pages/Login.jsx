import React, { useState, useEffect } from 'react';
import Spline from '@splinetool/react-spline';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    User, Shield, Eye, EyeOff, ChevronRight,
    Activity, Sun, Moon, Monitor, Mail, ArrowLeft,
    CheckCircle, Home,
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import Branding from '../components/Branding';
import ErrorBoundary from '../components/ErrorBoundary';

export default function Login() {
    const { theme, changeTheme } = useTheme();
    const navigate = useNavigate();
    const [email, setEmail]               = useState('');
    const [password, setPassword]         = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError]               = useState('');
    const [loading, setLoading]           = useState(false);
    const [view, setView]                 = useState('login'); // 'login' | 'forgot'
    const [recoverySent, setRecoverySent] = useState(false);
    const [recoveryEmail, setRecoveryEmail] = useState('');

    /* ── Same Spline scenes as GovLanding ──────────────────────────────── */
    const DARK_SCENE  = 'https://prod.spline.design/us1Y6xfaQLiI2cim/scene.splinecode';
    const LIGHT_SCENE = 'https://prod.spline.design/nrFjYzbJnF7GU92z/scene.splinecode';
    const [currentScene, setCurrentScene] = useState(DARK_SCENE);

    useEffect(() => {
        const updateScene = () => {
            if (theme === 'dark') {
                setCurrentScene(DARK_SCENE);
            } else if (theme === 'light') {
                setCurrentScene(LIGHT_SCENE);
            } else {
                const isSystemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                setCurrentScene(isSystemDark ? DARK_SCENE : LIGHT_SCENE);
            }
        };
        updateScene();

        if (theme === 'system') {
            const mq = window.matchMedia('(prefers-color-scheme: dark)');
            const listener = (e) => setCurrentScene(e.matches ? DARK_SCENE : LIGHT_SCENE);
            mq.addEventListener('change', listener);
            return () => mq.removeEventListener('change', listener);
        }
    }, [theme]);

    /* ── Auth handlers ──────────────────────────────────────────────────── */
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
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: formData,
            });

            if (response.ok) {
                const data = await response.json();
                localStorage.setItem('pulso_token', data.access_token);
                localStorage.setItem('pulso_user', JSON.stringify(data.user));

                const GOV_ROLES = [
                    'city_engineer', 'asst_city_engineer', 'admin_officer', 'admin_clerk',
                    'records_officer', 'division_chief', 'design_engineer', 'estimator',
                    'cad_operator', 'project_engineer', 'construction_foreman', 'field_worker',
                    'building_inspector', 'electrical_inspector', 'mechanical_inspector',
                    'dispatcher', 'manager', 'system_admin',
                ];
                navigate(GOV_ROLES.includes(data.user.role) ? '/gov/my-dashboard' : '/dashboard');
            } else {
                const errData = await response.json();
                setError(errData.detail || 'Authentication failed');
            }
        } catch {
            setError('Network error. Is the backend running?');
        } finally {
            setLoading(false);
        }
    };

    const handleRecovery = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const response = await fetch('http://localhost:8000/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: recoveryEmail }),
            });
            if (response.ok) {
                setRecoverySent(true);
            } else {
                const data = await response.json();
                setError(data.detail || 'Recovery request failed.');
            }
        } catch {
            setError('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    /* ── Render ─────────────────────────────────────────────────────────── */
    return (
        <div className="relative min-h-screen w-full bg-slate-50 dark:bg-[#020617] overflow-hidden font-sans text-slate-800 dark:text-slate-200 transition-colors duration-700">

            {/* ── 3D Background System (identical to GovLanding) ──────────── */}
            <div className="absolute inset-0 z-0 pointer-events-auto">
                {/* Light scene */}
                <div className={`absolute inset-0 transition-opacity duration-1000 ${currentScene === LIGHT_SCENE ? 'opacity-100 z-10 scale-[0.85] lg:scale-100 origin-center' : 'opacity-0 z-0'}`}>
                    <ErrorBoundary fallback={<div className="w-full h-full bg-slate-100 dark:bg-slate-900" />}>
                        <Spline scene={LIGHT_SCENE} />
                    </ErrorBoundary>
                </div>
                {/* Dark scene */}
                <div className={`absolute inset-0 transition-opacity duration-1000 ${currentScene === DARK_SCENE ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}>
                    <ErrorBoundary fallback={<div className="w-full h-full bg-slate-100 dark:bg-slate-900" />}>
                        <Spline scene={DARK_SCENE} />
                    </ErrorBoundary>
                </div>

                {/* Adaptive overlay gradients */}
                <div className="absolute inset-0 bg-gradient-to-r from-white/60 via-transparent to-transparent dark:from-[#020617]/80 dark:via-transparent dark:to-transparent pointer-events-none z-20" />
                <div className="absolute inset-0 bg-gradient-to-t from-white/40 via-transparent to-transparent dark:from-[#020617]/40 dark:via-transparent dark:to-transparent pointer-events-none z-20" />
            </div>

            {/* ── Navigation Header (identical structure to GovLanding) ────── */}
            <nav className="absolute top-0 left-0 w-full p-8 flex justify-between items-center z-50">
                {/* Brand + portal badge */}
                <div className="flex items-center gap-3">
                    <Branding size="h-10" showText={false} />
                    <div>
                        <span className="text-2xl font-black tracking-tighter text-slate-900 dark:text-white">PULSO</span>
                        <span className="ml-2 px-2 py-0.5 bg-slate-900/5 dark:bg-white/10 backdrop-blur-md rounded text-[10px] font-bold tracking-widest text-orange-600 dark:text-orange-400 uppercase border border-slate-900/5 dark:border-white/10">
                            Resident Portal
                        </span>
                    </div>
                </div>

                {/* Right controls */}
                <div className="flex items-center gap-6">
                    {/* Home link */}
                    <div className="hidden md:flex items-center gap-6 text-sm font-medium pr-6 border-r border-slate-200 dark:border-white/10">
                        <button
                            onClick={() => navigate('/')}
                            className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 hover:text-orange-600 dark:hover:text-white transition-colors font-semibold"
                        >
                            <Home size={15} /> Home
                        </button>
                    </div>

                    {/* Theme switcher (identical to GovLanding) */}
                    <div className="flex bg-white/50 dark:bg-white/5 backdrop-blur-md rounded-full p-1 border border-slate-200 dark:border-white/10 shadow-sm">
                        <button
                            onClick={() => changeTheme('light')}
                            className={`p-2 rounded-full transition-all ${theme === 'light' ? 'bg-white dark:bg-slate-700 shadow-md text-orange-500 scale-110' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
                        >
                            <Sun size={14} />
                        </button>
                        <button
                            onClick={() => changeTheme('system')}
                            className={`p-2 rounded-full transition-all ${theme === 'system' ? 'bg-white dark:bg-slate-700 shadow-md text-orange-500 scale-110' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
                        >
                            <Monitor size={14} />
                        </button>
                        <button
                            onClick={() => changeTheme('dark')}
                            className={`p-2 rounded-full transition-all ${theme === 'dark' ? 'bg-white dark:bg-slate-700 shadow-md text-orange-500 scale-110' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
                        >
                            <Moon size={14} />
                        </button>
                    </div>
                </div>
            </nav>

            {/* ── Main Content Grid (identical layout to GovLanding) ─────── */}
            <main className="relative z-10 grid lg:grid-cols-2 min-h-screen items-center px-12 lg:px-32">

                {/* Left: Hero Text */}
                <div className="pt-20 lg:pt-0 max-w-xl">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.8 }}
                    >
                        <div className="flex items-center gap-2 mb-6 text-orange-600 dark:text-orange-500">
                            <Activity size={18} />
                            <span className="text-sm font-bold tracking-[0.3em] uppercase">Citizen Access Portal</span>
                        </div>
                        <h1 className="text-5xl lg:text-8xl font-black text-slate-900 dark:text-white leading-[0.9] mb-8 tracking-tighter">
                            THE PULSE OF <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-l dark:bg-gradient-to-r from-orange-500 to-orange-600">
                                COMMUNITY
                            </span>
                        </h1>
                        <p className="text-base lg:text-xl text-slate-600 dark:text-slate-400 leading-relaxed mb-10 max-w-md font-medium">
                            Access your resident dashboard to track local hazard reports,
                            interact with community engineering teams, and stay updated
                            with the latest city infrastructure news.
                        </p>
                    </motion.div>
                </div>

                {/* Right: Login Panel */}
                <div className="flex justify-center lg:justify-end py-20 lg:py-0">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                        className="w-full max-w-md"
                    >
                        <div className="relative group">
                            {/* Decorative glow */}
                            <div className="absolute -inset-1 bg-gradient-to-r from-orange-600/20 to-blue-600/20 rounded-[2.5rem] blur-2xl opacity-30 dark:opacity-50 group-hover:opacity-100 transition duration-1000 group-hover:duration-200" />

                            <div className="relative bg-white/20 dark:bg-slate-900/40 backdrop-blur-md border border-white/30 dark:border-white/5 rounded-[2.5rem] p-8 lg:p-12 shadow-2xl overflow-hidden min-h-[500px] flex flex-col justify-center">
                                <AnimatePresence mode="wait">
                                    {view === 'login' ? (
                                        /* ── Login Form ──────────────────────────────── */
                                        <motion.div
                                            key="login-form"
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -20 }}
                                            transition={{ duration: 0.3 }}
                                        >
                                            {/* Header */}
                                            <div className="mb-10 text-center">
                                                <div className="w-20 h-20 bg-orange-100 dark:bg-white/5 rounded-[1.5rem] flex items-center justify-center mx-auto mb-6 border border-orange-200 dark:border-white/10 shadow-inner">
                                                    <User className="text-orange-600 dark:text-orange-500" size={40} />
                                                </div>
                                                <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">
                                                    Resident Gateway
                                                </h2>
                                                <p className="text-slate-600 dark:text-slate-500 text-sm font-medium">
                                                    Sign in to access your community dashboard
                                                </p>
                                            </div>

                                            {/* Error */}
                                            {error && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: -10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-600 dark:text-red-400 text-xs font-bold flex items-center gap-3 shadow-lg"
                                                >
                                                    <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse shrink-0" />
                                                    {error}
                                                </motion.div>
                                            )}

                                            <form onSubmit={handleLogin} className="space-y-6">
                                                {/* Email / Mobile */}
                                                <div className="space-y-2">
                                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                                                        Mobile Number or Email
                                                    </label>
                                                    <div className="relative group/input">
                                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within/input:text-orange-500 transition-colors">
                                                            <User size={18} />
                                                        </div>
                                                        <input
                                                            type="text"
                                                            value={email}
                                                            onChange={(e) => setEmail(e.target.value)}
                                                            className="w-full bg-slate-100/50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 text-sm rounded-2xl focus:outline-none focus:border-orange-500/50 focus:bg-white/5 block pl-12 p-4 transition-all shadow-inner"
                                                            placeholder="Enter your credential"
                                                            required
                                                            autoComplete="username"
                                                        />
                                                    </div>
                                                </div>

                                                {/* Password */}
                                                <div className="space-y-2">
                                                    <div className="flex justify-between items-center px-1">
                                                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                                            Password
                                                        </label>
                                                        <button
                                                            type="button"
                                                            onClick={() => setView('forgot')}
                                                            className="text-[10px] font-bold text-orange-600 hover:text-orange-500 transition-colors uppercase tracking-widest"
                                                        >
                                                            Forgot Password?
                                                        </button>
                                                    </div>
                                                    <div className="relative group/input">
                                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within/input:text-orange-500 transition-colors">
                                                            <Shield size={18} />
                                                        </div>
                                                        <input
                                                            type={showPassword ? 'text' : 'password'}
                                                            value={password}
                                                            onChange={(e) => setPassword(e.target.value)}
                                                            className="w-full bg-slate-100/50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 text-sm rounded-2xl focus:outline-none focus:border-orange-500/50 focus:bg-white/5 block pl-12 pr-12 p-4 transition-all shadow-inner"
                                                            placeholder="Enter Password"
                                                            required
                                                            autoComplete="current-password"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowPassword(!showPassword)}
                                                            className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-orange-500 transition-colors focus:outline-none"
                                                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                                                        >
                                                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Submit */}
                                                <button
                                                    type="submit"
                                                    disabled={loading}
                                                    className="w-full bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white p-4 rounded-2xl font-black text-sm uppercase tracking-[0.2em] transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-xl shadow-orange-600/20 flex items-center justify-center gap-3 group disabled:opacity-50"
                                                >
                                                    {loading ? (
                                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                    ) : (
                                                        <>
                                                            Sign In
                                                            <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                                        </>
                                                    )}
                                                </button>
                                            </form>

                                            {/* Register link */}
                                            <p className="text-center text-xs text-slate-600 dark:text-slate-400 font-medium mt-8">
                                                Don't have an account?{' '}
                                                <a href="/register" className="text-orange-600 dark:text-orange-400 font-bold hover:underline decoration-2 underline-offset-4">
                                                    Sign Up
                                                </a>
                                            </p>
                                        </motion.div>
                                    ) : (
                                        /* ── Forgot Password Flow ────────────────────── */
                                        <motion.div
                                            key="forgot-form"
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: 20 }}
                                            transition={{ duration: 0.3 }}
                                        >
                                            {recoverySent ? (
                                                <div className="text-center py-6">
                                                    <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                                                        <CheckCircle className="text-emerald-500" size={40} />
                                                    </div>
                                                    <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-4 tracking-tight">
                                                        Link Sent
                                                    </h2>
                                                    <p className="text-slate-600 dark:text-slate-400 text-sm font-medium mb-10">
                                                        A password reset link was sent to{' '}
                                                        <span className="text-orange-600 font-bold">{recoveryEmail}</span>.
                                                        Please check your inbox.
                                                    </p>
                                                    <button
                                                        onClick={() => { setView('login'); setRecoverySent(false); }}
                                                        className="flex items-center gap-2 mx-auto text-orange-600 font-bold uppercase tracking-widest text-[10px] hover:text-orange-500 transition-colors"
                                                    >
                                                        <ArrowLeft size={16} /> Back to Sign In
                                                    </button>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="mb-10 text-center">
                                                        <div className="w-20 h-20 bg-slate-100 dark:bg-white/5 rounded-[1.5rem] flex items-center justify-center mx-auto mb-6 border border-slate-200 dark:border-white/10 shadow-inner">
                                                            <Mail className="text-orange-600 dark:text-orange-500" size={40} />
                                                        </div>
                                                        <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">
                                                            Reset Password
                                                        </h2>
                                                        <p className="text-slate-600 dark:text-slate-500 text-sm font-medium">
                                                            Enter your email to receive a reset link
                                                        </p>
                                                    </div>

                                                    {error && (
                                                        <motion.div
                                                            initial={{ opacity: 0, y: -10 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-600 dark:text-red-400 text-xs font-bold flex items-center gap-3 shadow-lg"
                                                        >
                                                            <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse shrink-0" />
                                                            {error}
                                                        </motion.div>
                                                    )}

                                                    <form onSubmit={handleRecovery} className="space-y-6">
                                                        <div className="space-y-2">
                                                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                                                                Email Address
                                                            </label>
                                                            <div className="relative group/input">
                                                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within/input:text-orange-500 transition-colors">
                                                                    <Mail size={18} />
                                                                </div>
                                                                <input
                                                                    type="email"
                                                                    value={recoveryEmail}
                                                                    onChange={(e) => setRecoveryEmail(e.target.value)}
                                                                    className="w-full bg-slate-100/50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 text-sm rounded-2xl focus:outline-none focus:border-orange-500/50 focus:bg-white/5 block pl-12 p-4 transition-all shadow-inner"
                                                                    placeholder="your@email.com"
                                                                    required
                                                                    autoComplete="email"
                                                                />
                                                            </div>
                                                        </div>

                                                        <button
                                                            type="submit"
                                                            disabled={loading}
                                                            className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 p-4 rounded-2xl font-black text-sm uppercase tracking-[0.2em] transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-xl flex items-center justify-center gap-3 group disabled:opacity-50"
                                                        >
                                                            {loading ? (
                                                                <div className="w-5 h-5 border-2 border-slate-400 border-t-slate-800 rounded-full animate-spin" />
                                                            ) : (
                                                                <>
                                                                    Send Reset Link
                                                                    <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                                                </>
                                                            )}
                                                        </button>

                                                        <button
                                                            type="button"
                                                            onClick={() => { setView('login'); setError(''); }}
                                                            className="flex items-center gap-2 mx-auto text-slate-500 font-bold uppercase tracking-widest text-[10px] hover:text-slate-900 dark:hover:text-white transition-colors"
                                                        >
                                                            <ArrowLeft size={14} /> Back to Sign In
                                                        </button>
                                                    </form>
                                                </>
                                            )}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </main>

            {/* ── Bottom Info Bar (identical to GovLanding) ───────────────── */}
            <div className="absolute bottom-0 left-0 w-full bg-white/60 dark:bg-[#020617]/70 backdrop-blur-md border-t border-slate-200 dark:border-white/5 py-4 px-8 flex flex-col md:flex-row justify-between items-center gap-4 z-50 transition-colors">
                <div className="flex items-center gap-6 overflow-hidden max-w-4xl">
                    <span className="text-[10px] font-black text-orange-600 dark:text-orange-500 uppercase tracking-[0.2em] whitespace-nowrap">
                        Notice:
                    </span>
                    <div className="text-[10px] font-bold text-slate-500 dark:text-slate-600 uppercase tracking-[0.3em] whitespace-nowrap animate-marquee">
                        YOUR PRIVACY IS PROTECTED UNDER THE PHILIPPINE DATA PRIVACY ACT (RA 10173) • AUTHORIZED RESIDENTS ONLY • PULSO CITIZEN PLATFORM • CITY OF CALOOCAN
                    </div>
                </div>
                <div className="flex items-center gap-6 text-[10px] font-black text-slate-400 dark:text-slate-500 tracking-[0.2em]">
                    <span>CALOOCAN NORTH DISTRICT • PHILIPPINES</span>
                    <div className="h-3 w-[1px] bg-slate-200 dark:bg-white/10" />
                    <span className="text-orange-600/50 dark:text-orange-500/50">v4.2.1</span>
                </div>
            </div>
        </div>
    );
}
