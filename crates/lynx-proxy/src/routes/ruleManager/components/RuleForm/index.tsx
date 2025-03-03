import { useEffect } from 'react';
import { Form, Button, Typography } from 'antd';
import { useGetRuleDetailQuery, useUpdateRuleName } from '@/api/rule';
import { useRuleContentState, useSelectedRuleContext } from '../store';
import { Capture } from './Capture';
import { Handler } from './Handler';
import { HandlerType } from './Handler/constant';
import { IConnectPassProxyData } from './Handler/Connect';
import { NamePath } from 'antd/es/form/interface';

const { Title, Text } = Typography;

enum CaptureType {
  Glob = 'glob',
  Regex = 'regex',
}

export interface IHandlerData<D, T extends HandlerType> {
  switch: boolean,
  type: T,
  data: D
}

export interface IRuleFormValues {
  capture: {
    type: CaptureType;
    globUrl: string;
    regexUrl: string;
  };
  handlers: Array<IConnectPassProxyData>;
}


export const RuleFormItem = Form.Item<IRuleFormValues>;
export const formKeys = {
  captureType: ['capture', 'type'],
  captureGlobUrl: ['capture', 'globUrl'],
  captureRegexUrl: ['capture', 'regexUrl'],
  capture: ['capture'],
  handlers: 'handlers',
} as const;


export function useFormInstance() {
  const form = Form.useFormInstance<IRuleFormValues>();
}

export function useFormWatch(name: NamePath<IRuleFormValues>) {
  const form = Form.useFormInstance<IRuleFormValues>();
  return Form.useWatch(name, form);
}

export const RuleForm = () => {
  const [form] = Form.useForm<IRuleFormValues>();
  const { mutateAsync: updateRule } = useUpdateRuleName();
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
      className="h-full flex flex-col"
      layout="vertical"
      onValuesChange={(value) => {
        console.log(value, 'value');

        setState((draft) => {
          draft.isChanged = true;
        });
      }}
    >

      <div className="flex-1">
        <Title level={3} className="m-0">
          Rule Content
          <Text type="secondary" className="pl-1">
            ({selectedRule?.name})
          </Text>
        </Title>

        <Capture />
        <Handler />
      </div>


      <RuleFormItem className="">
        <Button type="primary" htmlType="submit">
          Submit
        </Button>
      </RuleFormItem>
    </Form>
  );
};
