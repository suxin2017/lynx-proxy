import { useEffect } from 'react';
import { Form, Button, Typography } from 'antd';
import { useGetRuleDetailQuery, useUpdateRule } from '@/api/rule';
import { useRuleContentState, useSelectedRuleContext } from '../store';
import { Capture } from './Capture';
import { Handler } from './Handler';

const { Title, Text } = Typography;

enum CaptureType {
  Glob = 'glob',
  Regex = 'regex',
}

export interface IRuleFormValues {
  capture: {
    type: CaptureType;
    globUrl: string;
    regexUrl: string;
  };
  handler: {
    proxyPass: string;
  };
}

export const formKeys = {
  captureType: 'capture.type',
  captureGlobUrl: 'capture.globUrl',
  captureRegexUrl: 'capture.regexUrl',
  handlerProxyPass: 'handler.proxyPass',
  capture: 'capture',
  handler: 'handler',
};

export function useFormInstance() {
  return Form.useForm<IRuleFormValues>();
}

export function useFormWatch(name: string | string[]) {
  const form = Form.useFormInstance();
  return Form.useWatch(name, form);
}

export const RuleForm = () => {
  const [form] = Form.useForm<IRuleFormValues>();
  const { mutateAsync: updateRule } = useUpdateRule();
  const { selectedRule } = useSelectedRuleContext();
  const { data } = useGetRuleDetailQuery({ id: selectedRule?.id });
  const { setState } = useRuleContentState();

  useEffect(() => {
    form.setFieldsValue(data?.data);
  }, [data, form]);

  return (
    <Form
      form={form}
      initialValues={data?.data}
      onFinish={async (values) => {
        if (selectedRule?.id) {
          await updateRule({
            id: selectedRule.id,
            content: values,
          });
        }
      }}
      layout="vertical"
      onValuesChange={() => {
        setState((draft) => {
          draft.isChanged = true;
        });
      }}
    >
      <Title level={3} className="m-0">
        Rule Content
        <Text type="secondary" className="pl-1">
          ({selectedRule?.name})
        </Text>
      </Title>

      <Capture />
      <Handler />

      <Form.Item>
        <Button type="primary" htmlType="submit">
          Submit
        </Button>
      </Form.Item>
    </Form>
  );
};
