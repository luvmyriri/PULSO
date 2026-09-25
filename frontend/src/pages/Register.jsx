import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Phone, Lock, UploadCloud, CheckCircle, Loader2, X, ZoomIn, Info, Mail, ShieldCheck, AlertCircle, Camera, Eye, EyeOff, Sun, Moon, Monitor, Home, RotateCw, Database, ChevronDown, Calendar, ChevronRight, UserCheck, Bell, FileCheck, MapPin, Check } from 'lucide-react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import ErrorBoundary from '../components/ErrorBoundary';
import Branding from '../components/Branding';
import ThemeToggle from '../components/ThemeToggle';
import IDCameraModal from '../components/IDCameraModal';
import LegalModal from '../components/LegalModal';
import { clearAuthSession } from '../utils/authSession';
import { API_BASE_URL } from '../utils/apiBase';

// ---------------------------------------------------------------------------
// OCR Address Parser
// Splits a raw OCR address string into structured sub-fields
// ---------------------------------------------------------------------------
function parseOcrAddress(raw, data) {
    if (!raw) return {};

    // ─── 1. Normalize ───────────────────────────────────────────────────────
    let s = raw
        .replace(/\n|\|/g, ' ')             // newlines → spaces
        .replace(/\s{2,}/g, ' ')            // collapse multiple spaces
        .trim();

    // Strip OCR metadata noise
    const NOISE = /\b(KASARIAN|KASAR1AN|SEX|SEK|MALE|FEMALE|HALE|NALE|FEHALE|PEMALE|PHILIPPINES?|REPUBLIKA\s+NG|NG\s+PILIPINAS|ADDRESS|A0DRESS|ADDRES5|RESIDENCE|LICENSE|L1CENSE|RESTRICTION|AGENCY|CODE|SERIAL|PLACE OF BIRTH|ISSUANCE|BLOOD\s+TYPE|EYE\s+COLOR|WEIGHT|HEIGHT|TIN|EXPIRY|VALIDITY|VALID\s+UNTIL)\b/gi;
    s = s.replace(NOISE, '').replace(/\s{2,}/g, ' ').trim();

    // Strip postal codes (4-digit)
    s = s.replace(/\b1[34]\d{2}\b/g, '').trim();

    let houseNo     = '';
    let blockLot    = '';
    let street      = '';
    let subdivision = '';

    // ─── 2. Extract Block & Lot (highest priority) ───────────────────────────
    // Pattern: BLK 9 LOT 30, BLOCK 9 LOT 30, LOT 30 BLK 9, LOT 30
    const blkLotRe = /\b((?:BLK|BLOCK|B\.?LK|8LK)\.?\s*\d+[A-Z]?\s*(?:LOT|L0T)\.?\s*\d+[A-Z]?|(?:LOT|L0T)\.?\s*\d+[A-Z]?\s*(?:BLK|BLOCK|B\.?LK)\.?\s*\d+[A-Z]?|(?:BLK|BLOCK|B\.?LK)\.?\s*\d+[A-Z]?|(?:LOT|L0T)\.?\s*\d+[A-Z]?)\b/i;
    const blkLotMatch = s.match(blkLotRe);
    if (blkLotMatch) {
        blockLot = blkLotMatch[1]
            .replace(/8LK|B\.?LK/gi, 'BLK')
            .replace(/L0T/gi, 'LOT')
            .replace(/\s+/g, ' ')
            .toUpperCase()
            .trim();
        s = s.replace(blkLotMatch[0], '').trim();
    }

    // ─── 3. Extract leading House Number (if no Block/Lot found) ────────────
    if (!blockLot) {
        const houseRe = /^(#?\d+[-–\/]?[A-Za-z]?)\s/;
        const houseMatch = s.match(houseRe);
        if (houseMatch) {
            houseNo = houseMatch[1].replace(/^#/, '');
            s = s.replace(houseMatch[0], '').trim();
        }
    }

    // ─── 4. Extract Street (before or after subdivision) ────────────────────
    // Street has suffix: St., Ave., Rd., Blvd., Dr., Lane, Highway, Ext.
    const streetRe = /\b((?:[A-Za-z0-9#.\-]+\s+)*(?:[A-Za-z0-9#.\-]+)\s+(?:STREET|ST\.?|AVENUE|AVE\.?|ROAD|RD\.?|BOULEVARD|BLVD\.?|DRIVE|DR\.?|LANE|LN\.?|HIGHWAY|HWY\.?|EXTENSION|EXT\.?|LOOP|WALK|WAY|CIRCLE|CIR\.?))\b/i;
    const streetMatch = s.match(streetRe);
    if (streetMatch) {
        street = streetMatch[1].replace(/\s+/g, ' ').trim();
        // Title case
        street = street.replace(/\b\w/g, c => c.toUpperCase());
        s = s.replace(streetMatch[0], '').trim();
    }

    // ─── 5. Extract Subdivision / Village / Estate ───────────────────────────
    const subdivRe = /\b((?:[A-Za-z0-9#.\-]+\s+)*(?:[A-Za-z0-9#.\-]+\s+)?(?:HOMES?(?:\s+\d+[A-Z]?)?|VILLAGE|VILL(?:AGE)?\.?|HEIGHTS?|SUBD(?:\.?|IVISION)?|SUBDIVISION|VILLE|ESTATE|PARK(?:\s+\d+)?|PLACE|COURT(?:\s+\d+)?|NORTHVILLE(?:\s+[A-Z0-9]+)?|FAIRVIEW|TOWNVILLE|RESIDENCES?|COMPOUND|ROYALE|VERDE|PALMS?|GARDENS?|GROVE|OAKS?|PINES|HILLS?|VISTAS?))\b/i;
    const subdivMatch = s.match(subdivRe);
    if (subdivMatch) {
        subdivision = subdivMatch[1].replace(/\s+/g, ' ').trim();
        subdivision = subdivision.replace(/\b\w/g, c => c.toUpperCase());
        s = s.replace(subdivMatch[0], '').trim();
    }

    // ─── 6. Strip barangay / city noise from remainder ────────────────────────
    s = s.replace(/\b(?:BARANGAY|BRGY\.?|BGY\.?)\s*\d+[A-Z]?\b/gi, '');
    if (data && data.barangay) {
        try {
            // Remove exact barangay name 
            const bn = data.barangay.replace(/^Barangay\s*/i, '').trim();
            if (bn) s = s.replace(new RegExp(`\\b${bn.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}\\b`, 'gi'), '');
        } catch(_) {}
    }
    s = s.replace(/\b(?:CALOOCAN|KALOOKAN|CITY|NCR|METRO\s+MANILA|MANILA|DISTRICT|ZONE|THIRD\s*DISTRICT)\b/gi, '');
    s = s.replace(/[,\/\s]+$/, '').replace(/^[,\/\s]+/, '').replace(/\s{2,}/g, ' ').trim();

    // ─── 7. If street still empty, use cleaned remainder ────────────────────
    if (!street && s) {
        street = s.replace(/\b\w/g, c => c.toUpperCase()).trim();
        s = '';
    }

    return { houseNo, blockLot, subdivision, street };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function getPostalCodeForBarangay(brgy) {
    if (!brgy) return '';
    const numMatch = brgy.match(/\d+/);
    if (!numMatch) return '';
    const num = parseInt(numMatch[0], 10);
    
    if ([165, 166, 168, 169, 170].includes(num)) return '1420';
    if (num === 167) return '1423';
    if ([171, 172, 173].includes(num)) return '1421';
    if ([174, 175, 177, 178].includes(num)) return '1424';
    if (num === 176) return '1428';
    if (num === 179) return '1425';
    if ([180, 181, 182].includes(num)) return '1422';
    if ([183, 184].includes(num)) return '1426';
    if ([185, 186, 187, 188].includes(num)) return '1427';
    return '';
}

// ---------------------------------------------------------------------------
// Smart OCR → Form Field Mapper
// ---------------------------------------------------------------------------
function mapOcrToForm(data) {
    const mapped = {};

    // --- Name parsing ---
    // OCR may return full name in first_name, or split across first_name / last_name
    const rawFirst = (data.first_name || '').trim();
    const rawLast = (data.last_name || '').trim();

    if (rawFirst && !rawLast) {
        // Full name in first_name — split on spaces
        const parts = rawFirst.split(/\s+/);
        mapped.firstName = parts[0] || '';
        mapped.lastName = parts[parts.length - 1] || '';
        mapped.middleName = parts.length > 2 ? parts.slice(1, -1).join(' ') : '';
    } else if (rawLast && !rawFirst) {
        const parts = rawLast.split(/\s+/);
        mapped.lastName = parts[0] || '';
        mapped.firstName = parts[parts.length - 1] || '';
        mapped.middleName = parts.length > 2 ? parts.slice(1, -1).join(' ') : '';
    } else if (rawFirst === rawLast && rawFirst) {
        // Same value repeated — split it
        const parts = rawFirst.split(/\s+/);
        mapped.firstName = parts[0] || '';
        mapped.lastName = parts[parts.length - 1] || '';
        mapped.middleName = parts.length > 2 ? parts.slice(1, -1).join(' ') : '';
    } else {
        // Different values — use the full extracted strings from OCR
        // If the backend managed to split it, trust it. 
        mapped.firstName = rawFirst;
        mapped.lastName = rawLast;
        mapped.middleName = (data.middle_name || '').trim();
    }
    
    // --- Suffix ---
    mapped.suffix = (data.suffix || '').trim().replace(/[.,]$/, ''); // Jr. -> Jr

    // --- ID Type ---
    mapped.idType = data.id_type_label || 'Unknown Document';

    // --- Date of Birth ---
    if (data.dob) {
        // dob comes as "YYYY-MM-DD"
        const parsed = new Date(data.dob + 'T00:00:00');
        mapped.dobDate = isNaN(parsed.getTime()) ? null : parsed;
        mapped.dob = data.dob;

        // Calculate age
        const today = new Date();
        let age = today.getFullYear() - parsed.getFullYear();
        const m = today.getMonth() - parsed.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < parsed.getDate())) age--;
        mapped.age = age >= 0 ? String(age) : '';
    }

    // --- Sex ---
    const sex = (data.sex || '').trim();
    if (sex === 'Male' || sex === 'Female') {
        mapped.sex = sex;
    } else if (sex.toUpperCase() === 'M') {
        mapped.sex = 'Male';
    } else if (sex.toUpperCase() === 'F') {
        mapped.sex = 'Female';
    }

    // --- Address ---
    const addr = parseOcrAddress(data.address || '', data);
    mapped.houseNo = data.house_no !== undefined ? data.house_no : (addr.houseNo || '');
    mapped.blockLot = data.block_lot !== undefined ? data.block_lot : (addr.blockLot || '');
    mapped.subdivision = data.subdivision !== undefined ? data.subdivision : (addr.subdivision || '');
    mapped.street = data.street !== undefined ? data.street : (addr.street || (data.address || '').split('\n')[0].trim());

    let bn = (data.barangay || addr.barangayId || '').trim();
    if (bn) {
        // Strictly hunt for the 3-digit barangay number (e.g. 171)
        const numMatch = bn.match(/\b(1[6-8][0-9])\b/); 
        if (numMatch) {
            mapped.barangay = `Barangay ${numMatch[1]}`;
        } else {
            // Fallback: cleanup the string if no strict number is detected
            bn = bn.replace(/Barangay/ig, '').replace(/,/g, '').trim();
            mapped.barangay = `Barangay ${bn}`;
        }
    } else {
        mapped.barangay = '';
    }

    if (mapped.barangay) {
        const numMatch = mapped.barangay.match(/\d+/);
        if (numMatch) {
            const num = parseInt(numMatch[0], 10);
            if (num >= 1 && num <= 164) mapped.municipality = 'Caloocan City - South';
            else if (num >= 165 && num <= 188) mapped.municipality = 'Caloocan City - North';
            else mapped.municipality = 'Caloocan City';
        } else {
            mapped.municipality = 'Caloocan City';
        }
    } else {
        mapped.municipality = 'Caloocan City';
    }
    mapped.province = 'Metro Manila';
    mapped.postalCode = data.postal_code || getPostalCodeForBarangay(mapped.barangay) || '1421'; // Default to 1421 for North Caloocan if detection fails
    return mapped;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------
const InputField = ({ label, name, value, onChange, type = 'text', required = false, readOnly = false, placeholder = '', className = '' }) => (
    <div className={className}>
        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 pl-0.5">{label}{required && <span className="text-red-400 ml-0.5">*</span>}</label>
        <input
            type={type}
            name={name}
            value={value}
            onChange={onChange}
            readOnly={readOnly}
            placeholder={placeholder}
            required={required}
            className={`w-full border text-sm rounded-xl px-3 py-2.5 outline-none transition-all
                ${readOnly
                    ? 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 cursor-not-allowed'
                    : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent'
                }`}
        />
    </div>
);

const SectionHeading = ({ children }) => (
    <div className="flex items-center gap-2 mt-5 mb-3">
        <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{children}</span>
        <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700/60" />
    </div>
);

const CustomSelect = ({ label, name, value, onChange, options, required }) => {
    const [isOpen, setIsOpen] = React.useState(false);
    
    const dropdownRef = React.useRef(null);
    React.useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={dropdownRef}>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 pl-0.5">{label} {required && <span className="text-red-400">*</span>}</label>
            <button
                type="button"
                className={`w-full flex items-center justify-between border text-sm rounded-xl px-3 py-2.5 outline-none transition-all focus:ring-2 focus:ring-orange-500 focus:border-transparent cursor-pointer ${
                    isOpen ? 'bg-white dark:bg-slate-800 border-orange-500' : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-orange-500/50'
                } text-slate-900 dark:text-white`}
                onClick={() => setIsOpen(!isOpen)}
            >
                <span className={value ? "truncate pr-2" : "text-slate-400"}>{value || "Select"}</span>
                <ChevronDown size={15} className={`transition-transform text-slate-500 dark:text-slate-400 shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} transition={{ duration: 0.15 }}
                        className="absolute z-50 w-full mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden drop-shadow-2xl max-h-60 overflow-y-auto custom-scrollbar"
                    >
                        {options.map((opt) => (
                            <button
                                key={opt}
                                type="button"
                                className={`w-full text-left px-3 py-2.5 hover:bg-orange-500 hover:text-white transition-colors text-sm font-medium ${value === opt ? 'bg-orange-50 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400' : 'text-slate-900 dark:text-white'}`}
                                onClick={() => {
                                    onChange({ target: { name, value: opt, type: 'select-one' } });
                                    setIsOpen(false);
                                }}
                            >
                                {opt}
                            </button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const CustomDatePicker = ({ label, name, value, onChange, required }) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const [viewDate, setViewDate] = React.useState(value ? new Date(value + 'T00:00:00') : new Date());
    const [isYearSelectorOpen, setIsYearSelectorOpen] = React.useState(false);
    const [isMonthSelectorOpen, setIsMonthSelectorOpen] = React.useState(false);
    const dropdownRef = React.useRef(null);
    const yearScrollRef = React.useRef(null);

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const monthShort = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const days = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

    const currentMonth = viewDate.getMonth();
    const currentYear = viewDate.getFullYear();

    const getDaysInMonth = (month, year) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (month, year) => new Date(year, month, 1).getDay();

    const handleMonthChange = (offset) => {
        const nextDate = new Date(viewDate);
        nextDate.setMonth(viewDate.getMonth() + offset);
        setViewDate(nextDate);
    };

    const handleYearChange = (year) => {
        const nextDate = new Date(viewDate);
        nextDate.setFullYear(parseInt(year));
        setViewDate(nextDate);
        setIsYearSelectorOpen(false);
    };

    const handleMonthSelect = (month) => {
        const nextDate = new Date(viewDate);
        nextDate.setMonth(month);
        setViewDate(nextDate);
        setIsMonthSelectorOpen(false);
    };

    const handleDateSelect = (day) => {
        const selected = new Date(currentYear, currentMonth, day);
        const offset = selected.getTimezoneOffset() * 60000;
        const localDate = new Date(selected.getTime() - offset);
        const dateStr = localDate.toISOString().split('T')[0];
        onChange({ target: { name, value: dateStr, type: 'date' } });
        setIsOpen(false);
    };

    React.useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
                setIsYearSelectorOpen(false);
                setIsMonthSelectorOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Snap scroll to current year when opened
    React.useEffect(() => {
        if (isYearSelectorOpen && yearScrollRef.current) {
            const el = yearScrollRef.current.querySelector(`[data-year="${currentYear}"]`);
            if (el) el.scrollIntoView({ block: 'center' });
        }
    }, [isYearSelectorOpen, currentYear]);

    const daysInMonth = getDaysInMonth(currentMonth, currentYear);
    const firstDay = getFirstDayOfMonth(currentMonth, currentYear);
    const prevMonthDays = getDaysInMonth(currentMonth - 1, currentYear);
    
    const calendarDays = [];
    for (let i = firstDay - 1; i >= 0; i--) calendarDays.push({ day: prevMonthDays - i, current: false });
    for (let i = 1; i <= daysInMonth; i++) calendarDays.push({ day: i, current: true });
    const remaining = 42 - calendarDays.length;
    for (let i = 1; i <= remaining; i++) calendarDays.push({ day: i, current: false });

    const yearOptions = [];
    const thisYear = new Date().getFullYear();
    for (let y = thisYear; y >= 1920; y--) yearOptions.push(y);

    const formatDate = (dateStr) => {
        if (!dateStr) return "Select Date";
        const d = new Date(dateStr + 'T00:00:00');
        return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 pl-0.5">{label} {required && <span className="text-red-400">*</span>}</label>
            <button
                type="button"
                className={`w-full flex items-center justify-between border text-sm rounded-xl px-3 py-2.5 outline-none transition-all focus:ring-2 focus:ring-orange-500 focus:border-transparent cursor-pointer ${
                    isOpen ? 'bg-white dark:bg-slate-800 border-orange-500 shadow-lg' : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-orange-500/50'
                } text-slate-900 dark:text-white`}
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="flex items-center gap-2 overflow-hidden">
                    <Calendar size={15} className="text-slate-400 shrink-0" />
                    <span className={value ? "truncate" : "text-slate-400"}>{formatDate(value)}</span>
                </div>
                <ChevronDown size={14} className={`transition-transform text-slate-500 shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 15, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 15, scale: 0.95 }}
                        className="absolute z-[100] mt-2 left-0 sm:left-auto sm:right-0 w-[280px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] overflow-hidden backdrop-blur-2xl p-4"
                    >
                        {/* Custom Header */}
                        <div className="flex items-center justify-between mb-4 px-1">
                            <div className="flex flex-col">
                                <span className="text-[9px] font-black uppercase text-orange-500 tracking-[0.1em]">Identity Birth Date</span>
                                <div className="flex items-center gap-1.5 min-h-[24px]">
                                    <button 
                                        type="button"
                                        onClick={() => { setIsMonthSelectorOpen(!isMonthSelectorOpen); setIsYearSelectorOpen(false); }}
                                        className={`text-sm font-black transition-colors flex items-center gap-1 ${isMonthSelectorOpen ? 'text-orange-500' : 'text-slate-900 dark:text-white hover:text-orange-500'}`}
                                    >
                                        {monthNames[currentMonth]}
                                        <ChevronDown size={12} className={`transition-transform ${isMonthSelectorOpen ? 'rotate-180' : ''}`} />
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={() => { setIsYearSelectorOpen(!isYearSelectorOpen); setIsMonthSelectorOpen(false); }}
                                        className={`text-sm font-black transition-colors flex items-center gap-1 ${isYearSelectorOpen ? 'text-orange-500' : 'text-slate-900 dark:text-white hover:text-orange-500'}`}
                                    >
                                        {currentYear}
                                        <ChevronDown size={12} className={`transition-transform ${isYearSelectorOpen ? 'rotate-180' : ''}`} />
                                    </button>
                                </div>
                            </div>
                            <div className="flex gap-1.5">
                                <button type="button" onClick={() => handleMonthChange(-1)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg text-slate-500 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-white/10">
                                    <ChevronRight size={16} className="rotate-180" />
                                </button>
                                <button type="button" onClick={() => handleMonthChange(1)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg text-slate-500 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-white/10">
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>

                        {/* Popover Content Layer */}
                        <div className="relative min-h-[200px]">
                            {/* Main Calendar Grid */}
                            <motion.div
                                animate={{ opacity: (isMonthSelectorOpen || isYearSelectorOpen) ? 0 : 1, scale: (isMonthSelectorOpen || isYearSelectorOpen) ? 0.95 : 1, filter: (isMonthSelectorOpen || isYearSelectorOpen) ? 'blur(4px)' : 'blur(0px)' }}
                                className="grid grid-cols-7 gap-1"
                            >
                                {days.map(d => <div key={d} className="text-[10px] font-black text-slate-400 text-center uppercase py-1">{d}</div>)}
                                {calendarDays.map((d, i) => {
                                    const isSelected = value && new Date(value + 'T00:00:00').getDate() === d.day && new Date(value + 'T00:00:00').getMonth() === currentMonth && new Date(value + 'T00:00:00').getFullYear() === currentYear && d.current;
                                    const isToday = new Date().getDate() === d.day && new Date().getMonth() === currentMonth && new Date().getFullYear() === currentYear && d.current;
                                    return (
                                        <button key={i} type="button" disabled={!d.current} onClick={() => handleDateSelect(d.day)}
                                            className={`h-8 w-8 flex items-center justify-center text-xs font-bold rounded-lg transition-all ${!d.current ? 'text-slate-300 dark:text-slate-700 cursor-default p-0' : isSelected ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30 scale-110 active:scale-95' : isToday ? 'border border-orange-500/50 text-orange-500 bg-orange-500/5' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-orange-500 active:scale-95'}`}>
                                            {d.day}
                                        </button>
                                    );
                                })}
                            </motion.div>

                            {/* Month Selector Overlay */}
                            <AnimatePresence>
                                {isMonthSelectorOpen && (
                                    <motion.div 
                                        initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }}
                                        className="absolute inset-0 z-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-xl grid grid-cols-3 gap-2 p-1"
                                    >
                                        {monthShort.map((m, idx) => (
                                            <button key={m} type="button" onClick={() => handleMonthSelect(idx)}
                                                className={`flex items-center justify-center rounded-xl text-xs font-black uppercase transition-all ${currentMonth === idx ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'text-slate-600 dark:text-slate-400 hover:bg-orange-500/10 hover:text-orange-500'}`}>
                                                {m}
                                            </button>
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Year Selector Overlay */}
                            <AnimatePresence>
                                {isYearSelectorOpen && (
                                    <motion.div 
                                        initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }}
                                        className="absolute inset-0 z-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-xl p-1"
                                    >
                                        <div ref={yearScrollRef} className="h-full overflow-y-auto custom-scrollbar-thin grid grid-cols-2 gap-2 pr-1">
                                            {yearOptions.map(y => (
                                                <button key={y} data-year={y} type="button" onClick={() => handleYearChange(y)}
                                                    className={`py-2 px-3 rounded-xl text-xs font-black transition-all ${currentYear === y ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'text-slate-600 dark:text-slate-400 hover:bg-orange-500/10 hover:text-orange-500'}`}>
                                                    {y}
                                                </button>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                        
                        {/* Footer Actions */}
                        <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-100 dark:border-white/10">
                            <button type="button" onClick={() => { 
                                const today = new Date();
                                handleYearChange(today.getFullYear());
                                setViewDate(today);
                                setIsMonthSelectorOpen(false);
                                setIsYearSelectorOpen(false);
                            }} className="text-[10px] font-black text-orange-500 uppercase tracking-widest hover:text-orange-400 transition-colors">Go to Today</button>
                            {value && <button type="button" onClick={() => { onChange({ target: { name, value: '', type: 'date' } }); setIsOpen(false); }} className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-red-500 transition-colors">Clear</button>}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// ---------------------------------------------------------------------------
// Main Register Component
export default function Register() {
    const navigate = useNavigate();
    const { theme, changeTheme } = useTheme();

    const [step, setStep] = React.useState(1);
    const [isScanning, setIsScanning] = React.useState(false);
    const [scanError, setScanError] = React.useState('');
    const [scanStatus, setScanStatus] = React.useState('Scanning...');
    
    // Camera state
    const [cameraOpen, setCameraOpen] = React.useState(false);
    const [activeCameraSide, setActiveCameraSide] = React.useState('front');
    const [legalModal, setLegalModal] = React.useState({ isOpen: false, tab: 'privacy' });

    const [formData, setFormData] = React.useState({
        idFront: null,
        idBack: null,
        firstName: '',
        middleName: '',
        lastName: '',
        suffix: '',
        dobDate: null,   // Date object for display
        dob: '',         // ISO string YYYY-MM-DD for payload
        age: '',
        sex: '',
        houseNo: '',
        blockLot: '',
        subdivision: '',
        street: '',
        barangay: '',
        municipality: 'Caloocan City',
        province: 'Metro Manila',
        district: '',
        postalCode: '',
        idType: '',
        idFrontRotation: 0,
        idBackRotation: 0,
        email: '',
        mobile: '',
        password: '',
        confirmPassword: '',
    });

    const [previews, setPreviews] = React.useState({ front: null, back: null });
    const [zoomedSide, setZoomedSide] = React.useState(null); // 'idFront' or 'idBack'
    const [verifiedBadge, setVerifiedBadge] = React.useState('');
    const [registering, setRegistering] = React.useState(false);
    const [registrationError, setRegistrationError] = React.useState('');
    const [ageError, setAgeError] = React.useState('');
    const [showPassword, setShowPassword] = React.useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
    const [hasScanned, setHasScanned] = React.useState(false);
    const [isFaceVerified, setIsFaceVerified] = React.useState(false);
    const [faceMatchConfidence, setFaceMatchConfidence] = React.useState(''); // 'high', 'medium', 'na'
    
    // Verification State
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [verifying, setVerifying] = useState(false);
    const [verifyError, setVerifyError] = useState('');
    const [verifySuccess, setVerifySuccess] = useState('');
    const [resending, setResending] = useState(false);
    const [resendTimer, setResendTimer] = useState(0);
    const [canResend, setCanResend] = useState(true);
    const otpRefs = [useRef(), useRef(), useRef(), useRef(), useRef(), useRef()];

    React.useEffect(() => {
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

    const handleFileUpload = (e, side) => {
        const file = e.target.files[0];
        if (!file) return;
        setFormData(prev => ({ ...prev, [side]: file, [side + 'Rotation']: 0 }));
        setHasScanned(false); // reset scan lock when new ID is uploaded
        const url = URL.createObjectURL(file);
        setPreviews(prev => ({ ...prev, [side === 'idFront' ? 'front' : 'back']: url }));
    };

    const handleRemoveID = (e, side) => {
        e.preventDefault(); e.stopPropagation();
        setFormData(prev => ({ ...prev, [side]: null, [side + 'Rotation']: 0 }));
        setPreviews(prev => ({ ...prev, [side === 'idFront' ? 'front' : 'back']: null }));
    };

    const handleCameraCapture = (file) => {
        const side = activeCameraSide === 'front' ? 'idFront' : 'idBack';
        setFormData(prev => ({ ...prev, [side]: file, [side + 'Rotation']: 0 }));
        setHasScanned(false); // reset scan lock when new photo is taken
        const url = URL.createObjectURL(file);
        setPreviews(prev => ({ ...prev, [activeCameraSide]: url }));
    };

    const openCamera = (e, side) => {
        e.preventDefault();
        setActiveCameraSide(side);
        setCameraOpen(true);
    };

    // Generic change handler
    const handleChange = (e) => {
        let { name, value, type, checked } = e.target;
        
        // Strict Philippine Mobile Number Validation (Numbers Only, Max 11)
        if (name === 'mobile') {
            value = value.replace(/\D/g, ''); // Instantly strip all non-digits
            if (value.length > 11) value = value.slice(0, 11);
        }

        setFormData(prev => {
            const next = { ...prev, [name]: type === 'checkbox' ? checked : value };
            // Auto-calculate age when DOB input changes directly
            if (name === 'dob' && value) {
                const bd = new Date(value + 'T00:00:00');
                const today = new Date();
                let age = today.getFullYear() - bd.getFullYear();
                const m = today.getMonth() - bd.getMonth();
                if (m < 0 || (m === 0 && today.getDate() < bd.getDate())) age--;
                next.age = age >= 0 ? String(age) : '';
                next.dobDate = bd;
                
                // Age range validation (18-100)
                if (age < 18) {
                    setAgeError("Residents must be at least 18 years old to register.");
                } else if (age > 100) {
                    setAgeError("Maximum allowed registration age is 100 years.");
                } else {
                    setAgeError("");
                }
            }
            // Auto-fill postal code and municipality when barangay changes
            if (name === 'barangay' && value) {
                const postal = getPostalCodeForBarangay(value);
                if (postal) {
                    next.postalCode = postal;
                }
                const numMatch = value.match(/\d+/);
                if (numMatch) {
                    const num = parseInt(numMatch[0], 10);
                    if (num >= 1 && num <= 164) next.municipality = 'Caloocan City - South';
                    else if (num >= 165 && num <= 188) next.municipality = 'Caloocan City - North';
                    else next.municipality = 'Caloocan City';
                }
            }
            return next;
        });
    };

    // Scan ID handler
    const handleScanID = async (autoNext = true) => {
        if (!formData.idFront || !formData.idBack) { 
            setScanError('Please upload both the FRONT and BACK of your ID to continue.'); 
            return; 
        }
        setIsScanning(true);
        setScanError('');
        setScanStatus('Initializing Multimodal Audit...');
        let statusInt;

        try {
            // Progressive status updates for the visual audit
            statusInt = setInterval(() => {
                const statuses = [
                    "Analyzing Document Layout...",
                    "Performing Visual Identity Audit...",
                    "Comparing Portrait Photos...",
                    "Verifying Hologram & Security Markers...",
                    "Cross-referencing Person Metadata..."
                ];
                setScanStatus(prev => {
                   const idx = statuses.indexOf(prev);
                   return idx < statuses.length - 1 ? statuses[idx + 1] : prev;
                });
            }, 2500);

            const fd = new FormData();
            fd.append('idFront', formData.idFront);
            if (formData.idBack) fd.append('idBack', formData.idBack);

            const res = await axios.post(`${API_BASE_URL}/api/verify-residency`, fd, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            const result = res.data;
            if (statusInt) clearInterval(statusInt);

            if (!result.success) {
                setScanError(result.error || 'OCR failed. Please try again with a clearer image.');
                return;
            }

            const data = result.extracted_data;

            // ─── VISUAL FACE MATCH VALIDATION ───────────────────────────────
            const faceMatch      = data.is_visual_face_match;
            const faceConfidence = data.face_match_confidence || 'na';

            if (faceMatch === false) {
                // AI confirmed faces are DIFFERENT people — hard block
                setScanError(
                    '🚫 Face Mismatch Detected: The portrait on the front ID does not match the person on the back. ' +
                    'Please ensure both images are from the same physical ID card.'
                );
                setIsFaceVerified(false);
                setFaceMatchConfidence('low');
                if (statusInt) clearInterval(statusInt);
                return;
            }

            setIsFaceVerified(faceMatch !== false); // true or undefined (no back face)
            setFaceMatchConfidence(faceConfidence);

            if (data.is_document_mismatch) {
                setScanError(data.mismatch_reason || 'ID Mismatch: Front and Back images appear to be from different documents.');
                return;
            }

            if (!data.is_north_caloocan) {
                setScanError(data.verification_message || 'Verification Failed: You must be a resident of Caloocan City to register.');
                return;
            }

            // Map OCR data → form fields (only auto-fill idType, barangay, postalCode, and municipality)
            const mapped = mapOcrToForm(data);
            setFormData(prev => ({
                ...prev,
                idType: mapped.idType,
                barangay: mapped.barangay,
                postalCode: mapped.postalCode,
                municipality: mapped.municipality
            }));
            
            if (result.engine === 'mock') {
                setVerifiedBadge(`DEV MOCK — ${data.id_type.toUpperCase()} Verified`);
            } else {
                setVerifiedBadge(`${data.id_type ? data.id_type.toUpperCase() : 'ID'} — Caloocan City Verified`);
            }
            setHasScanned(true); // lock the scan button — scan complete
            if (autoNext) setStep(2);

        } catch (err) {
            console.error('[Register] Scan error:', err);
            if (statusInt) clearInterval(statusInt);
            setScanError(err.response?.data?.detail || 'Could not connect to the verification server. Please check your connection.');
        } finally {
            setIsScanning(false);
            if (statusInt) clearInterval(statusInt);
        }
    };

    const handleSkip = () => { 
        // Obsolete: Skipping is no longer allowed for PULSO registration.
        setScanError('Identity verification is required to continue.'); 
    };
    const nextStep = () => {
        if (step === 2 && ageError) {
            setRegistrationError(ageError);
            return;
        }
        setRegistrationError('');
        setStep(s => Math.min(s + 1, 3));
    };
    const prevStep  = () => setStep(s => Math.max(s - 1, 1));

    const handleOtpChange = (index, value) => {
        if (!/^\d*$/.test(value)) return; // Only digits
        const newOtp = [...otp];
        newOtp[index] = value.slice(-1);
        setOtp(newOtp);
        
        // Auto focus next
        if (value && index < 5) {
            otpRefs[index + 1].current.focus();
        }
    };

    const handleKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            otpRefs[index - 1].current.focus();
        }
    };

    const handlePaste = (e) => {
        e.preventDefault();
        const data = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        if (!data) return;
        
        const newOtp = [...otp];
        data.split('').forEach((char, i) => {
            if (i < 6) newOtp[i] = char;
        });
        setOtp(newOtp);
        
        // Focus the last filled box or the next empty one
        const nextIndex = Math.min(data.length, 5);
        otpRefs[nextIndex].current.focus();
    };

    const handleVerifyCode = async () => {
        const code = otp.join('');
        if (code.length < 6) return;
        
        setVerifying(true);
        setVerifyError('');
        try {
            await axios.post(`${API_BASE_URL}/api/auth/verify-registration`, {
                email: formData.email,
                code: code
            });
            setStep(5);
        } catch (err) {
            setVerifyError(err.response?.data?.detail || 'Invalid verification code. Please try again.');
        } finally {
            setVerifying(false);
        }
    };

    const handleResendCode = async () => {
        if (!canResend) return;
        setResending(true);
        setVerifyError('');
        setVerifySuccess('');
        try {
            await axios.post(`${API_BASE_URL}/api/auth/resend-code`, {
                email: formData.email,
                code: '000000' // Placeholder for validation
            });
            setVerifySuccess("A new 6-digit verification code has been securely dispatched to your email address.");
            setResendTimer(60);
            setCanResend(false);
            setTimeout(() => setVerifySuccess(''), 5000);
        } catch (err) {
            setVerifyError("Failed to resend code.");
        } finally {
            setResending(false);
        }
    };

    // Registration submit
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (formData.password !== formData.confirmPassword) {
            setRegistrationError("Passwords do not match.");
            return;
        }
        setRegistering(true);
        setRegistrationError('');
        try {
            const addressParts = [formData.houseNo, formData.blockLot, formData.subdivision, formData.street].filter(Boolean);
            const payload = {
                full_name: [formData.firstName, formData.middleName, formData.lastName, formData.suffix].filter(Boolean).join(' '),
                email: formData.email,
                phone_number: formData.mobile,
                password: formData.password,
                role: 'resident',
                address: [...addressParts, formData.barangay, formData.municipality].filter(Boolean).join(', '),
                barangay: formData.barangay,
            };
            const res = await axios.post(`${API_BASE_URL}/api/auth/register`, payload);
            if (res.status === 200 || res.status === 201) {
                clearAuthSession();
                setResendTimer(60);
                setCanResend(false);
                setStep(4);
            }
        } catch (err) {
            setRegistrationError(err.response?.data?.detail || 'Registration failed. Please try again or check your account details.');
        } finally {
            setRegistering(false);
        }
    };

    // Step 2 "Next" is enabled when core fields are filled and age is valid (street is optional)
    const step2Valid = formData.firstName && formData.lastName && formData.dob && formData.barangay && !ageError;

    return (
        <div className="relative min-h-screen w-full bg-gradient-to-b from-white via-[#fffbf9] to-[#fff7f0]/40 dark:from-[#070a12] dark:via-[#090e1a] dark:to-[#070a12] font-sans text-slate-900 dark:text-white flex flex-col justify-between transition-colors duration-300 overflow-x-hidden">

            {/* ── Background Seal Watermark (Inherited from Landing Page) ───── */}
            <div
                className="absolute inset-0 overflow-hidden pointer-events-none select-none z-0 flex items-center justify-end"
                aria-hidden="true"
            >
                <div className="relative w-[340px] h-[340px] xs:w-[420px] xs:h-[420px] sm:w-[540px] sm:h-[540px] lg:w-[680px] lg:h-[680px] mr-[-8%] sm:mr-[2%] lg:mr-[5%] opacity-[0.14] sm:opacity-[0.16] dark:opacity-[0.10] transition-all duration-500">
                    <div className="absolute inset-0 rounded-full border-2 border-orange-500/30 dark:border-white/20 animate-pulse" style={{ animationDuration: '6s' }} />
                    <div className="absolute inset-[-18px] sm:inset-[-24px] rounded-full border border-dashed border-[#ff6b00]/40 dark:border-[#ff6b00]/30" />
                    <div className="absolute inset-[-36px] sm:inset-[-50px] rounded-full border border-slate-400/25 dark:border-white/10" />

                    <img
                        src="/engineering-logo.jpg"
                        alt="Official Caloocan City Seal Watermark"
                        className="w-full h-full object-contain rounded-full drop-shadow-sm dark:brightness-105"
                        loading="eager"
                    />

                    <div className="absolute inset-0 rounded-full bg-radial from-transparent via-transparent to-white/40 dark:to-[#070a12]/50 pointer-events-none" />
                </div>
            </div>

            {/* ── Top Header: Logo on top-left & Home Section ───────────── */}
            <header className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-5 sm:pt-7 w-full flex justify-between items-center">
                {/* Logo on top-left linking to home */}
                <Link
                    to="/"
                    className="flex items-center gap-2 group transition-opacity hover:opacity-90 cursor-pointer"
                    title="Caloocan City PULSO Home"
                >
                    <Branding size="h-9 w-9 sm:h-10 sm:w-10" />
                </Link>

                {/* Right side: Theme Toggle & Home Navigation */}
                <div className="flex items-center gap-2.5 sm:gap-3">
                    <ThemeToggle />
                    <Link
                        to="/"
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/85 dark:bg-slate-800/85 hover:bg-white dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 hover:text-[#ff6b00] dark:hover:text-[#ff6b00] border border-slate-200 dark:border-slate-700 text-xs font-bold transition-all shadow-2xs cursor-pointer"
                        title="Return to Home Section"
                    >
                        <Home size={14} className="text-[#ff6b00]" />
                        <span className="hidden sm:inline">Home</span>
                    </Link>
                </div>
            </header>

            {/* ── Main Content Grid (5-col / 7-col ratio in max-w-7xl) ────── */}
            <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full py-6 sm:py-10 lg:py-14 flex-1 flex flex-col justify-center">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
                    
                    {/* Left: Professional Community Spotlight Panel (5 cols) */}
                    <div className="lg:col-span-5 text-left max-w-xl mx-auto lg:mx-0 w-full">
                        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }}>
                            
                            {/* Super-Badge */}
                            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-50 dark:bg-orange-950/50 text-[#ff6b00] border border-orange-200 dark:border-orange-800/60 text-[11px] sm:text-xs font-bold uppercase tracking-wider mb-4 shadow-2xs">
                                <span>🏛 CITY OF CALOOCAN • CITIZEN VERIFICATION</span>
                            </div>
                            
                            {/* 800-weight Display Title */}
                            <h1 className="font-heading font-black text-3xl sm:text-4xl lg:text-5xl text-slate-900 dark:text-white leading-[1.12] mb-4 tracking-tight">
                                Become the <span className="text-[#ff6b00]">Eyes &amp; Ears</span> of Your Community.
                            </h1>
                            
                            {/* Subtitle */}
                            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 font-normal leading-relaxed mb-6 max-w-xl">
                                Join PULSO to report municipal infrastructure hazards, track field repair dispatches in real-time, and collaborate directly with City Engineering crews across Caloocan.
                            </p>


                        </motion.div>
                    </div>

                    {/* Right: Registration Form Wizard Panel (7 cols) */}
                    <div className="lg:col-span-7 w-full max-w-2xl lg:max-w-none mx-auto">
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}>
                            <div className="relative bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-8 lg:p-10 shadow-xl transition-colors duration-300">
                                
                                {/* Stepper: Segmented Step Bar */}
                                <div className="grid grid-cols-4 gap-1.5 sm:gap-2 mb-6 p-1.5 rounded-xl bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
                                    {[
                                        { num: 1, label: 'Identity' },
                                        { num: 2, label: 'Details' },
                                        { num: 3, label: 'Credentials' },
                                        { num: 4, label: 'Verify' },
                                    ].map((s) => {
                                        const isActive = step === s.num;
                                        const isDone = step > s.num;
                                        return (
                                            <div
                                                key={s.num}
                                                className={`flex items-center justify-center gap-1.5 py-2 px-1 rounded-lg text-center transition-all ${
                                                    isActive
                                                        ? 'bg-[#ff6b00] text-white shadow-xs font-bold'
                                                        : isDone
                                                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-200 dark:border-emerald-800/40'
                                                        : 'text-slate-500 dark:text-slate-400 font-medium'
                                                }`}
                                            >
                                                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono-data shrink-0 ${
                                                    isActive
                                                        ? 'bg-white text-[#ff6b00] font-black'
                                                        : isDone
                                                        ? 'bg-emerald-500 text-white'
                                                        : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                                                }`}>
                                                    {isDone ? <Check size={11} /> : s.num}
                                                </span>
                                                <span className="text-[11px] sm:text-xs truncate hidden sm:inline">
                                                    {s.label}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>

                    {/* Step title */}
                    <div className="mb-5">
                        <h2 className="text-xl font-black text-slate-900 dark:text-white">
                            {step === 1 && 'Identity Verification'}
                            {step === 2 && 'Personal Information'}
                            {step === 3 && 'Account Credentials'}
                            {step === 4 && 'Account Verification'}
                            {step === 5 && 'Registration Complete!'}
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                            {step === 1 && 'Upload a valid Philippine government-issued ID to verify your identity.'}
                            {step === 2 && 'Review and complete your personal information.'}
                            {step === 3 && 'Set up your login credentials.'}
                            {step === 4 && 'Enter the 6-digit code sent to your email.'}
                        </p>
                    </div>

                    <AnimatePresence mode="wait">
                        {/* ── STEP 1: ID Upload ── */}
                        {step === 1 && (
                            <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
                                
                                {/* ID Cards Grid */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                                    
                                    {/* ID Front Card */}
                                    <div className={`relative group rounded-2xl border-2 transition-all duration-300 overflow-hidden ${
                                        formData.idFront 
                                            ? 'border-solid bg-emerald-500/5 dark:bg-emerald-500/10 border-emerald-500/40 shadow-xs' 
                                            : 'border-dashed border-slate-300 dark:border-slate-700 hover:border-[#ff6b00] dark:hover:border-[#ff6b00] bg-slate-50/60 dark:bg-slate-800/40'
                                    }`}>
                                        <input type="file" id="idFront" accept="image/*" onChange={e => handleFileUpload(e, 'idFront')} className="hidden" />
                                        
                                        {/* Card Header */}
                                        <div className="flex items-center justify-between p-3.5 border-b border-slate-200/70 dark:border-slate-700/60 bg-white/70 dark:bg-slate-900/60">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${formData.idFront ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-orange-500/10 text-orange-600 dark:text-orange-400'}`}>
                                                    {formData.idFront ? <CheckCircle size={15} /> : <FileCheck size={15} />}
                                                </div>
                                                <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">ID Front</span>
                                            </div>
                                            
                                            <span className={`text-[10px] font-mono-data font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                                formData.idFront ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' : 'bg-orange-100 dark:bg-orange-950/60 text-[#ff6b00] dark:text-orange-300 border border-orange-200 dark:border-orange-800'
                                            }`}>
                                                {formData.idFront ? 'Ready' : 'Required'}
                                            </span>
                                        </div>

                                        {/* Card Content Area */}
                                        <div className="p-4 flex flex-col items-center justify-center min-h-[160px] relative">
                                            {previews.front ? (
                                                <div className="relative w-full h-36 rounded-xl overflow-hidden bg-slate-900 flex items-center justify-center group/preview">
                                                    <motion.img 
                                                        src={previews.front} 
                                                        alt="Front ID" 
                                                        animate={{ rotate: formData.idFrontRotation }}
                                                        transition={{ duration: 0.3 }}
                                                        className="max-w-full max-h-full object-contain" 
                                                    />
                                                    
                                                    {isScanning && (
                                                        <div className="absolute inset-0 bg-orange-500/20 backdrop-blur-[1px] flex items-center justify-center">
                                                            <div className="w-full h-1 bg-gradient-to-r from-transparent via-orange-400 to-transparent absolute top-0 animate-pulse" />
                                                            <span className="text-xs font-bold text-white bg-slate-900/80 px-3 py-1 rounded-full shadow">Scanning...</span>
                                                        </div>
                                                    )}

                                                    {/* Hover Overlay Controls */}
                                                    {!isScanning && (
                                                        <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover/preview:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                            <button 
                                                                type="button" 
                                                                onClick={() => setZoomedSide('idFront')}
                                                                className="p-2 bg-white/20 hover:bg-white/40 text-white rounded-full transition-all backdrop-blur-sm cursor-pointer"
                                                                title="Zoom View"
                                                            >
                                                                <ZoomIn size={16} />
                                                            </button>
                                                            <button 
                                                                type="button" 
                                                                onClick={e => { e.preventDefault(); setFormData(prev => ({ ...prev, idFrontRotation: (prev.idFrontRotation || 0) + 90 })); }}
                                                                className="p-2 bg-white/20 hover:bg-white/40 text-white rounded-full transition-all backdrop-blur-sm cursor-pointer"
                                                                title="Rotate Image"
                                                            >
                                                                <RotateCw size={16} />
                                                            </button>
                                                            <button 
                                                                type="button" 
                                                                onClick={e => handleRemoveID(e, 'idFront')}
                                                                className="p-2 bg-red-500/80 hover:bg-red-600 text-white rounded-full transition-all cursor-pointer"
                                                                title="Remove Image"
                                                            >
                                                                <X size={16} />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-center text-center py-2">
                                                    <UploadCloud size={32} className="text-slate-400 dark:text-slate-500 mb-2" />
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-3">Upload a clear photo of your ID Front</p>
                                                    
                                                    <div className="flex gap-2 w-full justify-center">
                                                        <label htmlFor="idFront" className="flex-1 max-w-[125px] cursor-pointer bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-2xs">
                                                            <UploadCloud size={13} className="text-[#ff6b00]" /> Upload
                                                        </label>
                                                        <button 
                                                            type="button"
                                                            onClick={(e) => openCamera(e, 'front')}
                                                            className="flex-1 max-w-[125px] bg-orange-50 dark:bg-orange-950/40 hover:bg-orange-100 dark:hover:bg-orange-900/60 text-[#ff6b00] border border-orange-200 dark:border-orange-800/60 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                                                        >
                                                            <Camera size={13} /> Camera
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* ID Back Card */}
                                    <div className={`relative group rounded-2xl border-2 transition-all duration-300 overflow-hidden ${
                                        formData.idBack 
                                            ? 'border-solid bg-emerald-500/5 dark:bg-emerald-500/10 border-emerald-500/40 shadow-xs' 
                                            : 'border-dashed border-slate-300 dark:border-slate-700 hover:border-[#ff6b00] dark:hover:border-[#ff6b00] bg-slate-50/60 dark:bg-slate-800/40'
                                    }`}>
                                        <input type="file" id="idBack" accept="image/*" onChange={e => handleFileUpload(e, 'idBack')} className="hidden" />
                                        
                                        {/* Card Header */}
                                        <div className="flex items-center justify-between p-3.5 border-b border-slate-200/70 dark:border-slate-700/60 bg-white/70 dark:bg-slate-900/60">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${formData.idBack ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-orange-500/10 text-orange-600 dark:text-orange-400'}`}>
                                                    {formData.idBack ? <CheckCircle size={15} /> : <FileCheck size={15} />}
                                                </div>
                                                <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">ID Back</span>
                                            </div>
                                            
                                            <span className={`text-[10px] font-mono-data font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                                formData.idBack ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' : 'bg-orange-100 dark:bg-orange-950/60 text-[#ff6b00] dark:text-orange-300 border border-orange-200 dark:border-orange-800'
                                            }`}>
                                                {formData.idBack ? 'Ready' : 'Required'}
                                            </span>
                                        </div>

                                        {/* Card Content Area */}
                                        <div className="p-4 flex flex-col items-center justify-center min-h-[160px] relative">
                                            {previews.back ? (
                                                <div className="relative w-full h-36 rounded-xl overflow-hidden bg-slate-900 flex items-center justify-center group/preview">
                                                    <motion.img 
                                                        src={previews.back} 
                                                        alt="Back ID" 
                                                        animate={{ rotate: formData.idBackRotation }}
                                                        transition={{ duration: 0.3 }}
                                                        className="max-w-full max-h-full object-contain" 
                                                    />
                                                    
                                                    {isScanning && (
                                                        <div className="absolute inset-0 bg-orange-500/20 backdrop-blur-[1px] flex items-center justify-center">
                                                            <div className="w-full h-1 bg-gradient-to-r from-transparent via-orange-400 to-transparent absolute top-0 animate-pulse" />
                                                            <span className="text-xs font-bold text-white bg-slate-900/80 px-3 py-1 rounded-full shadow">Scanning...</span>
                                                        </div>
                                                    )}

                                                    {/* Hover Overlay Controls */}
                                                    {!isScanning && (
                                                        <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover/preview:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                            <button 
                                                                type="button" 
                                                                onClick={() => setZoomedSide('idBack')}
                                                                className="p-2 bg-white/20 hover:bg-white/40 text-white rounded-full transition-all backdrop-blur-sm cursor-pointer"
                                                                title="Zoom View"
                                                            >
                                                                <ZoomIn size={16} />
                                                            </button>
                                                            <button 
                                                                type="button" 
                                                                onClick={e => { e.preventDefault(); setFormData(prev => ({ ...prev, idBackRotation: (prev.idBackRotation || 0) + 90 })); }}
                                                                className="p-2 bg-white/20 hover:bg-white/40 text-white rounded-full transition-all backdrop-blur-sm cursor-pointer"
                                                                title="Rotate Image"
                                                            >
                                                                <RotateCw size={16} />
                                                            </button>
                                                            <button 
                                                                type="button" 
                                                                onClick={e => handleRemoveID(e, 'idBack')}
                                                                className="p-2 bg-red-500/80 hover:bg-red-600 text-white rounded-full transition-all cursor-pointer"
                                                                title="Remove Image"
                                                            >
                                                                <X size={16} />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-center text-center py-2">
                                                    <UploadCloud size={32} className="text-slate-400 dark:text-slate-500 mb-2" />
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-3">Upload a clear photo of your ID Back</p>
                                                    
                                                    <div className="flex gap-2 w-full justify-center">
                                                        <label htmlFor="idBack" className="flex-1 max-w-[125px] cursor-pointer bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-2xs">
                                                            <UploadCloud size={13} className="text-[#ff6b00]" /> Upload
                                                        </label>
                                                        <button 
                                                            type="button"
                                                            onClick={(e) => openCamera(e, 'back')}
                                                            className="flex-1 max-w-[125px] bg-orange-50 dark:bg-orange-950/40 hover:bg-orange-100 dark:hover:bg-orange-900/60 text-[#ff6b00] border border-orange-200 dark:border-orange-800/60 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                                                        >
                                                            <Camera size={13} /> Camera
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Tips Box Callout - Neutral Glassmorphism */}
                                <div className="bg-slate-50/70 dark:bg-slate-800/50 backdrop-blur-md border border-slate-200/80 dark:border-slate-700/70 text-slate-700 dark:text-slate-300 rounded-xl p-3 text-xs flex items-start gap-2.5 mb-5 shadow-2xs">
                                    <div className="w-5 h-5 rounded-md bg-slate-200/70 dark:bg-slate-700/70 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0 mt-0.5">
                                        <Info size={14} />
                                    </div>
                                    <div className="leading-relaxed">
                                        <span className="font-bold text-slate-900 dark:text-white mr-1">Tips for best results:</span>
                                        <span>Lay ID flat under bright lighting. Avoid glare, shadows, or covering text. Ensure all details are clearly legible.</span>
                                    </div>
                                </div>

                                {/* Error Banner */}
                                {scanError && (
                                    <div className="mb-5 bg-red-500/10 border border-red-500/20 rounded-xl p-3.5 flex gap-3 items-start text-xs text-red-600 dark:text-red-400 font-medium">
                                        <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-500" />
                                        <span>{scanError}</span>
                                    </div>
                                )}

                                {/* Action Buttons */}
                                <div className="flex flex-col gap-2.5">
                                    <button
                                        type="button"
                                        onClick={handleScanID}
                                        disabled={!formData.idFront || !formData.idBack || isScanning}
                                        className="w-full bg-[#ff6b00] hover:bg-[#e65c00] active:scale-[0.99] text-white py-3.5 px-4 rounded-xl font-heading font-bold text-sm tracking-wide transition-all shadow-md hover:shadow-lg hover:shadow-orange-500/25 min-h-[48px] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b00]"
                                    >
                                        {isScanning ? (
                                            <><Loader2 size={18} className="animate-spin" /> {scanStatus}</>
                                        ) : (
                                            <><ShieldCheck size={18} /> Scan Documents &amp; Continue <ChevronRight size={16} /></>
                                        )}
                                    </button>
                                    <p className="text-[10px] text-center font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Both Front and Back images are required for verification</p>
                                </div>
                            </motion.div>
                        )}

                        {/* ── STEP 2: Personal Info ── */}
                        {step === 2 && (
                            <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
                                {/* Verification badge */}
                                {verifiedBadge && (
                                    <div className="mb-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-3 flex gap-3 items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-green-500/10 text-green-600 rounded-full flex items-center justify-center shrink-0">
                                                <ShieldCheck size={18} />
                                            </div>
                                            <div>
                                                <p className="font-bold text-green-700 dark:text-green-400 text-xs">Identity Verified via AI</p>
                                                <p className="text-[11px] text-green-600/80 dark:text-green-500/70">Intelligence Parse Complete. Please review your details below.</p>
                                            </div>
                                        </div>
                                        {formData.idType && formData.idType !== 'Unknown Document' && (
                                            <div className="shrink-0 flex items-center gap-1.5 px-3 py-1 bg-green-500/20 text-green-400 border border-green-500/30 rounded-lg">
                                                <span className="text-[10px] font-black uppercase tracking-widest">{formData.idType}</span>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Required Fields Legend */}
                                <div className="flex items-center gap-1.5 mb-2 px-1 text-xs text-slate-500 dark:text-slate-400 font-medium">
                                    <span className="text-red-500 font-black text-sm">*</span> Indicates a required field
                                </div>

                                {/* Full Name */}
                                <SectionHeading>Full Name</SectionHeading>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                    <InputField label="First Name" name="firstName" value={formData.firstName} onChange={handleChange} required />
                                    <InputField label="Middle Name" name="middleName" value={formData.middleName} onChange={handleChange} placeholder="Optional" />
                                    <InputField label="Last Name" name="lastName" value={formData.lastName} onChange={handleChange} required />
                                    <InputField label="Suffix" name="suffix" value={formData.suffix} onChange={handleChange} placeholder="e.g. Jr." />
                                </div>

                                {/* Demographics */}
                                <SectionHeading>Demographics</SectionHeading>
                                <div className="grid grid-cols-3 gap-2">
                                    <CustomDatePicker 
                                        label="Date of Birth"
                                        name="dob"
                                        value={formData.dob} 
                                        onChange={handleChange} 
                                        required 
                                    />
                                    <InputField label="Age" name="age" value={formData.age} onChange={handleChange} readOnly placeholder="Auto-filled" />
                                    <CustomSelect label="Sex" name="sex" value={formData.sex} onChange={handleChange} options={['Male', 'Female']} required />
                                </div>

                                <AnimatePresence>
                                    {ageError && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3"
                                        >
                                            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
                                            <p className="text-xs font-bold text-red-500">{ageError}</p>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* Address */}
                                <SectionHeading>Complete Address</SectionHeading>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                    <InputField label="House Number / Floor / Unit" name="houseNo" value={formData.houseNo} onChange={handleChange} />
                                    <InputField label="Block & Lot" name="blockLot" value={formData.blockLot} onChange={handleChange} />
                                    <InputField label="Building / Subdivision / Village" name="subdivision" value={formData.subdivision} onChange={handleChange} className="col-span-2 md:col-span-1" />
                                    <InputField label="Street / Avenue / Corner / Road" name="street" value={formData.street} onChange={handleChange} className="col-span-2" />
                                    <CustomSelect label="Barangay" name="barangay" value={formData.barangay} onChange={handleChange} options={Array.from({ length: 188 }, (_, i) => `Barangay ${1 + i}`)} required />
                                    <InputField label="City" name="municipality" value={formData.municipality} onChange={handleChange} readOnly />
                                    <InputField label="Province" name="province" value={formData.province} onChange={handleChange} readOnly />
                                    <div className="relative">
                                        <div className="flex items-center gap-1 mb-1.5 pl-0.5">
                                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400">Postal Code</label>
                                            <div className="relative flex items-center justify-center">
                                                <Info size={13} className="peer text-slate-400 cursor-help hover:text-orange-500 transition-colors" />
                                                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-slate-800 dark:bg-slate-700 text-white text-[11px] font-medium rounded-lg py-1.5 px-3 opacity-0 peer-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-lg">
                                                    {formData.barangay ? `Postal code for ${formData.barangay}` : 'Select a barangay to auto-fill'}
                                                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-[5px] border-transparent border-t-slate-800 dark:border-t-slate-700"></div>
                                                </div>
                                            </div>
                                        </div>
                                        <input
                                            type="text"
                                            name="postalCode"
                                            value={formData.postalCode}
                                            readOnly
                                            placeholder="Auto-filled"
                                            className="w-full border text-sm rounded-xl px-3 py-2.5 outline-none transition-all bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed font-medium"
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-3 mt-5">
                                    <button type="button" onClick={prevStep} className="w-1/3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 py-3 rounded-2xl font-bold text-sm transition-all">Back</button>
                                    <button
                                        type="button"
                                        onClick={nextStep}
                                        disabled={!step2Valid}
                                        className="w-2/3 bg-[#ff6b00] hover:bg-[#e65c00] active:scale-[0.99] text-white py-3.5 px-4 rounded-xl font-heading font-bold text-sm tracking-wide transition-all shadow-md hover:shadow-lg hover:shadow-orange-500/25 min-h-[48px] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b00]"
                                    >
                                        Next Step
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {/* ── STEP 3: Account Credentials ── */}
                        {step === 3 && (
                            <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
                                <form onSubmit={handleSubmit}>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 pl-0.5">Email Address <span className="text-red-400">*</span></label>
                                            <div className="relative">
                                                <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                                <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="you@email.com" required
                                                    className="w-full bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 text-sm rounded-xl pl-9 pr-3 py-2.5 focus:ring-2 focus:ring-orange-500 outline-none transition-all" />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 pl-0.5">Mobile Number <span className="text-red-400">*</span></label>
                                            <div className="relative">
                                                <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                                <input type="tel" name="mobile" value={formData.mobile} onChange={handleChange} placeholder="09XXXXXXXXX" required
                                                    className="w-full bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 text-sm rounded-xl pl-9 pr-3 py-2.5 focus:ring-2 focus:ring-orange-500 outline-none transition-all" />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 pl-0.5">Password <span className="text-red-400">*</span></label>
                                            <div className="relative">
                                                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                                <input type={showPassword ? "text" : "password"} name="password" value={formData.password} onChange={handleChange} placeholder="Min. 8 characters" required minLength={8}
                                                    className="w-full bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 text-sm rounded-xl pl-9 pr-10 py-2.5 focus:ring-2 focus:ring-orange-500 outline-none transition-all" />
                                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-orange-500 transition-colors focus:outline-none" aria-label={showPassword ? "Hide password" : "Show password"}>
                                                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                                                </button>
                                            </div>

                                            {/* Password Strength Meter */}
                                            {formData.password && (
                                                <div className="mt-2 space-y-2 px-1">
                                                    <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest">
                                                        <span className="text-slate-400">Security Strength</span>
                                                        <span className={
                                                            formData.password.length < 8 || !/[A-Z]/.test(formData.password) || !/[0-9]/.test(formData.password) || !/[^A-Za-z0-9]/.test(formData.password)
                                                                ? (formData.password.length < 8 ? "text-red-500" : "text-orange-500")
                                                                : "text-green-500"
                                                        }>
                                                            {formData.password.length < 8 ? "Weak" : (
                                                                !/[A-Z]/.test(formData.password) || !/[0-9]/.test(formData.password) || !/[^A-Za-z0-9]/.test(formData.password)
                                                                    ? "Medium"
                                                                    : "Strong"
                                                            )}
                                                        </span>
                                                    </div>
                                                    <div className="h-1 w-full bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden flex gap-1">
                                                        <div className={`h-full transition-all duration-500 rounded-full ${formData.password.length >= 8 ? 'bg-orange-500 w-1/4' : 'bg-red-500 w-1/4'}`} />
                                                        <div className={`h-full transition-all duration-500 rounded-full ${/[A-Z]/.test(formData.password) ? 'bg-orange-500 w-1/4' : 'bg-slate-200 dark:bg-white/5 w-1/4'}`} />
                                                        <div className={`h-full transition-all duration-500 rounded-full ${/[0-9]/.test(formData.password) ? 'bg-orange-500 w-1/4' : 'bg-slate-200 dark:bg-white/5 w-1/4'}`} />
                                                        <div className={`h-full transition-all duration-500 rounded-full ${/[^A-Za-z0-9]/.test(formData.password) ? 'bg-green-500 w-1/4' : 'bg-slate-200 dark:bg-white/5 w-1/4'}`} />
                                                    </div>
                                                    <div className="flex flex-wrap gap-2 pt-1 uppercase">
                                                        <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border transition-all ${formData.password.length >= 8 ? 'bg-green-500/10 border-green-500/20 text-green-500' : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-400 opacity-50'}`}>8+ Chars</span>
                                                        <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border transition-all ${/[A-Z]/.test(formData.password) ? 'bg-green-500/10 border-green-500/20 text-green-500' : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-400 opacity-50'}`}>Capital</span>
                                                        <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border transition-all ${/[0-9]/.test(formData.password) ? 'bg-green-500/10 border-green-500/20 text-green-500' : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-400 opacity-50'}`}>Number</span>
                                                        <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border transition-all ${/[^A-Za-z0-9]/.test(formData.password) ? 'bg-green-500/10 border-green-500/20 text-green-500' : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-400 opacity-50'}`}>Special</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 pl-0.5">Confirm Password <span className="text-red-400">*</span></label>
                                            <div className="relative">
                                                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                                <input type={showConfirmPassword ? "text" : "password"} name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} placeholder="Repeat password" required
                                                    className={`w-full bg-white dark:bg-slate-800/60 border text-slate-900 dark:text-white placeholder-slate-400 text-sm rounded-xl pl-9 pr-10 py-2.5 focus:ring-2 focus:ring-orange-500 outline-none transition-all
                                                        ${formData.confirmPassword && formData.password !== formData.confirmPassword
                                                            ? 'border-red-400 focus:ring-red-400'
                                                            : 'border-slate-200 dark:border-slate-700'}`}
                                                />
                                                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-orange-500 transition-colors focus:outline-none" aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}>
                                                    {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                                                </button>
                                            </div>
                                            {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                                                <p className="text-xs text-red-500 mt-1 pl-0.5">Passwords do not match</p>
                                            )}
                                        </div>
                                    </div>

                                    {registrationError && (
                                        <div className="mb-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3 text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
                                            <AlertCircle size={15} className="shrink-0" />
                                            {registrationError}
                                        </div>
                                    )}

                                    <div className="flex gap-3 mt-4">
                                        <button type="button" onClick={prevStep} className="w-1/3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 py-3 rounded-2xl font-bold text-sm transition-all">Back</button>
                                        <button
                                            type="submit"
                                            disabled={!formData.email || !formData.mobile || !formData.password || formData.password !== formData.confirmPassword || registering}
                                            className="w-2/3 bg-[#ff6b00] hover:bg-[#e65c00] active:scale-[0.99] text-white py-3.5 px-4 rounded-xl font-heading font-bold text-sm tracking-wide transition-all shadow-md hover:shadow-lg hover:shadow-orange-500/25 min-h-[48px] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b00]"
                                        >
                                            {registering ? <><Loader2 size={17} className="animate-spin" /> Creating Account...</> : 'Create My Account'}
                                        </button>
                                    </div>
                                </form>
                            </motion.div>
                        )}

                        {/* ── STEP 4: Account Verification ── */}
                        {step === 4 && (
                            <motion.div key="s4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}
                                className="flex flex-col items-center text-center py-4">
                                <div className="mb-6">
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                                        Please enter the code we sent to<br/>
                                        <span className="font-bold text-slate-900 dark:text-white break-all">{formData.email}</span>
                                    </p>
                                    
                                    <div className="flex justify-center gap-2 mb-8">
                                        {otp.map((digit, index) => (
                                            <input
                                                key={index}
                                                ref={otpRefs[index]}
                                                type="text"
                                                maxLength="1"
                                                value={digit}
                                                onChange={(e) => handleOtpChange(index, e.target.value)}
                                                onKeyDown={(e) => handleKeyDown(index, e)}
                                                onPaste={handlePaste}
                                                className="w-12 h-14 text-center text-2xl font-black bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all text-slate-900 dark:text-white"
                                            />
                                        ))}
                                    </div>
                                    
                                    {verifyError && (
                                        <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3 text-sm text-red-600 dark:text-red-400 flex items-center justify-center gap-2 text-left">
                                            <AlertCircle size={15} className="shrink-0" />
                                            <span>{verifyError}</span>
                                        </div>
                                    )}
                                    {verifySuccess && (
                                        <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
                                            className="mb-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-3 text-sm text-green-700 dark:text-green-400 flex items-center justify-center gap-2 text-left shadow-sm">
                                            <CheckCircle size={15} className="shrink-0" />
                                            <span>{verifySuccess}</span>
                                        </motion.div>
                                    )}

                                    <button
                                        type="button"
                                        onClick={handleVerifyCode}
                                        disabled={otp.some(d => !d) || verifying}
                                        className="w-full bg-[#ff6b00] hover:bg-[#e65c00] active:scale-[0.99] text-white py-3.5 px-4 rounded-xl font-heading font-bold text-sm tracking-wide transition-all shadow-md hover:shadow-lg hover:shadow-orange-500/25 min-h-[48px] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-2 mb-6 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b00]"
                                    >
                                        {verifying ? <><Loader2 size={18} className="animate-spin" /> Verifying...</> : 'Confirm Account'}
                                    </button>

                                    <div className="text-center mt-4">
                                        {resendTimer > 0 ? (
                                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-slate-100/50 dark:bg-white/5 py-2 px-4 rounded-full inline-block">
                                                Resend code in <span className="text-orange-600">{resendTimer}s</span>
                                            </p>
                                        ) : (
                                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                                I didn't receive a code!{' '}
                                                <button 
                                                    type="button" 
                                                    onClick={handleResendCode}
                                                    disabled={resending || !canResend}
                                                    className="text-orange-600 dark:text-orange-500 font-bold hover:underline disabled:opacity-50"
                                                >
                                                    {resending ? 'Sending...' : 'Please Resend'}
                                                </button>
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* ── STEP 5: Success ── */}
                        {step === 5 && (
                            <motion.div key="s5" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }}
                                className="flex flex-col items-center text-center py-6 gap-4">
                                <div className="w-20 h-20 bg-green-100 dark:bg-green-500/20 text-green-500 rounded-full flex items-center justify-center">
                                    <CheckCircle size={40} />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Account Verified!</h3>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs">Your PULSO account has been successfully verified. Welcome to the community!</p>
                                </div>
                                <Link to="/login" className="mt-2 bg-[#ff6b00] hover:bg-[#e65c00] active:scale-[0.99] text-white px-8 py-3.5 rounded-xl font-heading font-bold text-sm tracking-wide transition-all shadow-md hover:shadow-lg hover:shadow-orange-500/25 flex items-center gap-2 cursor-pointer">
                                    Proceed to Login
                                </Link>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Footer link */}
                    {step < 5 && (
                        <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800/50 text-center relative z-20">
                            <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                                Already have an account?{' '}
                                <Link to="/login" className="text-[#ff6b00] font-bold hover:underline decoration-2 underline-offset-4">Sign In</Link>
                            </p>
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    </div>
</main>

            {/* ── Standard Civic Legal Footer Strip ───────────────────────── */}
            <footer className="relative z-10 w-full bg-slate-100/80 dark:bg-[#060911] border-t border-slate-200/80 dark:border-slate-800/80 py-3.5 text-slate-500 dark:text-slate-400 text-[11px] transition-colors">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
                    <span>
                        &copy; {new Date().getFullYear()} LGU Caloocan City. Encrypted under Data Privacy Act (RA 10173).
                    </span>
                    <div className="flex items-center gap-4 font-semibold">
                        <button 
                            type="button" 
                            onClick={() => setLegalModal({ isOpen: true, tab: 'privacy' })} 
                            className="hover:text-[#ff6b00] transition-colors cursor-pointer"
                        >
                            Privacy Policy
                        </button>
                        <span>•</span>
                        <button 
                            type="button" 
                            onClick={() => setLegalModal({ isOpen: true, tab: 'terms' })} 
                            className="hover:text-[#ff6b00] transition-colors cursor-pointer"
                        >
                            Terms of Service
                        </button>
                        <span>•</span>
                        <a 
                            href="/#hotlines" 
                            className="hover:text-[#ff6b00] transition-colors cursor-pointer"
                        >
                            LGU Engineering Directory
                        </a>
                    </div>
                </div>
            </footer>

            {/* Legal Modal */}
            <LegalModal
                isOpen={legalModal.isOpen}
                onClose={() => setLegalModal(prev => ({ ...prev, isOpen: false }))}
                initialTab={legalModal.tab}
            />



            {/* Zoom modal */}
            <AnimatePresence>
                {zoomedSide && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 cursor-pointer"
                        onClick={() => setZoomedSide(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9 }} 
                            animate={{ 
                                scale: 1, 
                                rotate: formData[zoomedSide + 'Rotation'],
                                rotateY: isScanning ? [0, 180, 360] : 0
                            }} 
                            exit={{ scale: 0.9 }} 
                            transition={{ 
                                type: "spring", stiffness: 200, damping: 20,
                                rotateY: isScanning ? { duration: 3, repeat: Infinity, ease: "linear" } : { duration: 0.3 }
                            }}
                            className="relative max-w-full max-h-[80vh] flex items-center justify-center transform-gpu"
                            style={{ perspective: 1000, transformStyle: 'preserve-3d' }}
                            onClick={e => e.stopPropagation()}
                        >
                            <img 
                                src={zoomedSide === 'idFront' ? previews.front : previews.back} 
                                alt="Zoomed document"
                                className="max-w-full max-h-[80vh] object-contain rounded-xl shadow-2xl"
                            />
                            {isScanning && (
                                <>
                                    <div className="absolute inset-0 bg-orange-500/10 mix-blend-overlay rounded-xl" />
                                    <motion.div 
                                        className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-orange-400 to-transparent shadow-[0_0_20px_rgba(249,115,22,1)] z-30"
                                        animate={{ top: ['0%', '100%', '0%'] }}
                                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                    />
                                </>
                            )}
                        </motion.div>
                        
                        {/* Top Right Controls */}
                        <div className="absolute top-5 right-5 flex items-center gap-3">
                            {/* Scan once: show button only if not yet scanned & not currently scanning */}
                            {!hasScanned && !isScanning && (
                                <button 
                                    className="flex items-center gap-2 px-4 py-2.5 rounded-full font-bold text-sm bg-orange-500 hover:bg-orange-600 text-white transition-all shadow-lg active:scale-95"
                                    onClick={e => { e.stopPropagation(); handleScanID(false); }}
                                >
                                    <ShieldCheck size={16} /> Scan Document
                                </button>
                            )}
                            {isScanning && (
                                <button disabled className="flex items-center gap-2 px-6 py-2.5 rounded-full font-bold text-sm bg-orange-500/20 text-orange-400 cursor-not-allowed shadow-xl border border-orange-500/20">
                                    <Loader2 size={16} className="animate-spin" /> {scanStatus}
                                </button>
                            )}
                            {hasScanned && !isScanning && (
                                <span className="flex items-center gap-2 px-4 py-2.5 rounded-full font-bold text-sm bg-green-500/20 text-green-400 border border-green-500/30 shadow-lg">
                                    <CheckCircle size={16} /> Scanned
                                </span>
                            )}
                            <button className="text-white bg-black/50 hover:bg-black/70 p-3 rounded-full transition-transform hover:scale-105 active:scale-95 shadow-lg" 
                                    onClick={e => { 
                                        e.stopPropagation(); 
                                        const side = zoomedSide;
                                        setFormData(prev => ({ ...prev, [side + 'Rotation']: (prev[side + 'Rotation'] || 0) + 90 }));
                                    }}>
                                <RotateCw size={22} />
                            </button>
                            <button className="text-white bg-red-500/80 hover:bg-red-600 p-3 rounded-full transition-transform hover:scale-105 active:scale-95 shadow-lg" 
                                    onClick={() => setZoomedSide(null)}>
                                <X size={22} />
                            </button>
                        </div>


                    </motion.div>
                )}
            </AnimatePresence>

            {/* Camera Overlay */}
            <IDCameraModal 
                isOpen={cameraOpen}
                onClose={() => setCameraOpen(false)}
                onCapture={handleCameraCapture}
                side={activeCameraSide}
            />
        </div>
    );
}
