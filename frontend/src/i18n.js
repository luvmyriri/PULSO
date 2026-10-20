import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import enTranslation from './locales/en.json';
import tlTranslation from './locales/tl.json';

const getInitialLanguage = () => {
    if (typeof window === 'undefined') return 'en';
    try {
        const saved = localStorage.getItem('pulso_language') || localStorage.getItem('i18nextLng');
        if (saved === 'en' || saved === 'tl') {
            return saved;
        }
        // First launch or migration: read device language once, never follow after
        const navLang = (window.navigator?.language || '').toLowerCase();
        const initial = (navLang.startsWith('tl') || navLang.startsWith('fil')) ? 'tl' : 'en';
        localStorage.setItem('pulso_language', initial);
        localStorage.setItem('i18nextLng', initial);
        return initial;
    } catch (e) {
        return 'en';
    }
};

const initialLng = getInitialLanguage();

i18n
    .use(initReactI18next)
    .init({
        resources: {
            en: enTranslation,
            tl: tlTranslation
        },
        lng: initialLng,
        fallbackLng: 'en',
        interpolation: {
            escapeValue: false // React already escapes values
        }
    });

export default i18n;
