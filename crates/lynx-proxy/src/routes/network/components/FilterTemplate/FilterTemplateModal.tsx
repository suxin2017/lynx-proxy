import { message, Modal } from 'antd';
import React from 'react';
import { useFilterTemplate } from './context';
import { TemplateEditor } from './TemplateEditor';
import { TemplateList } from './TemplateList';

export const FilterTemplateModal: React.FC = () => {
  const {
    state,
    closeModal,
    saveTemplate,
  } = useFilterTemplate();

  const handleSave = () => {
    if (!state.currentTemplate) {
      message.error('请选择或创建一个模板');
      return;
    }

    if (!state.currentTemplate.name.trim()) {
      message.error('请输入模板名称');
      return;
    }

    if (state.currentTemplate.conditions.length === 0) {
      message.error('请至少添加一个过滤条件');
      return;
    }

    // 验证所有条件
    const invalidConditions = state.currentTemplate.conditions.filter(
      condition => !condition.value.trim()
    );

    if (invalidConditions.length > 0) {
      message.error('请填写所有过滤条件的值');
      return;
    }

    saveTemplate(state.currentTemplate);
    message.success('模板保存成功');
  };

  const handleCancel = () => {
    if (state.hasUnsavedChanges) {
      Modal.confirm({
        title: '确认关闭',
        content: '您有未保存的更改，确定要关闭吗？',
        onOk: closeModal,
      });
    } else {
      closeModal();
    }
  };

  return (
    <Modal
      title="过滤模板管理"
      open={state.isModalVisible}
      onCancel={handleCancel}
      onOk={handleSave}
      okText="保存"
      cancelText="取消"
      width={1000}
      styles={{ body: { padding: 0 } }}
      okButtonProps={{
        disabled: !state.currentTemplate || !state.isEditing,
      }}
    >
      <div className="flex h-[600px] gap-4">
        <div className="border-r border-gray-200 overflow-auto">
          <TemplateList />
        </div>
        <div className="flex-1 overflow-auto">
          <TemplateEditor />
        </div>
      </div>
    </Modal>
  );
};