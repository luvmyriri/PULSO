/**
 * OrangeSelect.jsx
 * Centralized premium dropdown component for filters and selections.
 * Features: Framer Motion animations, integrated search, glassmorphism, and icon support.
 */
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check, Search } from 'lucide-react';

const OrangeSelect = ({ 
    value, 
    onChange, 
    options = [], 
    placeholder = 'Select…', 
    minWidth = '160px', 
    icon: Icon,
    searchable = true,
    size = 'md',
    align = 'left',
    dropUp = false,
    className = ''
}) => {
    const [open, setOpen] = useState(false);
    const [filterText, setFilterText] = useState('');
    const [activeGroup, setActiveGroup] = useState('All');
    const [effectiveAlign, setEffectiveAlign] = useState(align);
    const [effectiveDropUp, setEffectiveDropUp] = useState(dropUp);
    const ref = useRef(null);
    const inputRef = useRef(null);

    useEffect(() => {
        setEffectiveAlign(align);
    }, [align]);

    useEffect(() => {
        setEffectiveDropUp(dropUp);
    }, [dropUp]);

    // Detect if opening would overflow the right or bottom edges of the viewport or parent dialog/modal
    useEffect(() => {
        if (open && ref.current) {
            const rect = ref.current.getBoundingClientRect();
            const panelWidth = Math.max(size === 'sm' ? 200 : 280, ref.current.offsetWidth);
            const panelHeight = 280;

            // Check against closest clipping ancestor (modal, dialog, or scrollable container)
            const clippingParent = ref.current.closest('[role="dialog"], .modal, [class*="modal"], [class*="dialog"]') ||
                                  ref.current.closest('.overflow-hidden, .overflow-y-auto, .overflow-x-hidden');
            const parentRect = clippingParent ? clippingParent.getBoundingClientRect() : null;

            const maxRight = parentRect ? Math.min(window.innerWidth - 16, parentRect.right - 16) : window.innerWidth - 16;
            const maxBottom = parentRect ? Math.min(window.innerHeight - 16, parentRect.bottom - 16) : window.innerHeight - 16;
            const minTop = parentRect ? parentRect.top + 16 : 16;

            if (align === 'left' && rect.left + panelWidth > maxRight) {
                setEffectiveAlign('right');
            } else {
                setEffectiveAlign(align);
            }

            if (!dropUp && rect.bottom + panelHeight > maxBottom && rect.top - panelHeight > minTop) {
                setEffectiveDropUp(true);
            } else {
                setEffectiveDropUp(dropUp);
            }
        }
    }, [open, align, dropUp, size]);

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

    // Focus search input when opening, reset filter and group when closed
    useEffect(() => {
        if (open && inputRef.current) {
            setTimeout(() => inputRef.current.focus(), 50);
        } else if (!open) {
            setFilterText('');
            setActiveGroup('All');
        }
    }, [open]);

    // Available groups if any option specifies a group
    const availableGroups = useMemo(() => {
        const groups = new Set();
        (options || []).forEach(o => {
            if (o.group) groups.add(o.group);
        });
        return Array.from(groups);
    }, [options]);

    const filteredOptions = useMemo(() => {
        const q = filterText.toLowerCase().trim();
        return (options || []).filter(o => {
            if (activeGroup !== 'All' && o.group && o.group !== activeGroup) {
                return false;
            }
            if (!q) return true;
            const matchLabel = (o.label || '').toLowerCase().includes(q);
            const matchDesc = o.description && o.description.toLowerCase().includes(q);
            const matchVal = String(o.value || '').toLowerCase().includes(q);
            const matchGroup = o.group && o.group.toLowerCase().includes(q);
            return matchLabel || matchDesc || matchVal || matchGroup;
        });
    }, [options, filterText, activeGroup]);

    const selected = (options || []).find(o => o.value === value);
    const isActiveFilter = value && value !== 'All' && value !== 'All Districts' && value !== 'All Barangays';

    const renderOptionItem = (opt) => {
        const isSelected = opt.value === value;
        return (
            <button
                key={opt.value}
                type="button"
                onClick={() => { onChange(opt.value); setOpen(false); }}
                className={`group/opt w-full flex items-center justify-between px-3.5 py-2 text-xs text-left transition-all duration-150 cursor-pointer text-black dark:text-white hover:text-black dark:hover:text-white ${
                    isSelected
                        ? 'bg-orange-50 dark:bg-orange-500/15 hover:bg-orange-100/80 dark:hover:bg-orange-500/25'
                        : 'hover:bg-orange-50/70 dark:hover:bg-orange-500/15'
                }`}
            >
                <div className="flex flex-col min-w-0 pr-3">
                    <span className={`leading-snug transition-colors duration-150 text-black dark:text-white group-hover/opt:text-black dark:group-hover/opt:text-white ${
                        isSelected ? 'font-bold' : 'font-semibold'
                    }`}>
                        {opt.label}
                    </span>
                    {opt.description && (
                        <span className="text-[10px] font-normal text-black/75 dark:text-white/75 leading-normal mt-0.5 whitespace-normal group-hover/opt:text-black dark:group-hover/opt:text-white transition-colors duration-150">
                            {opt.description}
                        </span>
                    )}
                </div>
                {isSelected && (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="shrink-0 ml-auto pl-2">
                        <Check size={14} className="text-black dark:text-white group-hover/opt:text-black dark:group-hover/opt:text-white transition-colors duration-150" strokeWidth={2.5} />
                    </motion.div>
                )}
            </button>
        );
    };

    return (
        <div ref={ref} className={`relative ${open ? 'z-[999]' : 'z-10'} ${className}`} style={{ minWidth: size === 'sm' ? (minWidth === '160px' ? 'auto' : minWidth) : minWidth }}>
            {/* Trigger button */}
            <button
                type="button"
                onClick={() => setOpen(p => !p)}
                className={`group w-full flex items-center justify-between gap-2 transition-all duration-200 cursor-pointer hover:text-black dark:hover:text-white ${
                    size === 'sm'
                        ? `px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                            open
                                ? 'bg-orange-50 dark:bg-orange-950/40 border-[#ff6b00] text-black dark:text-white hover:text-black dark:hover:text-white shadow-xs ring-2 ring-orange-500/20'
                                : isActiveFilter
                                    ? 'bg-orange-50 dark:bg-orange-950/40 border-[#ff6b00] text-black dark:text-white hover:text-black dark:hover:text-white'
                                    : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-black dark:text-white hover:border-orange-400/60 hover:text-black dark:hover:text-white'
                        }`
                        : `px-3.5 py-2.5 rounded-xl text-sm font-semibold border ${
                            open
                                ? 'bg-orange-50/50 dark:bg-orange-950/30 border-[#ff6b00] text-black dark:text-white hover:text-black dark:hover:text-white shadow-lg shadow-orange-500/10 ring-2 ring-orange-500/20'
                                : 'bg-white dark:bg-[#090e1a] border-slate-200 dark:border-slate-800 text-black dark:text-white hover:border-orange-400/60 hover:text-black dark:hover:text-white shadow-xs'
                        }`
                }`}
            >
                <div className="flex items-center gap-2 truncate">
                    {Icon && (
                        <Icon
                            size={size === 'sm' ? 12 : 15}
                            className={`transition-colors duration-150 ${open || isActiveFilter ? 'text-black dark:text-white' : 'text-slate-500 dark:text-slate-400'} group-hover:text-black dark:group-hover:text-white`}
                        />
                    )}
                    <span className="truncate text-black dark:text-white group-hover:text-black dark:group-hover:text-white transition-colors duration-150">
                        {selected ? selected.label : placeholder}
                    </span>
                </div>
                <ChevronDown
                    size={size === 'sm' ? 12 : 15}
                    className={`shrink-0 transition-all duration-200 ${
                        open ? 'rotate-180 text-black dark:text-white' : (isActiveFilter ? 'text-black dark:text-white' : 'text-slate-500 dark:text-slate-400')
                    } group-hover:text-black dark:group-hover:text-white`}
                />
            </button>

            {/* Dropdown panel */}
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: effectiveDropUp ? -6 : 6, scale: 0.96 }}
                        animate={{ opacity: 1, y: effectiveDropUp ? -3 : 3, scale: 1 }}
                        exit={{ opacity: 0, y: effectiveDropUp ? -6 : 6, scale: 0.96 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                        className={`absolute ${effectiveDropUp ? 'bottom-full mb-1.5' : 'top-full mt-1.5'} ${effectiveAlign === 'right' ? 'right-0' : 'left-0'} z-[9999] bg-white dark:bg-[#0c1424] border border-slate-200 dark:border-slate-700/80 shadow-2xl shadow-black/25 dark:shadow-black/80 overflow-hidden min-w-full ${
                            size === 'sm' ? 'min-w-[200px] max-w-[340px] rounded-xl' : 'min-w-[280px] sm:min-w-[320px] max-w-[380px] rounded-2xl'
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

                        {/* Quick Group Filter Tabs if multiple groups exist */}
                        {availableGroups.length > 1 && (
                            <div className="px-2 py-1.5 border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/60 dark:bg-slate-900/60 flex items-center gap-1 overflow-x-auto no-scrollbar">
                                <button
                                    type="button"
                                    onClick={() => setActiveGroup('All')}
                                    className={`px-2 py-1 rounded-md text-[11px] font-bold transition-all shrink-0 cursor-pointer ${
                                        activeGroup === 'All'
                                            ? 'bg-orange-500 text-white shadow-xs'
                                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 hover:text-black dark:hover:text-white'
                                    }`}
                                >
                                    All ({options.filter(o => o.value !== 'All' && o.value !== 'All Barangays').length || options.length})
                                </button>
                                {availableGroups.map(grp => {
                                    const isSelectedGroup = activeGroup === grp;
                                    const shortLabel = grp.split('(')[0].trim();
                                    const count = options.filter(o => o.group === grp).length;
                                    return (
                                        <button
                                            key={grp}
                                            type="button"
                                            onClick={() => setActiveGroup(grp)}
                                            className={`px-2 py-1 rounded-md text-[11px] font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1 ${
                                                isSelectedGroup
                                                    ? 'bg-orange-500 text-white shadow-xs'
                                                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 hover:text-black dark:hover:text-white'
                                            }`}
                                        >
                                            <span>{shortLabel}</span>
                                            <span className={`text-[10px] px-1 py-0.2 rounded-full ${isSelectedGroup ? 'bg-black/20 text-white' : 'bg-slate-200/70 dark:bg-slate-700/60 text-slate-500 dark:text-slate-400'}`}>
                                                {count}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        <div className="py-1 max-h-[300px] overflow-y-auto custom-scrollbar">
                            {filteredOptions.length === 0 ? (
                                <div className="px-4 py-6 text-center text-xs text-slate-400 italic font-medium">
                                    No matches found
                                </div>
                            ) : availableGroups.length > 1 ? (
                                (() => {
                                    const ungrouped = filteredOptions.filter(o => !o.group);
                                    const groupsToRender = activeGroup === 'All'
                                        ? availableGroups
                                        : availableGroups.filter(g => g === activeGroup);

                                    return (
                                        <>
                                            {ungrouped.map(opt => renderOptionItem(opt))}
                                            {groupsToRender.map(grp => {
                                                const items = filteredOptions.filter(o => o.group === grp);
                                                if (items.length === 0) return null;
                                                return (
                                                    <div key={grp}>
                                                        <div className="sticky top-0 z-10 px-3.5 py-1.5 text-[10px] font-black uppercase tracking-wider text-orange-600 dark:text-orange-400 bg-slate-100/95 dark:bg-[#0f172a]/95 backdrop-blur-xs border-y border-slate-200/60 dark:border-slate-800 flex items-center justify-between">
                                                            <span className="truncate">{grp}</span>
                                                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400">
                                                                {items.length}
                                                            </span>
                                                        </div>
                                                        {items.map(opt => renderOptionItem(opt))}
                                                    </div>
                                                );
                                            })}
                                        </>
                                    );
                                })()
                            ) : (
                                filteredOptions.map(opt => renderOptionItem(opt))
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default OrangeSelect;
