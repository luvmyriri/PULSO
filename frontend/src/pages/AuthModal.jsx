import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, User, MapPin, Phone, Lock, CheckCircle2, ShieldCheck } from '../icons';
import Branding from '../components/Branding';

export default function AuthModal({ view, onNavigate }) {
    // 'login' | 'register-1' | 'register-2'
    const [step, setStep] = useState(view);

    const modalVariants = {
        hidden: { opacity: 0, scale: 0.95, y: 20 },
        visible: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', damping: 25, stiffness: 300 } },
        exit: { opacity: 0, scale: 0.95, y: -20, transition: { duration: 0.2 } }
    };

    const formVariants = {
        hidden: { opacity: 0, x: 20 },
        visible: { opacity: 1, x: 0, transition: { duration: 0.3 } },
        exit: { opacity: 0, x: -20, transition: { duration: 0.2 } }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
        >
            <motion.div
                variants={modalVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="w-full max-w-md bg-white/90 backdrop-blur-xl border border-white/50 shadow-2xl rounded-3xl overflow-hidden relative"
            >
                {/* Header Ribbon */}
                <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center justify-between">
                    <button onClick={() => onNavigate('landing')} className="text-slate-400 hover:text-slate-800 transition-colors p-1.5 -ml-1.5 rounded-full hover:bg-slate-200/50">
                        <ArrowLeft size={20} />
                    </button>
                    <div className="flex items-center gap-2 text-orange-600 font-extrabold text-lg tracking-tight">
                        <Branding size="h-6" showText={false} /> PULSO
                    </div>
                    <div className="w-8"></div> {/* Spacer for centering */}
                </div>

                <div className="p-8">
                    <AnimatePresence mode="wait">

                        {/* ---------------- LOGIN VIEW ---------------- */}
                        {step === 'login' && (
                            <motion.div key="login-form" variants={formVariants} initial="hidden" animate="visible" exit="exit" className="flex flex-col">
                                <div className="mb-6 relative">
                                    <h2 className="text-2xl font-display font-bold text-slate-900 tracking-tight">Resident Login</h2>
                                    <p className="text-sm text-slate-500 mt-1">Access your local community dashboard.</p>
                                    <div className="absolute top-0 right-0 bg-green-100 text-green-700 px-2.5 py-1 rounded-lg font-bold text-[10px] flex items-center gap-1 uppercase tracking-widest border border-green-200">
                                        <ShieldCheck size={12} /> Secure
                                    </div>
                                </div>

                                <form className="flex flex-col gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 uppercase tracking-widest mb-1.5">Mobile or Email</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400"><User size={16} /></div>
                                            <input type="text" className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 block pl-10 p-3 outline-none transition-all" placeholder="e.g. 0917 123 4567" required />
                                        </div>
                                    </div>

                                    <div>
                                        <div className="flex justify-between items-center mb-1.5">
                                            <label className="block text-xs font-bold text-slate-600 uppercase tracking-widest">Password</label>
                                            <a href="#" className="text-xs font-bold text-orange-500 hover:text-orange-600">Forgot P.I.N.?</a>
                                        </div>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400"><Lock size={16} /></div>
                                            <input type="password" className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 block pl-10 p-3 outline-none transition-all" placeholder="••••••••" required />
                                        </div>
                                    </div>

                                    <button type="button" onClick={() => onNavigate('dashboard')} className="mt-2 w-full flex justify-center items-center gap-2 bg-gradient-to-r from-orange-500 to-orange-400 hover:from-orange-600 hover:to-orange-500 text-white p-3 rounded-xl font-bold transition-all shadow-md">
                                        Secure Login <ArrowRight size={16} />
                                    </button>
                                </form>

                                <p className="text-center text-sm text-slate-600 font-medium mt-6">
                                    Don't have a resident account? <button onClick={() => setStep('register-1')} className="text-orange-600 font-bold hover:underline underline-offset-4">Register here</button>
                                </p>
                            </motion.div>
                        )}

                        {/* ---------------- REGISTER STEP 1 ---------------- */}
                        {step === 'register-1' && (
                            <motion.div key="reg-1" variants={formVariants} initial="hidden" animate="visible" exit="exit" className="flex flex-col">
                                <div className="mb-6">
                                    <h2 className="text-2xl font-display font-bold text-slate-900 tracking-tight">Create Account</h2>
                                    <p className="text-sm text-slate-500 mt-1">Join the smart infrastructure network.</p>
                                </div>

                                <div className="flex gap-2 mb-6">
                                    <div className="h-1.5 flex-1 rounded-full bg-orange-500"></div>
                                    <div className="h-1.5 flex-1 rounded-full bg-slate-200"></div>
                                </div>

                                <form className="flex flex-col gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 uppercase tracking-widest mb-1.5">Full Name</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400"><User size={16} /></div>
                                            <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 block pl-10 p-3 outline-none" required />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 uppercase tracking-widest mb-1.5">Mobile Number</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400"><Phone size={16} /></div>
                                            <input type="tel" className="w-full bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 block pl-10 p-3 outline-none" required />
                                        </div>
                                    </div>

                                    <button type="button" onClick={() => setStep('register-2')} className="mt-2 w-full bg-slate-900 hover:bg-slate-800 text-white p-3 rounded-xl font-bold shadow-md">
                                        Continue <ArrowRight size={16} className="inline ml-1" />
                                    </button>
                                </form>

                                <p className="text-center text-sm text-slate-600 font-medium mt-6">
                                    Already registered? <button onClick={() => setStep('login')} className="text-orange-600 font-bold hover:underline underline-offset-4">Log in</button>
                                </p>
                            </motion.div>
                        )}

                        {/* ---------------- REGISTER STEP 2 ---------------- */}
                        {step === 'register-2' && (
                            <motion.div key="reg-2" variants={formVariants} initial="hidden" animate="visible" exit="exit" className="flex flex-col">
                                <div className="mb-6">
                                    <h2 className="text-2xl font-display font-bold text-slate-900 tracking-tight">Location Setup</h2>
                                    <p className="text-sm text-slate-500 mt-1">Anchor your account to your Barangay.</p>
                                </div>

                                <div className="flex gap-2 mb-6">
                                    <div className="h-1.5 flex-1 rounded-full bg-orange-500"></div>
                                    <div className="h-1.5 flex-1 rounded-full bg-orange-500"></div>
                                </div>

                                <form className="flex flex-col gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 uppercase tracking-widest mb-1.5">Home Barangay</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400"><MapPin size={16} /></div>
                                            <select className="w-full bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 block pl-10 p-3 outline-none appearance-none" defaultValue="">
                                                <option value="" disabled>Select Area...</option>
                                                <option value="176">Bagong Silang (176)</option>
                                                <option value="tala">Tala (180, 184-188)</option>
                                                <option value="camarin">Camarin (174-178)</option>
                                                <option value="deparo">Deparo (168, 170)</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 uppercase tracking-widest mb-1.5">Create Password</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400"><Lock size={16} /></div>
                                            <input type="password" placeholder="••••••••" className="w-full bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 block pl-10 p-3 outline-none" required />
                                        </div>
                                    </div>

                                    <div className="flex gap-3 mt-2">
                                        <button type="button" onClick={() => setStep('register-1')} className="w-1/3 bg-slate-100 hover:bg-slate-200 text-slate-700 p-3 rounded-xl font-bold">Back</button>
                                        <button type="button" onClick={() => onNavigate('dashboard')} className="w-2/3 flex justify-center items-center gap-2 bg-gradient-to-r from-orange-500 to-orange-400 text-white p-3 rounded-xl font-bold shadow-md">
                                            Complete <CheckCircle2 size={16} />
                                        </button>
                                    </div>
                                </form>
                            </motion.div>
                        )}

                    </AnimatePresence>
                </div>
            </motion.div>
        </motion.div>
    );
}
