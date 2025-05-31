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
    safeSetFormFields
} from './types';
import {
    useCreateRule,
    useUpdateRule,
    useGetRule,
    getListRulesQueryKey
} from '@/services/generated/request-processing/request-processing';
import { useQueryClient } from '@tanstack/react-query';

interface CreateRuleFormProps {
}

export const CreateRuleForm = forwardRef<{ submit: () => void }, CreateRuleFormProps>((props, ref) => {
    const { state, closeDrawer } = useCreateRuleDrawer();
    const [form] = Form.useForm<CreateRuleFormValues>();

    const queryClient = useQueryClient();
    // API hooks
    const createRuleMutation = useCreateRule({
        mutation: {
            onSuccess: () => {
                queryClient.invalidateQueries({ queryKey: getListRulesQueryKey() });
            }
        }
    });
    const updateRuleMutation = useUpdateRule({
        mutation: {
            onSuccess: () => {
                queryClient.invalidateQueries({ queryKey: getListRulesQueryKey() });
            }
        }
    });
    const { data: ruleData } = useGetRule(
        state.editingRuleId!,
        {
            query: {
                enabled: state.editMode && !!state.editingRuleId,
            }
        }
    );

    // 暴露submit方法给父组件
    useImperativeHandle(ref, () => ({
        submit: () => form.submit()
    }));

    // 在编辑模式下加载数据并设置表单初始值
    useEffect(() => {
        if (state.editMode && ruleData?.data) {
            const formValues = requestRuleToFormValues(ruleData.data);
            form.resetFields();
            safeSetFormFields(form, formValues);
        } else if (!state.editMode) {
            // 创建模式下重置表单
            form.resetFields();
            safeSetFormFields(form, getInitialFormValues());
        }
    }, [state.editMode, ruleData, form]);

    const handleSubmit = async (values: CreateRuleFormValues) => {
        try {
            console.log('表单数据:', values);

            // Convert form values to API request format
            const requestRule = formValuesToRequestRule(values);
            console.log('API请求数据:', requestRule);

            if (state.editMode && state.editingRuleId) {
                // 更新规则
                await updateRuleMutation.mutateAsync({
                    id: state.editingRuleId,
                    data: requestRule
                });
                message.success('规则更新成功');
            } else {
                // 创建规则
                await createRuleMutation.mutateAsync({
                    data: requestRule
                });
                message.success('规则创建成功');
            }

            closeDrawer();
        } catch (error) {
            console.error('Form submission error:', error);
            message.error('操作失败，请重试');
        }
    };

    return (
        <div className="flexflex-col">
            <Form
                form={form}
                layout="vertical"
                onFinish={handleSubmit}
                onValuesChange={(v) => {
                    console.log('表单变化:', v);
                }}
                className="flex-1 flex flex-col"
                initialValues={getInitialFormValues()}
            >
                <div className="flex-1 space-y-0">
                    {/* 第一部分：基础信息 */}
                    <BasicInfo />

                    {/* 第二部分：捕获规则 */}
                    <CaptureRule />

                    {/* 第三部分：处理行为 */}
                    <HandlerBehavior />
                </div>
            </Form>
        </div>
    );
});
