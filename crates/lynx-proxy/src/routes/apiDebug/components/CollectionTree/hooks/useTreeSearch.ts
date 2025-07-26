import React, { useState, useCallback, useEffect } from 'react';
import type { TreeNodeResponse } from '@/services/generated/utoipaAxum.schemas';

export interface UseTreeSearchReturn {
  searchValue: string;
  setSearchValue: (value: string) => void;
  filteredTreeData: TreeNodeResponse[];
  searchExpandedKeys: string[];
  highlightText: (text: string, searchText: string) => React.ReactNode;
}

export const useTreeSearch = (
  treeData: TreeNodeResponse[],
  onExpandKeys?: (keys: string[]) => void
): UseTreeSearchReturn => {
  const [searchValue, setSearchValue] = useState('');
  const [filteredTreeData, setFilteredTreeData] = useState<TreeNodeResponse[]>([]);
  const [searchExpandedKeys, setSearchExpandedKeys] = useState<string[]>([]);

  // 搜索过滤逻辑
  const filterTreeData = useCallback((nodes: TreeNodeResponse[], searchText: string): { filteredNodes: TreeNodeResponse[], expandedKeys: string[] } => {
    const expandedKeys: string[] = [];
    
    const filterNodes = (nodeList: TreeNodeResponse[]): TreeNodeResponse[] => {
      return nodeList.reduce((acc: TreeNodeResponse[], node) => {
        const nameMatch = node.name.toLowerCase().includes(searchText.toLowerCase());
        let filteredChildren: TreeNodeResponse[] = [];
        
        if (node.children && Array.isArray(node.children)) {
          filteredChildren = filterNodes(node.children);
        }
        
        // 如果节点名称匹配或有匹配的子节点，则包含此节点
        if (nameMatch || filteredChildren.length > 0) {
          // 如果有匹配的子节点，自动展开此节点
          if (filteredChildren.length > 0) {
            expandedKeys.push(node.id.toString());
          }
          
          acc.push({
            ...node,
            children: filteredChildren.length > 0 ? filteredChildren : node.children
          });
        }
        
        return acc;
      }, []);
    };
    
    return {
      filteredNodes: filterNodes(nodes),
      expandedKeys
    };
  }, []);

  // 高亮搜索文本
  const highlightText = useCallback((text: string, searchText: string) => {
    if (!searchText) return text;
    
    const regex = new RegExp(`(${searchText})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => {
      if (part.toLowerCase() === searchText.toLowerCase()) {
        return React.createElement('span', {
          key: index,
          className: 'bg-yellow-300 text-yellow-900 px-1 rounded font-medium'
        }, part);
      }
      return part;
    });
  }, []);

  // 处理搜索逻辑
  useEffect(() => {
    if (searchValue.trim()) {
      const { filteredNodes, expandedKeys } = filterTreeData(treeData, searchValue.trim());
      setFilteredTreeData(filteredNodes);
      setSearchExpandedKeys(expandedKeys);
      // 搜索时自动展开包含结果的节点
      onExpandKeys?.([...expandedKeys]);
    } else {
      setFilteredTreeData([]);
      setSearchExpandedKeys([]);
    }
  }, [searchValue, treeData, filterTreeData, onExpandKeys]);

  return {
    searchValue,
    setSearchValue,
    filteredTreeData,
    searchExpandedKeys,
    highlightText,
  };
};