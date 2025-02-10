import { useGetRuleTreeQuery } from '@/api/rule';
import { Tree } from 'antd';
import React, { Key } from 'react';
import { useSelectedRuleContext } from '../store';
import { IRuleGroupModel, IRuleModel } from '@/api/models';
import {
  TreeContentMenu,
  TreeContentMenuContextProvider,
  useTreeContentMenuContext,
} from './TreeContentMenu';
import { useEventListener, useSize } from 'ahooks';
import { SaveTreeNodeModal, SaveTreeNodeModalContextProvider } from './SaveTreeNodeModal';

interface IRuleTreeProps {}

export const InnerRullTree: React.FC<IRuleTreeProps> = () => {
  const { data } = useGetRuleTreeQuery();
  const [selectKeys, setSelectKeys] = React.useState<Key[]>([]);
  const { setSelectedRule } = useSelectedRuleContext();
  const { openBlankMenu, closeMenu, openGroupMenu, openRuleMenu } =
    useTreeContentMenuContext();

  useEventListener('click', () => {
    closeMenu();
  });
  const ref = React.useRef<HTMLDivElement>(null);
  const { height = 200 } = useSize(ref) ?? {};

  return (
    <TreeContentMenu>
      <div
        ref={ref}
        className="h-full"
        onContextMenu={(e) => {
          console.log('onContextMenu', e);
          openBlankMenu({
            x: e.clientX,
            y: e.clientY,
          });
          e.preventDefault();
        }}
      >
        <Tree.DirectoryTree
          height={height}
          treeData={data?.data}
          selectedKeys={selectKeys}
          icon={false}
          onRightClick={({ node, event }) => {
            event.stopPropagation();
            if (node.isLeaf) {
              openRuleMenu(node.record as unknown as IRuleModel, {
                x: event.clientX,
                y: event.clientY,
              });
            } else {
              openGroupMenu(node.record as unknown as IRuleGroupModel, {
                x: event.clientX,
                y: event.clientY,
              });
            }
          }}
          onSelect={(keys, info) => {
            if (info.node.isLeaf) {
              setSelectKeys(keys);
              setSelectedRule(info.node.record as unknown as IRuleModel);
            }
          }}
        />
      </div>
    </TreeContentMenu>
  );
};

export const RuleTree: React.FC<IRuleTreeProps> = (props) => {
  return (
    <SaveTreeNodeModalContextProvider>
      <TreeContentMenuContextProvider>
        <InnerRullTree {...props} />
        <SaveTreeNodeModal />
      </TreeContentMenuContextProvider>
    </SaveTreeNodeModalContextProvider>
  );
};
