import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import enCommon from '../public/locales/en/common.json';
import plCommon from '../public/locales/pl/common.json';
import enCommingSoon from '../public/locales/en/commingSoon.json';
import plCommingSoon from '../public/locales/pl/commingSoon.json';
import enLogin from '../public/locales/en/login.json';
import plLogin from '../public/locales/pl/login.json';
import enSettings from '../public/locales/en/settings.json';
import plSettings from '../public/locales/pl/settings.json';
import enPatients from '../public/locales/en/patients.json';
import plPatients from '../public/locales/pl/patients.json';
import enVisits from '../public/locales/en/visits.json';
import plVisits from '../public/locales/pl/visits.json';

const resources = {
  en: {
    common: enCommon,
    commingSoon: enCommingSoon,
    login: enLogin,
    settings: enSettings,
    patients: enPatients,
    visits: enVisits,
  },
  pl: {
    common: plCommon,
    commingSoon: plCommingSoon,
    login: plLogin,
    settings: plSettings,
    patients: plPatients,
    visits: plVisits,
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
