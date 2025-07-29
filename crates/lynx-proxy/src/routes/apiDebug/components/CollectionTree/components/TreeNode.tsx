import type { TreeNodeResponse } from '@/services/generated/utoipaAxum.schemas';
import {
  ApiOutlined,
  DeleteOutlined,
  EditOutlined,
  FolderOutlined,
  MoreOutlined,
  PlusOutlined
} from '@ant-design/icons';
import { Button, Dropdown, Modal, message } from 'antd';
import React from 'react';
import { useTreeUI } from '../context/TreeContext';
import { useTreeStore } from '../store/treeStore';

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
      <div className="flex items-center min-w-0 flex-1">
        {node.nodeType === 'folder' ? (
          <FolderOutlined className="mr-2 text-blue-500 !text-blue-500 flex-shrink-0" />
        ) : (
          <ApiOutlined className="mr-2 text-orange-500 !text-orange-500 flex-shrink-0" />
        )}
          <span className="truncate w-full">{highlightText(node.name || '', searchValue)}</span>
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