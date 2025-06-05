import { Typography } from 'antd';
import React, { useState } from 'react';
import { HandlerItem } from './HandlerItem';
import { useI18n } from '@/contexts';

const { Text } = Typography;

interface HandlerListProps {
  fields: Array<{
    key: number;
    name: number;
  }>;
  remove: (index: number) => void;
}

export const HandlerList: React.FC<HandlerListProps> = ({ fields, remove }) => {
  const [editingHandler, setEditingHandler] = useState<number | null>(null);
  const { t } = useI18n();

  if (fields.length === 0) {
    return (
      <div className="py-8 text-center text-gray-500">
        <Text type="secondary">
          {t('ruleManager.createRuleDrawer.handlerBehavior.noHandlers')}
        </Text>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {fields.map((field, index) => (
        <div key={field.key} className={`transition-all duration-200`}>
          <HandlerItem
            field={field}
            index={index}
            isEditing={editingHandler === field.name}
            onEdit={() => setEditingHandler(field.name)}
            onSave={() => setEditingHandler(null)}
            onCancel={() => setEditingHandler(null)}
            onDelete={() => remove(field.name)}
          />
        </div>
      ))}
    </div>
  );
};
