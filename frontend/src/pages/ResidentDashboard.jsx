import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Camera, MapPin, WifiOff, CheckCircle2, AlertTriangle,
    Send, Clock, Truck, HardHat, Bell, LogOut, Loader2,
    LayoutDashboard, User, Search, TrendingUp, ShieldCheck, Map,
    Menu, X, Home, FileText, Settings, HelpCircle,
    Sun, Moon, Monitor, Shield
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { PulsoLogo } from './Landing';
import { useTranslation } from 'react-i18next';

export default function ResidentDashboard() {
    const { t } = useTranslation();
    const { theme, changeTheme } = useTheme();
    const [isOffline, setIsOffline] = useState(!navigator.onLine);
    const [reports, setReports] = useState([]);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('overview');

    // Form State for Quick Report
    const [photo, setPhoto] = useState(null);
    const [photoPreview, setPhotoPreview] = useState(null);
    const [location, setLocation] = useState(null);
    const [gettingLocation, setGettingLocation] = useState(false);
    const [description, setDescription] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const fileInputRef = useRef(null);

    // Hardcoded User Data
    const user = {
        name: 'Gener',
        barangay: 'Bagong Silang (176)',
        memberSince: 'Oct 2023',
        trustScore: 98
    };

    // Hardcoded initial reports
    useEffect(() => {
        const handleOffline = () => setIsOffline(true);
        const handleOnline = () => setIsOffline(false);
        window.addEventListener('offline', handleOffline);
        window.addEventListener('online', handleOnline);

        setReports([
            {
                id: 'RPT-8291',
                type: t('dashboard.mock.r1Type'),
                status: 'in-transit',
                time: '20 mins ago',
                location: 'Zone 15, Near Covered Court',
                desc: t('dashboard.mock.r1Desc'),
                updates: [
                    { time: '08:15 AM', text: t('dashboard.mock.r1u1'), highlight: false },
                    { time: '08:30 AM', text: t('dashboard.mock.r1u2'), highlight: true }
                ]
            },
            {
                id: 'RPT-8285',
                type: t('dashboard.mock.r2Type'),
                status: 'under-review',
                time: '2 hours ago',
                location: 'Phase 4, Block 22',
                desc: t('dashboard.mock.r2Desc'),
                updates: [
                    { time: '06:00 AM', text: t('dashboard.mock.r2u1'), highlight: false }
                ]
            },
            {
                id: 'RPT-8240',
                type: t('dashboard.mock.r3Type'),
                status: 'resolved',
                time: 'Yesterday',
                location: 'Phase 1, Main Avenue',
                desc: t('dashboard.mock.r3Desc'),
                updates: [
                    { time: 'Yesterday 10:00 AM', text: t('dashboard.mock.r3u1'), highlight: false },
                    { time: 'Yesterday 04:30 PM', text: t('dashboard.mock.r3u2'), highlight: true }
                ]
            }
        ]);

        return () => {
            window.removeEventListener('offline', handleOffline);
            window.removeEventListener('online', handleOnline);
        };
    }, []);

    const handlePhotoCapture = (e) => {
        const file = e.target.files[0];
        if (file) {
            setPhoto(file);
            const reader = new FileReader();
            reader.onloadend = () => setPhotoPreview(reader.result);
            reader.readAsDataURL(file);
            fetchGPSLocation();
        }
    };

    const fetchGPSLocation = () => {
        setGettingLocation(true);
        setTimeout(() => {
            setLocation({ lat: '14.7571', lng: '121.0425', accuracy: 'High' });
            setGettingLocation(false);
        }, 1200);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!photo || !location || !description) return;

        setIsSubmitting(true);
        const newReport = {
            id: `RPT-${Math.floor(Math.random() * 10000)}`,
            type: description.split(' ')[0] + ' Issue', // Mock title from desc
            status: 'pending',
            time: 'Just now',
            location: 'Current GPS Location',
            desc: description,
            updates: [{ time: 'Now', text: t('dashboard.mock.newReportText'), highlight: true }]
        };

        setTimeout(() => {
            setReports([newReport, ...reports]);
            setPhoto(null); setPhotoPreview(null); setLocation(null); setDescription('');
            setIsSubmitting(false);
            alert(t('dashboard.mock.alertSuccess'));
        }, 1000);
    };

    // Staggered animation variants
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
    };
    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'in-transit': return 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/20';
            case 'resolved': return 'bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 border-green-200 dark:border-green-500/20';
            case 'pending': return 'bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-500/20';
            default: return 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700';
        }
    };

    const navItems = [
        { id: 'overview', icon: <Home size={20} />, label: t('dashboard.sidebar.overview') },
        { id: 'reports', icon: <FileText size={20} />, label: t('dashboard.sidebar.reports'), badge: reports.length },
        { id: 'profile', icon: <User size={20} />, label: t('dashboard.sidebar.profile') },
        { id: 'settings', icon: <Settings size={20} />, label: t('dashboard.sidebar.settings') },
        { id: 'help', icon: <HelpCircle size={20} />, label: t('dashboard.sidebar.help') },
    ];

    const renderOverview = () => (
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="max-w-7xl mx-auto grid grid-cols-1 xl:grid-cols-12 gap-6 lg:gap-8 pb-32">
            <div className="xl:col-span-8 flex flex-col gap-6 lg:gap-8">
                <motion.div variants={itemVariants} className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 dark:border-slate-800 relative overflow-hidden transition-colors">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 dark:bg-orange-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
                    <h2 className="text-2xl sm:text-3xl font-display font-bold text-slate-900 dark:text-white mb-2 z-10 relative">
                        {t('dashboard.overview.greeting', { name: user.name })}
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 font-medium z-10 relative mb-8 max-w-xl">
                        {t('dashboard.overview.greetingSubtitle', { barangay: user.barangay })}
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 z-10 relative">
                        <div className="bg-slate-50 dark:bg-slate-950 rounded-2xl p-4 border border-slate-200 dark:border-slate-800">
                            <div className="flex items-center gap-2 mb-2">
                                <AlertTriangle size={16} className="text-orange-500" />
                                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{t('dashboard.overview.active')}</span>
                            </div>
                            <div className="text-3xl font-bold font-display text-slate-900 dark:text-white">3</div>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-950 rounded-2xl p-4 border border-slate-200 dark:border-slate-800">
                            <div className="flex items-center gap-2 mb-2">
                                <CheckCircle2 size={16} className="text-green-500" />
                                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{t('dashboard.overview.resolved')}</span>
                            </div>
                            <div className="text-3xl font-bold font-display text-slate-900 dark:text-white">12</div>
                        </div>
                        <div className="col-span-2 bg-gradient-to-r from-orange-500 to-orange-400 rounded-2xl p-4 text-white shadow-lg shadow-orange-500/20 flex flex-col justify-between">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-orange-100 uppercase tracking-widest flex items-center gap-1.5"><ShieldCheck size={16} /> {t('dashboard.overview.trustScore')}</span>
                                <TrendingUp size={16} className="text-orange-100" />
                            </div>
                            <div className="flex items-end gap-2">
                                <div className="text-4xl font-bold font-display">{user.trustScore}</div>
                                <div className="text-sm font-medium text-orange-100 mb-1">{t('dashboard.overview.topReporters')}</div>
                            </div>
                        </div>
                    </div>
                </motion.div>

                <motion.div variants={itemVariants} className="flex flex-col gap-4">
                    <div className="flex items-center justify-between px-1">
                        <h3 className="text-lg font-bold font-display flex items-center gap-2">
                            <LayoutDashboard size={20} className="text-slate-400" /> {t('dashboard.overview.recentActivity')}
                        </h3>
                        <button onClick={() => setActiveTab('reports')} className="text-sm font-bold text-orange-500 hover:text-orange-600 transition-colors">{t('dashboard.overview.viewAll')}</button>
                    </div>

                    <div className="space-y-4">
                        {reports.slice(0, 2).map((report) => (
                            <div key={report.id} className="bg-white dark:bg-slate-900 rounded-2xl p-5 sm:p-6 shadow-sm border border-slate-200 dark:border-slate-800 transition-colors group">
                                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 font-mono">{report.id}</span>
                                            <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest rounded-full border ${getStatusColor(report.status)}`}>
                                                {report.status.replace('-', ' ')}
                                            </span>
                                            <span className="text-xs font-medium text-slate-400 flex items-center gap-1 ml-auto sm:ml-0"><Clock size={12} /> {report.time}</span>
                                        </div>
                                        <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-1 group-hover:text-orange-500 transition-colors">{report.type}</h4>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-3 line-clamp-2">{report.desc}</p>
                                        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                                            <MapPin size={14} className="text-slate-400" /> {report.location}
                                        </div>
                                    </div>
                                    <div className="w-full sm:w-64 bg-slate-50 dark:bg-slate-950 rounded-xl p-4 border border-slate-100 dark:border-slate-800 shrink-0">
                                        <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-200 dark:border-slate-800 pb-2">{t('dashboard.overview.latestUpdate')}</h5>
                                        <div className="relative border-l-2 border-slate-200 dark:border-slate-700 ml-2 pl-4">
                                            {report.updates.slice(-1).map((update, idx) => (
                                                <div key={idx} className="relative">
                                                    <div className={`absolute -left-[21px] p-0.5 rounded-full bg-slate-50 dark:bg-slate-950 outline outline-4 outline-slate-50 dark:outline-slate-950 pt-0.5 ${update.highlight ? 'text-orange-500' : 'text-slate-400'}`}>
                                                        <div className={`w-2 h-2 rounded-full ${update.highlight ? 'bg-orange-500 animate-pulse' : 'bg-slate-300 dark:bg-slate-600'}`}></div>
                                                    </div>
                                                    <p className={`text-xs ${update.highlight ? 'font-bold text-slate-800 dark:text-slate-200' : 'font-medium text-slate-500 dark:text-slate-400'}`}>{update.text}</p>
                                                    <span className="text-[10px] font-bold text-slate-400 mt-1 block">{update.time}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.div>
            </div>

            <div className="xl:col-span-4 flex flex-col gap-6 lg:gap-8">
                <motion.div variants={itemVariants} className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-200 dark:border-slate-800 sticky top-6 transition-colors">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-500/10 flex items-center justify-center text-orange-600 dark:text-orange-500">
                            <Camera size={20} />
                        </div>
                        <div>
                            <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white">{t('dashboard.quickReport.title')}</h3>
                            <p className="text-xs font-medium text-slate-500">{t('dashboard.quickReport.desc')}</p>
                        </div>
                    </div>
                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                        <div onClick={() => !photoPreview && fileInputRef.current?.click()} className={`relative flex items-center justify-center border-2 border-dashed rounded-2xl overflow-hidden transition-all cursor-pointer ${photoPreview ? 'aspect-video border-orange-500' : 'h-32 border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                            <input type="file" accept="image/*" capture="environment" className="hidden" ref={fileInputRef} onChange={handlePhotoCapture} />
                            {photoPreview ? (
                                <>
                                    <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                                        <button type="button" onClick={(e) => { e.stopPropagation(); setPhotoPreview(null); setPhoto(null); setLocation(null); }} className="text-xs font-bold text-white bg-red-500 hover:bg-red-600 px-4 py-2 rounded-full shadow-lg">{t('dashboard.quickReport.remove')}</button>
                                    </div>
                                </>
                            ) : (
                                <div className="flex flex-col items-center gap-2 text-slate-400">
                                    <Camera size={24} />
                                    <span className="text-sm font-semibold">{t('dashboard.quickReport.tapCamera')}</span>
                                </div>
                            )}
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${location ? 'bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-500' : gettingLocation ? 'bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-500' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                                {gettingLocation ? <Loader2 size={14} className="animate-spin" /> : <MapPin size={14} />}
                            </div>
                            <div className="flex flex-col flex-1">
                                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{location ? t('dashboard.quickReport.coordsTagged') : gettingLocation ? t('dashboard.quickReport.acquiringGPS') : t('dashboard.quickReport.gpsStandby')}</span>
                                <span className="text-[10px] text-slate-500 font-mono">{location ? `${location.lat}°, ${location.lng}°` : t('dashboard.quickReport.requirePhoto')}</span>
                            </div>
                        </div>
                        <textarea className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-orange-500 outline-none w-full resize-none h-24 placeholder-slate-400 dark:placeholder-slate-500 transition-colors" placeholder={t('dashboard.quickReport.placeholder')} value={description} onChange={(e) => setDescription(e.target.value)} required />
                        <button disabled={isSubmitting || !photo || !location || !description} type="submit" className={`w-full p-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all ${(!photo || !location || !description) ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed' : 'bg-gradient-to-r from-orange-500 to-orange-400 text-white shadow-lg shadow-orange-500/30 hover:-translate-y-0.5'}`}>
                            {isSubmitting ? <Loader2 className="animate-spin" /> : <><Send size={18} /> {t('dashboard.quickReport.submit')}</>}
                        </button>
                    </form>
                </motion.div>
                <motion.div variants={itemVariants} className="bg-slate-900 rounded-3xl p-1 shadow-xl overflow-hidden relative group hidden xl:block h-64 border border-slate-800 shrink-0">
                    <div className="absolute inset-0 grid grid-cols-6 grid-rows-6 opacity-20 pointer-events-none">
                        {[...Array(36)].map((_, i) => <div key={i} className="border-[0.5px] border-slate-500"></div>)}
                    </div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
                        <div className="w-12 h-12 bg-orange-500/20 rounded-full animate-ping absolute"></div>
                        <div className="w-8 h-8 bg-orange-500 rounded-full border-2 border-white flex items-center justify-center z-10 shadow-lg">
                            <MapPin size={16} className="text-white" />
                        </div>
                    </div>
                    <div className="absolute bottom-4 left-4 right-4 bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/10 flex items-center gap-3">
                        <Map className="text-orange-400" size={20} />
                        <div>
                            <h4 className="text-white text-sm font-bold">{t('dashboard.quickReport.zoneCoverage')}</h4>
                            <p className="text-slate-300 text-xs">{t('dashboard.quickReport.gpsAccuracy')} <span className="text-green-400 font-mono">±4 meters</span></p>
                        </div>
                    </div>
                </motion.div>
            </div>
        </motion.div>
    );

    const renderReports = () => (
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="max-w-4xl mx-auto space-y-6 pb-32">
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-sm border border-slate-200 dark:border-slate-800">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                    <div>
                        <h2 className="text-2xl font-bold font-display text-slate-900 dark:text-white">{t('dashboard.reports.history')}</h2>
                        <p className="text-slate-500 text-sm">{t('dashboard.reports.historyDesc')}</p>
                    </div>
                    <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950 p-1.5 rounded-xl border border-slate-200 dark:border-slate-800">
                        <button className="px-4 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg shadow-sm text-sm font-bold">{t('dashboard.reports.all')}</button>
                        <button className="px-4 py-2 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-lg text-sm font-bold transition-colors">{t('dashboard.reports.pending')}</button>
                        <button className="px-4 py-2 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-lg text-sm font-bold transition-colors">{t('dashboard.reports.resolved')}</button>
                    </div>
                </div>

                <div className="space-y-4">
                    {reports.map((report) => (
                        <div key={report.id} className="bg-slate-50 dark:bg-slate-950 rounded-2xl p-5 border border-slate-200 dark:border-slate-800">
                            <div className="flex flex-col sm:flex-row justify-between gap-4 mb-4">
                                <div>
                                    <div className="flex items-center gap-3 mb-1">
                                        <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest rounded-full border ${getStatusColor(report.status)}`}>
                                            {report.status.replace('-', ' ')}
                                        </span>
                                        <span className="text-xs font-bold text-slate-400 font-mono">{report.id}</span>
                                    </div>
                                    <h4 className="text-lg font-bold text-slate-900 dark:text-white">{report.type}</h4>
                                    <p className="text-sm text-slate-500 line-clamp-1">{report.desc}</p>
                                </div>
                                <div className="text-left sm:text-right">
                                    <span className="text-xs font-medium text-slate-400 block mb-1">{report.time}</span>
                                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1 sm:justify-end">
                                        <MapPin size={12} /> {report.location}
                                    </span>
                                </div>
                            </div>
                            <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800">
                                <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-100 dark:border-slate-800 pb-2">{t('dashboard.reports.allUpdates')}</h5>
                                <div className="space-y-4 relative before:absolute before:inset-0 before:ml-2 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 dark:before:via-slate-800 before:to-transparent">
                                    {report.updates.map((update, idx) => (
                                        <div key={idx} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                            <div className={`flex items-center justify-center w-5 h-5 rounded-full border-2 ${update.highlight ? 'border-orange-500 bg-orange-50' : 'border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900'} shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow flex-shrink-0 z-10`} />
                                            <div className="w-[calc(100%-2rem)] md:w-[calc(50%-1.5rem)] p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className={`text-xs font-bold ${update.highlight ? 'text-orange-500' : 'text-slate-700 dark:text-slate-300'}`}>{update.time}</span>
                                                </div>
                                                <p className="text-xs text-slate-500 dark:text-slate-400">{update.text}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </motion.div>
    );

    const renderProfile = () => (
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="max-w-3xl mx-auto space-y-6 pb-32">
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-sm border border-slate-200 dark:border-slate-800 text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-br from-orange-400 to-orange-600 z-0"></div>
                <div className="relative z-10 mt-12 flex flex-col items-center">
                    <div className="w-32 h-32 rounded-full bg-white dark:bg-slate-900 p-2 shadow-xl mb-4">
                        <div className="w-full h-full rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-4xl font-bold text-orange-500">
                            {user.name.charAt(0)}
                        </div>
                    </div>
                    <h2 className="text-3xl font-display font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        {user.name} <CheckCircle2 size={24} className="text-blue-500" />
                    </h2>
                    <span className="inline-block mt-2 px-3 py-1 bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400 rounded-full text-xs font-bold uppercase tracking-widest border border-green-200 dark:border-green-500/20">
                        {t('dashboard.profile.verified')}
                    </span>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-sm border border-slate-200 dark:border-slate-800">
                <h3 className="text-lg font-bold font-display mb-6 border-b border-slate-200 dark:border-slate-800 pb-4">{t('dashboard.profile.personalInfo')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">{t('dashboard.profile.regName')}</label>
                        <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-medium">{user.name}</div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">{t('dashboard.profile.accountId')}</label>
                        <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 font-mono">USR-841-A2</div>
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">{t('dashboard.profile.regAddress')}</label>
                        <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-medium">{user.barangay}</div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">{t('dashboard.profile.memberSince')}</label>
                        <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-medium">{user.memberSince}</div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">{t('dashboard.overview.trustScore')}</label>
                        <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-xl border border-orange-200 dark:border-orange-800 font-bold text-orange-600 dark:text-orange-400 flex items-center justify-between">
                            {user.trustScore} / 100 <TrendingUp size={16} />
                        </div>
                    </div>
                </div>
                <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800 flex justify-end">
                    <button className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-6 py-2.5 rounded-xl font-bold text-sm shadow-md hover:shadow-lg transition-all">{t('dashboard.profile.update')}</button>
                </div>
            </div>
        </motion.div>
    );

    const renderSettings = () => (
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="max-w-3xl mx-auto space-y-6 pb-32">
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-sm border border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-3 mb-8">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                        <Bell size={20} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold font-display text-slate-900 dark:text-white">{t('dashboard.settings.alerts')}</h2>
                        <p className="text-slate-500 text-sm">{t('dashboard.settings.alertsDesc')}</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800">
                        <div>
                            <h4 className="font-bold text-slate-900 dark:text-white text-sm">{t('dashboard.settings.push')}</h4>
                            <p className="text-slate-500 text-xs">{t('dashboard.settings.pushDesc')}</p>
                        </div>
                        <div className="w-12 h-6 bg-orange-500 rounded-full relative cursor-pointer shadow-inner">
                            <div className="w-4 h-4 bg-white rounded-full absolute right-1 top-1 shadow-sm"></div>
                        </div>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800">
                        <div>
                            <h4 className="font-bold text-slate-900 dark:text-white text-sm">{t('dashboard.settings.sms')}</h4>
                            <p className="text-slate-500 text-xs">{t('dashboard.settings.smsDesc')}</p>
                        </div>
                        <div className="w-12 h-6 bg-orange-500 rounded-full relative cursor-pointer shadow-inner">
                            <div className="w-4 h-4 bg-white rounded-full absolute right-1 top-1 shadow-sm"></div>
                        </div>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800">
                        <div>
                            <h4 className="font-bold text-slate-900 dark:text-white text-sm">{t('dashboard.settings.email')}</h4>
                            <p className="text-slate-500 text-xs">{t('dashboard.settings.emailDesc')}</p>
                        </div>
                        <div className="w-12 h-6 bg-slate-300 dark:bg-slate-700 rounded-full relative cursor-pointer shadow-inner">
                            <div className="w-4 h-4 bg-white rounded-full absolute left-1 top-1 shadow-sm"></div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-sm border border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-3 mb-8">
                    <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
                        <Shield size={20} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold font-display text-slate-900 dark:text-white">{t('dashboard.settings.privacy')}</h2>
                        <p className="text-slate-500 text-sm">{t('dashboard.settings.privacyDesc')}</p>
                    </div>
                </div>
                <div className="space-y-3">
                    <button className="w-full text-left p-4 bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-800 font-bold text-sm transition-colors text-slate-700 dark:text-slate-300">{t('dashboard.settings.pw')}</button>
                    <button className="w-full text-left p-4 bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-800 font-bold text-sm transition-colors text-slate-700 dark:text-slate-300">{t('dashboard.settings.loginActivity')}</button>
                    <button className="w-full text-left p-4 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 rounded-2xl border border-red-200 dark:border-red-500/20 font-bold text-sm transition-colors text-red-600 dark:text-red-400 mt-4">{t('dashboard.settings.delete')}</button>
                </div>
            </div>
        </motion.div>
    );

    const renderHelp = () => (
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="max-w-4xl mx-auto space-y-6 pb-32">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col items-center text-center">
                    <div className="w-16 h-16 bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mb-4">
                        <HelpCircle size={32} />
                    </div>
                    <h3 className="text-xl font-bold font-display text-slate-900 dark:text-white mb-2">{t('dashboard.help.assist')}</h3>
                    <p className="text-sm text-slate-500 mb-6">{t('dashboard.help.assistDesc')}</p>
                    <button className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-3 rounded-xl font-bold text-sm shadow-md hover:shadow-lg transition-all mt-auto">{t('dashboard.help.contact')}</button>
                </div>

                <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-3xl p-8 shadow-lg shadow-red-500/20 text-white flex flex-col justify-center">
                    <h3 className="text-2xl font-bold font-display mb-2 flex items-center gap-2"><AlertTriangle /> {t('dashboard.help.hotlines')}</h3>
                    <p className="text-red-100 text-sm mb-6">{t('dashboard.help.hotlinesDesc')}</p>
                    <ul className="space-y-3">
                        <li className="flex items-center justify-between p-3 bg-black/20 rounded-xl">
                            <span className="font-bold">{t('dashboard.help.cityEng')}</span>
                            <span className="font-mono bg-white text-red-600 px-3 py-1 rounded text-sm font-bold">888-1234</span>
                        </li>
                        <li className="flex items-center justify-between p-3 bg-black/20 rounded-xl">
                            <span className="font-bold">{t('dashboard.help.maynilad')}</span>
                            <span className="font-mono bg-white text-red-600 px-3 py-1 rounded text-sm font-bold">1626</span>
                        </li>
                        <li className="flex items-center justify-between p-3 bg-black/20 rounded-xl">
                            <span className="font-bold">{t('dashboard.help.meralco')}</span>
                            <span className="font-mono bg-white text-red-600 px-3 py-1 rounded text-sm font-bold">16211</span>
                        </li>
                    </ul>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-sm border border-slate-200 dark:border-slate-800">
                <h3 className="text-xl font-bold font-display mb-6 border-b border-slate-200 dark:border-slate-800 pb-4 text-slate-900 dark:text-white">{t('dashboard.help.faq')}</h3>
                <div className="space-y-4">
                    {[
                        { q: t('dashboard.help.q1'), a: t('dashboard.help.a1') },
                        { q: t('dashboard.help.q2'), a: t('dashboard.help.a2') },
                        { q: t('dashboard.help.q3'), a: t('dashboard.help.a3') }
                    ].map((faq, i) => (
                        <div key={i} className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800">
                            <h4 className="font-bold text-slate-900 dark:text-white mb-2">{faq.q}</h4>
                            <p className="text-sm text-slate-500 leading-relaxed">{faq.a}</p>
                        </div>
                    ))}
                </div>
            </div>
        </motion.div>
    );

    const SidebarContent = () => (
        <div className="flex flex-col h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 w-64 lg:w-72 shadow-xl shadow-slate-200/20 dark:shadow-none transition-colors">
            <a href="/dashboard" className="p-6 flex items-center gap-2 sm:gap-3 shrink-0 group hover:opacity-90 transition-opacity">
                <div className="w-8 h-8 sm:w-10 sm:h-10 min-w-[32px] min-h-[32px] sm:min-w-[40px] sm:min-h-[40px] shrink-0 flex items-center justify-center">
                    <PulsoLogo className="w-full h-full shrink-0 group-hover:scale-110 transition-transform" />
                </div>
                <span className="font-extrabold text-xl sm:text-2xl tracking-tight text-orange-500 shrink-0">PULSO</span>
            </a>
            <div className="px-6 mb-8">
                <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-[10px] font-bold text-slate-500 dark:text-slate-400 tracking-widest uppercase">{t('dashboard.sidebar.portal')}</span>
            </div>

            <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
                {navItems.map(item => (
                    <button
                        key={item.id}
                        onClick={() => { setActiveTab(item.id); setIsMobileMenuOpen(false); }}
                        className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl font-semibold transition-all ${activeTab === item.id
                            ? 'bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-500 shadow-sm shadow-orange-500/10'
                            : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 focus:outline-none'
                            }`}
                    >
                        <div className="flex items-center gap-3">
                            {item.icon}
                            <span>{item.label}</span>
                        </div>
                        {item.badge && (
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${activeTab === item.id
                                ? 'bg-orange-500 text-white'
                                : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                                }`}>
                                {item.badge}
                            </span>
                        )}
                    </button>
                ))}
            </nav>

            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex flex-col gap-4">
                {/* Mobile/Sidebar Theme Switcher */}
                <div className="md:hidden flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1 border border-slate-200 dark:border-slate-700 w-full shrink-0">
                    <button onClick={() => changeTheme('light')} className={`flex-1 flex justify-center p-2 rounded-md transition-all ${theme === 'light' ? 'bg-white dark:bg-slate-600 shadow-sm text-orange-500' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}><Sun size={16} /></button>
                    <button onClick={() => changeTheme('system')} className={`flex-1 flex justify-center p-2 rounded-md transition-all ${theme === 'system' ? 'bg-white dark:bg-slate-600 shadow-sm text-orange-500' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}><Monitor size={16} /></button>
                    <button onClick={() => changeTheme('dark')} className={`flex-1 flex justify-center p-2 rounded-md transition-all ${theme === 'dark' ? 'bg-white dark:bg-slate-600 shadow-sm text-orange-500' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}><Moon size={16} /></button>
                </div>

                <a href="/login" className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-slate-500 hover:text-red-500 hover:bg-red-50 dark:text-slate-400 dark:hover:bg-red-500/10 transition-colors focus:outline-none shrink-0">
                    <LogOut size={20} />
                    <span>{t('dashboard.sidebar.signOut')}</span>
                </a>
            </div>
        </div>
    );

    return (
        <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 transition-colors">

            {/* Desktop Sidebar */}
            <aside className="hidden lg:block z-20 shrink-0">
                <SidebarContent />
            </aside>

            {/* Mobile Sidebar Overlay */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden"
                        />
                        <motion.aside
                            initial={{ x: '-100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '-100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="fixed inset-y-0 left-0 z-50 lg:hidden shrink-0"
                        >
                            <SidebarContent />
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col h-screen overflow-hidden relative">

                {/* Top Navigation */}
                <nav className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 shrink-0 z-10 transition-colors">
                    <div className="px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">

                        {/* Mobile Menu Toggle & Brand */}
                        <div className="flex items-center gap-2 sm:gap-3 lg:hidden shrink-0">
                            <button
                                onClick={() => setIsMobileMenuOpen(true)}
                                className="p-2 text-slate-500 hover:text-orange-500 transition-colors bg-slate-100 dark:bg-slate-800 rounded-lg focus:outline-none shrink-0"
                            >
                                <Menu size={20} />
                            </button>
                            <a href="/dashboard" className="flex items-center gap-1 sm:gap-2 shrink-0 group hover:opacity-90 transition-opacity">
                                <div className="w-8 h-8 sm:w-9 sm:h-9 min-w-[32px] min-h-[32px] sm:min-w-[36px] sm:min-h-[36px] shrink-0 flex items-center justify-center">
                                    <PulsoLogo className="w-full h-full shrink-0 group-hover:scale-110 transition-transform" />
                                </div>
                                <span className="font-extrabold text-lg sm:text-xl tracking-tight text-orange-500 shrink-0">PULSO</span>
                            </a>
                        </div>

                        {/* Desktop Screen Title */}
                        <div className="hidden lg:flex items-center">
                            <h1 className="font-display font-bold text-xl text-slate-800 dark:text-white capitalize">
                                {activeTab.replace('-', ' ')}
                            </h1>
                        </div>

                        {/* Right Top Nav Actions */}
                        <div className="flex items-center gap-4 sm:gap-6 ml-auto">
                            <div className="hidden sm:flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-4 py-1.5 rounded-full border border-slate-200 dark:border-slate-700">
                                <Search size={16} className="text-slate-400" />
                                <input type="text" placeholder="Search..." className="bg-transparent border-none text-sm outline-none w-32 focus:w-48 transition-all dark:text-white placeholder-slate-400 dark:placeholder-slate-500" />
                            </div>

                            {/* Theme Switcher Toggle */}
                            <div className="hidden md:flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1 border border-slate-200 dark:border-slate-700 shrink-0">
                                <button onClick={() => changeTheme('light')} className={`p-1.5 rounded-md transition-all ${theme === 'light' ? 'bg-white dark:bg-slate-600 shadow-sm text-orange-500' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}><Sun size={14} /></button>
                                <button onClick={() => changeTheme('system')} className={`p-1.5 rounded-md transition-all ${theme === 'system' ? 'bg-white dark:bg-slate-600 shadow-sm text-orange-500' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}><Monitor size={14} /></button>
                                <button onClick={() => changeTheme('dark')} className={`p-1.5 rounded-md transition-all ${theme === 'dark' ? 'bg-white dark:bg-slate-600 shadow-sm text-orange-500' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}><Moon size={14} /></button>
                            </div>

                            <div className="relative cursor-pointer group shrink-0">
                                <Bell size={22} className="text-slate-500 dark:text-slate-400 group-hover:text-orange-500 transition-colors" />
                                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-slate-900"></span>
                            </div>

                            <div className="h-8 w-px bg-slate-200 dark:bg-slate-800 mx-1 hidden sm:block"></div>

                            <div className="flex items-center gap-3 cursor-pointer group">
                                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold shadow-md group-hover:shadow-orange-500/30 transition-all border-2 border-white dark:border-slate-800">
                                    {user.name.charAt(0)}
                                </div>
                                <div className="hidden md:flex flex-col">
                                    <span className="text-sm font-bold leading-tight">{user.name}</span>
                                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest">{user.barangay.substring(0, 13)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </nav>

                {/* Offline Banner */}
                <AnimatePresence>
                    {isOffline && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="bg-red-500 text-white px-4 py-2 flex items-center justify-center gap-2 text-sm font-bold shadow-md z-20 shrink-0"
                        >
                            <WifiOff size={16} /> {t('dashboard.offline')}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Scrollable Dashboard Content */}
                <main className="flex-1 overflow-y-auto w-full p-4 sm:p-6 lg:p-8">
                    {activeTab === 'overview' && renderOverview()}
                    {activeTab === 'reports' && renderReports()}
                    {activeTab === 'profile' && renderProfile()}
                    {activeTab === 'settings' && renderSettings()}
                    {activeTab === 'help' && renderHelp()}
                </main>
            </div>
        </div>
    );
}
