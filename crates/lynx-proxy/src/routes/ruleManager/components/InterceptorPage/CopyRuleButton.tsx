import { RequestRule } from '@/services/generated/utoipaAxum.schemas';
import { useCreateRule } from '@/services/generated/request-processing/request-processing';
import { RiFileCopyLine } from '@remixicon/react';
import { Button, Modal } from 'antd';
import React from 'react';
import { useI18n } from '@/contexts';

interface CopyRuleButtonProps {
  record: RequestRule;
  onSuccess?: () => void;
}

export const CopyRuleButton: React.FC<CopyRuleButtonProps> = ({
  record,
  onSuccess,
}) => {
  const { t } = useI18n();

  // Create rule
  const createRuleMutation = useCreateRule({
    mutation: {
      onSuccess: () => {
        onSuccess?.();
      },
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const clearAllIds = (obj: any): any => {
    if (!obj || typeof obj !== 'object') return obj;

    if (Array.isArray(obj)) {
      return obj.map((item) => clearAllIds(item));
    }

    const newObj = { ...obj };

    delete newObj.id;

    for (const key in newObj) {
      if (typeof newObj[key] === 'object' && newObj[key] !== null) {
        newObj[key] = clearAllIds(newObj[key]);
      }
    }

    return newObj;
  };

  const [modal, conextHolder] = Modal.useModal();
  const handleCopy = () => {
    if (!record) return;

    modal.confirm({
      title: t('ruleManager.copyConfirm.title'),
      content: t('ruleManager.copyConfirm.content', { name: record.name }),
      okText: t('ruleManager.copyConfirm.okText'),
      cancelText: t('ruleManager.copyConfirm.cancelText'),
      onOk: async () => {
        try {
          const ruleCopy = clearAllIds(record);

          ruleCopy.name = t('ruleManager.copyRuleName', { name: record.name });

          createRuleMutation.mutate({
            data: ruleCopy,
          });
        } catch (error) {
          console.error(t('ruleManager.copyRuleError'), error);
        }
      },
    });
  };

  return (
    <>
      {conextHolder}
      <Button
        type="text"
        icon={<RiFileCopyLine size={14} />}
        onClick={handleCopy}
      />
    </>

  );
};
