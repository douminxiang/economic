import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { createMMKV } from 'react-native-mmkv';
import zhCN from './locales/zh-CN';
import enUS from './locales/en-US';

const storage = createMMKV();
const savedLanguage = storage.getString('language') || 'zh-CN';

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

export const changeLanguage = (lang: string) => {
  i18n.changeLanguage(lang);
  storage.set('language', lang);
};

export const getCurrentLanguage = () => i18n.language;

export default i18n;
