import React, { useState, useEffect } from 'react';
import Spline from '@splinetool/react-spline';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Shield, Lock, User, Eye, EyeOff, ChevronRight, Activity, Sun, Moon, Monitor, Mail, ArrowLeft, CheckCircle, FileCheck, BookOpen, ExternalLink, Map, ShieldCheck } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import Branding from '../components/Branding';
import ErrorBoundary from '../components/ErrorBoundary';

export default function GovLanding() {
    const { theme, changeTheme } = useTheme();
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [view, setView] = useState('login'); // 'login' or 'forgot'
    const [recoverySent, setRecoverySent] = useState(false);
    const [recoveryEmail, setRecoveryEmail] = useState('');
    
    // Portal Information Modals
    const [activeModal, setActiveModal] = useState(null); // 'directives' | 'resources' | null

    // Spline Scenes
    const DARK_SCENE = "https://prod.spline.design/us1Y6xfaQLiI2cim/scene.splinecode";
    const LIGHT_SCENE = "https://prod.spline.design/nrFjYzbJnF7GU92z/scene.splinecode";

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
                setError(errData.detail || 'Authentication failed');
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
            const response = await fetch('http://localhost:8000/api/auth/forgot-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email: recoveryEmail })
            });

            if (response.ok) {
                setRecoverySent(true);
            } else {
                const data = await response.json();
                setError(data.detail || 'Recovery failed. Internal protocol error.');
            }
        } catch (err) {
            setError('System Connectivity Error');
        } finally {
            setLoading(false);
        }
    };

    // ─────────────────────────────────────────────────────────────────────────────
    // Directives & Resources Data
    // ─────────────────────────────────────────────────────────────────────────────
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
        { title: 'Caloocan North High-Res Utility Map', type: 'Geospatial Data', size: '88 MB', icon: Map },
    ];

    return (
        <div className="relative min-h-screen w-full bg-slate-50 dark:bg-[#020617] overflow-hidden font-sans text-slate-800 dark:text-slate-200 transition-colors duration-700">
            {/* Pro Dynamic Background System */}
            <div className="absolute inset-0 z-0 pointer-events-auto">
                {/* Light Scene Layer */}
                <div className={`absolute inset-0 transition-opacity duration-1000 ${currentScene === LIGHT_SCENE ? 'opacity-100 z-10 scale-[0.85] lg:scale-100 origin-center' : 'opacity-0 z-0'}`}>
                    <ErrorBoundary fallback={<div className="w-full h-full bg-slate-100 dark:bg-slate-900" />}>
                        <Spline scene={LIGHT_SCENE} />
                    </ErrorBoundary>
                </div>
                {/* Dark Scene Layer */}
                <div className={`absolute inset-0 transition-opacity duration-1000 ${currentScene === DARK_SCENE ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}>
                    <ErrorBoundary fallback={<div className="w-full h-full bg-slate-100 dark:bg-slate-900" />}>
                        <Spline scene={DARK_SCENE} />
                    </ErrorBoundary>
                </div>
                
                {/* Refined adaptive Overlay gradients */}
                <div className="absolute inset-0 bg-gradient-to-r from-white/60 via-transparent to-transparent dark:from-[#020617]/80 dark:via-transparent dark:to-transparent pointer-events-none z-20" />
                <div className="absolute inset-0 bg-gradient-to-t from-white/40 via-transparent to-transparent dark:from-[#020617]/40 dark:via-transparent dark:to-transparent pointer-events-none z-20" />
            </div>

            {/* Navigation Header */}
            <nav className="absolute top-0 left-0 w-full p-8 flex justify-between items-center z-50">
                <div className="flex items-center gap-3">
                    <Branding size="h-10" showText={false} />
                    <div>
                        <span className="text-2xl font-black tracking-tighter text-slate-900 dark:text-white">PULSO</span>
                        <span className="ml-2 px-2 py-0.5 bg-slate-900/5 dark:bg-white/10 backdrop-blur-md rounded text-[10px] font-bold tracking-widest text-orange-600 dark:text-orange-400 uppercase border border-slate-900/5 dark:border-white/10">Gov Portal</span>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <div className="hidden md:flex items-center gap-6 text-sm font-medium pr-6 border-r border-slate-200 dark:border-white/10">
                        <button 
                            onClick={() => setActiveModal('directives')}
                            className="text-slate-500 dark:text-slate-400 hover:text-orange-600 dark:hover:text-white transition-colors"
                        >
                            Directives
                        </button>
                        <button 
                            onClick={() => setActiveModal('resources')}
                            className="text-slate-500 dark:text-slate-400 hover:text-orange-600 dark:hover:text-white transition-colors"
                        >
                            Resources
                        </button>
                    </div>

                    {/* Pro Theme Switcher */}
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

            {/* Main Content Grid */}
            <main className="relative z-10 grid lg:grid-cols-2 min-h-screen items-center px-12 lg:px-32">
                {/* Text Content */}
                <div className="pt-20 lg:pt-0 max-w-xl">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.8 }}
                    >
                        <div className="flex items-center gap-2 mb-6 text-orange-600 dark:text-orange-500">
                            <Activity size={18} />
                            <span className="text-sm font-bold tracking-[0.3em] uppercase">Unified Command Center</span>
                        </div>
                        <h1 className="text-5xl lg:text-8xl font-black text-slate-900 dark:text-white leading-[0.9] mb-8 tracking-tighter">
                            THE PULSE OF <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-l dark:bg-gradient-to-r from-orange-500 to-orange-600">INFRASTRUCTURE</span>
                        </h1>
                        <p className="text-base lg:text-xl text-slate-600 dark:text-slate-400 leading-relaxed mb-10 max-w-md font-medium">
                            Official engineering management and public service operations platform for LGU personnel. Authorized access only.
                        </p>
                    </motion.div>
                </div>

                {/* Login Gateway Panel */}
                <div className="flex justify-center lg:justify-end py-20 lg:py-0">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                        className="w-full max-w-md"
                    >
                        <div className="relative group">
                            {/* Decorative glow background */}
                            <div className="absolute -inset-1 bg-gradient-to-r from-orange-600/20 to-blue-600/20 rounded-[2.5rem] blur-2xl opacity-30 dark:opacity-50 group-hover:opacity-100 transition duration-1000 group-hover:duration-200" />
                            
                            <div className="relative bg-white/20 dark:bg-slate-900/40 backdrop-blur-md border border-white/30 dark:border-white/5 rounded-[2.5rem] p-8 lg:p-12 shadow-2xl overflow-hidden min-h-[500px] flex flex-col justify-center">
                                <AnimatePresence mode="wait">
                                    {view === 'login' ? (
                                        <motion.div
                                            key="login-form"
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -20 }}
                                            transition={{ duration: 0.3 }}
                                        >
                                            <div className="mb-10 text-center">
                                                <div className="w-20 h-20 bg-orange-100 dark:bg-white/5 rounded-[1.5rem] flex items-center justify-center mx-auto mb-6 border border-orange-200 dark:border-white/10 shadow-inner">
                                                    <Lock className="text-orange-600 dark:text-orange-500" size={40} />
                                                </div>
                                                <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">Internal Gateway</h2>
                                                <p className="text-slate-600 dark:text-slate-500 text-sm font-medium">Verify credentials for command center access</p>
                                            </div>

                                            {error && (
                                                <motion.div 
                                                    initial={{ opacity: 0, y: -10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-600 dark:text-red-400 text-xs font-bold flex items-center gap-3 shadow-lg"
                                                >
                                                    <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                                                    {error}
                                                </motion.div>
                                            )}

                                            <form onSubmit={handleLogin} className="space-y-6">
                                                <div className="space-y-2">
                                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Personnel ID / Email</label>
                                                    <div className="relative group/input">
                                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within/input:text-orange-500 transition-colors">
                                                            <User size={18} />
                                                        </div>
                                                        <input
                                                            type="text"
                                                            value={email}
                                                            onChange={(e) => setEmail(e.target.value)}
                                                            className="w-full bg-slate-100/50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 text-sm rounded-2xl focus:outline-none focus:border-orange-500/50 focus:bg-white/5 block pl-12 p-4 transition-all shadow-inner"
                                                            placeholder="ID-000000"
                                                            required
                                                        />
                                                    </div>
                                                </div>

                                                <div className="space-y-2">
                                                    <div className="flex justify-between items-center px-1">
                                                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">Access Key</label>
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
                                                            type={showPassword ? "text" : "password"}
                                                            value={password}
                                                            onChange={(e) => setPassword(e.target.value)}
                                                            className="w-full bg-slate-100/50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 text-sm rounded-2xl focus:outline-none focus:border-orange-500/50 focus:bg-white/5 block pl-12 pr-12 p-4 transition-all shadow-inner"
                                                            placeholder="••••••••"
                                                            required
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowPassword(!showPassword)}
                                                            className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-orange-500 transition-colors"
                                                        >
                                                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                                        </button>
                                                    </div>
                                                </div>

                                                <button
                                                    type="submit"
                                                    disabled={loading}
                                                    className="w-full bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white p-4 rounded-2xl font-black text-sm uppercase tracking-[0.2em] transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-xl shadow-orange-600/20 flex items-center justify-center gap-3 group disabled:opacity-50"
                                                >
                                                    {loading ? (
                                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                    ) : (
                                                        <>
                                                            Initialize Session
                                                            <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
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
                                                    <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                                                        <CheckCircle className="text-emerald-500" size={40} />
                                                    </div>
                                                    <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-4 tracking-tight">Recovery Sent</h2>
                                                    <p className="text-slate-600 dark:text-slate-400 text-sm font-medium mb-10">
                                                        An administrative recovery protocol has been initiated for <span className="text-orange-600 font-bold">{recoveryEmail}</span>. Please check your official inbox.
                                                    </p>
                                                    <button 
                                                        onClick={() => { setView('login'); setRecoverySent(false); }}
                                                        className="flex items-center gap-2 mx-auto text-orange-600 font-bold uppercase tracking-widest text-[10px] hover:text-orange-500 transition-colors"
                                                    >
                                                        <ArrowLeft size={16} /> Return to Login
                                                    </button>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="mb-10 text-center">
                                                        <div className="w-20 h-20 bg-slate-100 dark:bg-white/5 rounded-[1.5rem] flex items-center justify-center mx-auto mb-6 border border-slate-200 dark:border-white/10 shadow-inner">
                                                            <Mail className="text-orange-600 dark:text-orange-500" size={40} />
                                                        </div>
                                                        <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">Recover Key</h2>
                                                        <p className="text-slate-600 dark:text-slate-500 text-sm font-medium">Enter your ID to initiate recovery protocol</p>
                                                    </div>

                                                    <form onSubmit={handleRecovery} className="space-y-6">
                                                        <div className="space-y-2">
                                                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Personnel Email</label>
                                                            <div className="relative group/input">
                                                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within/input:text-orange-500 transition-colors">
                                                                    <Mail size={18} />
                                                                </div>
                                                                <input
                                                                    type="email"
                                                                    value={recoveryEmail}
                                                                    onChange={(e) => setRecoveryEmail(e.target.value)}
                                                                    className="w-full bg-slate-100/50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 text-sm rounded-2xl focus:outline-none focus:border-orange-500/50 focus:bg-white/5 block pl-12 p-4 transition-all shadow-inner"
                                                                    placeholder="official@pulso.system"
                                                                    required
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
                                                                    Send Recovery Link
                                                                    <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                                                </>
                                                            )}
                                                        </button>

                                                        <button 
                                                            type="button"
                                                            onClick={() => setView('login')}
                                                            className="flex items-center gap-2 mx-auto text-slate-500 font-bold uppercase tracking-widest text-[10px] hover:text-slate-900 dark:hover:text-white transition-colors"
                                                        >
                                                            Cancel Protocol
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

            {/* Bottom Marquee / Info Bar */}
            <div className="absolute bottom-0 left-0 w-full bg-white/60 dark:bg-[#020617]/70 backdrop-blur-md border-t border-slate-200 dark:border-white/5 py-4 px-8 flex flex-col md:flex-row justify-between items-center gap-4 z-50 transition-colors">
                <div className="flex items-center gap-6 overflow-hidden max-w-4xl">
                    <span className="text-[10px] font-black text-orange-600 dark:text-orange-500 uppercase tracking-[0.2em] whitespace-nowrap">Notice:</span>
                    <div className="text-[10px] font-bold text-slate-500 dark:text-slate-600 uppercase tracking-[0.3em] whitespace-nowrap animate-marquee">
                        ALL SYSTEM ACTIVITIES ARE LOGGED AND MONITORED UNDER PHILIPPINE RA 10175 PROTOCOLS • UNAUTHORIZED ACCESS IS STRICTLY PROHIBITED • GOVERNMENT OF THE PHILIPPINES PROPRIETARY SYSTEM • INTERNAL USE ONLY
                    </div>
                </div>
                <div className="flex items-center gap-6 text-[10px] font-black text-slate-400 dark:text-slate-500 tracking-[0.2em]">
                    <span>CALOOCAN NORTH DISTRICT • PHILIPPINES</span>
                    <div className="h-3 w-[1px] bg-slate-200 dark:bg-white/10" />
                    <span className="text-orange-600/50 dark:text-orange-500/50">v4.2.1-E</span>
                </div>
            </div>

            {/* ───────────────────────────────────────────────────────────────────────────── */}
            {/* PORTAL MODALS (Directives / Resources) */}
            {/* ───────────────────────────────────────────────────────────────────────────── */}
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
                            className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden shadow-orange-500/10"
                        >
                            {/* Modal Header */}
                            <div className="px-10 py-8 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/20">
                                        {activeModal === 'directives' ? <FileCheck className="text-white" size={24} /> : <BookOpen className="text-white" size={24} />}
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight capitalize">{activeModal}</h3>
                                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Engineering Official Repository</p>
                                    </div>
                                </div>
                                <button onClick={() => setActiveModal(null)} className="p-3 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors">
                                    <ChevronRight className="rotate-90 md:rotate-0" />
                                </button>
                            </div>

                            {/* Modal Content */}
                            <div className="p-10 max-h-[60vh] overflow-y-auto custom-scrollbar">
                                {activeModal === 'directives' ? (
                                    <div className="space-y-4">
                                        {DIRECTIVES.map(dir => (
                                            <div key={dir.id} className="group p-6 rounded-2xl border border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02] hover:bg-orange-500/5 hover:border-orange-500/30 transition-all flex items-center justify-between">
                                                <div className="flex items-center gap-6">
                                                    <div className="font-mono text-[10px] font-black p-2 bg-slate-900 text-white rounded cursor-default shrink-0">{dir.id}</div>
                                                    <div>
                                                        <h4 className="font-bold text-slate-900 dark:text-white group-hover:text-orange-600 transition-colors">{dir.title}</h4>
                                                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">{dir.author} • {dir.date}</p>
                                                    </div>
                                                </div>
                                                <button className="flex items-center gap-2 text-[10px] font-black text-orange-600 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                                                    View PDF <ExternalLink size={14} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {RESOURCES.map((res, i) => (
                                            <div key={i} className="group p-6 rounded-2xl border border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02] hover:bg-blue-500/5 hover:border-blue-500/30 transition-all">
                                                <div className="flex items-center gap-4 mb-4">
                                                    <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-500">
                                                        <res.icon size={20} />
                                                    </div>
                                                    <div className="text-[10px] font-black text-blue-500 uppercase tracking-widest">{res.type}</div>
                                                </div>
                                                <h4 className="font-bold text-slate-900 dark:text-white leading-tight mb-4 group-hover:text-blue-600 transition-colors">{res.title}</h4>
                                                <div className="flex items-center justify-between mt-auto">
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{res.size}</span>
                                                    <button className="p-2 bg-slate-100 dark:bg-white/5 rounded-lg text-slate-500 hover:text-blue-600 transition-colors">
                                                        <ExternalLink size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Modal Footer */}
                            <div className="p-8 bg-slate-50 dark:bg-white/5 border-t border-slate-200 dark:border-white/10 text-center">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
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
