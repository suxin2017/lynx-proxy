import { useI18n } from '@/contexts';
import { DownOutlined } from '@ant-design/icons';
import { Button, Dropdown, MenuProps } from 'antd';
import React from 'react';

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
      key: 'delay',
      type: 'delay' as const,
      name: t('ruleManager.quickAdd.delay.name'),
      config: {
        type: 'delay',
        delayMs: 1000,
        varianceMs: null,
        delayType: 'beforeRequest',
      },
    },
    {
      key: 'delay5s',
      type: 'delay' as const,
      name: t('ruleManager.quickAdd.delay5s.name'),
      config: {
        type: 'delay',
        delayMs: 5000,
        varianceMs: null,
        delayType: 'beforeRequest',
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
    {
      key: 'htmlScriptInjector',
      type: 'htmlScriptInjector' as const,
      name: t('ruleManager.quickAdd.htmlScriptInjector.name'),
      config: {
        type: 'htmlScriptInjector',
        content: null,
        injectionPosition: 'body-end',
      },
    },
    {
      key: 'injectEruda',
      type: 'htmlScriptInjector' as const,
      name: t('ruleManager.quickAdd.injectEruda.name'),
      config: {
        type: 'htmlScriptInjector',
        content: `<script src="https://cdn.jsdelivr.net/npm/eruda"></script>
<script>eruda.init();</script>`,
        injectionPosition: 'head',
      },
    },
    {
      key: 'injectReactScan',
      type: 'htmlScriptInjector' as const,
      name: t('ruleManager.quickAdd.injectReactScan.name'),
      config: {
        type: 'htmlScriptInjector',
        content: `<!-- paste this BEFORE any scripts -->
<script
  crossOrigin="anonymous"
  src="//unpkg.com/react-scan/dist/auto.global.js"
></script>
`,
        injectionPosition: 'head',
      },
    },
  ];

  const menuItems: MenuProps['items'] = quickAddItems.map((item) => ({
    key: item.key,
    label: item.name,
    onClick: () =>
      add({
        handlerType: item.config,
        name: item.name,
        enabled: true,
      }),
  }));

  return (
    <Dropdown
      menu={{ items: menuItems }}
      placement="bottomLeft"
      trigger={['click']}
    >
      <Button>
        {t('ruleManager.quickAdd.prefix')}
        <DownOutlined />
      </Button>
    </Dropdown>
  );
};
