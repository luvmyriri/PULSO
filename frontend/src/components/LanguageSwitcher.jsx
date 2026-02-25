import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Languages } from 'lucide-react';

export default function LanguageSwitcher() {
    const { i18n } = useTranslation();
    const [isOpen, setIsOpen] = React.useState(false);

    const changeLanguage = (lng) => {
        i18n.changeLanguage(lng);
        setIsOpen(false);
    };

    const currentLang = i18n.language || 'en';

    return (
        <div className="fixed bottom-6 right-6 z-[9999]">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="absolute bottom-16 right-0 w-36 rounded-xl bg-white dark:bg-gray-800 shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden"
                    >
                        <button
                            onClick={() => changeLanguage('en')}
                            className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors ${currentLang === 'en'
                                ? 'bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 font-bold'
                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 font-medium'
                                }`}
                        >
                            <img src="https://flagcdn.com/w20/us.png" srcSet="https://flagcdn.com/w40/us.png 2x" width="20" alt="US" className="rounded-sm shadow-sm" /> English
                        </button>
                        <div className="h-px w-full bg-gray-100 dark:bg-gray-700" />
                        <button
                            onClick={() => changeLanguage('tl')}
                            className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors ${currentLang === 'tl'
                                ? 'bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 font-bold'
                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 font-medium'
                                }`}
                        >
                            <img src="https://flagcdn.com/w20/ph.png" srcSet="https://flagcdn.com/w40/ph.png 2x" width="20" alt="PH" className="rounded-sm shadow-sm" /> Tagalog
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            <motion.button
                onClick={() => setIsOpen(!isOpen)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center justify-center w-14 h-14 rounded-full bg-orange-500 text-white shadow-xl shadow-orange-500/30 hover:bg-orange-600 hover:shadow-orange-600/40 transition-all focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
                aria-label="Toggle language"
            >
                <Languages size={24} />
            </motion.button>
        </div>
    );
}
