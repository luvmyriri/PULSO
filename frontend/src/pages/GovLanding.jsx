import React, { useState, useRef } from 'react';
import ReCAPTCHA from "react-google-recaptcha";
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import {
    Shield, Lock, User, Eye, EyeOff, ChevronRight, Activity,
    Mail, ArrowLeft, CheckCircle, FileCheck, BookOpen, ExternalLink,
    Map, ShieldCheck, Home, Users, AlertCircle, X
} from 'lucide-react';
import Branding from '../components/Branding';
import ThemeToggle from '../components/ThemeToggle';
import LegalModal from '../components/LegalModal';
import OfficialBanner from '../components/landing/OfficialBanner';
import { setAuthSession, clearAuthSession } from '../utils/authSession';

export default function GovLanding() {
    const navigate = useNavigate();
    const [legalModal, setLegalModal] = useState({ isOpen: false, tab: 'privacy' });
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [view, setView] = useState('login'); // 'login' | 'forgot'
    const [recoverySent, setRecoverySent] = useState(false);
    const [recoveryEmail, setRecoveryEmail] = useState('');
    const [captchaToken, setCaptchaToken] = useState(null);
    const recaptchaRef = useRef(null);
    const [activeModal, setActiveModal] = useState(null); // 'directives' | 'resources' | null

    const handleLogin = async (e) => {
        e.preventDefault();
        if (!captchaToken) {
            setError('Please complete the security puzzle to proceed.');
            setLoading(false);
            return;
        }
        try {
            const formData = new URLSearchParams();
            formData.append('username', email);
            formData.append('password', password);
            formData.append('captcha_token', captchaToken || '');

            const response = await fetch('http://localhost:33159/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: formData
            });

            if (response.ok) {
                const data = await response.json();
                setAuthSession(data.access_token, data.user);
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
                    setError('Authorized Government Personnel Only. Citizens please use the Citizen Portal.');
                    clearAuthSession();
                    setLoading(false);
                    if (recaptchaRef.current) recaptchaRef.current.reset();
                    setCaptchaToken(null);
                }
            } else {
                const errData = await response.json();
                const msg = typeof errData.detail === 'object'
                    ? (Array.isArray(errData.detail) ? errData.detail[0].msg : JSON.stringify(errData.detail))
                    : errData.detail;
                setError(msg || 'Authentication failed');
                if (recaptchaRef.current) recaptchaRef.current.reset();
                setCaptchaToken(null);
            }
        } catch (err) {
            setError('System Connectivity Error');
        } finally {
            setLoading(false);
        }
    };

    const handleRecovery = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const response = await fetch('http://localhost:33159/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: recoveryEmail })
            });
            if (response.ok) {
                setRecoverySent(true);
            } else {
                const data = await response.json();
                const msg = typeof data.detail === 'object'
                    ? (Array.isArray(data.detail) ? data.detail[0].msg : JSON.stringify(data.detail))
                    : data.detail;
                setError(msg || 'Recovery failed. Internal protocol error.');
            }
        } catch (err) {
            setError('System Connectivity Error');
        } finally {
            setLoading(false);
        }
    };

    const DIRECTIVES = [
        { id: 'DIR-2026-004', title: 'Q1 Infrastructure Maintenance Protocol', date: 'March 22, 2026', author: 'City Engineer' },
        { id: 'DIR-2026-003', title: 'Updated Safety Standards for Field Personnel', date: 'March 15, 2026', author: 'Safety Office' },
        { id: 'DIR-2026-002', title: 'Digital Transition and AI Triage Training', date: 'March 10, 2026', author: 'IT Division' },
        { id: 'DIR-2026-001', title: 'Fiscal Year 2026 Engineering Budget Allocation', date: 'January 5, 2026', author: 'Admin' },
    ];

    const RESOURCES = [
        { title: 'Civil Engineering Code (v2.4)', type: 'Document', size: '12.4 MB', icon: BookOpen },
        { title: 'Procurement (RA 9184) Handbook', type: 'Legal Reference', size: '4.2 MB', icon: ShieldCheck },
        { title: 'LGU Standard Operating Procedures', type: 'Flowchart', size: '1.8 MB', icon: Activity },
        { title: 'Caloocan Utility Map', type: 'Geospatial Data', size: '88 MB', icon: Map },
    ];

    return (
        <div className="relative min-h-screen w-full bg-gradient-to-b from-white via-[#fffbf9] to-[#fff7f0]/40 dark:from-[#070a12] dark:via-[#090e1a] dark:to-[#070a12] text-slate-900 dark:text-white transition-colors duration-300 flex flex-col justify-between overflow-x-hidden">

            {/* ── Official Government Banner (GOVPH standard) ───────────── */}
            <div className="relative z-30 w-full">
                <OfficialBanner />
            </div>

            {/* ── Top Header: Branding & Navigation ───────────── */}
            <header className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 w-full flex justify-between items-center">
                {/* Branding: Official City Engineering Department Lockup + Gov Portal Tag */}
                <Link
                    to="/"
                    className="flex items-center gap-2 group transition-opacity hover:opacity-90 cursor-pointer"
                    title="Caloocan City PULSO Home"
                >
                    <Branding size="h-9 w-9 sm:h-10 sm:w-10" showText={true} />
                    <span className="hidden sm:inline-flex px-2 py-0.5 bg-orange-50 dark:bg-orange-950/60 rounded-full text-[9px] font-mono-data font-bold tracking-widest text-[#ff6b00] uppercase border border-orange-200 dark:border-orange-800/60 self-center ml-1">
                        Gov Portal
                    </span>
                </Link>

                {/* Controls & Nav */}
                <div className="flex items-center gap-2.5 sm:gap-4">
                    <div className="hidden md:flex items-center gap-4 text-xs font-bold pr-4 border-r border-slate-200 dark:border-slate-800">
                        <button
                            type="button"
                            onClick={() => setActiveModal('directives')}
                            className="text-slate-600 dark:text-slate-300 hover:text-[#ff6b00] transition-colors uppercase tracking-wider cursor-pointer"
                        >
                            Directives
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveModal('resources')}
                            className="text-slate-600 dark:text-slate-300 hover:text-[#ff6b00] transition-colors uppercase tracking-wider cursor-pointer"
                        >
                            Resources
                        </button>
                    </div>
                    <ThemeToggle />
                    <Link
                        to="/login"
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/85 dark:bg-slate-800/85 hover:bg-white dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 hover:text-[#ff6b00] dark:hover:text-[#ff6b00] border border-slate-200 dark:border-slate-700 text-xs font-bold transition-all shadow-2xs cursor-pointer"
                        title="Return to Citizen Portal"
                    >
                        <Home size={14} className="text-[#ff6b00]" />
                        <span className="hidden sm:inline">Citizen Portal</span>
                    </Link>
                </div>
            </header>

            {/* ── Background Seal Watermark (Inherited from Resident Login) ───── */}
            <div
                className="absolute inset-0 overflow-hidden pointer-events-none select-none z-0 flex items-center justify-end"
                aria-hidden="true"
            >
                <div className="relative w-[340px] h-[340px] xs:w-[420px] xs:h-[420px] sm:w-[540px] sm:h-[540px] lg:w-[680px] lg:h-[680px] mr-[-8%] sm:mr-[2%] lg:mr-[5%] opacity-[0.14] sm:opacity-[0.16] dark:opacity-[0.10] transition-all duration-500">
                    <div className="absolute inset-0 rounded-full border-2 border-orange-500/30 dark:border-white/20 animate-pulse" style={{ animationDuration: '6s' }} />
                    <div className="absolute inset-[-18px] sm:inset-[-24px] rounded-full border border-dashed border-[#ff6b00]/40 dark:border-[#ff6b00]/30" />
                    <div className="absolute inset-[-36px] sm:inset-[-50px] rounded-full border border-slate-400/25 dark:border-white/10" />

                    <img
                        src="/engineering-logo.jpg"
                        alt="Official Caloocan City Seal Watermark"
                        className="w-full h-full object-contain rounded-full drop-shadow-sm dark:brightness-105"
                        loading="eager"
                    />

                    <div className="absolute inset-0 rounded-full bg-radial from-transparent via-transparent to-white/40 dark:to-[#070a12]/50 pointer-events-none" />
                </div>
            </div>

            {/* ── Main Content Grid (60/40 Ratio in max-w-7xl) ───────────── */}
            <main className="relative z-10 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-10 lg:py-14 flex-1 flex items-center">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-center w-full">

                    {/* Left Column: Hero & System Context (60% / 7 cols) */}
                    <div className="lg:col-span-7 flex flex-col items-start text-left w-full">

                        {/* Category Tag Pill */}
                        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-50 dark:bg-orange-950/50 text-[#ff6b00] border border-orange-200 dark:border-orange-800/60 text-[11px] sm:text-xs font-bold uppercase tracking-wider mb-4 shadow-2xs">
                            <Activity size={14} className="text-[#ff6b00] shrink-0" />
                            <span>Unified Command Center • Caloocan City</span>
                        </div>

                        {/* Main Display Heading */}
                        <h1 className="font-heading font-black text-3xl sm:text-5xl lg:text-[52px] text-slate-900 dark:text-white uppercase leading-[1.12] mb-4 tracking-tight">
                            THE PULSE OF <br className="hidden sm:inline" />
                            <span className="text-[#ff6b00]">INFRASTRUCTURE</span>
                        </h1>

                        {/* Plain-Language Subtitle */}
                        <p className="text-sm sm:text-base lg:text-lg text-slate-600 dark:text-slate-300 font-normal leading-relaxed mb-6 max-w-xl">
                            Official engineering management and public service operations platform for LGU personnel. Authorized access only.
                        </p>

                        {/* Feature Cards Grid (Mirrored Clean Style) */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4 w-full max-w-xl text-left">
                            <div className="bg-white/85 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-xs">
                                <div className="w-9 h-9 bg-orange-50 dark:bg-orange-950/50 text-[#ff6b00] rounded-lg flex items-center justify-center mb-2.5 border border-orange-200 dark:border-orange-800/50">
                                    <ShieldCheck size={18} />
                                </div>
                                <h3 className="font-heading font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wide mb-1">Secure Access</h3>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-normal">
                                    Encrypted government access under Data Privacy Act (RA 10173).
                                </p>
                            </div>

                            <div className="bg-white/85 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-xs">
                                <div className="w-9 h-9 bg-orange-50 dark:bg-orange-950/50 text-[#ff6b00] rounded-lg flex items-center justify-center mb-2.5 border border-orange-200 dark:border-orange-800/50">
                                    <Activity size={18} />
                                </div>
                                <h3 className="font-heading font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wide mb-1">Live Dispatch</h3>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-normal">
                                    Direct work order integration with LGU engineering crews.
                                </p>
                            </div>

                            <div className="bg-white/85 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-xs">
                                <div className="w-9 h-9 bg-orange-50 dark:bg-orange-950/50 text-[#ff6b00] rounded-lg flex items-center justify-center mb-2.5 border border-orange-200 dark:border-orange-800/50">
                                    <Users size={18} />
                                </div>
                                <h3 className="font-heading font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wide mb-1">Personnel Hub</h3>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-normal">
                                    Manage field teams, track assignments, and monitor progress.
                                </p>
                            </div>
                        </div>

                    </div>

                    {/* Right Column: Structured Auth Container (40% / 5 cols) */}
                    <div className="lg:col-span-5 flex justify-center lg:justify-end w-full">
                        <div className="w-full max-w-md bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden">

                            {/* Card Body Area */}
                            <div className="p-6 sm:p-8">
                                <AnimatePresence mode="wait">
                                    {view === 'login' ? (
                                        <motion.div
                                            key="login-form"
                                            initial={{ opacity: 0, y: 8 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -8 }}
                                            transition={{ duration: 0.2 }}
                                        >
                                            <div className="mb-6 text-left">
                                                <h2 className="text-xl sm:text-2xl font-heading font-black text-slate-900 dark:text-white tracking-tight">
                                                    Internal Gateway
                                                </h2>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                                    Verify credentials for command center access.
                                                </p>
                                            </div>

                                            {error && (
                                                <div className="mb-5 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300 text-xs font-medium flex items-center gap-2.5">
                                                    <AlertCircle size={15} className="text-red-500 shrink-0" />
                                                    <span>{error}</span>
                                                </div>
                                            )}

                                            <form onSubmit={handleLogin} className="space-y-4">
                                                {/* Personnel ID / Email */}
                                                <div className="space-y-1.5 text-left">
                                                    <label className="block text-[11px] font-mono-data font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                                                        Personnel ID or Email
                                                    </label>
                                                    <div className="relative">
                                                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                                                            <User size={16} />
                                                        </div>
                                                        <input
                                                            type="text"
                                                            value={email}
                                                            onChange={(e) => setEmail(e.target.value)}
                                                            className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 text-xs sm:text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ff6b00] block pl-10 pr-3.5 py-3 transition-all"
                                                            placeholder="e.g. city.engineer@caloocan.gov.ph"
                                                            required
                                                            autoComplete="username"
                                                        />
                                                    </div>
                                                </div>

                                                {/* Password */}
                                                <div className="space-y-1.5 text-left">
                                                    <div className="flex justify-between items-center">
                                                        <label className="block text-[11px] font-mono-data font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                                                            Password
                                                        </label>
                                                        <button
                                                            type="button"
                                                            onClick={() => { setView('forgot'); setError(''); }}
                                                            className="text-[11px] font-semibold text-[#ff6b00] hover:text-[#e65c00] transition-colors cursor-pointer"
                                                        >
                                                            Forgot Password?
                                                        </button>
                                                    </div>
                                                    <div className="relative">
                                                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                                                            <Lock size={16} />
                                                        </div>
                                                        <input
                                                            type={showPassword ? 'text' : 'password'}
                                                            value={password}
                                                            onChange={(e) => setPassword(e.target.value)}
                                                            className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 text-xs sm:text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ff6b00] block pl-10 pr-10 py-3 transition-all"
                                                            placeholder="Enter password"
                                                            required
                                                            autoComplete="current-password"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowPassword(!showPassword)}
                                                            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-[#ff6b00] transition-colors cursor-pointer"
                                                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                                                        >
                                                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* ReCAPTCHA Checkbox */}
                                                <AnimatePresence>
                                                    {email && password && (
                                                        <motion.div 
                                                            initial={{ opacity: 0, height: 0 }}
                                                            animate={{ opacity: 1, height: 'auto' }}
                                                            exit={{ opacity: 0, height: 0 }}
                                                            className="flex justify-center w-full py-1 overflow-hidden"
                                                        >
                                                            <div className="scale-90 origin-center">
                                                                <ReCAPTCHA
                                                                    ref={recaptchaRef}
                                                                    sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY}
                                                                    onChange={(token) => setCaptchaToken(token)}
                                                                    theme="light"
                                                                />
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>

                                                {/* Submit CTA Button */}
                                                <button
                                                    type="submit"
                                                    disabled={loading}
                                                    className="w-full bg-[#ff6b00] hover:bg-[#e65c00] active:scale-[0.99] text-white py-3.5 px-4 rounded-xl font-heading font-bold text-sm tracking-wide transition-all shadow-md hover:shadow-lg hover:shadow-orange-500/25 min-h-[48px] flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b00]"
                                                >
                                                    {loading ? (
                                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                    ) : (
                                                        <>
                                                            <span>Initialize Session</span>
                                                            <ChevronRight size={16} />
                                                        </>
                                                    )}
                                                </button>
                                            </form>
                                        </motion.div>
                                    ) : (
                                        /* Forgot Password Form */
                                        <motion.div
                                            key="forgot-form"
                                            initial={{ opacity: 0, y: 8 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -8 }}
                                            transition={{ duration: 0.2 }}
                                        >
                                            {recoverySent ? (
                                                <div className="text-center py-4">
                                                    <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-3 border border-emerald-200 dark:border-emerald-800/60">
                                                        <CheckCircle size={30} />
                                                    </div>
                                                    <h2 className="text-xl font-heading font-bold text-slate-900 dark:text-white mb-1.5">
                                                        Recovery Sent
                                                    </h2>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
                                                        An administrative recovery protocol has been initiated for <span className="text-[#ff6b00] font-semibold">{recoveryEmail}</span>. Please check your official inbox.
                                                    </p>
                                                    <button
                                                        onClick={() => { setView('login'); setRecoverySent(false); }}
                                                        className="w-full bg-[#ff6b00] hover:bg-[#e65c00] text-white py-3.5 px-4 rounded-xl font-heading font-bold text-xs uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                                                    >
                                                        Return to Sign In <ChevronRight size={16} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="mb-6 text-left">
                                                        <h2 className="text-xl sm:text-2xl font-heading font-black text-slate-900 dark:text-white tracking-tight">
                                                            Recover Password
                                                        </h2>
                                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                                            Enter your registered personnel email to initiate recovery.
                                                        </p>
                                                    </div>

                                                    {error && (
                                                        <div className="mb-5 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300 text-xs font-medium flex items-center gap-2.5">
                                                            <AlertCircle size={15} className="text-red-500 shrink-0" />
                                                            <span>{error}</span>
                                                        </div>
                                                    )}

                                                    <form onSubmit={handleRecovery} className="space-y-4">
                                                        <div className="space-y-1.5 text-left">
                                                            <label className="block text-[11px] font-mono-data font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                                                                Personnel Email
                                                            </label>
                                                            <div className="relative">
                                                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                                                                    <Mail size={16} />
                                                                </div>
                                                                <input
                                                                    type="email"
                                                                    value={recoveryEmail}
                                                                    onChange={(e) => setRecoveryEmail(e.target.value)}
                                                                    className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 text-xs sm:text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ff6b00] block pl-10 pr-3.5 py-3 transition-all"
                                                                    placeholder="official@pulso.system"
                                                                    required
                                                                />
                                                            </div>
                                                        </div>

                                                        <button
                                                            type="submit"
                                                            disabled={loading}
                                                            className="w-full bg-[#ff6b00] hover:bg-[#e65c00] text-white py-3.5 px-4 rounded-xl font-heading font-bold text-sm tracking-wide transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                                                        >
                                                            {loading ? (
                                                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                            ) : (
                                                                <>
                                                                    <span>Send Recovery Link</span>
                                                                    <ChevronRight size={16} />
                                                                </>
                                                            )}
                                                        </button>
                                                    </form>

                                                    <button 
                                                        type="button" 
                                                        onClick={() => { setView('login'); setError(''); }} 
                                                        className="flex items-center justify-center gap-2 mx-auto text-slate-500 hover:text-slate-800 dark:hover:text-white text-xs font-semibold transition-colors mt-6 cursor-pointer"
                                                    >
                                                        <ArrowLeft size={14} /> Back to Sign In
                                                    </button>
                                                </>
                                            )}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    </div>

                </div>
            </main>



            {/* ── Standard Civic Legal Footer Strip ───────────────────────── */}
            <footer className="relative z-10 w-full bg-slate-100/80 dark:bg-[#060911] border-t border-slate-200/80 dark:border-slate-800/80 py-3.5 text-slate-500 dark:text-slate-400 text-[11px] transition-colors">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
                    <span>
                        &copy; {new Date().getFullYear()} City Government of Caloocan • City Engineering Department. All rights reserved.
                    </span>
                    <div className="flex items-center gap-4 font-semibold">
                        <button 
                            type="button" 
                            onClick={() => setLegalModal({ isOpen: true, tab: 'privacy' })} 
                            className="hover:text-[#ff6b00] transition-colors cursor-pointer"
                        >
                            Privacy Policy
                        </button>
                        <span>•</span>
                        <button 
                            type="button" 
                            onClick={() => setLegalModal({ isOpen: true, tab: 'terms' })} 
                            className="hover:text-[#ff6b00] transition-colors cursor-pointer"
                        >
                            Terms of Service
                        </button>
                        <span>•</span>
                        <Link to="/" className="hover:text-[#ff6b00] transition-colors cursor-pointer">
                            Portal Home
                        </Link>
                    </div>
                </div>
            </footer>

            {/* Legal Terms/Privacy Modal */}
            <LegalModal
                isOpen={legalModal.isOpen}
                onClose={() => setLegalModal(prev => ({ ...prev, isOpen: false }))}
                initialTab={legalModal.tab}
            />

            {/* PORTAL MODALS (Directives & Resources) */}
            <AnimatePresence>
                {activeModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setActiveModal(null)}
                        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md"
                    >
                        <motion.div
                            initial={{ scale: 0.95, y: 16, opacity: 0 }}
                            animate={{ scale: 1, y: 0, opacity: 1 }}
                            exit={{ scale: 0.95, y: 16, opacity: 0 }}
                            onClick={e => e.stopPropagation()}
                            className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden"
                        >
                            <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                                <div className="flex items-center gap-3.5">
                                    <div className="w-10 h-10 bg-orange-50 dark:bg-orange-950/60 text-[#ff6b00] rounded-xl flex items-center justify-center border border-orange-200 dark:border-orange-800/60">
                                        {activeModal === 'directives' ? <FileCheck size={20} /> : <BookOpen size={20} />}
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-heading font-black text-slate-900 dark:text-white tracking-tight capitalize">{activeModal}</h3>
                                        <p className="text-[10px] font-mono-data font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Engineering Official Repository</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => setActiveModal(null)} 
                                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
                                {activeModal === 'directives' ? (
                                    <div className="space-y-3">
                                        {DIRECTIVES.map(dir => (
                                            <div key={dir.id} className="group p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:border-[#ff6b00]/40 transition-all flex items-center justify-between">
                                                <div className="flex items-center gap-3.5">
                                                    <div className="font-mono-data text-[10px] font-black px-2 py-1 bg-slate-900 dark:bg-slate-700 text-white rounded-md shrink-0">{dir.id}</div>
                                                    <div>
                                                        <h4 className="font-heading font-bold text-xs sm:text-sm text-slate-900 dark:text-white group-hover:text-[#ff6b00] transition-colors">{dir.title}</h4>
                                                        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">{dir.author} • {dir.date}</p>
                                                    </div>
                                                </div>
                                                <button className="flex items-center gap-1 text-xs font-bold text-[#ff6b00] opacity-0 group-hover:opacity-100 transition-opacity shrink-0 cursor-pointer">
                                                    <span>View</span> <ExternalLink size={12} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                                        {RESOURCES.map((res, i) => (
                                            <div key={i} className="group p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:border-[#ff6b00]/40 transition-all">
                                                <div className="flex items-center gap-2.5 mb-2.5">
                                                    <div className="w-8 h-8 bg-orange-50 dark:bg-orange-950/60 text-[#ff6b00] rounded-lg flex items-center justify-center border border-orange-200 dark:border-orange-800/50">
                                                        <res.icon size={16} />
                                                    </div>
                                                    <div className="text-[10px] font-mono-data font-bold text-[#ff6b00] uppercase tracking-wider">{res.type}</div>
                                                </div>
                                                <h4 className="font-heading font-bold text-xs sm:text-sm text-slate-900 dark:text-white leading-snug mb-2 group-hover:text-[#ff6b00] transition-colors">{res.title}</h4>
                                                <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-slate-800">
                                                    <span className="text-[10px] font-mono-data text-slate-500 dark:text-slate-400">{res.size}</span>
                                                    <button className="p-1 text-slate-400 hover:text-[#ff6b00] transition-colors cursor-pointer">
                                                        <ExternalLink size={13} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 text-center">
                                <p className="text-[10px] font-mono-data font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                    Confidential Administrative System • Authorized Personnel Only
                                </p>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
