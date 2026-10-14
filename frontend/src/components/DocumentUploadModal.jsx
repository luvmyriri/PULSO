import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadCloud, File, FileText, CheckCircle, X, Loader2, ShieldCheck, AlertCircle } from '../icons';

import { API_BASE_URL } from '../utils/apiBase';
const getToken = () => localStorage.getItem('pulso_token');

/** Convert raw FastAPI validation errors into a single readable reminder string */
function parseUploadError(raw) {
    try {
        const json = JSON.parse(raw);
        if (json?.detail && Array.isArray(json.detail)) {
            // FastAPI validation errors — pull out human-readable field names
            const missing = json.detail
                .filter(e => e.type === 'missing' || e.msg?.toLowerCase().includes('required'))
                .map(e => {
                    const field = e.loc?.[e.loc.length - 1] || 'unknown field';
                    const label = { target_model: 'Document Target Type', target_id: 'Linked Record ID', document_type: 'Document Type', file: 'File' }[field] || field;
                    return label;
                });
            if (missing.length) {
                return `Please ensure the following required fields are present before uploading: ${missing.join(', ')}.`;
            }
            // Generic FastAPI detail string
            if (typeof json.detail === 'string') return json.detail;
        }
        if (json?.detail) return String(json.detail);
    } catch (_) { /* not JSON */ }
    return raw || 'Upload failed. Please try again.';
}

