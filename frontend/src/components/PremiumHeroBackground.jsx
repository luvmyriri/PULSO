import React, { useState, useEffect } from 'react';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';

/**
 * PremiumHeroBackground
 * ─────────────────────────────────────────────────────────────────────────────
 * A high-performance, purely CSS & Framer Motion based background system
 * that mimics the "Spline" aesthetic (lighting, depth, and glassmorphism)
 * without the overhead of a 3D engine.
 * ─────────────────────────────────────────────────────────────────────────────
 */
const PremiumHeroBackground = ({ children }) => {
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const { scrollY } = useScroll();

    // Smoothen the scroll value for parallax
    const smoothY = useSpring(scrollY, { stiffness: 100, damping: 30 });
    const parallaxY = useTransform(smoothY, [0, 1000], [0, -200]);

    useEffect(() => {
        const handleMouseMove = (e) => {
            setMousePos({
                x: (e.clientX / window.innerWidth - 0.5) * 40,
                y: (e.clientY / window.innerHeight - 0.5) * 40
            });
        };
        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    return (
        <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none bg-white dark:bg-[#020617] transition-colors duration-1000">
            {/* 1. Deep Space Layer — Atmospheric Glows */}
            <div className="absolute inset-0">
                {/* Primary Orange Glow — Reacts to mouse */}
                <motion.div
                    animate={{
                        x: mousePos.x * 1.5,
                        y: mousePos.y * 1.5,
                        scale: [1, 1.1, 1],
                    }}
                    transition={{ scale: { duration: 10, repeat: Infinity, ease: "easeInOut" } }}
                    className="absolute -top-[10%] -right-[5%] w-[60vw] h-[60vw] rounded-full 
                    bg-[radial-gradient(circle,rgba(249,115,22,0.18)_0%,transparent_70%)] 
                    filter blur-[120px] opacity-80 pointer-events-none"
                />

                {/* Cyber Blue Secondary Glow */}
                <motion.div
                    animate={{
                        x: -mousePos.x,
                        y: -mousePos.y,
                        scale: [1, 1.2, 1],
                    }}
                    transition={{ scale: { duration: 15, repeat: Infinity, ease: "easeInOut" } }}
                    className="absolute -bottom-[10%] -left-[5%] w-[50vw] h-[50vw] rounded-full 
                    bg-[radial-gradient(circle,rgba(56,189,248,0.15)_0%,transparent_70%)] 
                    filter blur-[120px] opacity-80 pointer-events-none"
                />
            </div>

            {/* 2. Engineering Grid Layer — Mimics Command Center Depth */}
            <motion.div 
                style={{ y: parallaxY }}
                className="absolute inset-0 opacity-[0.4] dark:opacity-[0.1]"
            >
                <div 
                    className="absolute inset-0"
                    style={{
                        backgroundImage: `
                            linear-gradient(to right, currentColor 1px, transparent 1px),
                            linear-gradient(to bottom, currentColor 1px, transparent 1px)
                        `,
                        backgroundSize: '40px 40px',
                        maskImage: 'radial-gradient(circle at 50% 50%, black, transparent 80%)'
                    }}
                />
            </motion.div>

            {/* 3. CENTER SCENE LAYER — This is where the 3D Map goes */}
            <div className="absolute inset-0 z-10 pointer-events-auto">
                {children}
            </div>

            {/* 4. Floating Glass Elements — Repositioned to frame the center map */}
            <div className="absolute inset-0 perspective-[2000px] z-20">
                {/* Floating Glass Orb 1 — Moved to Top-Left */}
                <motion.div
                    animate={{
                        y: [0, -20, 0],
                        rotateX: mousePos.y * 0.4,
                        rotateY: mousePos.x * 0.4,
                        x: mousePos.x * 0.5
                    }}
                    transition={{ y: { duration: 7, repeat: Infinity, ease: "easeInOut" } }}
                    className="absolute top-[10%] left-[5%] w-40 h-40 rounded-full flex items-center justify-center
                    bg-white/10 dark:bg-white/5 backdrop-blur-[10px]
                    border border-white/20 dark:border-white/10
                    shadow-xl
                    before:absolute before:inset-0 before:rounded-full before:bg-gradient-to-tr before:from-blue-500/10 before:to-transparent"
                >
                    <img src="/engineering-logo.jpg" alt="City Engineering" className="w-24 h-24 object-contain rounded-full relative z-10 shadow-lg" />
                </motion.div>

                {/* Floating Glass Orb 2 — Moved to Bottom-Right */}
                <motion.div
                    animate={{
                        y: [0, 20, 0],
                        rotateX: mousePos.y * -0.3,
                        rotateY: mousePos.x * -0.3,
                        x: mousePos.x * -0.4
                    }}
                    transition={{ y: { duration: 9, repeat: Infinity, ease: "easeInOut" }, delay: 1 }}
                    className="absolute bottom-[15%] right-[5%] w-32 h-32 rounded-3xl flex items-center justify-center
                    bg-white/5 dark:bg-white/[0.04] backdrop-blur-[8px]
                    border border-white/20 dark:border-white/5
                    shadow-xl rotate-12
                    before:absolute before:inset-0 before:rounded-3xl before:bg-gradient-to-bl before:from-orange-500/10 before:to-transparent"
                >
                    <img src="/pulso-logo.png" alt="PULSO Logo" className="w-20 h-20 object-contain relative z-10 drop-shadow-lg" />
                </motion.div>
            </div>

            {/* 5. Refined Noise Grain */}
            <div className="absolute inset-0 bg-transparent opacity-[0.03] dark:opacity-[0.05] pointer-events-none mix-blend-overlay z-30">
                <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
                    <filter id="noise">
                        <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
                    </filter>
                    <rect width="100%" height="100%" filter="url(#noise)" />
                </svg>
            </div>

            {/* 6. Edge vignette */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_0%,rgba(2,6,23,0.1)_100%)] pointer-events-none z-40" />
        </div>
    );
};

export default PremiumHeroBackground;
