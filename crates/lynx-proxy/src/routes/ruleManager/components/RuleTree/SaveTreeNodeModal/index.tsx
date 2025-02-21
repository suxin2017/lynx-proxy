import constate from 'constate';
import React, { useEffect } from 'react';
import { useImmer } from 'use-immer';
import {
  ContextDataType,
  IContentData,
  OperatorType,
  useMenuItemMap,
} from '../TreeContentMenu';
import { Form, Input, Modal } from 'antd';
import { useForm } from 'antd/es/form/Form';
import { useAddRule, useAddRuleGroup, useUpdateRule } from '@/api/rule';
import { message } from 'antd';

interface ISaveTreeNodeModalProps {}

export const SaveTreeNodeModal: React.FC<ISaveTreeNodeModalProps> = () => {
  const { open, type, closeModal, contextData } = useSaveTreeNodeModalContext();

  const menuItemMap = useMenuItemMap();
  const menuItem = React.useMemo(() => {
    if (!type) return null;
    return menuItemMap[type];
  }, [menuItemMap, type]);

  const title = React.useMemo(() => {
    if (!menuItem) return '';
    return menuItem.label;
  }, [menuItem]);
  const { mutateAsync: addRule } = useAddRule();
  const { mutateAsync: updateRule } = useUpdateRule();
  const { mutateAsync: addRuleGroup } = useAddRuleGroup();

  const [form] = useForm();

  useEffect(() => {
    switch (type) {
      case OperatorType.CreateGroup:
      case OperatorType.CreateRule:
        break;
      case OperatorType.EditRule:
        if (contextData?.type === ContextDataType.Rule) {
          form.setFieldsValue({ name: contextData.data.name });
        }
        break;
      case OperatorType.DeleteRule:
        break;
      default:
        break;
    }
  }, [contextData, form, type]);

  const closeModalAndResetData = () => {
    closeModal();
    form.resetFields();
  };

  return (
    <Modal
      open={open}
      title={title}
      onClose={closeModalAndResetData}
      onCancel={closeModalAndResetData}
      onOk={async () => {
        try {
          const values = await form.validateFields();
          switch (type) {
            case OperatorType.CreateGroup:
              await addRuleGroup({ name: values.name });
              closeModalAndResetData();
              break;
            case OperatorType.CreateRule: {
              let ruleGroupId;
              if (contextData?.type === ContextDataType.Rule) {
                ruleGroupId = contextData.data?.ruleGroupId;
              }
              if (contextData?.type === ContextDataType.Group) {
                ruleGroupId = contextData?.data.id;
              }
              if (!ruleGroupId) {
                message.error('ruleGroupId is required');
                return;
              }
              await addRule({
                ruleGroupId,
                name: values.name,
              });
              closeModalAndResetData();
              break;
            }
            case OperatorType.EditRule:
              if (contextData?.type !== ContextDataType.Rule) {
                message.error('contextData is not a rule');
                return;
              }
              await updateRule({
                id: contextData.data.id,
                name: values.name,
              });
              closeModalAndResetData();
              break;
            case OperatorType.DeleteRule:
              break;
            default:
              break;
          }
        } catch (e) {
          console.error(e);
        }
      }}
      width={320}
    >
      <Form form={form} layout="vertical">
        <Form.Item
          label="Name"
          name="name"
          required
          rules={[{ required: true, message: 'Name is required' }]}
        >
          <Input />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export const [SaveTreeNodeModalContextProvider, useSaveTreeNodeModalContext] =
  constate(() => {
    const [state, setState] = useImmer<{
      open: boolean;
      type?: OperatorType;
      contextData?: IContentData;
    }>({
      open: false,
    });

    const openModal = (type: OperatorType, contextData: IContentData) => {
      setState((draft) => {
        draft.open = true;
        draft.type = type;
        draft.contextData = contextData;
      });
    };

    const closeModal = () => {
      setState((draft) => {
        draft.open = false;
        draft.type = undefined;
        draft.contextData = undefined;
      });
    };

    return {
      openModal,

      closeModal,
      type: state.type,
      open: state.open,
      contextData: state.contextData,
    };
  });
