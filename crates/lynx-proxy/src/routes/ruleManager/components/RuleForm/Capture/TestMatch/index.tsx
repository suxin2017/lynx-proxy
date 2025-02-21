import { Typography, Form, Select, Button, Tag } from 'antd';
import React from 'react';
import { formKeys, useFormWatch } from '../..';
import RandExp from 'randexp';
import globToRegExp from 'glob-to-regexp';
import { RiErrorWarningLine } from '@remixicon/react';

export const TestMatch: React.FC = () => {
  const type = useFormWatch(formKeys.captureType);

  return (
    <>
      <Typography.Text strong className="text-sm">
        Capture Test
      </Typography.Text>
      <Form.Item label="Input Url">
        <div>
          <Select
            mode="tags"
            className="h-24"
            tokenSeparators={[',']}
            open={false}
            suffixIcon={null}
            tagRender={(props) => {
              return (
                <Tag
                  closable={props.closable}
                  className="flex items-center text-red-500"
                >
                  <RiErrorWarningLine size={12} />
                  {props.value}
                </Tag>
              );
            }}
          />
          <Button
            className="mt-1"
            type="primary"
            onClick={() => {
              const re = globToRegExp('*test');

              const randexp = new RandExp(re);
              console.log(randexp.gen());
            }}
          >
            Test
          </Button>
        </div>
      </Form.Item>
    </>
  );
};
