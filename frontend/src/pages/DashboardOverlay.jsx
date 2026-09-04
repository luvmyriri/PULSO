import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Camera, MapPin, WifiOff, CheckCircle2, AlertTriangle,
    Send, Clock, Truck, HardHat, Bell, LogOut, Loader2, Brain, Search, X
} from 'lucide-react';
import Branding from '../components/Branding';
import { getAuthToken } from '../utils/authSession';

export default function DashboardOverlay({ onNavigate }) {
    const [isOffline, setIsOffline] = useState(!navigator.onLine);
    const [reports, setReports] = useState([]);
    const [drafts, setDrafts] = useState([]);

    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form State
    const [photo, setPhoto] = useState(null);
    const [photoPreview, setPhotoPreview] = useState(null);
    const [location, setLocation] = useState(null);
    const [gettingLocation, setGettingLocation] = useState(false);
    const [description, setDescription] = useState('');

    // AI Omni-Assistant State
    const [isAIChatOpen, setIsAIChatOpen] = useState(false);
    const [aiQuery, setAiQuery] = useState('');
    const [aiMessages, setAiMessages] = useState([
        { role: 'assistant', text: "Hello! I'm your PULSO Assistant. How can I help you with Caloocan city services today?" }
    ]);
    const [isAILoading, setIsAILoading] = useState(false);

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
                alert("Connectivity restored! Automatically uploaded saved offline drafts.");
            }
        };
        const handleOffline = () => setIsOffline(true);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        setDrafts(JSON.parse(localStorage.getItem('pulso_drafts') || '[]'));

        // Mock existing reports
        setReports([
            {
                id: 'rpt-8832', type: 'Water Pipe Burst', status: 'in-transit', time: '2 hours ago',
                location: '14.7571° N, 121.0425° E (Bagong Silang)',
                updates: [
                    { time: '10:30 AM', text: 'Report received by Engineering Office.' },
                    { time: '11:15 AM', text: 'Crew Dispatched: Team Alpha is on the way.', highlight: true }
                ]
            }
        ]);

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
                (position) => {
                    setLocation({
                        lat: position.coords.latitude.toFixed(4),
                        lng: position.coords.longitude.toFixed(4),
                        accuracy: position.coords.accuracy.toFixed(1)
                    });
                    setGettingLocation(false);
                },
                (error) => {
                    setLocation({ lat: '14.7571', lng: '121.0425', accuracy: 'Manual Fallback' });
                    setGettingLocation(false);
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
        } else {
            setLocation({ lat: '14.7571', lng: '121.0425', accuracy: 'Browser Not Supported' });
            setGettingLocation(false);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!photo || !location) return alert("Please snap a photo and ensure GPS is tagged.");
        setIsSubmitting(true);

        const newReport = {
            id: `rpt-${Math.floor(Math.random() * 10000)}`,
            type: description || "Infrastructure Hazard",
            status: 'pending', time: 'Just now',
            location: `${location.lat}° N, ${location.lng}° E`,
            updates: [{ time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), text: 'Report submitted successfully.' }]
        };

        setTimeout(() => {
            if (isOffline) {
                const updatedDrafts = [newReport, ...drafts];
                setDrafts(updatedDrafts);
                localStorage.setItem('pulso_drafts', JSON.stringify(updatedDrafts));
            } else {
                setReports([newReport, ...reports]);
            }
            setPhoto(null); setPhotoPreview(null); setLocation(null); setDescription(''); setIsSubmitting(false);
        }, 800);
    };

    const handleAIChat = async (e) => {
        e.preventDefault();
        if (!aiQuery.trim() || isAILoading) return;
        
        const userMsg = { role: 'user', text: aiQuery };
        setAiMessages(prev => [...prev, userMsg]);
        setAiQuery('');
        setIsAILoading(true);

        try {
            const token = getAuthToken();
            const resp = await fetch('http://localhost:33159/api/ai/assistant', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ 
                    query: aiQuery,
                    context: "Resident Dashboard. Main reporting screen."
                })
            });
            const data = await resp.json();
            setAiMessages(prev => [...prev, { role: 'assistant', text: data.response }]);
        } catch (err) {
            setAiMessages(prev => [...prev, { role: 'assistant', text: "Service temporarily unavailable." }]);
        } finally {
            setIsAILoading(false);
        }
    };

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
                            <div className="flex flex-col">
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">GPS Tagging Status</span>
                                {gettingLocation ? (
                                    <span className="text-sm font-bold text-orange-500 flex items-center gap-2"><Loader2 size={16} className="animate-spin" /> Acquiring Satellites...</span>
                                ) : location ? (
                                    <span className="text-sm font-bold text-green-700 flex items-center gap-1.5"><CheckCircle2 size={18} /> {location.lat}°, {location.lng}° Verified</span>
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
                                        <p className="text-xs font-semibold text-slate-500 mt-1 flex items-center gap-1.5"><MapPin size={14} /> {report.location}</p>
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
            {/* AI Assistant Floating Interface */}
            <div className="fixed bottom-24 right-6 z-[60] flex flex-col items-end gap-3 sm:bottom-24 sm:right-8">
                <AnimatePresence>
                    {isAIChatOpen && (
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="w-[calc(100vw-32px)] sm:w-[350px] h-[450px] bg-white shadow-2xl rounded-3xl border border-slate-100 overflow-hidden flex flex-col mb-4"
                        >
                            <div className="p-4 bg-gradient-to-r from-orange-500 to-orange-400 text-white flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    <Brain size={20} />
                                    <span className="font-bold text-sm">PULSEAI</span>
                                </div>
                                <button onClick={() => setIsAIChatOpen(false)}><X size={18} /></button>
                            </div>
                            
                            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                {aiMessages.map((msg, i) => (
                                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[85%] p-3 rounded-2xl text-[11px] font-semibold leading-relaxed ${
                                            msg.role === 'user' ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-700'
                                        }`}>
                                            {msg.text}
                                        </div>
                                    </div>
                                ))}
                                {isAILoading && (
                                    <div className="flex justify-center p-2">
                                        <Loader2 className="animate-spin text-orange-500" size={16} />
                                    </div>
                                )}
                            </div>

                            <form onSubmit={handleAIChat} className="p-3 border-t border-slate-100 flex gap-2 bg-slate-50">
                                <input 
                                    type="text" 
                                    value={aiQuery}
                                    onChange={(e) => setAiQuery(e.target.value)}
                                    placeholder="Ask about Caloocan services..."
                                    className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-medium outline-none focus:ring-1 focus:ring-orange-500"
                                />
                                <button type="submit" className="p-2 bg-orange-500 text-white rounded-xl shadow-sm hover:bg-orange-600 transition-colors">
                                    <Search size={16} />
                                </button>
                            </form>
                        </motion.div>
                    )}
                </AnimatePresence>

                <button 
                    onClick={() => setIsAIChatOpen(!isAIChatOpen)}
                    className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-orange-500 shadow-xl flex items-center justify-center text-white hover:bg-orange-600 transition-all hover:scale-110 active:scale-95 group"
                >
                    <Brain size={28} className="group-hover:animate-pulse" />
                </button>
            </div>
        </motion.div>
    );
}
