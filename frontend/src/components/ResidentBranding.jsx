import React from 'react';

const ResidentBranding = ({ 
    className = '', 
    size = 'h-10', 
    showText = true, 
    vertical = false,
    isOverHero = false,
    forceLightText = false
}) => {
    return (
        <div className={`flex ${vertical ? 'flex-col items-center text-center' : 'items-center'} gap-3 ${className}`}>
            <div className="flex items-center">
                <img
                    src="/city-engineering-logo.png"
                    alt="Caloocan City Seal"
                    className={`${size} aspect-square object-contain drop-shadow-sm rounded-full bg-white border border-slate-200 dark:border-slate-700 hover:scale-105 transition-transform duration-200`}
                />
            </div>
            {showText && (
                <div className={`flex flex-col leading-none ${vertical ? 'mt-2' : ''}`}>
                    <span className={`font-black tracking-tight text-xl transition-colors duration-200 ${
                        isOverHero || forceLightText
                            ? 'text-white drop-shadow-sm'
                            : 'text-slate-900 dark:text-white'
                    }`}>
                        PULSO
                    </span>
                    <span className="text-[9px] text-[#ff6b00] dark:text-[#ff8a3d] font-bold uppercase tracking-[0.2em] mt-0.5">
                        Caloocan City
                    </span>
                </div>
            )}
        </div>
    );
};

export default ResidentBranding;
