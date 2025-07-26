import React from 'react';
import { Form, Input, Button, Space, Typography, Empty, Card, Switch } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useFilterTemplate } from './context';
import { FilterConditionEditor } from './FilterConditionEditor';

const { Title, Text } = Typography;
const { TextArea } = Input;

export const TemplateEditor: React.FC = () => {
  const {
    state,
    updateCurrentTemplate,
    addCondition,
  } = useFilterTemplate();

  const { currentTemplate, isEditing } = state;

  if (!currentTemplate) {
    return (
      <div className="p-6 h-full flex items-center justify-center">
        <Empty
          description="请选择一个模板或创建新模板"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      </div>
    );
  }

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateCurrentTemplate({ name: e.target.value });
  };

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateCurrentTemplate({ description: e.target.value });
  };

  const handleAddCondition = () => {
    addCondition();
  };

  return (
    <div className="p-6 fle-1 overflow-auto">
      <div className="mb-6">
        <Title level={5} className="m-0 mb-4">
          {isEditing ? '编辑模板' : '查看模板'}
          {currentTemplate.isPreset && (
            <Text type="secondary" className="ml-2 text-xs">
              (预制模板)
            </Text>
          )}
        </Title>

        <Form layout="vertical">
          <Form.Item label="模板名称" required>
            <Input
              value={currentTemplate.name}
              onChange={handleNameChange}
              placeholder="请输入模板名称"
              disabled={!isEditing}
            />
          </Form.Item>

          <Form.Item label="启用状态">
            <div className="flex items-center gap-2">
              <Switch
                 checked={currentTemplate.enabled}
                 onChange={(checked) => {
                   updateCurrentTemplate({ enabled: checked });
                 }}
                 disabled={!isEditing}
               />
              <Text type="secondary" className="text-sm">
                {currentTemplate.enabled ? '已启用' : '已禁用'}
              </Text>
            </div>
          </Form.Item>

          <Form.Item label="描述">
            <TextArea
              value={currentTemplate.description || ''}
              onChange={handleDescriptionChange}
              placeholder="请输入模板描述（可选）"
              rows={2}
              disabled={!isEditing}
            />
          </Form.Item>
        </Form>
      </div>

      <div>
        <div className="flex justify-between items-center mb-4">
          <Title level={5} className="!m-0">过滤条件</Title>
          {isEditing && (
            <Button
              type="dashed"
              icon={<PlusOutlined />}
              onClick={handleAddCondition}
              
            >
              添加条件
            </Button>
          )}
        </div>

        {currentTemplate.conditions.length === 0 ? (
          <Card>
            <Empty
              description="暂无过滤条件"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            >
              {isEditing && (
                <Button type="primary" icon={<PlusOutlined />} onClick={handleAddCondition}>
                  添加第一个条件
                </Button>
              )}
            </Empty>
          </Card>
        ) : (
          <Space direction="vertical" className="w-full" size={12}>
            {currentTemplate.conditions.map((condition) => (
              <FilterConditionEditor
                key={condition.id}
                condition={condition}
                disabled={!isEditing}
              />
            ))}
          </Space>
        )}
      </div>
    </div>
  );
};