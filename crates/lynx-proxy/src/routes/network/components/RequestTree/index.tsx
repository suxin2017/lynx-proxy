import React, { useRef, useState } from 'react';
import { Space, Tree } from 'antd';
import { useSelector } from 'react-redux';
import { useSize } from 'ahooks';
import { Icon } from '@/components/Icon';
import { useSelectRequest } from '../store/selectRequestStore';
import { RootState } from '@/store';
import { IRequestTreeNode } from '@/store/requestTreeStore';

export const RequestTree: React.FC = () => {
  const treeData = useSelector(
    (state: RootState) => state.requestTree.requestTree,
  );

  const ref = useRef(null);
  const size = useSize(ref);

  const [expandedKeys, setExpandKeys] = useState<string[]>([]);
  const { setSelectRequest } = useSelectRequest();
  return (
    <div
      ref={ref}
      className="h-full w-full bg-white overflow-auto"
      style={{ width: size?.width, height: size?.height }}
    >
      <Tree
        className="w-full h-full overflow-auto"
        expandedKeys={expandedKeys}
        showIcon
        blockNode
        // virtual
        // height={size?.height}
        onSelect={(_selectedKeys, info) => {
          console.log(_selectedKeys, '_selectedKeys');
          if (info.node.record) {
            setSelectRequest(info.node.record);
          }
        }}
        onExpand={(keys, info) => {
          console.log(keys, info, 'onExpand');
          if (info.expanded) {
            const paths = getExpandPaths(info.node);
            setExpandKeys(Array.from(new Set([...expandedKeys, ...paths])));
          } else {
            setExpandKeys(keys as string[]);
          }
        }}
        treeData={treeData}
        titleRender={(node) => {
          return (
            <Space>
              <span>{<Icon type="icon-network" />}</span>
              <span
                className="inline-block whitespace-nowrap"
                title={node.title}
              >
                {node.title}
              </span>
            </Space>
          );
        }}
      />
    </div>
  );
};

const getExpandPaths = (
  treeData?: IRequestTreeNode,
  path: string[] = [],
): string[] => {
  if (!treeData) {
    return [];
  }
  if (!treeData.children || treeData.children.length === 0) {
    return path;
  }
  const newPath = [...path, treeData.key];
  for (const child of treeData.children) {
    const result = getExpandPaths(child, newPath);
    if (result.length > 0) {
      return result;
    }
  }
  return [];
};
