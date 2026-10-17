import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    ShieldAlert, Lock, ShieldCheck, ArrowLeft, Loader2, 
    CheckCircle2, AlertCircle, Activity, Shield, KeyRound,
    Eye, EyeOff, Check
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { API_BASE_URL } from '../utils/apiBase';

export default function ResetPassword() {
    const { theme } = useTheme();
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const navigate = useNavigate();

    const [verifying, setVerifying] = useState(true);
    const [emailHint, setEmailHint] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    // Password Validation States
    const validations = {
        minChar: password.length >= 8,
        hasUpper: /[A-Z]/.test(password),
        hasNumber: /[0-9]/.test(password),
        hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    };

    const isPasswordValid = Object.values(validations).every(v => v);

    useEffect(() => {
        const validateToken = async () => {
            if (!token) {
                setError('No security token provided.');
                setVerifying(false);
                return;
            }
            try {
                const response = await fetch(`${API_BASE_URL}/api/auth/verify-token/${token}`);
                if (response.ok) {
                    const data = await response.json();
                    setEmailHint(data.email_hint);
                    setVerifying(false);
                } else {
                    setError('Identity token spent or invalid.');
                    setVerifying(false);
                }
            } catch (err) {
                setError('System connectivity error.');
                setVerifying(false);
            }
        };
        validateToken();
    }, [token]);

    const handleReset = async (e) => {
        e.preventDefault();
        if (!isPasswordValid) return;
        if (password !== confirmPassword) {
            setError('Handshake failed: Keys do not match.');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, new_password: password })
            });

            if (response.ok) {
                setSuccess(true);
                setTimeout(() => navigate('/login'), 3000);
            } else {
                const data = await response.json();
                setError(data.detail || 'Reset failed. Access denied.');
            }
        } catch (err) {
            setError('Global Network Error.');
        } finally {
            setLoading(false);
        }
    };

    const ValidationItem = ({ fulfilled, text }) => (
        <div className={`flex items-center gap-2 text-[11px] font-bold transition-colors ${fulfilled ? 'text-green-500' : 'text-slate-400 dark:text-slate-500'}`}>
            {fulfilled ? <Check size={12} className="stroke-[3px]" /> : <div className="w-3 h-3 rounded-full border border-slate-300 dark:border-slate-700" />}
            {text}
        </div>
    );

    return (
        <div className={`relative min-h-screen w-full overflow-hidden font-inter transition-colors duration-500 ${theme === 'dark' ? 'bg-[#0f172a] text-white' : 'bg-slate-50 text-slate-900'}`}>
            
            {/* CLEAN CSS BACKGROUND (Subtle Grid & Gradient) */}
            <div className="absolute inset-0 z-0">
                <div className={`absolute inset-0 opacity-[0.4] dark:opacity-[0.2] h-full w-full [background-image:linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] [background-size:24px_24px]`} />
                <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-orange-500/10 to-transparent pointer-events-none" />
                <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-orange-500/5 to-transparent pointer-events-none" />
            </div>

            {/* Tactical Content Overlay */}
            <div className="relative z-10 min-h-screen flex items-center justify-center p-6 sm:p-12">
                <div className="max-w-4xl w-full">
                    
                    <AnimatePresence mode="wait">
                        {verifying ? (
                            <motion.div 
                                key="verifying"
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className="flex flex-col items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-16 shadow-2xl text-center space-y-6 mx-auto max-w-md"
                            >
                                <Loader2 className="animate-spin text-orange-500" size={32} />
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-500">Security Clearance</p>
                                    <p className="text-slate-500 dark:text-slate-400 text-sm font-bold">Verifying identity token...</p>
                                </div>
                            </motion.div>
                        ) : error && !success ? (
                            <motion.div 
                                key="error"
                                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-14 lg:p-20 shadow-2xl flex flex-col items-center text-center space-y-8 mx-auto max-w-md"
                            >
                                <div className="w-20 h-20 bg-red-500/10 rounded-3xl flex items-center justify-center text-red-500 border border-red-500/20">
                                    <ShieldAlert size={40} />
                                </div>
                                <div className="space-y-3">
                                    <h2 className="text-3xl font-black tracking-tight leading-none text-red-500">Access Restricted</h2>
                                    <p className="text-slate-500 dark:text-slate-400 text-sm font-bold leading-relaxed">{error}</p>
                                </div>
                                <button onClick={() => navigate('/login')} className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl active:scale-95">Return to Login</button>
                            </motion.div>
                        ) : success ? (
                            <motion.div 
                                key="success"
                                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-14 lg:p-20 shadow-2xl flex flex-col items-center text-center space-y-8 mx-auto max-w-md"
                            >
                                <div className="w-20 h-20 bg-green-500/10 rounded-3xl flex items-center justify-center text-green-500 border border-green-500/20">
                                    <CheckCircle2 size={40} className="animate-bounce" />
                                </div>
                                <div className="space-y-3">
                                    <h2 className="text-3xl font-black tracking-tight leading-none text-green-600 dark:text-green-500">Protocol Complete</h2>
                                    <p className="text-slate-500 dark:text-slate-400 text-sm font-bold">Credential synchronization successful.</p>
                                </div>
                                <div className="w-full bg-slate-100 dark:bg-white/5 h-1.5 rounded-full overflow-hidden">
                                    <motion.div initial={{ width: 0 }} animate={{ width: "100%" }} transition={{ duration: 3 }} className="h-full bg-green-500" />
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div 
                                key="form"
                                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                                className="grid lg:grid-cols-[1fr,340px] gap-8"
                            >
                                {/* Left Side: Password Form */}
                                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[3rem] p-10 lg:p-14 shadow-2xl relative overflow-hidden">
                                    {/* Subtle Overlay Pattern */}
                                    <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.02] pointer-events-none [background-image:radial-gradient(#808080_1px,transparent_1px)] [background-size:20px_20px]" />

                                    <div className="relative z-10">
                                        <div className="mb-10 flex items-center justify-between">
                                            <div className="flex flex-col">
                                                <h1 className="text-3xl lg:text-4xl font-black tracking-tight leading-none">Access Recovery</h1>
                                                <div className="flex items-center gap-2 text-orange-600 dark:text-orange-500 mt-1">
                                                    <Activity size={14} />
                                                    <span className="text-[10px] font-black uppercase tracking-widest">Update Authorized Officials Only</span>
                                                </div>
                                            </div>
                                            <div className="px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full text-[9px] font-black text-green-600 dark:text-green-500 uppercase tracking-widest">Token Verified</div>
                                        </div>

                                        {error && (
                                            <div className="mb-8 p-4 bg-red-500/5 border border-red-500/10 rounded-2xl text-[11px] font-bold text-red-500 flex items-center gap-3">
                                                <AlertCircle size={14} /> {error}
                                            </div>
                                        )}

                                        <form onSubmit={handleReset} className="space-y-8">
                                            <div className="space-y-2 relative">
                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">New Access Key</label>
                                                <div className="relative group/input">
                                                    <KeyRound size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within/input:text-orange-500 transition-colors" />
                                                    <input
                                                        type={showPassword ? "text" : "password"}
                                                        value={password}
                                                        onChange={(e) => setPassword(e.target.value)}
                                                        className="w-full bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-600 dark:placeholder:text-slate-300 placeholder:opacity-100 text-sm rounded-2xl focus:outline-none focus:border-orange-500/50 focus:bg-white dark:focus:bg-slate-950 block pl-12 pr-12 p-5 transition-all shadow-sm"
                                                        placeholder="••••••••"
                                                        required
                                                    />
                                                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-orange-500 transition-colors">
                                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Confirm Access Key</label>
                                                <div className="relative group/input">
                                                    <ShieldCheck size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within/input:text-orange-500 transition-colors" />
                                                    <input
                                                        type={showPassword ? "text" : "password"}
                                                        value={confirmPassword}
                                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                                        className="w-full bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-600 dark:placeholder:text-slate-300 placeholder:opacity-100 text-sm rounded-2xl focus:outline-none focus:border-orange-500/50 focus:bg-white dark:focus:bg-slate-950 block pl-12 p-5 transition-all shadow-sm"
                                                        placeholder="••••••••"
                                                        required
                                                    />
                                                </div>
                                            </div>

                                            <div className="pt-4">
                                                <button
                                                    type="submit"
                                                    disabled={loading || !isPasswordValid}
                                                    className="w-full py-5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-orange-600 dark:hover:bg-orange-500 hover:text-white dark:hover:text-white disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-600 rounded-2xl font-black text-xs uppercase tracking-[0.3em] transition-all transform hover:scale-[1.01] active:scale-[0.99] shadow-xl flex items-center justify-center gap-3"
                                                >
                                                    {loading ? <Loader2 className="animate-spin" size={18} /> : 'Confirm Synchronization'}
                                                </button>
                                            </div>

                                            <button type="button" onClick={() => navigate('/login')} className="w-full font-black text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 uppercase tracking-[0.2em] transition-colors">Abort Procedure</button>
                                        </form>
                                    </div>
                                </div>

                                {/* Right Side: Guidelines */}
                                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[3rem] p-10 lg:p-12 shadow-2xl flex flex-col items-center relative overflow-hidden">
                                     {/* Subtle Overlay Pattern */}
                                    <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.02] pointer-events-none [background-image:radial-gradient(#808080_1px,transparent_1px)] [background-size:20px_20px]" />

                                    <div className="w-12 h-12 rounded-2xl bg-orange-500/10 flex items-center justify-center text-orange-600 dark:text-orange-500 mb-6 font-bold text-lg">!</div>
                                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white mb-8">Security Guidelines</h3>
                                    
                                    <div className="w-full space-y-5">
                                        <ValidationItem fulfilled={validations.minChar} text="Min 8 Alpha-Numeric Keys" />
                                        <ValidationItem fulfilled={validations.hasUpper} text="Capitalized Identifier (A-Z)" />
                                        <ValidationItem fulfilled={validations.hasNumber} text="System Index Value (0-9)" />
                                        <ValidationItem fulfilled={validations.hasSpecial} text="Security Symbol (@, #, $)" />
                                    </div>

                                    <div className="mt-auto pt-10">
                                        <div className="p-5 bg-slate-50 dark:bg-slate-950/50 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
                                            <div className="flex items-center justify-center gap-2 mb-3">
                                                <Shield size={14} className="text-indigo-500" />
                                                <span className="text-[10px] font-black uppercase text-indigo-500">Registry Note</span>
                                            </div>
                                            <p className="text-[10px] leading-relaxed text-slate-500 dark:text-slate-400 font-bold uppercase tracking-tighter">
                                                Identity verified as <br /> <span className="text-slate-900 dark:text-white tracking-widest">{emailHint}</span>
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}
