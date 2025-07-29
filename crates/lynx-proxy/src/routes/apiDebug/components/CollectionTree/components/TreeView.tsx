import { getGetTreeQueryKey, useMoveNode } from '@/services/generated/api-debug-tree/api-debug-tree';
import type { TreeNodeResponse } from '@/services/generated/utoipaAxum.schemas';
import { useQueryClient } from '@tanstack/react-query';
import { Spin, Tree, message } from 'antd';
import type { DataNode, TreeProps } from 'antd/es/tree';
import React, { useCallback, useEffect } from 'react';
import { useNodeSelectionContext } from '../context/NodeSelectionContext';
import { useTreeUI } from '../context/TreeContext';
import { useTreeStore } from '../store/treeStore';
import TreeNode from './TreeNode';

const TreeView: React.FC = () => {
  const { selectedNodeId, handleNodeSelect } = useNodeSelectionContext();
  const {
    selectNode,
    expandNode,
    selectedKeys,
    expandedKeys,
  } = useTreeStore();

  const queryClient = useQueryClient();

  // 移动节点
  const moveNodeMutation = useMoveNode({
    mutation: {
      onSuccess: () => {
        // 移动成功不显示提示
        queryClient.invalidateQueries({ queryKey: getGetTreeQueryKey() });
      },
      onError: () => {
        message.error('节点移动失败');
      },
    },
  });

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
  const convertToAntdTreeData = useCallback((nodes: TreeNodeResponse[]): (DataNode & { nodeInfo: TreeNodeResponse })[] => {
    return nodes.map((node) => ({
      key: node.id?.toString() || '',
      title: <TreeNode node={node} />,
      children: node.children && Array.isArray(node.children)
        ? convertToAntdTreeData(node.children)
        : undefined,
      nodeInfo: node,
      isLeaf: node.nodeType === 'request' ||
        !node.children ||
        !Array.isArray(node.children) ||
        node.children.length === 0,
    }));
  }, []);

  const handleSelect: TreeProps['onSelect'] = (selectedKeys) => {
    const nodeKey = selectedKeys[0] as string;

    if (nodeKey) {
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

      // 如果是request类型节点，阻止选中
      if (selectedNode && selectedNode.nodeType === 'request') {
        handleNodeSelect(selectedNode);
      }

      selectNode(selectedKeys as string[]);
    }
  };

  const handleExpand: TreeProps['onExpand'] = (expandedKeys) => {
    expandNode(expandedKeys as string[]);
  };

  // 根据搜索状态决定使用哪个数据源
  const currentTreeData = getCurrentTreeData();
  const antdTreeData = convertToAntdTreeData(currentTreeData);

  return (
    <Spin spinning={moveNodeMutation.isPending} className="flex-1 pb-4">
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
        blockNode
        allowDrop={({ dropNode, dropPosition }) => {
          const targetNodeData = dropNode.nodeInfo;

          if (targetNodeData.nodeType === 'request' && dropPosition === 0) {
            return false;
          }
          if (!targetNodeData.parentId && (dropPosition === 1 || dropPosition === -1)) {
            return false;
          }

          return true
        }}
        onDrop={async (info) => {
          const { dragNode, node, dropToGap } = info;
          const dropPos = info.node.pos.split('-');
          const dragPos = dragNode.pos.split('-');


          let isSameParent = true;
          // 同级别移动
          if (dragPos.length === dropPos.length) {
            for (let i = 0; i < dragPos.length - 1; i++) {
              if (dragPos[i] !== dropPos[i]) {
                isSameParent = false;
              }
            }
          } else {
            isSameParent = false;
          }

          const targetDropPos = Number(dropPos[dropPos.length - 1]);
          const dropPosition = info.dropPosition - targetDropPos; // the drop position relative to the drop node, inside 0, top -1, bottom 1

          console.log(dragNode, node, info.dropPosition, dropPosition, dropToGap, info);
          let targetId;
          let targetPos;


          if (isSameParent && dropPosition === 1) {
            console.log("同级别移动");
            targetPos = targetDropPos + 1;
            targetId = node.nodeInfo.parentId;
          } else {
            console.log("不同级别移动");
            // 移动到文件夹里面的第一个
            if (dropPosition === 0) {
              targetPos = 0;
              targetId = node.nodeInfo.id;
              console.log("移动到文件夹里面了");
            } else {
              targetPos = targetDropPos + 1;
              targetId = node.nodeInfo.parentId;
              console.log("移动到文件夹里面的元素");
            }
          }
          if (!targetId) {
            return;
          }
          // 拖拽到节点内部（作为子节点）

          console.log("targetId", targetId, "targetPos", targetPos);
          try {
            await moveNodeMutation.mutateAsync({
              params: {
                id: dragNode.nodeInfo.id
              },
              data: {
                newSortOrder: targetPos,
                targetParentId: targetId
              }
            }
            );
            // 移动成功不显示提示
          } catch (error) {
            message.error('移动失败');
          }
        }}
      />
    </Spin>
  );
};

export default TreeView;