import { Drawer, Typography, Button, Space } from 'antd';
import React, { useRef } from 'react';
import { useCreateRuleDrawer } from './context';
import { CreateRuleForm } from './CreateRuleForm';

const { Title } = Typography;

interface CreateRuleDrawerProps { }

export const CreateRuleDrawer: React.FC<CreateRuleDrawerProps> = () => {
  const { state, closeDrawer } = useCreateRuleDrawer();
  const formRef = useRef<{ submit: () => void }>(null);

  const title = state.editMode ? '编辑拦截规则' : '创建拦截规则';

  const handleSubmit = () => {
    if (formRef.current) {
      formRef.current.submit();
    }
  };

  return (
    <Drawer
      title={
        <div className="flex items-center justify-between">
          <Title level={4} style={{ margin: 0 }}>
            {title}
          </Title>
          <Space>
            <Button onClick={closeDrawer}>取消</Button>
            <Button type="primary" onClick={handleSubmit}>
              {state.editMode ? '保存修改' : '创建规则'}
            </Button>
          </Space>
        </div>
      }
      width={720}
      open={state.visible}
      onClose={closeDrawer}
      destroyOnHidden
      closeIcon={false}
      footer={null}
    >
      <CreateRuleForm ref={formRef} />
    </Drawer>
  );
};
