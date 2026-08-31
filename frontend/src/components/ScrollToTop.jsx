import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUp } from 'lucide-react';
import { useLocation } from 'react-router-dom';

export default function ScrollToTop() {
    const [isVisible, setIsVisible] = useState(false);
    const location = useLocation();

    // Hide on all government/internal management pages
    const isGov = location.pathname.startsWith('/gov') ||
        location.pathname.startsWith('/management') ||
        location.pathname.startsWith('/dispatcher');

    useEffect(() => {
        const toggleVisibility = () => {
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

    if (isGov) return null;

    return (
        <AnimatePresence>
            {isVisible && (
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
