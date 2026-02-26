import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Phone, MapPin, Lock, UploadCloud, CheckCircle, Loader2, X, ZoomIn, Info, Mail, Calendar, Key, ShieldCheck } from 'lucide-react';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";

import { PulsoLogo } from './Landing';

// Custom complex overlapping wave divider
const WaveDivider = () => (
    <div className="absolute top-0 right-0 h-full w-24 translate-x-full hidden md:block z-20 pointer-events-none">
        <svg viewBox="0 0 100 800" preserveAspectRatio="none" className="absolute top-0 left-0 h-full w-full text-orange-700/30 fill-current translate-x-6 drop-shadow-lg">
            <path d="M0,0 C60,100 0,250 50,400 C100,550 20,650 40,800 L0,800 L0,0 Z" />
        </svg>
        <svg viewBox="0 0 100 800" preserveAspectRatio="none" className="absolute top-0 left-0 h-full w-full text-orange-600/50 fill-current translate-x-3 drop-shadow-md">
            <path d="M0,0 C80,150 10,300 60,450 C110,600 10,700 20,800 L0,800 L0,0 Z" />
        </svg>
        <svg viewBox="0 0 100 800" preserveAspectRatio="none" className="absolute top-0 left-0 h-full w-full text-orange-500 fill-current drop-shadow-xl">
            <path d="M0,0 C40,120 -10,280 40,420 C90,560 -10,680 10,800 L0,800 L0,0 Z" />
        </svg>
    </div>
);

const AppleIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M16.365 21.49c-1.282.91-2.584.89-3.774.24-1.206-.65-2.281-.65-3.518-.01-1.168.61-2.378.68-3.486-.14-4.809-3.51-6.182-10.74-2.126-14.3.111-.09.227-.18.347-.26.234-.14.48-.28.74-.4 1.258-.59 2.508-.47 3.565.11.968.53 1.543.53 2.58-.02 1.353-.69 2.7-.73 3.935-.15 1.542.74 2.525 2.06 3.018 3.53-3.235 1.48-2.659 5.86.435 7.14-1.042 2.01-2.27 3.65-3.69 4.26-.06.02-.124.05-.188.08-.6.28-1.23.47-1.844.47zM15.42 6.81c-.05.01-.12.01-.18.01-1.82 0-3.32-1.39-3.6-3.14-.02-.13-.03-.26-.03-.39 0-.07.01-.14.01-.2 1.94-.09 3.56 1.45 3.79 3.32.01.12.01.25.01.4z" />
    </svg>
);

