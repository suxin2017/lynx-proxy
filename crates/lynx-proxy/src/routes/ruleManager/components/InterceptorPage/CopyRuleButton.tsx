import { RequestRule } from '@/services/generated/utoipaAxum.schemas';
import { useCreateRule } from '@/services/generated/request-processing/request-processing';
import { RiFileCopyLine } from '@remixicon/react';
import { Button, Modal } from 'antd';
import React from 'react';

interface CopyRuleButtonProps {
  record: RequestRule;
  onSuccess?: () => void;
}

export const CopyRuleButton: React.FC<CopyRuleButtonProps> = ({
  record,
  onSuccess,
}) => {
  // 创建规则
  const createRuleMutation = useCreateRule({
    mutation: {
      onSuccess: () => {
        onSuccess?.();
      },
    },
  });

  // 深度清除对象中所有的id属性
  const clearAllIds = (obj: any): any => {
    if (!obj || typeof obj !== 'object') return obj;
    
    // 处理数组
    if (Array.isArray(obj)) {
      return obj.map(item => clearAllIds(item));
    }
    
    // 处理对象
    const newObj = { ...obj };
    
    // 删除id属性
    delete newObj.id;
    
    // 递归处理所有子对象
    for (const key in newObj) {
      if (typeof newObj[key] === 'object' && newObj[key] !== null) {
        newObj[key] = clearAllIds(newObj[key]);
      }
    }
    
    return newObj;
  };

  const handleCopy = () => {
    if (!record) return;
    
    Modal.confirm({
      title: '确认复制',
      content: `确定要复制规则 "${record.name}" 吗？`,
      okText: '复制',
      cancelText: '取消',
      onOk: async () => {
        try {
          // 创建规则副本并清除所有id
          const ruleCopy = clearAllIds(record);
          
          // 设置新名称
          ruleCopy.name = `${record.name} (副本)`;
          
          createRuleMutation.mutate({
            data: ruleCopy
          });
        } catch (error) {
          console.error('复制规则失败:', error);
        }
      }
    });
  };

  return (
    <Button 
      type="text" 
      icon={<RiFileCopyLine size={14} />}
      onClick={handleCopy}
    />
  );
};
