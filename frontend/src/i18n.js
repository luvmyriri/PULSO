import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import enTranslation from './locales/en.json';
import tlTranslation from './locales/tl.json';

i18n
    .use(initReactI18next)
    .init({
        resources: {
            en: enTranslation,
            tl: tlTranslation
        },
        lng: 'en', // Default language
        fallbackLng: 'en',
        interpolation: {
            escapeValue: false // React already escapes values
        }
    });

export default i18n;
