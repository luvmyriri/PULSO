import React, { useState, useEffect, useRef } from 'react';
import { Calendar, ChevronLeft, ChevronRight, ChevronDown, X } from 'lucide-react';

const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

const SHORT_MONTH_NAMES = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const SHORT_DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 105 }, (_, i) => CURRENT_YEAR - i);

export default function CustomDatePicker({
    value,
    onChange,
    placeholder = 'Select Date of Birth',
    error = false,
    className = '',
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [viewMode, setViewMode] = useState('day'); // 'day' | 'month' | 'year'
    const containerRef = useRef(null);
    const yearListRef = useRef(null);
    const selectedYearRef = useRef(null);

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

    // Close on outside click
    useEffect(() => {
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
    }, [isOpen]);

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
        e.stopPropagation();
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

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            {/* Input Trigger */}
            <button
                type="button"
                onClick={() => setIsOpen(prev => !prev)}
                className={`w-full bg-white dark:bg-slate-800/80 border text-left rounded-xl px-2.5 py-1.5 text-xs sm:text-sm flex items-center justify-between transition-all cursor-pointer h-[38px] ${
                    error
                        ? 'border-red-500 ring-1 ring-red-500'
                        : isOpen
                            ? 'border-[#ff6b00] ring-2 ring-[#ff6b00]/20'
                            : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
            >
                <span className={selectedDate ? 'text-slate-900 dark:text-white font-medium' : 'text-slate-400 dark:text-slate-500'}>
                    {selectedDate ? formatDisplay(selectedDate) : placeholder}
                </span>
                <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500">
                    {selectedDate && (
                        <span
                            onClick={handleClear}
                            className="p-0.5 hover:text-slate-600 dark:hover:text-slate-300 rounded cursor-pointer"
                            title="Clear date"
                        >
                            <X size={13} />
                        </span>
                    )}
                    <Calendar size={15} className={isOpen ? 'text-[#ff6b00]' : ''} />
                </div>
            </button>

            {/* Custom Calendar Popover */}
            {isOpen && (
                <div className="absolute top-full left-0 mt-1.5 z-50 w-[295px] sm:w-[315px] bg-white dark:bg-[#0c1427] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-3 animate-in fade-in zoom-in-95 duration-150 select-none">
                    {/* Header: Month & Year Toggles + Step Arrows */}
                    <div className="flex items-center justify-between gap-1 mb-2.5 pb-2 border-b border-slate-100 dark:border-slate-800/60">
                        {/* Month Selector Toggle */}
                        <button
                            type="button"
                            onClick={() => setViewMode(prev => prev === 'month' ? 'day' : 'month')}
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                viewMode === 'month'
                                    ? 'bg-orange-500/15 text-[#ff6b00] border border-orange-500/40'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:border-orange-400 border border-slate-200 dark:border-slate-700'
                            }`}
                        >
                            <span>{MONTH_NAMES[viewMonth]}</span>
                            <ChevronDown size={12} className={`transition-transform duration-200 ${viewMode === 'month' ? 'rotate-180 text-[#ff6b00]' : 'text-slate-400'}`} />
                        </button>

                        {/* Year Selector Toggle */}
                        <button
                            type="button"
                            onClick={() => setViewMode(prev => prev === 'year' ? 'day' : 'year')}
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                viewMode === 'year'
                                    ? 'bg-orange-500/15 text-[#ff6b00] border border-orange-500/40'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:border-orange-400 border border-slate-200 dark:border-slate-700'
                            }`}
                        >
                            <span>{viewYear}</span>
                            <ChevronDown size={12} className={`transition-transform duration-200 ${viewMode === 'year' ? 'rotate-180 text-[#ff6b00]' : 'text-slate-400'}`} />
                        </button>

                        {/* Steppers */}
                        <div className="flex items-center gap-0.5 ml-auto">
                            <button
                                type="button"
                                onClick={handlePrev}
                                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg transition-colors cursor-pointer"
                                title={viewMode === 'year' ? 'Previous Years' : 'Previous Month'}
                            >
                                <ChevronLeft size={16} />
                            </button>
                            <button
                                type="button"
                                onClick={handleNext}
                                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg transition-colors cursor-pointer"
                                title={viewMode === 'year' ? 'Next Years' : 'Next Month'}
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>

                    {/* View: Month Selection Grid (No browser dropdown list!) */}
                    {viewMode === 'month' && (
                        <div className="py-1">
                            <div className="flex items-center justify-between mb-2 px-1">
                                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                    Select a Month
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setViewMode('day')}
                                    className="text-[11px] text-[#ff6b00] font-semibold hover:underline cursor-pointer"
                                >
                                    Done
                                </button>
                            </div>
                            <div className="grid grid-cols-3 gap-1.5">
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
                                            className={`py-2 px-1 text-xs rounded-xl font-semibold transition-all cursor-pointer ${
                                                isCurrentView || isSelectedDateMonth
                                                    ? 'bg-[#ff6b00] text-white shadow-xs'
                                                    : 'bg-slate-100/70 dark:bg-slate-800/60 text-slate-700 dark:text-slate-200 hover:bg-orange-500/10 hover:text-[#ff6b00] dark:hover:bg-orange-500/15'
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
                                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                    Select Year
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setViewMode('day')}
                                    className="text-[11px] text-[#ff6b00] font-semibold hover:underline cursor-pointer"
                                >
                                    Done
                                </button>
                            </div>
                            <div
                                ref={yearListRef}
                                className="grid grid-cols-4 gap-1.5 max-h-[200px] overflow-y-auto pr-1 select-none scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700"
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
                                            className={`py-1.5 text-xs rounded-lg font-semibold transition-all cursor-pointer ${
                                                isCurrentView
                                                    ? 'bg-[#ff6b00] text-white shadow-xs'
                                                    : 'bg-slate-100/70 dark:bg-slate-800/60 text-slate-700 dark:text-slate-200 hover:bg-orange-500/10 hover:text-[#ff6b00] dark:hover:bg-orange-500/15'
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
                            <div className="grid grid-cols-7 gap-1 text-center mb-1">
                                {SHORT_DAYS.map((d) => (
                                    <span key={d} className="text-[10px] font-bold text-slate-400 dark:text-slate-500 py-1">
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
                                            className="h-7 sm:h-8 flex items-center justify-center text-[11px] text-slate-300 dark:text-slate-700 pointer-events-none"
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
                                            className={`h-7 sm:h-8 rounded-lg text-xs font-semibold flex items-center justify-center transition-all cursor-pointer ${
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
                    <div className="flex items-center justify-between pt-2 mt-2 border-t border-slate-100 dark:border-slate-800/60 text-[11px]">
                        <button
                            type="button"
                            onClick={handleClear}
                            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                        >
                            Clear
                        </button>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                            {MONTH_NAMES[viewMonth]} {viewYear}
                        </span>
                        <button
                            type="button"
                            onClick={() => {
                                if (viewMode !== 'day') setViewMode('day');
                                else setIsOpen(false);
                            }}
                            className="text-[#ff6b00] font-bold hover:underline cursor-pointer"
                        >
                            Done
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