export default function Register() {
    const { t } = useTranslation();
    const [showWelcome, setShowWelcome] = React.useState(true);
    const [step, setStep] = React.useState(1);
    const [isScanning, setIsScanning] = React.useState(false);
    const [formData, setFormData] = React.useState({
        idFront: null,
        idBack: null,
        firstName: '',
        middleName: '',
        lastName: '',
        dob: '',
        age: '',
        sex: '',
        houseNo: '',
        blockLot: '',
        subdivision: '',
        street: '',
        municipality: '',
        province: '',
        barangay: '',
        district: '',
        postalCode: '',
        email: '',
        mobile: '',
        password: '',
        confirmPassword: '',
        verificationCode: ''
    });
    const [previews, setPreviews] = React.useState({ front: null, back: null });
    const [zoomedImage, setZoomedImage] = React.useState(null);
    const [idType, setIdType] = React.useState('');

    const handleFileUpload = (e, side) => {
        const file = e.target.files[0];
        if (file) {
            setFormData(prev => ({ ...prev, [side]: file }));
            const url = URL.createObjectURL(file);
            setPreviews(prev => ({ ...prev, [side === 'idFront' ? 'front' : 'back']: url }));
        }
    };

    const handleRemoveID = (e, side) => {
        e.preventDefault();
        e.stopPropagation();
        setFormData(prev => ({ ...prev, [side]: null }));
        setPreviews(prev => ({ ...prev, [side === 'idFront' ? 'front' : 'back']: null }));
    };

    const handleScanID = () => {
        if (!formData.idFront || !formData.idBack) {
            alert('Please upload both the front and back of your ID first.');
            return;
        }
        setIsScanning(true);
        // Simulate OCR AI Processing time
        setTimeout(() => {
            setIsScanning(false);
            setIdType('Philippine National ID'); // Simulate ID verification result
            // Auto-fill from simulated OCR data
            setFormData(prev => ({
                ...prev,
                firstName: 'JUAN',
                middleName: '',
                lastName: 'DELA CRUZ'
            }));
            setStep(2);
        }, 3000); // 3 seconds scan simulation
    };

    const handleSkip = () => {
        setStep(2);
    };

    const handleChange = (e) => {
        // Handle custom event from DatePicker or standard DOM event
        const name = e?.target ? e.target.name : 'dob';
        const value = e?.target ? e.target.value : e;
        const type = e?.target ? e.target.type : 'date';
        const checked = e?.target ? e.target.checked : false;

        setFormData(prev => {
            const nextData = { ...prev, [name]: type === 'checkbox' ? checked : value };

            // Auto-calculate age if DOB changes
            if (name === 'dob' && value) {
                const birthDate = new Date(value);
                const today = new Date();
                let computedAge = today.getFullYear() - birthDate.getFullYear();
                const m = today.getMonth() - birthDate.getMonth();
                if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                    computedAge--;
                }
                nextData.age = computedAge >= 0 ? computedAge.toString() : '';
            }

            return nextData;
        });
    };

    const nextStep = () => setStep(prev => Math.min(prev + 1, 4));
    const prevStep = () => setStep(prev => Math.max(prev - 1, 1));

    const handleSubmit = (e) => {
        e.preventDefault();
        // Final submit logic here
        window.location.href = '/dashboard';
    };

    const fadeUp = {
        hidden: { opacity: 0, y: 15 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } }
    };

    // Smooth step transition variant
    const stepAnim = {
        hidden: { opacity: 0, x: 20 },
        visible: { opacity: 1, x: 0, transition: { duration: 0.4 } },
        exit: { opacity: 0, x: -20, transition: { duration: 0.3 } }
    };

    return (
        <div className="min-h-screen w-full font-sans bg-slate-100 dark:bg-slate-950 flex flex-col items-center py-6 sm:py-10 px-4 sm:px-8 transition-colors relative">

            {/* Subtle background decoration to make the glassmorphism pop */}
            <div className="absolute top-[-10%] right-[-5%] w-[40rem] h-[40rem] bg-orange-500/20 dark:bg-orange-500/10 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute bottom-[-10%] left-[-5%] w-[30rem] h-[30rem] bg-blue-500/20 dark:bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>

            {/* Welcome Message Modal */}
            <AnimatePresence>
                {showWelcome && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 sm:p-8"
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20, opacity: 0 }}
                            animate={{ scale: 1, y: 0, opacity: 1 }}
                            exit={{ scale: 0.9, y: 20, opacity: 0 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            className="bg-gradient-to-br from-orange-600 to-orange-500 rounded-[1.5rem] w-full max-w-sm min-h-[400px] relative flex flex-col justify-center items-center p-6 md:p-8 text-center text-white shadow-2xl overflow-hidden cursor-auto"
                        >
                            {/* Subtle minimal wave for smaller modal */}
                            <div className="absolute top-0 right-0 h-full w-24 translate-x-1/2 opacity-50 hidden md:block z-20 pointer-events-none">
                                <svg viewBox="0 0 100 800" preserveAspectRatio="none" className="absolute top-0 left-0 h-full w-full text-orange-700/30 fill-current drop-shadow-sm">
                                    <path d="M0,0 C60,100 0,250 50,400 C100,550 20,650 40,800 L0,800 L0,0 Z" />
                                </svg>
                            </div>

                            <button
                                onClick={() => setShowWelcome(false)}
                                className="absolute top-4 right-4 z-50 text-white/70 hover:text-white bg-black/10 hover:bg-black/30 p-2 rounded-full transition-all cursor-pointer"
                            >
                                <X size={18} className="stroke-[2.5]" />
                            </button>

                            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0, transition: { delay: 0.1, duration: 0.5 } }} className="flex flex-col items-center z-10 w-full relative">
                                <h2 className="text-xl font-display font-medium mb-6 tracking-wide drop-shadow-sm">{t('register.welcome')}</h2>

                                <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-lg mb-6 transform hover:scale-105 transition-transform duration-500">
                                    <div className="scale-[1.4]">
                                        <PulsoLogo />
                                    </div>
                                </div>
                                <h1 className="text-3xl font-extrabold tracking-tight mb-4 drop-shadow-sm">{t('register.pulso')}</h1>

                                <p className="text-orange-50 text-xs md:text-sm leading-relaxed max-w-[280px] font-medium opacity-90 px-2">
                                    {t('register.desc')}
                                </p>
                            </motion.div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Fullscreen Zoom Modal */}
            <AnimatePresence>
                {zoomedImage && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 cursor-pointer"
                        onClick={() => setZoomedImage(null)}
                    >
                        <motion.img
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            src={zoomedImage}
                            alt="Zoomed document"
                            className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-[0_0_50px_rgba(0,0,0,0.5)] cursor-auto"
                            onClick={(e) => e.stopPropagation()}
                        />
                        <button
                            className="absolute top-6 right-6 text-white hover:text-orange-500 bg-black/50 hover:bg-black/70 p-3 rounded-full transition-all"
                            onClick={() => setZoomedImage(null)}
                        >
                            <X size={24} />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className="w-full max-w-4xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-[2rem] shadow-xl overflow-hidden flex flex-col min-h-[500px] transition-colors mt-8 mb-12"
            >
                {/* Right Side: Form */}
                <div className="w-full p-6 md:p-10 lg:p-14 flex flex-col justify-center relative bg-transparent z-10 transition-colors">
                    <motion.div initial="hidden" animate="visible" variants={fadeUp}>
                        {/* Stepper */}
                        <div className="flex items-center justify-between mb-8 relative px-2">
                            <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-200 dark:bg-slate-800 -translate-y-1/2 z-0 rounded-full"></div>
                            <div className={`absolute top-1/2 left-0 h-1 bg-orange-500 -translate-y-1/2 z-0 rounded-full transition-all duration-500 ${step === 1 ? 'w-0' : step === 2 ? 'w-1/3' : step === 3 ? 'w-2/3' : 'w-full'}`}></div>

                            {[1, 2, 3, 4].map((s) => (
                                <div key={s} className={`relative z-10 flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full font-bold text-xs sm:text-sm border-2 transition-colors duration-300 ${step >= s ? 'bg-orange-500 border-orange-500 text-white shadow-lg' : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-400'}`}>
                                    {step > s ? <CheckCircle size={16} /> : s}
                                </div>
                            ))}
                        </div>

                        <h2 className="text-xl sm:text-2xl font-display font-bold text-slate-900 dark:text-white mb-6 text-center md:text-left">
                            {step === 1 && "Identity Verification"}
                            {step === 2 && "Personal Information"}
                            {step === 3 && "Account Credentials"}
                            {step === 4 && "Account Verification"}
                        </h2>

                        <form onSubmit={handleSubmit} className="flex flex-col gap-4 relative min-h-[440px]">
                            <AnimatePresence mode="popLayout">
                                {/* --- STEP 1: ID Upload --- */}
                                {step === 1 && (
                                    <motion.div key="step1" variants={stepAnim} initial="hidden" animate="visible" exit="exit" className="absolute inset-0 w-full flex flex-col">
                                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Please upload a clear picture of the front and back of your valid ID. Our system will automatically extract your details securely.</p>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                                            {/* Front ID */}
                                            <div className="relative group min-h-[160px] sm:min-h-[240px] flex-1">
                                                <input type="file" id="idFront" accept="image/*" onChange={(e) => handleFileUpload(e, 'idFront')} className="hidden" />
                                                <label htmlFor="idFront" className={`flex flex-col items-center justify-center w-full h-full border-2 border-dashed rounded-2xl cursor-pointer transition-all overflow-hidden relative ${formData.idFront ? 'border-green-500 bg-green-50 dark:bg-green-500/10' : 'border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 hover:border-orange-500 hover:bg-orange-50 dark:hover:bg-orange-500/10'}`}>
                                                    {previews.front ? (
                                                        <>
                                                            <img src={previews.front} alt="Front ID Preview" className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-40 transition-opacity" />
                                                            <button type="button" onClick={(e) => handleRemoveID(e, 'idFront')} className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white p-1 rounded-full shadow-md transition-colors z-20">
                                                                <X size={16} />
                                                            </button>
                                                            <div
                                                                className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 cursor-pointer"
                                                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setZoomedImage(previews.front); }}
                                                            >
                                                                <div className="bg-white/20 hover:bg-white/40 backdrop-blur-md p-2 rounded-full text-white transition-colors mb-2">
                                                                    <ZoomIn size={24} />
                                                                </div>
                                                                <span className="text-white text-xs font-bold drop-shadow-md">Click to Zoom</span>
                                                            </div>
                                                            <div className="absolute bottom-2 left-2 right-2 bg-green-500/90 backdrop-blur-sm text-white text-xs font-bold py-1 px-2 rounded-lg flex items-center justify-center gap-1">
                                                                <CheckCircle size={14} /> Front Uploaded
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <><UploadCloud className="text-slate-400 mb-2 group-hover:text-orange-500 transition-colors" size={28} /><span className="text-sm font-semibold text-slate-500 dark:text-slate-400 group-hover:text-orange-600">ID Front</span></>
                                                    )}
                                                </label>
                                            </div>

                                            {/* Back ID */}
                                            <div className="relative group min-h-[160px] sm:min-h-[240px] flex-1">
                                                <input type="file" id="idBack" accept="image/*" onChange={(e) => handleFileUpload(e, 'idBack')} className="hidden" />
                                                <label htmlFor="idBack" className={`flex flex-col items-center justify-center w-full h-full border-2 border-dashed rounded-2xl cursor-pointer transition-all overflow-hidden relative ${formData.idBack ? 'border-green-500 bg-green-50 dark:bg-green-500/10' : 'border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 hover:border-orange-500 hover:bg-orange-50 dark:hover:bg-orange-500/10'}`}>
                                                    {previews.back ? (
                                                        <>
                                                            <img src={previews.back} alt="Back ID Preview" className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-40 transition-opacity" />
                                                            <button type="button" onClick={(e) => handleRemoveID(e, 'idBack')} className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white p-1 rounded-full shadow-md transition-colors z-20">
                                                                <X size={16} />
                                                            </button>
                                                            <div
                                                                className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 cursor-pointer"
                                                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setZoomedImage(previews.back); }}
                                                            >
                                                                <div className="bg-white/20 hover:bg-white/40 backdrop-blur-md p-2 rounded-full text-white transition-colors mb-2">
                                                                    <ZoomIn size={24} />
                                                                </div>
                                                                <span className="text-white text-xs font-bold drop-shadow-md">Click to Zoom</span>
                                                            </div>
                                                            <div className="absolute bottom-2 left-2 right-2 bg-green-500/90 backdrop-blur-sm text-white text-xs font-bold py-1 px-2 rounded-lg flex items-center justify-center gap-1">
                                                                <CheckCircle size={14} /> Back Uploaded
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <><UploadCloud className="text-slate-400 mb-2 group-hover:text-orange-500 transition-colors" size={28} /><span className="text-sm font-semibold text-slate-500 dark:text-slate-400 group-hover:text-orange-600">ID Back</span></>
                                                    )}
                                                </label>
                                            </div>
                                        </div>

                                        <div className="flex gap-3 mt-auto pt-4">
                                            <button
                                                type="button"
                                                onClick={handleSkip}
                                                className="w-1/3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 p-3.5 rounded-2xl font-bold text-sm transition-all"
                                            >
                                                Skip
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleScanID}
                                                disabled={!formData.idFront || !formData.idBack || isScanning}
                                                className="w-2/3 bg-gradient-to-r from-orange-500 to-orange-400 hover:from-orange-600 hover:to-orange-500 text-white p-3.5 rounded-2xl font-bold text-base transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                                            >
                                                {isScanning ? <><Loader2 className="animate-spin" size={20} /> Scanning Identity...</> : 'Scan ID & Continue'}
                                            </button>
                                        </div>
                                    </motion.div>
                                )}

                                {/* --- STEP 2: Detailed Personal Info & Address --- */}
                                {step === 2 && (
                                    <motion.div key="step2" variants={stepAnim} initial="hidden" animate="visible" exit="exit" className="absolute inset-0 w-full flex flex-col gap-4 overflow-y-auto pr-2 pb-4 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600">

                                        {/* Status Banner */}
                                        {idType ? (
                                            <div className="bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-800 rounded-xl p-3 mb-2 flex items-start gap-3 shrink-0">
                                                <CheckCircle className="text-green-500 shrink-0 mt-0.5" size={18} />
                                                <div>
                                                    <p className="text-xs text-green-700 dark:text-green-400 font-bold mb-0.5">Verified: {idType}</p>
                                                    <p className="text-xs text-green-700/80 dark:text-green-400/80 font-medium">Please review and complete your personal profile.</p>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-800 rounded-xl p-3 mb-2 flex items-start gap-3 shrink-0">
                                                <Info className="text-blue-500 shrink-0 mt-0.5" size={18} />
                                                <p className="text-xs text-blue-700 dark:text-blue-400 font-medium">You skipped ID verification. Please fill in your personal details manually below.</p>
                                            </div>
                                        )}

                                        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-800 pb-2 mt-2">Full Name</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                            <div>
                                                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 pl-1">First Name</label>
                                                <input type="text" name="firstName" value={formData.firstName} onChange={handleChange} className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm rounded-xl focus:ring-2 focus:ring-orange-500 block p-3 transition-all outline-none" required />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 pl-1">Middle Name <span className="text-slate-400 font-normal">(Optional)</span></label>
                                                <input type="text" name="middleName" value={formData.middleName} onChange={handleChange} className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm rounded-xl focus:ring-2 focus:ring-orange-500 block p-3 transition-all outline-none" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 pl-1">Last Name</label>
                                                <input type="text" name="lastName" value={formData.lastName} onChange={handleChange} className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm rounded-xl focus:ring-2 focus:ring-orange-500 block p-3 transition-all outline-none" required />
                                            </div>
                                        </div>

                                        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-800 pb-2 mt-4">Demographics</h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                            <div>
                                                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 pl-1">Date of Birth</label>
                                                <div className="relative custom-datepicker-wrapper">
                                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 z-10"><Calendar size={14} /></div>
                                                    <DatePicker
                                                        selected={formData.dob}
                                                        onChange={(date) => handleChange(date)}
                                                        dateFormat="MM/dd/yyyy"
                                                        maxDate={new Date(new Date().setFullYear(new Date().getFullYear() - 18))} // Must be at least 18
                                                        showYearDropdown
                                                        showMonthDropdown
                                                        dropdownMode="select"
                                                        scrollableYearDropdown
                                                        yearDropdownItemNumber={100}
                                                        withPortal
                                                        portalId="datepicker-portal"
                                                        placeholderText="Select Date"
                                                        className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm rounded-xl focus:ring-2 focus:ring-orange-500 block pl-9 p-3 transition-all outline-none cursor-pointer"
                                                        required
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 pl-1">Age</label>
                                                <input type="number" name="age" value={formData.age} readOnly className="w-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-sm rounded-xl block p-3 outline-none cursor-not-allowed" required placeholder="Auto-calculated" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 pl-1">Sex</label>
                                                <select name="sex" value={formData.sex} onChange={handleChange} className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm rounded-xl focus:ring-2 focus:ring-orange-500 block p-3 transition-all outline-none appearance-none" required>
                                                    <option value="" disabled>Select</option>
                                                    <option value="Male">Male</option>
                                                    <option value="Female">Female</option>
                                                </select>
                                            </div>
                                        </div>

                                        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-800 pb-2 mt-4">Complete Address</h3>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                            <div className="col-span-2 md:col-span-1">
                                                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 pl-1">House No.</label>
                                                <input type="text" name="houseNo" value={formData.houseNo} onChange={handleChange} className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm rounded-xl focus:ring-2 focus:ring-orange-500 block p-3 transition-all outline-none" required />
                                            </div>
                                            <div className="col-span-2 md:col-span-1">
                                                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 pl-1">Block & Lot</label>
                                                <input type="text" name="blockLot" value={formData.blockLot} onChange={handleChange} className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm rounded-xl focus:ring-2 focus:ring-orange-500 block p-3 transition-all outline-none" />
                                            </div>
                                            <div className="col-span-2 md:col-span-2">
                                                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 pl-1">Subdivision / Village</label>
                                                <input type="text" name="subdivision" value={formData.subdivision} onChange={handleChange} className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm rounded-xl focus:ring-2 focus:ring-orange-500 block p-3 transition-all outline-none" />
                                            </div>
                                            <div className="col-span-2 md:col-span-2">
                                                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 pl-1">Street</label>
                                                <input type="text" name="street" value={formData.street} onChange={handleChange} className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm rounded-xl focus:ring-2 focus:ring-orange-500 block p-3 transition-all outline-none" required />
                                            </div>
                                            <div className="col-span-2 md:col-span-2">
                                                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 pl-1">Barangay</label>
                                                <input type="text" name="barangay" value={formData.barangay} onChange={handleChange} className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm rounded-xl focus:ring-2 focus:ring-orange-500 block p-3 transition-all outline-none" required />
                                            </div>
                                            <div className="col-span-2 md:col-span-1">
                                                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 pl-1">District</label>
                                                <input type="text" name="district" value={formData.district} onChange={handleChange} className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm rounded-xl focus:ring-2 focus:ring-orange-500 block p-3 transition-all outline-none" required />
                                            </div>
                                            <div className="col-span-2 md:col-span-1">
                                                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 pl-1">Municipality / City</label>
                                                <input type="text" name="municipality" value={formData.municipality} onChange={handleChange} className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm rounded-xl focus:ring-2 focus:ring-orange-500 block p-3 transition-all outline-none" required />
                                            </div>
                                            <div className="col-span-2 md:col-span-1">
                                                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 pl-1">Province</label>
                                                <input type="text" name="province" value={formData.province} onChange={handleChange} className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm rounded-xl focus:ring-2 focus:ring-orange-500 block p-3 transition-all outline-none" required />
                                            </div>
                                            <div className="col-span-2 md:col-span-1">
                                                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 pl-1">Postal Code</label>
                                                <input type="text" name="postalCode" value={formData.postalCode} onChange={handleChange} className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm rounded-xl focus:ring-2 focus:ring-orange-500 block p-3 transition-all outline-none" required />
                                            </div>
                                        </div>

                                        <div className="flex gap-3 mt-4 pt-4 shrink-0">
                                            <button type="button" onClick={prevStep} className="w-1/3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 p-3.5 rounded-2xl font-bold text-sm transition-all">Back</button>
                                            <button type="button" onClick={nextStep} disabled={!formData.firstName || !formData.lastName || !formData.dob || !formData.houseNo || !formData.street || !formData.barangay} className="w-2/3 bg-orange-500 hover:bg-orange-600 text-white p-3.5 rounded-2xl font-bold text-sm transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed">Next Step</button>
                                        </div>
                                    </motion.div>
                                )}

                                {/* --- STEP 3: Account Credentials --- */}
                                {step === 3 && (
                                    <motion.div key="step3" variants={stepAnim} initial="hidden" animate="visible" exit="exit" className="absolute inset-0 w-full flex flex-col gap-4">

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-2 pl-1">Email Address</label>
                                                <div className="relative">
                                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400"><Mail size={16} /></div>
                                                    <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 text-sm rounded-2xl focus:ring-2 focus:ring-orange-500 block pl-11 p-3.5 transition-all outline-none" placeholder="Enter your email" required />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-2 pl-1">{t('register.mobile')} Number</label>
                                                <div className="relative">
                                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400"><Phone size={16} /></div>
                                                    <input type="tel" name="mobile" value={formData.mobile} onChange={handleChange} className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 text-sm rounded-2xl focus:ring-2 focus:ring-orange-500 block pl-11 p-3.5 transition-all outline-none" placeholder={t('register.mobilePlaceholder')} required />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                                            <div>
                                                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-2 pl-1">{t('register.password')}</label>
                                                <div className="relative">
                                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400"><Lock size={16} /></div>
                                                    <input type="password" name="password" value={formData.password} onChange={handleChange} className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 text-sm rounded-2xl focus:ring-2 focus:ring-orange-500 block pl-11 p-3.5 transition-all outline-none" placeholder="Create password" required minLength="6" />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-2 pl-1">Confirm Password</label>
                                                <div className="relative">
                                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400"><Lock size={16} /></div>
                                                    <input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 text-sm rounded-2xl focus:ring-2 focus:ring-orange-500 block pl-11 p-3.5 transition-all outline-none" placeholder="Confirm password" required minLength="6" />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Error state for passwords not matching */}
                                        {formData.password && formData.confirmPassword && formData.password !== formData.confirmPassword && (
                                            <p className="text-red-500 text-xs font-bold px-2 mt-1 -mb-2">Passwords do not match.</p>
                                        )}

                                        <div className="flex gap-3 mt-auto pt-4">
                                            <button type="button" onClick={prevStep} className="w-1/3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 p-3.5 rounded-2xl font-bold text-sm transition-all">Back</button>
                                            <button type="button" onClick={nextStep} disabled={!formData.email || !formData.mobile || !formData.password || formData.password !== formData.confirmPassword} className="w-2/3 bg-orange-500 hover:bg-orange-600 text-white p-3.5 rounded-2xl font-bold text-sm transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed">Continue to Verification</button>
                                        </div>
                                    </motion.div>
                                )}

                                {/* --- STEP 4: Account Verification (OTP) --- */}
                                {step === 4 && (
                                    <motion.div key="step4" variants={stepAnim} initial="hidden" animate="visible" exit="exit" className="absolute inset-0 w-full flex flex-col items-center justify-center gap-4 text-center">

                                        <div className="w-16 h-16 bg-orange-100 dark:bg-orange-500/20 text-orange-500 rounded-full flex items-center justify-center mb-2 mx-auto">
                                            <ShieldCheck size={32} />
                                        </div>
                                        <h3 className="text-xl font-bold text-slate-900 dark:text-white">Verify Your Account</h3>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mb-4">
                                            We've sent a 6-digit verification code to your mobile number and email. Please enter it below to complete registration.
                                        </p>

                                        <div className="w-full max-w-xs mx-auto">
                                            <div className="relative">
                                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-orange-500"><Key size={20} /></div>
                                                <input
                                                    type="text"
                                                    name="verificationCode"
                                                    value={formData.verificationCode}
                                                    onChange={(e) => {
                                                        const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                                                        handleChange({ target: { name: 'verificationCode', value: val } });
                                                    }}
                                                    className="w-full bg-slate-50 dark:bg-slate-800/50 border-2 border-orange-200 dark:border-orange-800/50 text-slate-900 dark:text-white font-bold text-center text-2xl tracking-[0.5em] rounded-2xl focus:ring-4 focus:ring-orange-500/30 focus:border-orange-500 block p-4 transition-all outline-none"
                                                    placeholder="000000"
                                                    required
                                                    maxLength="6"
                                                />
                                            </div>
                                        </div>

                                        {/* Terms Checkbox */}
                                        <div className="flex flex-row items-center justify-center gap-2 mt-6">
                                            <input type="checkbox" id="terms" name="terms" checked={formData.terms} onChange={handleChange} className="w-4 h-4 rounded text-orange-500 focus:ring-orange-500 bg-slate-100 border-slate-300" required />
                                            <label htmlFor="terms" className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                                                I agree to the <a href="#" className="text-orange-500 hover:underline">Terms of Service</a> & <a href="#" className="text-orange-500 hover:underline">Privacy Policy</a>
                                            </label>
                                        </div>

                                        <div className="flex gap-3 mt-auto pt-8 w-full">
                                            <button type="button" onClick={prevStep} className="w-1/3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 p-3.5 rounded-2xl font-bold text-sm transition-all">Back</button>
                                            <button type="submit" disabled={formData.verificationCode.length !== 6 || !formData.terms} className="w-2/3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white p-3.5 rounded-2xl font-bold text-sm transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed">Complete Registration</button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </form>

                        <p className="text-center text-sm text-slate-600 dark:text-slate-400 font-medium mt-12 md:mt-16">
                            {t('register.haveAccount')}{' '}
                            <a href="/login" className="text-orange-600 dark:text-orange-400 font-bold hover:underline decoration-2 underline-offset-4">
                                {t('register.signIn')}
                            </a>
                        </p>
                    </motion.div>
                </div>
            </motion.div>
        </div>
    );
}
