import { Typography, Form, Select, Tag } from 'antd';
import React, { useMemo } from 'react';
import { RiCheckLine, RiErrorWarningLine } from '@remixicon/react';
import { IRuleFormValues, useFormWatch } from '../..';
import { getRegexByType } from '../ExampleUrl';

export const TestMatch: React.FC = () => {
  const capture: IRuleFormValues['capture'] = useFormWatch(['capture']);

  const testReg = useMemo(() => {
    try {
      return getRegexByType(capture?.type ?? 'glob', capture?.globUrl);
    } catch (e) {
      console.warn(e);

      return;
    }
  }, [capture]);
  console.log(testReg,'testReg');
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
              const isMatch = testReg?.test(props.value);

              const color = isMatch ? 'text-green-500' : 'text-red-500';

              return (
                <Tag
                  closable={props.closable}
                  className={`${color} flex items-center`}
                >
                  <div className="flex items-center justify-center gap-1">
                    {isMatch ? (
                      <RiCheckLine size={12} />
                    ) : (
                      <RiErrorWarningLine size={12} />
                    )}
                    <span>{props.value}</span>
                  </div>
                </Tag>
              );
            }}
          />
        </div>
      </Form.Item>
    </>
  );
};
