import constate from 'constate';
import React from 'react';
import { useImmer } from 'use-immer';
import { IContentData, OperatorType, useMenuItemMap } from '../TreeContentMenu';
import { Form, Input, Modal } from 'antd';
import { useForm } from 'antd/es/form/Form';

interface ISaveTreeNodeModalProps {}

export const SaveTreeNodeModal: React.FC<ISaveTreeNodeModalProps> = (props) => {
  const { open, contentData, type, closeModal } = useSaveTreeNodeModalContext();

  const menuItemMap = useMenuItemMap();
  const menuItem = React.useMemo(() => {
    if (!type) return null;
    return menuItemMap[type];
  }, [menuItemMap, type]);

  const title = React.useMemo(() => {
    if (!menuItem) return '';
    return menuItem.label;
  }, [menuItem]);

  const [form] = useForm();
  return (
    <Modal
      open={open}
      title={title}
      onClose={closeModal}
      onCancel={closeModal}
      onOk={closeModal}
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
      contentData: unknown;
    }>({
      open: false,
      contentData: {},
    });

    const openModal = (type: OperatorType) => {
      setState((draft) => {
        draft.open = true;
        draft.type = type;
      });
    };

    const closeModal = () => {
      setState((draft) => {
        draft.open = false;
        draft.type = undefined;
        draft.contentData = {} as IContentData;
      });
    };

    return {
      openModal,

      closeModal,
      type: state.type,
      open: state.open,
      contentData: state.contentData,
    };
  });
