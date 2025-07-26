import React from 'react';
import { Tag, Space } from 'antd';
import { useFilterTemplate } from './context';
import { FilterTemplate } from './types';

export const ActiveTemplatesTags: React.FC = () => {
  const { state, toggleTemplateEnabled } = useFilterTemplate();
  
  // 获取已开启的模板
  const activeTemplates = state.templates.filter(template => template.enabled);
  
  if (activeTemplates.length === 0) {
    return null;
  }
  
  const handleTagClose = (template: FilterTemplate) => {
    toggleTemplateEnabled(template.id);
  };
  
  return (
    <div className="overflow-x-auto">
      <Space wrap={false} className="whitespace-nowrap">
        {activeTemplates.map(template => (
          <Tag
            key={template.id}
            closable
            onClose={() => handleTagClose(template)}
            color={template.isPreset ? 'blue' : 'green'}
          >
            {template.name}
          </Tag>
        ))}
      </Space>
    </div>
  );
};