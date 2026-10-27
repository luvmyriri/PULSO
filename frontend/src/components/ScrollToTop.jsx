import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUp } from 'lucide-react';
import { useLocation } from 'react-router-dom';

import { isInstalledApp } from '../utils/appContext';

export default function ScrollToTop() {
    const [isVisible, setIsVisible] = useState(false);
    const [isUpdatesModalActive, setIsUpdatesModalActive] = useState(false);
    const location = useLocation();

    // Hide on resident dashboard, government portals, auth pages, tutorial, dev preview, installed app, and when updates details modal is active
    const isHidden = 
        isInstalledApp() ||
        isUpdatesModalActive ||
        location.pathname.startsWith('/report') ||
        location.pathname.startsWith('/dashboard') ||
        location.pathname.startsWith('/gov') ||
        location.pathname.startsWith('/management') ||
        location.pathname.startsWith('/dispatcher') ||
        location.pathname.startsWith('/login') ||
        location.pathname.startsWith('/register') ||
        location.pathname.startsWith('/reset-password') ||
        location.pathname.startsWith('/tutorial') ||
        location.pathname.startsWith('/dev');

    useEffect(() => {
        const handleModalState = (e) => {
            setIsUpdatesModalActive(Boolean(e.detail?.active));
        };
        window.addEventListener('pulso:updates-modal-active', handleModalState);

        // Check if modal was already opened before mount
        if (typeof document !== 'undefined' && document.body.getAttribute('data-updates-modal-active') === 'true') {
            setIsUpdatesModalActive(true);
        }

        return () => {
            window.removeEventListener('pulso:updates-modal-active', handleModalState);
        };
    }, []);

    useEffect(() => {
        const toggleVisibility = () => {
            if (document.body.getAttribute('data-updates-modal-active') === 'true') {
                setIsVisible(false);
                return;
            }
            if (window.scrollY > 300) {
                setIsVisible(true);
            } else {
                setIsVisible(false);
            }
        };

        window.addEventListener('scroll', toggleVisibility);
        return () => window.removeEventListener('scroll', toggleVisibility);
    }, []);

    const scrollToTop = () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    };

    if (isHidden) return null;

    return (
        <AnimatePresence>
            {isVisible && !isUpdatesModalActive && (
                <motion.button
                    initial={{ opacity: 0, scale: 0.6, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.6, y: 20 }}
                    whileHover={{ scale: 1.1, y: -2 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={scrollToTop}
                    aria-label="Scroll to Top"
                    className="fixed bottom-6 right-6 z-[9999] w-12 h-12 rounded-full bg-[#f05a00] hover:bg-[#d94e00] text-white shadow-xl shadow-[#f05a00]/30 flex items-center justify-center cursor-pointer transition-all border border-white/20 backdrop-blur-xs"
                >
                    <ArrowUp size={20} className="stroke-[2.5]" />
                </motion.button>
            )}
        </AnimatePresence>
    );
}
