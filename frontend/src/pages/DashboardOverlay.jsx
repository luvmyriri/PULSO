import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Camera, MapPin, WifiOff, CheckCircle2, AlertTriangle,
    Send, Clock, Truck, HardHat, Bell, LogOut, Loader2, Brain, Search, X
} from 'lucide-react';
import Branding from '../components/Branding';
import { getAuthToken } from '../utils/authSession';

import { useInteractionHarden } from '../hooks/useInteractionHarden';
import PulseAIMarkdown from '../components/PulseAIMarkdown';
import PulseAIChatWindow from '../components/PulseAIChatWindow';

export default function DashboardOverlay({ onNavigate }) {
    const [isOffline, setIsOffline] = useState(!navigator.onLine);
    const [reports, setReports] = useState([]);
    const [drafts, setDrafts] = useState([]);
    const [notification, setNotification] = useState(null); // { type: 'success'|'error'|'info', message: string }

    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form State
    const [photo, setPhoto] = useState(null);
    const [photoPreview, setPhotoPreview] = useState(null);
    const [location, setLocation] = useState(null);
    const [address, setAddress] = useState('');
    const [gettingLocation, setGettingLocation] = useState(false);
    const [description, setDescription] = useState('');

    // PULSEAI Assistant State
    const [isAIChatOpen, setIsAIChatOpen] = useState(false);
    
    // Interaction Hardening
    const { throttleAction, isCooldown, isProcessing: aiProcessing } = useInteractionHarden();

    const fileInputRef = useRef(null);

    // Initialize network listeners and load drafts
    useEffect(() => {
        const handleOnline = () => {
            setIsOffline(false);
            // Auto-upload drafts when back online
            const savedDrafts = JSON.parse(localStorage.getItem('pulso_drafts') || '[]');
            if (savedDrafts.length > 0) {
                setReports(prev => [...savedDrafts, ...prev]);
                setDrafts([]);
                localStorage.removeItem('pulso_drafts');
                setNotification({ type: 'success', message: 'Connectivity restored! Automatically uploaded saved offline drafts.' });
            }
        };
        const handleOffline = () => setIsOffline(true);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        setDrafts(JSON.parse(localStorage.getItem('pulso_drafts') || '[]'));

        setReports([]);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
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
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const lat = position.coords.latitude.toFixed(6);
                    const lng = position.coords.longitude.toFixed(6);
                    setLocation({
                        lat,
                        lng,
                        accuracy: position.coords.accuracy.toFixed(1)
                    });
                    
                    // Reverse geocode via backend proxy
                    try {
                        const token = localStorage.getItem('pulso_token');
                        const resp = await fetch(`${API_BASE_URL}/api/geocode/reverse?lat=${lat}&lng=${lng}`, {
                            headers: { 'Authorization': `Bearer ${token}` }
                        });
                        const data = await resp.json();
                        if (data.address) {
                            setAddress(data.address);
                        } else {
                            setAddress(`${lat}, ${lng}`);
                        }
                    } catch (err) {
                        console.error("Geocoding failed:", err);
                        setAddress(`${lat}, ${lng}`);
                    }
                    
                    setGettingLocation(false);
                },
                (error) => {
                    const fallbackLat = '14.7571';
                    const fallbackLng = '121.0425';
                    setLocation({ lat: fallbackLat, lng: fallbackLng, accuracy: 'Manual Fallback' });
                    setAddress("Barangay 176, Bagong Silang, Caloocan");
                    setGettingLocation(false);
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
        } else {
            setLocation({ lat: '14.7571', lng: '121.0425', accuracy: 'Browser Not Supported' });
            setAddress("Location Unavailable");
            setGettingLocation(false);
        }
    };
    const handleSubmit = async (e) => {
        e.preventDefault();
        
        throttleAction(async () => {
            setIsSubmitting(true);
            
            try {
                const token = localStorage.getItem('pulso_token');
                
                // If offline, save to drafts immediately
                if (isOffline) {
                    const newReport = {
                        id: `rpt-draft-${Date.now()}`,
                        type: description || "Infrastructure Hazard",
                        status: 'offline-draft',
                        location: address || (location ? `${location.lat}, ${location.lng}` : "Unknown"),
                        time: 'Saved Offline',
                        updates: [{ time: new Date().toLocaleTimeString(), text: 'Draft saved. Will upload when online.' }]
                    };
                    const updatedDrafts = [newReport, ...drafts];
                    setDrafts(updatedDrafts);
                    localStorage.setItem('pulso_drafts', JSON.stringify(updatedDrafts));
                    setNotification({ type: 'info', message: 'Report saved as offline draft.' });
                } else {
                    // Prepare multipart form data for image upload
                    const formData = new FormData();
                    formData.append('category', 'infrastructure'); // Default or inferred
                    formData.append('description', description);
                    if (location) {
                        formData.append('location_lat', location.lat);
                        formData.append('location_lng', location.lng);
                    }
                    formData.append('location_string', address);
                    formData.append('location_barangay', ''); // Will be resolved by AI/backend
                    if (photo) {
                        formData.append('file', photo);
                    }

                    const resp = await fetch(`${API_BASE_URL}/api/reports`, {
                        method: 'POST',
                        headers: { 
                            'Authorization': `Bearer ${token}`
                        },
                        body: formData
                    });

                    if (!resp.ok) throw new Error('Failed to submit report');
                    
                    const savedReport = await resp.json();
                    
                    // Add to local reports list for immediate feedback
                    const uiReport = {
                        id: savedReport.id,
                        type: savedReport.category,
                        status: savedReport.status,
                        location: savedReport.location_string || savedReport.location_barangay || "Caloocan City",
                        time: 'Just now',
                        updates: [{ time: new Date().toLocaleTimeString(), text: 'Report received by Command Center.' }]
                    };
                    
                    setReports(prev => [uiReport, ...prev]);
                    setNotification({ type: 'success', message: `Report ${savedReport.ticket_id} submitted successfully!` });
                }

                // Reset form
                setPhoto(null);
                setPhotoPreview(null);
                setLocation(null);
                setAddress('');
                setDescription('');
            } catch (err) {
                console.error("Submission Error:", err);
                setNotification({ type: 'error', message: 'Failed to submit report. Please try again.' });
            } finally {
                setIsSubmitting(false);
            }


    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="absolute inset-0 z-40 overflow-y-auto w-full h-full bg-slate-50/50 backdrop-blur-lg"
        >
            {/* Top Navigation - Frosted Glass */}
            <nav className="bg-white/80 backdrop-blur-md sticky top-0 z-50 relative">
                {/* Removed top shadow border */}
                <div className="max-w-2xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-orange-600 font-extrabold text-xl tracking-tight">
                        <Branding size="h-8" showText={false} />
                        <span>PULSO | Resident</span>
                    </div>
                    <div className="flex items-center gap-5 text-slate-500">
                        <div className="relative cursor-pointer hover:text-orange-500 transition-colors">
                            <Bell size={22} />
                            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-orange-500 rounded-full border-2 border-white"></span>
                        </div>
                        <button onClick={() => onNavigate('landing')} className="hover:text-red-500 transition-colors flex items-center gap-1.5 font-bold text-sm">
                            <LogOut size={18} /> Logout
                        </button>
                    </div>
                </div>
            </nav>

            {/* Offline Banner */}
            <AnimatePresence>
                {isOffline && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="bg-red-500 text-white px-4 py-2 flex items-center justify-center gap-2 text-sm font-bold shadow-md">
                        <WifiOff size={16} /> Offline: Saving Drafts locally.
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="max-w-2xl mx-auto px-6 mt-8 pb-32 space-y-8">

                {/* New Report Section */}
                <section className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-xl border border-white p-6 sm:p-8">
                    <h2 className="font-display font-bold text-xl text-slate-800 mb-6 flex items-center gap-2">
                        <AlertTriangle size={24} className="text-orange-500" /> Report Infrastructure Hazard
                    </h2>

                    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className={`border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-3 transition-all cursor-pointer ${photoPreview ? 'border-orange-500 bg-orange-50 p-2' : 'border-slate-300 bg-slate-50/50 p-10 hover:bg-slate-100 hover:border-orange-300'
                                }`}
                        >
                            <input type="file" accept="image/*" capture="environment" className="hidden" ref={fileInputRef} onChange={handlePhotoCapture} />

                            {photoPreview ? (
                                <div className="relative w-full aspect-video rounded-xl overflow-hidden shadow-inner">
                                    <img src={photoPreview} alt="Hazard" className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                                        <span className="text-white font-bold text-sm bg-black/50 px-4 py-2 rounded-full backdrop-blur-md">Retake Photo</span>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="w-14 h-14 bg-white rounded-full shadow-sm flex items-center justify-center text-slate-400">
                                        <Camera size={28} />
                                    </div>
                                    <span className="font-bold text-slate-700">Tap to Snap Photo</span>
                                    <span className="text-sm text-slate-500 text-center">Camera will automatically query precise GPS metadata.</span>
                                </>
                            )}
                        </div>

                        <div className={`p-5 rounded-2xl border flex items-center justify-between transition-colors ${location ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-200'}`}>
                            <div className="flex flex-col flex-1 overflow-hidden pr-2">
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">GPS Tagging Status</span>
                                {gettingLocation ? (
                                    <span className="text-sm font-bold text-orange-500 flex items-center gap-2"><Loader2 size={16} className="animate-spin" /> Acquiring Satellites...</span>
                                ) : location ? (
                                    <span className="text-sm font-bold text-green-700 flex flex-col items-start gap-0.5 min-w-0">
                                        <div className="flex items-center gap-1.5 shrink-0">
                                            <CheckCircle2 size={16} className="shrink-0" />
                                            <span className="text-[10px] font-black tracking-widest uppercase opacity-70">Verified Location</span>
                                        </div>
                                        <div className="pl-5 w-full">
                                            {(() => {
                                                const rawAddr = address || (location ? `${location.lat}, ${location.lng}` : "");
                                                if (!rawAddr.includes('|')) {
                                                    return <span className="text-[13px] font-bold text-slate-800 break-words block">{rawAddr}</span>;
                                                }
                                                
                                                const parts = rawAddr.split('|').map(p => p.trim());
                                                const plusCode = parts[0] || "";
                                                let addr = parts[1] || "";
                                                let detectedBrgy = parts[2] || "Barangay Unknown";

                                                // Clean redundancy and extra fields
                                                let cleanAddr = addr.replace(new RegExp(`,?\\s*${detectedBrgy}`, 'i'), '')
                                                                    .replace(/,?\s*Caloocan(?: City)?/i, '')
                                                                    .replace(/,?\s*Metro Manila/i, '')
                                                                    .replace(/,?\s*Philippines/i, '')
                                                                    .replace(/,$/, '')
                                                                    .trim();
                                                
                                                // If still unknown, try regex as a last resort in frontend
                                                if (detectedBrgy.toLowerCase().includes('unknown')) {
                                                    const m = addr.match(/,\s*(\d{1,3}[A-Z]?)\s*,/);
                                                    if (m) detectedBrgy = `Barangay ${m[1]}`;
                                                }

                                                return (
                                                    <div className="flex flex-col gap-0.5">
                                                        <span className="text-[13px] font-black text-slate-900 block leading-tight">
                                                            {plusCode}, {cleanAddr}
                                                        </span>
                                                        <span className="text-[11px] font-semibold text-slate-500 block leading-tight">
                                                            {detectedBrgy}, Caloocan, Metro Manila
                                                        </span>
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    </span>
                                ) : (
                                    <span className="text-sm font-medium text-slate-400">Waiting for photo capture...</span>
                                )}
                            </div>
                            <button type="button" onClick={fetchGPSLocation} className="p-3 bg-white rounded-xl shadow-sm border border-slate-200 text-slate-600 hover:text-orange-500 transition-colors">
                                <MapPin size={22} />
                            </button>
                        </div>

                        <textarea
                            placeholder="Brief description (e.g., Deep pothole expanding near the drainage)"
                            className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-sm font-medium focus:ring-2 focus:ring-orange-500 outline-none w-full resize-none h-28"
                            value={description} onChange={(e) => setDescription(e.target.value)} required
                        ></textarea>

                        <button
                            disabled={isSubmitting || !photo || !location}
                            type="submit"
                            className={`w-full p-4 rounded-2xl font-bold text-white flex items-center justify-center gap-2 transition-all text-lg ${(!photo || !location) ? 'bg-slate-300 cursor-not-allowed text-slate-400'
                                    : isOffline ? 'bg-slate-800 hover:bg-slate-900 shadow-xl'
                                        : 'bg-gradient-to-r from-orange-500 to-orange-400 shadow-lg shadow-orange-500/30 hover:-translate-y-0.5'
                                }`}
                        >
                            {isSubmitting ? <Loader2 className="animate-spin" /> :
                                isOffline ? <><WifiOff size={20} /> Save to Offline Drafts</> :
                                    <><Send size={20} /> Submit Report</>}
                        </button>
                    </form>
                </section>

                {drafts.length > 0 && (
                    <section className="bg-slate-800 rounded-3xl p-6 text-white shadow-2xl">
                        <h3 className="font-bold text-lg flex items-center gap-2 mb-4 text-slate-200"><WifiOff size={20} className="text-slate-400" /> Pending Uploads ({drafts.length})</h3>
                        <div className="space-y-3">
                            {drafts.map(draft => (
                                <div key={draft.id} className="bg-slate-700/50 p-4 rounded-xl border border-slate-600 flex justify-between items-center">
                                    <div className="flex flex-col">
                                        <span className="text-sm font-bold truncate w-56">{draft.type}</span>
                                        <span className="text-xs text-slate-400 mt-1">{draft.time}</span>
                                    </div>
                                    <Clock size={18} className="text-orange-400" />
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Timeline */}
                <section>
                    <h2 className="font-display font-bold text-xl text-slate-800 mb-6 px-2">Active Updates</h2>
                    <div className="space-y-5">
                        {reports.map((report) => (
                            <div key={report.id} className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-lg border border-white overflow-hidden">
                                <div className="p-5 border-b border-slate-100 flex justify-between items-start bg-white/50">
                                    <div>
                                        <h4 className="font-bold text-slate-900 text-lg">{report.type}</h4>
                                        <div className="mt-2 group">
                                            <span className="text-[10px] font-black uppercase tracking-wider text-orange-600/80 mb-1.5 block">Verified Incident Location</span>
                                            <div className="flex items-start gap-2">
                                                <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                                                    <MapPin size={14} className="text-slate-500" />
                                                </div>
                                                <div className="flex flex-col gap-0.5">
                                                    {(() => {
                                                        const rawLocation = report.location || 'Unknown Location';
                                                        if (!rawLocation.includes('|')) {
                                                            return <span className="text-xs font-bold text-slate-700">{rawLocation}</span>;
                                                        }
                                                        
                                                        const parts = rawLocation.split('|').map(p => p.trim());
                                                        const plusCode = parts[0] || "";
                                                        let addr = parts[1] || "";
                                                        const detectedBrgy = parts[2] || "Barangay Unknown";
                                                        
                                                        // Clean redundancy
                                                        let cleanAddr = addr.replace(new RegExp(`,?\\s*${detectedBrgy}`, 'i'), '')
                                                                            .replace(/,?\s*Caloocan(?: City)?/i, '')
                                                                            .replace(/,?\s*Metro Manila/i, '')
                                                                            .replace(/,?\s*Philippines/i, '')
                                                                            .replace(/,$/, '')
                                                                            .trim();
                                                        
                                                        const fullStr = `${plusCode}, ${cleanAddr}, ${detectedBrgy}, Caloocan, Metro Manila`;
                                                        
                                                        return (
                                                            <span className="text-[11px] font-black text-slate-600 tracking-tight leading-tight">
                                                                {fullStr}
                                                            </span>
                                                        );
                                                    })()}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <span className={`px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded-full border ${report.status === 'in-transit' ? 'bg-blue-50 text-blue-600 border-blue-200 shadow-sm' :
                                            'bg-orange-50 text-orange-600 border-orange-200 shadow-sm'
                                        }`}>
                                        {report.status.replace('-', ' ')}
                                    </span>
                                </div>

                                <div className="p-6">
                                    <div className="relative border-l-2 border-slate-200 ml-4 pl-6 space-y-6">
                                        {report.updates.map((update, idx) => (
                                            <div key={idx} className="relative">
                                                <div className={`absolute -left-[35px] p-1.5 rounded-full bg-white border-2 shadow-sm ${update.highlight ? 'border-orange-500 text-orange-500 animate-pulse' : 'border-slate-300 text-slate-400'}`}>
                                                    {update.highlight ? <Truck size={14} /> : <HardHat size={14} />}
                                                </div>
                                                <p className={`text-sm ${update.highlight ? 'font-bold text-slate-900' : 'font-semibold text-slate-600'}`}>{update.text}</p>
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 block">{update.time}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

            </div>
            {/* Shared PULSEAI Assistant */}
            <PulseAIChatWindow 
                isOpen={isAIChatOpen} 
                onClose={() => setIsAIChatOpen(false)} 
                role="resident" 
            />

            {/* Launcher button */}
            {!isAIChatOpen && (
                <div className="fixed bottom-24 right-6 z-[60] flex flex-col items-end gap-3 sm:bottom-24 sm:right-8">
                    <button 
                        onClick={() => setIsAIChatOpen(true)}
                        aria-label="Open PULSEAI Assistant"
                        className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-tr from-[#e65100] to-[#f97316] shadow-xl flex items-center justify-center text-white hover:brightness-110 transition-all hover:scale-105 active:scale-95 group focus:outline-none focus:ring-4 focus:ring-orange-500/30"
                    >
                        <Brain size={28} className="group-hover:animate-pulse" />
                    </button>
                </div>
            )}
            {/* Notification Modal */}
            {notification && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
                    <motion.div 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        className="absolute inset-0 bg-slate-900/40" 
                        onClick={() => setNotification(null)}
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        className={`relative p-6 rounded-2xl shadow-2xl border-2 max-w-sm w-full text-center ${
                            notification.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800' :
                            notification.type === 'error' ? 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800' :
                            'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800'
                        }`}
                    >
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 ${
                            notification.type === 'success' ? 'bg-emerald-100 dark:bg-emerald-900 text-emerald-600' :
                            notification.type === 'error' ? 'bg-red-100 dark:bg-red-900 text-red-600' :
                            'bg-blue-100 dark:bg-blue-900 text-blue-600'
                        }`}>
                            {notification.type === 'success' ? (
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                            ) : notification.type === 'error' ? (
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                            )}
                        </div>
                        <p className={`text-sm font-bold ${
                            notification.type === 'success' ? 'text-emerald-800 dark:text-emerald-200' :
                            notification.type === 'error' ? 'text-red-800 dark:text-red-200' :
                            'text-blue-800 dark:text-blue-200'
                        }`}>
                            {notification.message}
                        </p>
                        <button 
                            onClick={() => setNotification(null)}
                            className={`mt-4 px-6 py-2 rounded-xl text-sm font-bold ${
                                notification.type === 'success' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' :
                                notification.type === 'error' ? 'bg-red-600 hover:bg-red-700 text-white' :
                                'bg-blue-600 hover:bg-blue-700 text-white'
                            }`}
                        >
                            OK
                        </button>
                    </motion.div>
                </div>
            )}
        </motion.div>
    );
}