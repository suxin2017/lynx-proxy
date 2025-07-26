import constate from 'constate';
import { useState, useCallback, useEffect } from 'react';
import { TreeNodeResponse } from '@/services/generated/utoipaAxum.schemas';
import { useGetTree, useCreateFolder, useMoveNode, useRenameNode, useDeleteNode } from '@/services/generated/api-debug-tree/api-debug-tree';
import { message } from 'antd';
import { useQueryClient } from '@tanstack/react-query';

export interface TreeNode extends TreeNodeResponse {
  children?: TreeNode[];
}

interface TreeState {
  selectedKeys: string[];
  expandedKeys: string[];
  editingNodeId: string | null;
  dragOverNodeId: string | null;
  isCreatingNode: boolean;
  createNodeParentId: string | null;
  createNodeType: 'folder' | 'request' | null;
}

function useTreeState() {
  const queryClient = useQueryClient();
  
  const [state, setState] = useState<TreeState>({
    selectedKeys: [],
    expandedKeys: [],
    editingNodeId: null,
    dragOverNodeId: null,
    isCreatingNode: false,
    createNodeParentId: null,
    createNodeType: null,
  });

  // 获取树数据
  const { data: treeData, isLoading, error, refetch } = useGetTree();

  // 当树数据加载完成时，自动展开第一层节点
  useEffect(() => {
    if (treeData?.data?.nodes && treeData.data.nodes.length > 0 && state.expandedKeys.length === 0) {
      const firstLevelKeys = treeData.data.nodes
        .filter(node => node.nodeType === 'folder')
        .map(node => node.id?.toString())
        .filter(Boolean) as string[];
      
      if (firstLevelKeys.length > 0) {
        setState(prev => ({ ...prev, expandedKeys: firstLevelKeys }));
      }
    }
  }, [treeData, state.expandedKeys.length]);

  // 创建文件夹
  const createFolderMutation = useCreateFolder({
    mutation: {
      onSuccess: () => {
        message.success('文件夹创建成功');
        queryClient.invalidateQueries({ queryKey: ['/api_debug_tree/tree'] });
        
        // 如果有父节点，自动展开父节点
        if (state.createNodeParentId) {
          setState(prev => ({
            ...prev,
            expandedKeys: prev.expandedKeys.includes(state.createNodeParentId!) 
              ? prev.expandedKeys 
              : [...prev.expandedKeys, state.createNodeParentId!],
            isCreatingNode: false,
            createNodeParentId: null,
            createNodeType: null
          }));
        } else {
          setState(prev => ({ ...prev, isCreatingNode: false, createNodeParentId: null, createNodeType: null }));
        }
      },
      onError: () => {
        message.error('文件夹创建失败');
      },
    },
  });

  // 移动节点
  const moveNodeMutation = useMoveNode({
    mutation: {
      onSuccess: () => {
        // 移动成功不显示提示
        queryClient.invalidateQueries({ queryKey: ['/api_debug_tree/tree'] });
      },
      onError: () => {
        message.error('节点移动失败');
      },
    },
  });

  // 重命名节点
  const renameNodeMutation = useRenameNode({
    mutation: {
      onSuccess: () => {
        message.success('重命名成功');
        queryClient.invalidateQueries({ queryKey: ['/api_debug_tree/tree'] });
        setState(prev => ({ ...prev, editingNodeId: null }));
      },
      onError: () => {
        message.error('重命名失败');
      },
    },
  });

  // 删除节点
  const deleteNodeMutation = useDeleteNode({
    mutation: {
      onSuccess: () => {
        message.success('删除成功');
        queryClient.invalidateQueries({ queryKey: ['/api_debug_tree/tree'] });
      },
      onError: () => {
        message.error('删除失败');
      },
    },
  });

  // 选择节点
  const selectNode = useCallback((keys: string[]) => {
    setState(prev => ({ ...prev, selectedKeys: keys }));
  }, []);

  // 展开/收起节点
  const expandNode = useCallback((keys: string[]) => {
    setState(prev => ({ ...prev, expandedKeys: keys }));
  }, []);

  // 开始编辑节点
  const startEditNode = useCallback((nodeId: string) => {
    setState(prev => ({ ...prev, editingNodeId: nodeId }));
  }, []);

  // 取消编辑
  const cancelEdit = useCallback(() => {
    setState(prev => ({ ...prev, editingNodeId: null }));
  }, []);

  // 开始创建节点
  const startCreateNode = useCallback((parentId: string | null, type: 'folder' | 'request') => {
    setState(prev => ({
      ...prev,
      isCreatingNode: true,
      createNodeParentId: parentId,
      createNodeType: type,
    }));
  }, []);

  // 取消创建节点
  const cancelCreateNode = useCallback(() => {
    setState(prev => ({
      ...prev,
      isCreatingNode: false,
      createNodeParentId: null,
      createNodeType: null,
    }));
  }, []);

  // 创建文件夹
  const createFolder = useCallback((name: string, parentId?: number) => {
    createFolderMutation.mutate({
      data: {
        name,
        parentId: parentId || null,
      },
    });
  }, [createFolderMutation]);

  // 移动节点
  const moveNode = useCallback((nodeId: number, targetParentId?: number, newSortOrder?: number) => {
    moveNodeMutation.mutate({
      data: {
        targetParentId: targetParentId || null,
        newSortOrder: newSortOrder || null,
      },
      params: { id: nodeId },
    });
  }, [moveNodeMutation]);

  // 重命名节点
  const renameNode = useCallback((nodeId: number, name: string) => {
    renameNodeMutation.mutate({
      data: { name },
      params: { id: nodeId },
    });
  }, [renameNodeMutation]);

  // 删除节点
  const deleteNode = useCallback((nodeId: number) => {
    deleteNodeMutation.mutate({
      params: { id: nodeId },
    });
  }, [deleteNodeMutation]);

  // 设置拖拽悬停节点
  const setDragOverNode = useCallback((nodeId: string | null) => {
    setState(prev => ({ ...prev, dragOverNodeId: nodeId }));
  }, []);

  return {
    // 状态
    ...state,
    treeData: treeData?.data?.nodes || [],
    isLoading,
    error,
    
    // 操作方法
    selectNode,
    expandNode,
    startEditNode,
    cancelEdit,
    startCreateNode,
    cancelCreateNode,
    createFolder,
    moveNode,
    renameNode,
    deleteNode,
    setDragOverNode,
    refetch,
    
    // 加载状态
    isCreatingFolder: createFolderMutation.isPending,
    isMovingNode: moveNodeMutation.isPending,
    isRenamingNode: renameNodeMutation.isPending,
    isDeletingNode: deleteNodeMutation.isPending,
  };
}

export const [TreeProvider, useTreeStore] = constate(useTreeState);