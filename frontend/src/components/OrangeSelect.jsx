/**
 * OrangeSelect.jsx
 * Centralized premium dropdown component for filters and selections.
 * Features: Framer Motion animations, integrated search, glassmorphism, and icon support.
 */
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check, Search } from 'lucide-react';

const OrangeSelect = ({ 
    value, 
    onChange, 
    options, 
    placeholder = 'Select…', 
    minWidth = '160px', 
    icon: Icon,
    searchable = true,
    size = 'md',
    align = 'left'
}) => {
    const [open, setOpen] = useState(false);
    const [filterText, setFilterText] = useState('');
    const ref = useRef(null);
    const inputRef = useRef(null);

    useEffect(() => {
        const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        const keyHandler = (e) => { if (e.key === 'Escape') setOpen(false); };
        document.addEventListener('mousedown', handler);
        document.addEventListener('keydown', keyHandler);
        return () => {
            document.removeEventListener('mousedown', handler);
            document.removeEventListener('keydown', keyHandler);
        };
    }, []);

    // Focus search input when opening
    useEffect(() => {
        if (open && inputRef.current) {
            setTimeout(() => inputRef.current.focus(), 50);
        } else if (!open) {
            setFilterText('');
        }
    }, [open]);

    const filteredOptions = options.filter(o =>
        o.label.toLowerCase().includes(filterText.toLowerCase())
    );

    const selected = options.find(o => o.value === value);
    const isActiveFilter = value && value !== 'All';

    return (
        <div ref={ref} className={`relative ${open ? 'z-[999]' : 'z-10'}`} style={{ minWidth: size === 'sm' ? (minWidth === '160px' ? 'auto' : minWidth) : minWidth }}>
            {/* Trigger button */}
            <button
                type="button"
                onClick={() => setOpen(p => !p)}
                className={`w-full flex items-center justify-between gap-1.5 transition-all duration-200 cursor-pointer ${
                    size === 'sm'
                        ? `px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                            open
                                ? 'bg-orange-50 dark:bg-orange-950/40 border-[#ff6b00] text-[#ff6b00] shadow-xs'
                                : isActiveFilter
                                    ? 'bg-orange-50 dark:bg-orange-950/40 border-[#ff6b00] text-[#ff6b00]'
                                    : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-orange-400/60'
                        }`
                        : `px-3.5 py-2.5 rounded-xl text-sm font-bold border ${
                            open
                                ? 'bg-orange-50/50 dark:bg-orange-950/30 border-orange-500 text-orange-700 dark:text-orange-300 shadow-lg shadow-orange-500/10'
                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-400 hover:border-orange-400/50 hover:text-orange-600 dark:hover:text-orange-300 shadow-sm'
                        }`
                }`}
            >
                <div className="flex items-center gap-1.5 truncate">
                    {Icon && <Icon size={size === 'sm' ? 12 : 14} className={open || isActiveFilter ? 'text-[#ff6b00]' : 'text-slate-400'} />}
                    <span className="truncate">{selected ? selected.label : placeholder}</span>
                </div>
                <ChevronDown
                    size={size === 'sm' ? 12 : 14}
                    className={`shrink-0 transition-transform duration-200 ${
                        open ? 'rotate-180 text-[#ff6b00]' : (isActiveFilter ? 'text-[#ff6b00]' : 'text-slate-400')
                    }`}
                />
            </button>

            {/* Dropdown panel */}
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: 6, scale: 0.96 }}
                        animate={{ opacity: 1, y: 3, scale: 1 }}
                        exit={{ opacity: 0, y: 6, scale: 0.96 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                        className={`absolute top-full mt-1.5 ${align === 'right' ? 'right-0' : 'left-0'} z-[9999] bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200 dark:border-slate-800 shadow-2xl shadow-black/20 dark:shadow-black/60 overflow-hidden ${
                            size === 'sm' ? 'min-w-[170px] rounded-xl' : 'min-w-[220px] rounded-2xl'
                        }`}
                    >
                        {/* Orange top accent line */}
                        <div className="h-1 bg-gradient-to-r from-orange-400 via-orange-500 to-orange-600" />
                        
                        {/* Search bar inside dropdown (if searchable and options > 6) */}
                        {searchable && options.length > 6 && (
                            <div className="p-2 border-b border-slate-100 dark:border-slate-800/50">
                                <div className="relative">
                                    <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        ref={inputRef}
                                        type="text"
                                        placeholder="Filter list..."
                                        value={filterText}
                                        onChange={e => setFilterText(e.target.value)}
                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-orange-500/30 font-medium text-slate-800 dark:text-slate-200"
                                    />
                                </div>
                            </div>
                        )}

                        <div className="py-1 max-h-[260px] overflow-y-auto custom-scrollbar">
                            {filteredOptions.length === 0 ? (
                                <div className="px-4 py-6 text-center text-xs text-slate-400 italic font-medium">
                                    No matches found
                                </div>
                            ) : (
                                filteredOptions.map(opt => {
                                    const isSelected = opt.value === value;
                                    return (
                                        <button
                                            key={opt.value}
                                            type="button"
                                            onClick={() => { onChange(opt.value); setOpen(false); }}
                                            className={`w-full flex items-center justify-between px-3.5 py-2 text-xs text-left transition-all duration-150 cursor-pointer ${
                                                isSelected
                                                    ? 'bg-orange-50 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400 font-bold'
                                                    : 'text-slate-600 dark:text-slate-300 hover:bg-orange-50/70 dark:hover:bg-orange-500/10 hover:text-orange-600 dark:hover:text-orange-300 font-medium'
                                            }`}
                                        >
                                            <span className="truncate">{opt.label}</span>
                                            {isSelected && (
                                                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                                                    <Check size={12} className="text-[#ff6b00] shrink-0 ml-2" strokeWidth={3} />
                                                </motion.div>
                                            )}
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default OrangeSelect;
