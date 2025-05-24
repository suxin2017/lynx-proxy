import { useMemo } from 'react';
import enUS from 'antd/locale/en_US';
import zhCN from 'antd/locale/zh_CN';
import { useLanguage } from './LanguageContext';

/**
 * Custom hook that returns the appropriate Ant Design locale based on the current language
 */
export const useAntdLocale = () => {
  const { language } = useLanguage();

  return useMemo(() => {
    switch (language) {
      case 'zh-CN':
        return zhCN;
      case 'en':
      default:
        return enUS;
    }
  }, [language]);
};
