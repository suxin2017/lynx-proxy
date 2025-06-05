import { Button } from 'antd';
import React from 'react';
import { useI18n } from '@/contexts';

interface AddHandlerButtonProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  add: (defaultValue?: any) => void;
}

export const AddHandlerButton: React.FC<AddHandlerButtonProps> = ({ add }) => {
  const { t } = useI18n();

  const quickAddItems = [
    {
      key: 'block',
      type: 'block' as const,
      name: t('ruleManager.quickAdd.blockRequest.name'),
      config: {
        type: 'block',
        statusCode: 403,
        reason: t('ruleManager.handlerDescriptions.reason'),
      },
    },
    {
      key: 'modifyRequest',
      type: 'modifyRequest' as const,
      name: t('ruleManager.quickAdd.modifyRequest.name'),
      config: {
        type: 'modifyRequest',
        modifyHeaders: null,
        modifyBody: null,
        modifyMethod: null,
        modifyUrl: null,
      },
    },
    {
      key: 'modifyResponse',
      type: 'modifyResponse' as const,
      name: t('ruleManager.quickAdd.modifyResponse.name'),
      config: {
        type: 'modifyResponse',
        modifyHeaders: null,
        modifyBody: null,
        modifyMethod: null,
        modifyUrl: null,
      },
    },
    {
      key: 'localFile',
      type: 'localFile' as const,
      name: t('ruleManager.quickAdd.localFile.name'),
      config: {
        type: 'localFile',
        filePath: '',
        contentType: null,
        statusCode: null,
      },
    },
    {
      key: 'proxyForward',
      type: 'proxyForward' as const,
      name: t('ruleManager.quickAdd.proxyForward.name'),
      config: {
        type: 'proxyForward',
        targetUrl: '',
        headers: null,
        statusCode: null,
      },
    },
  ];

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        {quickAddItems.map((item) => (
          <Button
            key={item.key}
            onClick={() =>
              add({
                handlerType: item.config,
                name: item.name,
                enabled: true,
                executionOrder: 0,
              })
            }
          >
            {t('ruleManager.quickAdd.prefix')}
            {item.name}
          </Button>
        ))}
      </div>
    </div>
  );
};
