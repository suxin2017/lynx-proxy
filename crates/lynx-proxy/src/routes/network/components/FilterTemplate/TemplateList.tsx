import React from 'react';
import { List, Button, Space, Typography, Tag, Popconfirm, Modal, Switch } from 'antd';
import { PlusOutlined, DeleteOutlined, CopyOutlined } from '@ant-design/icons';
import { useFilterTemplate } from './context';
import { FilterTemplate } from './types';

const { Text, Title } = Typography;

export const TemplateList: React.FC = () => {
  const {
    state,
    selectTemplate,
    createNewTemplate,
    editTemplate,
    deleteTemplate,
    toggleTemplateEnabled,
  } = useFilterTemplate();

  const handleSelectTemplate = (template: FilterTemplate) => {
    if (state.hasUnsavedChanges) {
      Modal.confirm({
        title: '确认切换',
        content: '您有未保存的更改，确定要切换到其他模板吗？',
        onOk: () => selectTemplate(template),
      });
    } else {
      selectTemplate(template);
    }
  };

  const handleEditTemplate = (template: FilterTemplate) => {
    if (state.hasUnsavedChanges) {
      Modal.confirm({
        title: '确认编辑',
        content: '您有未保存的更改，确定要编辑其他模板吗？',
        onOk: () => editTemplate(template),
      });
    } else {
      editTemplate(template);
    }
  };

  const handleCreateNew = () => {
    if (state.hasUnsavedChanges) {
      Modal.confirm({
        title: '确认创建',
        content: '您有未保存的更改，确定要创建新模板吗？',
        onOk: createNewTemplate,
      });
    } else {
      createNewTemplate();
    }
  };

  const allTemplates = [...state.templates].sort((a, b) => {
    // 自定义模板排在预设模板之前
    if (a.isPreset && !b.isPreset) return 1;
    if (!a.isPreset && b.isPreset) return -1;
    return 0;
  });

  return (
    <div className="p-4 h-full flex flex-col">
      <div className="mb-4">
        <Title level={5} className="!m-0 !mb-2">过滤模板</Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleCreateNew}
          block
        >
          新建模板
        </Button>
      </div>

      <div className="flex-1 overflow-auto">
        <List
          dataSource={allTemplates}
          renderItem={(template) => (
            <List.Item
              className={`rounded mb-1 px-3 py-2 cursor-pointer transition-colors ${
                state.currentTemplate?.id === template.id 
                  ? 'bg-green-50 border border-green-300' 
                  : 'border border-transparent hover:bg-gray-50'
              }`}
              onClick={() =>{ 
                if(template.isPreset){
                  handleSelectTemplate(template);
                }else{
                     handleEditTemplate(template);

                }
              }}
            >
              <div className="w-full">
                <div className="flex justify-between items-center mb-1">
                  <div className="flex-1 min-w-0 flex items-center gap-2">
                    <Switch
                      size="small"
                      checked={template.enabled}
                      onChange={() => {
                        toggleTemplateEnabled(template.id);
                      }}
                      onClick={(_, e) => e.stopPropagation()}
                    />
                    <Text strong className={`text-sm ${!template.enabled ? 'text-gray-400' : ''}`}>
                      {template.name}
                    </Text>
                    {template.isPreset && (
                      <Tag color="blue" className="ml-1 text-xs">
                        预制
                      </Tag>
                    )}
                  </div>
                  <Space>
                    {template.isPreset ? (
                      <Button
                        size="small"
                        type="text"
                        icon={<CopyOutlined />}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditTemplate(template);
                        }}
                        title="复制模板"
                      />
                    ) : (
                      <>
                        <Button
                          size="small"
                          type="text"
                          icon={<CopyOutlined />}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditTemplate(template);
                          }}
                          title="复制模板"
                        />
                        <Popconfirm
                          title="确定删除此模板吗？"
                          onConfirm={(e) => {
                            e?.stopPropagation();
                            deleteTemplate(template.id);
                          }}
                        >
                          <Button
                            type="text"
                            icon={<DeleteOutlined />}
                            danger
                            title="删除模板"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </Popconfirm>
                      </>
                    )}
                  </Space>
                </div>
                {template.description && (
                  <Text type="secondary" className="text-xs block">
                    {template.description}
                  </Text>
                )}
                <Text type="secondary" className="text-xs">
                  {template.conditions.length} 个条件
                </Text>
              </div>
            </List.Item>
          )}
        />
      </div>
    </div>
  );
};