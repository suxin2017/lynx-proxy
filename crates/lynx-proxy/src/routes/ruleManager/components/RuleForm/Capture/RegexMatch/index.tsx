import React from 'react';
import { Form, Input } from 'antd';
import { formKeys, useFormWatch } from '../..';
import { ExampleUrl } from '../ExampleUrl';

interface IGlobalMatchProps {}

export const RegexMatch: React.FC<IGlobalMatchProps> = () => {
  const url = useFormWatch(formKeys.captureRegexUrl);

  return (
    <>
      <Form.Item
        label="Url"
        name={formKeys.captureRegexUrl}
        rules={[{ required: true }]}
      >
        <Input />
      </Form.Item>
      <ExampleUrl url={url} type="regex" />
    </>
  );
};
