import React, { useRef } from 'react';
import { useSelector } from 'react-redux';
import { useSize } from 'ahooks';
import { useSelectRequest } from '../store/selectRequestStore';
import { RootState } from '@/store';
import { IRequestTreeNode } from '@/store/requestTreeStore';
import { NodeRendererProps, Tree } from 'react-arborist';
import {
  RiArrowDropDownLine,
  RiArrowDropRightLine,
  RiFolder6Line,
} from '@remixicon/react';
import { first, get, keys } from 'lodash';
import { MimeTypeIcon } from '@/components/MimeTypeIcon';

export const RequestTree: React.FC = () => {
  const treeData = useSelector(
    (state: RootState) => state.requestTree.requestTree,
  );

  const ref = useRef(null);
  const size = useSize(ref);

  const { setSelectRequest } = useSelectRequest();
  return (
    <div ref={ref} className="h-full w-full dark:bg-zinc-900">
      <Tree
        height={size?.height}
        width={size?.width}
        data={treeData}
        indent={24}
        rowHeight={24}
        disableDrag
        openByDefault={false}
        onSelect={(node) => {
          const selectedNode = first(node);
          if (selectedNode && selectedNode.data.record) {
            setSelectRequest(selectedNode.data.record);
          }
        }}
      >
        {Node}
      </Tree>
    </div>
  );
};

const baseClassName = 'flex items-center h-full w-full text-xs';
const selectNodeClassName = 'bg-sky-100';

const Node = ({
  node,
  style,
  dragHandle,
}: NodeRendererProps<IRequestTreeNode>) => {
  /* This node instance can do many things. See the API reference. */
  const isLeaf = !node.children?.length;

  return (
    <div
      style={style}
      className={`${baseClassName} ${
        node.isSelected ? selectNodeClassName : ''
      }`}
      ref={dragHandle}
      onClick={() => {
        node.select();
        node.toggle();
      }}
    >
      {!isLeaf && (
        <span className="flex items-center">
          {node.isClosed ? (
            <RiArrowDropRightLine size={18} />
          ) : (
            <RiArrowDropDownLine size={18} />
          )}
        </span>
      )}
      {isLeaf ? (
        <span className="mr-1 flex items-center">
          <MimeTypeIcon
            size={14}
            mimeType={get(
              node?.data?.record?.request?.headers,
              keys(node?.data?.record?.request?.headers).find(
                (item) => item.toLowerCase() === 'content-type',
              ) ?? 'un-content-type',
            )}
          />
        </span>
      ) : (
        <span className="mr-1 flex items-center">
          <RiFolder6Line size={14} />
        </span>
      )}
      <span className="inline-block w-full overflow-ellipsis">
        {node.data.name}
      </span>
    </div>
  );
};
