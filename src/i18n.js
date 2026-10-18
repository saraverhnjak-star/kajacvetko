import { createContext, useContext } from 'react';
import sl from './locales/sl.json';
import de from './locales/de.json';
import en from './locales/en.json';

export const languages = ['sl', 'de', 'en'];
const messages = { sl, de, en };
export const LocaleContext = createContext(null);
export const useLocale = () => useContext(LocaleContext);

export function translator(language) {
  return (key, values = {}) => {
    const text = messages[language]?.[key] ?? sl[key] ?? key;
    return text.replace(/\{(\w+)\}/g, (match, name) => values[name] ?? match);
  };
}

export function initialLanguage() {
  const pathLanguage = location.pathname.split('/')[1];
  if (languages.includes(pathLanguage)) return pathLanguage;
  try {
    const saved = localStorage.getItem('kaja-language');
    if (languages.includes(saved)) return saved;
  } catch { /* The site also works when storage is unavailable. */ }
  return 'sl';
}

export function localizedContent(item, language) {
  return { ...item.translations.sl, ...item.translations[language] };
}

export function navigationPages(t) {
  return [
    { id: 'domov', title: t('gallery') },
    { id: 'o-meni', title: t('about'), label: t('aboutLabel'), text: t('aboutText') },
    { id: 'razstave', title: t('exhibitions'), label: t('exhibitionsLabel'), text: t('exhibitionsText') },
    { id: 'kontakt', title: t('contact'), label: t('contactLabel'), text: t('contactText') },
  ];
}
