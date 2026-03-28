import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Phone, Lock, UploadCloud, CheckCircle, Loader2, X, ZoomIn, Info, Mail, ShieldCheck, AlertCircle, Camera, Eye, EyeOff, Sun, Moon, Monitor, Home, RotateCw, Database } from 'lucide-react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import Spline from '@splinetool/react-spline';
import { useTheme } from '../contexts/ThemeContext';
import ErrorBoundary from '../components/ErrorBoundary';
import Branding from '../components/Branding';
import IDCameraModal from '../components/IDCameraModal';

// ---------------------------------------------------------------------------
// OCR Address Parser
// Splits a raw OCR address string into structured sub-fields
// ---------------------------------------------------------------------------
function parseOcrAddress(raw, data) {
    if (!raw) return {};
    let remaining = raw.replace(/\n|\|/g, ', ').trim(); // Normalize newlines/pipes to commas
    
    // Aggressive frontend noise-scrubbing (metadata that leaked from OCR block)
    remaining = remaining.replace(/\b(KASARIAN|KASAR1AN|SEX|SEK|MALE|FEMALE|HALE|NALE|FEHALE|PEMALE|PHILIPPINES?|OF\s?PHI.*?|ADDRESS|A0DRESS|ADDRES5|RESIDENCE|LICENSE|L1CENSE|RESTRICTION|AGENCY|CODE|SERIAL|PLACE|ISSUANCE|BLOOD|EYE|WEIGHT|HEIGHT|TIN)\b/ig, '');
    let zipMatch = remaining.match(/\b([I1lO0]{1}\d{3}|\d{4}|14[O0]{2})\b/i); // Caloocan Zip Codes
    if(zipMatch) {
         remaining = remaining.replace(zipMatch[0], '').trim();
    }
    
    // 1. Extract House Number / Block & Lot (leading parts)
    let houseNo = '';
    let blockLot = '';

    // Match leading BLK/LOT patterns first
    const leadingBlkMatch = remaining.match(/^((?:BLK|BLOCK|LOT)\s*\d+[\s\S]*?)(?:,\s*|\s+(?!LOT))/i);
    if (leadingBlkMatch) {
         blockLot = leadingBlkMatch[1].trim();
         remaining = remaining.replace(leadingBlkMatch[1], '').trim();
    } else {
        // Fallback to house number (digits)
        const houseMatch = remaining.match(/^(\d+[-–a-zA-Z]*)\s/);
        if (houseMatch) {
            houseNo = houseMatch[1];
            remaining = remaining.replace(houseMatch[0], '').trim();
        }
    }

    // 2. Extract Block & Lot (contained anywhere else)
    if (!blockLot) {
        const blkMatch = remaining.match(/\b((?:BLK|BLOCK|8LK|B1K)\.?\s*[\dO]+\s*(?:[\w\s]*?)(?:LOT|L0T|L07)\.?\s*[\dO]+[\w\s]*?)\b/i) || 
                         remaining.match(/\b((?:LOT|L0T|L07)\.?\s*[\dO]+[A-Z]?)\b/i); 
        if (blkMatch) {
            // normalize
            blockLot = blkMatch[1].toUpperCase().replace(/8LK|B1K/g, 'BLK').replace(/L0T|L07/g, 'LOT').trim();
            remaining = remaining.replace(blkMatch[0], '').trim();
        }
    }

    // 3. Extract Subdivision / Village / Estate (Including "Northville" explicitly from National IDs)
    let subdivision = '';
    const subdivMatch = remaining.match(/\b([\w\s.#\-]+?(?:HOMES(?:\s+\d+)?|VILLAGE|VILL\.|HEIGHTS|SUBD\.?|SUBDIVISION|VILLE|ESTATE|PARK|PLACE|COURT(?:\s+\d+)?|NORTHVILLE(?:\s+[A-Z0-9]+)?))\b/i);
    if (subdivMatch) {
        subdivision = subdivMatch[1].trim();
        remaining = remaining.replace(subdivMatch[0], '').trim();

        // Split out street if it leaked into subdivision (e.g. "Ruby St Colina Homes")
        const stInSubdivMatch = subdivision.match(/\b(.*?)\b(?:ST\.?|STREET|AVE\.?|AVENUE|RD\.?|ROAD|BLVD\.?|BOULEVARD)\b\s+(.*)/i);
        if (stInSubdivMatch) {
             // If we found a street keyword in the middle of subdivision string
             const fullMatch = subdivision.match(/\b(.*?)\b(?:ST\.?|STREET|AVE\.?|AVENUE|RD\.?|ROAD|BLVD\.?|BOULEVARD)\b/i);
             if (fullMatch) {
                 const streetLeaked = fullMatch[0].trim();
                 subdivision = subdivision.replace(streetLeaked, '').trim();
                 remaining = (streetLeaked + ' ' + remaining).trim();
             }
        }
    }

    // 4. Strip out known Barangay/City parts that might have leaked from OCR grouping
    remaining = remaining.replace(/\b(?:BARANGAY|BRGY\.?|BGY\.?)\s*\d+[A-Z]?\b/i, '');
    
    // Dynamically remove the specific barangay text found by the backend (e.g., '171', 'Bagumbong', 'Talipapa')
    if (data && data.barangay) {
         try {
             const brgyRegex = new RegExp(`\\b${data.barangay}\\b`, 'ig');
             remaining = remaining.replace(brgyRegex, '');
         } catch(e) {}
    }

    remaining = remaining.replace(/\b(?:CALOOCAN|KALOOKAN|CITY|NCR|METRO MANILA|DISTRICT|ZONE|THIRD\s*(?:DIS\s*)?TRICT|EXPIRATION|DATE)\b/ig, '');
    
    // Clean up leftover commas, slashes, and spaces (and triple/double commas)
    remaining = remaining.replace(/,\s*,/g, ',').replace(/(^[,.\s\/]+)|([,.\s\/]+$)/g, '').trim();

    return {
        houseNo,
        blockLot,
        subdivision: subdivision.replace(/(^[,.\s\/]+)|([,.\s\/]+$)/g, '').trim(),
        street: remaining
    };
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
    mapped.houseNo = data.house_no || addr.houseNo || '';
    mapped.blockLot = data.block_lot || addr.blockLot || '';
    mapped.subdivision = data.subdivision || addr.subdivision || '';
    mapped.street = data.street || addr.street || (data.address || '').split('\n')[0].trim();

    mapped.barangay = data.barangay ? (data.barangay.startsWith('Barangay') ? data.barangay : `Barangay ${data.barangay}`) : (addr.barangayId ? `Barangay ${addr.barangayId}` : '');
    mapped.municipality = data.city || 'Caloocan City';
    mapped.province = data.province || 'Metro Manila';
    mapped.postalCode = data.postal_code || '1421'; // Default to 1421 for North Caloocan if detection fails
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

// ---------------------------------------------------------------------------
// Main Register Component
export default function Register() {
    const navigate = useNavigate();
    const { theme, changeTheme } = useTheme();

    const DARK_SCENE  = 'https://prod.spline.design/us1Y6xfaQLiI2cim/scene.splinecode';
    const LIGHT_SCENE = 'https://prod.spline.design/nrFjYzbJnF7GU92z/scene.splinecode';
    const [currentScene, setCurrentScene] = React.useState(DARK_SCENE);

    React.useEffect(() => {
        const updateScene = () => {
            if (theme === 'dark') {
                setCurrentScene(DARK_SCENE);
            } else if (theme === 'light') {
                setCurrentScene(LIGHT_SCENE);
            } else {
                const isSystemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                setCurrentScene(isSystemDark ? DARK_SCENE : LIGHT_SCENE);
            }
        };
        updateScene();

        if (theme === 'system') {
            const mq = window.matchMedia('(prefers-color-scheme: dark)');
            const listener = (e) => setCurrentScene(e.matches ? DARK_SCENE : LIGHT_SCENE);
            mq.addEventListener('change', listener);
            return () => mq.removeEventListener('change', listener);
        }
    }, [theme]);
    const [step, setStep] = React.useState(1);
    const [isScanning, setIsScanning] = React.useState(false);
    const [scanError, setScanError] = React.useState('');
    
    // Camera state
    const [cameraOpen, setCameraOpen] = React.useState(false);
    const [activeCameraSide, setActiveCameraSide] = React.useState('front');

    const [formData, setFormData] = React.useState({
        idFront: null,
        idBack: null,
        firstName: '',
        middleName: '',
        lastName: '',
        dobDate: null,   // Date object for display
        dob: '',         // ISO string YYYY-MM-DD for payload
        age: '',
        sex: '',
        houseNo: '',
        blockLot: '',
        subdivision: '',
        street: '',
        barangay: '',
        municipality: '',
        province: '',
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
    const [showPassword, setShowPassword] = React.useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
    const [hasScanned, setHasScanned] = React.useState(false); // prevent infinite re-scan

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
        const { name, value, type, checked } = e.target;
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
            }
            return next;
        });
    };

    // Scan ID handler
    const handleScanID = async (autoNext = true) => {
        if (!formData.idFront) { setScanError('Please upload the front of your ID first.'); return; }
        setIsScanning(true);
        setScanError('');

        try {
            const fd = new FormData();
            fd.append('idFront', formData.idFront);
            if (formData.idBack) fd.append('idBack', formData.idBack);

            const res = await axios.post('http://localhost:8000/api/verify-residency', fd, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            const result = res.data;

            if (!result.success) {
                setScanError(result.error || 'OCR failed. Please try again with a clearer image.');
                return;
            }

            const data = result.extracted_data;

            if (!data.is_north_caloocan) {
                setScanError(data.verification_message || 'Verification Failed: You must be a resident of North Caloocan (Barangay 165–188) to register.');
                return;
            }

            // Map OCR data → form fields
            const mapped = mapOcrToForm(data);
            setFormData(prev => ({ ...prev, ...mapped }));
            
            if (result.engine === 'mock') {
                setVerifiedBadge(`DEV MOCK — ${data.id_type.toUpperCase()} Verified`);
            } else {
                setVerifiedBadge(`${data.id_type ? data.id_type.toUpperCase() : 'ID'} — North Caloocan Verified`);
            }
            setHasScanned(true); // lock the scan button — scan complete
            if (autoNext) setStep(2);

        } catch (err) {
            console.error('[Register] Scan error:', err);
            setScanError(err.response?.data?.detail || 'Could not connect to the verification server. Please check your connection.');
        } finally {
            setIsScanning(false);
        }
    };

    const handleSkip = () => { setScanError(''); setStep(2); };
    const nextStep  = () => setStep(s => Math.min(s + 1, 3));
    const prevStep  = () => setStep(s => Math.max(s - 1, 1));

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
                full_name: [formData.firstName, formData.middleName, formData.lastName].filter(Boolean).join(' '),
                email: formData.email,
                phone_number: formData.mobile,
                password: formData.password,
                role: 'resident',
                address: [...addressParts, formData.barangay, formData.municipality].filter(Boolean).join(', '),
                barangay: formData.barangay,
            };
            const res = await axios.post('http://localhost:8000/api/auth/register', payload);
            if (res.status === 200 || res.status === 201) {
                localStorage.removeItem('pulso_token');
                localStorage.removeItem('pulso_user');
                setStep(4);
            }
        } catch (err) {
            setRegistrationError(err.response?.data?.detail || 'Registration failed. Email might already be in use.');
        } finally {
            setRegistering(false);
        }
    };

    // Step 2 "Next" is enabled when core fields are filled
    const step2Valid = formData.firstName && formData.lastName && formData.dob && formData.street && formData.barangay;

    return (
        <div className="relative min-h-screen w-full bg-slate-50 dark:bg-[#020617] overflow-hidden font-sans text-slate-800 dark:text-slate-200 transition-colors duration-700">

            {/* ── 3D Background System ──────────── */}
            <div className="absolute inset-0 z-0 pointer-events-auto">
                {/* Light scene */}
                <div className={`absolute inset-0 transition-opacity duration-1000 ${currentScene === LIGHT_SCENE ? 'opacity-100 z-10 scale-[0.85] lg:scale-100 origin-center' : 'opacity-0 z-0'}`}>
                    <ErrorBoundary fallback={<div className="w-full h-full bg-slate-100 dark:bg-slate-900" />}>
                        <Spline scene={LIGHT_SCENE} />
                    </ErrorBoundary>
                </div>
                {/* Dark scene */}
                <div className={`absolute inset-0 transition-opacity duration-1000 ${currentScene === DARK_SCENE ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}>
                    <ErrorBoundary fallback={<div className="w-full h-full bg-slate-100 dark:bg-slate-900" />}>
                        <Spline scene={DARK_SCENE} />
                    </ErrorBoundary>
                </div>
                <div className="absolute inset-0 bg-gradient-to-r from-white/60 via-transparent to-transparent dark:from-[#020617]/80 dark:via-transparent dark:to-transparent pointer-events-none z-20" />
                <div className="absolute inset-0 bg-gradient-to-t from-white/40 via-transparent to-transparent dark:from-[#020617]/40 dark:via-transparent dark:to-transparent pointer-events-none z-20" />
            </div>

            {/* ── Navigation Header ────── */}
            <nav className="absolute top-0 left-0 w-full p-8 flex justify-between items-center z-50">
                <div className="flex items-center gap-3">
                    <Branding size="h-10" showText={false} />
                    <div>
                        <span className="text-2xl font-black tracking-tighter text-slate-900 dark:text-white">PULSO</span>
                        <span className="ml-2 px-2 py-0.5 bg-slate-900/5 dark:bg-white/10 backdrop-blur-md rounded text-[10px] font-bold tracking-widest text-orange-600 dark:text-orange-400 uppercase border border-slate-900/5 dark:border-white/10">
                            New Resident
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <div className="hidden md:flex items-center gap-6 text-sm font-medium pr-6 border-r border-slate-200 dark:border-white/10">
                        <button onClick={() => navigate('/')} className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 hover:text-orange-600 dark:hover:text-white transition-colors font-semibold">
                            <Home size={15} /> Home
                        </button>
                    </div>
                    <div className="flex bg-white/50 dark:bg-white/5 backdrop-blur-md rounded-full p-1 border border-slate-200 dark:border-white/10 shadow-sm">
                        <button onClick={() => changeTheme('light')} className={`p-2 rounded-full transition-all ${theme === 'light' ? 'bg-white dark:bg-slate-700 shadow-md text-orange-500 scale-110' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}><Sun size={14} /></button>
                        <button onClick={() => changeTheme('system')} className={`p-2 rounded-full transition-all ${theme === 'system' ? 'bg-white dark:bg-slate-700 shadow-md text-orange-500 scale-110' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}><Monitor size={14} /></button>
                        <button onClick={() => changeTheme('dark')} className={`p-2 rounded-full transition-all ${theme === 'dark' ? 'bg-white dark:bg-slate-700 shadow-md text-orange-500 scale-110' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}><Moon size={14} /></button>
                    </div>
                </div>
            </nav>

            {/* ── Main Content Grid ─────── */}
            <main className="relative z-10 grid lg:grid-cols-12 min-h-screen items-center pt-28 pb-32 px-6 lg:px-12 xl:px-24 w-full gap-8">
                
                {/* Left: Hero Text */}
                <div className="lg:col-span-5 text-center lg:text-left mb-8 lg:mb-0 max-w-2xl mx-auto lg:mx-0">
                    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8 }}>
                        <div className="flex items-center justify-center lg:justify-start gap-2 mb-4 text-orange-600 dark:text-orange-500">
                            <User size={18} />
                            <span className="text-sm font-bold tracking-[0.3em] uppercase">Join The Network</span>
                        </div>
                        <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-slate-900 dark:text-white leading-[1.1] mb-6 tracking-tighter">
                            BECOME THE <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-orange-600">EYES & EARS</span>
                        </h1>
                        <p className="text-sm md:text-base text-slate-600 dark:text-slate-400 font-medium max-w-lg mx-auto lg:mx-0">
                            Sign up to gain access to the resident dashboard. Report incidents, track local hazards, and collaborate with your community.
                        </p>
                    </motion.div>
                </div>

                {/* Right: Registration Panel (Landscape-oriented form) */}
                <div className="lg:col-span-7 w-full max-w-2xl lg:max-w-none mx-auto lg:pl-4">
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, delay: 0.2 }}>
                        <div className="relative group">
                            <div className="absolute -inset-1 bg-gradient-to-r from-orange-600/20 to-blue-600/20 rounded-[2rem] blur-xl opacity-30 dark:opacity-40 group-hover:opacity-60 transition duration-1000" />
                            <div className="relative bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-white/40 dark:border-white/10 rounded-[2rem] p-6 lg:p-10 shadow-2xl overflow-hidden min-h-[400px] flex flex-col justify-center">
                    {/* Stepper */}
                    <div className="flex items-center mb-6 relative px-1">
                        <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-200 dark:bg-slate-700 -translate-y-1/2 z-0 rounded-full" />
                        <div className={`absolute top-1/2 left-0 h-0.5 bg-orange-500 -translate-y-1/2 z-0 rounded-full transition-all duration-500 ${step === 1 ? 'w-0' : step === 2 ? 'w-1/2' : 'w-full'}`} />
                        {[1, 2, 3].map(s => (
                            <div key={s} className={`relative z-10 flex items-center justify-center w-9 h-9 rounded-full font-bold text-sm border-2 transition-all duration-300 mr-auto last:mr-0
                                ${step > s ? 'bg-orange-500 border-orange-500 text-white shadow-md' :
                                  step === s ? 'bg-orange-500 border-orange-500 text-white shadow-lg ring-4 ring-orange-200 dark:ring-orange-900' :
                                  'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-400'}`}>
                                {step > s ? <CheckCircle size={16} /> : s}
                            </div>
                        ))}
                    </div>

                    {/* Step title */}
                    <div className="mb-5">
                        <h2 className="text-xl font-black text-slate-900 dark:text-white">
                            {step === 1 && 'Identity Verification'}
                            {step === 2 && 'Personal Information'}
                            {step === 3 && 'Account Credentials'}
                            {step === 4 && 'Registration Complete!'}
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                            {step === 1 && 'Upload a valid Philippine government-issued ID to auto-fill your details.'}
                            {step === 2 && 'Review and complete your personal information.'}
                            {step === 3 && 'Set up your login credentials.'}
                        </p>
                    </div>

                    <AnimatePresence mode="wait">
                        {/* ── STEP 1: ID Upload ── */}
                        {step === 1 && (
                            <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
                                <div className="grid grid-cols-2 gap-3 mb-4">
                                    {/* Front */}
                                    <div className="relative group aspect-[1.58/1] w-full rounded-2xl overflow-hidden bg-slate-100/50 dark:bg-slate-900/40 border border-slate-200 dark:border-white/10 shadow-inner">
                                        <input type="file" id="idFront" accept="image/*" onChange={e => handleFileUpload(e, 'idFront')} className="hidden" />
                                        <label htmlFor="idFront" className={`flex flex-col items-center justify-center w-full h-full border-2 border-dashed rounded-2xl cursor-pointer transition-all relative
                                            ${formData.idFront ? 'border-green-400 bg-green-50/30 dark:bg-green-900/10' : 'border-slate-300 dark:border-slate-600 hover:border-orange-400 bg-transparent'}`}>
                                            {previews.front ? (
                                                <>
                                                    <motion.div 
                                                        animate={isScanning ? { rotateY: [0, 180, 360], rotateZ: formData.idFrontRotation } : { rotateZ: formData.idFrontRotation }} 
                                                        transition={isScanning ? { rotateY: { duration: 3, repeat: Infinity, ease: "linear" }, rotateZ: { duration: 0.3 } } : { duration: 0.3 }}
                                                        className="absolute inset-0 w-full h-full transform-gpu flex items-center justify-center p-3" 
                                                        style={{ perspective: 1000, transformStyle: 'preserve-3d' }}
                                                    >
                                                        <img src={previews.front} alt="Front" className="max-w-full max-h-full object-contain opacity-90 group-hover:opacity-60 transition-opacity rounded-lg shadow-sm" />
                                                        {isScanning && <div className="absolute inset-2 bg-orange-500/10 mix-blend-overlay rounded-lg" />}
                                                    </motion.div>
                                                    {isScanning && (
                                                        <motion.div 
                                                            className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-orange-400 to-transparent shadow-[0_0_20px_rgba(249,115,22,1)] z-30"
                                                            animate={{ top: ['0%', '100%', '0%'] }}
                                                            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                                        />
                                                    )}
                                                    <button type="button" onClick={e => handleRemoveID(e, 'idFront')} className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white p-1 rounded-full z-20 shadow">
                                                        <X size={14} />
                                                    </button>
                                                    {!isScanning && (
                                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 cursor-pointer z-10"
                                                             onClick={e => { e.preventDefault(); e.stopPropagation(); setZoomedSide('idFront'); }}>
                                                            <ZoomIn size={28} className="text-white" />
                                                        </div>
                                                    )}
                                                    <div className="absolute bottom-0 left-0 right-0 bg-green-500/90 text-white text-xs font-bold py-1.5 text-center flex items-center justify-center gap-1 z-20">
                                                        <CheckCircle size={12}/> ID Front ✓
                                                    </div>
                                                </>
                                            ) : (
                                                <>
                                                    <UploadCloud size={26} className="text-slate-400 group-hover:text-orange-500 mb-2 transition-colors" />
                                                    <span className="text-sm font-bold text-slate-500 group-hover:text-orange-600 transition-colors">ID Front</span>
                                                    <div className="flex gap-2 mt-2">
                                                        <span className="text-[10px] bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded-full text-slate-500 font-bold uppercase">Upload</span>
                                                        <button 
                                                            onClick={(e) => openCamera(e, 'front')}
                                                            className="text-[10px] bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400 px-2 py-0.5 rounded-full font-bold uppercase hover:bg-orange-200 transition-colors flex items-center gap-1"
                                                        >
                                                            <Camera size={10} /> Camera
                                                        </button>
                                                    </div>
                                                </>
                                            )}
                                        </label>
                                    </div>

                                    {/* Back */}
                                    <div className="relative group aspect-[1.58/1] w-full rounded-2xl overflow-hidden bg-slate-100/50 dark:bg-slate-900/40 border border-slate-200 dark:border-white/10 shadow-inner">
                                        <input type="file" id="idBack" accept="image/*" onChange={e => handleFileUpload(e, 'idBack')} className="hidden" />
                                        <label htmlFor="idBack" className={`flex flex-col items-center justify-center w-full h-full border-2 border-dashed rounded-2xl cursor-pointer transition-all relative
                                            ${formData.idBack ? 'border-green-400 bg-green-50/30 dark:bg-green-900/10' : 'border-slate-300 dark:border-slate-600 hover:border-orange-400 bg-transparent'}`}>
                                            {previews.back ? (
                                                <>
                                                    <motion.div 
                                                        animate={isScanning ? { rotateY: [0, 180, 360], rotateZ: formData.idBackRotation } : { rotateZ: formData.idBackRotation }} 
                                                        transition={isScanning ? { rotateY: { duration: 3, repeat: Infinity, ease: "linear" }, rotateZ: { duration: 0.3 } } : { duration: 0.3 }}
                                                        className="absolute inset-0 w-full h-full transform-gpu flex items-center justify-center p-3" 
                                                        style={{ perspective: 1000, transformStyle: 'preserve-3d' }}
                                                    >
                                                        <img src={previews.back} alt="Back" className="max-w-full max-h-full object-contain opacity-90 group-hover:opacity-60 transition-opacity rounded-lg shadow-sm" />
                                                        {isScanning && <div className="absolute inset-2 bg-orange-500/10 mix-blend-overlay rounded-lg" />}
                                                    </motion.div>
                                                    {isScanning && (
                                                        <motion.div 
                                                            className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-orange-400 to-transparent shadow-[0_0_20px_rgba(249,115,22,1)] z-30"
                                                            animate={{ top: ['0%', '100%', '0%'] }}
                                                            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                                        />
                                                    )}
                                                    <button type="button" onClick={e => handleRemoveID(e, 'idBack')} className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white p-1 rounded-full z-20 shadow">
                                                        <X size={14} />
                                                    </button>
                                                    {!isScanning && (
                                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 cursor-pointer z-10"
                                                             onClick={e => { e.preventDefault(); e.stopPropagation(); setZoomedSide('idBack'); }}>
                                                            <ZoomIn size={28} className="text-white" />
                                                        </div>
                                                    )}
                                                    <div className="absolute bottom-0 left-0 right-0 bg-green-500/90 text-white text-xs font-bold py-1.5 text-center flex items-center justify-center gap-1 z-20">
                                                        <CheckCircle size={12}/> ID Back ✓
                                                    </div>
                                                </>
                                            ) : (
                                                <>
                                                    <UploadCloud size={26} className="text-slate-400 group-hover:text-orange-500 mb-2 transition-colors" />
                                                    <span className="text-sm font-bold text-slate-500 group-hover:text-orange-600 transition-colors">ID Back</span>
                                                    <div className="flex gap-2 mt-2">
                                                        <span className="text-[10px] bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded-full text-slate-500 font-bold uppercase">Upload</span>
                                                        <button 
                                                            onClick={(e) => openCamera(e, 'back')}
                                                            className="text-[10px] bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400 px-2 py-0.5 rounded-full font-bold uppercase hover:bg-orange-200 transition-colors flex items-center gap-1"
                                                        >
                                                            <Camera size={10} /> Camera
                                                        </button>
                                                    </div>
                                                </>
                                            )}
                                        </label>
                                    </div>
                                </div>

                                {/* Tips */}
                                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50 rounded-xl p-3 mb-4 text-xs text-blue-700 dark:text-blue-400">
                                    <strong>Tips for best results:</strong> Lay ID on a flat surface with good lighting. Avoid glare and shadows. Ensure all text is clearly readable.
                                </div>

                                {/* Error */}
                                {scanError && (
                                    <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3 flex gap-2 items-start text-sm text-red-700 dark:text-red-400">
                                        <AlertCircle size={16} className="shrink-0 mt-0.5" />
                                        <span>{scanError}</span>
                                    </div>
                                )}

                                <div className="flex gap-3">
                                    <button type="button" onClick={handleSkip} className="w-1/3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 py-3 rounded-2xl font-bold text-sm transition-all">
                                        Skip
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleScanID}
                                        disabled={!formData.idFront || isScanning}
                                        className="w-2/3 bg-gradient-to-r from-orange-500 to-orange-400 hover:from-orange-600 hover:to-orange-500 text-white py-3 rounded-2xl font-bold text-sm transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        {isScanning ? <><Loader2 size={18} className="animate-spin" /> Scanning...</> : <><ShieldCheck size={18} /> Scan ID & Continue</>}
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {/* ── STEP 2: Personal Info ── */}
                        {step === 2 && (
                            <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
                                {/* Verification badge */}
                                {verifiedBadge ? (
                                    <div className="mb-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-3 flex gap-2 items-center text-sm">
                                        <CheckCircle size={16} className="text-green-500 shrink-0" />
                                        <div>
                                            <p className="font-bold text-green-700 dark:text-green-400 text-xs">{verifiedBadge}</p>
                                            <p className="text-xs text-green-600/80 dark:text-green-500/80">Review and fill in any missing information below.</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="mb-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3 flex gap-2 items-center text-xs text-amber-700 dark:text-amber-400">
                                        <Info size={15} className="shrink-0" />
                                        <span>ID scan skipped. Please fill in your details manually. Only North Caloocan (Barangay 165–188) residents may register.</span>
                                    </div>
                                )}

                                {/* Full Name */}
                                <SectionHeading>Full Name</SectionHeading>
                                <div className="grid grid-cols-3 gap-2">
                                    <InputField label="First Name" name="firstName" value={formData.firstName} onChange={handleChange} required />
                                    <InputField label="Middle Name" name="middleName" value={formData.middleName} onChange={handleChange} placeholder="Optional" />
                                    <InputField label="Last Name" name="lastName" value={formData.lastName} onChange={handleChange} required />
                                </div>

                                {/* Demographics */}
                                <SectionHeading>Demographics</SectionHeading>
                                <div className="grid grid-cols-3 gap-2">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 pl-0.5">Date of Birth <span className="text-red-400">*</span></label>
                                        <input
                                            type="date"
                                            name="dob"
                                            value={formData.dob}
                                            onChange={handleChange}
                                            max={new Date().toISOString().split('T')[0]}
                                            required
                                            className="w-full bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                                        />
                                    </div>
                                    <InputField label="Age" name="age" value={formData.age} onChange={handleChange} readOnly placeholder="Auto-filled" />
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 pl-0.5">Sex <span className="text-red-400">*</span></label>
                                        <select name="sex" value={formData.sex} onChange={handleChange} required
                                            className="w-full bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-orange-500 outline-none appearance-none cursor-pointer">
                                            <option value="" disabled>Select</option>
                                            <option value="Male">Male</option>
                                            <option value="Female">Female</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Address */}
                                <SectionHeading>Complete Address</SectionHeading>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                    <InputField label="House No." name="houseNo" value={formData.houseNo} onChange={handleChange} />
                                    <InputField label="Block & Lot" name="blockLot" value={formData.blockLot} onChange={handleChange} />
                                    <InputField label="Subdivision" name="subdivision" value={formData.subdivision} onChange={handleChange} className="col-span-2 md:col-span-1" />
                                    <InputField label="Street" name="street" value={formData.street} onChange={handleChange} required className="col-span-2" />
                                    <InputField label="Barangay" name="barangay" value={formData.barangay} onChange={handleChange} required />
                                    <InputField label="City" name="municipality" value={formData.municipality} onChange={handleChange} />
                                    <InputField label="Province" name="province" value={formData.province} onChange={handleChange} />
                                    <InputField label="Postal Code" name="postalCode" value={formData.postalCode} onChange={handleChange} />
                                </div>

                                <div className="flex gap-3 mt-5">
                                    <button type="button" onClick={prevStep} className="w-1/3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 py-3 rounded-2xl font-bold text-sm transition-all">Back</button>
                                    <button
                                        type="button"
                                        onClick={nextStep}
                                        disabled={!step2Valid}
                                        className="w-2/3 bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-2xl font-bold text-sm transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
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
                                                <input type={showPassword ? "text" : "password"} name="password" value={formData.password} onChange={handleChange} placeholder="Min. 6 characters" required minLength={6}
                                                    className="w-full bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 text-sm rounded-xl pl-9 pr-10 py-2.5 focus:ring-2 focus:ring-orange-500 outline-none transition-all" />
                                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-orange-500 transition-colors focus:outline-none" aria-label={showPassword ? "Hide password" : "Show password"}>
                                                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                                                </button>
                                            </div>
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
                                            className="w-2/3 bg-gradient-to-r from-orange-500 to-orange-400 hover:from-orange-600 hover:to-orange-500 text-white py-3 rounded-2xl font-bold text-sm transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                        >
                                            {registering ? <><Loader2 size={17} className="animate-spin" /> Creating Account...</> : 'Create My Account'}
                                        </button>
                                    </div>
                                </form>
                            </motion.div>
                        )}

                        {/* ── STEP 4: Success ── */}
                        {step === 4 && (
                            <motion.div key="s4" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }}
                                className="flex flex-col items-center text-center py-6 gap-4">
                                <div className="w-20 h-20 bg-green-100 dark:bg-green-500/20 text-green-500 rounded-full flex items-center justify-center">
                                    <CheckCircle size={40} />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Account Created!</h3>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs">Your PULSO account has been successfully created. Welcome to the community!</p>
                                </div>
                                <Link to="/login" className="mt-2 bg-gradient-to-r from-orange-500 to-orange-400 hover:from-orange-600 hover:to-orange-500 text-white px-8 py-3.5 rounded-2xl font-bold text-sm transition-all shadow-md flex items-center gap-2">
                                    Proceed to Login
                                </Link>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Footer link */}
                    {step !== 4 && (
                        <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800/50 text-center relative z-20">
                            <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                                Already have an account?{' '}
                                <Link to="/login" className="text-orange-600 dark:text-orange-400 font-bold hover:underline decoration-2 underline-offset-4">Sign In</Link>
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    </div>
</main>

            {/* ── Bottom Info Bar ───────────────── */}
            <div className="absolute bottom-0 left-0 w-full bg-white/60 dark:bg-[#020617]/70 backdrop-blur-md border-t border-slate-200 dark:border-white/5 py-4 px-8 flex flex-col md:flex-row justify-between items-center gap-4 z-50 transition-colors">
                <div className="flex items-center gap-6 overflow-hidden max-w-4xl">
                    <span className="text-[10px] font-black text-orange-600 dark:text-orange-500 uppercase tracking-[0.2em] whitespace-nowrap">Notice:</span>
                    <div className="text-[10px] font-bold text-slate-500 dark:text-slate-600 uppercase tracking-[0.3em] whitespace-nowrap animate-marquee">
                        YOUR PRIVACY IS PROTECTED UNDER THE PHILIPPINE DATA PRIVACY ACT (RA 10173) • AUTHORIZED RESIDENTS ONLY • PULSO CITIZEN PLATFORM • CITY OF CALOOCAN
                    </div>
                </div>
                <div className="flex items-center gap-6 text-[10px] font-black text-slate-400 dark:text-slate-500 tracking-[0.2em]">
                    <span>CALOOCAN NORTH DISTRICT • PHILIPPINES</span>
                    <div className="h-3 w-[1px] bg-slate-200 dark:bg-white/10" />
                    <span className="text-orange-600/50 dark:text-orange-500/50">v4.2.1</span>
                </div>
            </div>

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
                                <button disabled className="flex items-center gap-2 px-4 py-2.5 rounded-full font-bold text-sm bg-orange-500/20 text-orange-400 cursor-not-allowed shadow-lg">
                                    <Loader2 size={16} className="animate-spin" /> Scanning...
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

                        {/* Scanning Details Panel Overlay */}
                        {(formData.firstName || formData.lastName) && !isScanning && (
                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                                className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-3xl bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-2xl text-white cursor-auto"
                                onClick={e => e.stopPropagation()}
                            >
                                <div className="flex items-center justify-between mb-4 px-2 border-b border-white/10 pb-3">
                                    <div className="flex items-center gap-2">
                                        <Database size={18} className="text-orange-400" />
                                        <span className="text-sm font-black uppercase tracking-widest text-slate-200">Extracted Information</span>
                                    </div>
                                    {formData.idType && (
                                        <span className="text-[10px] font-black px-2 py-1 bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded-md uppercase tracking-tighter">
                                            {formData.idType}
                                        </span>
                                    )}
                                </div>
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 px-2">
                                    <div>
                                        <p className="text-[10px] text-slate-400 uppercase font-black tracking-wider mb-1">Full Name</p>
                                        <p className="text-sm font-bold text-white truncate">{[formData.firstName, formData.middleName, formData.lastName].filter(Boolean).join(' ') || '—'}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-slate-400 uppercase font-black tracking-wider mb-1">Date of Birth</p>
                                        <p className="text-sm font-bold text-white">{formData.dob || '—'}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-slate-400 uppercase font-black tracking-wider mb-1">Sex</p>
                                        <p className="text-sm font-bold text-white">{formData.sex || '—'}</p>
                                    </div>
                                    <div className="lg:col-span-1">
                                        <p className="text-[10px] text-slate-400 uppercase font-black tracking-wider mb-1">Address Match</p>
                                        <div className="flex items-center gap-1.5">
                                            {formData.street || formData.barangay ? <CheckCircle size={14} className="text-green-400" /> : <AlertCircle size={14} className="text-amber-400" />}
                                            <p className="text-sm font-bold text-white truncate max-w-[120px]">{formData.barangay || 'Pending'}</p>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
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
