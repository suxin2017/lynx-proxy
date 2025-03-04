import React from 'react';
import { Form, Input } from 'antd';
import { useFormWatch } from '../..';
import { ExampleUrl } from '../ExampleUrl';

interface IGlobalMatchProps {}

export const RegexMatch: React.FC<IGlobalMatchProps> = () => {
  const url = useFormWatch(['capture', 'regexUrl']);

  return (
    <>
      <Form.Item
        label="Url"
        name={['capture', 'regexUrl']}
        rules={[{ required: true }]}
      >
        <Input />
      </Form.Item>
      <ExampleUrl url={url} type="regex" />
    </>
  );
};
