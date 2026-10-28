import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, FileText, X, Check, Lock, Scale } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function LegalModal({ isOpen, onClose, initialTab = 'privacy', onAccept }) {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState(initialTab);

    // Sync initial tab when modal opens
    React.useEffect(() => {
        if (isOpen) {
            setActiveTab(initialTab);
        }
    }, [isOpen, initialTab]);

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
                {/* Backdrop Blur */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="fixed inset-0 bg-slate-950/70 backdrop-blur-md transition-opacity cursor-pointer"
                />

                {/* Modal Container */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    className="relative w-full max-w-3xl bg-white dark:bg-[#0b0f19] border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden z-10 my-auto flex flex-col max-h-[85vh] text-slate-900 dark:text-white"
                >
                    {/* Header */}
                    <div className="p-6 sm:p-8 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-orange-500/10 text-[#ff6b00] border border-orange-500/20 flex items-center justify-center shrink-0">
                                {activeTab === 'privacy' ? <ShieldCheck size={24} /> : <FileText size={24} />}
                            </div>
                            <div>
                                <h3 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                                    {activeTab === 'privacy' ? 'Privacy Policy' : 'Terms of Service'}
                                </h3>
                                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                                    {activeTab === 'privacy'
                                        ? 'Resident information and Google sign-in'
                                        : 'Resident User Agreement & Reporting Guidelines'}
                                </p>
                            </div>
                        </div>

                        {/* Close Button */}
                        <button
                            onClick={onClose}
                            className="p-2.5 rounded-full hover:bg-slate-200/60 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors shrink-0 self-end sm:self-auto cursor-pointer"
                            aria-label="Close Modal"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Tab Selector */}
                    <div className="px-6 sm:px-8 pt-4 pb-2 border-b border-slate-100 dark:border-slate-800/80 bg-white dark:bg-[#0b0f19] flex gap-2 shrink-0">
                        <button
                            onClick={() => setActiveTab('privacy')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                activeTab === 'privacy'
                                    ? 'bg-[#ff6b00] text-white shadow-md shadow-[#ff6b00]/20'
                                    : 'bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
                            }`}
                        >
                            <ShieldCheck size={14} /> Privacy Policy
                        </button>
                        <button
                            onClick={() => setActiveTab('terms')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                activeTab === 'terms'
                                    ? 'bg-[#ff6b00] text-white shadow-md shadow-[#ff6b00]/20'
                                    : 'bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
                            }`}
                        >
                            <FileText size={14} /> Terms of Service
                        </button>
                    </div>

                    {/* Content Section */}
                    <div className="p-6 sm:p-8 overflow-y-auto space-y-6 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed custom-scrollbar flex-1">
                        {activeTab === 'privacy' ? (
                            <>
                                {/* Glassmorphism Callout Banner - Neutral & Frosted */}
                                <div className="bg-white/60 dark:bg-slate-900/50 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 shadow-xs rounded-2xl p-3.5 flex gap-3 items-start text-xs text-slate-600 dark:text-slate-300 font-medium">
                                    <div className="w-6 h-6 rounded-lg bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0 mt-0.5">
                                        <Lock size={14} />
                                    </div>
                                    <div className="leading-relaxed">
                                        <span className="font-bold text-slate-900 dark:text-white mr-1">Republic Act No. 10173 (Data Privacy Act of 2012):</span>
                                        <span>This notice explains how the current PULSO service handles resident information. You can ask project support about access, correction, or deletion.</span>
                                    </div>
                                </div>

                                <section>
                                    <h4 className="font-black text-sm uppercase tracking-wider text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-[#ff6b00]" /> 1. Information Collection &amp; Purpose
                                    </h4>
                                    <p className="pl-4 border-l-2 border-slate-200 dark:border-slate-800">
                                        PULSO may collect the information you provide when registering, verifying an account, or reporting an issue. This can include your name, contact and address details, identification images, report descriptions, photographs, and location details. Google Sign-In supplies your name, email, and Google account identifier to connect an existing verified resident account.
                                    </p>
                                </section>

                                <section>
                                    <h4 className="font-black text-sm uppercase tracking-wider text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-[#ff6b00]" /> 2. Access and retention
                                    </h4>
                                    <p className="pl-4 border-l-2 border-slate-200 dark:border-slate-800">
                                        The site uses HTTPS and limits staff access by account permissions. Authorized personnel may see information needed for their assigned work. PULSO does not sell resident information to advertisers. A fixed retention or deletion schedule for resident and report records has not yet been published.
                                    </p>
                                </section>

                                <section>
                                    <h4 className="font-black text-sm uppercase tracking-wider text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-[#ff6b00]" /> 3. Automated AI Processing Disclosure
                                    </h4>
                                    <p className="pl-4 border-l-2 border-slate-200 dark:border-slate-800">
                                        Identity images or report evidence may be processed by configured OCR and AI providers when you use those features. Their results support review but do not establish a final identity, location, or engineering decision by themselves. Google also provides sign-in, maps, and CAPTCHA functions; relevant data may be sent when you use them.
                                    </p>
                                </section>

                                <section>
                                    <h4 className="font-black text-sm uppercase tracking-wider text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-[#ff6b00]" /> 4. Resident Data Rights
                                    </h4>
                                    <p className="pl-4 border-l-2 border-slate-200 dark:border-slate-800">
                                        To ask about your information or request access, correction, or deletion, contact PULSO project support at <a href="mailto:gene.tabios13@gmail.com" className="underline">gene.tabios13@gmail.com</a>. Requests are reviewed against applicable law and records duties. Read the full <a href="/privacy.html" className="underline">English and Filipino privacy policy</a>.
                                    </p>
                                </section>
                            </>
                        ) : (
                            <>
                                {/* Glassmorphism Callout Banner - Neutral & Frosted */}
                                <div className="bg-white/60 dark:bg-slate-900/50 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 shadow-xs rounded-2xl p-3.5 flex gap-3 items-start text-xs text-slate-600 dark:text-slate-300 font-medium">
                                    <div className="w-6 h-6 rounded-lg bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0 mt-0.5">
                                        <Scale size={14} />
                                    </div>
                                    <div className="leading-relaxed">
                                        <span className="font-bold text-slate-900 dark:text-white mr-1">Resident User Agreement:</span>
                                        <span>By accessing PULSO, you agree to submit truthful utility hazard reports to assist the City Engineering Department.</span>
                                    </div>
                                </div>

                                <section>
                                    <h4 className="font-black text-sm uppercase tracking-wider text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-[#ff6b00]" /> 1. Truthful &amp; Honest Incident Reporting
                                    </h4>
                                    <p className="pl-4 border-l-2 border-slate-200 dark:border-slate-800">
                                        Residents are expected to submit accurate reports regarding water leaks, power issues, road damage, and drainage blockages. Submitting false, fabricated, or malicious reports will result in Integrity Level reduction and potential account suspension.
                                    </p>
                                </section>

                                <section>
                                    <h4 className="font-black text-sm uppercase tracking-wider text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-[#ff6b00]" /> 2. Community Conduct &amp; Interaction
                                    </h4>
                                    <p className="pl-4 border-l-2 border-slate-200 dark:border-slate-800">
                                        Users must maintain respectful communication when interacting with dispatchers, field engineers, or emergency personnel. Obscene content, harassment, or abusive uploads are strictly prohibited.
                                    </p>
                                </section>

                                <section>
                                    <h4 className="font-black text-sm uppercase tracking-wider text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-[#ff6b00]" /> 3. Geographic Jurisdiction
                                    </h4>
                                    <p className="pl-4 border-l-2 border-slate-200 dark:border-slate-800">
                                        PULSO infrastructure incident reporting applies exclusively to public utility assets within the territorial jurisdiction of Caloocan City.
                                    </p>
                                </section>

                                <section>
                                    <h4 className="font-black text-sm uppercase tracking-wider text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-[#ff6b00]" /> 4. Service Availability &amp; Maintenance
                                    </h4>
                                    <p className="pl-4 border-l-2 border-slate-200 dark:border-slate-800">
                                        While PULSO strives for 24/7 real-time system availability, emergency maintenance or system upgrades may temporarily affect access. Critical municipal emergencies should also be called via standard emergency hotlines.
                                    </p>
                                </section>
                            </>
                        )}
                    </div>

                    {/* Footer Action */}
                    <div className="p-4 sm:p-6 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50 flex justify-between items-center shrink-0">
                        <div className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest hidden sm:block">
                            LGU Caloocan City • PULSO Legal Terms
                        </div>
                        <button
                            onClick={() => {
                                if (onAccept) onAccept();
                                onClose();
                            }}
                            className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-[#ff6b00] to-[#ff8533] hover:from-[#e65c00] hover:to-[#ff6b00] text-white font-bold text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-[#ff6b00]/25 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                        >
                            <Check size={16} /> I Understand &amp; Accept
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
