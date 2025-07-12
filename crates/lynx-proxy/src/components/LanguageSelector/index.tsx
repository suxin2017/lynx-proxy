import React from 'react';
import { Select } from 'antd';
import { useI18n } from '@/contexts';

const { Option } = Select;

export const LanguageSelector: React.FC = () => {
  const { language, setLanguage } = useI18n();

  const handleLanguageChange = (value: string) => {
    setLanguage(value as 'en' | 'zh-CN');
  };

  return (
    <Select value={language} onChange={handleLanguageChange} className="">
      <Option value="en">EN</Option>
      <Option value="zh-CN">中文</Option>
    </Select>
  );
};
