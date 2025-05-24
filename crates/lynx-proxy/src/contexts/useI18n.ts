import { useTranslation } from 'react-i18next';
import { useLanguage, Language } from './LanguageContext';

// Define our extended hook return type
interface UseI18nResponse {
  t: (key: string, options?: Record<string, unknown>) => string;
  i18n: {
    language: string;
    changeLanguage: (lng: string) => Promise<unknown>;
  };
  language: Language;
  setLanguage: (lang: Language) => void;
}

/**
 * Custom hook that combines useTranslation and useLanguage
 * Makes it easier to work with translations and language changes
 */
export const useI18n = (): UseI18nResponse => {
  const { t, i18n } = useTranslation();
  const { language, setLanguage } = useLanguage();

  return {
    t,
    i18n,
    language,
    setLanguage,
  };
};
