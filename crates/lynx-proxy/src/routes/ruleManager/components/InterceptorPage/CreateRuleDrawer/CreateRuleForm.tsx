import { Form, message } from 'antd';
import React, { useEffect, useImperativeHandle, forwardRef } from 'react';
import { useCreateRuleDrawer } from './context';
import { BasicInfo } from './components/BasicInfo';
import { CaptureRule } from './components/CaptureRule';
import { HandlerBehavior } from './components';
import {
  CreateRuleFormValues,
  getInitialFormValues,
  formValuesToRequestRule,
  requestRuleToFormValues,
  safeSetFormFields,
} from './types';
import {
  useCreateRule,
  useUpdateRule,
  useGetRule,
  getListRulesQueryKey,
} from '@/services/generated/request-processing/request-processing';
import { useQueryClient } from '@tanstack/react-query';
import { useI18n } from '@/contexts';

interface CreateRuleFormProps {}

export const CreateRuleForm = forwardRef<
  { submit: () => void },
  CreateRuleFormProps
>((_, ref) => {
  const { state, closeDrawer } = useCreateRuleDrawer();
  const [form] = Form.useForm<CreateRuleFormValues>();
  const { t } = useI18n();

  const queryClient = useQueryClient();
  // API hooks
  const createRuleMutation = useCreateRule({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListRulesQueryKey() });
      },
    },
  });
  const updateRuleMutation = useUpdateRule({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListRulesQueryKey() });
      },
    },
  });
  const { data: ruleData } = useGetRule(state.editingRuleId!, {
    query: {
      enabled: state.editMode && !!state.editingRuleId,
    },
  });

  // Expose submit method to parent component
  useImperativeHandle(ref, () => ({
    submit: () => form.submit(),
  }));

  // In edit mode, load data and set form initial values
  useEffect(() => {
    if (state.editMode && ruleData?.data) {
      const formValues = requestRuleToFormValues(ruleData.data);
      form.resetFields();
      safeSetFormFields(form, formValues);
    } else if (!state.editMode) {
      // Reset form in create mode
      form.resetFields();
      safeSetFormFields(form, getInitialFormValues());
    }
  }, [state.editMode, ruleData, form]);

  const handleSubmit = async (values: CreateRuleFormValues) => {
    try {
      console.log('Form data:', values);

      // Convert form values to API request format
      const requestRule = formValuesToRequestRule(values);
      console.log('API request data:', requestRule);

      if (state.editMode && state.editingRuleId) {
        // 更新规则
        await updateRuleMutation.mutateAsync({
          id: state.editingRuleId,
          data: requestRule,
        });
        message.success(t('ruleManager.createRuleDrawer.updateSuccess'));
      } else {
        // 创建规则
        await createRuleMutation.mutateAsync({
          data: requestRule,
        });
        message.success(t('ruleManager.createRuleDrawer.createSuccess'));
      }

      closeDrawer();
    } catch (error) {
      console.error('Form submission error:', error);
      message.error(t('ruleManager.createRuleDrawer.operationFailed'));
    }
  };

  return (
    <div className="flex flex-col">
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        onValuesChange={(v) => {
          console.log('表单变化:', v);
        }}
        className="flex flex-1 flex-col"
        initialValues={getInitialFormValues()}
      >
        <div className="flex-1 flex flex-col">
          <BasicInfo />

          <CaptureRule />

          <HandlerBehavior />
        </div>
      </Form>
    </div>
  );
});

CreateRuleForm.displayName = 'CreateRuleForm';
