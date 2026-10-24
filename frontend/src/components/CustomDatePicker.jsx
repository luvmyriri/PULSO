import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, ChevronLeft, ChevronRight, ChevronDown, X } from 'lucide-react';

const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

const SHORT_DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 105 }, (_, i) => CURRENT_YEAR - i);

export default function CustomDatePicker({
    value,
    onChange,
    label,
    placeholder = 'Select Date of Birth',
    error = false,
    className = '',
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [viewMode, setViewMode] = useState('day'); // 'day' | 'month' | 'year'
    const [isMobile, setIsMobile] = useState(false);
    const containerRef = useRef(null);
    const panelRef = useRef(null);
    const yearListRef = useRef(null);
    const selectedYearRef = useRef(null);
    const touchStartYRef = useRef(null);

    // Detect mobile viewport or mobile device container
    useEffect(() => {
        const checkMobile = () => {
            const isSmall = window.innerWidth < 640;
            const inMobileFrame = Boolean(
                containerRef.current?.closest(
                    '[data-mobile-view], [data-mobile-preview], .mobile-frame, .mobile-shell, [data-viewport="mobile"], [id*="mobile"], .w-\\[360px\\], .max-w-\\[390px\\], .max-w-\\[420px\\]'
                )
            );
            setIsMobile(isSmall || inMobileFrame);
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Body scroll lock on mobile when open
    useEffect(() => {
        if (isOpen && isMobile) {
            const originalOverflow = document.body.style.overflow;
            document.body.style.overflow = 'hidden';
            return () => {
                document.body.style.overflow = originalOverflow;
            };
        }
    }, [isOpen, isMobile]);

    // Parse incoming value YYYY-MM-DD
    const parseDate = (val) => {
        if (!val || typeof val !== 'string') return null;
        const parts = val.split('-');
        if (parts.length === 3) {
            const y = parseInt(parts[0], 10);
            const m = parseInt(parts[1], 10) - 1;
            const d = parseInt(parts[2], 10);
            if (!isNaN(y) && !isNaN(m) && !isNaN(d) && y > 1900) {
                return new Date(y, m, d);
            }
        }
        return null;
    };

    const selectedDate = parseDate(value);

    // Current view year and month in the calendar
    const [viewYear, setViewYear] = useState(() => selectedDate ? selectedDate.getFullYear() : CURRENT_YEAR - 25);
    const [viewMonth, setViewMonth] = useState(() => selectedDate ? selectedDate.getMonth() : 0);

    // Sync view when external value changes
    useEffect(() => {
        if (selectedDate) {
            setViewYear(selectedDate.getFullYear());
            setViewMonth(selectedDate.getMonth());
        }
    }, [value]);

    // Reset viewMode to 'day' whenever opening
    useEffect(() => {
        if (isOpen) {
            setViewMode('day');
        }
    }, [isOpen]);

    // Auto-scroll selected year into view when year picker opens
    useEffect(() => {
        if (viewMode === 'year' && selectedYearRef.current) {
            selectedYearRef.current.scrollIntoView({ block: 'center', behavior: 'instant' });
        }
    }, [viewMode]);

    // Close on outside click (desktop popover mode)
    useEffect(() => {
        if (isMobile) return; // Mobile uses backdrop overlay
        function handleClickOutside(event) {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
                setViewMode('day');
            }
        }
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('touchstart', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('touchstart', handleClickOutside);
        };
    }, [isOpen, isMobile]);

    // Close on escape
    useEffect(() => {
        function handleKeyDown(e) {
            if (e.key === 'Escape') {
                if (viewMode !== 'day') {
                    setViewMode('day');
                } else {
                    setIsOpen(false);
                }
            }
        }
        if (isOpen) window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, viewMode]);

    // Touch swipe down handlers for bottom sheet
    const handleTouchStart = (e) => {
        touchStartYRef.current = e.touches[0].clientY;
    };

    const handleTouchEnd = (e) => {
        if (touchStartYRef.current === null) return;
        const touchEndY = e.changedTouches[0].clientY;
        const deltaY = touchEndY - touchStartYRef.current;
        if (deltaY > 75) {
            setIsOpen(false);
        }
        touchStartYRef.current = null;
    };

    // Calendar grid calculations
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay();
    const prevMonthDays = new Date(viewYear, viewMonth, 0).getDate();

    const handlePrev = (e) => {
        e.stopPropagation();
        if (viewMode === 'year') {
            setViewYear(prev => Math.max(CURRENT_YEAR - 104, prev - 12));
        } else {
            if (viewMonth === 0) {
                setViewMonth(11);
                setViewYear(prev => prev - 1);
            } else {
                setViewMonth(prev => prev - 1);
            }
        }
    };

    const handleNext = (e) => {
        e.stopPropagation();
        if (viewMode === 'year') {
            setViewYear(prev => Math.min(CURRENT_YEAR, prev + 12));
        } else {
            if (viewMonth === 11) {
                setViewMonth(0);
                setViewYear(prev => prev + 1);
            } else {
                setViewMonth(prev => prev + 1);
            }
        }
    };

    const handleSelectDay = (day) => {
        const y = String(viewYear);
        const m = String(viewMonth + 1).padStart(2, '0');
        const d = String(day).padStart(2, '0');
        const dateStr = `${y}-${m}-${d}`;
        if (onChange) onChange(dateStr);
        setIsOpen(false);
        setViewMode('day');
    };

    const handleClear = (e) => {
        if (e) e.stopPropagation();
        if (onChange) onChange('');
        setIsOpen(false);
        setViewMode('day');
    };

    // Format display string
    const formatDisplay = (d) => {
        if (!d) return '';
        const m = MONTH_NAMES[d.getMonth()];
        const day = d.getDate();
        const y = d.getFullYear();
        return `${m} ${day}, ${y}`;
    };

    // Reusable calendar content
    const renderCalendarContent = (isMobileView = false) => (
        <div className="flex flex-col">
            {/* Header: Month & Year Toggles + Step Arrows */}
            <div className={`flex items-center justify-between gap-1 border-b border-slate-100 dark:border-slate-800/80 ${isMobileView ? 'pb-3 mb-3' : 'pb-2 mb-2.5'}`}>
                {/* Month Selector Toggle */}
                <button
                    type="button"
                    onClick={() => setViewMode(prev => prev === 'month' ? 'day' : 'month')}
                    className={`flex items-center gap-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                        isMobileView ? 'px-3.5 py-2 text-sm' : 'px-2.5 py-1 text-xs'
                    } ${
                        viewMode === 'month'
                            ? 'bg-orange-500/15 text-[#ff6b00] border border-orange-500/40'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:border-orange-400 border border-slate-200 dark:border-slate-700'
                    }`}
                >
                    <span>{MONTH_NAMES[viewMonth]}</span>
                    <ChevronDown size={isMobileView ? 14 : 12} className={`transition-transform duration-200 ${viewMode === 'month' ? 'rotate-180 text-[#ff6b00]' : 'text-slate-400'}`} />
                </button>

                {/* Year Selector Toggle */}
                <button
                    type="button"
                    onClick={() => setViewMode(prev => prev === 'year' ? 'day' : 'year')}
                    className={`flex items-center gap-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                        isMobileView ? 'px-3.5 py-2 text-sm' : 'px-2.5 py-1 text-xs'
                    } ${
                        viewMode === 'year'
                            ? 'bg-orange-500/15 text-[#ff6b00] border border-orange-500/40'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:border-orange-400 border border-slate-200 dark:border-slate-700'
                    }`}
                >
                    <span>{viewYear}</span>
                    <ChevronDown size={isMobileView ? 14 : 12} className={`transition-transform duration-200 ${viewMode === 'year' ? 'rotate-180 text-[#ff6b00]' : 'text-slate-400'}`} />
                </button>

                {/* Steppers */}
                <div className="flex items-center gap-1 ml-auto">
                    <button
                        type="button"
                        onClick={handlePrev}
                        className={`hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl transition-colors cursor-pointer flex items-center justify-center ${
                            isMobileView ? 'w-10 h-10 min-w-[40px]' : 'p-1'
                        }`}
                        title={viewMode === 'year' ? 'Previous Years' : 'Previous Month'}
                        aria-label="Previous"
                    >
                        <ChevronLeft size={isMobileView ? 20 : 16} />
                    </button>
                    <button
                        type="button"
                        onClick={handleNext}
                        className={`hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl transition-colors cursor-pointer flex items-center justify-center ${
                            isMobileView ? 'w-10 h-10 min-w-[40px]' : 'p-1'
                        }`}
                        title={viewMode === 'year' ? 'Next Years' : 'Next Month'}
                        aria-label="Next"
                    >
                        <ChevronRight size={isMobileView ? 20 : 16} />
                    </button>
                </div>
            </div>

            {/* View: Month Selection Grid */}
            {viewMode === 'month' && (
                <div className="py-1">
                    <div className="flex items-center justify-between mb-2 px-1">
                        <span className="text-[11px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                            Select a Month
                        </span>
                        <button
                            type="button"
                            onClick={() => setViewMode('day')}
                            className="text-xs text-[#ff6b00] font-semibold hover:underline cursor-pointer"
                        >
                            Done
                        </button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                        {MONTH_NAMES.map((name, idx) => {
                            const isCurrentView = viewMonth === idx;
                            const isSelectedDateMonth = selectedDate && selectedDate.getMonth() === idx && selectedDate.getFullYear() === viewYear;
                            return (
                                <button
                                    key={name}
                                    type="button"
                                    onClick={() => {
                                        setViewMonth(idx);
                                        setViewMode('day');
                                    }}
                                    className={`text-xs sm:text-sm rounded-xl font-semibold transition-all cursor-pointer ${
                                        isMobileView ? 'py-3 px-2' : 'py-2 px-1'
                                    } ${
                                        isCurrentView || isSelectedDateMonth
                                            ? 'bg-[#ff6b00] text-white shadow-xs'
                                            : 'bg-slate-100/80 dark:bg-slate-800/60 text-slate-700 dark:text-slate-200 hover:bg-orange-500/10 hover:text-[#ff6b00] dark:hover:bg-orange-500/15'
                                    }`}
                                >
                                    {name}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* View: Year Selection Grid */}
            {viewMode === 'year' && (
                <div className="py-1">
                    <div className="flex items-center justify-between mb-2 px-1">
                        <span className="text-[11px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                            Select Year
                        </span>
                        <button
                            type="button"
                            onClick={() => setViewMode('day')}
                            className="text-xs text-[#ff6b00] font-semibold hover:underline cursor-pointer"
                        >
                            Done
                        </button>
                    </div>
                    <div
                        ref={yearListRef}
                        className={`grid grid-cols-4 gap-2 overflow-y-auto pr-1 select-none scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700 ${
                            isMobileView ? 'max-h-[260px]' : 'max-h-[200px]'
                        }`}
                    >
                        {YEAR_OPTIONS.map((yr) => {
                            const isCurrentView = viewYear === yr;
                            return (
                                <button
                                    key={yr}
                                    ref={isCurrentView ? selectedYearRef : null}
                                    type="button"
                                    onClick={() => {
                                        setViewYear(yr);
                                        setViewMode('day');
                                    }}
                                    className={`text-xs sm:text-sm rounded-xl font-semibold transition-all cursor-pointer ${
                                        isMobileView ? 'py-2.5' : 'py-1.5'
                                    } ${
                                        isCurrentView
                                            ? 'bg-[#ff6b00] text-white shadow-xs'
                                            : 'bg-slate-100/80 dark:bg-slate-800/60 text-slate-700 dark:text-slate-200 hover:bg-orange-500/10 hover:text-[#ff6b00] dark:hover:bg-orange-500/15'
                                    }`}
                                >
                                    {yr}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* View: Standard Calendar Days Grid */}
            {viewMode === 'day' && (
                <>
                    {/* Day of Week Headers */}
                    <div className="grid grid-cols-7 gap-1 text-center mb-1.5">
                        {SHORT_DAYS.map((d) => (
                            <span key={d} className="text-[11px] sm:text-xs font-bold text-slate-400 dark:text-slate-500 py-1">
                                {d}
                            </span>
                        ))}
                    </div>

                    {/* 7-Column Days Grid */}
                    <div className="grid grid-cols-7 gap-1">
                        {/* Previous Month Padding Days */}
                        {Array.from({ length: firstDayIndex }, (_, i) => {
                            const prevDay = prevMonthDays - firstDayIndex + 1 + i;
                            return (
                                <div
                                    key={`prev-${i}`}
                                    className={`flex items-center justify-center text-[11px] sm:text-xs text-slate-300 dark:text-slate-700 pointer-events-none ${
                                        isMobileView ? 'h-9 sm:h-10' : 'h-7 sm:h-8'
                                    }`}
                                >
                                    {prevDay}
                                </div>
                            );
                        })}

                        {/* Current Month Days */}
                        {Array.from({ length: daysInMonth }, (_, i) => {
                            const day = i + 1;
                            const isSelected = selectedDate &&
                                selectedDate.getFullYear() === viewYear &&
                                selectedDate.getMonth() === viewMonth &&
                                selectedDate.getDate() === day;

                            const isToday =
                                new Date().getFullYear() === viewYear &&
                                new Date().getMonth() === viewMonth &&
                                new Date().getDate() === day;

                            return (
                                <button
                                    key={`day-${day}`}
                                    type="button"
                                    onClick={() => handleSelectDay(day)}
                                    className={`rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center transition-all cursor-pointer ${
                                        isMobileView ? 'h-9 sm:h-10 min-h-[36px]' : 'h-7 sm:h-8'
                                    } ${
                                        isSelected
                                            ? 'bg-[#ff6b00] text-white shadow-xs font-bold'
                                            : isToday
                                                ? 'border border-[#ff6b00] text-[#ff6b00] hover:bg-orange-50 dark:hover:bg-slate-800'
                                                : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                                    }`}
                                >
                                    {day}
                                </button>
                            );
                        })}
                    </div>
                </>
            )}

            {/* Footer Actions */}
            <div className={`flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 ${
                isMobileView ? 'pt-3 mt-3 text-xs sm:text-sm' : 'pt-2 mt-2 text-[11px]'
            }`}>
                <button
                    type="button"
                    onClick={handleClear}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer font-medium py-1 px-1.5"
                >
                    Clear
                </button>
                <span className="text-[11px] sm:text-xs text-slate-400 dark:text-slate-500 font-medium">
                    {MONTH_NAMES[viewMonth]} {viewYear}
                </span>
                <button
                    type="button"
                    onClick={() => {
                        if (viewMode !== 'day') setViewMode('day');
                        else setIsOpen(false);
                    }}
                    className={`text-[#ff6b00] font-bold hover:underline cursor-pointer ${
                        isMobileView ? 'py-1 px-2.5 bg-orange-500/10 rounded-lg hover:bg-orange-500/20' : ''
                    }`}
                >
                    Done
                </button>
            </div>
        </div>
    );

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            {/* Input Trigger Button */}
            <button
                type="button"
                onClick={() => setIsOpen(prev => !prev)}
                aria-haspopup="dialog"
                aria-expanded={isOpen}
                className={`w-full bg-white dark:bg-slate-800/80 border text-left rounded-[14px] px-4 text-base flex items-center justify-between transition-all cursor-pointer min-h-[50px] h-[52px] ${
                    error
                        ? 'border-red-500 ring-1 ring-red-500'
                        : isOpen
                            ? 'border-[#ff6b00] ring-2 ring-orange-500'
                            : 'border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600 focus:ring-2 focus:ring-orange-500'
                }`}
            >
                <span className={selectedDate ? 'text-black dark:text-white font-medium text-base' : 'text-black/60 dark:text-white/60 italic text-base'}>
                    {selectedDate ? formatDisplay(selectedDate) : placeholder}
                </span>
                <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500">
                    {selectedDate && (
                        <span
                            onClick={handleClear}
                            className="p-1 hover:text-slate-600 dark:hover:text-slate-300 rounded cursor-pointer"
                            title="Clear date"
                        >
                            <X size={16} />
                        </span>
                    )}
                    <Calendar size={18} className={isOpen ? 'text-[#ff6b00]' : ''} />
                </div>
            </button>

            {/* Desktop Popover (when on desktop viewports) */}
            {!isMobile && isOpen && (
                <div className="absolute top-full left-0 mt-1.5 z-50 w-[295px] sm:w-[315px] bg-white dark:bg-[#0c1427] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-3 animate-in fade-in zoom-in-95 duration-150 select-none">
                    {renderCalendarContent(false)}
                </div>
            )}

            {/* Mobile Bottom Panel / Bottom Sheet Modal (when on mobile viewports only) */}
            {isMobile && typeof document !== 'undefined' && createPortal(
                <AnimatePresence>
                    {isOpen && (
                        <div className="fixed inset-0 z-[9999] flex flex-col justify-end items-center">
                            {/* Plain Dim Backdrop (40% dark, strictly NO blur) */}
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                onClick={() => setIsOpen(false)}
                                className="fixed inset-0 bg-black/40"
                                aria-hidden="true"
                            />

                            {/* Slide-Up Bottom Sheet Panel */}
                            <motion.div
                                ref={panelRef}
                                initial={{ y: '100%' }}
                                animate={{ y: 0 }}
                                exit={{ y: '100%' }}
                                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                                role="dialog"
                                aria-modal="true"
                                aria-label={label || placeholder || 'Select Date of Birth'}
                                onTouchStart={handleTouchStart}
                                onTouchEnd={handleTouchEnd}
                                onClick={(e) => e.stopPropagation()}
                                className="relative z-10 w-full sm:max-w-[480px] bg-white dark:bg-slate-900 rounded-t-[20px] max-h-[85vh] flex flex-col shadow-2xl border-t border-slate-200 dark:border-slate-800 pb-safe select-none"
                            >
                                {/* Drag Handle */}
                                <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-700 mx-auto mt-2.5 mb-1 shrink-0" />

                                {/* Header: Title + 44px Close Button */}
                                <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 dark:border-slate-800 shrink-0">
                                    <h3 className="text-base font-bold text-black dark:text-white truncate">
                                        {label || placeholder || 'Select Date of Birth'}
                                    </h3>
                                    <button
                                        type="button"
                                        onClick={() => setIsOpen(false)}
                                        className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center text-black dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                        aria-label="Close date picker"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>

                                {/* Calendar Content with comfortable touch sizing */}
                                <div className="px-4 py-3 overflow-y-auto overscroll-contain">
                                    {renderCalendarContent(true)}
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </div>
    );
}
