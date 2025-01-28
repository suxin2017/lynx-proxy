import { useGetRuleTreeQuery } from '@/api/rule';
import { Tree } from 'antd';
import React, { Key } from 'react';
import { useSelectedRuleContext } from '../store';
import { IRuleModel } from '@/api/models';

interface IRuleTreeProps {}

export const RuleTree: React.FC<IRuleTreeProps> = () => {
  const { data } = useGetRuleTreeQuery();
  const [selectKeys, setSelectKeys] = React.useState<Key[]>([]);
  const { setSelectedRule } = useSelectedRuleContext();
  return (
    <Tree.DirectoryTree
      draggable
      treeData={data?.data}
      selectedKeys={selectKeys}
      onSelect={(keys, info) => {
        if (info.node.isLeaf) {
          setSelectKeys(keys);
          setSelectedRule(info.node.record as unknown as IRuleModel);
        }
      }}
    />
  );
};
