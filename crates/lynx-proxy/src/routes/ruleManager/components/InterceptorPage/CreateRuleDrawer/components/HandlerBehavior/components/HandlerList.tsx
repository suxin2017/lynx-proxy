import { Typography } from 'antd';
import React from 'react';
import { HandlerItem } from './HandlerItem';
import { useI18n } from '@/contexts';
import { HandlerCollapseProvider } from './handlerCollapseContext';

const { Text } = Typography;

interface HandlerListProps {
  fields: Array<{
    key: number;
    name: number;
  }>;
  remove: (index: number) => void;
}

export const HandlerList: React.FC<HandlerListProps> = ({ fields, remove }) => {
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
    <HandlerCollapseProvider>
      <div className="space-y-3">
        {fields.map((field, index) => (
          <div key={field.key} className={`transition-all duration-200`}>
            <HandlerItem
              field={field}
              index={index}
              onDelete={() => remove(field.name)}
            />
          </div>
        ))}
      </div>
    </HandlerCollapseProvider>
  );
};
