import { Drawer, Typography, Button, Space } from 'antd';
import React, { useRef } from 'react';
import { useCreateRuleDrawer } from './context';
import { CreateRuleForm } from './CreateRuleForm';
import { useI18n } from '@/contexts';

const { Title } = Typography;

interface CreateRuleDrawerProps {}

export const CreateRuleDrawer: React.FC<CreateRuleDrawerProps> = () => {
  const { state, closeDrawer } = useCreateRuleDrawer();
  const formRef = useRef<{ submit: () => void }>(null);
  const { t } = useI18n();

  const title = state.editMode
    ? t('ruleManager.createRuleDrawer.editTitle')
    : t('ruleManager.createRuleDrawer.createTitle');

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
            <Button onClick={closeDrawer}>
              {t('ruleManager.createRuleDrawer.cancel')}
            </Button>
            <Button type="primary" onClick={handleSubmit}>
              {state.editMode
                ? t('ruleManager.createRuleDrawer.save')
                : t('ruleManager.createRuleDrawer.create')}
            </Button>
          </Space>
        </div>
      }
      width={720}
      open={state.visible}
      onClose={closeDrawer}
      destroyOnClose
      closeIcon={false}
      footer={null}
    >
      <CreateRuleForm ref={formRef} />
    </Drawer>
  );
};
