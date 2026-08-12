import React, { useState, useRef } from 'react';
import ReCAPTCHA from "react-google-recaptcha";
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    Shield, Lock, User, Eye, EyeOff, ChevronRight, Activity,
    Mail, ArrowLeft, CheckCircle, FileCheck, BookOpen, ExternalLink,
    Map, ShieldCheck, Home, FileText, Users
} from 'lucide-react';
import Branding from '../components/Branding';
import ThemeToggle from '../components/ThemeToggle';

export default function GovLanding() {
    const navigate = useNavigate();
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
                localStorage.setItem('pulso_token', data.access_token);
                localStorage.setItem('pulso_user', JSON.stringify(data.user));
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
                    localStorage.removeItem('pulso_token');
                    localStorage.removeItem('pulso_user');
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
        <div className="relative min-h-screen w-full bg-[#fffbf9] dark:bg-[#0b0f19] overflow-hidden font-sans text-[#2c1d11] dark:text-white transition-colors duration-300 flex flex-col justify-between">

            {/* Ambient Soft Glow Accents */}
            <div className="hidden sm:block absolute top-1/4 left-10 w-96 h-96 bg-[#ff6b00]/10 dark:bg-[#ff6b00]/15 rounded-full blur-3xl pointer-events-none" />
            <div className="hidden sm:block absolute bottom-10 right-1/4 w-80 h-80 bg-[#ffefe5]/70 dark:bg-orange-600/10 rounded-full blur-3xl pointer-events-none" />
            <div className="hidden sm:block absolute top-1/2 right-0 w-96 h-96 bg-[#ff6b00]/5 dark:bg-[#ff6b00]/10 rounded-full blur-3xl pointer-events-none" />

            {/* Navigation Header */}
            <nav className="relative w-full p-4 sm:p-6 lg:p-8 flex justify-between items-center z-50 max-w-7xl mx-auto">
                <div className="flex items-center gap-3 sm:gap-4">
                    <button
                        onClick={() => navigate('/')}
                        className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-[#f3e9e2] dark:border-slate-800 shadow-sm text-[#736254] dark:text-slate-300 hover:text-[#ff6b00] hover:border-[#ff6b00]/40 transition-all"
                        title="Back to Home"
                    >
                        <Home size={15} />
                    </button>
                    <div className="flex items-center gap-2.5 sm:gap-3">
                        <Branding size="h-8 sm:h-10" showText={false} />
                        <div className="flex items-center gap-2">
                            <span className="text-xl sm:text-2xl font-black tracking-tighter text-[#2c1d11] dark:text-white">PULSO</span>
                            <span className="px-2 sm:px-2.5 py-0.5 bg-[#ffefe5] dark:bg-[#ff6b00]/10 rounded-full text-[9px] sm:text-[10px] font-bold tracking-widest text-[#ff6b00] uppercase border border-[#f3e9e2] dark:border-[#ff6b00]/20">
                                Gov Portal
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3 sm:gap-5">
                    <div className="hidden md:flex items-center gap-5 text-xs font-bold pr-5 border-r border-[#f3e9e2] dark:border-slate-800">
                        <button
                            onClick={() => setActiveModal('directives')}
                            className="text-[#736254] dark:text-slate-300 hover:text-[#ff6b00] transition-colors uppercase tracking-wider"
                        >
                            Directives
                        </button>
                        <button
                            onClick={() => setActiveModal('resources')}
                            className="text-[#736254] dark:text-slate-300 hover:text-[#ff6b00] transition-colors uppercase tracking-wider"
                        >
                            Resources
                        </button>
                    </div>
                    <ThemeToggle />
                </div>
            </nav>

            {/* Main Content Grid */}
            <main className="relative z-20 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-12 py-4 sm:py-8 flex-1 flex items-center">
                <div className="grid lg:grid-cols-12 gap-8 sm:gap-12 lg:gap-16 items-center w-full">

                    {/* Left Column: Info Panel */}
                    <div className="lg:col-span-7 space-y-6 sm:space-y-8 text-center lg:text-left">
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
                            <div className="inline-flex items-center gap-2 mb-3 sm:mb-4 bg-[#ffefe5] dark:bg-[#ff6b00]/10 text-[#ff6b00] px-3.5 sm:px-4 py-1.5 rounded-full border border-[#f3e9e2] dark:border-[#ff6b00]/20 text-[10px] sm:text-xs font-bold tracking-widest uppercase">
                                <Activity size={15} />
                                <span>Unified Command Center • Caloocan City</span>
                            </div>

                            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-[#2c1d11] dark:text-white uppercase leading-[1.08] mb-3 sm:mb-4 tracking-tight">
                                THE PULSE OF <br className="hidden sm:inline" />
                                <span className="text-[#ff6b00]">INFRASTRUCTURE</span>
                            </h1>

                            <p className="text-xs sm:text-base text-[#736254] dark:text-slate-300 leading-relaxed font-medium max-w-xl mx-auto lg:mx-0">
                                Official engineering management and public service operations platform for LGU personnel. Authorized access only.
                            </p>
                        </motion.div>

                        {/* Feature Cards */}
                        <motion.div
                            className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 text-left"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 0.2 }}
                        >
                            <div className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-md border border-[#f3e9e2] dark:border-slate-800 p-4 rounded-2xl shadow-sm">
                                <div className="w-9 h-9 sm:w-10 sm:h-10 bg-[#ffefe5] dark:bg-[#ff6b00]/15 text-[#ff6b00] rounded-xl flex items-center justify-center mb-2.5 sm:mb-3">
                                    <ShieldCheck size={20} />
                                </div>
                                <h3 className="font-bold text-xs text-[#2c1d11] dark:text-white uppercase tracking-wide mb-1">Secure Access</h3>
                                <p className="text-[11px] text-[#736254] dark:text-slate-400 font-medium leading-normal">
                                    Encrypted government access under Data Privacy Act (RA 10173).
                                </p>
                            </div>

                            <div className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-md border border-[#f3e9e2] dark:border-slate-800 p-4 rounded-2xl shadow-sm">
                                <div className="w-9 h-9 sm:w-10 sm:h-10 bg-[#ffefe5] dark:bg-[#ff6b00]/15 text-[#ff6b00] rounded-xl flex items-center justify-center mb-2.5 sm:mb-3">
                                    <Activity size={20} />
                                </div>
                                <h3 className="font-bold text-xs text-[#2c1d11] dark:text-white uppercase tracking-wide mb-1">Live Dispatch</h3>
                                <p className="text-[11px] text-[#736254] dark:text-slate-400 font-medium leading-normal">
                                    Direct work order integration with LGU engineering crews.
                                </p>
                            </div>

                            <div className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-md border border-[#f3e9e2] dark:border-slate-800 p-4 rounded-2xl shadow-sm">
                                <div className="w-9 h-9 sm:w-10 sm:h-10 bg-[#ffefe5] dark:bg-[#ff6b00]/15 text-[#ff6b00] rounded-xl flex items-center justify-center mb-2.5 sm:mb-3">
                                    <Users size={20} />
                                </div>
                                <h3 className="font-bold text-xs text-[#2c1d11] dark:text-white uppercase tracking-wide mb-1">Personnel Hub</h3>
                                <p className="text-[11px] text-[#736254] dark:text-slate-400 font-medium leading-normal">
                                    Manage field teams, track assignments, and monitor progress.
                                </p>
                            </div>
                        </motion.div>
                    </div>

                    {/* Right Column: Login Card */}
                    <div className="lg:col-span-5 flex justify-center lg:justify-end">
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }} className="w-full max-w-md">
                            <div className="relative group">
                                {/* Card Glow */}
                                <div className="absolute -inset-1 bg-gradient-to-r from-[#ff6b00]/25 to-[#cc5200]/25 rounded-[2rem] sm:rounded-[2.5rem] blur-xl opacity-50 group-hover:opacity-75 transition-opacity" />

                                <div className="relative bg-white/95 dark:bg-slate-900/90 backdrop-blur-xl border border-[#f3e9e2] dark:border-slate-800 rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-10 shadow-2xl overflow-hidden min-h-[440px] sm:min-h-[480px] flex flex-col justify-center">
                                    <AnimatePresence mode="wait">
                                        {view === 'login' ? (
                                            <motion.div
                                                key="login-form"
                                                initial={{ opacity: 0, x: 20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: -20 }}
                                                transition={{ duration: 0.3 }}
                                            >
                                                {/* Header */}
                                                <div className="mb-6 sm:mb-8 text-center">
                                                    <div className="w-14 h-14 sm:w-16 sm:h-16 bg-[#ffefe5] dark:bg-[#ff6b00]/15 rounded-2xl flex items-center justify-center mx-auto mb-3 sm:mb-4 border border-[#f3e9e2] dark:border-[#ff6b00]/20 shadow-sm">
                                                        <Lock className="text-[#ff6b00]" size={28} />
                                                    </div>
                                                    <h2 className="text-xl sm:text-2xl font-black text-[#2c1d11] dark:text-white mb-1 tracking-tight">Internal Gateway</h2>
                                                    <p className="text-[#736254] dark:text-slate-400 text-xs font-medium">Verify credentials for command center access</p>
                                                </div>

                                                {error && (
                                                    <motion.div
                                                        initial={{ opacity: 0, y: -10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        className="mb-5 p-3.5 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-2xl text-red-600 dark:text-red-400 text-xs font-bold flex items-center gap-3"
                                                    >
                                                        <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse shrink-0" />
                                                        {error}
                                                    </motion.div>
                                                )}

                                                <form onSubmit={handleLogin} className="space-y-5" autoComplete="off">
                                                    <div className="space-y-1.5">
                                                        <label className="block text-[10px] font-black text-[#736254] dark:text-slate-400 uppercase tracking-widest ml-1">Personnel ID / Email</label>
                                                        <div className="relative">
                                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#736254] dark:text-slate-400">
                                                                <User size={16} />
                                                            </div>
                                                            <input
                                                                type="text"
                                                                value={email}
                                                                onChange={(e) => setEmail(e.target.value)}
                                                                autoComplete="off"
                                                                className="w-full bg-[#fffbf9] dark:bg-slate-800/60 border border-[#f3e9e2] dark:border-slate-700 text-[#2c1d11] dark:text-white placeholder-[#b8a99a] dark:placeholder-slate-500 text-sm rounded-xl focus:outline-none focus:border-[#ff6b00]/50 focus:ring-2 focus:ring-[#ff6b00]/10 pl-11 p-3.5 transition-all"
                                                                placeholder="ID-000000 or email"
                                                                required
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="space-y-1.5">
                                                        <div className="flex justify-between items-center px-1">
                                                            <label className="block text-[10px] font-black text-[#736254] dark:text-slate-400 uppercase tracking-widest">Access Key</label>
                                                            <button
                                                                type="button"
                                                                onClick={() => setView('forgot')}
                                                                className="text-[10px] font-bold text-[#ff6b00] hover:text-[#e65c00] transition-colors uppercase tracking-widest"
                                                            >
                                                                Forgot Password?
                                                            </button>
                                                        </div>
                                                        <div className="relative">
                                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#736254] dark:text-slate-400">
                                                                <Shield size={16} />
                                                            </div>
                                                            <input
                                                                type={showPassword ? "text" : "password"}
                                                                value={password}
                                                                onChange={(e) => setPassword(e.target.value)}
                                                                autoComplete="new-password"
                                                                className="w-full bg-[#fffbf9] dark:bg-slate-800/60 border border-[#f3e9e2] dark:border-slate-700 text-[#2c1d11] dark:text-white placeholder-[#b8a99a] dark:placeholder-slate-500 text-sm rounded-xl focus:outline-none focus:border-[#ff6b00]/50 focus:ring-2 focus:ring-[#ff6b00]/10 pl-11 pr-11 p-3.5 transition-all"
                                                                placeholder="••••••••"
                                                                required
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => setShowPassword(!showPassword)}
                                                                className="absolute inset-y-0 right-0 pr-4 flex items-center text-[#736254] dark:text-slate-400 hover:text-[#ff6b00] transition-colors"
                                                            >
                                                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                                            </button>
                                                        </div>
                                                    </div>

                                                    <AnimatePresence>
                                                        {email && password && (
                                                            <motion.div
                                                                initial={{ opacity: 0, height: 0 }}
                                                                animate={{ opacity: 1, height: 'auto' }}
                                                                exit={{ opacity: 0, height: 0 }}
                                                                className="flex justify-center w-full overflow-hidden"
                                                            >
                                                                <div className="relative z-10 scale-95 origin-center py-2">
                                                                    <ReCAPTCHA
                                                                        ref={recaptchaRef}
                                                                        sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY}
                                                                        onChange={(token) => setCaptchaToken(token)}
                                                                    />
                                                                </div>
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>

                                                    <button
                                                        type="submit"
                                                        disabled={loading}
                                                        className="w-full bg-[#ff6b00] hover:bg-[#e65c00] text-white p-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-[#ff6b00]/20 hover:shadow-[#ff6b00]/30 hover:-translate-y-0.5 flex items-center justify-center gap-3 group disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        {loading ? (
                                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                        ) : (
                                                            <>
                                                                Initialize Session
                                                                <ChevronRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
                                                            </>
                                                        )}
                                                    </button>
                                                </form>
                                            </motion.div>
                                        ) : (
                                            <motion.div
                                                key="forgot-form"
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: 20 }}
                                                transition={{ duration: 0.3 }}
                                            >
                                                {recoverySent ? (
                                                    <div className="text-center py-6">
                                                        <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto mb-5 border border-emerald-200 dark:border-emerald-500/20">
                                                            <CheckCircle className="text-emerald-500" size={32} />
                                                        </div>
                                                        <h2 className="text-xl font-black text-[#2c1d11] dark:text-white mb-3 tracking-tight">Recovery Sent</h2>
                                                        <p className="text-[#736254] dark:text-slate-400 text-xs font-medium mb-8 leading-relaxed">
                                                            An administrative recovery protocol has been initiated for <span className="text-[#ff6b00] font-bold">{recoveryEmail}</span>. Please check your official inbox.
                                                        </p>
                                                        <button
                                                            onClick={() => { setView('login'); setRecoverySent(false); }}
                                                            className="flex items-center gap-2 mx-auto text-[#ff6b00] font-bold uppercase tracking-widest text-[10px] hover:text-[#e65c00] transition-colors"
                                                        >
                                                            <ArrowLeft size={14} /> Return to Login
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <div className="mb-6 text-center">
                                                            <div className="w-14 h-14 bg-[#ffefe5] dark:bg-[#ff6b00]/15 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-[#f3e9e2] dark:border-[#ff6b00]/20">
                                                                <Mail className="text-[#ff6b00]" size={26} />
                                                            </div>
                                                            <h2 className="text-xl font-black text-[#2c1d11] dark:text-white mb-1 tracking-tight">Recover Key</h2>
                                                            <p className="text-[#736254] dark:text-slate-400 text-xs font-medium">Enter your email to initiate recovery</p>
                                                        </div>

                                                        <form onSubmit={handleRecovery} className="space-y-5" autoComplete="off">
                                                            <div className="space-y-1.5">
                                                                <label className="block text-[10px] font-black text-[#736254] dark:text-slate-400 uppercase tracking-widest ml-1">Personnel Email</label>
                                                                <div className="relative">
                                                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#736254] dark:text-slate-400">
                                                                        <Mail size={16} />
                                                                    </div>
                                                                    <input
                                                                        type="email"
                                                                        value={recoveryEmail}
                                                                        onChange={(e) => setRecoveryEmail(e.target.value)}
                                                                        autoComplete="off"
                                                                        className="w-full bg-[#fffbf9] dark:bg-slate-800/60 border border-[#f3e9e2] dark:border-slate-700 text-[#2c1d11] dark:text-white placeholder-[#b8a99a] dark:placeholder-slate-500 text-sm rounded-xl focus:outline-none focus:border-[#ff6b00]/50 focus:ring-2 focus:ring-[#ff6b00]/10 pl-11 p-3.5 transition-all"
                                                                        placeholder="official@pulso.system"
                                                                        required
                                                                    />
                                                                </div>
                                                            </div>

                                                            <button
                                                                type="submit"
                                                                disabled={loading}
                                                                className="w-full bg-[#ff6b00] hover:bg-[#e65c00] text-white p-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-lg hover:-translate-y-0.5 flex items-center justify-center gap-3 group disabled:opacity-50"
                                                            >
                                                                {loading ? (
                                                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                                ) : (
                                                                    <>Send Recovery Link <ChevronRight size={16} className="group-hover:translate-x-0.5 transition-transform" /></>
                                                                )}
                                                            </button>

                                                            <button
                                                                type="button"
                                                                onClick={() => setView('login')}
                                                                className="flex items-center gap-2 mx-auto text-[#736254] dark:text-slate-400 font-bold uppercase tracking-widest text-[10px] hover:text-[#ff6b00] transition-colors"
                                                            >
                                                                <ArrowLeft size={12} /> Cancel
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
                </div>
            </main>



            {/* PORTAL MODALS */}
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
                            initial={{ scale: 0.9, y: 20, opacity: 0 }}
                            animate={{ scale: 1, y: 0, opacity: 1 }}
                            exit={{ scale: 0.9, y: 20, opacity: 0 }}
                            onClick={e => e.stopPropagation()}
                            className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-[2.5rem] border border-[#f3e9e2] dark:border-slate-800 shadow-2xl overflow-hidden"
                        >
                            <div className="px-8 py-6 border-b border-[#f3e9e2] dark:border-slate-800 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-11 h-11 bg-[#ff6b00] rounded-2xl flex items-center justify-center shadow-lg shadow-[#ff6b00]/20">
                                        {activeModal === 'directives' ? <FileCheck className="text-white" size={22} /> : <BookOpen className="text-white" size={22} />}
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-[#2c1d11] dark:text-white tracking-tight capitalize">{activeModal}</h3>
                                        <p className="text-[10px] font-bold text-[#736254] dark:text-slate-400 uppercase tracking-widest">Engineering Official Repository</p>
                                    </div>
                                </div>
                                <button onClick={() => setActiveModal(null)} className="p-2.5 hover:bg-[#ffefe5] dark:hover:bg-slate-800 rounded-full transition-colors text-[#736254] dark:text-slate-400">
                                    <ChevronRight className="rotate-90" size={18} />
                                </button>
                            </div>

                            <div className="p-8 max-h-[60vh] overflow-y-auto">
                                {activeModal === 'directives' ? (
                                    <div className="space-y-3">
                                        {DIRECTIVES.map(dir => (
                                            <div key={dir.id} className="group p-5 rounded-2xl border border-[#f3e9e2] dark:border-slate-800 bg-[#fffbf9] dark:bg-slate-800/40 hover:border-[#ff6b00]/30 transition-all flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <div className="font-mono text-[10px] font-black p-1.5 bg-[#2c1d11] dark:bg-slate-700 text-white rounded shrink-0">{dir.id}</div>
                                                    <div>
                                                        <h4 className="font-bold text-sm text-[#2c1d11] dark:text-white group-hover:text-[#ff6b00] transition-colors">{dir.title}</h4>
                                                        <p className="text-[10px] text-[#736254] dark:text-slate-400 font-bold uppercase tracking-widest mt-0.5">{dir.author} • {dir.date}</p>
                                                    </div>
                                                </div>
                                                <button className="flex items-center gap-1.5 text-[10px] font-black text-[#ff6b00] uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                                    View <ExternalLink size={12} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {RESOURCES.map((res, i) => (
                                            <div key={i} className="group p-5 rounded-2xl border border-[#f3e9e2] dark:border-slate-800 bg-[#fffbf9] dark:bg-slate-800/40 hover:border-[#ff6b00]/30 transition-all">
                                                <div className="flex items-center gap-3 mb-3">
                                                    <div className="w-9 h-9 bg-[#ffefe5] dark:bg-[#ff6b00]/15 rounded-xl flex items-center justify-center text-[#ff6b00]">
                                                        <res.icon size={18} />
                                                    </div>
                                                    <div className="text-[10px] font-black text-[#ff6b00] uppercase tracking-widest">{res.type}</div>
                                                </div>
                                                <h4 className="font-bold text-sm text-[#2c1d11] dark:text-white leading-tight mb-3 group-hover:text-[#ff6b00] transition-colors">{res.title}</h4>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[10px] font-bold text-[#736254] dark:text-slate-400 uppercase">{res.size}</span>
                                                    <button className="p-1.5 bg-[#ffefe5] dark:bg-slate-700 rounded-lg text-[#ff6b00] dark:text-slate-300 hover:text-[#e65c00] transition-colors">
                                                        <ExternalLink size={13} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="px-8 py-5 bg-[#fffbf9] dark:bg-slate-800/40 border-t border-[#f3e9e2] dark:border-slate-800 text-center">
                                <p className="text-[10px] font-bold text-[#736254] dark:text-slate-400 uppercase tracking-[0.2em]">
                                    Confidential Administrative System • Authorized Use Only
                                </p>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