export default function DocumentUploadModal({ targetModel, targetId, onClose, onUploadComplete }) {
    const [file, setFile] = useState(null);
    const [docType, setDocType] = useState('survey_report');
    const [isDragging, setIsDragging] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [result, setResult] = useState(null); // { success: true/false, message: string, hash: string }
    const fileInputRef = useRef(null);

    const docTypes = [
        { value: 'survey_report', label: 'Survey Report' },
        { value: 'topo_map', label: 'Topographical Map' },
        { value: 'geotechnical_test', label: 'Geotechnical Test Report' },
        { value: 'prelim_survey', label: 'Preliminary Survey' },
        { value: 'design_plans', label: 'Design Plans (CAD/PDF)' },
        { value: 'detailed_estimate', label: 'Detailed Estimate' },
        { value: 's_curve', label: 'S-Curve Chart' },
        { value: 'abc', label: 'Approved Budget for Contract (ABC)' },
        { value: 'pow', label: 'Program of Works (POW)' },
        { value: 'itb', label: 'Invitation to Bid (ITB)' },
        { value: 'bac_resolution', label: 'BAC Resolution' },
        { value: 'contract', label: 'Contract Agreement' },
        { value: 'ntp', label: 'Notice to Proceed (NTP)' },
        { value: 'perf_bond', label: 'Performance Bond' },
        { value: 'car_insurance', label: 'CAR/CAS Insurance' },
        { value: 'job_order', label: 'Job Order' },
        { value: 'quotations_3', label: '3 Quotations (Fast Track)' },
        { value: 'final_photo', label: 'Final Completion Photo' },
        { value: 'completion_report', label: 'Completion Report' },
        { value: 'materials_test', label: 'Materials Test Results' },
        { value: 'as_built_plan', label: 'As-Built Plan' },
        { value: 'coa_inspection', label: 'COA Inspection Report' },
        { value: 'emergency_memo', label: 'Emergency Memorandum' },
        { value: 'fund_certification', label: 'Fund Certification' },
        { value: 'direct_negotiation_record', label: 'Direct Negotiation Record' },
        { value: 'emergency_pow', label: 'Emergency POW' },
    ];

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setResult(null);
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            setFile(e.dataTransfer.files[0]);
            setResult(null);
        }
    };

    const handleUpload = async () => {
        if (!file) {
            alert("Please select a file first");
            return;
        }
        setUploading(true);
        setResult(null);

        const formData = new FormData();
        formData.append('file', file);
        formData.append('document_type', docType);
        formData.append('target_model', targetModel);
        formData.append('target_id', String(targetId));
        if (docType === 'materials_test') {
            formData.append('metadata_json', JSON.stringify({ compression_strength_pass: true }));
        }

        console.log("Uploading to:", `${API_BASE_URL}/api/gov/documents/upload`);
        console.log("Target:", targetModel, targetId, docType);
        console.log("Token exists:", !!getToken());

        try {
            const res = await fetch(`${API_BASE_URL}/api/gov/documents/upload`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${getToken()}`
                },
                body: formData
            });
            
            console.log("Response status:", res.status);
            console.log("Response OK:", res.ok);
            console.log("Response status text:", res.statusText);
            
            if (!res.ok) {
                const text = await res.text();
                console.log("Error response text:", text);
                throw new Error(parseUploadError(text));
            }

            const data = await res.json();
            setResult({ success: true, message: 'Document secured and registered in the centralized repository.', hash: data.document?.sha256_hash || data.sha256_hash });
            if (onUploadComplete) onUploadComplete(data);
        } catch (error) {
            console.error("Upload error:", error);
            console.error("Error name:", error.name);
            console.error("Error message:", error.message);
            setResult({ success: false, message: error.message });
        } finally {
            setUploading(false);
        }
    };

    const handleClose = () => {
        if (uploading) {
            console.log("Cannot close modal while uploading");
            return;
        }
        console.log("Modal closing, result:", result);
        onClose();
    };

    // Prevent closing while uploading
    const handleBackdropClick = (e) => {
        if (!uploading) {
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-slate-900/60" 
                onClick={handleBackdropClick}
            />
            
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
            >
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800">
                    <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                        <UploadCloud className="text-indigo-600 dark:text-indigo-400" /> Secure Document Upload
                    </h3>
                    <button onClick={handleClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {!result?.success ? (
                        <>
                            {/* Document Type Selector */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">
                                    Document Designation
                                </label>
                                <select 
                                    value={docType}
                                    onChange={(e) => setDocType(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                    {docTypes.map(t => (
                                        <option key={t.value} value={t.value}>{t.label}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Dropzone */}
                            <div 
                                className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all ${isDragging ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/10' : 'border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600'}`}
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                            >
                                <input 
                                    type="file" 
                                    ref={fileInputRef} 
                                    className="hidden" 
                                    onChange={handleFileChange}
                                    accept=".pdf,.png,.jpg,.jpeg,.gif,.bmp,.tiff,.tif,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.dwg,.dxf,.zip,.rar,.7z"
                                />
                                
                                <div className="flex flex-col items-center justify-center">
                                    <div className="w-16 h-16 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-4 shadow-sm">
                                        <FileText size={32} />
                                    </div>
                                    {file ? (
                                        <div className="space-y-1">
                                            <p className="text-sm font-bold text-slate-900 dark:text-white truncate max-w-[250px]">{file.name}</p>
                                            <p className="text-xs text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                            <button onClick={() => setFile(null)} className="text-xs text-red-500 hover:text-red-700 font-bold mt-2">Remove</button>
                                        </div>
                                    ) : (
                                        <>
                                            <p className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                                                Drag and drop your document here
                                            </p>
                                            <p className="text-xs text-slate-500 mb-4">
                                                Supports PDF, CAD, JPG, PNG up to 50MB
                                            </p>
                                            <button 
                                                onClick={() => fileInputRef.current.click()}
                                                className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold shadow-sm hover:shadow transition-all"
                                            >
                                                Browse Files
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                            
                            {result && !result.success && (
                                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-start gap-3">
                                    <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={16} />
                                    <p className="text-sm text-red-700 dark:text-red-300 text-left">{result.message}</p>
                                </div>
                            )}

                            <div className="flex gap-3 pt-2">
                                <button onClick={handleClose} className="flex-1 px-4 py-3 bg-slate-100/50 hover:bg-slate-200/50 dark:bg-slate-800/50 dark:hover:bg-slate-700/50 rounded-xl text-sm font-bold transition-colors">
                                    Cancel
                                </button>
                                <button 
                                    onClick={handleUpload}
                                    disabled={!file || uploading}
                                    className="flex-1 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-200 dark:shadow-none transition-all flex items-center justify-center gap-2"
                                >
                                    {uploading ? <><Loader2 size={16} className="animate-spin" /> Securing...</> : 'Upload & Hash'}
                                </button>
                            </div>
                        </>
                    ) : (
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="text-center py-6"
                        >
                            <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/40 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-500 shadow-xl shadow-emerald-100 dark:shadow-none">
                                <ShieldCheck size={40} />
                            </div>
                            <h4 className="text-xl font-black text-slate-900 dark:text-white mb-2">Upload Verified</h4>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 px-4">
                                The document has been securely processed and bound to the central registry.
                            </p>
                            
                            <div className="text-left bg-slate-50 dark:bg-slate-950/50 rounded-xl p-4 border border-slate-200 dark:border-slate-800 mb-6">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">SHA-256 Fingerprint</p>
                                <p className="text-xs font-mono text-indigo-600 dark:text-indigo-400 break-all bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                                    {result.hash}
                                </p>
                            </div>

                            <button onClick={() => { onClose(); if(onUploadComplete) onUploadComplete(); }} className="w-full px-4 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 rounded-xl text-sm font-bold transition-all">
                                Continue
                            </button>
                        </motion.div>
                    )}
                </div>
            </motion.div>
        </div>
    );
}
