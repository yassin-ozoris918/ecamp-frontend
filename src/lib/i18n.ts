import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import enTranslation from '../locales/en.json';
import arTranslation from '../locales/ar.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: enTranslation
      },
      ar: {
        translation: arTranslation
      }
    },
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false // React already escapes values
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage']
    }
  });

const updateDocumentDirection = (lng: string) => {
  const isRtl = lng && lng.startsWith('ar');
  document.dir = isRtl ? 'rtl' : 'ltr';
  document.documentElement.lang = isRtl ? 'ar' : 'en';
  if (isRtl) {
    document.documentElement.classList.add('rtl');
  } else {
    document.documentElement.classList.remove('rtl');
  }
};

i18n.on('languageChanged', (lng) => {
  updateDocumentDirection(lng);
});

// Initial direction
updateDocumentDirection(i18n.language || 'en');

export default i18n;
