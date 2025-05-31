import { CommonCard } from '@/routes/settings/components/CommonCard';
import {
  RiAddLine,
  RiDeleteBinLine,
  RiEditLine,
} from '@remixicon/react';
import {
  Button,
  Modal,
  Space,
  Switch,
  Table,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import React from 'react';
import { RequestRule } from '@/services/generated/utoipaAxum.schemas';
import { useDeleteRule, useListRules, useToggleRule } from '@/services/generated/request-processing/request-processing';
import { ConditionsText } from './InterceptorPage/ConditionsText';
import { ActionCell } from './InterceptorPage/ActionCell';
import { CreateRuleDrawer, CreateRuleDrawerProvider, useCreateRuleDrawer } from './InterceptorPage/CreateRuleDrawer';
import { CopyRuleButton } from './InterceptorPage/CopyRuleButton';

const { Title, Text } = Typography;

const InnerInterceptorPage: React.FC = () => {
  const [pageParameters, setPageParameters] = React.useState({
    page: 1,
    pageSize: 10,
  });
  const { data: listRulesData, refetch: refetchRules } = useListRules(pageParameters);
  const { openDrawer, openEditDrawer } = useCreateRuleDrawer();
  
  // 启用/禁用规则
  const toggleRuleMutation = useToggleRule({
    mutation: {
      onSuccess: () => {
        refetchRules();
      }
    }
  });
  
  // 删除规则
  const deleteRuleMutation = useDeleteRule({
    mutation: {
      onSuccess: () => {
        refetchRules();
      }
    }
  });

  const columns: ColumnsType<RequestRule> = [
    {
      title: '状态',
      dataIndex: 'enabled',
      key: 'enabled',
      width: 80,
      render: (enabled: boolean, record) => (
        <Switch
          checked={enabled}
          onClick={(checked) => {
            if (record.id) {
              toggleRuleMutation.mutate({
                id: record.id,
                data: { enabled: checked }
              });
            }
          }}
        />
      ),
    },
    {
      title: '规则名称',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      render: (name: string, record) => (
        <div>
          <Text strong>{name}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.description}
          </Text>
        </div>
      ),
    },
    {
      title: '匹配条件',
      key: 'conditions',
      width: 300,
      render: (_, record) => (
        <ConditionsText capture={record.capture} style={{ fontSize: '12px' }} />
      ),
    },
    {
      title: '动作',
      key: 'action',
      width: 200,
      render: (_, record) => (
        <ActionCell handlers={record.handlers} />
      ),
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      width: 80,
      sorter: (a, b) => a.priority - b.priority,
    },
    {
      title: '操作',
      key: 'actions',
      width: 120,
      render: (_, record) => {
        return (
          <Space>
            <Button 
              type="text" 
              icon={<RiEditLine size={14} />}
              onClick={() => {
                if (record.id) {
                  openEditDrawer(record.id);
                }
              }}
            />
            <CopyRuleButton record={record} onSuccess={refetchRules} />
            <Button 
              type="text" 
              danger
              icon={<RiDeleteBinLine size={14} />}
              onClick={() => {
                if (record.id) {
                  Modal.confirm({
                    title: '确认删除',
                    content: `确定要删除规则 "${record.name}" 吗？此操作不可恢复。`,
                    okText: '删除',
                    okType: 'danger',
                    cancelText: '取消',
                    onOk: () => {
                      const id = record.id;
                      if (typeof id === 'number') {
                        deleteRuleMutation.mutate({ id });
                      }
                    }
                  });
                }
              }}
            />
          </Space>
        );
      },
    },
  ];

  return (
    <>
      <CommonCard>
        <div className="mb-4 flex items-center justify-between">
          <Title level={4} style={{ margin: 0 }}>
            拦截规则列表
          </Title>
          <Space>
            <Button
              type="primary"
              icon={<RiAddLine size={16} />}
              onClick={openDrawer}
            >
              新建规则
            </Button>
          </Space>
        </div>

        <Text type="secondary" className="mb-4 block">
          管理用于拦截和修改网络请求的规则
        </Text>

        <Table
          columns={columns}
          dataSource={listRulesData?.data.rules}
          rowKey="id"
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            onChange(page, pageSize) {
              setPageParameters({ page, pageSize });
            },
          }}
        />
      </CommonCard>

      <CreateRuleDrawer />
    </>
  );
};

export const InterceptorPage: React.FC = () => {
  return (
    <CreateRuleDrawerProvider>
      <InnerInterceptorPage />
    </CreateRuleDrawerProvider>
  );
};

