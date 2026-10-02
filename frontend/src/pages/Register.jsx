import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    User, Phone, Lock, UploadCloud, CheckCircle, CheckCircle2, XCircle, 
    Loader2, X, ZoomIn, Info, Mail, ShieldCheck, AlertCircle, Camera, 
    Eye, EyeOff, Home, RotateCw, ChevronDown, Calendar, ChevronRight, 
    Check, Sparkles, CreditCard, ArrowLeft, ArrowRight, RefreshCw,
    Layers, Clock
} from 'lucide-react';
import axios from 'axios';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import Branding from '../components/Branding';
import ThemeToggle from '../components/ThemeToggle';
import IDCameraModal from '../components/IDCameraModal';
import LegalModal from '../components/LegalModal';
import CustomDatePicker from '../components/CustomDatePicker';
import { clearAuthSession, setAuthSession } from '../utils/authSession';
import { API_BASE_URL } from '../utils/apiBase';

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

    let houseNo     = '';
    let blockLot    = '';
    let street      = '';
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
        const houseRe = /^(#?\d+[-–\/]?[A-Za-z]?)\s/;
        const houseMatch = s.match(houseRe);
        if (houseMatch) {
            houseNo = houseMatch[1].replace(/^#/, '');
            s = s.replace(houseMatch[0], '').trim();
        }
    }

    const streetRe = /\b((?:[A-Za-z0-9#.\-]+\s+)*(?:[A-Za-z0-9#.\-]+)\s+(?:STREET|ST\.?|AVENUE|AVE\.?|ROAD|RD\.?|BOULEVARD|BLVD\.?|DRIVE|DR\.?|LANE|LN\.?|HIGHWAY|HWY\.?|EXTENSION|EXT\.?|LOOP|WALK|WAY|CIRCLE|CIR\.?))\b/i;
    const streetMatch = s.match(streetRe);
    if (streetMatch) {
        street = streetMatch[1].replace(/\s+/g, ' ').trim();
        street = street.replace(/\b\w/g, c => c.toUpperCase());
        s = s.replace(streetMatch[0], '').trim();
    }

    const subdivRe = /\b((?:[A-Za-z0-9#.\-]+\s+)*(?:[A-Za-z0-9#.\-]+\s+)?(?:HOMES?(?:\s+\d+[A-Z]?)?|VILLAGE|VILL(?:AGE)?\.?|HEIGHTS?|SUBD(?:\.?|IVISION)?|SUBDIVISION|VILLE|ESTATE|PARK(?:\s+\d+)?|PLACE|COURT(?:\s+\d+)?|NORTHVILLE(?:\s+[A-Z0-9]+)?|FAIRVIEW|TOWNVILLE|RESIDENCES?|COMPOUND|ROYALE|VERDE|PALMS?|GARDENS?|GROVE|OAKS?|PINES|HILLS?|VISTAS?))\b/i;
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
            if (bn) s = s.replace(new RegExp(`\\b${bn.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}\\b`, 'gi'), '');
        } catch(_) {}
    }
    s = s.replace(/\b(?:CALOOCAN|KALOOKAN|CITY|NCR|METRO\s+MANILA|MANILA|DISTRICT|ZONE|THIRD\s*DISTRICT)\b/gi, '');
    s = s.replace(/[,\/\s]+$/, '').replace(/^[,\/\s]+/, '').replace(/\s{2,}/g, ' ').trim();

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
        pattern: /^[A-Z0-9\/-]{4,25}$/i,
        frontCopy: 'Front of Barangay ID / Cert',
        backCopy: 'Back / Official Seal',
        instructions: 'Ensure control number, barangay dry seal, and resident photo are clearly visible for AI verification.',
        tier: 'secondary',
        requiresManualReview: false,
    }
];

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
    mapped.firstName = parsedName.firstName;
    mapped.middleName = parsedName.middleName;
    mapped.lastName = parsedName.lastName;
    mapped.suffix = parsedName.suffix;
    
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
    mapped.houseNo = data.house_no !== undefined ? data.house_no : (addr.houseNo || '');
    mapped.blockLot = data.block_lot !== undefined ? data.block_lot : (addr.blockLot || '');
    mapped.subdivision = data.subdivision !== undefined ? data.subdivision : (addr.subdivision || '');
    mapped.street = data.street !== undefined ? data.street : (addr.street || (data.address || '').split('\n')[0].trim());

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
        <span className="inline-flex items-center px-1.5 py-0.5 rounded-md backdrop-blur-md bg-orange-500/15 dark:bg-orange-500/20 border border-orange-500/30 dark:border-orange-400/30 shadow-[0_2px_8px_rgba(255,107,0,0.15)] text-[9px] font-bold text-[#ff6b00] dark:text-orange-400 tracking-wide shrink-0 select-none">
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
    const { theme, changeTheme } = useTheme();

    const [step, setStep] = React.useState(1);
    const [isScanning, setIsScanning] = React.useState(false);
    const [scanError, setScanError] = React.useState('');
    
    // Camera & Preview
    const [cameraOpen, setCameraOpen] = React.useState(false);
    const [activeCameraSide, setActiveCameraSide] = React.useState('front');
    const [legalModal, setLegalModal] = React.useState({ isOpen: false, tab: 'privacy' });
    const [agreedToTerms, setAgreedToTerms] = React.useState(false);

    const frontFileInputRef = React.useRef(null);
    const backFileInputRef = React.useRef(null);
    const secondFrontFileInputRef = React.useRef(null);
    const secondBackFileInputRef = React.useRef(null);

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

    // OTP Verification State
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
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
        setFormData(prev => ({ ...prev, [side]: file, [side + 'Rotation']: 0 }));
        setHasScanned(false);
        const url = URL.createObjectURL(file);
        setPreviews(prev => ({ ...prev, [getPreviewKey(side)]: url }));
    };

    const handleRemoveID = (e, side) => {
        if (e && e.preventDefault) e.preventDefault();
        if (e && e.stopPropagation) e.stopPropagation();
        setFormData(prev => ({ ...prev, [side]: null, [side + 'Rotation']: 0 }));
        setPreviews(prev => ({ ...prev, [getPreviewKey(side)]: null }));
    };

    const handleCameraCapture = (file) => {
        let sideKey = 'idFront';
        if (activeCameraSide === 'front') sideKey = 'idFront';
        else if (activeCameraSide === 'back') sideKey = 'idBack';
        else if (activeCameraSide === 'secondFront') sideKey = 'secondIdFront';
        else if (activeCameraSide === 'secondBack') sideKey = 'secondIdBack';

        setFormData(prev => ({ ...prev, [sideKey]: file, [sideKey + 'Rotation']: 0 }));
        setHasScanned(false);
        const url = URL.createObjectURL(file);
        setPreviews(prev => ({ ...prev, [getPreviewKey(sideKey)]: url }));
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

    const handleScanID = async (autoNext = true) => {
        if (!formData.selectedIdType) {
            setScanError('Please select your ID type before scanning.');
            return;
        }
        if (!formData.idFront || !formData.idBack) { 
            setScanError('Please upload both the FRONT and BACK of your ID to continue.'); 
            return; 
        }
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
                houseNo: mapped.houseNo || prev.houseNo,
                blockLot: mapped.blockLot || prev.blockLot,
                subdivision: mapped.subdivision || prev.subdivision,
                street: mapped.street || prev.street,
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

    const handleOtpChange = (index, value) => {
        if (!/^\d*$/.test(value)) return;
        const newOtp = [...otp];
        newOtp[index] = value.slice(-1);
        setOtp(newOtp);
        if (value && index < 5) otpRefs[index + 1].current.focus();
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
        data.split('').forEach((char, i) => { if (i < 6) newOtp[i] = char; });
        setOtp(newOtp);
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
            setStep(6); // Step 6 is Celebration!
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
                code: '000000'
            });
            setVerifySuccess("A new 6-digit verification code has been dispatched to your email address.");
            setResendTimer(60);
            setCanResend(false);
            setTimeout(() => setVerifySuccess(''), 5000);
        } catch (err) {
            setVerifyError("Failed to resend code.");
        } finally {
            setResending(false);
        }
    };

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
                setRegistrationError(err.response?.data?.detail || 'ID verification submission failed. Please check your account details.');
            } finally {
                setRegistering(false);
            }
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            setRegistrationError("Passwords do not match.");
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
                setResendTimer(60);
                setCanResend(false);
                setStep(5); // Step 5 is OTP!
            }
        } catch (err) {
            setRegistrationError(err.response?.data?.detail || 'Registration failed. Please try again or check your account details.');
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
        !ageError
    );

    return (
        <div className="relative h-screen max-h-screen w-full bg-gradient-to-b from-white via-[#fffbf9] to-[#fff7f0]/40 dark:from-[#070a12] dark:via-[#090e1a] dark:to-[#070a12] font-sans text-slate-900 dark:text-white flex flex-col justify-between transition-colors duration-300 overflow-hidden select-none">

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

            {/* ── Background Seal Watermark (Desktop only, hidden on mobile) ───── */}
            <div
                className="hidden lg:flex absolute inset-0 overflow-hidden pointer-events-none select-none z-0 items-center justify-end"
                aria-hidden="true"
            >
                <div className="relative w-[320px] h-[320px] sm:w-[480px] sm:h-[480px] lg:w-[600px] lg:h-[600px] mr-[-5%] sm:mr-[2%] lg:mr-[4%] opacity-[0.10] dark:opacity-[0.07] transition-all duration-500">
                    <div className="absolute inset-0 rounded-full border-2 border-orange-500/30 dark:border-white/20 animate-pulse" style={{ animationDuration: '6s' }} />
                    <div className="absolute inset-[-18px] rounded-full border border-dashed border-[#ff6b00]/40 dark:border-[#ff6b00]/30" />
                    <img
                        src="/engineering-logo.jpg"
                        alt="Official Caloocan City Seal Watermark"
                        className="w-full h-full object-contain rounded-full drop-shadow-sm dark:brightness-105"
                        loading="eager"
                    />
                </div>
            </div>

            {/* ── Top Header: Logo, Dynamic Progress, Theme Toggle (Mirrored from Login) ───────────── */}
            <header className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 w-full flex flex-col gap-2 shrink-0">
                {/* Main Header Row */}
                <div className="w-full flex justify-between items-center gap-2">
                    <Link
                        to="/"
                        className="flex items-center gap-2 group transition-opacity hover:opacity-90 cursor-pointer shrink-0"
                        title="Caloocan City PULSO Home"
                        aria-label="Caloocan City PULSO Home"
                    >
                        <Branding size="h-9 w-9 sm:h-10 sm:w-10" />
                    </Link>

                {/* Center Dynamic Progress Bar (5 Steps) */}
                {step <= 5 ? (
                    <div className="hidden sm:flex flex-col items-center gap-0.5 sm:gap-1 px-1 min-w-0">
                        <div className="flex items-center gap-1 sm:gap-2">
                            <span className="text-[11px] sm:text-sm font-black text-slate-800 dark:text-slate-100 whitespace-nowrap">
                                <span className="hidden xs:inline">Step {step} of 5</span>
                                <span className="xs:hidden">{step}/5</span>
                            </span>
                            <span className="text-[10px] text-slate-300 dark:text-slate-600">•</span>
                            <span className="text-[11px] sm:text-sm font-semibold text-[#ff6b00] truncate max-w-[105px] xs:max-w-[150px] sm:max-w-none">
                                {STEP_LABELS[step]}
                            </span>
                        </div>
                        <div className="sm:w-56 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                            <motion.div 
                                className="h-full bg-[#ff6b00] rounded-full" 
                                initial={{ width: 0 }}
                                animate={{ width: `${(step / 5) * 100}%` }}
                                transition={{ duration: 0.3, ease: 'easeOut' }}
                            />
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
                            to="/"
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/85 dark:bg-slate-800/85 hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 hover:text-[#ff6b00] dark:hover:text-[#ff6b00] border border-slate-200 dark:border-slate-700 text-xs font-bold transition-all shadow-2xs cursor-pointer"
                            title="Return to Home Section"
                            aria-label="Return to Home Section"
                        >
                            <Home size={14} className="text-[#ff6b00]" />
                            <span className="hidden sm:inline">Home</span>
                        </Link>
                    </div>
                </div>

                {/* Mobile: Step-by-Step progress placed at the bottom of the header */}
                {step <= 5 ? (
                    <div className="sm:hidden w-full flex flex-col gap-1.5 pt-1">
                        <div className="flex items-center justify-between text-xs">
                            <span className="font-black text-slate-800 dark:text-slate-100">
                                Step {step} of 5
                            </span>
                            <span className="font-semibold text-[#ff6b00] truncate max-w-[220px]">
                                {STEP_LABELS[step]}
                            </span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-200/80 dark:bg-slate-800/80 rounded-full overflow-hidden">
                            <motion.div 
                                className="h-full bg-[#ff6b00] rounded-full" 
                                initial={{ width: 0 }}
                                animate={{ width: `${(step / 5) * 100}%` }}
                                transition={{ duration: 0.3, ease: 'easeOut' }}
                            />
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
            <main className="relative z-10 w-full flex-1 flex flex-col items-center justify-start sm:justify-center px-3 sm:px-6 overflow-y-auto py-2.5 sm:py-4 landscape:py-2">
                <div className={`w-full ${step === 2 || step === 3 ? 'max-w-3xl lg:max-w-4xl' : 'max-w-2xl'} bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl flex flex-col ${step === 3 ? 'p-3.5 sm:p-5' : 'p-3.5 sm:p-6 landscape:p-3'} transition-all duration-300 my-auto`}>
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
                                <div>
                                    <div className="mb-2 text-center sm:text-left">
                                        <h2 className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                                            Which ID do you have with you?
                                        </h2>
                                        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                                            Choose one Philippine government card. We'll adjust scanning to match its layout.
                                        </p>
                                    </div>

                                    {/* PRIMARY ID SECTION */}
                                    <div className="mt-1 mb-2">
                                        <div className="flex items-center justify-between mb-1.5">
                                            <h3 className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 leading-snug">
                                                PRIMARY ID <span className="font-normal text-slate-400 dark:text-slate-500">· Use on its own</span>
                                            </h3>
                                        </div>
                                        <div className="grid grid-cols-2 landscape:grid-cols-4 sm:grid-cols-4 gap-1.5 sm:gap-2">
                                            {SUPPORTED_ID_TYPES.filter(t => t.tier === 'primary').map((t) => {
                                                const isSelected = formData.selectedIdType === t.id;
                                                return (
                                                    <button
                                                        key={t.id}
                                                        type="button"
                                                        onClick={() => {
                                                            setFormData(prev => ({ 
                                                                ...prev, 
                                                                selectedIdType: t.id, 
                                                                idType: t.name,
                                                                idTier: 'primary',
                                                                secondaryMode: 'manual_review',
                                                            }));
                                                            setScanError('');
                                                        }}
                                                        className={`p-2 sm:p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between min-h-[58px] sm:min-h-[62px] cursor-pointer group select-none ${
                                                            isSelected
                                                                ? 'bg-orange-50/80 dark:bg-orange-950/40 border-[#ff6b00] ring-2 ring-[#ff6b00]/30 shadow-xs'
                                                                : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:border-orange-300 dark:hover:border-slate-700 hover:bg-white dark:hover:bg-slate-800/80'
                                                        }`}
                                                    >
                                                        <div className="flex items-start justify-between gap-1 w-full">
                                                            <span className={`text-xs font-bold leading-tight min-w-0 flex-1 break-words ${isSelected ? 'text-[#ff6b00]' : 'text-slate-800 dark:text-slate-200'}`}>
                                                                {t.shortName}
                                                            </span>
                                                            {isSelected ? (
                                                                <div className="w-4 h-4 rounded-full bg-[#ff6b00] text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                                                                    <Check size={10} strokeWidth={3} />
                                                                </div>
                                                            ) : (
                                                                <div className="w-3.5 h-3.5 rounded-full border border-slate-300 dark:border-slate-600 shrink-0 mt-0.5 group-hover:border-orange-400 transition-colors" />
                                                            )}
                                                        </div>
                                                        <div className="flex items-center justify-between gap-1 w-full mt-1">
                                                            <span className="text-[10px] text-slate-400 dark:text-slate-500 leading-tight break-words">
                                                                {t.idNumberLabel}
                                                            </span>
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* SECONDARY ID SECTION */}
                                    <div className="mt-2 mb-1.5">
                                        <div className="flex items-center justify-between mb-1.5">
                                            <h3 className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 leading-snug">
                                                SECONDARY ID <span className="font-normal text-slate-400 dark:text-slate-500">· Supporting ID</span>
                                            </h3>
                                        </div>
                                        <div className="grid grid-cols-2 landscape:grid-cols-3 sm:grid-cols-3 gap-1.5 sm:gap-2">
                                            {SUPPORTED_ID_TYPES.filter(t => t.tier === 'secondary').map((t, idx, arr) => {
                                                const isSelected = formData.selectedIdType === t.id;
                                                const isLastOdd = arr.length % 2 !== 0 && idx === arr.length - 1;
                                                return (
                                                    <button
                                                        key={t.id}
                                                        type="button"
                                                        onClick={() => {
                                                            setFormData(prev => ({ 
                                                                ...prev, 
                                                                selectedIdType: t.id, 
                                                                idType: t.name,
                                                                idTier: 'secondary',
                                                                secondaryMode: 'automated',
                                                            }));
                                                            setScanError('');
                                                        }}
                                                        className={`p-2 sm:p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between min-h-[58px] sm:min-h-[62px] cursor-pointer group select-none ${
                                                            isLastOdd ? 'col-span-2 sm:col-span-1' : ''
                                                        } ${
                                                            isSelected
                                                                ? 'bg-orange-50/80 dark:bg-orange-950/40 border-[#ff6b00] ring-2 ring-[#ff6b00]/30 shadow-xs'
                                                                : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:border-orange-300 dark:hover:border-slate-700 hover:bg-white dark:hover:bg-slate-800/80'
                                                        }`}
                                                    >
                                                        <div className="flex items-start justify-between gap-1 w-full">
                                                            <span className={`text-xs font-bold leading-tight min-w-0 flex-1 break-words ${isSelected ? 'text-[#ff6b00]' : 'text-slate-800 dark:text-slate-200'}`}>
                                                                {t.shortName}
                                                            </span>
                                                            {isSelected ? (
                                                                <div className="w-4 h-4 rounded-full bg-[#ff6b00] text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                                                                    <Check size={10} strokeWidth={3} />
                                                                </div>
                                                            ) : (
                                                                <div className="w-3.5 h-3.5 rounded-full border border-slate-300 dark:border-slate-600 shrink-0 mt-0.5 group-hover:border-orange-400 transition-colors" />
                                                            )}
                                                        </div>
                                                        <div className="flex items-center justify-between gap-1 w-full mt-1">
                                                            <span className="text-[10px] text-slate-400 dark:text-slate-500 leading-tight break-words">
                                                                {t.idNumberLabel}
                                                            </span>
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Contextual guidance */}
                                    {selectedIdTypeObj ? (
                                        <div className="p-2 sm:p-2.5 rounded-xl bg-orange-50/60 dark:bg-orange-950/20 border border-orange-200/70 dark:border-orange-900/30 flex items-start gap-2.5 mt-1.5">
                                            <Info size={15} className="text-[#ff6b00] shrink-0 mt-0.5" />
                                            <span className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                                                <strong className="text-slate-900 dark:text-white mr-1">{selectedIdTypeObj.shortName}:</strong>
                                                {selectedIdTypeObj.instructions}
                                            </span>
                                        </div>
                                    ) : (
                                        <div className="p-2 sm:p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 flex items-start gap-2.5 mt-1.5">
                                            <ShieldCheck size={15} className="text-slate-400 shrink-0 mt-0.5" />
                                            <span className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                                Tap any card to select it. Your data is encrypted and never shared.
                                            </span>
                                        </div>
                                    )}

                                    {/* Privacy Policy & Terms of Service Agreement Checkbox */}
                                    <div 
                                        onClick={() => setAgreedToTerms(prev => !prev)}
                                        className="mt-2 p-2.5 sm:p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100/60 dark:hover:bg-slate-800/80 border border-slate-200 dark:border-slate-800 flex items-start gap-2.5 cursor-pointer transition-colors group select-none min-h-[44px]"
                                    >
                                        {/* Custom Styled Checkbox with Guaranteed Pure White Checkmark */}
                                        <div 
                                            role="checkbox"
                                            aria-checked={agreedToTerms}
                                            tabIndex={0}
                                            onKeyDown={(e) => {
                                                if (e.key === ' ' || e.key === 'Enter') {
                                                    e.preventDefault();
                                                    setAgreedToTerms(prev => !prev);
                                                }
                                            }}
                                            className={`mt-0.5 w-4.5 h-4.5 rounded-md flex items-center justify-center shrink-0 transition-all border ${
                                                agreedToTerms 
                                                    ? 'bg-[#ff6b00] border-[#ff6b00] text-white shadow-2xs' 
                                                    : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 group-hover:border-[#ff6b00]'
                                            }`}
                                        >
                                            {agreedToTerms && (
                                                <Check size={12} strokeWidth={3.5} className="text-white stroke-white" />
                                            )}
                                        </div>
                                        <span className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                                            I agree to the{' '}
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    setLegalModal({ isOpen: true, tab: 'privacy' });
                                                }}
                                                className="text-[#ff6b00] font-bold hover:underline cursor-pointer inline py-0.5 px-0.5 rounded focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#ff6b00]"
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
                                                className="text-[#ff6b00] font-bold hover:underline cursor-pointer inline py-0.5 px-0.5 rounded focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#ff6b00]"
                                            >
                                                Terms of Service
                                            </button>{' '}
                                            under the Data Privacy Act (RA 10173).
                                        </span>
                                    </div>
                                </div>

                                {/* Bottom Action Bar: Stacked on mobile for guaranteed touch targets, side-by-side on tablet/desktop */}
                                <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2.5 sm:gap-4 pt-3 mt-2 border-t border-slate-100 dark:border-slate-800/60">
                                    <Link 
                                        to="/login" 
                                        className="inline-flex items-center justify-center gap-1.5 min-h-[44px] sm:min-h-[40px] px-3 py-2 text-xs sm:text-sm font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer group text-center"
                                    >
                                        <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform shrink-0" />
                                        <span>Back to Sign In</span>
                                    </Link>
                                    <button
                                        type="button"
                                        disabled={!formData.selectedIdType || !agreedToTerms}
                                        onClick={() => setStep(2)}
                                        className="w-full sm:w-auto min-h-[44px] bg-[#ff6b00] hover:bg-[#e65c00] active:scale-[0.99] text-white py-2.5 px-5 rounded-xl font-heading font-bold text-xs sm:text-sm tracking-wide transition-all shadow-md hover:shadow-lg hover:shadow-orange-500/25 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-2 cursor-pointer"
                                    >
                                        <span className="truncate">
                                            {!selectedIdTypeObj
                                                ? 'Select an ID to continue'
                                                : `Continue with ${selectedIdTypeObj.shortName}`
                                            }
                                        </span>
                                        <ArrowRight size={15} className="shrink-0" />
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {/* ── STEP 2: FRONT & BACK PHOTOS (PRIMARY OR DUAL SUPPORTING ID) ── */}
                        {step === 2 && (
                            <motion.div
                                key={isCapturingSecondId ? "step2-second" : "step2-primary"}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.25 }}
                                className="flex flex-col h-full justify-between"
                            >
                                <div>
                                    {/* Header */}
                                    <div className="mb-2 text-center sm:text-left flex items-start justify-between">
                                        <div>
                                            <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center justify-center sm:justify-start gap-2.5">
                                                <span>{isCapturingSecondId ? "Supporting Second ID" : "Front & Back Photos"}</span>
                                                {isCapturingSecondId ? (
                                                    <Layers size={22} className="text-[#ff6b00]" />
                                                ) : (
                                                    <CreditCard size={22} className="text-[#ff6b00]" />
                                                )}
                                            </h2>
                                            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                                                {isCapturingSecondId 
                                                    ? `Pairing with your ${selectedIdTypeObj ? selectedIdTypeObj.shortName : 'first ID'}. Attach your 2nd card.`
                                                    : `Capture or upload both sides of your ${selectedIdTypeObj ? selectedIdTypeObj.shortName : 'ID'}.`
                                                }
                                            </p>
                                        </div>
                                        {isCapturingSecondId && (
                                            <span className="text-[10px] font-extrabold uppercase tracking-wider bg-orange-100 dark:bg-orange-950/60 text-[#ff6b00] px-2.5 py-1 rounded-full border border-orange-200 dark:border-orange-800 shrink-0">
                                                Fast-Track 2nd ID
                                            </span>
                                        )}
                                    </div>

                                    {/* Optional 2nd ID Type Dropdown when capturing second ID */}
                                    {isCapturingSecondId && (
                                        <div className="mb-2 p-2 sm:p-2.5 rounded-xl bg-orange-50/70 dark:bg-orange-950/30 border border-orange-200/80 dark:border-orange-800/60 flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-1.5 shrink-0">
                                                <Layers size={14} className="text-[#ff6b00]" />
                                                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">2nd ID Type:</span>
                                            </div>
                                            <select
                                                value={formData.secondIdType}
                                                onChange={(e) => setFormData(prev => ({ ...prev, secondIdType: e.target.value }))}
                                                className="text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1 text-slate-800 dark:text-slate-100 outline-none focus:ring-1 focus:ring-[#ff6b00] cursor-pointer"
                                            >
                                                <option value="">-- Select supporting ID --</option>
                                                {SUPPORTED_ID_TYPES.filter(t => t.id !== formData.selectedIdType && t.id !== 'barangay').map(t => (
                                                    <option key={t.id} value={t.id}>{t.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    {/* 2-Column Side-by-Side Dual Viewport Grid */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 my-2 sm:my-2.5">
                                        {/* Front Frame */}
                                        <div className="flex flex-col">
                                            <div className="flex items-center justify-between mb-1 px-1">
                                                <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                                                    1. Front of ID
                                                </span>
                                                {(isCapturingSecondId ? previews.secondFront : previews.front) && (
                                                    <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                                        <Check size={12} strokeWidth={3} /> Photo Ready
                                                    </span>
                                                )}
                                            </div>
                                            
                                            <div 
                                                onClick={() => {
                                                    if (!isScanning && (isCapturingSecondId ? previews.secondFront : previews.front)) {
                                                        setZoomedSide(isCapturingSecondId ? 'secondIdFront' : 'idFront');
                                                    }
                                                }}
                                                title={(isCapturingSecondId ? previews.secondFront : previews.front) && !isScanning ? "Click photo to zoom in" : undefined}
                                                className={`relative w-full h-48 sm:h-56 rounded-2xl border-2 transition-all overflow-hidden flex flex-col items-center justify-center ${
                                                    (isCapturingSecondId ? previews.secondFront : previews.front)
                                                        ? 'border-emerald-500/50 bg-slate-950 cursor-zoom-in group' 
                                                        : 'border-dashed border-slate-300 dark:border-slate-700 hover:border-[#ff6b00]/60 dark:hover:border-[#ff6b00]/60 bg-slate-50/70 dark:bg-slate-800/40 p-3 sm:p-4 justify-between'
                                                }`}>
                                                {(isCapturingSecondId ? previews.secondFront : previews.front) ? (
                                                    <>
                                                        <img
                                                            src={isCapturingSecondId ? previews.secondFront : previews.front}
                                                            alt="Front Preview"
                                                            className="w-full h-full object-contain select-none group-hover:opacity-95 transition-opacity"
                                                            style={{ transform: `rotate(${formData[(isCapturingSecondId ? 'secondIdFront' : 'idFront') + 'Rotation'] || 0}deg)` }}
                                                        />
                                                        
                                                        {isScanning && (
                                                            <motion.div
                                                                className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#ff6b00] to-transparent shadow-[0_0_15px_#ff6b00] z-20"
                                                                animate={{ top: ['0%', '100%', '0%'] }}
                                                                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                                                            />
                                                        )}

                                                        {/* Floating Top-Left Status Badge */}
                                                        <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-[10px] sm:text-[11px] font-bold flex items-center gap-1.5 shadow-md">
                                                            <CheckCircle2 size={12} strokeWidth={2.5} />
                                                            <span>Front Photo Ready</span>
                                                        </div>

                                                        {!isScanning && (
                                                            <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 z-10">
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    const rotKey = (isCapturingSecondId ? 'secondIdFront' : 'idFront') + 'Rotation';
                                                                    setFormData(prev => ({ ...prev, [rotKey]: (prev[rotKey] || 0) + 90 }));
                                                                }}
                                                                className="p-1.5 bg-black/75 hover:bg-black text-white rounded-lg transition-all shadow-sm cursor-pointer"
                                                                title="Rotate 90°"
                                                            >
                                                                <RotateCw size={13} />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setZoomedSide(isCapturingSecondId ? 'secondIdFront' : 'idFront');
                                                                }}
                                                                className="p-1.5 bg-black/75 hover:bg-black text-white rounded-lg transition-all shadow-sm cursor-pointer"
                                                                title="Zoom in"
                                                            >
                                                                <ZoomIn size={13} />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={(e) => openCamera(e, isCapturingSecondId ? 'secondFront' : 'front')}
                                                                className="p-1.5 bg-black/75 hover:bg-[#ff6b00] text-white rounded-lg transition-all shadow-sm cursor-pointer"
                                                                title="Retake photo"
                                                            >
                                                                <Camera size={13} />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={(e) => handleRemoveID(e, isCapturingSecondId ? 'secondIdFront' : 'idFront')}
                                                                className="p-1.5 bg-red-600/80 hover:bg-red-600 text-white rounded-lg transition-all shadow-sm cursor-pointer"
                                                                title="Remove"
                                                            >
                                                                <X size={13} />
                                                            </button>
                                                        </div>
                                                    )}
                                                </>
                                                ) : (
                                                    <div className="flex flex-col items-center justify-between h-full w-full py-1">
                                                        {/* Instructive Card Graphic - No dashed icon border */}
                                                        <FrontIdGraphic />
                                                        
                                                        {/* Section Copy / Hint */}
                                                        <div className="text-center px-2">
                                                            <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                                                                {isCapturingSecondId ? 'Front of 2nd Supporting ID' : (selectedIdTypeObj ? selectedIdTypeObj.frontCopy : 'Front of your card')}
                                                            </p>
                                                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                                                Side with your portrait photo &amp; full name
                                                            </p>
                                                        </div>

                                                        {/* Generously sized Action Buttons */}
                                                        <div className="flex items-center gap-2 sm:gap-3 w-full justify-center max-w-[300px]">
                                                            <button
                                                                type="button"
                                                                onClick={(e) => openCamera(e, isCapturingSecondId ? 'secondFront' : 'front')}
                                                                className="flex-1 py-2 sm:py-2.5 px-3 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-[#ff6b00] dark:hover:bg-[#ff6b00] dark:hover:text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs active:scale-[0.98] cursor-pointer"
                                                            >
                                                                <Camera size={15} />
                                                                <span>Take Photo</span>
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => (isCapturingSecondId ? secondFrontFileInputRef : frontFileInputRef).current?.click()}
                                                                className="flex-1 py-2 sm:py-2.5 px-3 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 hover:border-[#ff6b00] text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs active:scale-[0.98] cursor-pointer"
                                                            >
                                                                <UploadCloud size={15} className="text-[#ff6b00]" />
                                                                <span>Upload File</span>
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Back Frame */}
                                        <div className="flex flex-col">
                                            <div className="flex items-center justify-between mb-1 px-1">
                                                <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                                                    2. Back of ID
                                                </span>
                                                {(isCapturingSecondId ? previews.secondBack : previews.back) && (
                                                    <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                                        <Check size={12} strokeWidth={3} /> Photo Ready
                                                    </span>
                                                )}
                                            </div>
                                            
                                            <div 
                                                onClick={() => {
                                                    if (!isScanning && (isCapturingSecondId ? previews.secondBack : previews.back)) {
                                                        setZoomedSide(isCapturingSecondId ? 'secondIdBack' : 'idBack');
                                                    }
                                                }}
                                                title={(isCapturingSecondId ? previews.secondBack : previews.back) && !isScanning ? "Click photo to zoom in" : undefined}
                                                className={`relative w-full h-48 sm:h-56 rounded-2xl border-2 transition-all overflow-hidden flex flex-col items-center justify-center ${
                                                    (isCapturingSecondId ? previews.secondBack : previews.back)
                                                        ? 'border-emerald-500/50 bg-slate-950 cursor-zoom-in group' 
                                                        : 'border-dashed border-slate-300 dark:border-slate-700 hover:border-[#ff6b00]/60 dark:hover:border-[#ff6b00]/60 bg-slate-50/70 dark:bg-slate-800/40 p-3 sm:p-4 justify-between'
                                                }`}>
                                                {(isCapturingSecondId ? previews.secondBack : previews.back) ? (
                                                    <>
                                                        <img
                                                            src={isCapturingSecondId ? previews.secondBack : previews.back}
                                                            alt="Back Preview"
                                                            className="w-full h-full object-contain select-none group-hover:opacity-95 transition-opacity"
                                                            style={{ transform: `rotate(${formData[(isCapturingSecondId ? 'secondIdBack' : 'idBack') + 'Rotation'] || 0}deg)` }}
                                                        />
                                                        
                                                        {isScanning && (
                                                            <motion.div
                                                                className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#ff6b00] to-transparent shadow-[0_0_15px_#ff6b00]"
                                                                animate={{ top: ['0%', '100%', '0%'] }}
                                                                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                                                            />
                                                        )}

                                                        {/* Floating Top-Left Status Badge */}
                                                        <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-[10px] sm:text-[11px] font-bold flex items-center gap-1.5 shadow-md">
                                                            <CheckCircle2 size={12} strokeWidth={2.5} />
                                                            <span>Back Photo Ready</span>
                                                        </div>

                                                        {!isScanning && (
                                                            <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 z-10">
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        const rotKey = (isCapturingSecondId ? 'secondIdBack' : 'idBack') + 'Rotation';
                                                                        setFormData(prev => ({ ...prev, [rotKey]: (prev[rotKey] || 0) + 90 }));
                                                                    }}
                                                                    className="p-1.5 bg-black/75 hover:bg-black text-white rounded-lg transition-all shadow-sm cursor-pointer"
                                                                    title="Rotate 90°"
                                                                >
                                                                    <RotateCw size={13} />
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setZoomedSide(isCapturingSecondId ? 'secondIdBack' : 'idBack');
                                                                    }}
                                                                    className="p-1.5 bg-black/75 hover:bg-black text-white rounded-lg transition-all shadow-sm cursor-pointer"
                                                                    title="Zoom in"
                                                                >
                                                                    <ZoomIn size={13} />
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => openCamera(e, isCapturingSecondId ? 'secondBack' : 'back')}
                                                                    className="p-1.5 bg-black/75 hover:bg-[#ff6b00] text-white rounded-lg transition-all shadow-sm cursor-pointer"
                                                                    title="Retake photo"
                                                                >
                                                                    <Camera size={13} />
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => handleRemoveID(e, isCapturingSecondId ? 'secondIdBack' : 'idBack')}
                                                                    className="p-1.5 bg-red-600/80 hover:bg-red-600 text-white rounded-lg transition-all shadow-sm cursor-pointer"
                                                                    title="Remove"
                                                                >
                                                                    <X size={13} />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </>
                                                ) : (
                                                    <div className="flex flex-col items-center justify-between h-full w-full py-1">
                                                        {/* Instructive Card Graphic - No dashed icon border */}
                                                        <BackIdGraphic />
                                                        
                                                        {/* Section Copy / Hint */}
                                                        <div className="text-center px-2">
                                                            <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                                                                {isCapturingSecondId ? 'Back of 2nd Supporting ID' : (selectedIdTypeObj ? selectedIdTypeObj.backCopy : 'Back of your card')}
                                                            </p>
                                                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                                                Side with barcode, signature, or address
                                                            </p>
                                                        </div>

                                                        {/* Generously sized Action Buttons */}
                                                        <div className="flex items-center gap-2 sm:gap-3 w-full justify-center max-w-[300px]">
                                                            <button
                                                                type="button"
                                                                onClick={(e) => openCamera(e, isCapturingSecondId ? 'secondBack' : 'back')}
                                                                className="flex-1 py-2 sm:py-2.5 px-3 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-[#ff6b00] dark:hover:bg-[#ff6b00] dark:hover:text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs active:scale-[0.98] cursor-pointer"
                                                            >
                                                                <Camera size={15} />
                                                                <span>Take Photo</span>
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => (isCapturingSecondId ? secondBackFileInputRef : backFileInputRef).current?.click()}
                                                                className="flex-1 py-2 sm:py-2.5 px-3 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 hover:border-[#ff6b00] text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs active:scale-[0.98] cursor-pointer"
                                                            >
                                                                <UploadCloud size={15} className="text-[#ff6b00]" />
                                                                <span>Upload File</span>
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Capture Tips or Scan Error */}
                                    {scanError ? (
                                        <div className="p-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 flex items-start gap-1.5 text-xs font-medium my-1">
                                            <AlertCircle size={14} className="shrink-0 mt-0.5 text-red-500" />
                                            <span>{scanError}</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-between sm:justify-center flex-nowrap w-full gap-1.5 sm:gap-6 text-[10px] sm:text-xs font-semibold text-slate-600 dark:text-slate-400 py-1.5 px-2.5 sm:px-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/60 dark:border-slate-800/60 mt-1 select-none">
                                            <span className="flex-1 min-w-0 text-center truncate" title="Lay card flat">
                                                Lay card flat
                                            </span>
                                            <span className="text-slate-300 dark:text-slate-600 shrink-0 select-none">•</span>
                                            <span className="flex-1 min-w-0 text-center truncate" title="Good natural lighting">
                                                <span className="hidden sm:inline">Good natural lighting</span>
                                                <span className="sm:hidden">Good lighting</span>
                                            </span>
                                            <span className="text-slate-300 dark:text-slate-600 shrink-0 select-none">•</span>
                                            <span className="flex-1 min-w-0 text-center truncate" title="Avoid flash glare">
                                                <span className="hidden sm:inline">Avoid flash glare</span>
                                                <span className="sm:hidden">No flash glare</span>
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Bottom Action Bar */}
                                <div className="flex items-center justify-between pt-3 mt-2 border-t border-slate-100 dark:border-slate-800/60">
                                    {isCapturingSecondId ? (
                                        <>
                                            <button
                                                type="button"
                                                onClick={() => setIsCapturingSecondId(false)}
                                                className="inline-flex items-center gap-1.5 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                                            >
                                                <ArrowLeft size={15} />
                                                <span>Back to 1st ID</span>
                                            </button>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setFormData(prev => ({ ...prev, secondaryMode: 'manual_review' }));
                                                        setIsCapturingSecondId(false);
                                                        setStep(3);
                                                    }}
                                                    className="text-xs sm:text-sm font-semibold text-slate-500 hover:text-amber-600 dark:hover:text-amber-400 px-3 py-2 transition-colors cursor-pointer"
                                                >
                                                    Skip &amp; Request Manual Review
                                                </button>
                                                <button
                                                    type="button"
                                                    disabled={!formData.secondIdType || !formData.secondIdFront || !formData.secondIdBack}
                                                    onClick={() => {
                                                        setFormData(prev => ({ ...prev, secondaryMode: 'second_id' }));
                                                        setIsCapturingSecondId(false);
                                                        setStep(3);
                                                    }}
                                                    className="bg-[#ff6b00] hover:bg-[#e65c00] active:scale-[0.99] text-white py-2.5 sm:py-3 px-6 sm:px-8 rounded-xl font-heading font-extrabold text-xs sm:text-sm tracking-wide transition-all shadow-md hover:shadow-lg hover:shadow-orange-500/25 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none flex items-center gap-2 cursor-pointer"
                                                >
                                                    <span>Continue with Dual IDs</span>
                                                    <ArrowRight size={16} />
                                                </button>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <button
                                                type="button"
                                                onClick={() => setStep(1)}
                                                disabled={isScanning}
                                                className="inline-flex items-center gap-1.5 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer disabled:opacity-40"
                                            >
                                                <ArrowLeft size={15} />
                                                <span>Back</span>
                                            </button>
                                            <button
                                                type="button"
                                                disabled={!formData.idFront || !formData.idBack || isScanning}
                                                onClick={() => handleScanID(true)}
                                                className="bg-[#ff6b00] hover:bg-[#e65c00] active:scale-[0.99] text-white py-2.5 sm:py-3 px-6 sm:px-8 rounded-xl font-heading font-extrabold text-xs sm:text-sm tracking-wide transition-all shadow-md hover:shadow-lg hover:shadow-orange-500/25 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none flex items-center gap-2 cursor-pointer"
                                            >
                                                {isScanning ? (
                                                    <>
                                                        <Loader2 size={16} className="animate-spin" />
                                                        <span>Scanning...</span>
                                                    </>
                                                ) : (
                                                    <span>
                                                        {selectedIdTypeObj?.id === 'barangay'
                                                            ? 'Scan & Submit for Review'
                                                            : selectedIdTypeObj?.tier === 'secondary'
                                                                ? 'Scan ID & Next Step'
                                                                : 'Scan & Verify My ID'
                                                        }
                                                    </span>
                                                )}
                                            </button>
                                        </>
                                    )}
                                </div>
                            </motion.div>
                        )}

                        {/* ── STEP 3: REVIEW DETAILS ── */}
                        {step === 3 && (
                            <motion.div
                                key="step3"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.25 }}
                                className="flex flex-col h-full justify-between"
                            >
                                <div>
                                    <div className="mb-1.5 text-center sm:text-left">
                                        <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center justify-center sm:justify-start gap-1.5">
                                            <span>We read your card details!</span>
                                            <Sparkles size={16} className="text-[#ff6b00]" />
                                        </h2>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                            Check if these look right. Tap any box to fix typos or adjust spelling.
                                        </p>
                                    </div>

                                    {/* Verification Status Banner */}
                                    <div className="p-2 rounded-xl bg-white/70 dark:bg-slate-800/40 backdrop-blur-md border border-slate-200/80 dark:border-white/10 shadow-xs flex items-center text-xs my-1">
                                        <div className="flex items-center gap-2">
                                            {selectedIdTypeObj?.tier === 'primary' ? (
                                                <>
                                                    <ShieldCheck size={15} className="text-emerald-500 shrink-0" />
                                                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                                                        Primary ID Verified: {selectedIdTypeObj.shortName}
                                                    </span>
                                                </>
                                            ) : formData.secondaryMode === 'second_id' ? (
                                                <>
                                                    <Layers size={15} className="text-emerald-500 shrink-0" />
                                                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                                                        Dual ID Verified: {selectedIdTypeObj?.shortName} + {secondIdObj?.shortName || '2nd ID'}
                                                    </span>
                                                </>
                                            ) : (
                                                <>
                                                    <ShieldCheck size={15} className="text-emerald-500 shrink-0" />
                                                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                                                        AI-Verified: {selectedIdTypeObj?.shortName || 'Secondary ID'}
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* Personal Identity Fields */}
                                    <div className="grid grid-cols-2 sm:grid-cols-12 gap-2 my-1">
                                        {/* First Name */}
                                        <div className="col-span-2 sm:col-span-4">
                                            <div className="flex items-center justify-between mb-1">
                                                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400">
                                                    First Name <span className="text-red-400">*</span>
                                                </label>
                                                {autoFilledFields.firstName && <AutoFilledBadge />}
                                            </div>
                                            <input
                                                type="text"
                                                name="firstName"
                                                value={formData.firstName}
                                                onChange={handleChange}
                                                required
                                                className="w-full bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm rounded-xl px-2.5 py-1.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none"
                                            />
                                        </div>

                                        {/* Middle Name (Optional / extracted from ID) */}
                                        <div className="col-span-2 sm:col-span-3">
                                            <div className="flex items-center justify-between mb-1">
                                                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 truncate">
                                                    Middle Name
                                                </label>
                                                {autoFilledFields.middleName && <AutoFilledBadge />}
                                            </div>
                                            <input
                                                type="text"
                                                name="middleName"
                                                value={formData.middleName}
                                                onChange={handleChange}
                                                placeholder="e.g. Mercado or M."
                                                className="w-full bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm rounded-xl px-2.5 py-1.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none"
                                            />
                                        </div>

                                        {/* Last Name */}
                                        <div className="col-span-2 sm:col-span-3">
                                            <div className="flex items-center justify-between mb-1">
                                                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400">
                                                    Last Name <span className="text-red-400">*</span>
                                                </label>
                                                {autoFilledFields.lastName && <AutoFilledBadge />}
                                            </div>
                                            <input
                                                type="text"
                                                name="lastName"
                                                value={formData.lastName}
                                                onChange={handleChange}
                                                required
                                                className="w-full bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm rounded-xl px-2.5 py-1.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none"
                                            />
                                        </div>

                                        {/* Suffix (Optional: Jr., Sr., II, III, IV, V, Other) */}
                                        <div className="col-span-2 sm:col-span-2">
                                            <div className="flex items-center justify-between mb-1">
                                                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 truncate">
                                                    Suffix
                                                </label>
                                                {autoFilledFields.suffix && <AutoFilledBadge />}
                                            </div>
                                            {isCustomSuffix ? (
                                                <div className="relative flex items-center">
                                                    <input
                                                        type="text"
                                                        name="suffix"
                                                        value={formData.suffix}
                                                        onChange={handleChange}
                                                        placeholder="e.g. VI"
                                                        className="w-full bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm rounded-xl px-2.5 py-1.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none pr-6"
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
                                                        className="absolute right-1.5 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs cursor-pointer"
                                                        title="Choose from list"
                                                    >
                                                        ✕
                                                    </button>
                                                </div>
                                            ) : (
                                                <select
                                                    name="suffix"
                                                    value={['', 'Jr.', 'Sr.', 'II', 'III', 'IV', 'V'].includes(formData.suffix) ? formData.suffix : '__other__'}
                                                    onChange={(e) => {
                                                        if (e.target.value === '__other__') {
                                                            setIsCustomSuffix(true);
                                                            setFormData(prev => ({ ...prev, suffix: '' }));
                                                        } else {
                                                            handleChange(e);
                                                        }
                                                    }}
                                                    className="w-full bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm rounded-xl px-2.5 py-1.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none cursor-pointer"
                                                >
                                                    <option value="">None</option>
                                                    <option value="Jr.">Jr.</option>
                                                    <option value="Sr.">Sr.</option>
                                                    <option value="II">II</option>
                                                    <option value="III">III</option>
                                                    <option value="IV">IV</option>
                                                    <option value="V">V</option>
                                                    <option value="__other__">Other…</option>
                                                </select>
                                            )}
                                        </div>

                                        {/* Date of Birth (Custom Calendar Date Picker) */}
                                        <div className="col-span-2 sm:col-span-8">
                                            <div className="flex items-center justify-between mb-1">
                                                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400">
                                                    Date of Birth <span className="text-red-400">*</span>
                                                </label>
                                                {autoFilledFields.dob && <AutoFilledBadge />}
                                            </div>
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
                                                    handleChange({ target: { name: 'dob', value: newDateStr, type: 'text' } });
                                                }}
                                                placeholder="Select Date of Birth"
                                                error={Boolean(ageError)}
                                            />
                                        </div>

                                        {/* Age */}
                                        <div className="col-span-2 sm:col-span-4">
                                            <div className="flex items-center justify-between mb-1">
                                                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400">
                                                    Age
                                                </label>
                                            </div>
                                            <input
                                                type="text"
                                                name="age"
                                                value={formData.age}
                                                readOnly
                                                placeholder="Age"
                                                className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm rounded-xl px-2.5 py-1.5 text-slate-500 dark:text-slate-400 cursor-not-allowed"
                                            />
                                        </div>

                                        {/* ID Number */}
                                        <div className="col-span-2 sm:col-span-8">
                                            <div className="flex items-center justify-between mb-1">
                                                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400">
                                                    {selectedIdTypeObj ? selectedIdTypeObj.idNumberLabel : 'ID Number'} <span className="text-red-400">*</span>
                                                </label>
                                                {autoFilledFields.idNumber && <AutoFilledBadge />}
                                            </div>
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    name="idNumber"
                                                    value={formData.idNumber}
                                                    onChange={handleChange}
                                                    placeholder={selectedIdTypeObj ? selectedIdTypeObj.formatHint : 'Enter ID Number'}
                                                    required
                                                    className="w-full bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm rounded-xl px-2.5 py-1.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none font-mono-data pr-7"
                                                />
                                                {isIdNumberValid && (
                                                    <CheckCircle size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-emerald-500 pointer-events-none" />
                                                )}
                                            </div>
                                        </div>

                                        {/* Sex */}
                                        <div className="col-span-2 sm:col-span-4">
                                            <div className="flex items-center justify-between mb-1">
                                                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400">
                                                    Sex <span className="text-red-400">*</span>
                                                </label>
                                                {autoFilledFields.sex && <AutoFilledBadge />}
                                            </div>
                                            <select
                                                name="sex"
                                                value={formData.sex}
                                                onChange={handleChange}
                                                className="w-full bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm rounded-xl px-2.5 py-1.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none cursor-pointer"
                                            >
                                                <option value="">Select</option>
                                                <option value="Male">Male</option>
                                                <option value="Female">Female</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* COMPLETE ADDRESS Section */}
                                    <div className="flex items-center gap-2 mt-2 mb-1.5">
                                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                            COMPLETE ADDRESS
                                        </span>
                                        <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                        {/* House Number / Floor / Unit */}
                                        <div>
                                            <div className="flex items-center justify-between mb-1">
                                                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 truncate">
                                                    House Number / Floor / Unit
                                                </label>
                                                {autoFilledFields.houseNo && <AutoFilledBadge />}
                                            </div>
                                            <input
                                                type="text"
                                                name="houseNo"
                                                value={formData.houseNo}
                                                onChange={handleChange}
                                                placeholder="e.g. Unit 224"
                                                className="w-full bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm rounded-xl px-2.5 py-1.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none"
                                            />
                                        </div>

                                        {/* Block & Lot */}
                                        <div>
                                            <div className="flex items-center justify-between mb-1">
                                                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400">
                                                    Block &amp; Lot
                                                </label>
                                                {autoFilledFields.blockLot && <AutoFilledBadge />}
                                            </div>
                                            <input
                                                type="text"
                                                name="blockLot"
                                                value={formData.blockLot}
                                                onChange={handleChange}
                                                placeholder="e.g. Bldg D / Blk 5"
                                                className="w-full bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm rounded-xl px-2.5 py-1.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none"
                                            />
                                        </div>

                                        {/* Building / Subdivision / Village */}
                                        <div>
                                            <div className="flex items-center justify-between mb-1">
                                                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 truncate">
                                                    Building / Subdivision / Village
                                                </label>
                                                {autoFilledFields.subdivision && <AutoFilledBadge />}
                                            </div>
                                            <input
                                                type="text"
                                                name="subdivision"
                                                value={formData.subdivision}
                                                onChange={handleChange}
                                                placeholder="e.g. Camarin Residences"
                                                className="w-full bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm rounded-xl px-2.5 py-1.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none"
                                            />
                                        </div>
                                    </div>

                                    {/* Second Address Row: Street & Barangay */}
                                    <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 mt-2">
                                        <div className="sm:col-span-3">
                                            <div className="flex items-center justify-between mb-1">
                                                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400">
                                                    Street / Avenue / Corner / Road
                                                </label>
                                                {autoFilledFields.street && <AutoFilledBadge />}
                                            </div>
                                            <input
                                                type="text"
                                                name="street"
                                                value={formData.street}
                                                onChange={handleChange}
                                                placeholder="e.g. Camarin Road"
                                                className="w-full bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm rounded-xl px-2.5 py-1.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none"
                                            />
                                        </div>

                                        <div className="sm:col-span-2">
                                            <div className="flex items-center justify-between mb-1">
                                                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400">
                                                    Barangay <span className="text-red-400">*</span>
                                                </label>
                                                {autoFilledFields.barangay && <AutoFilledBadge />}
                                            </div>
                                            <select
                                                name="barangay"
                                                value={formData.barangay}
                                                onChange={handleChange}
                                                className="w-full bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm rounded-xl px-2.5 py-1.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none cursor-pointer"
                                            >
                                                <option value="">Select Barangay</option>
                                                {Array.from({ length: 188 }, (_, i) => `Barangay ${1 + i}`).map(b => (
                                                    <option key={b} value={b}>{b}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    {ageError && (
                                        <div className="p-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-semibold my-1 flex items-center gap-1.5">
                                            <AlertCircle size={14} />
                                            <span>{ageError}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Bottom Action Bar */}
                                <div className="flex items-center justify-between pt-3 mt-2 border-t border-slate-100 dark:border-slate-800/60">
                                    <button
                                        type="button"
                                        onClick={() => setStep(2)}
                                        className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
                                    >
                                        <ArrowLeft size={14} />
                                        <span>Back</span>
                                    </button>
                                    <button
                                        type="button"
                                        disabled={!detailsValid}
                                        onClick={() => setStep(4)}
                                        className="bg-[#ff6b00] hover:bg-[#e65c00] active:scale-[0.99] text-white py-2.5 px-5 rounded-xl font-heading font-bold text-xs sm:text-sm tracking-wide transition-all shadow-md hover:shadow-lg hover:shadow-orange-500/25 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none flex items-center gap-2 cursor-pointer"
                                    >
                                        <span>Looks good, continue!</span>
                                        <ArrowRight size={15} />
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {/* ── STEP 4: CREATE LOGIN / FINALIZE GOOGLE VERIFICATION ── */}
                        {step === 4 && (
                            <motion.div
                                key="step4"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.25 }}
                                className="flex flex-col h-full justify-between"
                            >
                                <form onSubmit={handleSubmit} className="flex flex-col h-full justify-between">
                                    {isGoogleAuth ? (
                                        <div>
                                            <div className="mb-2 text-center sm:text-left">
                                                <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                                                    Finalize your verified registration
                                                </h2>
                                                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                                                    Your Google identity is linked. Confirm your contact mobile number to link your verified ID.
                                                </p>
                                            </div>

                                            {/* Google Authenticated Account Card */}
                                            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 my-2 flex items-center justify-between gap-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-lg bg-white dark:bg-slate-700 flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-600 shadow-xs">
                                                        <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                                                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                                                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                                                        </svg>
                                                    </div>
                                                    <div className="text-left">
                                                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Authenticated Google Account</p>
                                                        <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-white font-mono-data">{formData.email}</p>
                                                    </div>
                                                </div>
                                                <div className="px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1 shrink-0">
                                                    <Check size={12} />
                                                    <span>Verified</span>
                                                </div>
                                            </div>

                                            {/* Mobile Number Field */}
                                            <div className="my-3 text-left">
                                                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                                                    Mobile Number for Emergency & Dispatch Alerts <span className="text-red-400">*</span>
                                                </label>
                                                <div className="relative">
                                                    <Phone size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                                    <input
                                                        type="tel"
                                                        name="mobile"
                                                        value={formData.mobile}
                                                        onChange={handleChange}
                                                        placeholder="0917 123 4567"
                                                        required
                                                        className="w-full bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm rounded-xl pl-8 pr-2.5 py-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none font-mono-data"
                                                    />
                                                </div>
                                                <p className="text-[11px] text-slate-400 mt-1">
                                                    Used exclusively by City Engineering for critical field dispatch updates and tracking.
                                                </p>
                                            </div>

                                            {/* Info Notice */}
                                            <div className="p-3 rounded-xl bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900/40 text-left text-xs text-orange-800 dark:text-orange-300 flex items-center gap-2">
                                                <ShieldCheck size={16} className="text-orange-500 shrink-0" />
                                                <span>Password creation bypassed — your account will sign in securely using your authenticated Google credentials.</span>
                                            </div>

                                            {registrationError && (
                                                <div className="p-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-semibold my-2 flex items-center gap-1.5">
                                                    <AlertCircle size={14} />
                                                    <span>{registrationError}</span>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div>
                                            <div className="mb-2 text-center sm:text-left">
                                                <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                                                    Create your login
                                                </h2>
                                                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                                                    Set up your credentials to sign in and submit community reports.
                                                </p>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 my-2">
                                                <div>
                                                    <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                                                        Email Address <span className="text-red-400">*</span>
                                                    </label>
                                                    <div className="relative">
                                                        <Mail size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                                        <input
                                                            type="email"
                                                            name="email"
                                                            value={formData.email}
                                                            onChange={handleChange}
                                                            placeholder="juan@example.com"
                                                            required
                                                            className="w-full bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm rounded-xl pl-8 pr-2.5 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none"
                                                        />
                                                    </div>
                                                </div>

                                                <div>
                                                    <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                                                        Mobile Number <span className="text-red-400">*</span>
                                                    </label>
                                                    <div className="relative">
                                                        <Phone size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                                        <input
                                                            type="tel"
                                                            name="mobile"
                                                            value={formData.mobile}
                                                            onChange={handleChange}
                                                            placeholder="0917 123 4567"
                                                            required
                                                            className="w-full bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm rounded-xl pl-8 pr-2.5 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none font-mono-data"
                                                        />
                                                    </div>
                                                </div>

                                                <div>
                                                    <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                                                        Password <span className="text-red-400">*</span>
                                                    </label>
                                                    <div className="relative">
                                                        <Lock size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                                        <input
                                                            type={showPassword ? 'text' : 'password'}
                                                            name="password"
                                                            value={formData.password}
                                                            onChange={handleChange}
                                                            placeholder="At least 8 characters"
                                                            required
                                                            className="w-full bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm rounded-xl pl-8 pr-8 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowPassword(!showPassword)}
                                                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-orange-500 transition-colors"
                                                        >
                                                            {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                                                        </button>
                                                    </div>
                                                </div>

                                                <div>
                                                    <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                                                        Confirm Password <span className="text-red-400">*</span>
                                                    </label>
                                                    <div className="relative">
                                                        <Lock size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                                        <input
                                                            type={showConfirmPassword ? 'text' : 'password'}
                                                            name="confirmPassword"
                                                            value={formData.confirmPassword}
                                                            onChange={handleChange}
                                                            placeholder="Repeat password"
                                                            required
                                                            className="w-full bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm rounded-xl pl-8 pr-8 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-orange-500 transition-colors"
                                                        >
                                                            {showConfirmPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Password strength bar */}
                                            {formData.password && (
                                                <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 my-1">
                                                    <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider mb-1">
                                                        <span className="text-slate-400">Password Strength</span>
                                                        <span className={
                                                            formData.password.length < 8
                                                                ? 'text-red-500'
                                                                : !/[A-Z]/.test(formData.password) || !/[0-9]/.test(formData.password)
                                                                ? 'text-orange-500'
                                                                : 'text-emerald-500'
                                                        }>
                                                            {formData.password.length < 8 ? 'Too Short' : !/[A-Z]/.test(formData.password) || !/[0-9]/.test(formData.password) ? 'Medium' : 'Strong'}
                                                        </span>
                                                    </div>
                                                    <div className="h-1 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden flex gap-1">
                                                        <div className={`h-full rounded-full transition-all ${formData.password.length >= 8 ? 'bg-orange-500 w-1/3' : 'bg-red-500 w-1/3'}`} />
                                                        <div className={`h-full rounded-full transition-all ${/[A-Z]/.test(formData.password) ? 'bg-orange-500 w-1/3' : 'bg-transparent w-1/3'}`} />
                                                        <div className={`h-full rounded-full transition-all ${/[0-9]/.test(formData.password) ? 'bg-emerald-500 w-1/3' : 'bg-transparent w-1/3'}`} />
                                                    </div>
                                                </div>
                                            )}

                                            {registrationError && (
                                                <div className="p-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-semibold my-1 flex items-center gap-1.5">
                                                    <AlertCircle size={14} />
                                                    <span>{registrationError}</span>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Bottom Action Bar */}
                                    <div className="flex items-center justify-between pt-3 mt-2 border-t border-slate-100 dark:border-slate-800/60">
                                        <button
                                            type="button"
                                            onClick={() => setStep(3)}
                                            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
                                        >
                                            <ArrowLeft size={14} />
                                            <span>Back</span>
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={
                                                isGoogleAuth 
                                                    ? (!formData.email || !formData.mobile || registering)
                                                    : (!formData.email || !formData.mobile || !formData.password || formData.password !== formData.confirmPassword || registering)
                                            }
                                            className="bg-[#ff6b00] hover:bg-[#e65c00] active:scale-[0.99] text-white py-2.5 px-5 rounded-xl font-heading font-bold text-xs sm:text-sm tracking-wide transition-all shadow-md hover:shadow-lg hover:shadow-orange-500/25 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none flex items-center gap-2 cursor-pointer"
                                        >
                                            {registering ? (
                                                <>
                                                    <Loader2 size={16} className="animate-spin" />
                                                    <span>{isGoogleAuth ? 'Verifying ID...' : 'Creating Account...'}</span>
                                                </>
                                            ) : (
                                                <>
                                                    <span>{isGoogleAuth ? 'Complete ID Verification' : 'Create Account'}</span>
                                                    <ArrowRight size={15} />
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </form>
                            </motion.div>
                        )}

                        {/* ── STEP 5: CONFIRM CODE (OTP) ── */}
                        {step === 5 && (
                            <motion.div
                                key="step5"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.25 }}
                                className="flex flex-col h-full justify-between text-center"
                            >
                                <div>
                                    <div className="mb-3">
                                        <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                                            Enter your 6-digit code
                                        </h2>
                                        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                                            We sent a verification code to <span className="font-bold text-slate-900 dark:text-white">{formData.email}</span>.
                                        </p>
                                    </div>

                                    {/* 6 OTP boxes */}
                                    <div className="flex justify-center gap-2 sm:gap-3 my-4">
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
                                                className="w-10 h-12 sm:w-12 sm:h-14 text-center text-xl sm:text-2xl font-black bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:border-[#ff6b00] focus:ring-2 focus:ring-orange-500/20 outline-none transition-all text-slate-900 dark:text-white"
                                            />
                                        ))}
                                    </div>

                                    {verifyError && (
                                        <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-semibold my-2 flex items-center justify-center gap-1.5">
                                            <AlertCircle size={14} />
                                            <span>{verifyError}</span>
                                        </div>
                                    )}

                                    {verifySuccess && (
                                        <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold my-2 flex items-center justify-center gap-1.5">
                                            <CheckCircle size={14} />
                                            <span>{verifySuccess}</span>
                                        </div>
                                    )}

                                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                                        {resendTimer > 0 ? (
                                            <span>Resend code in <strong className="text-[#ff6b00]">{resendTimer}s</strong></span>
                                        ) : (
                                            <span>
                                                Didn't get the code?{' '}
                                                <button
                                                    type="button"
                                                    onClick={handleResendCode}
                                                    disabled={resending || !canResend}
                                                    className="text-[#ff6b00] font-bold hover:underline cursor-pointer disabled:opacity-50"
                                                >
                                                    {resending ? 'Sending...' : 'Resend Code'}
                                                </button>
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Bottom Action Bar */}
                                <div className="flex items-center justify-between pt-3 mt-2 border-t border-slate-100 dark:border-slate-800/60">
                                    <button
                                        type="button"
                                        onClick={() => setStep(4)}
                                        className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
                                    >
                                        <ArrowLeft size={14} />
                                        <span>Back</span>
                                    </button>
                                    <button
                                        type="button"
                                        disabled={otp.some(d => !d) || verifying}
                                        onClick={handleVerifyCode}
                                        className="bg-[#ff6b00] hover:bg-[#e65c00] active:scale-[0.99] text-white py-2.5 px-6 rounded-xl font-heading font-bold text-xs sm:text-sm tracking-wide transition-all shadow-md hover:shadow-lg hover:shadow-orange-500/25 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none flex items-center gap-2 cursor-pointer"
                                    >
                                        {verifying ? (
                                            <>
                                                <Loader2 size={16} className="animate-spin" />
                                                <span>Verifying...</span>
                                            </>
                                        ) : (
                                            <>
                                                <span>Confirm Account</span>
                                                <ArrowRight size={15} />
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
                                        Your Caloocan residency has been successfully verified. You're ready to report hazards and track city works.
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
                                src={previews[getPreviewKey(zoomedSide)] || previews.front} 
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
                        
                        <div className="absolute top-5 right-5 flex items-center gap-3">
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
        </div>
    );
}
