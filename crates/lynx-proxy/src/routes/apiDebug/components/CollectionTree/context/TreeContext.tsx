import React, { useState, useCallback, useEffect } from 'react';
import constate from 'constate';
import type { TreeNodeResponse } from '@/services/generated/utoipaAxum.schemas';
import { useTreeStore } from '../store/treeStore';

interface TreeUIState {
  // 搜索相关
  searchValue: string;
  filteredTreeData: TreeNodeResponse[];
  searchExpandedKeys: string[];
  
  // 模态框状态
  isCreateFolderModalVisible: boolean;
  isRenameModalVisible: boolean;
  
  // 当前操作的节点
  currentNode: TreeNodeResponse | null;
  
  // 重命名相关
  renameValue: string;
  
  // 新建文件夹名称
  newFolderName: string;
}

function useTreeUIState() {
  const { treeData } = useTreeStore();
  
  const [state, setState] = useState<TreeUIState>({
    searchValue: '',
    filteredTreeData: [],
    searchExpandedKeys: [],
    isCreateFolderModalVisible: false,
    isRenameModalVisible: false,
    currentNode: null,
    renameValue: '',
    newFolderName: '',
  });

  // 搜索过滤函数
  const filterTreeData = useCallback((nodes: TreeNodeResponse[], searchText: string): { filteredNodes: TreeNodeResponse[], expandedKeys: string[] } => {
    const expandedKeys: string[] = [];
    
    const filterNodes = (nodeList: TreeNodeResponse[]): TreeNodeResponse[] => {
      return nodeList.reduce((acc: TreeNodeResponse[], node) => {
        const nodeKey = node.id?.toString() || '';
        let filteredChildren: TreeNodeResponse[] = [];
        
        // 递归过滤子节点
        if (node.children && node.children.length > 0) {
          filteredChildren = filterNodes(node.children);
        }
        
        // 检查当前节点名称是否匹配
        const nameMatches = node.name?.toLowerCase().includes(searchText.toLowerCase()) || false;
        
        // 如果当前节点匹配或有匹配的子节点，则包含此节点
        if (nameMatches || filteredChildren.length > 0) {
          // 如果有匹配的子节点，需要展开当前节点
          if (filteredChildren.length > 0) {
            expandedKeys.push(nodeKey);
          }
          
          acc.push({
            ...node,
            children: filteredChildren.length > 0 ? filteredChildren : node.children,
          });
        }
        
        return acc;
      }, []);
    };
    
    const filteredNodes = filterNodes(nodes);
    return { filteredNodes, expandedKeys };
  }, []);

  // 高亮文本函数
  const highlightText = useCallback((text: string, searchText: string) => {
    if (!searchText) return text;
    
    const regex = new RegExp(`(${searchText})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => {
      if (part.toLowerCase() === searchText.toLowerCase()) {
        return React.createElement('span', {
          key: index,
          className: 'bg-yellow-100 dark:bg-yellow-600 px-1 rounded'
        }, part);
      }
      return part;
    });
  }, []);

  // 搜索逻辑处理
  useEffect(() => {
    if (state.searchValue) {
      const { filteredNodes, expandedKeys } = filterTreeData(treeData, state.searchValue);
      setState(prev => ({
        ...prev,
        filteredTreeData: filteredNodes,
        searchExpandedKeys: expandedKeys,
      }));
    } else {
      setState(prev => ({
        ...prev,
        filteredTreeData: [],
        searchExpandedKeys: [],
      }));
    }
  }, [state.searchValue, treeData, filterTreeData]);

  // 设置搜索值
  const setSearchValue = useCallback((value: string) => {
    setState(prev => ({ ...prev, searchValue: value }));
  }, []);

  // 显示创建文件夹模态框
  const showCreateFolderModal = useCallback((parentNode?: TreeNodeResponse) => {
    setState(prev => ({
      ...prev,
      isCreateFolderModalVisible: true,
      currentNode: parentNode || null,
      newFolderName: '',
    }));
  }, []);

  // 隐藏创建文件夹模态框
  const hideCreateFolderModal = useCallback(() => {
    setState(prev => ({
      ...prev,
      isCreateFolderModalVisible: false,
      currentNode: null,
      newFolderName: '',
    }));
  }, []);

  // 显示重命名模态框
  const showRenameModal = useCallback((node: TreeNodeResponse) => {
    setState(prev => ({
      ...prev,
      isRenameModalVisible: true,
      currentNode: node,
      renameValue: node.name || '',
    }));
  }, []);

  // 隐藏重命名模态框
  const hideRenameModal = useCallback(() => {
    setState(prev => ({
      ...prev,
      isRenameModalVisible: false,
      currentNode: null,
      renameValue: '',
    }));
  }, []);

  // 设置重命名值
  const setRenameValue = useCallback((value: string) => {
    setState(prev => ({ ...prev, renameValue: value }));
  }, []);

  // 设置新建文件夹名称
  const setNewFolderName = useCallback((name: string) => {
    setState(prev => ({ ...prev, newFolderName: name }));
  }, []);

  // 获取当前使用的树数据
  const getCurrentTreeData = useCallback(() => {
    return state.searchValue ? state.filteredTreeData : treeData;
  }, [state.searchValue, state.filteredTreeData, treeData]);

  return {
    // 状态
    ...state,
    
    // 方法
    setSearchValue,
    showCreateFolderModal,
    hideCreateFolderModal,
    showRenameModal,
    hideRenameModal,
    setRenameValue,
    setNewFolderName,
    filterTreeData,
    highlightText,
    getCurrentTreeData,
  };
}

export const [TreeUIProvider, useTreeUI] = constate(useTreeUIState);