import React from 'react';
import { Button, Modal, Select, message } from 'antd';
import { RiDownloadLine } from '@remixicon/react';
import { useI18n } from '@/contexts';
import { useListRules } from '@/services/generated/request-processing/request-processing';
import { RequestRule } from '@/services/generated/utoipaAxum.schemas';

interface ExportRulesButtonProps {
  selectedRules?: RequestRule[];
  selectedRowKeys?: React.Key[];
}

export const ExportRulesButton: React.FC<ExportRulesButtonProps> = ({
  selectedRules = [],
  selectedRowKeys = [],
}) => {
  const { t } = useI18n();
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [exportType, setExportType] = React.useState<'selected' | 'all'>('all');

  // 获取所有规则用于导出
  const { data: allRulesData } = useListRules({
    page: 1,
    pageSize: 10000, // 获取所有规则
  });

  const handleExport = () => {
    try {
      let rulesToExport: RequestRule[] = [];

      if (exportType === 'selected') {
        if (selectedRules.length === 0) {
          message.warning(t('ruleManager.export.noSelectedRules'));
          return;
        }
        rulesToExport = selectedRules;
      } else {
        rulesToExport = allRulesData?.data.rules || [];
      }

      if (rulesToExport.length === 0) {
        message.warning(t('ruleManager.export.noRulesToExport'));
        return;
      }

      const exportData = {
        version: '1.0.0',
        exportTime: new Date().toISOString(),
        rules: rulesToExport.map(rule => ({
          name: rule.name,
          description: rule.description,
          enabled: rule.enabled,
          priority: rule.priority,
          capture: rule.capture ? {
            // 移除capture中的id字段，只保留condition
            condition: rule.capture.condition,
          } : undefined,
          handlers: rule.handlers,
        })),
      };

      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `lynx-rules-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      message.success(t('ruleManager.export.success'));
      setIsModalOpen(false);
    } catch (error) {
      console.error('Export failed:', error);
      message.error(t('ruleManager.export.error'));
    }
  };

  const showModal = () => {
    setIsModalOpen(true);
  };

  const handleCancel = () => {
    setIsModalOpen(false);
  };

  return (
    <>
      <Button
        icon={<RiDownloadLine size={16} />}
        onClick={showModal}
      >
        {t('ruleManager.export.title')}
      </Button>

      <Modal
        title={t('ruleManager.export.modalTitle')}
        open={isModalOpen}
        onOk={handleExport}
        onCancel={handleCancel}
        okText={t('ruleManager.export.confirm')}
        cancelText={t('ruleManager.export.cancel')}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('ruleManager.export.exportType')}
            </label>
            <Select
              value={exportType}
              onChange={setExportType}
              style={{ width: '100%' }}
              options={[
                {
                  value: 'all',
                  label: t('ruleManager.export.exportAll'),
                },
                {
                  value: 'selected',
                  label: t('ruleManager.export.exportSelected'),
                  disabled: selectedRowKeys.length === 0,
                },
              ]}
            />
          </div>
        </div>
      </Modal>
    </>
  );
};
