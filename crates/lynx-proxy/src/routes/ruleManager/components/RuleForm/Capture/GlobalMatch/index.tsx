import React from 'react';
import Markdown from 'react-markdown';
import syntax from './syntax.md';
import remarkGfm from 'remark-gfm';
import { Collapse, Form, Input } from 'antd';
import { RiInformationLine } from '@remixicon/react';
import { formKeys, useFormWatch } from '../..';

import { ExampleUrl } from '../ExampleUrl';

interface IGlobalMatchProps { }

export const GlobMatch: React.FC<IGlobalMatchProps> = () => {
  const url = useFormWatch(formKeys.captureGlobUrl);

  return (
    <>
      <Form.Item
        label="Url"
        name={formKeys.captureGlobUrl}
        rules={[{ required: true }]}
      >
        <Input />
      </Form.Item>
      <ExampleUrl url={url} type="glob" />

      <Collapse expandIconPosition={'right'} ghost>
        <Collapse.Panel
          className="[&_.ant-collapse-header]:h-8 [&_.ant-collapse-header]:p-0"
          header={
            <div className="flex items-center gap-1">
              <RiInformationLine size={14} />
              <span>Glob Pattern Syntax</span>
            </div>
          }
          key="1"
        >
          <Markdown remarkPlugins={[remarkGfm]}>{syntax}</Markdown>
        </Collapse.Panel>
      </Collapse>
    </>
  );
};
