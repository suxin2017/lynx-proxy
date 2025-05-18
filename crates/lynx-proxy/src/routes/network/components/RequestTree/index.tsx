import { MimeTypeIcon } from '@/components/MimeTypeIcon';
import { RootState } from '@/store';
import { IRequestTreeNode } from '@/store/requestTreeStore';
import {
  RiArrowDropDownLine,
  RiArrowDropRightLine,
  RiFolder6Line,
  RiLink,
  RiTimeLine,
} from '@remixicon/react';
import { useSize } from 'ahooks';
import { Spin, Tag, theme } from 'antd';
import { first, get, keys } from 'lodash';
import prettyMilliseconds from 'pretty-ms';
import React, { useRef } from 'react';
import { NodeRendererProps, Tree } from 'react-arborist';
import { useSelector } from 'react-redux';
import { useSelectRequest } from '../store/selectRequestStore';
import { RequestContextMenu } from '@/components/RequestContextMenu';

export const RequestTree: React.FC = () => {
  const treeData = useSelector(
    (state: RootState) => state.requestTree.requestTree,
  );

  const ref = useRef(null);
  const size = useSize(ref);
  const { setSelectRequest } = useSelectRequest();

  return (
    <RequestContextMenu>
      {({ handleContextMenu }) => (
        <div ref={ref} className="h-full w-full">
          <Tree
            height={size?.height}
            width={size?.width}
            data={treeData}
            indent={24}
            rowHeight={32}
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
      )}
    </RequestContextMenu>
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

  const { requestStart, requestEnd } = node.data.record?.timings || {};

  let time = null;

  if (isLeaf) {
    if (!requestStart || !requestEnd) {
      time = <Spin size="small" />;
    } else {
      const formattedDuration = prettyMilliseconds(requestEnd - requestStart);
      time = <span>{formattedDuration}</span>;
    }
  }

  return (
    <div
      style={{
        ...style,
        backgroundColor: node.isSelected ? token.token.colorPrimaryBg : '',
      }}
      className={'flex h-full w-full items-center text-sm'}
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
      {!isRoot && !isLeaf && (
        <span className="mr-1 flex items-center">
          <RiFolder6Line color={token.token['orange-5']} size={18} />
        </span>
      )}
      <span className="inline-block w-full overflow-ellipsis">
        {node.data.name}
      </span>
      {isRoot && node.data.children.length > 0 && (
        <Tag className="rounded-xl text-xs" color="blue">
          {node.data.children.length} 请求
        </Tag>
      )}

      {isLeaf && (
        <div className="flex items-center gap-2 pr-2 text-xs text-gray-400 dark:text-gray-500">
          <RiTimeLine size={18} />
          <span>{time}</span>
        </div>
      )}
    </div>
  );
};
