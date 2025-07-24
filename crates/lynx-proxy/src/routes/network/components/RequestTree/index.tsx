import { MimeTypeIcon } from '@/components/MimeTypeIcon';
import { RequestContextMenu, useRequestContextMenuContext } from '@/components/RequestContextMenu';
import { IRequestTreeNode, useTreeData } from '@/store/requestTreeStore';
import {
  RiArrowDropDownLine,
  RiArrowDropRightLine,
  RiLink,
  RiTimeLine
} from '@remixicon/react';
import { useSize } from 'ahooks';
import { Empty, theme, Typography } from 'antd';
import { first, get, keys } from 'lodash';
import React, { useRef } from 'react';
import { NodeRendererProps, Tree } from 'react-arborist';
import { getDurationTime } from '../RequestTable';
import { useSelectRequest } from '../store/selectRequestStore';

export const RequestTree: React.FC = () => {
  const treeData = useTreeData();
  const ref = useRef(null);
  const size = useSize(ref);
  const { setSelectRequest } = useSelectRequest();
  const { handleContextMenu } = useRequestContextMenuContext();

  if (!treeData?.length) {
    return (
      <div className="flex  flex-1  items-center justify-center">
        <Empty description={null} />
      </div>
    );
  }

  return (
    <RequestContextMenu>
      <div ref={ref} className="flex-1 ">
        <Tree
          height={size?.height}
          width={size?.width}
          data={treeData}
          indent={32}
          rowHeight={36}
          disableDrag
          openByDefault={false}
          onSelect={(node) => {
            const selectedNode = first(node);
            if (selectedNode && selectedNode.data.record) {
              setSelectRequest(selectedNode.data.record);
            }
          }}
        >
          {(props) => (
            <TreeNode
              {...props}
              onContextMenu={(e) => {
                if (props.node.data.record) {
                  handleContextMenu(props.node.data.record, e);
                }
              }}
            />
          )}
        </Tree>
      </div>
    </RequestContextMenu >

  );
};

interface TreeNodeProps extends NodeRendererProps<IRequestTreeNode> {
  onContextMenu?: (event: React.MouseEvent) => void;
}


const TreeNode = ({
  node,
  style,
  dragHandle,
  onContextMenu,
}: TreeNodeProps) => {
  const isLeaf = !node.children?.length;
  const isRoot = !node.parent?.parent;
  const token = theme.useToken();

  let time = null;

  if (isLeaf) {
    if (node.data.record?.timings) {
      time = getDurationTime(node.data.record?.timings);
    }
  }

  return (
    <div
      style={{
        ...style,
        backgroundColor: node.isSelected ? token.token.colorPrimaryBg : '',
      }}
      className={'flex   items-center text-sm whitespace-nowrap'}
      ref={dragHandle}
      onClick={() => {
        node.select();
        node.toggle();
      }}
      onContextMenu={onContextMenu}
    >
      {!isLeaf && (
        <span className="flex items-center">
          {node.isClosed ? (
            <RiArrowDropRightLine size={26} />
          ) : (
            <RiArrowDropDownLine size={26} />
          )}
        </span>
      )}
      {isRoot && !isLeaf && (
        <span className="mr-1 flex items-center">
          <RiLink color={token.token['blue-5']} size={16} />
        </span>
      )}
      {isLeaf && (
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
      )}
      {/* {!isRoot && !isLeaf && (
        <span className="mr-1 flex items-center">
          <RiFolder6Line color={token.token['orange-5']} size={16} />
        </span>
      )} */}
      <Typography.Text ellipsis className="">
        {node.data.name}
      </Typography.Text>

      {isLeaf && (
        <div className="flex items-center gap-2 pr-2 text-xs text-gray-400 dark:text-gray-500">
          <RiTimeLine size={18} />
          <span>{time}</span>
        </div>
      )}
    </div>
  );
};
