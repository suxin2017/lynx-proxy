import React from 'react';
import { Button, Modal, Upload, message, Checkbox, Table, Tag } from 'antd';
import { RiUploadLine, RiFileTextLine } from '@remixicon/react';
import type { UploadFile } from 'antd/es/upload/interface';
import { useI18n } from '@/contexts';
import { useCreateRule } from '@/services/generated/request-processing/request-processing';
import { RequestRule } from '@/services/generated/utoipaAxum.schemas';

interface ImportRulesButtonProps {
  onSuccess?: () => void;
}

interface ImportRule extends Omit<RequestRule, 'id'> {
  id?: number;
  selected?: boolean;
}

interface ImportData {
  version: string;
  exportTime: string;
  rules: ImportRule[];
}

export const ImportRulesButton: React.FC<ImportRulesButtonProps> = ({
  onSuccess,
}) => {
  const { t } = useI18n();
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [importData, setImportData] = React.useState<ImportData | null>(null);
  const [selectedRules, setSelectedRules] = React.useState<ImportRule[]>([]);
  const [loading, setLoading] = React.useState(false);

  const createRuleMutation = useCreateRule({
    mutation: {
      onSuccess: () => {
        // 单个规则导入成功后不做任何操作，等待所有规则导入完成
      },
      onError: (error) => {
        console.error('Create rule failed:', error);
      },
    },
  });

  const handleFileUpload = (file: UploadFile) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data: ImportData = JSON.parse(content);

        // 验证导入数据格式
        if (!data.version || !data.rules || !Array.isArray(data.rules)) {
          throw new Error('Invalid import file format');
        }

        // 验证规则数据
        const validRules = data.rules.filter(rule => {
          if (!rule.name || typeof rule.name !== 'string') {
            console.warn('Rule missing name:', rule);
            return false;
          }
          if (!rule.capture || typeof rule.capture !== 'object') {
            console.warn('Rule missing capture:', rule);
            return false;
          }
          if (!Array.isArray(rule.handlers)) {
            console.warn('Rule missing handlers array:', rule);
            return false;
          }
          return true;
        });

        if (validRules.length === 0) {
          throw new Error('No valid rules found in import file');
        }

        // 为每个规则添加选中状态和默认值
        const rulesWithSelection = validRules.map(rule => ({
          ...rule,
          selected: true,
          enabled: rule.enabled ?? true,
          priority: typeof rule.priority === 'number' ? rule.priority : 50,
          description: rule.description || null,
        }));

        setImportData({
          ...data,
          rules: rulesWithSelection,
        });
        setSelectedRules(rulesWithSelection);

        if (validRules.length !== data.rules.length) {
          message.warning(
            t('ruleManager.import.partialValidation', {
              valid: validRules.length,
              total: data.rules.length,
            })
          );
        } else {
          message.success(t('ruleManager.import.fileLoaded'));
        }
      } catch (error) {
        console.error('Parse import file failed:', error);
        message.error(t('ruleManager.import.parseError'));
      }
    };
    reader.readAsText(file as unknown as Blob);
    return false; // 阻止默认上传行为
  };

  const handleImport = async () => {
    if (!importData || selectedRules.length === 0) {
      message.warning(t('ruleManager.import.noRulesSelected'));
      return;
    }

    setLoading(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      // 批量导入规则
      for (const rule of selectedRules) {
        if (rule.selected) {
          try {
            // 数据验证和清理
            const cleanedRule = {
              name: rule.name || 'Imported Rule',
              description: rule.description || null,
              enabled: rule.enabled ?? true,
              priority: Math.max(0, Math.min(100, rule.priority || 50)), // 确保优先级在0-100之间
              capture: rule.capture ? {
                // 移除capture中的id字段，只保留condition
                condition: rule.capture.condition ? (() => {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const originalCondition = rule.capture.condition as any;
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const cleanedCondition: any = {
                    type: originalCondition.type || 'simple',
                  };

                  // 处理urlPattern
                  if (originalCondition.urlPattern) {
                    cleanedCondition.urlPattern = originalCondition.urlPattern;
                  } else {
                    cleanedCondition.urlPattern = {
                      pattern: '*',
                      captureType: 'glob',
                    };
                  }

                  // 只添加非null的可选字段
                  if (originalCondition.method) {
                    cleanedCondition.method = originalCondition.method;
                  }
                  if (originalCondition.host) {
                    cleanedCondition.host = originalCondition.host;
                  }
                  if (originalCondition.headers) {
                    cleanedCondition.headers = originalCondition.headers;
                  }

                  return cleanedCondition;
                })() : {
                  type: 'simple',
                  urlPattern: {
                    pattern: '*',
                    captureType: 'glob',
                  },
                },
              } : {
                condition: {
                  type: 'simple',
                  urlPattern: {
                    pattern: '*',
                    captureType: 'glob',
                  },
                },
              },
              handlers: Array.isArray(rule.handlers) ? rule.handlers.map((handler, index) => ({
                name: handler.name || `Handler ${index + 1}`,
                description: handler.description || null,
                enabled: handler.enabled ?? true,
                executionOrder: handler.executionOrder ?? index,
                handlerType: handler.handlerType || {
                  type: 'block',
                  statusCode: 403,
                  reason: 'Blocked by imported rule',
                },
              })) : [],
            };

            // 调试日志
            console.log('Importing rule:', {
              original: rule,
              cleaned: cleanedRule,
            });

            await createRuleMutation.mutateAsync({
              data: cleanedRule,
            });
            successCount++;
          } catch (error) {
            console.error(`Failed to import rule: ${rule.name}`, error);
            errorCount++;
          }
        }
      }

      if (successCount > 0) {
        message.success(
          t('ruleManager.import.success', {
            success: successCount,
            total: selectedRules.filter(r => r.selected).length,
          })
        );
        onSuccess?.();
      }

      if (errorCount > 0) {
        message.warning(
          t('ruleManager.import.partialSuccess', {
            success: successCount,
            error: errorCount,
          })
        );
      }

      setIsModalOpen(false);
      setImportData(null);
      setSelectedRules([]);
    } catch (error) {
      console.error('Import failed:', error);
      message.error(t('ruleManager.import.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setIsModalOpen(false);
    setImportData(null);
    setSelectedRules([]);
  };

  const handleRuleSelection = (rule: ImportRule, checked: boolean) => {
    const updatedRules = selectedRules.map(r =>
      r.name === rule.name ? { ...r, selected: checked } : r
    );
    setSelectedRules(updatedRules);

    if (importData) {
      setImportData({
        ...importData,
        rules: updatedRules,
      });
    }
  };

  const handleSelectAll = (checked: boolean) => {
    const updatedRules = selectedRules.map(r => ({ ...r, selected: checked }));
    setSelectedRules(updatedRules);

    if (importData) {
      setImportData({
        ...importData,
        rules: updatedRules,
      });
    }
  };

  const columns = [
    {
      title: (
        <Checkbox
          checked={selectedRules.every(r => r.selected)}
          indeterminate={selectedRules.some(r => r.selected) && !selectedRules.every(r => r.selected)}
          onChange={(e) => handleSelectAll(e.target.checked)}
        >
          {t('ruleManager.import.selectAll')}
        </Checkbox>
      ),
      width: 80,
      render: (_: unknown, record: ImportRule) => (
        <Checkbox
          checked={record.selected}
          onChange={(e) => handleRuleSelection(record, e.target.checked)}
        />
      ),
    },
    {
      title: t('ruleManager.table.ruleName'),
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: ImportRule) => (
        <div>
          <div className="font-medium">{name}</div>
          {record.description && (
            <div className="text-sm text-gray-500">{record.description}</div>
          )}
        </div>
      ),
    },
    {
      title: t('ruleManager.table.status'),
      dataIndex: 'enabled',
      key: 'enabled',
      width: 80,
      render: (enabled: boolean) => (
        <Tag color={enabled ? 'green' : 'red'}>
          {enabled ? t('ruleManager.import.enabled') : t('ruleManager.import.disabled')}
        </Tag>
      ),
    },
    {
      title: t('ruleManager.table.priority'),
      dataIndex: 'priority',
      key: 'priority',
      width: 80,
    },
  ];

  return (
    <>
      <Button
        icon={<RiUploadLine size={16} />}
        onClick={() => setIsModalOpen(true)}
      >
        {t('ruleManager.import.title')}
      </Button>

      <Modal
        title={t('ruleManager.import.modalTitle')}
        open={isModalOpen}
        onOk={handleImport}
        onCancel={handleCancel}
        okText={t('ruleManager.import.confirm')}
        cancelText={t('ruleManager.import.cancel')}
        width={800}
        confirmLoading={loading}
        okButtonProps={{
          disabled: !importData || selectedRules.filter(r => r.selected).length === 0,
        }}
      >
        <div className="space-y-4">
          {!importData ? (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8">
              <Upload.Dragger
                accept=".json"
                beforeUpload={handleFileUpload}
                showUploadList={false}
                multiple={false}
              >
                <div className="text-center">
                  <RiFileTextLine size={48} className="mx-auto text-gray-400 mb-4" />
                  <p className="text-lg font-medium text-gray-900 mb-2">
                    {t('ruleManager.import.uploadTitle')}
                  </p>
                  <p className="text-sm text-gray-500">
                    {t('ruleManager.import.uploadDescription')}
                  </p>
                </div>
              </Upload.Dragger>
            </div>
          ) : (
            <div>
              <div className="mb-4">
                <h4 className="font-medium text-gray-900 mb-2">
                  {t('ruleManager.import.selectRules')}
                </h4>
                <Table
                  columns={columns}
                  dataSource={selectedRules}
                  rowKey="name"
                  pagination={false}
                  size="small"
                  scroll={{ y: 300 }}
                />
              </div>

              <div className="text-sm text-gray-500">
                {t('ruleManager.import.selectedCount', {
                  count: selectedRules.filter(r => r.selected).length,
                })}
              </div>
            </div>
          )}
        </div>
      </Modal>
    </>
  );
};
