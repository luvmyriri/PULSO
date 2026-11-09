import NativeAppHeader from '../components/mobile/NativeAppHeader';
import { isNativeAndroid } from '../utils/appContext';
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    User, Phone, Lock, UploadCloud, CheckCircle, CheckCircle2, XCircle,
    Loader2, X, ZoomIn, Info, Mail, Shield, ShieldCheck, AlertCircle, Camera,
    Eye, EyeOff, Home, RotateCw, RotateCcw, ChevronDown, Calendar, ChevronRight,
    Check, CreditCard, ArrowLeft, ArrowRight, RefreshCw,
    Layers, Clock, KeyRound
} from 'lucide-react';
import { normalizeEmail, normalizePhoneNumber, maskEmail, maskPhoneNumber } from '../utils/contactNormalizer';
import axios from 'axios';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import Branding from '../components/Branding';
import ThemeToggle from '../components/ThemeToggle';
import IDCameraModal from '../components/IDCameraModal';
import LegalModal from '../components/LegalModal';
import CustomDatePicker from '../components/CustomDatePicker';
import ThemedSelect from '../components/ThemedSelect';
import IDPhotoViewerModal from '../components/IDPhotoViewerModal';
import { ID_PHOTO_CONTENT } from '../data/idPhotoStepContent';
import { formatProperText } from '../utils/properTextFormatter';
import { sortAddressParts } from '../utils/addressPartSorter';
import { clearAuthSession, setAuthSession } from '../utils/authSession';
import { API_BASE_URL } from '../utils/apiBase';

import { CREATE_LOGIN_CONTENT, getLoginContent } from '../data/createLoginContent';

// ---------------------------------------------------------------------------
// Step 4 Pure Validation Functions (Single source of truth)
// ---------------------------------------------------------------------------
export const validateEmail = (val) => {
    const trimmed = (val || '').trim();
    if (!trimmed) return { valid: false, message: CREATE_LOGIN_CONTENT['email.required'] };
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
        return { valid: false, message: CREATE_LOGIN_CONTENT['email.invalid'] };
    }
    return { valid: true, message: '' };
};

export const validateMobile = (val) => {
    const digits = (val || '').replace(/\D/g, '');
    if (!digits) return { valid: false, message: CREATE_LOGIN_CONTENT['mobile.required'] };
    if (!digits.startsWith('09') || digits.length !== 11) {
        return { valid: false, message: CREATE_LOGIN_CONTENT['mobile.invalid'] };
    }
    return { valid: true, message: '' };
};

export const validatePassword = (val) => {
    const pw = val || '';
    if (!pw) return { valid: false, message: 'Password is required.', minLength: false };
    const minLength = pw.length >= 8;
    if (!minLength) {
        return { valid: false, message: 'Password must be at least 8 characters.', minLength: false };
    }
    return { valid: true, message: '', minLength: true };
};

export const validateConfirmPassword = (confirmVal, pwVal) => {
    if (!confirmVal) return { valid: false, message: 'Repeat your password.' };
    if (confirmVal !== pwVal) return { valid: false, message: 'Passwords do not match.' };
    return { valid: true, message: '' };
};

export const cleanMobileInput = (raw) => {
    if (!raw) return '';
    let digits = raw.replace(/\D/g, '');
    if (digits.startsWith('639')) {
        digits = '0' + digits.slice(2);
    } else if (digits.startsWith('9') && digits.length === 10) {
        digits = '0' + digits;
    }
    return digits.slice(0, 11);
};

export const formatMobileDisplay = (digits) => {
    if (!digits) return '';
    if (digits.length <= 4) return digits;
    if (digits.length <= 7) return `${digits.slice(0, 4)} ${digits.slice(4)}`;
    return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7, 11)}`;
};

// ---------------------------------------------------------------------------
// OCR Address Parser
// Splits a raw OCR address string into structured sub-fields
// ---------------------------------------------------------------------------
function parseOcrAddress(raw, data) {
    if (!raw) return {};

    let s = raw
        .replace(/\n|\|/g, ' ')
        .replace(/\s{2,}/g, ' ')
        .trim();

    const NOISE = /\b(KASARIAN|KASAR1AN|SEX|SEK|MALE|FEMALE|HALE|NALE|FEHALE|PEMALE|PHILIPPINES?|REPUBLIKA\s+NG|NG\s+PILIPINAS|ADDRESS|A0DRESS|ADDRES5|RESIDENCE|LICENSE|L1CENSE|RESTRICTION|AGENCY|CODE|SERIAL|PLACE OF BIRTH|ISSUANCE|BLOOD\s+TYPE|EYE\s+COLOR|WEIGHT|HEIGHT|TIN|EXPIRY|VALIDITY|VALID\s+UNTIL)\b/gi;
    s = s.replace(NOISE, '').replace(/\s{2,}/g, ' ').trim();
    s = s.replace(/\b1[34]\d{2}\b/g, '').trim();

    let houseNo = '';
    let blockLot = '';
    let street = '';
    let subdivision = '';

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

    if (!blockLot) {
        const houseRe = /^(#?\d+[-–/]?[A-Za-z]?)\s/;
        const houseMatch = s.match(houseRe);
        if (houseMatch) {
            houseNo = houseMatch[1].replace(/^#/, '');
            s = s.replace(houseMatch[0], '').trim();
        }
    }

    const streetRe = /\b((?:[A-Za-z0-9#.-]+\s+)*(?:[A-Za-z0-9#.-]+)\s+(?:STREET|ST\.?|AVENUE|AVE\.?|ROAD|RD\.?|BOULEVARD|BLVD\.?|DRIVE|DR\.?|LANE|LN\.?|HIGHWAY|HWY\.?|EXTENSION|EXT\.?|LOOP|WALK|WAY|CIRCLE|CIR\.?))\b/i;
    const streetMatch = s.match(streetRe);
    if (streetMatch) {
        street = streetMatch[1].replace(/\s+/g, ' ').trim();
        street = street.replace(/\b\w/g, c => c.toUpperCase());
        s = s.replace(streetMatch[0], '').trim();
    }

    const subdivRe = /\b((?:[A-Za-z0-9#.-]+\s+)*(?:[A-Za-z0-9#.-]+\s+)?(?:HOMES?(?:\s+\d+[A-Z]?)?|VILLAGE|VILL(?:AGE)?\.?|HEIGHTS?|SUBD(?:\.?|IVISION)?|SUBDIVISION|VILLE|ESTATE|PARK(?:\s+\d+)?|PLACE|COURT(?:\s+\d+)?|NORTHVILLE(?:\s+[A-Z0-9]+)?|FAIRVIEW|TOWNVILLE|RESIDENCES?|COMPOUND|ROYALE|VERDE|PALMS?|GARDENS?|GROVE|OAKS?|PINES|HILLS?|VISTAS?))\b/i;
    const subdivMatch = s.match(subdivRe);
    if (subdivMatch) {
        subdivision = subdivMatch[1].replace(/\s+/g, ' ').trim();
        subdivision = subdivision.replace(/\b\w/g, c => c.toUpperCase());
        s = s.replace(subdivMatch[0], '').trim();
    }

    s = s.replace(/\b(?:BARANGAY|BRGY\.?|BGY\.?)\s*\d+[A-Z]?\b/gi, '');
    if (data && data.barangay) {
        try {
            const bn = data.barangay.replace(/^Barangay\s*/i, '').trim();
            if (bn) s = s.replace(new RegExp(`\\b${bn.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi'), '');
        } catch { /* ignore */ }
    }
    s = s.replace(/\b(?:CALOOCAN|KALOOKAN|CITY|NCR|METRO\s+MANILA|MANILA|DISTRICT|ZONE|THIRD\s*DISTRICT)\b/gi, '');
    s = s.replace(/[,/\s]+$/, '').replace(/^[,/\s]+/, '').replace(/\s{2,}/g, ' ').trim();

    if (!street && s) {
        street = s.replace(/\b\w/g, c => c.toUpperCase()).trim();
        s = '';
    }

    return { houseNo, blockLot, subdivision, street };
}

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
// Bespoke Civic Aperture ID Card Graphics (instructive, no generic stock icons)
// ---------------------------------------------------------------------------
function FrontIdGraphic({ className = "w-28 h-18 sm:w-32 sm:h-20" }) {
    return (
        <svg viewBox="0 0 120 76" fill="none" xmlns="http://www.w3.org/2000/svg" className={`${className} shrink-0`}>
            {/* Card Outer & Border */}
            <rect x="2" y="2" width="116" height="72" rx="7" className="fill-slate-100 dark:fill-slate-800/90 stroke-slate-300/90 dark:stroke-slate-700" strokeWidth="1.5" />

            {/* Hologram / LGU Emblem dot */}
            <circle cx="106" cy="14" r="5" className="fill-orange-400/20 stroke-[#ff6b00]/60" strokeWidth="1" />
            <circle cx="106" cy="14" r="2.5" className="fill-[#ff6b00]/70" />

            {/* Smart Chip */}
            <rect x="10" y="10" width="15" height="12" rx="2" className="fill-amber-400/80 dark:fill-amber-500/70 stroke-amber-600/50" strokeWidth="0.8" />
            <line x1="10" y1="16" x2="25" y2="16" className="stroke-amber-600/40" strokeWidth="0.8" />
            <line x1="17.5" y1="10" x2="17.5" y2="22" className="stroke-amber-600/40" strokeWidth="0.8" />

            {/* Photo Avatar Placement */}
            <rect x="10" y="27" width="28" height="37" rx="3" className="fill-slate-200/90 dark:fill-slate-700/80 stroke-slate-300 dark:stroke-slate-600" strokeWidth="1" />
            <circle cx="24" cy="39" r="6" className="fill-slate-400/80 dark:fill-slate-400" />
            <path d="M14 59 C14 51 18 49 24 49 C30 49 34 51 34 59" className="fill-slate-400/80 dark:fill-slate-400" />

            {/* Header lines */}
            <rect x="44" y="11" width="46" height="4" rx="2" className="fill-slate-400 dark:fill-slate-400" />
            <rect x="44" y="18" width="28" height="2.5" rx="1" className="fill-slate-300 dark:fill-slate-600" />

            {/* Information Rows (Name, Birthday, Address) */}
            <rect x="44" y="27" width="62" height="3" rx="1.5" className="fill-slate-300 dark:fill-slate-600" />
            <rect x="44" y="34" width="54" height="3" rx="1.5" className="fill-slate-300 dark:fill-slate-600" />
            <rect x="44" y="41" width="44" height="3" rx="1.5" className="fill-slate-300 dark:fill-slate-600" />

            {/* Emphasized ID Number Ribbon */}
            <rect x="44" y="52" width="62" height="6.5" rx="2" className="fill-orange-100 dark:fill-orange-950/60 stroke-[#ff6b00]/50" strokeWidth="1" />
            <circle cx="50" cy="55.25" r="1.5" className="fill-[#ff6b00]" />
            <circle cx="56" cy="55.25" r="1.5" className="fill-[#ff6b00]" />
            <circle cx="62" cy="55.25" r="1.5" className="fill-[#ff6b00]" />
            <circle cx="68" cy="55.25" r="1.5" className="fill-[#ff6b00]" />
            <rect x="74" y="54" width="28" height="2.5" rx="1" className="fill-[#ff6b00]/80" />
        </svg>
    );
}

function BackIdGraphic({ className = "w-28 h-18 sm:w-32 sm:h-20" }) {
    return (
        <svg viewBox="0 0 120 76" fill="none" xmlns="http://www.w3.org/2000/svg" className={`${className} shrink-0`}>
            {/* Card Outer & Border */}
            <rect x="2" y="2" width="116" height="72" rx="7" className="fill-slate-100 dark:fill-slate-800/90 stroke-slate-300/90 dark:stroke-slate-700" strokeWidth="1.5" />

            {/* Magnetic Stripe */}
            <rect x="2" y="11" width="116" height="15" className="fill-slate-800 dark:fill-slate-950" />

            {/* Official Signature Panel */}
            <rect x="10" y="32" width="64" height="13" rx="2" className="fill-white dark:fill-slate-200 stroke-slate-300 dark:stroke-slate-400" strokeWidth="0.8" />
            <path d="M14 40 Q 24 35 34 41 T 52 38 T 68 40" className="stroke-slate-700" strokeWidth="1.5" fill="none" strokeLinecap="round" />

            {/* CVC / Auth Code box */}
            <rect x="78" y="34" width="30" height="9" rx="1.5" className="fill-slate-200 dark:fill-slate-700/80" />
            <circle cx="85" cy="38.5" r="1.5" className="fill-slate-600 dark:fill-slate-300" />
            <circle cx="91" cy="38.5" r="1.5" className="fill-slate-600 dark:fill-slate-300" />
            <circle cx="97" cy="38.5" r="1.5" className="fill-slate-600 dark:fill-slate-300" />

            {/* Standard Barcode Stripes */}
            <g className="fill-slate-700 dark:fill-slate-400">
                <rect x="10" y="51" width="3" height="16" />
                <rect x="15" y="51" width="1.5" height="16" />
                <rect x="18" y="51" width="4" height="16" />
                <rect x="24" y="51" width="2" height="16" />
                <rect x="28" y="51" width="1.5" height="16" />
                <rect x="32" y="51" width="3.5" height="16" />
                <rect x="37" y="51" width="2" height="16" />
                <rect x="41" y="51" width="1.5" height="16" />
                <rect x="44" y="51" width="4" height="16" />
                <rect x="50" y="51" width="2" height="16" />
            </g>

            {/* QR / 2D Barcode Block */}
            <rect x="80" y="49" width="28" height="20" rx="2" className="fill-slate-200 dark:fill-slate-700/90 stroke-slate-300 dark:stroke-slate-600" strokeWidth="0.8" />
            <rect x="83" y="52" width="6" height="6" className="fill-slate-800 dark:fill-slate-200" />
            <rect x="99" y="52" width="6" height="6" className="fill-slate-800 dark:fill-slate-200" />
            <rect x="83" y="60" width="6" height="6" className="fill-slate-800 dark:fill-slate-200" />
            <rect x="92" y="58" width="5" height="5" className="fill-slate-800 dark:fill-slate-200" />
            <rect x="100" y="61" width="4" height="4" className="fill-[#ff6b00]" />
        </svg>
    );
}

// ---------------------------------------------------------------------------
// Supported Philippine ID Types (4 Primary + 5 Secondary)
// ---------------------------------------------------------------------------
export const SUPPORTED_ID_TYPES = [
    // PRIMARY IDS (Accepted alone for instant verification)
    {
        id: 'philsys',
        name: 'Philippine National ID (PhilSys ID / ePhilID)',
        shortName: 'National ID',
        idNumberLabel: 'Card Number (16 Digits)',
        formatHint: '16 digits (e.g. 1234-5678-9012-3456)',
        pattern: /^(?:\d{4}[-\s]?){3}\d{4}$/,
        frontCopy: 'Front of National ID',
        backCopy: 'Back of National ID',
        instructions: 'Make sure your ID number and the QR code on your card are clearly visible.',
        tier: 'primary',
        requiresManualReview: false,
    },
    {
        id: 'lto',
        name: "Driver's License (LTO)",
        shortName: "Driver's License",
        idNumberLabel: 'License Number',
        formatHint: 'Letter + 2 digits + 2 digits + 6 digits (e.g. N02-14-012345)',
        pattern: /^[A-Z]\d{2}[-\s]?\d{2}[-\s]?\d{6}$/i,
        frontCopy: "Front of Driver's License",
        backCopy: "Back of Driver's License",
        instructions: 'Make sure your License Number and Expiration Date at the top are clearly readable.',
        tier: 'primary',
        requiresManualReview: false,
    },
    {
        id: 'umid',
        name: 'UMID (Unified Multi-Purpose ID)',
        shortName: 'UMID Card',
        idNumberLabel: 'ID / Reference Number (12 Digits)',
        formatHint: '12 digits (e.g. 0033-1234567-8)',
        pattern: /^\d{4}[-\s]?\d{7}[-\s]?\d{1}$/,
        frontCopy: 'Front of UMID Card',
        backCopy: 'Back of UMID Card',
        instructions: 'Make sure the 12-digit number at the top right is clear and readable.',
        tier: 'primary',
        requiresManualReview: false,
    },
    {
        id: 'passport',
        name: 'Passport (DFA)',
        shortName: 'Passport',
        idNumberLabel: 'Passport Number',
        formatHint: '1 letter + 7-8 alphanumeric characters (e.g. P1234567A)',
        pattern: /^[A-Z]\d{7}[A-Z0-9]?$/i,
        frontCopy: 'Data / Photo Page',
        backCopy: 'Signature / Amendments Page',
        instructions: 'Make sure the photo page, your passport number, and the lines at the bottom are fully visible.',
        tier: 'primary',
        requiresManualReview: false,
    },

    // SECONDARY IDS (Require 2nd ID or manual staff review)
    {
        id: 'comelec',
        name: "Voter's ID / COMELEC Voter's Certification",
        shortName: "Voter's ID / Cert",
        idNumberLabel: 'Voter ID / Control Number',
        formatHint: 'VOTER ID / VIN (e.g. 7501-0123A-B123ABC)',
        pattern: /^[A-Z0-9-]{8,25}$/i,
        frontCopy: "Front of Voter's ID / Cert",
        backCopy: "Back of Voter's ID / Cert",
        instructions: 'Make sure your ID number, precinct number, and barangay address are clearly visible.',
        tier: 'secondary',
        requiresManualReview: false,
    },
    {
        id: 'philhealth',
        name: 'PhilHealth ID',
        shortName: 'PhilHealth ID',
        idNumberLabel: 'PhilHealth Number (12 Digits)',
        formatHint: '12 digits (e.g. 12-345678901-2)',
        pattern: /^\d{2}[-\s]?\d{9}[-\s]?\d{1}$/,
        frontCopy: 'Front of PhilHealth ID',
        backCopy: 'Back of PhilHealth ID',
        instructions: 'Make sure your 12-digit PhilHealth number at the top is in clear focus.',
        tier: 'secondary',
        requiresManualReview: false,
    },
    {
        id: 'sss_gsis',
        name: 'SSS ID / GSIS ID',
        shortName: 'SSS / GSIS ID',
        idNumberLabel: 'Member ID Number',
        formatHint: '10 digits (e.g. 01-2345678-9 or GSIS BP No.)',
        pattern: /^(?:\d{2}[-\s]?\d{7}[-\s]?\d{1}|\d{10,11})$/,
        frontCopy: 'Front of SSS/GSIS Card',
        backCopy: 'Back of SSS/GSIS Card',
        instructions: 'Make sure your member identification number is clearly visible.',
        tier: 'secondary',
        requiresManualReview: false,
    },
    {
        id: 'postal',
        name: 'Postal ID (PHLPost)',
        shortName: 'Postal ID',
        idNumberLabel: 'Postal ID Number',
        formatHint: '16 alphanumeric characters (e.g. PRN123456789012)',
        pattern: /^(?:PRN[-\s]?)?[A-Z0-9]{12,16}$/i,
        frontCopy: 'Front of Postal ID',
        backCopy: 'Back of Postal ID',
        instructions: 'Make sure your ID number, photo, and expiration date are clearly visible.',
        tier: 'secondary',
        requiresManualReview: false,
    },
    {
        id: 'barangay',
        name: 'Barangay ID / Barangay Certification',
        shortName: 'Barangay ID / Cert',
        idNumberLabel: 'Certificate / Control Number',
        formatHint: 'Control or Certificate No. (e.g. BRGY-171-2026-001)',
        pattern: /^[A-Z0-9/-]{4,25}$/i,
        frontCopy: 'Front of Barangay ID / Cert',
        backCopy: 'Back / Official Seal',
        instructions: 'Ensure control number, barangay dry seal, and resident photo are clearly visible for AI verification.',
        tier: 'secondary',
        requiresManualReview: false,
    }
];

export function getIdNumberDisplayLabel(idTypeObj) {
    if (!idTypeObj) return "ID Number";
    const name = idTypeObj.shortName || "ID";
    if (idTypeObj.id === 'philsys') return "National ID Number (16 digits)";
    if (idTypeObj.id === 'umid') return "UMID Card Number (12 digits)";
    if (idTypeObj.id === 'philhealth') return "PhilHealth Number (12 digits)";
    if (idTypeObj.id === 'lto') return "Driver's License Number";
    if (idTypeObj.id === 'passport') return "Passport Number";
    if (idTypeObj.id === 'sss_gsis') return "Member ID Number";
    if (idTypeObj.id === 'postal') return "Postal ID Number";
    if (idTypeObj.id === 'barangay') return "Barangay Certificate / Control Number";
    return `${name} Number`;
}

export function getIdHints(idTypeObj) {
    const idKey = idTypeObj?.id || '';
    if (idKey === 'passport') {
        return {
            frontTitle: `Data Page of your ${idTypeObj?.shortName || 'Passport'}`,
            backTitle: `Signature Page of your ${idTypeObj?.shortName || 'Passport'}`,
            frontHint: "The data page with your photo and passport number.",
            backHint: "The page with your signature or amendments."
        };
    }
    const name = idTypeObj?.shortName || 'ID';
    return {
        frontTitle: `Front of your ${name}`,
        backTitle: `Back of your ${name}`,
        frontHint: "The side with your photo and full name.",
        backHint: ID_PHOTO_CONTENT.backDefaultHint
    };
}

export function maskIdNumber(str) {
    if (!str || str.length <= 4) return str;
    const last4 = str.slice(-4);
    const maskedPrefix = str.slice(0, -4).replace(/[a-zA-Z0-9]/g, '•');
    return `${maskedPrefix}${last4}`;
}

export const DOB_MONTHS = [
    { value: '01', name: 'January' },
    { value: '02', name: 'February' },
    { value: '03', name: 'March' },
    { value: '04', name: 'April' },
    { value: '05', name: 'May' },
    { value: '06', name: 'June' },
    { value: '07', name: 'July' },
    { value: '08', name: 'August' },
    { value: '09', name: 'September' },
    { value: '10', name: 'October' },
    { value: '11', name: 'November' },
    { value: '12', name: 'December' },
];

export function getDaysInMonth(yearStr, monthStr) {
    if (!monthStr) return 31;
    const y = parseInt(yearStr, 10) || 2000;
    const m = parseInt(monthStr, 10);
    return new Date(y, m, 0).getDate();
}

const CURRENT_CALENDAR_YEAR = new Date().getFullYear();
export const DOB_YEARS = Array.from({ length: 105 }, (_, i) => String(CURRENT_CALENDAR_YEAR - i));

