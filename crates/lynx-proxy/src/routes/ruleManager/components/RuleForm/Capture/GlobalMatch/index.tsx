import React from 'react';
import Markdown from 'react-markdown';
import syntax from './syntax.md';
import remarkGfm from 'remark-gfm';
import { Collapse, Input } from 'antd';
import { RiInformationLine } from '@remixicon/react';
import { RuleFormItem, useFormWatch } from '../..';

import { ExampleUrl } from '../ExampleUrl';

interface IGlobalMatchProps {}

export const GlobMatch: React.FC<IGlobalMatchProps> = () => {
  const url = useFormWatch(['capture', 'globUrl']);

  return (
    <>
      <RuleFormItem
        label="Url"
        name={['capture', 'globUrl']}
        rules={[{ required: true }]}
      >
        <Input />
      </RuleFormItem>
      <ExampleUrl url={url} type="glob" />
      <Collapse
        expandIconPosition={'end'}
        ghost
        items={[
          {
            className:
              '[&_.ant-collapse-header]:h-8 [&_.ant-collapse-header]:p-0',

            label: (
              <div className="flex items-center gap-1">
                <RiInformationLine size={14} />
                <span>Glob Pattern Syntax</span>
              </div>
            ),
            key: '1',
            children: <Markdown remarkPlugins={[remarkGfm]}>{syntax}</Markdown>,
          },
        ]}
      />
    </>
  );
};
