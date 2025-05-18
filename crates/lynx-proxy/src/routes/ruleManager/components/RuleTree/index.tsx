import { useEventListener, useSize } from 'ahooks';
import React, { Key } from 'react';
import { useSelectedRuleContext } from '../store';
import {
  SaveTreeNodeModal,
  SaveTreeNodeModalContextProvider,
} from './SaveTreeNodeModal';
import {
  TreeContentMenu,
  TreeContentMenuContextProvider,
  useTreeContentMenuContext,
} from './TreeContentMenu';

interface IRuleTreeProps {}

export const InnerRullTree: React.FC<IRuleTreeProps> = () => {
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
        {/* {data && (
          <Tree.DirectoryTree
            height={height}
            treeData={data?.data}
            selectedKeys={selectKeys}
            defaultExpandAll
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
          /> */}
        {/* )} */}
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