// Comprehensive Philippine Name Extraction & Suffix Parser
export function parsePhilippineName(data, idType = '') {
    let firstName = (data.first_name || '').trim();
    let middleName = (data.middle_name || '').trim();
    let lastName = (data.last_name || '').trim();
    let suffix = (data.suffix || '').trim();

    const SUFFIX_MAP = {
        'JR': 'Jr.', 'JR.': 'Jr.', 'JUNIOR': 'Jr.',
        'SR': 'Sr.', 'SR.': 'Sr.', 'SENIOR': 'Sr.',
        'II': 'II', '2ND': 'II',
        'III': 'III', '3RD': 'III',
        'IV': 'IV', '4TH': 'IV',
        'V': 'V', '5TH': 'V',
        'VI': 'VI'
    };

    const COMPOUND_PREFIXES = ['DE LA', 'DELA', 'DE LOS', 'DELOS', 'DE', 'DEL', 'SAN', 'SANTA', 'SANTO'];

    const stripSuffix = (text) => {
        if (!text) return { clean: '', foundSuffix: '' };
        const tokens = text.trim().split(/\s+/);
        if (tokens.length > 1) {
            const last = tokens[tokens.length - 1].toUpperCase().replace(/[.,]$/, '');
            if (SUFFIX_MAP[last]) {
                return {
                    clean: tokens.slice(0, -1).join(' ').replace(/[,]$/, '').trim(),
                    foundSuffix: SUFFIX_MAP[last]
                };
            }
        }
        return { clean: text.trim(), foundSuffix: '' };
    };

    // If explicit suffix was not provided, check if it's attached to lastName or firstName
    if (!suffix) {
        const lastCheck = stripSuffix(lastName);
        if (lastCheck.foundSuffix) {
            lastName = lastCheck.clean;
            suffix = lastCheck.foundSuffix;
        } else {
            const firstCheck = stripSuffix(firstName);
            if (firstCheck.foundSuffix) {
                firstName = firstCheck.clean;
                suffix = firstCheck.foundSuffix;
            }
        }
    } else {
        const norm = suffix.toUpperCase().replace(/[.,]$/, '');
        if (SUFFIX_MAP[norm]) suffix = SUFFIX_MAP[norm];
    }

    // Handle full name string if individual fields were not cleanly separated
    const rawFullName = (data.name || data.full_name || '').trim();
    if ((!firstName || !lastName) && rawFullName) {
        let nameStr = rawFullName;
        const fullCheck = stripSuffix(nameStr);
        if (fullCheck.foundSuffix) {
            nameStr = fullCheck.clean;
            if (!suffix) suffix = fullCheck.foundSuffix;
        }

        if (nameStr.includes(',')) {
            // "LASTNAME [SUFFIX], FIRSTNAME MIDDLENAME" format (standard LTO Driver's License, PRC, COMELEC)
            const [lastPart, ...firstParts] = nameStr.split(',');
            const rest = firstParts.join(',').trim();
            const lastSuff = stripSuffix(lastPart.trim());
            lastName = lastSuff.clean;
            if (lastSuff.foundSuffix && !suffix) suffix = lastSuff.foundSuffix;

            const givenTokens = rest.split(/\s+/).filter(Boolean);
            if (givenTokens.length > 1) {
                const lastGiven = givenTokens[givenTokens.length - 1];
                if (/^[A-Z]\.?$/i.test(lastGiven) || idType === 'drivers_license') {
                    middleName = lastGiven.length === 1 ? lastGiven.toUpperCase() + '.' : lastGiven.toUpperCase();
                    firstName = givenTokens.slice(0, -1).join(' ');
                } else {
                    middleName = lastGiven;
                    firstName = givenTokens.slice(0, -1).join(' ');
                }
            } else if (givenTokens.length === 1) {
                firstName = givenTokens[0];
            }
        } else {
            // Space separated: e.g. "JOSE M. TABIOS" or "JUAN DELA CRUZ"
            const tokens = nameStr.split(/\s+/).filter(Boolean);
            if (tokens.length >= 3) {
                const upperTokens = tokens.map(t => t.toUpperCase());
                let compoundIdx = -1;
                for (let i = 1; i < tokens.length - 1; i++) {
                    const candidateTwo = upperTokens.slice(i, i + 2).join(' ');
                    const candidateOne = upperTokens[i];
                    if (COMPOUND_PREFIXES.includes(candidateTwo)) {
                        compoundIdx = i;
                        break;
                    } else if (COMPOUND_PREFIXES.includes(candidateOne)) {
                        compoundIdx = i;
                        break;
                    }
                }

                if (compoundIdx > 0) {
                    firstName = tokens.slice(0, compoundIdx).join(' ');
                    lastName = tokens.slice(compoundIdx).join(' ');
                } else {
                    firstName = tokens[0];
                    middleName = tokens.slice(1, -1).join(' ');
                    lastName = tokens[tokens.length - 1];
                }
            } else if (tokens.length === 2) {
                firstName = tokens[0];
                lastName = tokens[1];
            } else if (tokens.length === 1) {
                firstName = tokens[0];
            }
        }
    }

    // Check if middle initial is appended to firstName (e.g. "JOSE M." or "JOSE M" when backend groups given names)
    if (!middleName && firstName) {
        const firstTokens = firstName.split(/\s+/).filter(Boolean);
        if (firstTokens.length > 1) {
            const lastFirstToken = firstTokens[firstTokens.length - 1];
            if (/^[A-Za-z]\.?$/.test(lastFirstToken)) {
                firstName = firstTokens.slice(0, -1).join(' ');
                middleName = lastFirstToken.length === 1 ? lastFirstToken.toUpperCase() + '.' : lastFirstToken.toUpperCase();
            }
        }
    }

    firstName = firstName.replace(/[,]$/, '').trim();
    lastName = lastName.replace(/[,]$/, '').trim();
    middleName = middleName.replace(/[,]$/, '').trim();

    return { firstName, middleName, lastName, suffix };
}

function mapOcrToForm(data) {
    const mapped = {};
    const parsedName = parsePhilippineName(data, data.selected_id_type || data.id_type || '');
    mapped.firstName = formatProperText(parsedName.firstName, false);
    mapped.middleName = formatProperText(parsedName.middleName, false);
    mapped.lastName = formatProperText(parsedName.lastName, false);
    mapped.suffix = parsedName.suffix || '';

    mapped.idType = data.id_type_label || 'Unknown Document';
    mapped.selectedIdType = data.selected_id_type || '';
    mapped.idNumber = (data.id_number || data.pcn || data.license_no || data.crn || data.pin || data.passport_no || data.prn || '').trim();

    if (data.dob) {
        const parsed = new Date(data.dob + 'T00:00:00');
        mapped.dobDate = isNaN(parsed.getTime()) ? null : parsed;
        mapped.dob = data.dob;
        const today = new Date();
        let age = today.getFullYear() - parsed.getFullYear();
        const m = today.getMonth() - parsed.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < parsed.getDate())) age--;
        mapped.age = age >= 0 ? String(age) : '';
    }

    const sex = (data.sex || '').trim();
    if (sex === 'Male' || sex === 'Female') mapped.sex = sex;
    else if (sex.toUpperCase() === 'M') mapped.sex = 'Male';
    else if (sex.toUpperCase() === 'F') mapped.sex = 'Female';

    const addr = parseOcrAddress(data.address || '', data);
    const rawHouseNo = data.house_no !== undefined ? data.house_no : (addr.houseNo || '');
    const rawBlockLot = data.block_lot !== undefined ? data.block_lot : (addr.blockLot || '');
    const rawBuildingVillage = data.building_village || data.subdivision || addr.subdivision || '';
    const rawStreet = data.street !== undefined ? data.street : (addr.street || '');

    // Automatically sort building parts and deduplicate block/lot and street
    const sorted = sortAddressParts({
        houseNo: rawHouseNo,
        blockLot: rawBlockLot,
        subdivision: rawBuildingVillage,
        street: rawStreet,
        barangay: data.barangay || addr.barangayId || ''
    });

    mapped.houseNo = sorted.houseNo;
    mapped.blockLot = sorted.blockLot;
    mapped.subdivision = sorted.subdivision;
    mapped.street = sorted.street;

    let bn = (data.barangay || addr.barangayId || '').trim();
    if (bn) {
        const numMatch = bn.match(/\b(1[6-8][0-9])\b/);
        if (numMatch) {
            mapped.barangay = `Barangay ${numMatch[1]}`;
        } else {
            bn = bn.replace(/Barangay/ig, '').replace(/,/g, '').trim();
            mapped.barangay = `Barangay ${bn}`;
        }
    } else {
        mapped.barangay = '';
    }

    mapped.municipality = 'Caloocan City';
    mapped.province = 'Metro Manila';
    mapped.postalCode = data.postal_code || getPostalCodeForBarangay(mapped.barangay) || '1421';
    return mapped;
}

// ---------------------------------------------------------------------------
// Glassmorphic Auto-filled Badge (no icon, sleek frosted glass aesthetic)
// ---------------------------------------------------------------------------
function AutoFilledBadge() {
    return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded-md backdrop-blur-md bg-orange-500/15 dark:bg-orange-500/20 border border-orange-500/30 dark:border-orange-400/30 shadow-[0_2px_8px_rgba(255,107,0,0.15)] text-[9px] font-bold text-black dark:text-white tracking-wide shrink-0 select-none">
            Auto-filled
        </span>
    );
}

