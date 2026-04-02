import React, { useState, useEffect } from 'react';
import ReCAPTCHA from 'react-google-recaptcha';
import Spline from '@splinetool/react-spline';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    User, Shield, Eye, EyeOff, ChevronRight,
    Activity, Sun, Moon, Monitor, Mail, ArrowLeft,
    CheckCircle, Home, Lock
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
    const [captchaValue, setCaptchaValue] = useState(null);
    const [showCaptcha, setShowCaptcha]   = useState(false);
    const [view, setView]                 = useState('login'); // 'login' | 'forgot'
    const [recoverySent, setRecoverySent] = useState(false);
    const [recoveryEmail, setRecoveryEmail] = useState('');
    const [recoveryStep, setRecoveryStep] = useState(1); // 1: Email, 2: Code/New Password
    const [recoveryOtp, setRecoveryOtp] = useState(['', '', '', '', '', '']);
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
    const [recoveryRefId, setRecoveryRefId] = useState('');
    const [resendTimer, setResendTimer]     = useState(0);
    const [canResend, setCanResend]         = useState(false);
    const [verificationEmail, setVerificationEmail] = useState('');
    const [verificationOtp, setVerificationOtp] = useState(['', '', '', '', '', '']);
    const [verificationSuccess, setVerificationSuccess] = useState(false);
    const otpRefs = React.useRef([]);
    const recaptchaRef = React.useRef(null);

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

    useEffect(() => {
        let interval = null;
        if (resendTimer > 0) {
            interval = setInterval(() => {
                setResendTimer((prev) => prev - 1);
            }, 1000);
        } else if (resendTimer === 0) {
            setCanResend(true);
            clearInterval(interval);
        }
        return () => clearInterval(interval);
    }, [resendTimer]);

    /* ── Auth handlers ──────────────────────────────────────────────────── */
    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        if (!captchaValue) {
            setError('Please complete the security puzzle to proceed.');
            setLoading(false);
            return;
        }

        try {
            const formData = new URLSearchParams();
            formData.append('username', email);
            formData.append('password', password);
            formData.append('captcha_token', captchaValue);

            const response = await fetch('http://localhost:33159/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: formData,
            });

            const data = await response.json();

            if (response.ok) {
                // If the backend still asks for captcha (edge case), we show error
                if (data.require_captcha) {
                    setError('Security challenge required. Please try again.');
                    setLoading(false);
                    return;
                }

                if (data.user.role !== 'resident') {
                    setError('This portal is for residents only. Authorized personnel please use the Government Gateway.');
                    setLoading(false);
                    return;
                }

                localStorage.setItem('pulso_token', data.access_token);
                localStorage.setItem('pulso_user', JSON.stringify(data.user));
                navigate('/dashboard');
            } else {
                if (response.status === 403 && data.detail.includes("Account not verified")) {
                    setVerificationEmail(email);
                    setVerificationOtp(['', '', '', '', '', '']);
                    setView('verify');
                    setResendTimer(60);
                    setCanResend(false);
                    return;
                }
                const msg = typeof data.detail === 'object' 
                    ? (Array.isArray(data.detail) ? data.detail[0].msg : JSON.stringify(data.detail))
                    : data.detail;
                setError(msg || 'Authentication failed');
            }
        } catch {
            setError('Network error. Is the backend running?');
        } finally {
            setLoading(false);
        }
    };

    const handleRecovery = async (e) => {
        if (e) e.preventDefault();
        setLoading(true);
        setError('');
        setRecoveryOtp(['', '', '', '', '', '']); // Clear previous inputs for security synchronization
        try {
            const response = await fetch('http://localhost:33159/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: recoveryEmail }),
            });
            const data = await response.json();
            if (response.ok) {
                setRecoveryRefId(data.reference_id);
                setRecoveryStep(2);
                setResendTimer(60);
                setCanResend(false);
            } else {
                const msg = typeof data.detail === 'object' 
                    ? (Array.isArray(data.detail) ? data.detail[0].msg : JSON.stringify(data.detail))
                    : data.detail;
                setError(msg || 'Recovery request failed.');
            }
        } catch {
            setError('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyCode = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const response = await fetch('http://localhost:33159/api/auth/verify-reset-code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: recoveryEmail,
                    code: recoveryOtp.join('')
                }),
            });
            const data = await response.json();
            if (response.ok) {
                setRecoveryStep(3);
            } else {
                const msg = typeof data.detail === 'object' 
                    ? (Array.isArray(data.detail) ? data.detail[0].msg : JSON.stringify(data.detail))
                    : data.detail;
                setError(msg || 'Identity verification failed: Invalid code.');
            }
        } catch {
            setError('System error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        if (newPassword !== confirmNewPassword) {
            setError('Error: Passwords do not match.');
            return;
        }

        setLoading(true);
        setError('');
        try {
            const response = await fetch('http://localhost:33159/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: recoveryEmail,
                    code: recoveryOtp.join(''),
                    new_password: newPassword
                }),
            });
            const data = await response.json();
            if (response.ok) {
                setRecoverySent(true);
            } else {
                const msg = typeof data.detail === 'object' 
                    ? (Array.isArray(data.detail) ? data.detail[0].msg : JSON.stringify(data.detail))
                    : data.detail;
                setError(msg || 'Identity verification failed.');
            }
        } catch (err) {
            setError('System error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyRegistration = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const response = await fetch('http://localhost:33159/api/auth/verify-registration', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: verificationEmail,
                    code: verificationOtp.join('')
                }),
            });
            const data = await response.json();
            if (response.ok) {
                setVerificationSuccess(true);
                setError('');
            } else {
                const msg = typeof data.detail === 'object' 
                    ? (Array.isArray(data.detail) ? data.detail[0].msg : JSON.stringify(data.detail))
                    : data.detail;
                setError(msg || 'Verification failed: Invalid code.');
            }
        } catch {
            setError('System error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleResendRegistrationCode = async () => {
        if (!canResend) return;
        setLoading(true);
        setError('');
        try {
            const response = await fetch('http://localhost:33159/api/auth/resend-code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: verificationEmail, code: "" }), // code is optional/not-used here in resend
            });
            if (response.ok) {
                setResendTimer(60);
                setCanResend(false);
            } else {
                setError('Failed to resend code.');
            }
        } catch {
            setError('Network error.');
        } finally {
            setLoading(false);
        }
    };

    const handleOtpChange = (index, value, isVerification = false) => {
        if (!/^\d*$/.test(value)) return;
        const currentOtp = isVerification ? verificationOtp : recoveryOtp;
        const setOtp = isVerification ? setVerificationOtp : setRecoveryOtp;
        
        const newOtp = [...currentOtp];
        newOtp[index] = value.slice(-1);
        setOtp(newOtp);
        if (value && index < 5) otpRefs.current[index + 1].focus();
    };

    const handleOtpKeyDown = (index, e, isVerification = false) => {
        const currentOtp = isVerification ? verificationOtp : recoveryOtp;
        if (e.key === 'Backspace' && !currentOtp[index] && index > 0) otpRefs.current[index - 1].focus();
    };

    const handleOtpPaste = (e, isVerification = false) => {
        e.preventDefault();
        const setOtp = isVerification ? setVerificationOtp : setRecoveryOtp;
        const data = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        if (!data) return;
        const newOtp = ['', '', '', '', '', ''];
        data.split('').forEach((char, i) => { if (i < 6) newOtp[i] = char; });
        setOtp(newOtp);
        const nextIndex = Math.min(data.length, 5);
        if (otpRefs.current[nextIndex]) otpRefs.current[nextIndex].focus();
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

            {/* ── Navigation Header ────── */}
            <nav className="absolute top-0 left-0 w-full p-8 flex justify-between items-center z-50">
                <div className="flex items-center gap-3">
                    <Branding size="h-10" showText={false} />
                    <div>
                        <span className="text-2xl font-black tracking-tighter text-slate-900 dark:text-white">PULSO</span>
                        <span className="ml-2 px-2 py-0.5 bg-slate-900/5 dark:bg-white/10 backdrop-blur-md rounded text-[10px] font-bold tracking-widest text-orange-600 dark:text-orange-400 uppercase border border-slate-900/5 dark:border-white/10">
                            Resident Portal
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <div className="hidden md:flex items-center gap-6 text-sm font-medium pr-6 border-r border-slate-200 dark:border-white/10">
                        <button onClick={() => navigate('/')} className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 hover:text-orange-600 transition-colors font-semibold">
                            <Home size={15} /> Home
                        </button>
                    </div>

                    <div className="flex bg-white/50 dark:bg-white/5 backdrop-blur-md rounded-full p-1 border border-slate-200 dark:border-white/10 shadow-sm">
                        <button onClick={() => changeTheme('light')} className={`p-2 rounded-full transition-all ${theme === 'light' ? 'bg-white dark:bg-slate-700 shadow-md text-orange-500 scale-110' : 'text-slate-400'}`}><Sun size={14} /></button>
                        <button onClick={() => changeTheme('system')} className={`p-2 rounded-full transition-all ${theme === 'system' ? 'bg-white dark:bg-slate-700 shadow-md text-orange-500 scale-110' : 'text-slate-400'}`}><Monitor size={14} /></button>
                        <button onClick={() => changeTheme('dark')} className={`p-2 rounded-full transition-all ${theme === 'dark' ? 'bg-white dark:bg-slate-700 shadow-md text-orange-500 scale-110' : 'text-slate-400'}`}><Moon size={14} /></button>
                    </div>
                </div>
            </nav>

            {/* ── Main Content Grid ─────── */}
            <main className="relative z-10 grid lg:grid-cols-2 min-h-screen items-center px-12 lg:px-32">
                <div className="pt-20 lg:pt-0 max-w-xl">
                    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                        <div className="flex items-center gap-2 mb-6 text-orange-600">
                            <Activity size={18} />
                            <span className="text-sm font-bold tracking-[0.3em] uppercase">Citizen Access Portal</span>
                        </div>
                        <h1 className="text-5xl lg:text-8xl font-black text-slate-900 dark:text-white leading-[0.9] mb-8 tracking-tighter">
                            THE PULSE OF <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-l from-orange-500 to-orange-600">
                                COMMUNITY
                            </span>
                        </h1>
                        <p className="text-base lg:text-xl text-slate-600 dark:text-slate-400 leading-relaxed mb-10 max-w-md font-medium">
                            Access your resident dashboard to track local hazard reports and interact with community engineering teams.
                        </p>
                    </motion.div>
                </div>

                <div className="flex justify-center lg:justify-end py-20 lg:py-0">
                    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md">
                        <div className="relative group">
                            <div className="absolute -inset-1 bg-gradient-to-r from-orange-600/20 to-blue-600/20 rounded-[2.5rem] blur-2xl opacity-30" />
                            <div className="relative bg-white/20 dark:bg-slate-900/40 backdrop-blur-md border border-white/30 dark:border-white/5 rounded-[2.5rem] p-8 shadow-2xl overflow-hidden min-h-[500px] flex flex-col justify-center">
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
                                                    Login
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

                                                {/* ReCAPTCHA Checkbox stage */}
                                                <AnimatePresence>
                                                    {email && password && (
                                                        <motion.div 
                                                            initial={{ opacity: 0, height: 0 }}
                                                            animate={{ opacity: 1, height: 'auto' }}
                                                            exit={{ opacity: 0, height: 0 }}
                                                            className="flex justify-center w-full mb-4 overflow-hidden"
                                                        >
                                                            <div className="relative z-10 scale-95 origin-center py-2">
                                                                <ReCAPTCHA
                                                                    ref={recaptchaRef}
                                                                    sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY}
                                                                    onChange={(val) => setCaptchaValue(val)}
                                                                    theme={theme === 'dark' ? 'dark' : 'light'}
                                                                />
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>

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
                                    ) : view === 'verify' ? (
                                        /* ── Account Verification Flow ──────────────── */
                                        <motion.div
                                            key="verify-form"
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.95 }}
                                            transition={{ duration: 0.3 }}
                                        >
                                            {verificationSuccess ? (
                                                <div className="text-center py-6">
                                                    <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-200 dark:border-emerald-500/20 shadow-lg">
                                                        <CheckCircle className="text-emerald-500" size={40} />
                                                    </div>
                                                    <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-4 tracking-tight">
                                                        Account Verified
                                                    </h2>
                                                    <p className="text-slate-600 dark:text-slate-400 text-sm font-medium mb-10 leading-relaxed">
                                                        Congratulations! Your official registration has been activated. 
                                                        You may now proceed to sign in to your dashboard.
                                                    </p>
                                                    <button
                                                        onClick={() => { setView('login'); setVerificationSuccess(false); setVerificationOtp(['', '', '', '', '', '']); }}
                                                        className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white p-4 rounded-2xl font-black text-sm uppercase tracking-[0.2em] transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-xl shadow-emerald-600/20 flex items-center justify-center gap-3 group"
                                                    >
                                                        Continue to Sign In
                                                        <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="mb-10 text-center">
                                                        <div className="w-20 h-20 bg-orange-100 dark:bg-white/5 rounded-[1.5rem] flex items-center justify-center mx-auto mb-6 border border-orange-200 dark:border-white/10 shadow-inner">
                                                            <Shield className="text-orange-600 dark:text-orange-500" size={40} />
                                                        </div>
                                                        <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">
                                                            Verify Account
                                                        </h2>
                                                        <p className="text-slate-600 dark:text-slate-500 text-sm font-medium leading-relaxed">
                                                            Enter the 6-digit verification code sent to<br/>
                                                            <span className="text-orange-600 font-bold underline">{verificationEmail}</span>
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

                                                    <form onSubmit={handleVerifyRegistration} className="space-y-8">
                                                        <div className="flex justify-center gap-3">
                                                            {verificationOtp.map((digit, index) => (
                                                                <input
                                                                    key={index}
                                                                    ref={(el) => (otpRefs.current[index] = el)}
                                                                    type="text"
                                                                    maxLength="1"
                                                                    value={digit}
                                                                    onChange={(e) => handleOtpChange(index, e.target.value, true)}
                                                                    onKeyDown={(e) => handleOtpKeyDown(index, e, true)}
                                                                    onPaste={(e) => handleOtpPaste(e, true)}
                                                                    className="w-11 h-14 text-center text-2xl font-black bg-slate-100/50 dark:bg-white/[0.03] border-2 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-2xl focus:border-orange-500 focus:bg-white/5 outline-none transition-all shadow-inner"
                                                                />
                                                            ))}
                                                        </div>

                                                        <button
                                                            type="submit"
                                                            disabled={loading || verificationOtp.join('').length < 6}
                                                            className="w-full bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white p-4 rounded-2xl font-black text-sm uppercase tracking-[0.2em] transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-xl shadow-orange-600/20 flex items-center justify-center gap-3 group disabled:opacity-50"
                                                        >
                                                            {loading ? (
                                                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                            ) : (
                                                                <>
                                                                    Verify & Activate
                                                                    <CheckCircle size={18} className="group-hover:scale-110 transition-transform" />
                                                                </>
                                                            )}
                                                        </button>

                                                        <div className="text-center">
                                                            {resendTimer > 0 ? (
                                                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-slate-100/50 dark:bg-white/5 py-2 px-4 rounded-full inline-block">
                                                                    Resend code in <span className="text-orange-600">{resendTimer}s</span>
                                                                </p>
                                                            ) : (
                                                                <button 
                                                                    type="button"
                                                                    onClick={handleResendRegistrationCode}
                                                                    disabled={loading || !canResend}
                                                                    className="text-[10px] font-black text-orange-600 hover:text-orange-500 uppercase tracking-[0.2em] transition-colors flex items-center gap-2 mx-auto decoration-2 underline-offset-4 hover:underline"
                                                                >
                                                                    Resend Official Code
                                                                </button>
                                                            )}
                                                        </div>
                                                    </form>

                                                    <button 
                                                        type="button" 
                                                        onClick={() => { setView('login'); setError(''); }} 
                                                        className="flex items-center gap-2 mx-auto text-slate-500 font-bold uppercase tracking-[0.2em] text-[10px] hover:text-slate-900 dark:hover:text-white transition-colors mt-10"
                                                    >
                                                        <ArrowLeft size={16} /> Cancel Verification
                                                    </button>
                                                </>
                                            )}
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
                                                    <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-200 dark:border-emerald-500/20 shadow-lg">
                                                        <CheckCircle className="text-emerald-500" size={40} />
                                                    </div>
                                                    <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-4 tracking-tight">
                                                        Reset Complete
                                                    </h2>
                                                    <p className="text-slate-600 dark:text-slate-400 text-sm font-medium mb-10 leading-relaxed">
                                                        Your password has been successfully updated.<br />
                                                        You may now sign in with your new credentials.
                                                    </p>
                                                    <button
                                                        onClick={() => { setView('login'); setRecoverySent(false); setRecoveryStep(1); }}
                                                        className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-orange-600 dark:hover:bg-orange-500 rounded-2xl p-4 font-black text-xs uppercase tracking-[0.2em] transition-all transform hover:scale-[1.02] shadow-xl flex items-center justify-center gap-3"
                                                    >
                                                        <ArrowLeft size={16} /> Back to Sign In
                                                    </button>
                                                </div>
                                            ) : (
                                                <>
                                                    {recoveryStep === 1 ? (
                                                        <>
                                                            <div className="mb-10 text-center">
                                                                <div className="w-20 h-20 bg-slate-100 dark:bg-white/5 rounded-[1.5rem] flex items-center justify-center mx-auto mb-6 border border-slate-200 dark:border-white/10 shadow-inner">
                                                                    <Shield size={40} className="text-orange-600 dark:text-orange-400" />
                                                                </div>
                                                                <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">
                                                                    Identity Retrieval
                                                                </h2>
                                                                <p className="text-slate-600 dark:text-slate-500 text-sm font-medium">
                                                                    Enter your email for account verification
                                                                </p>
                                                            </div>

                                                            {error && (
                                                                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-600 dark:text-red-400 text-xs font-bold flex items-center gap-3">
                                                                    <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                                                                    {error}
                                                                </motion.div>
                                                            )}

                                                            <form onSubmit={handleRecovery} className="space-y-6">

                                                                <div className="space-y-2">
                                                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Official Email Address</label>
                                                                    <div className="relative group/input">
                                                                        <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-focus-within/input:text-orange-500 transition-colors" />
                                                                        <input type="email" value={recoveryEmail} onChange={(e) => setRecoveryEmail(e.target.value)} className="w-full bg-slate-100/50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 text-sm rounded-2xl focus:outline-none focus:border-orange-500/50 focus:bg-white/5 block pl-12 p-4 transition-all shadow-inner" placeholder="your@email.com" required />
                                                                    </div>
                                                                </div>
                                                                <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white p-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all transform hover:scale-[1.02] flex items-center justify-center gap-3 shadow-xl shadow-orange-600/20">
                                                                    {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>Verify Email <ChevronRight size={18} /></>}
                                                                </button>
                                                            </form>
                                                        </>
                                                    ) : recoveryStep === 2 ? (
                                                        <>
                                                            <div className="mb-8 text-center">
                                                                <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">Verify Identity</h2>
                                                                <p className="text-slate-500 text-xs font-bold leading-relaxed">Enter the 6-digit sync code sent to<br/><span className="text-orange-600 underline">{recoveryEmail}</span></p>
                                                            </div>

                                                            {error && (
                                                                <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-600 dark:text-red-400 text-[10px] font-black flex items-center gap-2">
                                                                    <div className="w-1.5 h-1.5 bg-red-500 rounded-full" /> {error}
                                                                </div>
                                                            )}

                                                            <form onSubmit={handleVerifyCode} className="space-y-6">
                                                                <div className="flex justify-center gap-2 mb-8">
                                                                    {recoveryOtp.map((digit, index) => (
                                                                        <input key={index} ref={(el) => (otpRefs.current[index] = el)} type="text" maxLength="1" value={digit} onChange={(e) => handleOtpChange(index, e.target.value)} onKeyDown={(e) => handleOtpKeyDown(index, e)} onPaste={handleOtpPaste}
                                                                            className="w-10 h-12 text-center text-xl font-black bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-xl focus:border-orange-500 outline-none transition-all" />
                                                                    ))}
                                                                </div>

                                                                <button type="submit" disabled={loading || recoveryOtp.join('').length < 6} className="w-full bg-orange-600 hover:bg-orange-500 text-white p-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-orange-600/20 active:scale-95 transition-all flex items-center justify-center gap-2">
                                                                    {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Verify Code'}
                                                                </button>

                                                                <div className="text-center mt-6 min-h-[32px] flex items-center justify-center">
                                                                    {resendTimer > 0 ? (
                                                                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                                                                            Resend code in <span className="text-orange-600">{resendTimer}s</span>
                                                                        </p>
                                                                    ) : (
                                                                        <button 
                                                                            type="button"
                                                                            onClick={handleRecovery}
                                                                            disabled={loading || !canResend}
                                                                            className="text-[11px] font-black text-orange-600 hover:text-orange-500 uppercase tracking-widest transition-colors flex items-center gap-2 mx-auto disabled:opacity-50"
                                                                        >
                                                                            {loading ? <div className="w-3 h-3 border-2 border-orange-600/30 border-t-orange-600 rounded-full animate-spin" /> : null}
                                                                            {loading ? 'Sending...' : 'Resend Verification Code'}
                                                                        </button>
                                                                    )}
                                                                </div>

                                                            </form>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <div className="mb-8 text-center">
                                                                <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">Security Update</h2>
                                                                <p className="text-slate-500 text-xs font-bold leading-relaxed">Identity verified. Please set your<br/><span className="text-orange-600">secure password</span></p>
                                                            </div>

                                                            {error && (
                                                                <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-600 dark:text-red-400 text-[10px] font-black flex items-center gap-2">
                                                                    <div className="w-1.5 h-1.5 bg-red-500 rounded-full" /> {error}
                                                                </div>
                                                            )}

                                                            <form onSubmit={handleResetPassword} className="space-y-6">
                                                                <div className="space-y-2 relative">
                                                                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">New Password</label>
                                                                    <div className="relative group/input">
                                                                        <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                                                        <input type={showNewPassword ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full bg-slate-100/50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-xs rounded-xl pl-10 pr-10 p-3.5 focus:outline-none focus:border-orange-500" placeholder="••••••••" required />
                                                                        <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"> {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />} </button>
                                                                    </div>

                                                                    {newPassword && (
                                                                        <div className="mt-2 space-y-2 px-1">
                                                                            <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest">
                                                                                <span className="text-slate-400">Security Strength</span>
                                                                                <span className={
                                                                                    newPassword.length < 8 || !/[A-Z]/.test(newPassword) || !/[0-9]/.test(newPassword) || !/[^A-Za-z0-9]/.test(newPassword)
                                                                                        ? (newPassword.length < 8 ? "text-red-500" : "text-orange-500")
                                                                                        : "text-green-500"
                                                                                }>
                                                                                    {newPassword.length < 8 ? "Weak" : (
                                                                                        !/[A-Z]/.test(newPassword) || !/[0-9]/.test(newPassword) || !/[^A-Za-z0-9]/.test(newPassword)
                                                                                            ? "Medium"
                                                                                            : "Strong"
                                                                                    )}
                                                                                </span>
                                                                            </div>
                                                                            <div className="h-1 w-full bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden flex gap-1">
                                                                                <div className={`h-full transition-all duration-500 rounded-full ${newPassword.length >= 8 ? 'bg-orange-500 w-1/4' : 'bg-red-500 w-1/4'}`} />
                                                                                <div className={`h-full transition-all duration-500 rounded-full ${/[A-Z]/.test(newPassword) ? 'bg-orange-500 w-1/4' : 'bg-slate-200 dark:bg-white/5 w-1/4'}`} />
                                                                                <div className={`h-full transition-all duration-500 rounded-full ${/[0-9]/.test(newPassword) ? 'bg-orange-500 w-1/4' : 'bg-slate-200 dark:bg-white/5 w-1/4'}`} />
                                                                                <div className={`h-full transition-all duration-500 rounded-full ${/[^A-Za-z0-9]/.test(newPassword) ? 'bg-green-500 w-1/4' : 'bg-slate-200 dark:bg-white/5 w-1/4'}`} />
                                                                            </div>
                                                                            <div className="flex flex-wrap gap-2 pt-1">
                                                                                <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border transition-colors ${newPassword.length >= 8 ? 'bg-green-500/10 border-green-500/20 text-green-500' : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-400'}`}>8+ CHARS</span>
                                                                                <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border transition-colors ${/[A-Z]/.test(newPassword) ? 'bg-green-500/10 border-green-500/20 text-green-500' : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-400'}`}>CAPITAL A-Z</span>
                                                                                <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border transition-colors ${/[0-9]/.test(newPassword) ? 'bg-green-500/10 border-green-500/20 text-green-500' : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-400'}`}>NUMBER 0-9</span>
                                                                                <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border transition-colors ${/[^A-Za-z0-9]/.test(newPassword) ? 'bg-green-500/10 border-green-500/20 text-green-500' : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-400'}`}>SPECIAL #$!</span>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                
                                                                <div className="space-y-2">
                                                                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Confirm New Password</label>
                                                                    <div className="relative group/input">
                                                                        <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                                                        <input type={showConfirmNewPassword ? "text" : "password"} value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} className="w-full bg-slate-100/50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-xs rounded-xl pl-10 pr-10 p-3.5 focus:outline-none focus:border-orange-500" placeholder="••••••••" required />
                                                                        <button type="button" onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"> {showConfirmNewPassword ? <EyeOff size={16} /> : <Eye size={16} />} </button>
                                                                    </div>
                                                                </div>

                                                                <button type="submit" disabled={loading || newPassword.length < 6} className="w-full bg-orange-600 hover:bg-orange-500 text-white p-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-orange-600/20 active:scale-95 transition-all flex items-center justify-center gap-2">
                                                                    {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Finalize Update'}
                                                                </button>
                                                            </form>
                                                        </>
                                                    )}

                                                    <button type="button" onClick={() => { setView('login'); setError(''); setRecoveryStep(1); }} className="flex items-center gap-2 mx-auto text-slate-500 font-bold uppercase tracking-widest text-[10px] hover:text-slate-900 dark:hover:text-white transition-colors mt-8">
                                                        <ArrowLeft size={14} /> Back to Sign In
                                                    </button>
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

            <div className="absolute bottom-0 left-0 w-full bg-white/60 dark:bg-[#020617]/70 backdrop-blur-md border-t border-slate-200 dark:border-white/5 py-4 px-8 flex flex-col md:flex-row justify-between items-center gap-4 z-50">
                <div className="flex items-center gap-6">
                    <span className="text-[10px] font-black text-orange-600 uppercase tracking-[0.2em]">Notice:</span>
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em]">RESIDENTS ONLY • CITY OF CALOOCAN</div>
                </div>
                <div className="text-[10px] font-black text-slate-400 tracking-[0.2em]">v4.2.1</div>
            </div>
        </div>
    );

}
