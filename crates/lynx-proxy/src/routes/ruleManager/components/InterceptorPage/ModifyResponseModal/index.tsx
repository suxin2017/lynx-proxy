import React, { useMemo, useState, useEffect } from 'react';
import { Modal, Button, Typography, message } from 'antd';
import { MonacoEditor } from '@/components/MonacoEditor';
import { useModifyResponseModal } from './context';
import { useUpdateRule, getListRulesQueryKey } from '@/services/generated/request-processing/request-processing';
import { useQueryClient } from '@tanstack/react-query';
import { HandlerRule } from '@/services/generated/utoipaAxum.schemas';

const { Title } = Typography;

export const ModifyResponseModal: React.FC = () => {
  const { state, closeModal } = useModifyResponseModal();
  const [editedContent, setEditedContent] = useState('');
  const queryClient = useQueryClient();
  const updateRuleMutation = useUpdateRule();

  // 当弹窗打开时，初始化编辑内容
  useEffect(() => {
    if (state.visible && state.responseContent) {
      setEditedContent(state.responseContent);
    }
  }, [state.visible, state.responseContent]);

  // 根据响应内容智能判断语言类型
  const editorLanguage = useMemo(() => {
    const content = state.responseContent?.trim();
    if (!content) return 'plaintext';
    
    // 判断是否为 JSON
    if ((content.startsWith('{') && content.endsWith('}')) || 
        (content.startsWith('[') && content.endsWith(']'))) {
      try {
        JSON.parse(content);
        return 'json';
      } catch {
        // 如果解析失败，继续其他判断
      }
    }
    
    // 判断是否为 HTML
    if (content.includes('<html') || content.includes('<!DOCTYPE') || 
        (content.includes('<') && content.includes('>'))) {
      return 'html';
    }
    
    // 判断是否为 XML
    if (content.startsWith('<?xml') || 
        (content.includes('<') && content.includes('>') && !content.includes('<html'))) {
      return 'xml';
    }
    
    // 判断是否为 CSS
    if (content.includes('{') && content.includes('}') && 
        (content.includes(':') || content.includes(';'))) {
      return 'css';
    }
    
    // 默认为纯文本
    return 'plaintext';
  }, [state.responseContent]);

  const handleOk = async () => {
    if (!state.ruleData) {
      message.error('规则数据不存在');
      return;
    }

    try {
      // 更新规则的响应体内容
      const updatedHandlers = state.ruleData.handlers.map((handler: HandlerRule) => {
        if (handler.handlerType.type === 'modifyResponse') {
          return {
            ...handler,
            handlerType: {
              ...handler.handlerType,
              modifyBody: editedContent
            }
          };
        }
        return handler;
      });

      const updateData = {
        ...state.ruleData,
        handlers: updatedHandlers
      };

      await updateRuleMutation.mutateAsync({
        id: state.ruleData.id,
        data: updateData
      });

      message.success('响应内容更新成功');
      // 刷新规则列表
      queryClient.invalidateQueries({ queryKey: getListRulesQueryKey() });
      closeModal();
    } catch (error) {
      console.error('更新规则失败:', error);
      message.error('更新失败，请重试');
    }
  };

  const handleCancel = () => {
    closeModal();
  };

  return (
    <Modal
      title="修改响应内容"
      open={state.visible}
      onOk={handleOk}
      onCancel={handleCancel}
      width={800}
      destroyOnClose
      footer={[
        <Button key="cancel" onClick={handleCancel}>
          取消
        </Button>,
        <Button 
          key="ok" 
          type="primary" 
          onClick={handleOk}
          loading={updateRuleMutation.isPending}
        >
          保存
        </Button>,
      ]}
    >
      <div>
        <MonacoEditor
          value={editedContent}
          onChange={(value) => setEditedContent(value || '')}
          language={editorLanguage}
          height={400}
          placeholder="请输入响应体内容"
          showToolbar={true}
          showLineNumbers={true}
          wordWrap={true}
          fontSize={14}
          showMinimap={false}
          readOnly={false}
        />
      </div>
    </Modal>
  );
};