// ---------------------------------------------------------------------------
// Main Register Component
// ---------------------------------------------------------------------------
export default function Register() {
    const navigate = useNavigate();
    const location = useLocation();
    const googleAuthState = location.state?.googleAuth ? location.state : null;
    const isGoogleAuth = Boolean(googleAuthState);

    const [step, setStep] = React.useState(1);
    const [isScanning, setIsScanning] = React.useState(false);
    const [scanError, setScanError] = React.useState('');

    // Camera & Preview
    const [cameraOpen, setCameraOpen] = React.useState(false);
    const [activeCameraSide, setActiveCameraSide] = React.useState('front');
    const [legalModal, setLegalModal] = React.useState({ isOpen: false, tab: 'privacy' });
    const [agreedToTerms, setAgreedToTerms] = React.useState(false);
    const [isTouchDevice, setIsTouchDevice] = React.useState(false);

    React.useEffect(() => {
        const hasTouch = ('ontouchstart' in window) ||
            (navigator.maxTouchPoints > 0) ||
            (window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
        setIsTouchDevice(Boolean(hasTouch));
    }, []);


    const frontFileInputRef = React.useRef(null);
    const backFileInputRef = React.useRef(null);
    const secondFrontFileInputRef = React.useRef(null);
    const secondBackFileInputRef = React.useRef(null);
    const mainScrollRef = React.useRef(null);

    React.useEffect(() => {
        if (mainScrollRef.current) {
            mainScrollRef.current.scrollTo({ top: 0, behavior: 'instant' });
        }
        window.scrollTo({ top: 0, behavior: 'instant' });
    }, [step]);

    const [showSecondaryModal, setShowSecondaryModal] = React.useState(false);
    const [isCapturingSecondId, setIsCapturingSecondId] = React.useState(false);

    // 5-Step Journey Progress (1: ID Select, 2: Photos, 3: Details, 4: Login/Finalize, 5: OTP)
    const STEP_LABELS = {
        1: 'Choose your ID',
        2: 'Front & back photos',
        3: 'Review details',
        4: isGoogleAuth ? 'Finalize verification' : 'Create login',
        5: 'Confirm code',
    };

    const [formData, setFormData] = React.useState({
        idFront: null,
        idBack: null,
        firstName: '',
        middleName: '',
        lastName: '',
        suffix: '',
        dobDate: null,
        dob: '',
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
        selectedIdType: '',
        idTier: 'primary',
        secondaryMode: 'manual_review',
        secondIdType: '',
        secondIdFront: null,
        secondIdBack: null,
        secondIdFrontRotation: 0,
        secondIdBackRotation: 0,
        idNumber: '',
        idFrontRotation: 0,
        idBackRotation: 0,
        email: '',
        mobile: '',
        password: '',
        confirmPassword: '',
    });

    const [previews, setPreviews] = React.useState({ front: null, back: null, secondFront: null, secondBack: null });
    const [zoomedSide, setZoomedSide] = React.useState(null);
    const [viewerSide, setViewerSide] = React.useState(null);
    const [photoAnnouncement, setPhotoAnnouncement] = React.useState('');
    const [snackbar, setSnackbar] = React.useState(null); // { message: string, type: 'success' | 'info' | 'error' }
    const snackbarTimerRef = React.useRef(null);

    const showSnackbar = React.useCallback((message, type = 'success') => {
        if (snackbarTimerRef.current) {
            clearTimeout(snackbarTimerRef.current);
        }
        setSnackbar({ message, type });
        snackbarTimerRef.current = setTimeout(() => {
            setSnackbar(null);
        }, 4000);
    }, []);

    React.useEffect(() => {
        return () => {
            if (snackbarTimerRef.current) clearTimeout(snackbarTimerRef.current);
        };
    }, []);
    const frontViewBtnRef = React.useRef(null);
    const backViewBtnRef = React.useRef(null);
    const previousObjectUrlsRef = React.useRef({});

    // Cleanup temporary object URLs on unmount
    React.useEffect(() => {
        return () => {
            Object.values(previousObjectUrlsRef.current).forEach(url => {
                if (url) URL.revokeObjectURL(url);
            });
        };
    }, []);

    // Track natural image dimensions for dynamic zero-deadspace well sizing
    const [imageDimensions, setImageDimensions] = React.useState({
        idFront: { width: 0, height: 0, ratio: 1.5857 },
        idBack: { width: 0, height: 0, ratio: 1.5857 },
        secondIdFront: { width: 0, height: 0, ratio: 1.5857 },
        secondIdBack: { width: 0, height: 0, ratio: 1.5857 },
    });

    const handleImageLoad = (key, e) => {
        const img = e.target;
        if (img && img.naturalWidth && img.naturalHeight) {
            const ratio = img.naturalWidth / img.naturalHeight;
            setImageDimensions(prev => ({
                ...prev,
                [key]: {
                    width: img.naturalWidth,
                    height: img.naturalHeight,
                    ratio: ratio > 0 ? ratio : 1.5857
                }
            }));
        }
    };

    const frontWellRef = React.useRef(null);
    const backWellRef = React.useRef(null);
    const [wellDims, setWellDims] = React.useState({ front: { w: 0, h: 0 }, back: { w: 0, h: 0 } });

    React.useEffect(() => {
        const updateWellDims = () => {
            if (frontWellRef.current) {
                const rect = frontWellRef.current.getBoundingClientRect();
                if (rect.width > 0 && rect.height > 0) {
                    setWellDims(prev => ({ ...prev, front: { w: Math.round(rect.width), h: Math.round(rect.height) } }));
                }
            }
            if (backWellRef.current) {
                const rect = backWellRef.current.getBoundingClientRect();
                if (rect.width > 0 && rect.height > 0) {
                    setWellDims(prev => ({ ...prev, back: { w: Math.round(rect.width), h: Math.round(rect.height) } }));
                }
            }
        };
        updateWellDims();
        window.addEventListener('resize', updateWellDims);
        return () => window.removeEventListener('resize', updateWellDims);
    }, [previews, step, isCapturingSecondId, formData.idFrontRotation, formData.idBackRotation, formData.secondIdFrontRotation, formData.secondIdBackRotation]);

    const getWellAspectStyle = (sideKey) => {
        const dim = imageDimensions[sideKey] || { ratio: 1.5857 };
        const rot = formData[sideKey + 'Rotation'] || 0;
        const isSwapped = (rot % 180 !== 0);
        const naturalRatio = dim.ratio || 1.5857;

        if (isSwapped) {
            const visualRatio = 1 / naturalRatio;
            const clampedVisualRatio = Math.max(0.60, Math.min(0.85, visualRatio));
            return {
                aspectRatio: `${clampedVisualRatio}`,
                maxHeight: '55vh',
            };
        } else {
            const clampedRatio = Math.max(1.3, Math.min(1.9, naturalRatio));
            return {
                aspectRatio: `${clampedRatio}`,
                maxHeight: '55vh',
            };
        }
    };

    const getImageRenderStyle = (sideKey) => {
        const rot = formData[sideKey + 'Rotation'] || 0;
        const isSwapped = (rot % 180 !== 0);
        const sideName = sideKey.toLowerCase().includes('front') ? 'front' : 'back';
        const dims = wellDims[sideName] || { w: 0, h: 0 };

        if (isSwapped && dims.w > 0 && dims.h > 0) {
            return {
                width: `${dims.h}px`,
                height: `${dims.w}px`,
                maxWidth: 'none',
                maxHeight: 'none',
                transform: `rotate(${rot}deg)`,
                objectFit: 'contain',
            };
        }
        return {
            width: '100%',
            height: '100%',
            transform: `rotate(${rot}deg)`,
            objectFit: 'contain',
        };
    };
    const [verifiedBadge, setVerifiedBadge] = React.useState('');
    const [registering, setRegistering] = React.useState(false);
    const [registrationError, setRegistrationError] = React.useState('');
    const [ageError, setAgeError] = React.useState('');
    const [showPassword, setShowPassword] = React.useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
    const [hasScanned, setHasScanned] = React.useState(false);
    const [isFaceVerified, setIsFaceVerified] = React.useState(false);
    const [faceMatchConfidence, setFaceMatchConfidence] = React.useState('');
    const [autoFilledFields, setAutoFilledFields] = React.useState({});
    const [showIdMasked, setShowIdMasked] = React.useState(false);
    const [isCustomSuffix, setIsCustomSuffix] = React.useState(false);

    // Step 4 Real-time Validation & Server Availability State
    const [step3Touched, setStep3Touched] = useState({ firstName: false, lastName: false, dob: false, sex: false, idNumber: false, barangay: false });
    const [loginTouched, setLoginTouched] = useState({ email: false, mobile: false, password: false, confirmPassword: false });
    const [loginErrors, setLoginErrors] = useState({ email: '', mobile: '', password: '', confirmPassword: '' });
    const [emailCheckStatus, setEmailCheckStatus] = useState('idle'); // 'idle' | 'checking' | 'available' | 'inUse' | 'error'
    const [mobileCheckStatus, setMobileCheckStatus] = useState('idle'); // 'idle' | 'checking' | 'available' | 'inUse' | 'error'
    const emailCheckSeq = useRef(0);
    const mobileCheckSeq = useRef(0);
    const emailAbortController = useRef(null);
    const mobileAbortController = useRef(null);
    const [capsLockOn, setCapsLockOn] = useState(false);
    const loginDebounceTimers = useRef({});
    const emailInputRef = useRef(null);
    const mobileInputRef = useRef(null);
    const passwordInputRef = useRef(null);
    const confirmPasswordInputRef = useRef(null);

    // Auto-hide passwords when document is hidden or step changes
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.hidden) {
                setShowPassword(false);
                setShowConfirmPassword(false);
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            setShowPassword(false);
            setShowConfirmPassword(false);
        };
    }, [step]);

    const performEmailCheck = async (emailVal) => {
        const cleanVal = (emailVal || '').trim().toLowerCase();
        if (!cleanVal || !validateEmail(cleanVal).valid) {
            setEmailCheckStatus('idle');
            return;
        }

        emailCheckSeq.current += 1;
        const seq = emailCheckSeq.current;

        if (emailAbortController.current) {
            emailAbortController.current.abort();
        }
        const controller = new AbortController();
        emailAbortController.current = controller;

        setEmailCheckStatus('checking');
        try {
            const res = await axios.post(
                `${API_BASE_URL}/api/auth/check-availability`,
                { email: cleanVal },
                { signal: controller.signal, timeout: 8000 }
            );
            if (seq !== emailCheckSeq.current) return;

            if (res.data.email_available) {
                setEmailCheckStatus('available');
                setLoginErrors(prev => ({ ...prev, email: '' }));
            } else {
                setEmailCheckStatus('inUse');
                setLoginErrors(prev => ({
                    ...prev,
                    email: CREATE_LOGIN_CONTENT['email.inUse']
                }));
            }
        } catch (err) {
            if (axios.isCancel(err) || err.name === 'CanceledError' || err.name === 'AbortError') {
                return;
            }
            if (seq !== emailCheckSeq.current) return;
            // On slow network or failure: neutral fallback, do not block the user
            setEmailCheckStatus('error');
        } finally {
            if (seq === emailCheckSeq.current) {
                emailAbortController.current = null;
            }
        }
    };

    const performMobileCheck = async (mobileVal) => {
        const digits = (mobileVal || '').replace(/\D/g, '');
        if (!digits || !validateMobile(digits).valid) {
            setMobileCheckStatus('idle');
            return;
        }

        mobileCheckSeq.current += 1;
        const seq = mobileCheckSeq.current;

        if (mobileAbortController.current) {
            mobileAbortController.current.abort();
        }
        const controller = new AbortController();
        mobileAbortController.current = controller;

        setMobileCheckStatus('checking');
        try {
            const res = await axios.post(
                `${API_BASE_URL}/api/auth/check-availability`,
                { mobile: digits },
                { signal: controller.signal, timeout: 8000 }
            );
            if (seq !== mobileCheckSeq.current) return;

            if (res.data.mobile_available) {
                setMobileCheckStatus('available');
                setLoginErrors(prev => ({ ...prev, mobile: '' }));
            } else {
                setMobileCheckStatus('inUse');
                setLoginErrors(prev => ({
                    ...prev,
                    mobile: CREATE_LOGIN_CONTENT['mobile.inUse']
                }));
            }
        } catch (err) {
            if (axios.isCancel(err) || err.name === 'CanceledError' || err.name === 'AbortError') {
                return;
            }
            if (seq !== mobileCheckSeq.current) return;
            // On slow network or failure: neutral fallback, do not block the user
            setMobileCheckStatus('error');
        } finally {
            if (seq === mobileCheckSeq.current) {
                mobileAbortController.current = null;
            }
        }
    };

    const handleLoginFieldChange = (fieldName, rawValue) => {
        let value = rawValue;
        if (fieldName === 'mobile') {
            value = cleanMobileInput(rawValue);
        }
        setFormData(prev => ({ ...prev, [fieldName]: value }));
        if (registrationError) setRegistrationError('');

        // Cancel existing debounce timer for this field
        if (loginDebounceTimers.current[fieldName]) {
            clearTimeout(loginDebounceTimers.current[fieldName]);
        }

        // Instant format validation
        let result;
        if (fieldName === 'email') result = validateEmail(value);
        else if (fieldName === 'mobile') result = validateMobile(value);
        else if (fieldName === 'password') {
            result = validatePassword(value);
            if (formData.confirmPassword) {
                const cpwRes = validateConfirmPassword(formData.confirmPassword, value);
                if (cpwRes.valid) {
                    setLoginErrors(prev => ({ ...prev, confirmPassword: '' }));
                }
            }
        } else if (fieldName === 'confirmPassword') {
            result = validateConfirmPassword(value, formData.password);
        }

        if (fieldName === 'email') {
            if (emailAbortController.current) {
                emailAbortController.current.abort();
                emailAbortController.current = null;
            }
            if (!value.trim()) {
                setEmailCheckStatus('idle');
                if (loginTouched.email) {
                    setLoginErrors(prev => ({ ...prev, email: CREATE_LOGIN_CONTENT['email.required'] }));
                } else {
                    setLoginErrors(prev => ({ ...prev, email: '' }));
                }
            } else if (!result.valid) {
                setEmailCheckStatus('idle');
                loginDebounceTimers.current[fieldName] = setTimeout(() => {
                    setLoginErrors(prev => ({ ...prev, email: result.message }));
                }, 500);
            } else {
                setLoginErrors(prev => ({ ...prev, email: '' }));
                setEmailCheckStatus('checking');
                loginDebounceTimers.current[fieldName] = setTimeout(() => {
                    performEmailCheck(value);
                }, 600);
            }
        } else if (fieldName === 'mobile') {
            if (mobileAbortController.current) {
                mobileAbortController.current.abort();
                mobileAbortController.current = null;
            }
            if (!value) {
                setMobileCheckStatus('idle');
                if (loginTouched.mobile) {
                    setLoginErrors(prev => ({ ...prev, mobile: CREATE_LOGIN_CONTENT['mobile.required'] }));
                } else {
                    setLoginErrors(prev => ({ ...prev, mobile: '' }));
                }
            } else if (!result.valid) {
                setMobileCheckStatus('idle');
                loginDebounceTimers.current[fieldName] = setTimeout(() => {
                    setLoginErrors(prev => ({ ...prev, mobile: result.message }));
                }, 500);
            } else {
                setLoginErrors(prev => ({ ...prev, mobile: '' }));
                setMobileCheckStatus('checking');
                loginDebounceTimers.current[fieldName] = setTimeout(() => {
                    performMobileCheck(value);
                }, 600);
            }
        } else {
            if (result.valid) {
                setLoginErrors(prev => ({ ...prev, [fieldName]: '' }));
            } else {
                loginDebounceTimers.current[fieldName] = setTimeout(() => {
                    setLoginErrors(prev => ({ ...prev, [fieldName]: result.message }));
                }, 600);
            }
        }
    };

    const handleLoginFieldBlur = (fieldName) => {
        setLoginTouched(prev => ({ ...prev, [fieldName]: true }));
        if (loginDebounceTimers.current[fieldName]) {
            clearTimeout(loginDebounceTimers.current[fieldName]);
        }
        const value = formData[fieldName];
        let result;
        if (fieldName === 'email') result = validateEmail(value);
        else if (fieldName === 'mobile') result = validateMobile(value);
        else if (fieldName === 'password') result = validatePassword(value);
        else if (fieldName === 'confirmPassword') result = validateConfirmPassword(value, formData.password);

        if (!result.valid) {
            setLoginErrors(prev => ({ ...prev, [fieldName]: result.message }));
            if (fieldName === 'email') setEmailCheckStatus('idle');
            if (fieldName === 'mobile') setMobileCheckStatus('idle');
        } else {
            if (fieldName === 'email') {
                if (emailCheckStatus !== 'available' && emailCheckStatus !== 'inUse') {
                    performEmailCheck(value);
                }
            } else if (fieldName === 'mobile') {
                if (mobileCheckStatus !== 'available' && mobileCheckStatus !== 'inUse') {
                    performMobileCheck(value);
                }
            } else {
                setLoginErrors(prev => ({ ...prev, [fieldName]: '' }));
            }
        }
    };

    const handlePasswordKeyDown = (e) => {
        if (e.getModifierState) {
            setCapsLockOn(e.getModifierState('CapsLock'));
        }
    };


    // OTP Verification State
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [confirmationChannels, setConfirmationChannels] = useState(['email']);
    const [verifying, setVerifying] = useState(false);
    const [verifyError, setVerifyError] = useState('');
    const [verifySuccess, setVerifySuccess] = useState('');
    const [resending, setResending] = useState(false);
    const [resendTimer, setResendTimer] = useState(0);
    const [canResend, setCanResend] = useState(true);
    const otpRefs = [useRef(), useRef(), useRef(), useRef(), useRef(), useRef()];

    // Pre-populate verified identity data if arriving from Google Sign-In
    React.useEffect(() => {
        if (googleAuthState?.email) {
            setFormData(prev => ({
                ...prev,
                email: googleAuthState.email,
                firstName: prev.firstName || (googleAuthState.fullName ? googleAuthState.fullName.split(' ')[0] : ''),
                lastName: prev.lastName || (googleAuthState.fullName ? googleAuthState.fullName.split(' ').slice(1).join(' ') : ''),
            }));
        }
    }, [googleAuthState]);

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

    const getPreviewKey = (side) => {
        if (side === 'idFront') return 'front';
        if (side === 'idBack') return 'back';
        if (side === 'secondIdFront') return 'secondFront';
        if (side === 'secondIdBack') return 'secondBack';
        return side;
    };

    const handleFileUpload = (e, side) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validate image file type
        if (!file.type || !file.type.startsWith('image/')) {
            setScanError(ID_PHOTO_CONTENT.errors.invalidFileType);
            showSnackbar(ID_PHOTO_CONTENT.errors.invalidFileType, 'error');
            e.target.value = '';
            return;
        }

        // Validate file size (10 MB limit)
        if (file.size > 10 * 1024 * 1024) {
            setScanError(ID_PHOTO_CONTENT.errors.fileTooLarge);
            showSnackbar(ID_PHOTO_CONTENT.errors.fileTooLarge, 'error');
            e.target.value = '';
            return;
        }

        setScanError('');
        const prevKey = getPreviewKey(side);
        if (previousObjectUrlsRef.current[prevKey]) {
            URL.revokeObjectURL(previousObjectUrlsRef.current[prevKey]);
        }
        const url = URL.createObjectURL(file);
        previousObjectUrlsRef.current[prevKey] = url;

        setFormData(prev => ({ ...prev, [side]: file, [side + 'Rotation']: 0 }));
        setHasScanned(false);
        setPreviews(prev => ({ ...prev, [prevKey]: url }));
        const isFront = side.includes('Front');
        const isSecond = side.startsWith('second');
        setPhotoAnnouncement(isFront ? ID_PHOTO_CONTENT.announcements.frontAdded : ID_PHOTO_CONTENT.announcements.backAdded);

        const uploadMsg = isSecond
            ? (isFront ? ID_PHOTO_CONTENT.snackbar.secondFrontUploaded : ID_PHOTO_CONTENT.snackbar.secondBackUploaded)
            : (isFront ? ID_PHOTO_CONTENT.snackbar.frontUploaded : ID_PHOTO_CONTENT.snackbar.backUploaded);
        showSnackbar(uploadMsg, 'success');
        e.target.value = '';
    };

    const handleRemoveID = (e, side) => {
        if (e && e.preventDefault) e.preventDefault();
        if (e && e.stopPropagation) e.stopPropagation();
        const prevKey = getPreviewKey(side);
        if (previousObjectUrlsRef.current[prevKey]) {
            URL.revokeObjectURL(previousObjectUrlsRef.current[prevKey]);
            previousObjectUrlsRef.current[prevKey] = null;
        }
        setFormData(prev => ({ ...prev, [side]: null, [side + 'Rotation']: 0 }));
        setPreviews(prev => ({ ...prev, [prevKey]: null }));
        setImageDimensions(prev => ({
            ...prev,
            [side]: { width: 0, height: 0, ratio: 1.5857 }
        }));

        // Reset the corresponding file input ref so the same file can be re-selected if desired
        if (side === 'idFront' && frontFileInputRef.current) frontFileInputRef.current.value = '';
        if (side === 'idBack' && backFileInputRef.current) backFileInputRef.current.value = '';
        if (side === 'secondIdFront' && secondFrontFileInputRef.current) secondFrontFileInputRef.current.value = '';
        if (side === 'secondIdBack' && secondBackFileInputRef.current) secondBackFileInputRef.current.value = '';

        const isFront = side.includes('Front');
        const isSecond = side.startsWith('second');
        const removeMsg = isSecond
            ? (isFront ? ID_PHOTO_CONTENT.snackbar.secondFrontRemoved : ID_PHOTO_CONTENT.snackbar.secondBackRemoved)
            : (isFront ? ID_PHOTO_CONTENT.snackbar.frontRemoved : ID_PHOTO_CONTENT.snackbar.backRemoved);
        setPhotoAnnouncement(removeMsg);
        showSnackbar(removeMsg, 'info');
    };

    const handleCameraCapture = (file) => {
        let sideKey = 'idFront';
        if (activeCameraSide === 'front') sideKey = 'idFront';
        else if (activeCameraSide === 'back') sideKey = 'idBack';
        else if (activeCameraSide === 'secondFront') sideKey = 'secondIdFront';
        else if (activeCameraSide === 'secondBack') sideKey = 'secondIdBack';

        const prevKey = getPreviewKey(sideKey);
        if (previousObjectUrlsRef.current[prevKey]) {
            URL.revokeObjectURL(previousObjectUrlsRef.current[prevKey]);
        }
        const url = URL.createObjectURL(file);
        previousObjectUrlsRef.current[prevKey] = url;

        setFormData(prev => ({ ...prev, [sideKey]: file, [sideKey + 'Rotation']: 0 }));
        setHasScanned(false);
        setPreviews(prev => ({ ...prev, [prevKey]: url }));
        const isFront = sideKey.includes('Front');
        const isSecond = sideKey.startsWith('second');
        setPhotoAnnouncement(isFront ? ID_PHOTO_CONTENT.announcements.frontAdded : ID_PHOTO_CONTENT.announcements.backAdded);

        const captureMsg = isSecond
            ? (isFront ? ID_PHOTO_CONTENT.snackbar.secondFrontUploaded : ID_PHOTO_CONTENT.snackbar.secondBackUploaded)
            : (isFront ? ID_PHOTO_CONTENT.snackbar.frontUploaded : ID_PHOTO_CONTENT.snackbar.backUploaded);
        showSnackbar(captureMsg, 'success');
    };

    const openCamera = (e, side) => {
        if (e && e.preventDefault) e.preventDefault();
        if (e && e.stopPropagation) e.stopPropagation();
        setActiveCameraSide(side);
        setCameraOpen(true);
    };

    const handleChange = (e) => {
        let { name, value, type, checked } = e.target;

        if (autoFilledFields[name]) {
            setAutoFilledFields(prev => {
                const next = { ...prev };
                delete next[name];
                return next;
            });
        }

        if (name === 'mobile') {
            value = value.replace(/\D/g, '');
            if (value.length > 11) value = value.slice(0, 11);
        }

        setFormData(prev => {
            const next = { ...prev, [name]: type === 'checkbox' ? checked : value };
            if (name === 'dob' && value) {
                const bd = new Date(value + 'T00:00:00');
                const today = new Date();
                let age = today.getFullYear() - bd.getFullYear();
                const m = today.getMonth() - bd.getMonth();
                if (m < 0 || (m === 0 && today.getDate() < bd.getDate())) age--;
                next.age = age >= 0 ? String(age) : '';
                next.dobDate = bd;

                if (age < 18) setAgeError("Residents must be at least 18 years old to register.");
                else if (age > 100) setAgeError("Maximum allowed registration age is 100 years.");
                else setAgeError("");
            }
            if (name === 'barangay' && value) {
                const postal = getPostalCodeForBarangay(value);
                if (postal) next.postalCode = postal;
            }
            return next;
        });
    };

    const idButtonRefs = React.useRef({});

    const handleSelectId = (t) => {
        setFormData(prev => ({
            ...prev,
            selectedIdType: t.id,
            idType: t.name,
            idTier: t.tier,
            secondaryMode: t.tier === 'primary' ? 'manual_review' : 'automated',
        }));
        setScanError('');
    };

    const handleIdKeyDown = (e, currentId) => {
        const ids = SUPPORTED_ID_TYPES.map(t => t.id);
        const currentIndex = ids.indexOf(currentId);
        if (currentIndex === -1) return;

        let targetIndex = -1;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
            e.preventDefault();
            targetIndex = (currentIndex + 1) % ids.length;
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
            e.preventDefault();
            targetIndex = (currentIndex - 1 + ids.length) % ids.length;
        } else if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            const targetType = SUPPORTED_ID_TYPES[currentIndex];
            handleSelectId(targetType);
            return;
        }

        if (targetIndex !== -1) {
            const targetType = SUPPORTED_ID_TYPES[targetIndex];
            handleSelectId(targetType);
            idButtonRefs.current[targetType.id]?.focus();
        }
    };

    const handleSexKeyDown = (e, currentOption) => {
        const options = ['Male', 'Female'];
        const currentIndex = options.indexOf(currentOption);
        if (currentIndex === -1) {
            if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ' || e.key === 'Enter') {
                e.preventDefault();
                setFormData(prev => ({ ...prev, sex: 'Male' }));
            }
            return;
        }
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
            e.preventDefault();
            const nextOption = options[(currentIndex + 1) % options.length];
            setFormData(prev => ({ ...prev, sex: nextOption }));
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
            e.preventDefault();
            const prevOption = options[(currentIndex - 1 + options.length) % options.length];
            setFormData(prev => ({ ...prev, sex: prevOption }));
        } else if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            setFormData(prev => ({ ...prev, sex: currentOption }));
        }
    };

    const isComposingRef = useRef(false);
    const [addressSortNotice, setAddressSortNotice] = useState(null);
    const [fieldConfidences, setFieldConfidences] = useState({});
    const sortNoticeTimerRef = useRef(null);
    const undoStateRef = useRef(null);
    const ignoreSortUntilEditRef = useRef({ houseNo: false, blockLot: false, street: false });

    const runAddressSorting = (currentData, triggerField = null) => {
        if (triggerField && ignoreSortUntilEditRef.current[triggerField]) {
            return;
        }
        const sorted = sortAddressParts({
            houseNo: currentData.houseNo,
            blockLot: currentData.blockLot,
            subdivision: currentData.subdivision,
            street: currentData.street,
            barangay: currentData.barangay || ''
        });
        if (sorted.changed) {
            undoStateRef.current = {
                houseNo: currentData.houseNo,
                blockLot: currentData.blockLot,
                subdivision: currentData.subdivision,
                street: currentData.street,
                triggerField
            };
            setFormData(prev => ({
                ...prev,
                houseNo: sorted.houseNo,
                blockLot: sorted.blockLot,
                subdivision: sorted.subdivision,
                street: sorted.street
            }));
            setAddressSortNotice({
                movedPart: sorted.movedPart,
                fromField: sorted.fromField
            });
            if (sortNoticeTimerRef.current) clearTimeout(sortNoticeTimerRef.current);
            sortNoticeTimerRef.current = setTimeout(() => {
                setAddressSortNotice(null);
            }, 6000);
        }
    };

    const handleAddressSortUndo = () => {
        if (undoStateRef.current) {
            const { houseNo, blockLot, subdivision, street, triggerField } = undoStateRef.current;
            setFormData(prev => ({
                ...prev,
                houseNo,
                blockLot,
                subdivision,
                street
            }));
            if (triggerField) {
                ignoreSortUntilEditRef.current[triggerField] = true;
            }
            setAddressSortNotice(null);
            if (sortNoticeTimerRef.current) clearTimeout(sortNoticeTimerRef.current);
        }
    };

    const handleProperFieldChange = (e, isAddress = false) => {
        const { name, value } = e.target;
        const input = e.target;
        const cursorStart = input.selectionStart;
        const cursorEnd = input.selectionEnd;

        if (autoFilledFields[name]) {
            setAutoFilledFields(prev => {
                const next = { ...prev };
                delete next[name];
                return next;
            });
        }

        if (loginErrors[name]) {
            setLoginErrors(prev => ({ ...prev, [name]: '' }));
        }

        if (ignoreSortUntilEditRef.current[name] !== undefined) {
            ignoreSortUntilEditRef.current[name] = false;
        }

        if (isComposingRef.current) {
            setFormData(prev => ({ ...prev, [name]: value }));
            return;
        }

        const formatted = formatProperText(value, isAddress);
        setFormData(prev => ({ ...prev, [name]: formatted }));

        if (cursorStart !== null && cursorEnd !== null) {
            requestAnimationFrame(() => {
                const lengthDiff = formatted.length - value.length;
                const newPos = Math.max(0, cursorStart + lengthDiff);
                input.setSelectionRange(newPos, newPos);
            });
        }
    };

    const handlePersonFieldBlur = (e) => handleProperFieldBlur(e, false);

    const handleProperFieldBlur = (e, isAddress = false) => {
        const { name, value } = e.target;
        if (typeof value === 'string') {
            const formatted = formatProperText(value, isAddress);
            const nextData = { ...formData, [name]: formatted };
            if (formatted !== value) {
                setFormData(prev => ({ ...prev, [name]: formatted }));
            }
            if (isAddress && ['houseNo', 'blockLot', 'street'].includes(name)) {
                runAddressSorting(nextData, name);
            }
        }
    };

    const handleProperFieldPaste = (e, isAddress = false) => {
        const input = e.target;
        const fieldName = input.name;
        requestAnimationFrame(() => {
            const raw = input.value;
            const formatted = formatProperText(raw, isAddress);
            setFormData(prev => {
                const updated = { ...prev, [fieldName]: formatted };
                if (isAddress && ['houseNo', 'blockLot', 'street'].includes(fieldName)) {
                    setTimeout(() => runAddressSorting(updated, fieldName), 50);
                }
                return updated;
            });
        });
    };

    const handleStep3Click = (e) => {
        if (!detailsValid) {
            e?.preventDefault();
            setStep3Touched({
                firstName: true,
                lastName: true,
                dob: true,
                sex: true,
                idNumber: true,
                barangay: true
            });
            return;
        }
        handleContinueFromStep3();
    };

    const handleContinueFromStep3 = () => {
        const sorted = sortAddressParts({
            houseNo: formData.houseNo,
            blockLot: formData.blockLot,
            subdivision: formData.subdivision,
            street: formData.street,
            barangay: formData.barangay || ''
        });
        setFormData(prev => ({
            ...prev,
            firstName: formatProperText(prev.firstName, false),
            middleName: formatProperText(prev.middleName, false),
            lastName: formatProperText(prev.lastName, false),
            houseNo: sorted.houseNo,
            blockLot: sorted.blockLot,
            subdivision: sorted.subdivision,
            street: sorted.street,
        }));
        setStep(4);
    };

    const handleScanID = async (autoNext = true) => {
        if (!formData.selectedIdType) {
            setScanError('Please select your ID type before scanning.');
            return;
        }
        if (!formData.idFront || !formData.idBack) {
            setScanError('Please upload both the FRONT and BACK of your ID to continue.');
            return;
        }
        // Ensure photo viewer modal is closed and cannot stay open while checking ID
        setViewerSide(null);
        setIsScanning(true);
        setScanError('');

        try {
            const fd = new FormData();
            fd.append('idFront', formData.idFront);
            if (formData.idBack) fd.append('idBack', formData.idBack);
            if (formData.selectedIdType) fd.append('idType', formData.selectedIdType);

            const res = await axios.post(`${API_BASE_URL}/api/verify-residency`, fd, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            const result = res.data;

            if (!result.success) {
                setScanError(result.error || 'Verification failed. Please ensure both images are clear and lay flat.');
                return;
            }

            const data = result.extracted_data;

            if (data.is_visual_face_match === false) {
                setScanError('Face Mismatch: The portrait photo does not match. Please ensure both images are of the same card.');
                setIsFaceVerified(false);
                return;
            }

            setIsFaceVerified(data.is_visual_face_match !== false);
            setFaceMatchConfidence(data.face_match_confidence || 'na');

            if (data.is_document_mismatch) {
                setScanError(data.mismatch_reason || 'ID Mismatch: Front and Back images appear to be from different documents.');
                return;
            }

            if (!data.is_north_caloocan) {
                setScanError(data.verification_message || 'Verification Failed: You must be a resident of Caloocan City to register.');
                return;
            }

            const mapped = mapOcrToForm(data);
            if (data.field_confidences || data.address_parse?.confidences) {
                setFieldConfidences(data.field_confidences || data.address_parse?.confidences || {});
            }
            setFormData(prev => ({
                ...prev,
                firstName: mapped.firstName || prev.firstName,
                middleName: mapped.middleName || prev.middleName,
                lastName: mapped.lastName || prev.lastName,
                suffix: mapped.suffix || prev.suffix,
                dobDate: mapped.dobDate || prev.dobDate,
                dob: mapped.dob || prev.dob,
                age: mapped.age || prev.age,
                sex: mapped.sex || prev.sex,
                houseNo: mapped.houseNo !== undefined ? mapped.houseNo : prev.houseNo,
                blockLot: mapped.blockLot !== undefined ? mapped.blockLot : prev.blockLot,
                subdivision: mapped.subdivision !== undefined ? mapped.subdivision : prev.subdivision,
                street: mapped.street !== undefined ? mapped.street : prev.street,
                barangay: mapped.barangay || prev.barangay,
                postalCode: mapped.postalCode || prev.postalCode,
                municipality: mapped.municipality || prev.municipality,
                idNumber: mapped.idNumber || prev.idNumber,
                idType: data.id_type_label || prev.idType,
                selectedIdType: mapped.selectedIdType || prev.selectedIdType,
            }));

            const newlyFilled = {};
            if (mapped.firstName) newlyFilled.firstName = true;
            if (mapped.middleName) newlyFilled.middleName = true;
            if (mapped.lastName) newlyFilled.lastName = true;
            if (mapped.suffix) newlyFilled.suffix = true;
            if (mapped.dob) newlyFilled.dob = true;
            if (mapped.sex) newlyFilled.sex = true;
            if (mapped.barangay) newlyFilled.barangay = true;
            if (mapped.idNumber) newlyFilled.idNumber = true;
            if (mapped.houseNo) newlyFilled.houseNo = true;
            if (mapped.blockLot) newlyFilled.blockLot = true;
            if (mapped.subdivision) newlyFilled.subdivision = true;
            if (mapped.street) newlyFilled.street = true;
            setAutoFilledFields(newlyFilled);

            const standardSuffixes = ['Jr.', 'Sr.', 'II', 'III', 'IV', 'V'];
            if (mapped.suffix && !standardSuffixes.includes(mapped.suffix)) {
                setIsCustomSuffix(true);
            } else {
                setIsCustomSuffix(false);
            }

            setVerifiedBadge(`${data.id_type ? data.id_type.toUpperCase() : 'ID'} — Caloocan City Verified`);
            if (autoNext) {
                setFormData(prev => ({ ...prev, secondaryMode: 'automated' }));
                setStep(3); // Advances to Step 3: Review Details
            }

        } catch (err) {
            console.error('[Register] Scan error:', err);
            setScanError(err.response?.data?.detail || 'Could not connect to the verification server. Please check your connection.');
        } finally {
            setIsScanning(false);
        }
    };

    const triggerVerifyCode = async (codeOverride) => {
        const code = codeOverride || otp.join('');
        if (code.length < 6 || verifying) return;
        setVerifying(true);
        setVerifyError('');
        try {
            await axios.post(`${API_BASE_URL}/api/auth/verify-registration`, {
                email: formData.email,
                code: code
            });
            setStep(6); // Step 6 is Celebration!
        } catch (err) {
            setVerifyError(err.response?.data?.detail || 'Incorrect code. Please check and try again.');
        } finally {
            setVerifying(false);
        }
    };

    const handleOtpChange = (index, value) => {
        const cleaned = value.replace(/\D/g, '');
        if (!cleaned && value !== '') return;
        const newOtp = [...otp];
        const char = cleaned.slice(-1);
        newOtp[index] = char;
        setOtp(newOtp);
        if (verifyError) setVerifyError('');

        if (char && index < 5) {
            otpRefs[index + 1]?.current?.focus();
        }

        // Auto-submit when all 6 digits are filled
        if (index === 5 && char) {
            const fullCode = newOtp.join('');
            if (fullCode.length === 6) {
                triggerVerifyCode(fullCode);
            }
        }
    };

    const handleOtpKeyDown = (index, e) => {
        if (e.key === 'Backspace') {
            if (!otp[index] && index > 0) {
                const newOtp = [...otp];
                newOtp[index - 1] = '';
                setOtp(newOtp);
                otpRefs[index - 1]?.current?.focus();
            } else {
                const newOtp = [...otp];
                newOtp[index] = '';
                setOtp(newOtp);
            }
        } else if (e.key === 'ArrowLeft' && index > 0) {
            e.preventDefault();
            otpRefs[index - 1]?.current?.focus();
        } else if (e.key === 'ArrowRight' && index < 5) {
            e.preventDefault();
            otpRefs[index + 1]?.current?.focus();
        }
    };

    const handleOtpPaste = (e) => {
        e.preventDefault();
        const data = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        if (!data) return;
        const newOtp = [...otp];
        data.split('').forEach((char, i) => { if (i < 6) newOtp[i] = char; });
        setOtp(newOtp);
        if (verifyError) setVerifyError('');
        const nextIndex = Math.min(data.length, 5);
        otpRefs[nextIndex]?.current?.focus();

        if (data.length === 6) {
            triggerVerifyCode(data);
        }
    };

    const handleVerifyCode = () => triggerVerifyCode();

    const handleResendCode = async () => {
        if (!canResend || resending) return;
        setResending(true);
        setVerifyError('');
        setVerifySuccess('');
        try {
            const response = await axios.post(`${API_BASE_URL}/api/auth/resend-code`, {
                email: formData.email,
                code: '000000'
            });
            const channels = response.data.confirmation_channels || ['email'];
            setConfirmationChannels(channels);
            setVerifySuccess(channels.length === 2
                ? 'The same new code was requested by email and text. Enter either copy.'
                : `A new code was requested by ${channels[0] === 'sms' ? 'text message' : 'email'}.`);
            setResendTimer(60);
            setCanResend(false);
            setOtp(['', '', '', '', '', '']);
            otpRefs[0]?.current?.focus();
            setTimeout(() => setVerifySuccess(''), 6000);
        } catch (err) {
            setVerifyError("Failed to resend code. Please try again in a moment.");
        } finally {
            setResending(false);
        }
    };

    // Auto-focus the email verification code field.
    React.useEffect(() => {
        if (step !== 5) return;
        const timer = setTimeout(() => {
            otpRefs[0]?.current?.focus();
        }, 120);

        return () => {
            clearTimeout(timer);
        };
    }, [step]);

    const handleSubmit = async (e) => {
        if (e && e.preventDefault) e.preventDefault();

        if (isGoogleAuth) {
            setRegistering(true);
            setRegistrationError('');
            try {
                const addressParts = [formData.houseNo, formData.blockLot, formData.subdivision, formData.street].filter(Boolean);
                const effectiveTier = selectedIdTypeObj ? selectedIdTypeObj.tier : (formData.idTier || 'primary');
                const effectiveMode = formData.secondaryMode === 'second_id' ? 'second_id' : 'automated';

                const payload = {
                    email: formData.email,
                    full_name: [formData.firstName, formData.middleName, formData.lastName, formData.suffix].filter(Boolean).join(' ') || googleAuthState.fullName || 'Resident',
                    phone_number: formData.mobile,
                    address: [...addressParts, formData.barangay, formData.municipality].filter(Boolean).join(', '),
                    barangay: formData.barangay,
                    id_tier: effectiveTier,
                    id_type: formData.selectedIdType || formData.idType,
                    secondary_id_type: formData.secondIdType || null,
                    verification_mode: effectiveMode,
                    id_number: formData.idNumber
                };

                const res = await axios.post(`${API_BASE_URL}/api/auth/google/complete-verification`, payload);
                if (res.data.status === 'verified') {
                    setAuthSession(res.data.access_token, res.data.user);
                    setStep(6); // Step 6 Celebration!
                } else if (res.data.status === 'pending_manual_review') {
                    setStep(6);
                }
            } catch (err) {
                const detail = err.response?.data?.detail;
                const detailStr = typeof detail === 'string' ? detail : (Array.isArray(detail) ? detail.map(d => d.msg).join(' ') : '');
                const isMobileDuplicate = detailStr.toLowerCase().includes('mobile number is already registered') ||
                    detailStr.toLowerCase().includes('mobile already registered');
                if (isMobileDuplicate) {
                    setMobileCheckStatus('inUse');
                    setLoginErrors(prev => ({
                        ...prev,
                        mobile: CREATE_LOGIN_CONTENT['mobile.inUse']
                    }));
                    setRegistrationError('');
                    mobileInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    mobileInputRef.current?.focus();
                } else if (err.response?.status === 429) {
                    setRegistrationError('Too many attempts. Please wait a moment and try again.');
                } else if (detailStr) {
                    setRegistrationError(detailStr);
                } else {
                    setRegistrationError(CREATE_LOGIN_CONTENT['register.failed']);
                }
            } finally {
                setRegistering(false);
            }
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            setRegistrationError('Passwords do not match.');
            return;
        }
        setRegistering(true);
        setRegistrationError('');
        try {
            const addressParts = [formData.houseNo, formData.blockLot, formData.subdivision, formData.street].filter(Boolean);
            const effectiveTier = selectedIdTypeObj ? selectedIdTypeObj.tier : (formData.idTier || 'primary');
            const effectiveMode = formData.secondaryMode === 'second_id' ? 'second_id' : 'automated';

            const payload = {
                full_name: [formData.firstName, formData.middleName, formData.lastName, formData.suffix].filter(Boolean).join(' '),
                email: formData.email,
                phone_number: formData.mobile,
                password: formData.password,
                role: 'resident',
                address: [...addressParts, formData.barangay, formData.municipality].filter(Boolean).join(', '),
                barangay: formData.barangay,
                id_tier: effectiveTier,
                id_type: formData.selectedIdType || formData.idType,
                secondary_id_type: formData.secondIdType || null,
                verification_mode: effectiveMode,
            };
            const res = await axios.post(`${API_BASE_URL}/api/auth/register`, payload);
            if (res.status === 200 || res.status === 201) {
                clearAuthSession();
                setConfirmationChannels(res.data.confirmation_channels || ['email']);
                setResendTimer(60);
                setCanResend(false);
                setStep(5); // Step 5 is OTP!
            }
        } catch (err) {
            const detail = err.response?.data?.detail;
            const detailStr = typeof detail === 'string' ? detail : (Array.isArray(detail) ? detail.map(d => d.msg).join(' ') : '');
            const isEmailDuplicate = detailStr.toLowerCase().includes('email is already registered') ||
                detailStr.toLowerCase().includes('email already registered');
            const isMobileDuplicate = detailStr.toLowerCase().includes('mobile number is already registered') ||
                detailStr.toLowerCase().includes('mobile already registered');

            if (isEmailDuplicate || isMobileDuplicate) {
                setRegistrationError('');
                if (isEmailDuplicate) {
                    setEmailCheckStatus('inUse');
                    setLoginErrors(prev => ({
                        ...prev,
                        email: CREATE_LOGIN_CONTENT['email.inUse']
                    }));
                }
                if (isMobileDuplicate) {
                    setMobileCheckStatus('inUse');
                    setLoginErrors(prev => ({
                        ...prev,
                        mobile: CREATE_LOGIN_CONTENT['mobile.inUse']
                    }));
                }

                // If BOTH email and mobile are already used, mark both fields and move focus to the first one (the email).
                if (isEmailDuplicate) {
                    emailInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    emailInputRef.current?.focus();
                } else if (isMobileDuplicate) {
                    mobileInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    mobileInputRef.current?.focus();
                }
            } else if (err.response?.status === 429) {
                setRegistrationError('Too many attempts. Please wait a moment and try again.');
            } else if (detailStr) {
                setRegistrationError(detailStr);
            } else {
                setRegistrationError(CREATE_LOGIN_CONTENT['register.failed']);
            }
        } finally {
            setRegistering(false);
        }
    };

    const selectedIdTypeObj = SUPPORTED_ID_TYPES.find(t => t.id === formData.selectedIdType) || SUPPORTED_ID_TYPES.find(t => t.name === formData.idType);
    const secondIdObj = SUPPORTED_ID_TYPES.find(t => t.id === formData.secondIdType);
    const isIdNumberValid = Boolean(
        formData.idNumber &&
        selectedIdTypeObj &&
        selectedIdTypeObj.pattern.test(formData.idNumber.trim())
    );

    const detailsValid = Boolean(
        formData.firstName?.trim() &&
        formData.lastName?.trim() &&
        formData.dob &&
        formData.barangay &&
        formData.idNumber?.trim() &&
        formData.sex &&
        !ageError
    );

    return (
        <div className="relative min-h-screen h-[100dvh] max-h-[100dvh] w-full bg-gradient-to-b from-white via-[#fffbf9] to-[#fff7f0]/40 dark:from-[#070a12] dark:via-[#090e1a] dark:to-[#070a12] font-sans text-slate-900 dark:text-white flex flex-col justify-between overflow-hidden select-none">

            {/* Hidden File Upload Inputs */}
            <input
                ref={frontFileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFileUpload(e, 'idFront')}
            />
            <input
                ref={backFileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFileUpload(e, 'idBack')}
            />
            <input
                ref={secondFrontFileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFileUpload(e, 'secondIdFront')}
            />
            <input
                ref={secondBackFileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFileUpload(e, 'secondIdBack')}
            />



            {isNativeAndroid() && <NativeAppHeader />}
            {/* ── Top Header: Logo, Dynamic Progress, Theme Toggle (Mirrored from Login) ───────────── */}
            <header className={isNativeAndroid() ? "relative z-20 w-full shrink-0 px-4 py-2" : "relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 w-full flex flex-col gap-2 shrink-0"}>
                {!isNativeAndroid() && (
                <>
                {/* Main Header Row */}
                <div className="w-full flex justify-between items-center gap-2">
                    <Link
                        to="/resident-home"
                        className="flex items-center gap-2 group transition-opacity hover:opacity-90 cursor-pointer shrink-0"
                        title="Caloocan City PULSO Home"
                        aria-label="Caloocan City PULSO Home"
                    >
                        <Branding size="h-9 w-9 sm:h-10 sm:w-10" monochrome={step === 3} />
                    </Link>

                    {/* Center Dynamic Progress Bar (5 Steps - Segmented Stepper) */}
                    {step <= 5 ? (
                        <div className="hidden sm:flex flex-col gap-1.5 w-60 md:w-72">
                            <div className="flex items-center justify-between text-xs">
                                <span className="font-bold text-xs uppercase tracking-wider text-[#ff6b00] dark:text-[#ff8a3d]">
                                    STEP {step} OF 5
                                </span>
                                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[140px]">
                                    {STEP_LABELS[step]}
                                </span>
                            </div>
                            <div
                                className="grid grid-cols-5 gap-1.5 w-full"
                                role="progressbar"
                                aria-valuenow={step}
                                aria-valuemin={1}
                                aria-valuemax={5}
                                aria-label={`Step ${step} of 5: ${STEP_LABELS[step]}`}
                            >
                                {[1, 2, 3, 4, 5].map((s) => (
                                    <div
                                        key={s}
                                        className={`h-1.5 rounded-full transition-all duration-300 ${s <= step ? 'bg-[#ff6b00]' : 'bg-slate-200 dark:bg-slate-800'
                                            }`}
                                    />
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 text-xs font-bold shrink-0">
                            <CheckCircle2 size={14} />
                            <span className="hidden xs:inline">Registration Complete</span>
                            <span className="xs:hidden">Complete</span>
                        </div>
                    )}

                    {/* Right side: Theme Toggle & Home Navigation (Mirrored from Login) */}
                    <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                        <ThemeToggle />
                        <Link
                            to="/resident-home"
                            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 min-h-[44px] min-w-[44px] rounded-xl bg-white/85 dark:bg-slate-800/85 hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 hover:text-[#ff6b00] dark:hover:text-[#ff6b00] border border-slate-200 dark:border-slate-700 text-xs font-bold transition-all shadow-2xs cursor-pointer"
                            title="Return to Home Section"
                            aria-label="Return to Home Section"
                        >
                            <Home size={14} className="text-[#ff6b00]" />
                            <span className="hidden sm:inline">Home</span>
                        </Link>
                    </div>
                </div>

                </>
                )}

                {/* Mobile: Step-by-Step progress placed at the bottom of the header (Segmented Stepper) */}
                {step <= 5 ? (
                    <div className="sm:hidden w-full flex flex-col gap-1.5 pt-1.5">
                        <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-xs uppercase tracking-wider text-[#ff6b00] dark:text-[#ff8a3d]">
                                STEP {step} OF 5
                            </span>
                            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[180px]">
                                {STEP_LABELS[step]}
                            </span>
                        </div>
                        <div
                            className="grid grid-cols-5 gap-1.5 w-full"
                            role="progressbar"
                            aria-valuenow={step}
                            aria-valuemin={1}
                            aria-valuemax={5}
                            aria-label={`Step ${step} of 5: ${STEP_LABELS[step]}`}
                        >
                            {[1, 2, 3, 4, 5].map((s) => (
                                <div
                                    key={s}
                                    className={`h-1.5 rounded-full transition-all duration-300 ${s <= step ? 'bg-[#ff6b00]' : 'bg-slate-200 dark:bg-slate-800'
                                        }`}
                                />
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="sm:hidden w-full flex items-center justify-center pt-1">
                        <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                            <CheckCircle2 size={13} />
                            <span>Registration Complete</span>
                        </div>
                    </div>
                )}
            </header>

            {/* ── Main Single-Focus Content Area (Mobile & Landscape Responsive) ────── */}
            <main ref={mainScrollRef} className={`relative z-10 w-full flex-1 flex flex-col items-center justify-start ${step === 2 ? 'px-3 sm:px-6 py-0 sm:py-3 pb-safe' : 'px-2.5 sm:px-6 py-2 sm:py-4 pb-safe'} overflow-y-auto scroll-pt-4`}>
                <div className={`w-full ${step === 1 ? 'max-w-4xl lg:max-w-[860px]' : step === 2 ? 'max-w-4xl lg:max-w-[880px] min-h-[calc(100dvh-4.5rem)] sm:min-h-0' : step === 3 ? 'max-w-4xl lg:max-w-[980px] xl:max-w-[1000px]' : step === 4 ? 'max-w-xl lg:max-w-[560px]' : step === 5 ? 'max-w-xl lg:max-w-[520px]' : 'max-w-2xl'} bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-[20px] shadow-xl flex flex-col ${step === 1 ? 'p-3.5 sm:p-5 lg:p-5' : step === 2 ? 'p-3 sm:p-5 lg:p-6' : step === 3 ? 'p-4 sm:p-6 lg:p-7' : step === 4 ? 'p-5 sm:p-7 lg:p-9 rounded-[20px]' : step === 5 ? 'p-5 sm:p-8 lg:p-10 rounded-[20px]' : 'p-3.5 sm:p-6 landscape:p-3'} ${step === 2 ? 'my-0 sm:my-2 lg:my-auto' : (step === 3 || step === 4 || step === 5) ? 'my-0 sm:my-2 lg:my-3' : 'my-0 lg:my-auto'}`}>
                    <AnimatePresence mode="wait">

                        {/* ── STEP 1: Which ID do you have with you? ── */}
                        {step === 1 && (
                            <motion.div
                                key="step1"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.25 }}
                                className="flex flex-col h-full justify-between"
                            >
                                <div className="flex flex-col">
                                    {/* Header & Instructions */}
                                    <div className="mb-2.5 sm:mb-3.5 lg:mb-2.5 text-left">
                                        <h1 className="text-xl sm:text-2xl lg:text-[27px] font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                                            Which ID do you have with you?
                                        </h1>
                                        <p className="text-sm sm:text-base lg:text-[14px] text-slate-600 dark:text-slate-300 mt-1 sm:mt-1.5 lg:mt-1 leading-normal sm:leading-relaxed lg:leading-[1.45]">
                                            Choose one Philippine government ID. We will guide you through taking its photos.
                                        </p>
                                        <p className="text-xs sm:text-sm lg:text-[13px] text-slate-500 dark:text-slate-400 mt-0.5 sm:mt-1 lg:mt-0.5 leading-normal sm:leading-relaxed lg:leading-[1.45]">
                                            Next, you will take photos of the front and back of your ID.
                                        </p>
                                    </div>

                                    {/* ID Selection Radio Group Container */}
                                    <div
                                        role="radiogroup"
                                        aria-label="Choose your ID"
                                        className="flex flex-col w-full"
                                    >
                                        {/* Main IDs Section */}
                                        <div className="mt-0.5 sm:mt-1">
                                            <div className="flex flex-row items-baseline gap-1.5 sm:gap-2 mb-1.5 sm:mb-2 lg:mb-1.5">
                                                <h2 className="text-sm sm:text-base lg:text-[15px] font-bold text-slate-900 dark:text-white">
                                                    Main IDs
                                                </h2>
                                                <span className="text-xs sm:text-sm lg:text-[13px] text-slate-500 dark:text-slate-400 font-normal">

                                                </span>
                                            </div>
                                            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-2 sm:gap-2.5 lg:gap-2.5">
                                                {SUPPORTED_ID_TYPES.filter(t => t.tier === 'primary').map((t) => {
                                                    const isSelected = formData.selectedIdType === t.id;
                                                    const activeIndex = SUPPORTED_ID_TYPES.findIndex(item => item.id === formData.selectedIdType);
                                                    const isTabFocusable = isSelected || (activeIndex === -1 && t.id === 'philsys');

                                                    return (
                                                        <button
                                                            key={t.id}
                                                            ref={el => { idButtonRefs.current[t.id] = el; }}
                                                            type="button"
                                                            role="radio"
                                                            aria-checked={isSelected}
                                                            tabIndex={isTabFocusable ? 0 : -1}
                                                            onKeyDown={(e) => handleIdKeyDown(e, t.id)}
                                                            onClick={() => handleSelectId(t)}
                                                            className={`p-2.5 sm:p-3 lg:p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between min-h-[88px] sm:min-h-[96px] lg:min-h-[80px] lg:h-[80px] w-full cursor-pointer group select-none ${isSelected
                                                                ? 'bg-orange-50/80 dark:bg-orange-950/40 border-[#ff6b00] ring-2 ring-[#ff6b00]/30 shadow-xs'
                                                                : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-300 dark:border-slate-700 hover:border-orange-300 dark:hover:border-slate-600 hover:bg-white dark:hover:bg-slate-800/80 active:scale-[0.98]'
                                                                }`}
                                                        >
                                                            {/* Top Row: Icon tile on left, Radio circle on right */}
                                                            <div className="flex items-center justify-between w-full shrink-0">
                                                                <div className={`p-1.5 sm:p-2 lg:p-1.5 rounded-lg shrink-0 transition-colors ${isSelected
                                                                    ? 'bg-orange-100 dark:bg-orange-900/50 text-[#ff6b00]'
                                                                    : 'bg-slate-200/80 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white'
                                                                    }`}>
                                                                    <CreditCard className="w-5 h-5 sm:w-5 sm:h-5 lg:w-[18px] lg:h-[18px]" aria-hidden="true" />
                                                                </div>

                                                                {/* Radio Check Circle */}
                                                                <div className="flex items-center justify-center shrink-0">
                                                                    {isSelected ? (
                                                                        <div className="w-5 h-5 sm:w-6 sm:h-6 lg:w-5 lg:h-5 rounded-full bg-[#ff6b00] text-white flex items-center justify-center shadow-2xs">
                                                                            <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-3 lg:h-3" strokeWidth={3.5} />
                                                                        </div>
                                                                    ) : (
                                                                        <div className="w-5 h-5 sm:w-6 sm:h-6 lg:w-5 lg:h-5 rounded-full border-2 border-slate-300 dark:border-slate-600 group-hover:border-orange-400 transition-colors" />
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {/* Bottom: ID Name */}
                                                            <div className="w-full mt-2 sm:mt-1.5 lg:mt-1">
                                                                <span className={`text-[14px] sm:text-[15px] lg:text-[14px] font-bold leading-snug block break-normal ${isSelected ? 'text-slate-900 dark:text-white' : 'text-slate-800 dark:text-slate-200'
                                                                    }`}>
                                                                    {t.shortName}
                                                                </span>
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Divider */}
                                        <div className="my-2.5 sm:my-3 lg:my-2 border-t border-slate-200/80 dark:border-slate-800/80" />

                                        {/* Other IDs Section */}
                                        <div>
                                            <div className="flex flex-row items-baseline gap-1.5 sm:gap-2 mb-1.5 sm:mb-2 lg:mb-1.5">
                                                <h2 className="text-sm sm:text-base lg:text-[15px] font-bold text-slate-900 dark:text-white">
                                                    Other IDs
                                                </h2>
                                                <span className="text-xs sm:text-sm lg:text-[13px] text-slate-500 dark:text-slate-400 font-normal">

                                                </span>
                                            </div>
                                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-2.5 lg:gap-2.5">
                                                {SUPPORTED_ID_TYPES.filter(t => t.tier === 'secondary').map((t) => {
                                                    const isSelected = formData.selectedIdType === t.id;
                                                    const activeIndex = SUPPORTED_ID_TYPES.findIndex(item => item.id === formData.selectedIdType);
                                                    const isTabFocusable = isSelected || (activeIndex === -1 && t.id === 'philsys');

                                                    return (
                                                        <button
                                                            key={t.id}
                                                            ref={el => { idButtonRefs.current[t.id] = el; }}
                                                            type="button"
                                                            role="radio"
                                                            aria-checked={isSelected}
                                                            tabIndex={isTabFocusable ? 0 : -1}
                                                            onKeyDown={(e) => handleIdKeyDown(e, t.id)}
                                                            onClick={() => handleSelectId(t)}
                                                            className={`p-2.5 sm:p-3 lg:p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between min-h-[88px] sm:min-h-[96px] lg:min-h-[80px] lg:h-[80px] w-full cursor-pointer group select-none ${isSelected
                                                                ? 'bg-orange-50/80 dark:bg-orange-950/40 border-[#ff6b00] ring-2 ring-[#ff6b00]/30 shadow-xs'
                                                                : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-300 dark:border-slate-700 hover:border-orange-300 dark:hover:border-slate-600 hover:bg-white dark:hover:bg-slate-800/80 active:scale-[0.98]'
                                                                }`}
                                                        >
                                                            {/* Top Row: Icon tile on left, Radio circle on right */}
                                                            <div className="flex items-center justify-between w-full shrink-0">
                                                                <div className={`p-1.5 sm:p-2 lg:p-1.5 rounded-lg shrink-0 transition-colors ${isSelected
                                                                    ? 'bg-orange-100 dark:bg-orange-900/50 text-[#ff6b00]'
                                                                    : 'bg-slate-200/80 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white'
                                                                    }`}>
                                                                    <CreditCard className="w-5 h-5 sm:w-5 sm:h-5 lg:w-[18px] lg:h-[18px]" aria-hidden="true" />
                                                                </div>

                                                                {/* Radio Check Circle */}
                                                                <div className="flex items-center justify-center shrink-0">
                                                                    {isSelected ? (
                                                                        <div className="w-5 h-5 sm:w-6 sm:h-6 lg:w-5 lg:h-5 rounded-full bg-[#ff6b00] text-white flex items-center justify-center shadow-2xs">
                                                                            <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-3 lg:h-3" strokeWidth={3.5} />
                                                                        </div>
                                                                    ) : (
                                                                        <div className="w-5 h-5 sm:w-6 sm:h-6 lg:w-5 lg:h-5 rounded-full border-2 border-slate-300 dark:border-slate-600 group-hover:border-orange-400 transition-colors" />
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {/* Bottom: ID Name */}
                                                            <div className="w-full mt-2 sm:mt-1.5 lg:mt-1">
                                                                <span className={`text-[14px] sm:text-[15px] lg:text-[14px] font-bold leading-snug block break-normal ${isSelected ? 'text-slate-900 dark:text-white' : 'text-slate-800 dark:text-slate-200'
                                                                    }`}>
                                                                    {t.shortName}
                                                                </span>
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Tip Box */}
                                    <div
                                        role="region"
                                        aria-live="polite"
                                        aria-label="ID Requirements Tip"
                                        className="mt-3 sm:mt-3.5 lg:mt-2.5 p-3 sm:p-3.5 lg:p-2.5 rounded-xl bg-orange-50/70 dark:bg-orange-950/25 border border-orange-200/80 dark:border-orange-900/40 flex items-start gap-2.5 sm:gap-3 lg:gap-2.5 min-h-[72px] sm:min-h-[76px] lg:min-h-[62px] transition-all"
                                    >
                                        <Info className="w-5 h-5 sm:w-[22px] sm:h-[22px] lg:w-[18px] lg:h-[18px] text-[#ff6b00] shrink-0 mt-0.5" aria-hidden="true" />
                                        <div className="flex-1 min-w-0 text-xs sm:text-sm lg:text-[13px] leading-relaxed">
                                            {selectedIdTypeObj ? (
                                                <>
                                                    <p className="font-bold text-slate-900 dark:text-white">
                                                        You will need: {selectedIdTypeObj.idNumberLabel}
                                                    </p>
                                                    {selectedIdTypeObj.instructions && (
                                                        <p className="text-slate-600 dark:text-slate-300 mt-0.5">
                                                            {selectedIdTypeObj.instructions}
                                                        </p>
                                                    )}
                                                </>
                                            ) : (
                                                <p className="text-slate-600 dark:text-slate-400">
                                                    Choose one ID above to see what number you will need.
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Privacy Policy & Terms of Service Agreement Checkbox */}
                                    <div
                                        onClick={() => setAgreedToTerms(prev => !prev)}
                                        className="mt-2.5 sm:mt-3 lg:mt-2 p-2.5 sm:p-3 lg:p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100/70 dark:hover:bg-slate-800/80 border border-slate-200 dark:border-slate-800 flex items-start gap-2.5 sm:gap-3 lg:gap-2.5 cursor-pointer transition-colors group select-none min-h-[44px] lg:min-h-[40px]"
                                    >
                                        <div
                                            role="checkbox"
                                            aria-checked={agreedToTerms}
                                            tabIndex={0}
                                            aria-label="I agree to the Privacy Policy and Terms of Service under the Data Privacy Act (RA 10173)"
                                            onKeyDown={(e) => {
                                                if (e.key === ' ' || e.key === 'Enter') {
                                                    e.preventDefault();
                                                    setAgreedToTerms(prev => !prev);
                                                }
                                            }}
                                            className={`mt-0.5 w-5 h-5 sm:w-6 sm:h-6 lg:w-5 lg:h-5 rounded-md flex items-center justify-center shrink-0 transition-all border ${agreedToTerms
                                                ? 'bg-[#ff6b00] border-[#ff6b00] text-white shadow-2xs'
                                                : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 group-hover:border-[#ff6b00]'
                                                }`}
                                        >
                                            {agreedToTerms && (
                                                <Check size={14} strokeWidth={3.5} className="text-white stroke-white" />
                                            )}
                                        </div>
                                        <span className="text-xs sm:text-sm lg:text-[13px] text-slate-700 dark:text-slate-300 leading-relaxed">
                                            I agree to the{' '}
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    setLegalModal({ isOpen: true, tab: 'privacy' });
                                                }}
                                                className="text-[#ff6b00] font-bold underline hover:opacity-85 cursor-pointer inline py-0.5 px-0.5 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b00]"
                                            >
                                                Privacy Policy
                                            </button>{' '}
                                            and{' '}
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    setLegalModal({ isOpen: true, tab: 'terms' });
                                                }}
                                                className="text-[#ff6b00] font-bold underline hover:opacity-85 cursor-pointer inline py-0.5 px-0.5 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b00]"
                                            >
                                                Terms of Service
                                            </button>{' '}
                                            under the Data Privacy Act (RA 10173).
                                        </span>
                                    </div>
                                </div>

                                {/* Bottom Action Bar */}
                                <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2.5 sm:gap-4 pt-3 lg:pt-2.5 mt-2.5 lg:mt-2 border-t border-slate-200 dark:border-slate-800 sticky sm:static bottom-0 -mx-3.5 sm:mx-0 -mb-3.5 sm:mb-0 px-3.5 sm:px-0 pb-safe sm:pb-0 bg-white/95 dark:bg-slate-900/95 sm:bg-transparent backdrop-blur-md sm:backdrop-blur-none z-10">
                                    <Link
                                        to="/login"
                                        className="inline-flex items-center justify-center gap-1.5 min-h-[44px] px-3 py-1.5 text-sm sm:text-base lg:text-[14px] font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors cursor-pointer group text-center"
                                    >
                                        <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform shrink-0" />
                                        <span>Back to Sign In</span>
                                    </Link>
                                    <button
                                        type="button"
                                        disabled={!formData.selectedIdType || !agreedToTerms}
                                        onClick={() => setStep(2)}
                                        className="w-full sm:w-auto sm:min-w-[300px] lg:min-w-[280px] min-h-[48px] sm:min-h-[52px] lg:min-h-[44px] h-[48px] sm:h-[52px] lg:h-[44px] bg-[#ff6b00] hover:bg-[#e65c00] active:scale-[0.99] text-white py-2 px-5 sm:px-6 rounded-xl font-heading font-bold text-sm sm:text-base lg:text-[14.5px] tracking-normal transition-all shadow-md hover:shadow-lg hover:shadow-orange-500/25 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-2 cursor-pointer"
                                        aria-disabled={!formData.selectedIdType || !agreedToTerms}
                                    >
                                        <span className="truncate">
                                            {!selectedIdTypeObj
                                                ? 'Select an ID to continue'
                                                : `Continue with ${selectedIdTypeObj.shortName}`}
                                        </span>
                                        <ArrowRight size={17} className="shrink-0" />
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {/* ── STEP 2: FRONT & BACK PHOTOS (ZERO DEADSPACE REDESIGN) ── */}
                        {step === 2 && (() => {
                            const currentActiveIdObj = isCapturingSecondId
                                ? (SUPPORTED_ID_TYPES.find(t => t.id === formData.secondIdType) || { shortName: '2nd Supporting ID' })
                                : selectedIdTypeObj;
                            const hints = getIdHints(currentActiveIdObj);
                            const frontPreview = isCapturingSecondId ? previews.secondFront : previews.front;
                            const backPreview = isCapturingSecondId ? previews.secondBack : previews.back;
                            const primaryPhotosCount = (previews.front ? 1 : 0) + (previews.back ? 1 : 0);
                            const isPrimaryPhotosComplete = Boolean(formData.idFront && formData.idBack);
                            const secondPhotosCount = (previews.secondFront ? 1 : 0) + (previews.secondBack ? 1 : 0);
                            const isSecondIdComplete = Boolean(formData.secondIdType && formData.secondIdFront && formData.secondIdBack);

                            const frontKey = isCapturingSecondId ? 'secondIdFront' : 'idFront';
                            const backKey = isCapturingSecondId ? 'secondIdBack' : 'idBack';
                            const frontCameraKey = isCapturingSecondId ? 'secondFront' : 'front';
                            const backCameraKey = isCapturingSecondId ? 'secondBack' : 'back';
                            const frontFileInput = isCapturingSecondId ? secondFrontFileInputRef : frontFileInputRef;
                            const backFileInput = isCapturingSecondId ? secondBackFileInputRef : backFileInputRef;

                            return (
                                <motion.div
                                    key={isCapturingSecondId ? "step2-second" : "step2-primary"}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.25 }}
                                    className="flex flex-col h-full justify-between"
                                >
                                    <div className="flex flex-col">
                                        {/* Header */}
                                        <div className="mb-2 sm:mb-3 text-left flex flex-col sm:flex-row sm:items-start justify-between gap-1">
                                            <div>
                                                <h1 className="text-lg min-[360px]:text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                                                    {isCapturingSecondId ? "Supporting Second ID" : "Front & Back Photos"}
                                                </h1>
                                                <p className="text-xs min-[360px]:text-sm text-slate-600 dark:text-slate-300 mt-0.5 sm:mt-1 leading-relaxed">
                                                    {isCapturingSecondId
                                                        ? `Pairing with your ${selectedIdTypeObj ? selectedIdTypeObj.shortName : 'first ID'}. Attach your 2nd card.`
                                                        : `Take or upload a photo of the front and back of your ${selectedIdTypeObj ? selectedIdTypeObj.shortName : 'National ID'}.`
                                                    }
                                                </p>
                                            </div>
                                            {isCapturingSecondId && (
                                                <span className="self-start text-[10px] font-extrabold uppercase tracking-wider bg-orange-100 dark:bg-orange-950/60 text-[#ff6b00] px-2.5 py-0.5 rounded-full border border-orange-200 dark:border-orange-800 shrink-0 mt-1 sm:mt-0">
                                                    Fast-Track 2nd ID
                                                </span>
                                            )}
                                        </div>

                                        {/* Optional 2nd ID Type Dropdown when capturing second ID */}
                                        {isCapturingSecondId && (
                                            <div className="mb-2.5 p-2 sm:p-2.5 rounded-xl bg-orange-50/70 dark:bg-orange-950/30 border border-orange-200/80 dark:border-orange-800/60 flex items-center justify-between gap-2">
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <Layers size={15} className="text-[#ff6b00]" />
                                                    <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">2nd ID Type:</span>
                                                </div>
                                                <select
                                                    value={formData.secondIdType}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, secondIdType: e.target.value }))}
                                                    className="text-xs sm:text-sm font-semibold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1 text-slate-800 dark:text-slate-100 outline-none focus:ring-1 focus:ring-[#ff6b00] cursor-pointer"
                                                >
                                                    <option value="">-- Select supporting ID --</option>
                                                    {SUPPORTED_ID_TYPES.filter(t => t.id !== formData.selectedIdType && t.id !== 'barangay').map(t => (
                                                        <option key={t.id} value={t.id}>{t.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}

                                        {/* 2 Photo Cards: Stacked on Mobile (<768px), Side-by-Side on Desktop/Tablet (>=768px) */}
                                        {/* Polite live region for screen readers */}
                                        <div className="sr-only" aria-live="polite">{photoAnnouncement}</div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 my-1.5 sm:my-2">
                                            {/* ── 1. FRONT OF ID CARD ── */}
                                            <div className="relative rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs p-2.5 sm:p-3 flex flex-col justify-between">
                                                {/* Header row: Label left, Voter's ID / Cert or shortName right */}
                                                <div className="flex items-center justify-between mb-1.5 sm:mb-2 px-0.5">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 flex items-center justify-center text-[11px] font-bold shrink-0">
                                                            1
                                                        </span>
                                                        <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                                                            Front of ID
                                                        </span>
                                                    </div>
                                                    <span className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium truncate max-w-[140px]">
                                                        {currentActiveIdObj?.shortName || "Voter's ID / Cert"}
                                                    </span>
                                                </div>

                                                {/* Dashed Box: Exact same dimensions before and after photo is added */}
                                                <div className="relative w-full aspect-[1.586/1] max-h-[170px] sm:max-h-[195px] rounded-lg sm:rounded-xl border border-dashed border-slate-300 dark:border-slate-600/80 bg-slate-50/70 dark:bg-slate-800/40 flex flex-col items-center justify-center p-3 text-center transition-colors">
                                                    {frontPreview ? (
                                                        <>
                                                            <button
                                                                type="button"
                                                                onClick={(e) => !isScanning && handleRemoveID(e, frontKey)}
                                                                disabled={isScanning}
                                                                aria-label={isCapturingSecondId ? "Remove 2nd ID front photo" : "Remove front photo"}
                                                                title={ID_PHOTO_CONTENT.buttons.removePhoto}
                                                                className="absolute top-2 right-2 sm:top-2.5 sm:right-2.5 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-200/90 dark:bg-slate-700/90 hover:bg-red-50 hover:text-red-600 hover:border-red-300 dark:hover:bg-red-950/60 dark:hover:text-red-400 text-slate-500 dark:text-slate-300 border border-slate-300/70 dark:border-slate-600 flex items-center justify-center transition-all shadow-2xs active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 cursor-pointer z-10"
                                                            >
                                                                <X size={15} aria-hidden="true" />
                                                            </button>
                                                            <div className="w-9 h-9 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-1 shadow-2xs">
                                                                <CheckCircle2 size={18} aria-hidden="true" />
                                                            </div>
                                                            <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 leading-tight truncate max-w-[240px]">
                                                                {ID_PHOTO_CONTENT.photoAdded}{' '}
                                                                <span className="font-normal text-slate-500 dark:text-slate-400">
                                                                    · {isCapturingSecondId ? '2nd ID Front' : 'Front of ID'}
                                                                </span>
                                                            </p>
                                                            <button
                                                                ref={frontViewBtnRef}
                                                                type="button"
                                                                disabled={isScanning}
                                                                onClick={() => !isScanning && setViewerSide(frontKey)}
                                                                aria-label="View Photo, Front of ID"
                                                                className="mt-1.5 inline-flex items-center justify-center gap-1.5 text-xs sm:text-sm font-bold text-[#ff6b00] hover:text-[#e65c00] hover:underline underline-offset-2 transition-colors cursor-pointer py-1 px-2.5 rounded-lg hover:bg-orange-50/80 dark:hover:bg-orange-950/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b00] disabled:opacity-40 disabled:cursor-not-allowed disabled:no-underline disabled:hover:bg-transparent"
                                                            >
                                                                <Eye size={14} className="shrink-0 text-[#ff6b00]" aria-hidden="true" />
                                                                <span>{ID_PHOTO_CONTENT.buttons.viewPhoto}</span>
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <div className="w-9 h-9 rounded-full bg-orange-50 dark:bg-orange-950/40 text-[#ff6b00] flex items-center justify-center mb-1">
                                                                <Camera size={18} aria-hidden="true" />
                                                            </div>
                                                            <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 leading-tight">
                                                                {hints.frontTitle}
                                                            </p>
                                                            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1 max-w-[240px]">
                                                                {hints.frontHint}
                                                            </p>
                                                        </>
                                                    )}
                                                </div>

                                                {/* Two action buttons under box: Retake / Replace if photo exists, Take Photo / Upload if not */}
                                                <div className="flex items-center gap-2 mt-2 sm:mt-2.5 w-full">
                                                    <button
                                                        type="button"
                                                        onClick={(e) => openCamera(e, frontCameraKey)}
                                                        disabled={isScanning}
                                                        className="flex-1 min-h-[44px] h-[44px] px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs active:scale-[0.98] cursor-pointer bg-[#ff6b00] hover:bg-[#e65c00] text-white disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b00]"
                                                        aria-label={frontPreview ? "Retake photo of front of ID" : "Take photo of front of ID"}
                                                    >
                                                        <Camera size={15} className="text-white shrink-0" aria-hidden="true" />
                                                        <span>{frontPreview ? ID_PHOTO_CONTENT.buttons.retake : ID_PHOTO_CONTENT.buttons.takePhoto}</span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => frontFileInput.current?.click()}
                                                        disabled={isScanning}
                                                        className="flex-1 min-h-[44px] h-[44px] px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs active:scale-[0.98] cursor-pointer bg-white dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600 hover:border-[#ff6b00] text-slate-800 dark:text-slate-100 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b00]"
                                                        aria-label={frontPreview ? "Replace file for front of ID" : "Upload file for front of ID"}
                                                    >
                                                        <UploadCloud size={15} className="text-[#ff6b00]" aria-hidden="true" />
                                                        <span>{frontPreview ? ID_PHOTO_CONTENT.buttons.replace : ID_PHOTO_CONTENT.buttons.upload}</span>
                                                    </button>
                                                </div>
                                            </div>

                                            {/* ── 2. BACK OF ID CARD ── */}
                                            <div className="relative rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs p-2.5 sm:p-3 flex flex-col justify-between">
                                                {/* Header row: Label left, Voter's ID / Cert or shortName right */}
                                                <div className="flex items-center justify-between mb-1.5 sm:mb-2 px-0.5">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 flex items-center justify-center text-[11px] font-bold shrink-0">
                                                            2
                                                        </span>
                                                        <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                                                            Back of ID
                                                        </span>
                                                    </div>
                                                    <span className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium truncate max-w-[140px]">
                                                        {currentActiveIdObj?.shortName || "Voter's ID / Cert"}
                                                    </span>
                                                </div>

                                                {/* Dashed Box: Exact same dimensions before and after photo is added */}
                                                <div className="relative w-full aspect-[1.586/1] max-h-[170px] sm:max-h-[195px] rounded-lg sm:rounded-xl border border-dashed border-slate-300 dark:border-slate-600/80 bg-slate-50/70 dark:bg-slate-800/40 flex flex-col items-center justify-center p-3 text-center transition-colors">
                                                    {backPreview ? (
                                                        <>
                                                            <button
                                                                type="button"
                                                                onClick={(e) => !isScanning && handleRemoveID(e, backKey)}
                                                                disabled={isScanning}
                                                                aria-label={isCapturingSecondId ? "Remove 2nd ID back photo" : "Remove back photo"}
                                                                title={ID_PHOTO_CONTENT.buttons.removePhoto}
                                                                className="absolute top-2 right-2 sm:top-2.5 sm:right-2.5 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-200/90 dark:bg-slate-700/90 hover:bg-red-50 hover:text-red-600 hover:border-red-300 dark:hover:bg-red-950/60 dark:hover:text-red-400 text-slate-500 dark:text-slate-300 border border-slate-300/70 dark:border-slate-600 flex items-center justify-center transition-all shadow-2xs active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 cursor-pointer z-10"
                                                            >
                                                                <X size={15} aria-hidden="true" />
                                                            </button>
                                                            <div className="w-9 h-9 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-1 shadow-2xs">
                                                                <CheckCircle2 size={18} aria-hidden="true" />
                                                            </div>
                                                            <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 leading-tight truncate max-w-[240px]">
                                                                {ID_PHOTO_CONTENT.photoAdded}{' '}
                                                                <span className="font-normal text-slate-500 dark:text-slate-400">
                                                                    · {isCapturingSecondId ? '2nd ID Back' : 'Back of ID'}
                                                                </span>
                                                            </p>
                                                            <button
                                                                ref={backViewBtnRef}
                                                                type="button"
                                                                disabled={isScanning}
                                                                onClick={() => !isScanning && setViewerSide(backKey)}
                                                                aria-label="View Photo, Back of ID"
                                                                className="mt-1.5 inline-flex items-center justify-center gap-1.5 text-xs sm:text-sm font-bold text-[#ff6b00] hover:text-[#e65c00] hover:underline underline-offset-2 transition-colors cursor-pointer py-1 px-2.5 rounded-lg hover:bg-orange-50/80 dark:hover:bg-orange-950/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b00] disabled:opacity-40 disabled:cursor-not-allowed disabled:no-underline disabled:hover:bg-transparent"
                                                            >
                                                                <Eye size={14} className="shrink-0 text-[#ff6b00]" aria-hidden="true" />
                                                                <span>{ID_PHOTO_CONTENT.buttons.viewPhoto}</span>
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <div className="w-9 h-9 rounded-full bg-orange-50 dark:bg-orange-950/40 text-[#ff6b00] flex items-center justify-center mb-1">
                                                                <Camera size={18} aria-hidden="true" />
                                                            </div>
                                                            <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 leading-tight">
                                                                {hints.backTitle}
                                                            </p>
                                                            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1 max-w-[240px]">
                                                                {hints.backHint}
                                                            </p>
                                                        </>
                                                    )}
                                                </div>

                                                {/* Two action buttons under box: Retake / Replace if photo exists, Take Photo / Upload if not */}
                                                <div className="flex items-center gap-2 mt-2 sm:mt-2.5 w-full">
                                                    <button
                                                        type="button"
                                                        onClick={(e) => openCamera(e, backCameraKey)}
                                                        disabled={isScanning}
                                                        className="flex-1 min-h-[44px] h-[44px] px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs active:scale-[0.98] cursor-pointer bg-[#ff6b00] hover:bg-[#e65c00] text-white disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b00]"
                                                        aria-label={backPreview ? "Retake photo of back of ID" : "Take photo of back of ID"}
                                                    >
                                                        <Camera size={15} className="text-white shrink-0" aria-hidden="true" />
                                                        <span>{backPreview ? ID_PHOTO_CONTENT.buttons.retake : ID_PHOTO_CONTENT.buttons.takePhoto}</span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => backFileInput.current?.click()}
                                                        disabled={isScanning}
                                                        className="flex-1 min-h-[44px] h-[44px] px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs active:scale-[0.98] cursor-pointer bg-white dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600 hover:border-[#ff6b00] text-slate-800 dark:text-slate-100 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b00]"
                                                        aria-label={backPreview ? "Replace file for back of ID" : "Upload file for back of ID"}
                                                    >
                                                        <UploadCloud size={15} className="text-[#ff6b00]" aria-hidden="true" />
                                                        <span>{backPreview ? ID_PHOTO_CONTENT.buttons.replace : ID_PHOTO_CONTENT.buttons.upload}</span>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Scan Error Notice */}
                                        {scanError && (
                                            <div
                                                role="alert"
                                                className="p-2 sm:p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 flex items-start gap-2 text-xs sm:text-sm font-medium mt-1.5"
                                            >
                                                <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-500" />
                                                <span className="leading-relaxed">{scanError}</span>
                                            </div>
                                        )}

                                        {/* Mobile Tips Strip (Directly below cards) */}
                                        <div className="flex md:hidden items-center justify-around py-1.5 px-2 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/80 dark:border-slate-800/70 mt-1.5 select-none text-[11px] min-[360px]:text-xs font-semibold text-slate-700 dark:text-slate-300">
                                            <div className="flex items-center gap-1">
                                                <CreditCard size={13} className="text-[#ff6b00]" aria-hidden="true" />
                                                <span>Place flat</span>
                                            </div>
                                            <span className="text-slate-300 dark:text-slate-600">•</span>
                                            <div className="flex items-center gap-1">
                                                <Eye size={13} className="text-[#ff6b00]" aria-hidden="true" />
                                                <span>Good light</span>
                                            </div>
                                            <span className="text-slate-300 dark:text-slate-600">•</span>
                                            <div className="flex items-center gap-1">
                                                <EyeOff size={13} className="text-[#ff6b00]" aria-hidden="true" />
                                                <span>No flash</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Bottom Action Bar: Desktop side-by-side with tips, Mobile clean stacked */}
                                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2.5 sm:gap-4 pt-2.5 sm:pt-3 mt-2 sm:mt-2.5 border-t border-slate-200 dark:border-slate-800">
                                        {/* Desktop Tips on Left */}
                                        <div className="hidden md:flex items-center gap-3 text-xs font-semibold text-slate-600 dark:text-slate-300 select-none">
                                            <div className="flex items-center gap-1.5">
                                                <CreditCard size={15} className="text-[#ff6b00]" />
                                                <span>Place card flat</span>
                                            </div>
                                            <span className="text-slate-300 dark:text-slate-700">•</span>
                                            <div className="flex items-center gap-1.5">
                                                <Eye size={15} className="text-[#ff6b00]" />
                                                <span>Use good light</span>
                                            </div>
                                            <span className="text-slate-300 dark:text-slate-700">•</span>
                                            <div className="flex items-center gap-1.5">
                                                <EyeOff size={15} className="text-[#ff6b00]" />
                                                <span>No flash</span>
                                            </div>
                                        </div>

                                        {isCapturingSecondId ? (
                                            <div className="flex flex-col-reverse md:flex-row items-stretch md:items-center gap-2 sm:gap-2.5 w-full md:w-auto">
                                                <button
                                                    type="button"
                                                    onClick={() => setIsCapturingSecondId(false)}
                                                    className="inline-flex items-center justify-center gap-1.5 min-h-[44px] h-[44px] px-4 text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors cursor-pointer text-center"
                                                >
                                                    <ArrowLeft size={15} />
                                                    <span>Back to 1st ID</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setFormData(prev => ({ ...prev, secondaryMode: 'manual_review' }));
                                                        setIsCapturingSecondId(false);
                                                        setStep(3);
                                                    }}
                                                    className="min-h-[40px] text-xs font-semibold text-slate-600 hover:text-amber-600 dark:text-slate-300 dark:hover:text-amber-400 px-3 py-1 transition-colors cursor-pointer text-center"
                                                >
                                                    Skip &amp; Request Manual Review
                                                </button>
                                                <div className="flex flex-col items-center md:items-end gap-1 w-full md:w-auto">
                                                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 text-center md:text-right">
                                                        {!isSecondIdComplete
                                                            ? (secondPhotosCount === 0 ? "Add both photos to continue." : "1 of 2 photos added.")
                                                            : "Both photos ready to continue."
                                                        }
                                                    </span>
                                                    <button
                                                        type="button"
                                                        disabled={!isSecondIdComplete}
                                                        onClick={() => {
                                                            setFormData(prev => ({ ...prev, secondaryMode: 'second_id' }));
                                                            setIsCapturingSecondId(false);
                                                            setStep(3);
                                                        }}
                                                        className={`w-full md:w-auto min-h-[48px] h-[48px] py-2 px-6 rounded-xl font-heading font-extrabold text-sm sm:text-base tracking-normal transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md ${!isSecondIdComplete
                                                            ? 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-300 dark:border-slate-700 shadow-none cursor-not-allowed opacity-90'
                                                            : 'bg-[#ff6b00] hover:bg-[#e65c00] active:scale-[0.99] text-white hover:shadow-lg hover:shadow-orange-500/25'
                                                            }`}
                                                        aria-disabled={!isSecondIdComplete}
                                                    >
                                                        <span>Continue with Dual IDs</span>
                                                        <ArrowRight size={17} />
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col-reverse md:flex-row items-stretch md:items-center gap-2 sm:gap-3 w-full md:w-auto">
                                                <button
                                                    type="button"
                                                    onClick={() => setStep(1)}
                                                    disabled={isScanning}
                                                    className="w-full md:w-auto inline-flex items-center justify-center gap-1.5 min-h-[44px] h-[44px] px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer disabled:opacity-40 text-center"
                                                >
                                                    <ArrowLeft size={15} />
                                                    <span>Back</span>
                                                </button>
                                                <div className="flex flex-col items-center md:items-end gap-1 w-full md:w-auto">
                                                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 text-center md:text-right">
                                                        {!isPrimaryPhotosComplete
                                                            ? (primaryPhotosCount === 0 ? "Add both photos to continue." : "1 of 2 photos added.")
                                                            : "Both photos ready to scan."
                                                        }
                                                    </span>
                                                    <button
                                                        type="button"
                                                        disabled={!isPrimaryPhotosComplete || isScanning}
                                                        onClick={() => handleScanID(true)}
                                                        className={`w-full md:w-[280px] min-h-[48px] h-[48px] py-2 px-6 rounded-xl font-heading font-extrabold text-sm sm:text-base tracking-normal transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md ${!isPrimaryPhotosComplete || isScanning
                                                            ? 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-300 dark:border-slate-700 shadow-none cursor-not-allowed opacity-90'
                                                            : 'bg-[#ff6b00] hover:bg-[#e65c00] active:scale-[0.99] text-white hover:shadow-lg hover:shadow-orange-500/25'
                                                            }`}
                                                        aria-disabled={!isPrimaryPhotosComplete || isScanning}
                                                    >
                                                        {isScanning ? (
                                                            <>
                                                                <Loader2 size={17} className="animate-spin" />
                                                                <span>Checking ID...</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <span>
                                                                    {selectedIdTypeObj?.id === 'barangay'
                                                                        ? 'Check & Submit for Review'
                                                                        : selectedIdTypeObj?.tier === 'secondary'
                                                                            ? 'Scan ID & Next Step'
                                                                            : 'Check My ID'
                                                                    }
                                                                </span>
                                                                <ArrowRight size={17} />
                                                            </>
                                                        )}
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            );
                        })()}

                        {/* ── STEP 3: REVIEW DETAILS ── */}
                        {step === 3 && (() => {
                            const missingRequiredFields = [];
                            if (!formData.firstName?.trim()) missingRequiredFields.push('First Name');
                            if (!formData.lastName?.trim()) missingRequiredFields.push('Last Name');
                            if (!formData.dob) missingRequiredFields.push('Date of Birth');
                            if (!formData.idNumber?.trim()) missingRequiredFields.push(selectedIdTypeObj ? `${selectedIdTypeObj.shortName} Number` : 'ID Number');
                            if (!formData.sex) missingRequiredFields.push('Sex');
                            if (!formData.barangay) missingRequiredFields.push('Barangay');

                            const idLabel = getIdNumberDisplayLabel(selectedIdTypeObj);

                            const barangayOptions = Array.from({ length: 188 }, (_, i) => ({
                                value: `Barangay ${1 + i}`,
                                label: `Barangay ${1 + i}`
                            }));

                            const suffixOptions = [
                                { value: '', label: 'None' },
                                { value: 'Jr.', label: 'Jr.' },
                                { value: 'Sr.', label: 'Sr.' },
                                { value: 'II', label: 'II' },
                                { value: 'III', label: 'III' },
                                { value: 'IV', label: 'IV' },
                                { value: 'V', label: 'V' },
                                { value: '__other__', label: 'Other…' }
                            ];

                            const sexOptions = [
                                { value: 'Male', label: 'Male' },
                                { value: 'Female', label: 'Female' }
                            ];

                            return (
                                <motion.div
                                    key="step3"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.25 }}
                                    className="flex flex-col h-full justify-between"
                                >
                                    <div className="flex flex-col">
                                        {/* Header */}
                                        <div className="mt-1 mb-3 text-center sm:text-left">
                                            <h1 className="text-2xl sm:text-3xl font-black text-black dark:text-white tracking-tight leading-snug">
                                                We read your card details!
                                            </h1>
                                            <p className="text-sm text-black/70 dark:text-white/70 mt-1 font-normal leading-relaxed">
                                                Check if these look right. Tap any box to fix typos or adjust spelling.
                                            </p>
                                        </div>

                                        {/* Verification Status Banner */}
                                        <div className="p-3 rounded-xl bg-white/70 dark:bg-slate-800/40 backdrop-blur-md border border-slate-200/80 dark:border-white/10 shadow-xs flex items-center justify-between text-sm my-2">
                                            <div className="flex items-center gap-2.5">
                                                <ShieldCheck size={18} className="text-emerald-500 shrink-0" aria-hidden="true" />
                                                <span className="font-semibold text-black dark:text-white">
                                                    ID type: {selectedIdTypeObj?.shortName || 'National ID'} (verified)
                                                </span>
                                            </div>
                                        </div>

                                        {/* Two-Column Form Layout on Desktop / Natural Flow */}
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 my-3 px-0.5">
                                            {/* ── LEFT COLUMN: Your Name & Your Details ── */}
                                            <div className="flex flex-col gap-6">
                                                {/* SECTION 1: Your Name */}
                                                <div>
                                                    <div className="flex items-center gap-2 mb-3 pb-1 border-b border-slate-200/80 dark:border-slate-800/80">
                                                        <User size={18} className="text-[#ff6b00]" aria-hidden="true" />
                                                        <h2 className="text-base sm:text-lg font-bold text-black dark:text-white">
                                                            Your Name
                                                        </h2>
                                                    </div>

                                                    <div className="flex flex-col gap-4">
                                                        {/* First Name & Middle Name */}
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                            {/* First Name */}
                                                            <div>
                                                                <label className="text-sm font-bold text-black dark:text-white mb-2 block truncate">
                                                                    First Name <span className="text-red-500 font-bold" aria-hidden="true">*</span><span className="sr-only"> (required)</span>
                                                                    {autoFilledFields.firstName && <span className="sr-only"> (filled in from your ID)</span>}
                                                                </label>
                                                                <input
                                                                    type="text"
                                                                    name="firstName"
                                                                    value={formData.firstName}
                                                                    onChange={(e) => {
                                                                        handleProperFieldChange(e, false);
                                                                        if (step3Touched.firstName) {
                                                                            setStep3Touched(prev => ({ ...prev, firstName: true }));
                                                                        }
                                                                    }}
                                                                    onBlur={(e) => {
                                                                        handleProperFieldBlur(e, false);
                                                                        setStep3Touched(prev => ({ ...prev, firstName: true }));
                                                                    }}
                                                                    onPaste={(e) => handleProperFieldPaste(e, false)}
                                                                    onCompositionStart={() => { isComposingRef.current = true; }}
                                                                    onCompositionEnd={(e) => { isComposingRef.current = false; handleProperFieldChange(e, false); }}
                                                                    autoCapitalize="words"
                                                                    required
                                                                    className={`w-full min-h-[50px] h-[52px] bg-white dark:bg-slate-800/80 border text-base rounded-[14px] px-4 text-black dark:text-white placeholder:text-black/60 dark:placeholder:text-white/60 placeholder:italic focus:ring-2 focus:ring-orange-500 outline-none ${step3Touched.firstName && !formData.firstName?.trim()
                                                                        ? 'border-red-500 ring-1 ring-red-500'
                                                                        : 'border-slate-300 dark:border-slate-700'
                                                                        }`}
                                                                />
                                                                {step3Touched.firstName && !formData.firstName?.trim() && (
                                                                    <p role="alert" className="text-xs text-red-500 font-semibold mt-1">First name is required.</p>
                                                                )}
                                                            </div>

                                                            {/* Middle Name */}
                                                            <div>
                                                                <label className="text-sm font-bold text-black dark:text-white mb-2 block truncate">
                                                                    Middle Name
                                                                    {autoFilledFields.middleName && <span className="sr-only"> (filled in from your ID)</span>}
                                                                </label>
                                                                <input
                                                                    type="text"
                                                                    name="middleName"
                                                                    value={formData.middleName}
                                                                    onChange={(e) => handleProperFieldChange(e, false)}
                                                                    onBlur={(e) => handleProperFieldBlur(e, false)}
                                                                    onPaste={(e) => handleProperFieldPaste(e, false)}
                                                                    onCompositionStart={() => { isComposingRef.current = true; }}
                                                                    onCompositionEnd={(e) => { isComposingRef.current = false; handleProperFieldChange(e, false); }}
                                                                    autoCapitalize="words"
                                                                    placeholder="e.g. Mercado or M."
                                                                    className="w-full min-h-[50px] h-[52px] bg-white dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-base rounded-[14px] px-4 text-black dark:text-white placeholder:text-black/60 dark:placeholder:text-white/60 placeholder:italic focus:ring-2 focus:ring-orange-500 outline-none"
                                                                />
                                                            </div>
                                                        </div>

                                                        {/* Last Name */}
                                                        <div>
                                                            <label className="text-sm font-bold text-black dark:text-white mb-2 block truncate">
                                                                Last Name <span className="text-red-500 font-bold" aria-hidden="true">*</span><span className="sr-only"> (required)</span>
                                                                {autoFilledFields.lastName && <span className="sr-only"> (filled in from your ID)</span>}
                                                            </label>
                                                            <input
                                                                type="text"
                                                                name="lastName"
                                                                value={formData.lastName}
                                                                onChange={(e) => {
                                                                    handleProperFieldChange(e, false);
                                                                    if (step3Touched.lastName) {
                                                                        setStep3Touched(prev => ({ ...prev, lastName: true }));
                                                                    }
                                                                }}
                                                                onBlur={(e) => {
                                                                    handleProperFieldBlur(e, false);
                                                                    setStep3Touched(prev => ({ ...prev, lastName: true }));
                                                                }}
                                                                onPaste={(e) => handleProperFieldPaste(e, false)}
                                                                onCompositionStart={() => { isComposingRef.current = true; }}
                                                                onCompositionEnd={(e) => { isComposingRef.current = false; handleProperFieldChange(e, false); }}
                                                                autoCapitalize="words"
                                                                required
                                                                className={`w-full min-h-[50px] h-[52px] bg-white dark:bg-slate-800/80 border text-base rounded-[14px] px-4 text-black dark:text-white placeholder:text-black/60 dark:placeholder:text-white/60 placeholder:italic focus:ring-2 focus:ring-orange-500 outline-none ${step3Touched.lastName && !formData.lastName?.trim()
                                                                    ? 'border-red-500 ring-1 ring-red-500'
                                                                    : 'border-slate-300 dark:border-slate-700'
                                                                    }`}
                                                            />
                                                            {step3Touched.lastName && !formData.lastName?.trim() && (
                                                                <p role="alert" className="text-xs text-red-500 font-semibold mt-1">Last name is required.</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* SECTION 2: Your Details */}
                                                <div>
                                                    <div className="flex items-center gap-2 mb-3 pb-1 border-b border-slate-200/80 dark:border-slate-800/80">
                                                        <ShieldCheck size={18} className="text-[#ff6b00]" aria-hidden="true" />
                                                        <h2 className="text-base sm:text-lg font-bold text-black dark:text-white">
                                                            Your Details
                                                        </h2>
                                                    </div>

                                                    <div className="flex flex-col gap-4">
                                                        {/* Suffix & Sex (Shared Row) */}
                                                        <div className="grid grid-cols-1 min-[360px]:grid-cols-2 gap-3 sm:gap-4">
                                                            {/* Suffix */}
                                                            <div>
                                                                {isCustomSuffix ? (
                                                                    <div>
                                                                        <label className="text-sm font-bold text-black dark:text-white mb-2 block truncate">
                                                                            Suffix
                                                                            {autoFilledFields.suffix && <span className="sr-only"> (filled in from your ID)</span>}
                                                                        </label>
                                                                        <div className="relative flex items-center">
                                                                            <input
                                                                                type="text"
                                                                                name="suffix"
                                                                                value={formData.suffix}
                                                                                onChange={(e) => handleProperFieldChange(e, false)}
                                                                                onBlur={(e) => handleProperFieldBlur(e, false)}
                                                                                onPaste={(e) => handleProperFieldPaste(e, false)}
                                                                                onCompositionStart={() => { isComposingRef.current = true; }}
                                                                                onCompositionEnd={(e) => { isComposingRef.current = false; handleProperFieldChange(e, false); }}
                                                                                autoCapitalize="words"
                                                                                placeholder="e.g. VI"
                                                                                className="w-full min-h-[50px] h-[52px] bg-white dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-base rounded-[14px] px-4 text-black dark:text-white placeholder:text-black/60 dark:placeholder:text-white/60 placeholder:italic focus:ring-2 focus:ring-orange-500 outline-none pr-9"
                                                                            />
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    setIsCustomSuffix(false);
                                                                                    setFormData(prev => ({ ...prev, suffix: '' }));
                                                                                    if (autoFilledFields.suffix) {
                                                                                        setAutoFilledFields(prev => {
                                                                                            const next = { ...prev };
                                                                                            delete next.suffix;
                                                                                            return next;
                                                                                        });
                                                                                    }
                                                                                }}
                                                                                className="absolute right-2.5 p-1.5 text-black dark:text-white hover:opacity-70 text-sm cursor-pointer"
                                                                                title="Choose from list"
                                                                            >
                                                                                ✕
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <ThemedSelect
                                                                        label="Suffix"
                                                                        name="suffix"
                                                                        value={['', 'Jr.', 'Sr.', 'II', 'III', 'IV', 'V'].includes(formData.suffix) ? formData.suffix : '__other__'}
                                                                        onChange={(e) => {
                                                                            if (e.target.value === '__other__') {
                                                                                setIsCustomSuffix(true);
                                                                                setFormData(prev => ({ ...prev, suffix: '' }));
                                                                            } else {
                                                                                if (autoFilledFields.suffix) {
                                                                                    setAutoFilledFields(prev => {
                                                                                        const next = { ...prev };
                                                                                        delete next.suffix;
                                                                                        return next;
                                                                                    });
                                                                                }
                                                                                handleChange(e);
                                                                            }
                                                                        }}
                                                                        options={suffixOptions}
                                                                        placeholder="None"
                                                                    />
                                                                )}
                                                            </div>

                                                            {/* Sex */}
                                                            <div>
                                                                <ThemedSelect
                                                                    label="Sex"
                                                                    name="sex"
                                                                    value={formData.sex}
                                                                    onChange={(e) => {
                                                                        if (autoFilledFields.sex) {
                                                                            setAutoFilledFields(prev => {
                                                                                const next = { ...prev };
                                                                                delete next.sex;
                                                                                return next;
                                                                            });
                                                                        }
                                                                        setStep3Touched(prev => ({ ...prev, sex: true }));
                                                                        handleChange(e);
                                                                    }}
                                                                    options={sexOptions}
                                                                    placeholder="Select Sex"
                                                                    required
                                                                    error={Boolean(step3Touched.sex && !formData.sex)}
                                                                    helperText={step3Touched.sex && !formData.sex ? 'Please select your sex.' : ''}
                                                                />
                                                            </div>
                                                        </div>

                                                        {/* Date of Birth & Age (Shared Row) */}
                                                        <div className="grid grid-cols-1 min-[360px]:grid-cols-12 gap-3 sm:gap-4">
                                                            {/* Date of Birth */}
                                                            <div className="min-[360px]:col-span-9">
                                                                <label className="text-sm font-bold text-black dark:text-white mb-2 block truncate">
                                                                    Date of Birth <span className="text-red-500 font-bold" aria-hidden="true">*</span><span className="sr-only"> (required)</span>
                                                                    {autoFilledFields.dob && <span className="sr-only"> (filled in from your ID)</span>}
                                                                </label>
                                                                <CustomDatePicker
                                                                    value={formData.dob}
                                                                    onChange={(newDateStr) => {
                                                                        if (autoFilledFields.dob) {
                                                                            setAutoFilledFields(prev => {
                                                                                const next = { ...prev };
                                                                                delete next.dob;
                                                                                return next;
                                                                            });
                                                                        }
                                                                        setStep3Touched(prev => ({ ...prev, dob: true }));
                                                                        handleChange({ target: { name: 'dob', value: newDateStr, type: 'text' } });
                                                                    }}
                                                                    placeholder="Select Date of Birth"
                                                                    error={Boolean(ageError || (step3Touched.dob && !formData.dob))}
                                                                />
                                                                {step3Touched.dob && !formData.dob && (
                                                                    <p role="alert" className="text-xs text-red-500 font-semibold mt-1">Date of birth is required.</p>
                                                                )}
                                                            </div>

                                                            {/* Age (Read-Only) */}
                                                            <div className="min-[360px]:col-span-3">
                                                                <label className="text-sm font-bold text-black dark:text-white mb-2 block truncate">
                                                                    Age
                                                                </label>
                                                                <div
                                                                    role="status"
                                                                    tabIndex={-1}
                                                                    aria-label={formData.age ? `Age: ${formData.age} years old, calculated from the date of birth` : 'Age: not calculated, calculated from the date of birth'}
                                                                    className="w-full min-h-[50px] h-[52px] rounded-[14px] px-4 bg-slate-100 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 flex items-center justify-center text-center select-none"
                                                                >
                                                                    <span className={`text-base font-bold ${formData.age ? 'text-black dark:text-white' : 'text-slate-400 dark:text-slate-500'}`} aria-hidden="true">
                                                                        {formData.age || '-'}
                                                                    </span>
                                                                    <span className="sr-only">
                                                                        {formData.age ? `Age: ${formData.age} years old, calculated from the date of birth` : 'Age: not calculated, calculated from the date of birth'}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* ID Number */}
                                                        <div>
                                                            <label className="text-sm font-bold text-black dark:text-white mb-2 block truncate">
                                                                {idLabel} <span className="text-red-500 font-bold" aria-hidden="true">*</span><span className="sr-only"> (required)</span>
                                                                {autoFilledFields.idNumber && <span className="sr-only"> (filled in from your ID)</span>}
                                                            </label>
                                                            <div className="relative">
                                                                <input
                                                                    type="text"
                                                                    name="idNumber"
                                                                    value={formData.idNumber}
                                                                    onChange={(e) => {
                                                                        handleChange(e);
                                                                        if (step3Touched.idNumber) {
                                                                            setStep3Touched(prev => ({ ...prev, idNumber: true }));
                                                                        }
                                                                    }}
                                                                    onBlur={() => setStep3Touched(prev => ({ ...prev, idNumber: true }))}
                                                                    placeholder={selectedIdTypeObj ? selectedIdTypeObj.formatHint : 'Enter ID Number'}
                                                                    required
                                                                    className={`w-full min-h-[50px] h-[52px] bg-white dark:bg-slate-800/80 border text-base rounded-[14px] px-4 text-black dark:text-white placeholder:text-black/60 dark:placeholder:text-white/60 placeholder:italic focus:ring-2 focus:ring-orange-500 outline-none font-mono-data pr-10 ${step3Touched.idNumber && (!formData.idNumber?.trim() || !isIdNumberValid)
                                                                        ? 'border-red-500 ring-1 ring-red-500'
                                                                        : isIdNumberValid
                                                                            ? 'border-emerald-500/80 dark:border-emerald-500/60'
                                                                            : 'border-slate-300 dark:border-slate-700'
                                                                        }`}
                                                                />
                                                                {step3Touched.idNumber && !formData.idNumber?.trim() && (
                                                                    <p role="alert" className="text-xs text-red-500 font-semibold mt-1">
                                                                        {selectedIdTypeObj ? `${selectedIdTypeObj.shortName} Number` : 'ID Number'} is required.
                                                                    </p>
                                                                )}
                                                                {step3Touched.idNumber && formData.idNumber?.trim() && !isIdNumberValid && (
                                                                    <p role="alert" className="text-xs text-red-500 font-semibold mt-1">
                                                                        Please enter a valid {selectedIdTypeObj ? selectedIdTypeObj.shortName : 'ID'} number format.
                                                                    </p>
                                                                )}
                                                                {isIdNumberValid && (
                                                                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center pointer-events-none" title="Valid ID Number">
                                                                        <CheckCircle size={18} className="text-emerald-500" />
                                                                        <span className="sr-only"> (valid ID number)</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* ── RIGHT COLUMN: Your Address ── */}
                                            <div>
                                                <div className="flex items-center gap-2 mb-3 pb-1 border-b border-slate-200/80 dark:border-slate-800/80">
                                                    <Home size={18} className="text-[#ff6b00]" aria-hidden="true" />
                                                    <h2 className="text-base sm:text-lg font-bold text-black dark:text-white">
                                                        Your Address
                                                    </h2>
                                                </div>

                                                <div className="flex flex-col gap-4">
                                                    {/* House, Floor or Unit & Block and Lot */}
                                                    <div className="grid grid-cols-1 min-[360px]:grid-cols-2 gap-3 sm:gap-4">
                                                        {/* House, Floor or Unit */}
                                                        <div>
                                                            <label className="text-sm font-bold text-black dark:text-white mb-2 block truncate">
                                                                House, Floor or Unit
                                                                {autoFilledFields.houseNo && <span className="sr-only"> (filled in from your ID)</span>}
                                                            </label>
                                                            <input
                                                                type="text"
                                                                name="houseNo"
                                                                value={formData.houseNo}
                                                                onChange={(e) => handleProperFieldChange(e, true)}
                                                                onBlur={(e) => handleProperFieldBlur(e, true)}
                                                                onPaste={(e) => handleProperFieldPaste(e, true)}
                                                                onCompositionStart={() => { isComposingRef.current = true; }}
                                                                onCompositionEnd={(e) => { isComposingRef.current = false; handleProperFieldChange(e, true); }}
                                                                autoCapitalize="words"
                                                                placeholder="e.g. Unit 224"
                                                                className="w-full min-h-[50px] h-[52px] bg-white dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-base rounded-[14px] px-4 text-black dark:text-white placeholder:text-black/60 dark:placeholder:text-white/60 placeholder:italic focus:ring-2 focus:ring-orange-500 outline-none"
                                                            />
                                                        </div>

                                                        {/* Block and Lot (if any) */}
                                                        <div>
                                                            <label className="text-sm font-bold text-black dark:text-white mb-2 block truncate">
                                                                Block and Lot (if any)
                                                                {autoFilledFields.blockLot && <span className="sr-only"> (filled in from your ID)</span>}
                                                            </label>
                                                            <input
                                                                type="text"
                                                                name="blockLot"
                                                                value={formData.blockLot}
                                                                onChange={(e) => handleProperFieldChange(e, true)}
                                                                onBlur={(e) => handleProperFieldBlur(e, true)}
                                                                onPaste={(e) => handleProperFieldPaste(e, true)}
                                                                onCompositionStart={() => { isComposingRef.current = true; }}
                                                                onCompositionEnd={(e) => { isComposingRef.current = false; handleProperFieldChange(e, true); }}
                                                                autoCapitalize="words"
                                                                placeholder="e.g. Bldg D / Blk 5"
                                                                className="w-full min-h-[50px] h-[52px] bg-white dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-base rounded-[14px] px-4 text-black dark:text-white placeholder:text-black/60 dark:placeholder:text-white/60 placeholder:italic focus:ring-2 focus:ring-orange-500 outline-none"
                                                            />
                                                        </div>
                                                    </div>

                                                    {/* Building, Subdivision or Village */}
                                                    <div>
                                                        <label className="text-sm font-bold text-black dark:text-white mb-2 block truncate">
                                                            Building, Subdivision or Village
                                                            {autoFilledFields.subdivision && <span className="sr-only"> (filled in from your ID)</span>}
                                                        </label>
                                                        <input
                                                            type="text"
                                                            name="subdivision"
                                                            value={formData.subdivision}
                                                            onChange={(e) => handleProperFieldChange(e, true)}
                                                            onBlur={(e) => handleProperFieldBlur(e, true)}
                                                            onPaste={(e) => handleProperFieldPaste(e, true)}
                                                            onCompositionStart={() => { isComposingRef.current = true; }}
                                                            onCompositionEnd={(e) => { isComposingRef.current = false; handleProperFieldChange(e, true); }}
                                                            autoCapitalize="words"
                                                            placeholder="e.g. Camarin Residences"
                                                            className="w-full min-h-[50px] h-[52px] bg-white dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-base rounded-[14px] px-4 text-black dark:text-white placeholder:text-black/60 dark:placeholder:text-white/60 placeholder:italic focus:ring-2 focus:ring-orange-500 outline-none"
                                                        />

                                                        {/* Notice when building part is moved */}
                                                        <AnimatePresence>
                                                            {addressSortNotice && (
                                                                <motion.div
                                                                    initial={{ opacity: 0, y: -4 }}
                                                                    animate={{ opacity: 1, y: 0 }}
                                                                    exit={{ opacity: 0, y: -4 }}
                                                                    transition={{ duration: 0.2 }}
                                                                    role="status"
                                                                    aria-live="polite"
                                                                    className="mt-2 p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between gap-2 text-xs sm:text-sm text-slate-700 dark:text-slate-300"
                                                                >
                                                                    <div className="flex items-center gap-1.5 truncate">
                                                                        <Info size={16} className="text-[#ff6b00] shrink-0" aria-hidden="true" />
                                                                        <span className="truncate">
                                                                            Moved <strong className="font-semibold text-black dark:text-white">"{addressSortNotice.movedPart}"</strong> here from {addressSortNotice.fromField}.
                                                                        </span>
                                                                    </div>
                                                                    <button
                                                                        type="button"
                                                                        onClick={handleAddressSortUndo}
                                                                        className="shrink-0 min-h-[44px] px-2.5 font-bold text-[#ff6b00] hover:text-[#e65c00] underline transition-colors cursor-pointer text-xs sm:text-sm"
                                                                        aria-label="Undo moving building part"
                                                                    >
                                                                        Undo
                                                                    </button>
                                                                </motion.div>
                                                            )}
                                                        </AnimatePresence>
                                                    </div>

                                                    {/* Street or Road */}
                                                    <div>
                                                        <label className="text-sm font-bold text-black dark:text-white mb-2 block truncate">
                                                            Street or Road
                                                            {autoFilledFields.street && <span className="sr-only"> (filled in from your ID)</span>}
                                                        </label>
                                                        <input
                                                            type="text"
                                                            name="street"
                                                            value={formData.street}
                                                            onChange={(e) => handleProperFieldChange(e, true)}
                                                            onBlur={(e) => handleProperFieldBlur(e, true)}
                                                            onPaste={(e) => handleProperFieldPaste(e, true)}
                                                            onCompositionStart={() => { isComposingRef.current = true; }}
                                                            onCompositionEnd={(e) => { isComposingRef.current = false; handleProperFieldChange(e, true); }}
                                                            autoCapitalize="words"
                                                            placeholder="e.g. Camarin Road"
                                                            className="w-full min-h-[50px] h-[52px] bg-white dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-base rounded-[14px] px-4 text-black dark:text-white placeholder:text-black/60 dark:placeholder:text-white/60 placeholder:italic focus:ring-2 focus:ring-orange-500 outline-none"
                                                        />
                                                        {(fieldConfidences?.street === 'low' || fieldConfidences?.street === 'medium') && Boolean(formData.street) && (
                                                            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1.5 flex items-center gap-1 font-medium">
                                                                <Info size={13} className="shrink-0" />
                                                                Please check this one.
                                                            </p>
                                                        )}
                                                    </div>

                                                    {/* Barangay (Searchable Themed Dropdown) */}
                                                    <div>
                                                        <ThemedSelect
                                                            label="Barangay"
                                                            name="barangay"
                                                            value={formData.barangay}
                                                            onChange={(e) => {
                                                                if (autoFilledFields.barangay) {
                                                                    setAutoFilledFields(prev => {
                                                                        const next = { ...prev };
                                                                        delete next.barangay;
                                                                        return next;
                                                                    });
                                                                }
                                                                setStep3Touched(prev => ({ ...prev, barangay: true }));
                                                                handleChange(e);
                                                            }}
                                                            options={barangayOptions}
                                                            placeholder="Select Barangay"
                                                            required
                                                            searchable={true}
                                                            error={Boolean(step3Touched.barangay && !formData.barangay)}
                                                            helperText={step3Touched.barangay && !formData.barangay ? 'Please select your barangay.' : ''}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {ageError && (
                                            <div role="alert" className="p-3 rounded-xl bg-red-500/10 border border-red-500/40 text-black dark:text-white text-sm font-semibold my-2 flex items-center gap-2">
                                                <AlertCircle size={16} className="text-red-500 shrink-0" />
                                                <span>{ageError}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Bottom Action Bar */}
                                    <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 pt-4 mt-4 border-t border-slate-200 dark:border-slate-800">
                                        <button
                                            type="button"
                                            onClick={() => setStep(2)}
                                            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 min-h-[48px] h-[48px] px-5 rounded-[14px] border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-base font-semibold text-black dark:text-white hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer text-center"
                                        >
                                            <ArrowLeft size={16} className="text-black dark:text-white" />
                                            <span>Back</span>
                                        </button>
                                        <div className="w-full sm:w-auto">
                                            <button
                                                type="button"
                                                onClick={handleStep3Click}
                                                className={`w-full sm:w-[320px] min-h-[52px] h-[52px] py-2.5 px-6 rounded-[14px] font-heading font-black text-base tracking-normal transition-all flex items-center justify-center gap-2 cursor-pointer ${detailsValid
                                                    ? 'bg-[#ff6b00] hover:bg-[#e65c00] active:scale-[0.99] text-white shadow-md hover:shadow-lg hover:shadow-orange-500/25'
                                                    : 'bg-[#ff6b00]/40 text-white/90 hover:bg-[#ff6b00]/50'
                                                    }`}
                                                aria-disabled={!detailsValid}
                                            >
                                                <span>Looks good, continue!</span>
                                                <ArrowRight size={18} className="text-white" />
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })()}
                        {/* ── STEP 4: CREATE LOGIN / FINALIZE GOOGLE VERIFICATION ── */}
                        {step === 4 && (() => {
                            const isStep4Valid = isGoogleAuth
                                ? (validateMobile(formData.mobile).valid && mobileCheckStatus !== 'checking' && mobileCheckStatus !== 'inUse' && !loginErrors.mobile)
                                : (validateEmail(formData.email).valid &&
                                    validateMobile(formData.mobile).valid &&
                                    validatePassword(formData.password).valid &&
                                    validateConfirmPassword(formData.confirmPassword, formData.password).valid &&
                                    emailCheckStatus !== 'checking' &&
                                    emailCheckStatus !== 'inUse' &&
                                    mobileCheckStatus !== 'checking' &&
                                    mobileCheckStatus !== 'inUse' &&
                                    !loginErrors.email &&
                                    !loginErrors.mobile &&
                                    !loginErrors.password &&
                                    !loginErrors.confirmPassword);



                            const handleAttemptStep4Submit = (e) => {
                                if (e && e.preventDefault) e.preventDefault();
                                if (registering) return;

                                if (!isStep4Valid) {
                                    setLoginTouched({ email: true, mobile: true, password: true, confirmPassword: true });
                                    const emailRes = validateEmail(formData.email);
                                    const mobileRes = validateMobile(formData.mobile);
                                    const pwRes = validatePassword(formData.password);
                                    const cpwRes = validateConfirmPassword(formData.confirmPassword, formData.password);

                                    setLoginErrors({
                                        email: emailRes.valid ? (emailCheckStatus === 'inUse' ? CREATE_LOGIN_CONTENT['email.inUse'] : '') : emailRes.message,
                                        mobile: mobileRes.valid ? (mobileCheckStatus === 'inUse' ? CREATE_LOGIN_CONTENT['mobile.inUse'] : '') : mobileRes.message,
                                        password: pwRes.valid ? '' : pwRes.message,
                                        confirmPassword: cpwRes.valid ? '' : cpwRes.message,
                                    });

                                    if (!isGoogleAuth) {
                                        if (!emailRes.valid || emailCheckStatus === 'inUse') {
                                            emailInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                            emailInputRef.current?.focus();
                                        } else if (!mobileRes.valid || mobileCheckStatus === 'inUse') {
                                            mobileInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                            mobileInputRef.current?.focus();
                                        } else if (!pwRes.valid) {
                                            passwordInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                            passwordInputRef.current?.focus();
                                        } else if (!cpwRes.valid) {
                                            confirmPasswordInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                            confirmPasswordInputRef.current?.focus();
                                        }
                                    } else {
                                        if (!mobileRes.valid || mobileCheckStatus === 'inUse') {
                                            mobileInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                            mobileInputRef.current?.focus();
                                        }
                                    }
                                    return;
                                }

                                handleSubmit(e);
                            };

                            return (
                                <motion.div
                                    key="step4"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.25 }}
                                    className="flex flex-col h-full justify-between"
                                >
                                    <form onSubmit={handleAttemptStep4Submit} className="flex flex-col h-full justify-between" noValidate>
                                        {isGoogleAuth ? (
                                            <div>
                                                {/* Header */}
                                                <div className="flex flex-col items-center sm:items-start text-center sm:text-left mb-6">
                                                    <div className="w-11 h-11 rounded-2xl bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800/60 flex items-center justify-center text-[#ff6b00] shrink-0 mb-3.5 shadow-2xs">
                                                        <ShieldCheck size={22} className="text-[#ff6b00]" aria-hidden="true" />
                                                    </div>
                                                    <h1 className="text-2xl sm:text-[26px] font-black text-black dark:text-white tracking-tight leading-snug">
                                                        Finalize your verified registration
                                                    </h1>
                                                    <p className="text-base text-slate-600 dark:text-slate-300 font-medium leading-relaxed mt-1.5">
                                                        Your Google identity is linked. Confirm your contact mobile number to link your verified ID.
                                                    </p>
                                                </div>

                                                {/* Google Authenticated Account Card */}
                                                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 my-3 flex items-center justify-between gap-3 shadow-2xs">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-700 flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-600 shadow-xs">
                                                            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                                                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                                                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                                                            </svg>
                                                        </div>
                                                        <div className="text-left">
                                                            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Authenticated Google Account</p>
                                                            <p className="text-sm font-bold text-black dark:text-white font-mono-data">{formData.email}</p>
                                                        </div>
                                                    </div>
                                                    <div className="px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5 shrink-0">
                                                        <Check size={13} strokeWidth={3} />
                                                        <span>Verified</span>
                                                    </div>
                                                </div>

                                                {/* Mobile Number Field */}
                                                <div className="my-4 text-left">
                                                    <label htmlFor="google-auth-mobile" className="text-sm font-bold text-black dark:text-white mb-2 block truncate">
                                                        Mobile Number for Emergency & Dispatch Alerts <span className="text-red-500 font-bold" aria-hidden="true">*</span>
                                                        <span className="sr-only"> (required)</span>
                                                    </label>
                                                    <div className="relative">
                                                        <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none" aria-hidden="true" />
                                                        <input
                                                            ref={mobileInputRef}
                                                            id="google-auth-mobile"
                                                            type="tel"
                                                            name="mobile"
                                                            inputMode="tel"
                                                            autoComplete="tel-national"
                                                            enterKeyHint="go"
                                                            value={formatMobileDisplay(formData.mobile)}
                                                            onChange={(e) => handleLoginFieldChange('mobile', e.target.value)}
                                                            onBlur={() => handleLoginFieldBlur('mobile')}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') handleAttemptStep4Submit(e);
                                                            }}
                                                            placeholder="09XX XXX XXXX"
                                                            required
                                                            aria-invalid={mobileCheckStatus === 'inUse' || Boolean(loginErrors.mobile)}
                                                            aria-describedby={
                                                                mobileCheckStatus === 'inUse' || loginErrors.mobile
                                                                    ? "google-mobile-error"
                                                                    : mobileCheckStatus === 'available'
                                                                        ? "google-mobile-success"
                                                                        : undefined
                                                            }
                                                            className={`w-full min-h-[50px] h-[52px] rounded-[14px] pl-11 pr-11 bg-white dark:bg-slate-800/80 border text-base text-black dark:text-white placeholder:text-black/40 dark:placeholder:text-white/40 placeholder:italic font-mono-data transition-colors outline-none ${mobileCheckStatus === 'inUse' || Boolean(loginErrors.mobile)
                                                                ? 'border-red-500 ring-1 ring-red-500'
                                                                : mobileCheckStatus === 'available'
                                                                    ? 'border-emerald-500/80 dark:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500'
                                                                    : 'border-slate-300 dark:border-slate-700 hover:border-slate-400 focus:ring-2 focus:ring-orange-500'
                                                                }`}
                                                        />
                                                        {mobileCheckStatus === 'available' ? (
                                                            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center" title="Available mobile number">
                                                                <CheckCircle2 size={18} className="text-emerald-500" aria-hidden="true" />
                                                                <span className="sr-only"> (available)</span>
                                                            </div>
                                                        ) : (mobileCheckStatus === 'inUse' || Boolean(loginErrors.mobile)) ? (
                                                            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center" title="Mobile number error">
                                                                <AlertCircle size={18} className="text-red-500" aria-hidden="true" />
                                                                <span className="sr-only"> (error)</span>
                                                            </div>
                                                        ) : null}
                                                    </div>

                                                    {/* Under Field Status Message */}
                                                    <div className="mt-1.5 min-h-[22px]" aria-live="polite">
                                                        {mobileCheckStatus === 'available' ? (
                                                            <p id="google-mobile-success" className="text-xs sm:text-sm font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 transition-opacity duration-150 motion-reduce:transition-none whitespace-nowrap">
                                                                <CheckCircle2 size={14} className="text-emerald-500 shrink-0" aria-hidden="true" />
                                                                <span>{CREATE_LOGIN_CONTENT['mobile.available']}</span>
                                                            </p>
                                                        ) : mobileCheckStatus === 'inUse' ? (
                                                            <p id="google-mobile-error" role="alert" className="text-xs sm:text-sm font-semibold text-red-500 dark:text-red-400 flex items-center gap-1.5 transition-opacity duration-150 motion-reduce:transition-none whitespace-nowrap">
                                                                <AlertCircle size={14} className="text-red-500 shrink-0" aria-hidden="true" />
                                                                <span>{CREATE_LOGIN_CONTENT['mobile.inUse']}</span>
                                                            </p>
                                                        ) : loginErrors.mobile ? (
                                                            <p id="google-mobile-error" role="alert" className="text-xs sm:text-sm text-red-500 dark:text-red-400 font-semibold flex items-center gap-1.5 transition-opacity duration-150 motion-reduce:transition-none whitespace-nowrap">
                                                                <AlertCircle size={14} className="text-red-500 shrink-0" aria-hidden="true" />
                                                                <span>{loginErrors.mobile}</span>
                                                            </p>
                                                        ) : mobileCheckStatus === 'error' ? (
                                                            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5 transition-opacity duration-150 motion-reduce:transition-none">
                                                                <Info size={14} className="text-slate-400 shrink-0" aria-hidden="true" />
                                                                <span>{CREATE_LOGIN_CONTENT['check.failed']}</span>
                                                            </p>
                                                        ) : (
                                                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                                                Used exclusively by City Engineering for critical field dispatch updates and tracking.
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Notice */}
                                                <div className="p-3.5 rounded-2xl bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900/40 text-left text-xs text-orange-800 dark:text-orange-300 flex items-start gap-2.5 my-3">
                                                    <ShieldCheck size={18} className="text-[#ff6b00] shrink-0 mt-0.5" />
                                                    <span>Password creation bypassed — your account will sign in securely using your authenticated Google credentials.</span>
                                                </div>

                                                {registrationError && (
                                                    <div role="alert" className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-sm font-semibold my-2 flex items-center gap-2">
                                                        <AlertCircle size={16} className="text-red-500 shrink-0" />
                                                        <span>{registrationError}</span>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div>
                                                {/* Header inside Card */}
                                                <div className="flex flex-col items-center sm:items-start text-center sm:text-left mb-6">
                                                    <h1 className="text-2xl sm:text-[26px] font-black text-black dark:text-white tracking-tight leading-snug">
                                                        Create your login
                                                    </h1>
                                                    <p className="text-base text-slate-600 dark:text-slate-300 font-medium leading-relaxed mt-1.5">
                                                        Set up your credentials to sign in and submit community reports.
                                                    </p>
                                                </div>

                                                {/* One Column for Fields */}
                                                <div className="flex flex-col gap-5 text-left">
                                                    {/* Field 1: Email Address */}
                                                    <div>
                                                        <label htmlFor="login-email" className="text-sm font-bold text-black dark:text-white mb-2 block truncate">
                                                            Email Address <span className="text-red-500 font-bold" aria-hidden="true">*</span>
                                                            <span className="sr-only"> (required)</span>
                                                        </label>
                                                        <div className="relative">
                                                            <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none" aria-hidden="true" />
                                                            <input
                                                                ref={emailInputRef}
                                                                id="login-email"
                                                                type="email"
                                                                name="email"
                                                                inputMode="email"
                                                                autoComplete="email"
                                                                autoCapitalize="none"
                                                                autoCorrect="off"
                                                                spellCheck="false"
                                                                enterKeyHint="next"
                                                                value={formData.email}
                                                                onChange={(e) => handleLoginFieldChange('email', e.target.value)}
                                                                onBlur={() => handleLoginFieldBlur('email')}
                                                                placeholder="juan@example.com"
                                                                required
                                                                aria-invalid={emailCheckStatus === 'inUse' || Boolean(loginErrors.email)}
                                                                aria-describedby={
                                                                    emailCheckStatus === 'inUse' || loginErrors.email
                                                                        ? "login-email-error"
                                                                        : emailCheckStatus === 'available'
                                                                            ? "login-email-success"
                                                                            : undefined
                                                                }
                                                                className={`w-full min-h-[50px] h-[52px] rounded-[14px] pl-11 pr-11 bg-white dark:bg-slate-800/80 border text-base text-black dark:text-white placeholder:text-black/40 dark:placeholder:text-white/40 placeholder:italic transition-colors outline-none ${emailCheckStatus === 'inUse' || Boolean(loginErrors.email)
                                                                    ? 'border-red-500 ring-1 ring-red-500'
                                                                    : emailCheckStatus === 'available'
                                                                        ? 'border-emerald-500/80 dark:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500'
                                                                        : 'border-slate-300 dark:border-slate-700 hover:border-slate-400 focus:ring-2 focus:ring-orange-500'
                                                                    }`}
                                                            />
                                                            {emailCheckStatus === 'available' ? (
                                                                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center" title="Available email address">
                                                                    <CheckCircle2 size={18} className="text-emerald-500" aria-hidden="true" />
                                                                    <span className="sr-only"> (available)</span>
                                                                </div>
                                                            ) : (emailCheckStatus === 'inUse' || Boolean(loginErrors.email)) ? (
                                                                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center" title="Email error">
                                                                    <AlertCircle size={18} className="text-red-500" aria-hidden="true" />
                                                                    <span className="sr-only"> (error)</span>
                                                                </div>
                                                            ) : null}
                                                        </div>

                                                        {/* Under Field Status Message */}
                                                        <div className="mt-1.5 min-h-[22px]" aria-live="polite">
                                                            {emailCheckStatus === 'available' ? (
                                                                <p id="login-email-success" className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 transition-opacity duration-150 motion-reduce:transition-none">
                                                                    <CheckCircle2 size={14} className="text-emerald-500 shrink-0" aria-hidden="true" />
                                                                    <span>{CREATE_LOGIN_CONTENT['email.available']}</span>
                                                                </p>
                                                            ) : emailCheckStatus === 'inUse' ? (
                                                                <p id="login-email-error" role="alert" className="text-xs sm:text-sm font-semibold text-red-500 dark:text-red-400 flex items-center gap-1.5 transition-opacity duration-150 motion-reduce:transition-none whitespace-nowrap">
                                                                    <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" aria-hidden="true" />
                                                                    <span>{CREATE_LOGIN_CONTENT['email.inUse']}</span>
                                                                </p>
                                                            ) : loginErrors.email ? (
                                                                <p id="login-email-error" role="alert" className="text-xs sm:text-sm text-red-500 dark:text-red-400 font-semibold flex items-center gap-1.5 transition-opacity duration-150 motion-reduce:transition-none whitespace-nowrap">
                                                                    <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" aria-hidden="true" />
                                                                    <span>{loginErrors.email}</span>
                                                                </p>
                                                            ) : emailCheckStatus === 'error' ? (
                                                                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5 transition-opacity duration-150 motion-reduce:transition-none">
                                                                    <Info size={14} className="text-slate-400 shrink-0" aria-hidden="true" />
                                                                    <span>{CREATE_LOGIN_CONTENT['check.failed']}</span>
                                                                </p>
                                                            ) : null}
                                                        </div>
                                                    </div>

                                                    {/* Field 2: Mobile Number */}
                                                    <div>
                                                        <label htmlFor="login-mobile" className="text-sm font-bold text-black dark:text-white mb-2 block truncate">
                                                            Mobile Number <span className="text-red-500 font-bold" aria-hidden="true">*</span>
                                                            <span className="sr-only"> (required)</span>
                                                        </label>
                                                        <div className="relative">
                                                            <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none" aria-hidden="true" />
                                                            <input
                                                                ref={mobileInputRef}
                                                                id="login-mobile"
                                                                type="tel"
                                                                name="mobile"
                                                                inputMode="tel"
                                                                autoComplete="tel-national"
                                                                enterKeyHint="next"
                                                                value={formatMobileDisplay(formData.mobile)}
                                                                onChange={(e) => handleLoginFieldChange('mobile', e.target.value)}
                                                                onBlur={() => handleLoginFieldBlur('mobile')}
                                                                placeholder="09XX XXX XXXX"
                                                                required
                                                                aria-invalid={mobileCheckStatus === 'inUse' || Boolean(loginErrors.mobile)}
                                                                aria-describedby={
                                                                    mobileCheckStatus === 'inUse' || loginErrors.mobile
                                                                        ? "login-mobile-error"
                                                                        : mobileCheckStatus === 'available'
                                                                            ? "login-mobile-success"
                                                                            : undefined
                                                                }
                                                                className={`w-full min-h-[50px] h-[52px] rounded-[14px] pl-11 pr-11 bg-white dark:bg-slate-800/80 border text-base text-black dark:text-white placeholder:text-black/40 dark:placeholder:text-white/40 placeholder:italic font-mono-data transition-colors outline-none ${mobileCheckStatus === 'inUse' || Boolean(loginErrors.mobile)
                                                                    ? 'border-red-500 ring-1 ring-red-500'
                                                                    : mobileCheckStatus === 'available'
                                                                        ? 'border-emerald-500/80 dark:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500'
                                                                        : 'border-slate-300 dark:border-slate-700 hover:border-slate-400 focus:ring-2 focus:ring-orange-500'
                                                                    }`}
                                                            />
                                                            {mobileCheckStatus === 'available' ? (
                                                                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center" title="Available mobile number">
                                                                    <CheckCircle2 size={18} className="text-emerald-500" aria-hidden="true" />
                                                                    <span className="sr-only"> (available)</span>
                                                                </div>
                                                            ) : (mobileCheckStatus === 'inUse' || Boolean(loginErrors.mobile)) ? (
                                                                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center" title="Mobile number error">
                                                                    <AlertCircle size={18} className="text-red-500" aria-hidden="true" />
                                                                    <span className="sr-only"> (error)</span>
                                                                </div>
                                                            ) : null}
                                                        </div>

                                                        {/* Under Field Status Message */}
                                                        <div className="mt-1.5 min-h-[22px]" aria-live="polite">
                                                            {mobileCheckStatus === 'available' ? (
                                                                <p id="login-mobile-success" className="text-xs sm:text-sm font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 transition-opacity duration-150 motion-reduce:transition-none whitespace-nowrap">
                                                                    <CheckCircle2 size={14} className="text-emerald-500 shrink-0" aria-hidden="true" />
                                                                    <span>{CREATE_LOGIN_CONTENT['mobile.available']}</span>
                                                                </p>
                                                            ) : mobileCheckStatus === 'inUse' ? (
                                                                <p id="login-mobile-error" role="alert" className="text-xs sm:text-sm font-semibold text-red-500 dark:text-red-400 flex items-center gap-1.5 transition-opacity duration-150 motion-reduce:transition-none whitespace-nowrap">
                                                                    <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" aria-hidden="true" />
                                                                    <span>{CREATE_LOGIN_CONTENT['mobile.inUse']}</span>
                                                                </p>
                                                            ) : loginErrors.mobile ? (
                                                                <p id="login-mobile-error" role="alert" className="text-xs sm:text-sm text-red-500 dark:text-red-400 font-semibold flex items-center gap-1.5 transition-opacity duration-150 motion-reduce:transition-none whitespace-nowrap">
                                                                    <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" aria-hidden="true" />
                                                                    <span>{loginErrors.mobile}</span>
                                                                </p>
                                                            ) : mobileCheckStatus === 'error' ? (
                                                                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5 transition-opacity duration-150 motion-reduce:transition-none">
                                                                    <Info size={14} className="text-slate-400 shrink-0" aria-hidden="true" />
                                                                    <span>{CREATE_LOGIN_CONTENT['check.failed']}</span>
                                                                </p>
                                                            ) : null}
                                                        </div>
                                                    </div>

                                                    {/* Field 3: Password */}
                                                    <div>
                                                        <label htmlFor="login-password" className="text-sm font-bold text-black dark:text-white mb-2 block truncate">
                                                            Password <span className="text-red-500 font-bold" aria-hidden="true">*</span>
                                                            <span className="sr-only"> (required)</span>
                                                        </label>
                                                        <div className="relative">
                                                            <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none" aria-hidden="true" />
                                                            <input
                                                                ref={passwordInputRef}
                                                                id="login-password"
                                                                type={showPassword ? 'text' : 'password'}
                                                                name="password"
                                                                autoComplete="new-password"
                                                                autoCapitalize="none"
                                                                autoCorrect="off"
                                                                spellCheck="false"
                                                                enterKeyHint="next"
                                                                value={formData.password}
                                                                onChange={(e) => handleLoginFieldChange('password', e.target.value)}
                                                                onBlur={() => handleLoginFieldBlur('password')}
                                                                onKeyDown={handlePasswordKeyDown}
                                                                onKeyUp={handlePasswordKeyDown}
                                                                placeholder="At least 8 characters"
                                                                required
                                                                aria-invalid={Boolean(loginErrors.password)}
                                                                aria-describedby="password-rules"
                                                                className={`w-full min-h-[50px] h-[52px] rounded-[14px] pl-11 pr-12 bg-white dark:bg-slate-800/80 border text-base text-black dark:text-white placeholder:text-black/40 dark:placeholder:text-white/40 placeholder:italic transition-colors outline-none ${loginErrors.password
                                                                    ? 'border-red-500 ring-1 ring-red-500'
                                                                    : validatePassword(formData.password).valid
                                                                        ? 'border-emerald-500/80 dark:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500'
                                                                        : 'border-slate-300 dark:border-slate-700 hover:border-slate-400 focus:ring-2 focus:ring-orange-500'
                                                                    }`}
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => setShowPassword(prev => !prev)}
                                                                className="absolute right-1 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center text-slate-400 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
                                                                aria-label={showPassword ? "Hide password" : "Show password"}
                                                            >
                                                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                                            </button>
                                                        </div>

                                                        {/* Caps Lock Warning */}
                                                        {capsLockOn && (
                                                            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1.5 flex items-center gap-1 font-medium">
                                                                <AlertCircle size={13} className="shrink-0" />
                                                                <span>Caps Lock is on</span>
                                                            </p>
                                                        )}

                                                        {/* Live Password Rule Checklist */}
                                                        <div id="password-rules" className="flex flex-col gap-1 mt-2 text-sm select-none" aria-live="polite">
                                                            <div className={`flex items-center gap-2 transition-colors ${formData.password.length >= 8
                                                                ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                                                                : loginErrors.password
                                                                    ? 'text-red-500 dark:text-red-400 font-medium'
                                                                    : 'text-slate-400 dark:text-slate-500'
                                                                }`}>
                                                                {formData.password.length >= 8 ? (
                                                                    <Check size={16} className="text-emerald-500 shrink-0" strokeWidth={2.5} />
                                                                ) : (
                                                                    <div className={`w-3.5 h-3.5 rounded-full border shrink-0 ${loginErrors.password ? 'border-red-400' : 'border-slate-300 dark:border-slate-600'
                                                                        }`} />
                                                                )}
                                                                <span>{CREATE_LOGIN_CONTENT['password.minLength']}</span>
                                                            </div>
                                                        </div>

                                                        {/* Password Strength Indicator */}
                                                        {formData.password && (
                                                            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 mt-2">
                                                                <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                                                                    <span className="text-slate-500 dark:text-slate-400">Password Strength</span>
                                                                    <span className={
                                                                        formData.password.length < 8
                                                                            ? 'text-red-500'
                                                                            : !/[A-Z]/.test(formData.password) || !/[0-9]/.test(formData.password)
                                                                                ? 'text-orange-500'
                                                                                : 'text-emerald-500'
                                                                    }>
                                                                        {formData.password.length < 8
                                                                            ? 'Too Short'
                                                                            : !/[A-Z]/.test(formData.password) || !/[0-9]/.test(formData.password)
                                                                                ? 'Fair'
                                                                                : /[!@#$%^&*(),.?":{}|<>]/.test(formData.password)
                                                                                    ? 'Strong'
                                                                                    : 'Good'
                                                                        }
                                                                    </span>
                                                                </div>
                                                                <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden flex gap-1">
                                                                    <div className={`h-full rounded-full transition-all ${formData.password.length >= 8 ? 'bg-orange-500 w-1/4' : 'bg-red-500 w-1/4'}`} />
                                                                    <div className={`h-full rounded-full transition-all ${/[A-Z]/.test(formData.password) && formData.password.length >= 8 ? 'bg-orange-500 w-1/4' : 'bg-transparent w-1/4'}`} />
                                                                    <div className={`h-full rounded-full transition-all ${/[0-9]/.test(formData.password) && formData.password.length >= 8 ? 'bg-emerald-500 w-1/4' : 'bg-transparent w-1/4'}`} />
                                                                    <div className={`h-full rounded-full transition-all ${/[!@#$%^&*(),.?":{}|<>]/.test(formData.password) && formData.password.length >= 8 ? 'bg-emerald-500 w-1/4' : 'bg-transparent w-1/4'}`} />
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Field 4: Confirm Password */}
                                                    <div>
                                                        <label htmlFor="login-confirm-password" className="text-sm font-bold text-black dark:text-white mb-2 block truncate">
                                                            Confirm Password <span className="text-red-500 font-bold" aria-hidden="true">*</span>
                                                            <span className="sr-only"> (required)</span>
                                                        </label>
                                                        <div className="relative">
                                                            <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none" aria-hidden="true" />
                                                            <input
                                                                ref={confirmPasswordInputRef}
                                                                id="login-confirm-password"
                                                                type={showConfirmPassword ? 'text' : 'password'}
                                                                name="confirmPassword"
                                                                autoComplete="new-password"
                                                                autoCapitalize="none"
                                                                autoCorrect="off"
                                                                spellCheck="false"
                                                                enterKeyHint="go"
                                                                value={formData.confirmPassword}
                                                                onChange={(e) => handleLoginFieldChange('confirmPassword', e.target.value)}
                                                                onBlur={() => handleLoginFieldBlur('confirmPassword')}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter') {
                                                                        handleAttemptStep4Submit(e);
                                                                    }
                                                                }}
                                                                placeholder="Repeat password"
                                                                required
                                                                aria-invalid={Boolean(loginErrors.confirmPassword)}
                                                                aria-describedby={loginErrors.confirmPassword ? "login-confirm-password-error" : undefined}
                                                                className={`w-full min-h-[50px] h-[52px] rounded-[14px] pl-11 pr-12 bg-white dark:bg-slate-800/80 border text-base text-black dark:text-white placeholder:text-black/40 dark:placeholder:text-white/40 placeholder:italic transition-colors outline-none ${loginErrors.confirmPassword
                                                                    ? 'border-red-500 ring-1 ring-red-500'
                                                                    : formData.password && formData.confirmPassword === formData.password
                                                                        ? 'border-emerald-500/80 dark:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500'
                                                                        : 'border-slate-300 dark:border-slate-700 hover:border-slate-400 focus:ring-2 focus:ring-orange-500'
                                                                    }`}
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => setShowConfirmPassword(prev => !prev)}
                                                                className="absolute right-1 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center text-slate-400 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
                                                                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                                                            >
                                                                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                                            </button>
                                                        </div>

                                                        {/* Match status */}
                                                        <div className="mt-1.5 min-h-[22px]" aria-live="polite">
                                                            {formData.confirmPassword && formData.password && formData.confirmPassword === formData.password ? (
                                                                <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                                                                    <Check size={16} strokeWidth={2.5} className="shrink-0" />
                                                                    <span>{CREATE_LOGIN_CONTENT['password.match']}</span>
                                                                </p>
                                                            ) : loginErrors.confirmPassword ? (
                                                                <p id="login-confirm-password-error" role="alert" className="text-sm text-red-500 font-semibold flex items-center gap-1.5">
                                                                    <AlertCircle size={14} className="shrink-0" />
                                                                    <span>{loginErrors.confirmPassword}</span>
                                                                </p>
                                                            ) : null}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Server Error Alert */}
                                                {registrationError && (
                                                    <div role="alert" className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-sm font-semibold my-3 flex items-center gap-2">
                                                        <AlertCircle size={16} className="text-red-500 shrink-0" />
                                                        <span>{registrationError}</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Bottom Action Bar */}
                                        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 pt-4 mt-6 border-t border-slate-200 dark:border-slate-800">
                                            <button
                                                type="button"
                                                onClick={() => setStep(3)}
                                                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 min-h-[48px] h-[48px] px-5 rounded-[14px] border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-base font-semibold text-black dark:text-white hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer text-center"
                                            >
                                                <ArrowLeft size={16} className="text-black dark:text-white" />
                                                <span>{CREATE_LOGIN_CONTENT['buttons.back']}</span>
                                            </button>
                                            <div className="flex flex-col items-center sm:items-end w-full sm:w-auto">
                                                <button
                                                    type="button"
                                                    disabled={!isStep4Valid || registering}
                                                    onClick={handleAttemptStep4Submit}
                                                    className={`w-full sm:w-[220px] min-h-[52px] h-[52px] bg-[#ff6b00] hover:bg-[#e65c00] active:scale-[0.99] text-white py-2.5 px-6 rounded-[14px] font-heading font-black text-base tracking-normal transition-all shadow-md hover:shadow-lg hover:shadow-orange-500/25 flex items-center justify-center gap-2 cursor-pointer ${!isStep4Valid || registering ? 'opacity-45 cursor-not-allowed shadow-none' : ''
                                                        }`}
                                                >
                                                    {registering ? (
                                                        <>
                                                            <Loader2 size={18} className="animate-spin text-white" />
                                                            <span>{isGoogleAuth ? 'Verifying...' : CREATE_LOGIN_CONTENT['buttons.creatingAccount']}</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <span>{isGoogleAuth ? 'Complete Verification' : CREATE_LOGIN_CONTENT['buttons.createAccount']}</span>
                                                            <ArrowRight size={18} className="text-white" />
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    </form>
                                </motion.div>
                            );
                        })()}
                        {/* ── STEP 5: ENTER YOUR 6-DIGIT CODE (REDESIGNED) ── */}
                        {step === 5 && (
                            <motion.div
                                key="step5"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.25 }}
                                className="flex flex-col h-full justify-between"
                            >
                                <div className="flex flex-col">
                                    {/* Icon Tile */}
                                    <div className="w-12 h-12 rounded-2xl bg-orange-500/10 dark:bg-orange-500/20 text-[#ff6b00] flex items-center justify-center mb-3 mx-auto shadow-inner" aria-hidden="true">
                                        <Shield className="w-6 h-6 stroke-[2.25]" />
                                    </div>

                                    {/* Header & Masked Destination Lines */}
                                    <div className="text-center mb-2 sm:mb-4">
                                        <h1 className="text-xl sm:text-2xl lg:text-[26px] font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                                            Enter your 6-digit code
                                        </h1>
                                        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">
                                            {confirmationChannels.length === 2
                                                ? 'The same code was requested by email and text. Enter either copy to confirm your account:'
                                                : `A verification code was requested by ${confirmationChannels.includes('sms') ? 'text message' : 'email'}:`}
                                        </p>
                                        <div className="flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-2.5 pt-2 text-slate-900 dark:text-white font-mono font-bold text-xs sm:text-sm">
                                            {confirmationChannels.includes('email') && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 max-w-full truncate" title={formData.email}>
                                                <Mail size={13} className="text-[#ff6b00] shrink-0" />
                                                <span className="truncate">{maskEmail(formData.email) || formData.email}</span>
                                            </span>}
                                            {confirmationChannels.includes('sms') && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 max-w-full">
                                                <Phone size={13} className="text-[#ff6b00] shrink-0" />
                                                <span>{maskPhoneNumber(formData.mobile)}</span>
                                            </span>}
                                        </div>
                                    </div>

                                    {/* 6 Code Boxes (Responsive: fits 280px phones without wrapping) */}
                                    <div className="flex items-center justify-center gap-1 sm:gap-2.5 my-4 sm:my-6" role="group" aria-label="6-digit verification code">
                                        {otp.map((digit, index) => (
                                            <React.Fragment key={index}>
                                                <input
                                                    ref={otpRefs[index]}
                                                    type="text"
                                                    inputMode="numeric"
                                                    pattern="[0-9]*"
                                                    autoComplete={index === 0 ? "one-time-code" : "off"}
                                                    maxLength={1}
                                                    value={digit}
                                                    aria-label={`Digit ${index + 1} of 6`}
                                                    aria-invalid={Boolean(verifyError)}
                                                    onChange={(e) => handleOtpChange(index, e.target.value)}
                                                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                                                    onPaste={handleOtpPaste}
                                                    className={`w-9 h-12 min-[340px]:w-10 min-[340px]:h-13 sm:w-13 sm:h-16 text-center text-xl sm:text-2xl font-black rounded-xl sm:rounded-2xl border-2 transition-all outline-none font-mono select-all ${verifyError
                                                        ? 'border-red-500 bg-red-500/5 text-red-600 dark:text-red-400 ring-2 ring-red-500/20'
                                                        : digit
                                                            ? 'border-[#ff6b00] bg-orange-500/5 text-slate-900 dark:text-white ring-2 ring-orange-500/15'
                                                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white hover:border-slate-300 dark:hover:border-slate-600'
                                                        } focus:border-[#ff6b00] focus:ring-4 focus:ring-orange-500/20 focus:scale-[1.03]`}
                                                />
                                                {/* Visual separator between digit 3 and 4 */}
                                                {index === 2 && (
                                                    <span className="w-1 sm:w-1.5 h-0.5 bg-slate-300 dark:bg-slate-600 rounded-full mx-0.5 shrink-0" aria-hidden="true" />
                                                )}
                                            </React.Fragment>
                                        ))}
                                    </div>

                                    {/* Resend Countdown Timer & Button */}
                                    <div className="flex flex-col items-center justify-center text-center mt-1 mb-2">
                                        {resendTimer > 0 ? (
                                            <div className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-slate-500 dark:text-slate-400 py-1">
                                                <Clock size={14} className="text-slate-400 dark:text-slate-500 shrink-0" />
                                                <span>Didn't get the code? Resend in</span>
                                                <span className="font-mono font-bold text-[#ff6b00]">
                                                    {Math.floor(resendTimer / 60)}:{(resendTimer % 60).toString().padStart(2, '0')}
                                                </span>
                                            </div>
                                        ) : (
                                            <div className="inline-flex items-center gap-2 py-0.5">
                                                <span className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                                                    Didn't get the code?
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={handleResendCode}
                                                    disabled={resending || !canResend}
                                                    className="min-h-[44px] inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs sm:text-sm font-black text-[#ff6b00] hover:text-[#e65c00] hover:bg-orange-500/10 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                                                >
                                                    <RotateCcw size={14} className={resending ? 'animate-spin' : ''} />
                                                    <span>{resending ? 'Sending...' : 'Resend code'}</span>
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Helper Lines */}
                                    <div className="mt-2 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex flex-col items-center gap-1 text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 text-center">
                                        <p className="flex items-center justify-center gap-1">
                                            <Info size={12} className="text-slate-400 shrink-0" />
                                            <span>{confirmationChannels.includes('email')
                                                ? "Check your spam or junk folder if you can't find the email."
                                                : 'Text delivery may take a few minutes; provider acceptance does not guarantee handset arrival.'}</span>
                                        </p>
                                        <p>
                                            Wrong email or mobile number?{' '}
                                            <button
                                                type="button"
                                                onClick={() => setStep(4)}
                                                className="text-[#ff6b00] font-bold hover:underline cursor-pointer"
                                            >
                                                Go back to edit
                                            </button>
                                        </p>
                                    </div>

                                    {/* Error & Success Alerts */}
                                    {verifyError && (
                                        <div role="alert" className="p-3 rounded-xl bg-red-500/10 border border-red-500/25 text-red-600 dark:text-red-400 text-xs sm:text-sm font-semibold my-2.5 flex items-center justify-center gap-2 text-center" aria-live="assertive">
                                            <AlertCircle size={16} className="shrink-0 text-red-500" />
                                            <span>{verifyError}</span>
                                        </div>
                                    )}

                                    {verifySuccess && (
                                        <div role="status" className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400 text-xs sm:text-sm font-semibold my-2.5 flex items-center justify-center gap-2 text-center" aria-live="polite">
                                            <CheckCircle2 size={16} className="shrink-0 text-emerald-500" />
                                            <span>{verifySuccess}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Action Buttons: Stacked on Mobile, Row on Desktop */}
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 sm:gap-4 pt-4 mt-3 border-t border-slate-100 dark:border-slate-800">
                                    <button
                                        type="button"
                                        onClick={() => setStep(4)}
                                        className="order-2 sm:order-1 w-full sm:w-auto inline-flex items-center justify-center gap-1.5 min-h-[48px] h-[48px] px-5 rounded-[14px] border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm sm:text-base font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer text-center"
                                    >
                                        <ArrowLeft size={16} />
                                        <span>Back</span>
                                    </button>
                                    <button
                                        type="button"
                                        disabled={otp.some(d => !d) || verifying}
                                        onClick={() => triggerVerifyCode()}
                                        className="order-1 sm:order-2 w-full sm:w-auto min-h-[52px] h-[52px] bg-[#ff6b00] hover:bg-[#e65c00] active:scale-[0.99] text-white py-2.5 px-7 rounded-[14px] font-heading font-black text-sm sm:text-base tracking-normal transition-all shadow-md hover:shadow-lg hover:shadow-orange-500/25 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-2 cursor-pointer"
                                    >
                                        {verifying ? (
                                            <>
                                                <Loader2 size={18} className="animate-spin" />
                                                <span>Verifying...</span>
                                            </>
                                        ) : (
                                            <>
                                                <span>Confirm Account</span>
                                                <ArrowRight size={18} />
                                            </>
                                        )}
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {/* ── STEP 6: WELCOME TO PULSO! (Celebration) ── */}
                        {step === 6 && (
                            <motion.div
                                key="step6"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.35 }}
                                className="flex flex-col items-center justify-center text-center py-6 h-full gap-3"
                            >
                                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-500 rounded-full flex items-center justify-center shadow-lg">
                                    <CheckCircle size={38} />
                                </div>
                                <div>
                                    <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                                        Welcome to PULSO! 🎉
                                    </h2>
                                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-sm mt-1 leading-relaxed">
                                        Your account has been confirmed. Sign in to report issues and track city work. ID and residency review are separate.
                                    </p>
                                </div>
                                <Link
                                    to={localStorage.getItem('token') ? "/dashboard" : "/login"}
                                    className="mt-2 bg-[#ff6b00] hover:bg-[#e65c00] active:scale-[0.99] text-white px-8 py-3 rounded-xl font-heading font-bold text-sm tracking-wide transition-all shadow-md hover:shadow-lg hover:shadow-orange-500/25 flex items-center gap-2 cursor-pointer"
                                >
                                    <span>{localStorage.getItem('token') ? "Go to Dashboard" : "Proceed to Sign In"}</span>
                                    <ArrowRight size={16} />
                                </Link>
                            </motion.div>
                        )}

                    </AnimatePresence>
                </div>
            </main>


            {/* Legal Modal */}
            <LegalModal
                isOpen={legalModal.isOpen}
                onClose={() => setLegalModal(prev => ({ ...prev, isOpen: false }))}
                onAccept={() => setAgreedToTerms(true)}
                initialTab={legalModal.tab}
            />

            {/* ID Photo Viewer Modal with Full Screen Zoom & Pan */}
            <IDPhotoViewerModal
                isOpen={Boolean(viewerSide) && !isScanning}
                onClose={() => setViewerSide(null)}
                imageUrl={previews[getPreviewKey(viewerSide)]}
                title={
                    viewerSide === 'idFront'
                        ? ID_PHOTO_CONTENT.viewer.frontTitle
                        : viewerSide === 'idBack'
                            ? ID_PHOTO_CONTENT.viewer.backTitle
                            : viewerSide === 'secondIdFront'
                                ? ID_PHOTO_CONTENT.viewer.secondFrontTitle
                                : ID_PHOTO_CONTENT.viewer.secondBackTitle
                }
                altText={
                    viewerSide?.includes('Front')
                        ? ID_PHOTO_CONTENT.viewer.frontAlt
                        : ID_PHOTO_CONTENT.viewer.backAlt
                }
                rotation={formData[viewerSide + 'Rotation'] || 0}
                triggerRef={viewerSide?.includes('Front') ? frontViewBtnRef : backViewBtnRef}
            />

            {/* Secondary ID Verification Choice Modal */}
            <AnimatePresence>
                {showSecondaryModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 10 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 10 }}
                            className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-5 text-slate-900 dark:text-white"
                        >
                            <div className="flex items-center gap-2.5 mb-2.5">
                                <div className="w-9 h-9 rounded-xl bg-orange-100 dark:bg-orange-950/60 text-[#ff6b00] flex items-center justify-center shrink-0">
                                    <Layers size={18} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                                        Secondary ID Requirement
                                    </h3>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                        {selectedIdTypeObj?.shortName} cannot be verified alone.
                                    </p>
                                </div>
                            </div>

                            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-3.5">
                                Under civic record guidelines, secondary IDs require pairing with a second ID for fast approval, or submission for manual staff review.
                            </p>

                            <div className="space-y-2">
                                {/* Option 1: Fast-track with 2nd ID */}
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowSecondaryModal(false);
                                        setIsCapturingSecondId(true);
                                    }}
                                    className="w-full p-2.5 sm:p-3 rounded-xl border border-orange-300 dark:border-orange-800/80 bg-orange-50/70 dark:bg-orange-950/30 hover:bg-orange-100/70 dark:hover:bg-orange-900/40 text-left transition-all cursor-pointer group flex items-start gap-3"
                                >
                                    <div className="w-5 h-5 rounded-full bg-[#ff6b00] text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                                        <Check size={12} strokeWidth={3} />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-[#ff6b00] transition-colors">
                                                Upload a 2nd Supporting ID
                                            </span>
                                            <span className="text-[9px] uppercase tracking-wider font-extrabold bg-[#ff6b00] text-white px-1.5 py-0.5 rounded-full">
                                                Fast-Track
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                                            Pair with PhilHealth, Voter's, Postal, SSS, etc. Verified automatically.
                                        </p>
                                    </div>
                                </button>

                                {/* Option 2: Manual Review */}
                                <button
                                    type="button"
                                    onClick={() => {
                                        setFormData(prev => ({ ...prev, secondaryMode: 'manual_review' }));
                                        setShowSecondaryModal(false);
                                        setStep(3);
                                    }}
                                    className="w-full p-2.5 sm:p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 text-left transition-all cursor-pointer group flex items-start gap-3"
                                >
                                    <div className="w-5 h-5 rounded-full border border-slate-300 dark:border-slate-600 flex items-center justify-center shrink-0 mt-0.5 group-hover:border-amber-500">
                                        <Clock size={11} className="text-slate-400 group-hover:text-amber-500" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-amber-500 transition-colors">
                                                Submit for Manual Staff Review
                                            </span>
                                            <span className="text-[9px] text-amber-700 dark:text-amber-400 font-semibold">
                                                1-2 Days
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                                            Proceed with just your {selectedIdTypeObj?.shortName}. City staff will manually inspect your submission.
                                        </p>
                                    </div>
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Camera Overlay */}
            <IDCameraModal
                isOpen={cameraOpen}
                onClose={() => setCameraOpen(false)}
                onCapture={handleCameraCapture}
                side={activeCameraSide}
                idTypeName={
                    (activeCameraSide === 'secondFront' || activeCameraSide === 'secondBack')
                        ? (secondIdObj?.shortName || secondIdObj?.name || '2nd Supporting ID')
                        : (selectedIdTypeObj?.shortName || selectedIdTypeObj?.name || formData.idType || 'ID')
                }
            />

            {/* Registration Snackbar Notification */}
            <AnimatePresence>
                {snackbar && (
                    <motion.div
                        initial={{ opacity: 0, y: 30, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        transition={{ duration: 0.22, ease: "easeOut" }}
                        role="status"
                        aria-live="polite"
                        className="fixed bottom-5 sm:bottom-8 left-1/2 -translate-x-1/2 z-[150] max-w-[92vw] sm:max-w-md w-auto bg-white/95 dark:bg-slate-900/95 text-slate-900 dark:text-white px-4 py-2.5 sm:px-5 sm:py-3 rounded-full shadow-xl shadow-slate-900/10 dark:shadow-2xl dark:shadow-black/60 backdrop-blur-md border border-slate-200/90 dark:border-slate-800 flex items-center gap-2.5 text-xs sm:text-sm font-semibold pointer-events-auto"
                    >
                        {snackbar.type === 'error' ? (
                            <AlertCircle size={18} className="text-red-600 dark:text-red-400 shrink-0" aria-hidden="true" />
                        ) : snackbar.type === 'info' ? (
                            <Info size={18} className="text-sky-600 dark:text-sky-400 shrink-0" aria-hidden="true" />
                        ) : (
                            <CheckCircle2 size={18} className="text-emerald-600 dark:text-emerald-400 shrink-0" aria-hidden="true" />
                        )}
                        <span className="truncate text-slate-800 dark:text-slate-100">{snackbar.message}</span>
                        <button
                            type="button"
                            onClick={() => setSnackbar(null)}
                            aria-label="Dismiss notification"
                            className="ml-1 -mr-1 p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        >
                            <X size={14} aria-hidden="true" />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
