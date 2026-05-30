import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getStorage } from '../utils/storage';
import zhCN from './locales/zh-CN';
import enUS from './locales/en-US';

let initialized = false;

export function ensureI18n() {
  if (initialized) return i18n;

  const savedLanguage = getStorage().getString('language') || 'zh-CN';
  i18n.use(initReactI18next).init({
    resources: {
      'zh-CN': { translation: zhCN },
      'en-US': { translation: enUS },
    },
    lng: savedLanguage,
    fallbackLng: 'zh-CN',
    interpolation: {
      escapeValue: false,
    },
  });
  initialized = true;
  return i18n;
}

export const changeLanguage = (lang: string) => {
  ensureI18n();
  i18n.changeLanguage(lang);
  getStorage().set('language', lang);
};

export const getCurrentLanguage = () => {
  ensureI18n();
  return i18n.language;
};

export default i18n;
