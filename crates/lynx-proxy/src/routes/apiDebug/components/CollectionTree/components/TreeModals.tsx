import React from 'react';
import { Modal, Input, message } from 'antd';
import { useTreeUI } from '../context/TreeContext';
import { useTreeStore } from '../store/treeStore';

const TreeModals: React.FC = () => {
  const {
    isCreateFolderModalVisible,
    isRenameModalVisible,
    currentNode,
    renameValue,
    newFolderName,
    hideCreateFolderModal,
    hideRenameModal,
    setRenameValue,
    setNewFolderName,
  } = useTreeUI();
  
  const { createFolder, renameNode } = useTreeStore();

  const handleCreateFolderConfirm = async () => {
    if (!newFolderName.trim()) {
      message.error('文件夹名称不能为空');
      return;
    }

    try {
      await createFolder(newFolderName.trim(), currentNode?.id || undefined);
      hideCreateFolderModal();
    } catch (error) {
      message.error('文件夹创建失败');
    }
  };

  const handleRenameConfirm = async () => {
    if (!renameValue.trim() || !currentNode?.id) {
      message.error('名称不能为空');
      return;
    }

    try {
      await renameNode(currentNode.id, renameValue.trim());
      hideRenameModal();
    } catch (error) {
      message.error('重命名失败');
    }
  };

  return (
    <>
      {/* 创建文件夹模态框 */}
      <Modal
        title="新建文件夹"
        open={isCreateFolderModalVisible}
        onOk={handleCreateFolderConfirm}
        onCancel={hideCreateFolderModal}
        okText="创建"
        cancelText="取消"
      >
        <Input
          placeholder="请输入文件夹名称"
          value={newFolderName}
          onChange={(e) => setNewFolderName(e.target.value)}
          onPressEnter={handleCreateFolderConfirm}
          autoFocus
        />
      </Modal>

      {/* 重命名模态框 */}
      <Modal
        title="重命名"
        open={isRenameModalVisible}
        onOk={handleRenameConfirm}
        onCancel={hideRenameModal}
        okText="确认"
        cancelText="取消"
      >
        <Input
          placeholder="请输入新名称"
          value={renameValue}
          onChange={(e) => setRenameValue(e.target.value)}
          onPressEnter={handleRenameConfirm}
          autoFocus
        />
      </Modal>
    </>
  );
};

export default TreeModals;