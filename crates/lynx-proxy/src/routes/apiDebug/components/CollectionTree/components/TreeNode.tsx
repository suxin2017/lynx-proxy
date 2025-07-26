import React from 'react';
import { Button, Dropdown } from 'antd';
import {
  FolderOutlined,
  FileOutlined,
  PlusOutlined,
  MoreOutlined,
  EditOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import type { TreeNodeResponse } from '@/services/generated/utoipaAxum.schemas';
import { useTreeUI } from '../context/TreeContext';
import { useTreeStore } from '../store/treeStore';
import { Modal, message } from 'antd';

interface TreeNodeProps {
  node: TreeNodeResponse;
}

const TreeNode: React.FC<TreeNodeProps> = ({ node }) => {
  const { searchValue, highlightText, showCreateFolderModal, showRenameModal } = useTreeUI();
  const { deleteNode } = useTreeStore();

  const handleDelete = () => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个节点吗？此操作不可撤销。',
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await deleteNode(node.id!);
          message.success('删除成功');
        } catch (error) {
          message.error('删除失败');
        }
      },
    });
  };

  const menuItems = [
    {
      key: 'rename',
      label: '重命名',
      icon: <EditOutlined />,
      onClick: () => showRenameModal(node),
    },
    {
      key: 'delete',
      label: '删除',
      icon: <DeleteOutlined />,
      danger: true,
      onClick: handleDelete,
    },
    ...(node.nodeType === 'folder'
      ? [
          {
            key: 'create-folder',
            label: '新建文件夹',
            icon: <PlusOutlined />,
            onClick: () => showCreateFolderModal(node),
          },
        ]
      : []),
  ];

  return (
    <div className="flex items-center justify-between group">
      <div className="flex items-center">
        {node.nodeType === 'folder' ? (
          <FolderOutlined className="mr-2 text-blue-500" />
        ) : (
          <FileOutlined className="mr-2 text-green-500" />
        )}
        <span>{highlightText(node.name || '', searchValue)}</span>
      </div>
      <Dropdown
        menu={{ items: menuItems }}
        trigger={['click']}
        placement="bottomRight"
      >
        <Button
          type="text"
          size="small"
          icon={<MoreOutlined />}
          className="opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => e.stopPropagation()}
        />
      </Dropdown>
    </div>
  );
};

export default TreeNode;