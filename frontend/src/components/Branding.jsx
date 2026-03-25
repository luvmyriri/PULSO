import React from 'react';

const Branding = ({ className = "", size = "h-10", showText = true, vertical = false }) => {
    return (
        <div className={`flex ${vertical ? 'flex-col items-center text-center' : 'items-center'} gap-3 ${className}`}>
            <div className={`flex ${vertical ? 'flex-row' : '-space-x-3'} items-center`}>
                <img 
                    src="/engineering-logo.jpg" 
                    alt="Caloocan Engineering" 
                    className={`${size} w-auto object-contain drop-shadow-md rounded-full border-2 border-white dark:border-slate-800 z-10 hover:z-20 transform hover:scale-110 transition-all duration-300`}
                />
                <img 
                    src="/pulso-logo.png" 
                    alt="PULSO Logo" 
                    className={`${size} w-auto object-contain drop-shadow-md rounded-full border-2 border-white dark:border-slate-800 hover:z-20 transform hover:scale-110 transition-all duration-300`}
                />
            </div>
            {showText && (
                <div className={`flex flex-col leading-none ${vertical ? 'mt-2' : ''}`}>
                    <span className="font-extrabold text-slate-900 dark:text-white tracking-tight text-xl">PULSO</span>
                    <span className="text-[9px] text-orange-500 font-black uppercase tracking-[0.2em] mt-0.5">City Engineering</span>
                </div>
            )}
        </div>
    );
};

export default Branding;
