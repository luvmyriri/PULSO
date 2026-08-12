import React from 'react';

const Branding = ({ className = "", size = "h-10", showText = true, vertical = false }) => {
    return (
        <div className={`flex ${vertical ? 'flex-col items-center text-center' : 'items-center'} gap-3 ${className}`}>
            <div className={`flex items-center ${vertical ? 'gap-2' : 'gap-2'}`}>
                {/* Official Caloocan City Seal */}
                <img 
                    src="/engineering-logo.jpg" 
                    alt="Caloocan City Seal" 
                    className={`${size} w-auto object-contain drop-shadow-sm rounded-full bg-white border border-[#f3e9e2] hover:scale-105 transition-transform duration-200`}
                />
                {/* PULSO Location Pin Logo */}
                <img 
                    src="/pulso-logo.png" 
                    alt="PULSO Map Pin Logo" 
                    className={`${size} w-auto object-contain drop-shadow-sm rounded-full bg-white border border-[#f3e9e2] hover:scale-105 transition-transform duration-200`}
                />
            </div>
            {showText && (
                <div className={`flex flex-col leading-none ${vertical ? 'mt-2' : ''}`}>
                    <span className="font-black text-[#2c1d11] tracking-tight text-xl">PULSO</span>
                    <span className="text-[9px] text-[#ff6b00] font-bold uppercase tracking-[0.2em] mt-0.5">Caloocan City</span>
                </div>
            )}
        </div>
    );
};

export default Branding;
