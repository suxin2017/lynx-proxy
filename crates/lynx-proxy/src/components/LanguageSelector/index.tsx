import React from 'react';
import { Select } from 'antd';

const { Option } = Select;

export const LanguageSelector: React.FC<{
  value?: string,
  onChange?: (value: string) => void;
}> = ({ value, onChange }) => {


  return (
    <Select value={value} onChange={onChange} className="">
      {/* <Option value="en">EN</Option> */}
      <Option value="zh-CN">中文</Option>
    </Select>
  );
};
