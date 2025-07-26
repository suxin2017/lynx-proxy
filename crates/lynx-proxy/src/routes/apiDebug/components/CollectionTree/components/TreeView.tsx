import React, { useCallback, useEffect } from 'react';
import { Tree, message } from 'antd';
import type { DataNode, TreeProps } from 'antd/es/tree';
import type { TreeNodeResponse } from '@/services/generated/utoipaAxum.schemas';
import { useTreeStore } from '../store/treeStore';
import { useTreeUI } from '../context/TreeContext';
import TreeNode from './TreeNode';

interface TreeViewProps {
  onNodeSelect?: (node: TreeNodeResponse) => void;
  selectedNodeId?: string;
}

const TreeView: React.FC<TreeViewProps> = ({ onNodeSelect, selectedNodeId }) => {
  const {
    selectNode,
    expandNode,
    selectedKeys,
    expandedKeys,
    moveNode,
  } = useTreeStore();
  
  const {
    searchValue,
    searchExpandedKeys,
    getCurrentTreeData,
  } = useTreeUI();

  // 同步外部传入的selectedNodeId到内部状态
  useEffect(() => {
    if (selectedNodeId && selectedNodeId !== selectedKeys[0]) {
      selectNode([selectedNodeId]);
    }
  }, [selectedNodeId, selectNode, selectedKeys]);

  // 转换树数据为 Ant Design Tree 组件需要的格式
  const convertToAntdTreeData = useCallback((nodes: TreeNodeResponse[]): DataNode[] => {
    return nodes.map((node) => ({
      key: node.id?.toString() || '',
      title: <TreeNode node={node} />,
      children: node.children && Array.isArray(node.children) 
        ? convertToAntdTreeData(node.children) 
        : undefined,
      isLeaf: node.nodeType === 'request' || 
              !node.children || 
              !Array.isArray(node.children) || 
              node.children.length === 0,
    }));
  }, []);

  const handleSelect: TreeProps['onSelect'] = (selectedKeys) => {
    const nodeKey = selectedKeys[0] as string;
    selectNode(selectedKeys as string[]);
    
    if (nodeKey && onNodeSelect) {
      // 查找对应的节点数据
      const findNode = (nodes: TreeNodeResponse[], key: string): TreeNodeResponse | null => {
        for (const node of nodes) {
          if (node.id?.toString() === key) {
            return node;
          }
          if (node.children && Array.isArray(node.children)) {
            const found = findNode(node.children, key);
            if (found) return found;
          }
        }
        return null;
      };
      
      const selectedNode = findNode(getCurrentTreeData(), nodeKey);
      if (selectedNode) {
        onNodeSelect(selectedNode);
      }
    }
  };

  const handleExpand: TreeProps['onExpand'] = (expandedKeys) => {
    expandNode(expandedKeys as string[]);
  };

  // 根据搜索状态决定使用哪个数据源
  const currentTreeData = getCurrentTreeData();
  const antdTreeData = convertToAntdTreeData(currentTreeData);

  return (
    <div className="flex-1 pb-4">
      <Tree
        treeData={antdTreeData}
        onSelect={handleSelect}
        onExpand={handleExpand}
        selectedKeys={selectedNodeId ? [selectedNodeId] : selectedKeys}
        expandedKeys={searchValue.trim() 
          ? [...expandedKeys, ...searchExpandedKeys] 
          : expandedKeys
        }
        showLine
        showIcon={false}
        draggable
        onDrop={async (info) => {
          const { dragNode, node, dropToGap } = info;
          
          if (!dropToGap) {
            // 拖拽到节点内部（作为子节点）
            try {
              await moveNode(
                parseInt(dragNode.key as string), 
                parseInt(node.key as string)
              );
              // 移动成功不显示提示
            } catch (error) {
              message.error('移动失败');
            }
          }
        }}
      />
    </div>
  );
};

export default TreeView;