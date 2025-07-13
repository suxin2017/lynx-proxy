import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import i18n from 'i18next';
import dayjs from 'dayjs';

// Define language type
export type Language = 'en' | 'zh-CN';

// Define context type
interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
}

// Create the context with default values
const LanguageContext = createContext<LanguageContextType>({
  language: 'zh-CN',
  setLanguage: () => { },
});

// Custom hook to use the language context
export const useLanguage = () => useContext(LanguageContext);

interface LanguageProviderProps {
  children: ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({
  children,
}) => {
  // Initialize language from localStorage or default to browser language
  const [language, setLanguageState] = useState<Language>(() => {
    const savedLanguage = localStorage.getItem('i18nextLng');
    return savedLanguage &&
      (savedLanguage === 'en' || savedLanguage === 'zh-CN')
      ? (savedLanguage as Language)
      : 'en';
  });

  // Handle language change
  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    i18n.changeLanguage(lang);
    dayjs.locale(lang);
    localStorage.setItem('i18nextLng', lang);
  };

  // Effect to sync i18n and context on language changes
  useEffect(() => {
    const handleLanguageChange = () => {
      const currentLang = i18n.language;
      if (
        (currentLang === 'en' || currentLang === 'zh-CN') &&
        currentLang !== language
      ) {
        setLanguageState(currentLang as Language);
      }
    };

    i18n.on('languageChanged', handleLanguageChange);

    return () => {
      i18n.off('languageChanged', handleLanguageChange);
    };
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};
