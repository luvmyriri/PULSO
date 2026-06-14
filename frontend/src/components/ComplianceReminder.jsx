import React from 'react';
import { Shield, FileText, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * ComplianceReminder Component
 * 
 * Displays a professional LGU-branded compliance gateway for project phase transitions.
 * Correctly parses backend ValueErrors for Smart Gate enforcement based on RA 9184.
 */
const ComplianceReminder = ({ error, toTitleCase }) => {
    if (!error) return null;

    const isCompliance = typeof error === 'object' && error.type === 'COMPLIANCE';

    if (!isCompliance) {
        return (
            <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-3 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 rounded-xl text-xs font-bold flex items-start gap-2"
            >
                <AlertCircle size={14} className="shrink-0 mt-0.5 text-red-500" />
                <span>{typeof error === 'object' ? JSON.stringify(error) : error}</span>
            </motion.div>
        );
    }

    return (
        <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-4 overflow-hidden rounded-2xl border border-amber-200 dark:border-amber-800/50 bg-white dark:bg-slate-900 shadow-xl shadow-amber-100/20 dark:shadow-none"
        >
            <div className="bg-amber-500 px-4 py-2 flex items-center justify-between">
                <div className="flex items-center gap-2 text-white">
                    <Shield size={16} className="animate-pulse" />
                    <span className="text-[11px] font-black uppercase tracking-tighter">RA 9184 Compliance Gateway</span>
                </div>
                <div className="px-2 py-0.5 bg-white/20 backdrop-blur-md rounded-lg text-[9px] font-black text-white uppercase tabular-nums tracking-widest">
                    {error.track}
                </div>
            </div>
            
            <div className="p-4 space-y-3">
                <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0 border border-amber-200 dark:border-amber-800/50">
                        <FileText size={14} className="text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                        <h4 className="text-xs font-black text-slate-900 dark:text-white leading-tight">Missing Required Documentation</h4>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                            The following documents are mandatory for the <span className="font-bold text-slate-700 dark:text-indigo-400">{error.phase}</span> phase transition under current track protocols.
                        </p>
                    </div>
                </div>
                
                <div className="grid grid-cols-1 gap-1.5 ml-11">
                    {error.missing?.map((doc, idx) => (
                        <div key={idx} className="flex items-center gap-2 group">
                            <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 group-hover:scale-125 transition-transform" />
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{toTitleCase(doc)}</span>
                        </div>
                    ))}
                </div>

                <div className="mt-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 border border-slate-100 dark:border-slate-800 flex items-center gap-3">
                    <div className="w-1.5 h-8 bg-amber-400 rounded-full" />
                    <p className="text-[10px] text-slate-500 italic leading-relaxed">
                        "Strict adherence to procurement document requirements ensures audit integrity and prevents legal vacuums in government projects."
                    </p>
                </div>
            </div>
        </motion.div>
    );
};

export default ComplianceReminder;
