import {
  Collapse,
  CollapseProps,
  Dropdown,
  Form,
  Space,
  Switch,
  Tooltip,
  Typography,
} from 'antd';
import React, { useContext, useState } from 'react';
import { DownOutlined } from '@ant-design/icons';
import { getFormComponent } from './constant';
import { IRuleFormValues, useFormWatch } from '..';
import { nanoid } from '@reduxjs/toolkit';
import { RiDeleteBinLine } from '@remixicon/react';
import { Handler, Handler as HandlerType } from '@/api/type';
import constate from 'constate';
import { FormListProps } from 'antd/es/form';

interface IHandlerProps {}

const [HandlerContentProvider, useHandlerContent] = constate(() => {
  const [activeKey, setActiveKey] = useState<string[]>([]);
  return {
    activeKey,
    setActiveKey,
  };
});

const HandlerListFormContext = React.createContext<null | Parameters<
  FormListProps['children']
>>(null);

const useHandlerListFormContext = () =>
  useContext(HandlerListFormContext) ??
  ([] as unknown as Parameters<FormListProps['children']>);

export const InnerHandlerComponent: React.FC<IHandlerProps> = () => {
  return (
    <div>
      <Typography.Title level={4}>Handler</Typography.Title>

      <Form.List name={['handlers']}>
        {(...listParams) => {
          return (
            <HandlerListFormContext.Provider value={listParams}>
              <HandlerComponentList />
            </HandlerListFormContext.Provider>
          );
        }}
      </Form.List>
    </div>
  );
};

export const HandlerComponent: React.FC = () => {
  return (
    <HandlerContentProvider>
      <InnerHandlerComponent />
    </HandlerContentProvider>
  );
};

const DropdownMenu: React.FC = () => {
  const formList: IRuleFormValues['handlers'] = useFormWatch(['handlers']);
  const { activeKey, setActiveKey } = useHandlerContent();
  const [_, { add }] = useHandlerListFormContext();

  return (
    <Dropdown
      menu={{
        items: [
          {
            key: '1',
            type: 'group',
            label: 'Connect',
            children: [
              {
                key: 'connectPassProxyHandler',
                label: (
                  <Tooltip title="This option can only exist once">
                    <span>Pass Proxy</span>
                  </Tooltip>
                ),
                disabled: formList?.some(
                  (item) => item.type === 'connectPassProxyHandler',
                ),
                onClick: () => {
                  const key = nanoid();
                  setActiveKey([...activeKey, key]);
                  const defaultConnectPassProxyHandler: Handler = {
                    type: 'connectPassProxyHandler',
                    data: {
                      switch: true,
                      url: '',
                    },
                  };
                  add(defaultConnectPassProxyHandler);
                },
              },
            ],
          },
        ],
      }}
    >
      <a className="mb-3 inline-block" onClick={(e) => e.preventDefault()}>
        <Space>
          Create New Handler
          <DownOutlined />
        </Space>
      </a>
    </Dropdown>
  );
};

const HandlerComponentList: React.FC = () => {
  const { activeKey, setActiveKey } = useHandlerContent();
  const form = Form.useFormInstance();

  const [fields, { remove }] = useHandlerListFormContext();

  const items = fields
    .map((field) => {
      const data: HandlerType = form.getFieldValue(['handlers', field.name]);
      if (!data) {
        return null;
      }
      const componentConfig = getFormComponent(data);
      if (!componentConfig) {
        return null;
      }
      const ComponentContent = componentConfig?.component;
      const ComponentTitle = componentConfig?.title;

      return {
        label: (
          <div className="flex items-center gap-1 select-none">
            <Form.Item
              name={[field.name, 'data', 'switch']}
              valuePropName="checked"
              noStyle
            >
              <Switch
                size="small"
                onClick={(_, e) => {
                  e.stopPropagation();
                }}
              />
            </Form.Item>

            <span className="text-sm">{ComponentTitle}</span>
          </div>
        ),
        headerClass: 'text-sm',
        key: field.key,
        children: <ComponentContent field={field} />,
        extra: (
          <RiDeleteBinLine
            size={14}
            className="align-baseline"
            onClick={(e) => {
              e.stopPropagation();
              remove(field.name);
            }}
          />
        ),
      } as NonNullable<CollapseProps['items']>[number];
    })
    .filter(Boolean) as NonNullable<CollapseProps['items']>[number][];

  return (
    <>
      <DropdownMenu />
      <Collapse
        ghost
        className="[&_.ant-collapse-content-box]:px-0 [&_.ant-collapse-header]:flex [&_.ant-collapse-header]:items-center [&_.ant-collapse-header]:p-0"
        expandIconPosition="end"
        activeKey={activeKey}
        onChange={setActiveKey}
        items={items}
      ></Collapse>
    </>
  );
};
