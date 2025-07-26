import { FolderOutlined } from '@ant-design/icons';
import { useQueryClient } from '@tanstack/react-query';
import { Form, Input, message, Modal, TreeSelect } from 'antd';
import React, { useEffect, useState } from 'react';
import { useCreateRequestNode, useGetTree } from '../../../services/generated/api-debug-tree/api-debug-tree';
import { useCreateDebugEntry } from '../../../services/generated/api-debug/api-debug';
import {
    CreateApiDebugRequest,
    CreateRequestNodeRequest,
    HttpMethod,
    TreeNodeResponse,
} from '../../../services/generated/utoipaAxum.schemas';
import { HeaderItem, QueryParamItem } from './types';

interface SaveToCollectionModalProps {
  visible: boolean;
  onClose: () => void;
  requestData: {
    method: string;
    url: string;
    headers: HeaderItem[];
    queryParams: QueryParamItem[];
    body: string;
  };
}

interface TreeSelectData {
  title: string;
  value: string;
  key: string;
  children?: TreeSelectData[];
  icon?: React.ReactNode;
}

const SaveToCollectionModal: React.FC<SaveToCollectionModalProps> = ({
  visible,
  onClose,
  requestData,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  const { data: treeData, isLoading: treeLoading } = useGetTree();
  const createDebugEntryMutation = useCreateDebugEntry();
  const createRequestNodeMutation = useCreateRequestNode();

  // 转换树数据为TreeSelect需要的格式，只显示文件夹节点
  const convertTreeData = (nodes: TreeNodeResponse[]): TreeSelectData[] => {
    return nodes
      .filter((node) => node.nodeType === 'folder') // 只保留文件夹节点
      .map((node) => ({
        title: node.name,
        value: node.id?.toString() || '',
        key: node.id?.toString() || '',
        icon: <FolderOutlined />,
        children: node.children && Array.isArray(node.children) 
          ? convertTreeData(node.children)
          : undefined,
      }));
  };

  const treeSelectData = treeData?.data?.nodes ? convertTreeData(treeData.data.nodes) : [];

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      // 构建最终URL（包含查询参数）
      let finalUrl = requestData.url;
      const enabledQueryParams = requestData.queryParams.filter(
        (param) => param.enabled && param.key,
      );
      if (enabledQueryParams.length > 0) {
        const urlObject = new URL(requestData.url.startsWith('http') ? requestData.url : `http://${requestData.url}`);
        enabledQueryParams.forEach((param) => {
          urlObject.searchParams.set(param.key, param.value);
        });
        finalUrl = urlObject.toString();
      }

      // 转换headers为对象格式
      const headersObject: Record<string, string> = {};
      requestData.headers
        .filter((header) => header.enabled && header.key && header.value)
        .forEach((header) => {
          headersObject[header.key] = header.value;
        });

      // 添加默认Content-Type
      if (
        requestData.body &&
        !headersObject['Content-Type'] &&
        !headersObject['content-type']
      ) {
        headersObject['Content-Type'] = 'application/json';
      }

      // 创建API Debug记录
      const createApiDebugRequest: CreateApiDebugRequest = {
        name: values.name,
        method: requestData.method as HttpMethod,
        url: finalUrl,
        headers: Object.keys(headersObject).length > 0 
          ? headersObject as any
          : undefined,
        body: requestData.body || undefined,
        contentType: headersObject['Content-Type'] || headersObject['content-type'] || undefined,
        timeout: 30,
      };

      const debugEntryResponse = await createDebugEntryMutation.mutateAsync({
        data: createApiDebugRequest,
      });

      // 创建树节点
      const createRequestNodeRequest: CreateRequestNodeRequest = {
        name: values.name,
        parentId: values.parentId ? parseInt(values.parentId) : undefined,
        apiDebugId: debugEntryResponse.data.id,
      };

      await createRequestNodeMutation.mutateAsync({
        data: createRequestNodeRequest,
      });

      // 刷新树数据
      queryClient.invalidateQueries({ queryKey: ['/api_debug_tree/tree'] });

      message.success('请求已成功保存到集合');
      form.resetFields();
      onClose();
    } catch (error) {
      console.error('保存到集合失败:', error);
      message.error('保存到集合失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onClose();
  };

  // 当模态框打开时，设置默认名称
  useEffect(() => {
    if (visible && requestData.url) {
      const defaultName = `${requestData.method} ${requestData.url}`;
      form.setFieldsValue({ name: defaultName });
    }
  }, [visible, requestData, form]);

  return (
    <Modal
      title="保存到集合"
      open={visible}
      onOk={handleSave}
      onCancel={handleCancel}
      confirmLoading={loading}
      okText="保存"
      cancelText="取消"
      width={500}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          name: '',
          parentId: undefined,
        }}
      >
        <Form.Item
          label="请求名称"
          name="name"
          rules={[
            { required: true, message: '请输入请求名称' },
            { max: 100, message: '请求名称不能超过100个字符' },
          ]}
        >
          <Input placeholder="输入请求名称" />
        </Form.Item>

        <Form.Item
          label="保存位置"
          name="parentId"
          help="选择要保存到的文件夹，不选择则保存到根目录"
        >
          <TreeSelect
            placeholder="选择文件夹（可选）"
            allowClear
            treeDefaultExpandAll
            loading={treeLoading}
            treeData={treeSelectData}
            filterTreeNode={(search, node) => {
              return node.title?.toString().toLowerCase().includes(search.toLowerCase()) || false;
            }}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default SaveToCollectionModal;