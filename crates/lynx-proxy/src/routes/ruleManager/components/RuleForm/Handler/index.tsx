import { Collapse, CollapseProps, Dropdown, Form, FormListFieldData, Menu, Space, Switch, Tooltip, Typography } from 'antd';
import React, { useState } from 'react';
import { DownOutlined } from '@ant-design/icons';
import { FormComponentMap, HandlerType } from './constant';
import { formKeys, IRuleFormValues, RuleFormItem, useFormInstance, useFormWatch } from '..';
import { nanoid } from '@reduxjs/toolkit';
import { RiDeleteBinLine, RiInformationLine } from '@remixicon/react';



interface IHandlerProps { }


export const Handler: React.FC<IHandlerProps> = () => {

  const [activeKey, setActiveKey] = useState<string[]>([])
  const form = Form.useFormInstance();

  const formList: IRuleFormValues["handlers"] = useFormWatch([formKeys.handlers]);


  return (
    <div>
      <Typography.Title level={4}>Handler

      </Typography.Title>

      <Form.List name={formKeys.handlers}>
        {(fields, { add, remove }) => {
          return <>
            <Dropdown menu={{
              items: [
                {
                  key: '1',
                  type: 'group',
                  label: "Connect",
                  children: [{
                    key: HandlerType.ConnectPassProxy,
                    label:
                      <Tooltip title="This option can only exist once">
                        <span>
                          Pass Proxy
                        </span>
                      </Tooltip>
                    ,
                    disabled: formList?.some((item) => item.type === HandlerType.ConnectPassProxy),
                    onClick: () => {
                      const key = nanoid();
                      setActiveKey([...activeKey, key])
                      add({
                        type: HandlerType.ConnectPassProxy,
                        uri: "",
                        switch: true,
                        key: key,
                      })
                    }
                  }]
                },

              ]
            }}>
              <a className="inline-block mb-3" onClick={(e) => e.preventDefault()}>
                <Space>
                  Create New Handler
                  <DownOutlined />
                </Space>
              </a>
            </Dropdown>
            <Collapse
              ghost
              className="[&_.ant-collapse-header]:flex [&_.ant-collapse-header]:p-0 [&_.ant-collapse-header]:items-center [&_.ant-collapse-content-box]:px-0"
              expandIconPosition="end"
              activeKey={activeKey}
              onChange={setActiveKey}
              items={
                fields.map(field => {
                  const data = form.getFieldValue([formKeys.handlers, field.name]);

                  if (!data) {
                    return null;
                  }

                  const component = FormComponentMap[data?.type as keyof typeof FormComponentMap];
                  const ComponentContent = component?.conent;

                  return {
                    label: <div className="flex gap-1 items-center select-none">
                      <Form.Item name={[field.name, "switch"]} valuePropName="checked" noStyle>
                        <Switch size="small" onClick={(_, e) => {
                          e.stopPropagation()
                        }} />
                      </Form.Item>

                      <span className="text-sm">{component?.title}</span>
                    </div>,
                    headerClass: "text-sm",
                    key: data.key,
                    children: <ComponentContent field={field} />,

                    extra: <RiDeleteBinLine size={14} className="align-baseline" onClick={e => {
                      e.stopPropagation();
                      remove(field.name)
                    }} />
                  } as NonNullable<CollapseProps['items']>[number]
                }).filter(Boolean) as any
              }
            >
            </Collapse >
          </>

        }}
      </Form.List>

    </div >
  );
};

