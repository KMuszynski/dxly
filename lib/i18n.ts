import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import enCommon from '../public/locales/en/common.json';
import plCommon from '../public/locales/pl/common.json';
import enCommingSoon from '../public/locales/en/commingSoon.json';
import plCommingSoon from '../public/locales/pl/commingSoon.json';

const resources = {
  en: {
    common: enCommon,
    commingSoon: enCommingSoon,
  },
  pl: {
    common: plCommon,
    commingSoon: plCommingSoon,
  },
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en',
    fallbackLng: 'en',
    debug: false,
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });

export default i18n;
