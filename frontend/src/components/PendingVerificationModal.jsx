import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, ChevronRight } from '../icons';

/**
 * PendingVerificationModal
 * 
 * Non-dismissible-by-backdrop modal dialog displayed when a resident signs in with a Google account
 * whose ID verification is incomplete. Enforces PULSO's mandatory government ID verification policy.
 */
export default function PendingVerificationModal({ isOpen, info, onComplete, onDismiss }) {
    const primaryBtnRef = useRef(null);
    const dismissBtnRef = useRef(null);
    const modalRef = useRef(null);

    // Trap initial focus on primary button
    useEffect(() => {
        if (isOpen) {
            const timer = setTimeout(() => {
                primaryBtnRef.current?.focus();
            }, 60);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    // Handle accessibility focus trap and block Escape key dismissal
    const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
            // Mandatory compliance gate: do not allow casual dismissal via Escape
            e.preventDefault();
            e.stopPropagation();
            return;
        }

        if (e.key === 'Tab') {
            const focusables = [primaryBtnRef.current, dismissBtnRef.current].filter(Boolean);
            if (focusables.length === 0) return;

            const firstElement = focusables[0];
            const lastElement = focusables[focusables.length - 1];

            if (e.shiftKey) {
                if (document.activeElement === firstElement) {
                    e.preventDefault();
                    lastElement.focus();
                }
            } else {
                if (document.activeElement === lastElement) {
                    e.preventDefault();
                    firstElement.focus();
                }
            }
        }
    };

    if (!isOpen || !info) return null;

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
            onKeyDown={handleKeyDown}
        >
            {/* Backdrop Dim - Clicking does NOT dismiss to preserve compliance gate */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 bg-slate-950/70 backdrop-blur-md select-none pointer-events-auto"
                aria-hidden="true"
            />

            {/* Modal Dialog Card */}
            <motion.div
                ref={modalRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="pending-verification-title"
                aria-describedby="pending-verification-desc"
                initial={{ opacity: 0, scale: 0.95, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 16 }}
                transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                className="relative w-full max-w-md bg-white dark:bg-[#0b0f19] border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden z-10 p-6 sm:p-8 text-center flex flex-col items-center my-auto"
            >
                {/* Shield / Verification Icon Badge */}
                <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center mb-4 shadow-sm shrink-0">
                    <ShieldCheck size={28} />
                </div>

                {/* Heading */}
                <h3
                    id="pending-verification-title"
                    className="text-xl sm:text-2xl font-heading font-black tracking-tight text-slate-900 dark:text-white"
                >
                    Government ID Verification Pending
                </h3>

                {/* Body Context */}
                <p
                    id="pending-verification-desc"
                    className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-2.5 leading-relaxed max-w-sm"
                >
                    Your Google account <strong className="font-semibold text-slate-900 dark:text-white">{info.email}</strong> is linked, but Caloocan City requires mandatory government ID verification before granting resident portal access.
                </p>

                {/* Explicit Action Buttons */}
                <div className="w-full mt-6 flex flex-col gap-2.5">
                    <button
                        ref={primaryBtnRef}
                        type="button"
                        onClick={onComplete}
                        className="w-full bg-[#ff6b00] hover:bg-[#e65c00] active:scale-[0.99] text-white py-3 px-5 rounded-xl font-heading font-bold text-sm tracking-wide transition-all shadow-md hover:shadow-lg hover:shadow-orange-500/25 flex items-center justify-center gap-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#ff6b00] focus:ring-offset-2 dark:focus:ring-offset-slate-900"
                    >
                        <span>Complete ID Verification</span>
                        <ChevronRight size={16} />
                    </button>

                    <button
                        ref={dismissBtnRef}
                        type="button"
                        onClick={onDismiss}
                        className="w-full py-2.5 px-4 text-xs sm:text-sm font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors rounded-xl cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/60 focus:outline-none focus:ring-2 focus:ring-slate-400 dark:focus:ring-slate-600"
                    >
                        Dismiss
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
