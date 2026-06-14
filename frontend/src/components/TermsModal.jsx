import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShieldCheck, FileText, Lock, Scale, Info, BrainCircuit, Landmark, Gavel, Eye } from 'lucide-react';

const TermsModal = ({ isOpen, onClose, type = 'terms' }) => {
    if (!isOpen) return null;

    const contentMap = {
        terms: {
            title: 'Terms of Service',
            subtitle: 'Legal Governance & User Agreement v4.2',
            icon: <Scale className="text-orange-500" size={24} />,
            sections: [
                {
                    title: '1. Regulatory Acceptance',
                    text: 'By interacting with the PULSO Infrastructure Network (PIN), you formally acknowledge and agree to abide by the digital governance framework established by the Caloocan City Engineering Office. These terms constitute a legally binding agreement between the resident and the Local Government Unit (LGU).'
                },
                {
                    title: '2. Identity Verification Protocols',
                    text: 'Access to high-priority reporting modules is strictly gated by mandatory Know Your Citizen (KYC) protocols. Users must provide valid government-issued identification (e.g., UMID, Driver\'s License, Passport). Our AI systems perform biometric matching to ensure the integrity of the citizen network.'
                },
                {
                    title: '3. Strategic Reporting Integrity',
                    text: 'Reports submitted via the portal must adhere to strict veracity standards. Submitting fraudulent hazard data, spoofing GPS coordinates, or attempting to manipulate the AI triage priority score is a violation of city ordinance and may lead to prosecution under the Cybercrime Prevention Act.'
                },
                {
                    title: '4. Geospatial Data Sovereignty',
                    text: 'All geospatial data, infrastructure health analytics, and AI-predicted maintenance schedules generated through resident participation remain the sovereign intellectual property of the City Government of Caloocan.'
                },
                {
                    title: '5. Liability & Operational Scope',
                    text: 'While the LGU aims for rapid dispatch, report submission does not guarantee immediate repair. Response times are governed by the AI-calculated Priority Index, resource availability, and the current Infrastructure Strategic Plan.'
                }
            ]
        },
        privacy: {
            title: 'Privacy Policy',
            subtitle: 'Digital Sovereignty & Data Protection',
            icon: <ShieldCheck className="text-orange-500" size={24} />,
            sections: [
                {
                    title: '1. Data Collection & Purpose',
                    text: 'PULSO collects precise geolocation data, high-resolution imagery, and personal identifiers solely for the purpose of infrastructure maintenance, disaster risk reduction, and city engineering optimization. We do not monetize citizen data.'
                },
                {
                    title: '2. Gemini AI Processing Disclosure',
                    text: 'Citizen-submitted media is analyzed by our integrated Gemini Pro Vision models. This automated processing is used to detect hazard types, estimate structural damage severity, and filter non-relevant content without human intervention in the initial triage phase.'
                },
                {
                    title: '3. Sovereign Security Standards',
                    text: 'We employ multi-layer security architecture, including AES-256 encryption for data at rest, end-to-end TLS 1.3 encryption for transmissions, and air-gapped backups for critical infrastructure databases to protect against cyber threats.'
                },
                {
                    title: '4. Data Privacy Act Compliance',
                    text: 'In strict accordance with Republic Act No. 10173 (Data Privacy Act of 2012), users maintain full rights to their data. You may request a complete data export or the permanent erasure of your profile and history via the Security Portal at any time.'
                },
                {
                    title: '5. Third-Party Limitations',
                    text: 'Anonymized engineering data may be shared with verified utility partners (e.g., Maynilad, Meralco) only when a reported hazard falls under their jurisdiction for repair. No personal identifiers are shared in this process.'
                }
            ]
        },
        cookies: {
            title: 'Cookie Management',
            subtitle: 'Session Optimization & Telemetry',
            icon: <BrainCircuit className="text-orange-500" size={24} />,
            sections: [
                {
                    title: '1. Essential Infrastructure Cookies',
                    text: 'These technical cookies are mandatory for site security and session persistence. They manage authentication tokens, CSRF protection, and load balancing across our city servers.'
                },
                {
                    title: '2. Preference & Customization',
                    text: 'These cookies allow the portal to remember your preferred language (English/Tagalog), UI theme (Light/Dark/System), and accessibility settings across different sessions.'
                },
                {
                    title: '3. Analytics & Network Performance',
                    text: 'We utilize anonymized telemetry to monitor the performance of our geospatial map tiles and AI processing latency. This data helps us optimize the portal for low-bandwidth environments.'
                },
                {
                    title: '4. AI Context Persistence',
                    text: 'To improve reporting speed, cookies may store local context about your frequently reported barangays, allowing the AI engine to provide faster location verification.'
                },
                {
                    title: '5. Unified Consent Management',
                    text: 'By clicking "Acknowledge Protocols," you consent to our use of essential cookies. You can fine-tune your preferences for non-essential cookies via your secure Dashboard settings.'
                }
            ]
        }
    };

    const content = contentMap[type] || contentMap.terms;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-hidden">
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl"
            />
            
            <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 30 }}
                className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-[0_32px_128px_-16px_rgba(0,0,0,0.8)] overflow-hidden border border-slate-200 dark:border-white/10"
            >
                {/* Header Section */}
                <div className="relative p-10 border-b border-slate-100 dark:border-white/5 bg-slate-50/80 dark:bg-white/[0.02] backdrop-blur-md">
                    <div className="flex items-center gap-6">
                        <div className="w-16 h-16 rounded-[1.5rem] bg-orange-500 text-white flex items-center justify-center shadow-lg shadow-orange-500/20">
                            {content.icon}
                        </div>
                        <div>
                            <h2 className="text-3xl font-black text-slate-900 dark:text-white leading-tight tracking-tighter">
                                {content.title}
                            </h2>
                            <p className="text-[10px] font-black text-orange-500 uppercase tracking-[0.3em] mt-1">{content.subtitle}</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="absolute top-10 right-10 p-3 hover:bg-slate-200 dark:hover:bg-white/10 rounded-2xl transition-all text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Content Section */}
                <div className="p-10 md:p-12 max-h-[55vh] overflow-y-auto custom-scrollbar bg-white dark:bg-slate-900">
                    <div className="space-y-12">
                        {content.sections.map((section, idx) => (
                            <div key={idx} className="group flex gap-8">
                                <div className="flex flex-col items-center">
                                    <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center text-xs font-black text-slate-500 group-hover:bg-orange-600 group-hover:text-white group-hover:border-orange-600 transition-all duration-500 shadow-sm">
                                        {String(idx + 1).padStart(2, '0')}
                                    </div>
                                    <div className="flex-grow w-px bg-slate-200 dark:bg-white/10 mt-4 h-full" />
                                </div>
                                <div className="space-y-3 pb-4">
                                    <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-[0.15em] flex items-center gap-3">
                                        {section.title}
                                        <div className="h-px w-8 bg-orange-500/30 rounded-full" />
                                    </h3>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                                        {section.text}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-16 p-8 bg-orange-500/5 dark:bg-orange-500/[0.03] rounded-[2rem] border border-orange-500/20 flex gap-6 items-start relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                            <Landmark size={80} className="text-orange-500" />
                        </div>
                        <div className="p-3 bg-orange-500 text-white rounded-xl shrink-0 shadow-lg shadow-orange-500/30">
                            <Gavel size={20} />
                        </div>
                        <div className="space-y-2 relative z-10">
                            <p className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest">Digital Governance Notice</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                                Version 4.2.1 • Revision Date: April 2026. These formal protocols are managed by the Caloocan Local Government Unit and the Bureau of Infrastructure Security to ensure complete compliance with the Data Privacy Act and the Cybercrime Prevention Act.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Footer Section */}
                <div className="p-10 bg-slate-50/80 dark:bg-white/[0.02] border-t border-slate-100 dark:border-white/5 flex flex-col sm:flex-row justify-between items-center gap-6 backdrop-blur-md">
                    <div className="flex items-center gap-3 opacity-50">
                        <BrainCircuit size={16} className="text-slate-500" />
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em]">
                            PULSO Digital Network Infrastructure
                        </p>
                    </div>
                    <button 
                        onClick={onClose}
                        className="w-full sm:w-auto px-12 py-5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all transform hover:scale-[1.05] active:scale-[0.95] shadow-2xl shadow-slate-900/40 dark:shadow-white/20 flex items-center justify-center gap-3"
                    >
                        <ShieldCheck size={18} />
                        Acknowledge Protocols
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

export default TermsModal;

