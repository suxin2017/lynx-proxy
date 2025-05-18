import { useEffect } from 'react';
import { Form, Button, Typography } from 'antd';
// import { useGetRuleDetailQuery, useUpdateRuleContent } from '@/api/rule';
import { useRuleContentState, useSelectedRuleContext } from '../store';
import { Capture } from './Capture';
import { HandlerType } from './Handler/constant';
import { NamePath } from 'antd/es/form/interface';
// import { Handler as HandlerData } from '@/api/type';
import { HandlerComponent } from './Handler';

const { Title, Text } = Typography;

enum CaptureType {
  Glob = 'glob',
  Regex = 'regex',
}

export interface IHandlerData<D, T extends HandlerType> {
  type: T;
  data: D;
}

export interface IRuleFormValues {
  capture?: {
    type?: CaptureType;
    globUrl?: string;
    regexUrl?: string;
  };
  handlers: Array<HandlerData>;
}

export const RuleFormItem = Form.Item<IRuleFormValues>;

export function useFormWatch(name: NamePath<IRuleFormValues>) {
  const form = Form.useFormInstance<IRuleFormValues>();
  return Form.useWatch(name, form);
}

export const RuleForm = () => {
  const [form] = Form.useForm<IRuleFormValues>();
  // const { mutateAsync: updateRule } = useUpdateRuleContent();
  const { selectedRule } = useSelectedRuleContext();
  // const { data } = useGetRuleDetailQuery({ id: selectedRule?.id });
  const { setState } = useRuleContentState();

  // useEffect(() => {
  //   // if (!data) {
  //   //   return;
  //   // }
  //   // const remoteData = data?.data;
  //   // console.log(
  //   //   data.data,
  //   //   {
  //   //     capture: {
  //   //       type: remoteData?.capture?.type || CaptureType.Glob,
  //   //       globUrl: remoteData?.capture?.url || '',
  //   //       regexUrl: remoteData?.capture?.url || '',
  //   //     },
  //   //     handlers: remoteData?.handlers,
  //   //   },
  //   //   'remoteData',
  //   // );
  //   // form.setFieldsValue({
  //   //   capture: {
  //   //     type: remoteData?.capture?.type || CaptureType.Glob,
  //   //     globUrl: remoteData?.capture?.url ?? '',
  //   //     regexUrl: remoteData?.capture?.url ?? '',
  //   //   },
  //   //   handlers: remoteData?.handlers,
  //   // });
  // }, [data, form]);

  return (
    <Form
      form={form}
      initialValues={{
        capture: {
          type: CaptureType.Glob,
          globUrl: '',
          regexUrl: '',
        },
        handlers: [],
      }}
      onFinish={async (values) => {
        if (selectedRule?.id) {
          await updateRule({
            id: selectedRule.id,
            capture: {
              type: values.capture.type,
              url:
                values.capture.type === CaptureType.Glob
                  ? values.capture.globUrl
                  : values.capture.regexUrl,
            },
            handlers: values.handlers,
          });
        }
      }}
      className="flex h-full flex-col"
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
        <HandlerComponent />
      </div>

      <RuleFormItem className="">
        <Button type="primary" htmlType="submit">
          Submit
        </Button>
      </RuleFormItem>
    </Form>
  );
};
