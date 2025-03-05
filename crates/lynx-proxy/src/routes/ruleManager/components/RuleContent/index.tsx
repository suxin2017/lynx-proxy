import React from 'react';
import { RuleForm } from '../RuleForm';
import { useSelectedRuleContext } from '../store';
import { Empty } from 'antd';

interface IRuleContentProps {}

export const RuleContent: React.FC<IRuleContentProps> = () => {
  const { selectedRule } = useSelectedRuleContext();
  if (!selectedRule) {
    return (
      <div className="flex h-full items-center justify-center">
        <Empty description={'Please select a rule'} />
      </div>
    );
  }
  return (
    <div className="h-full px-6">
      <RuleForm />
    </div>
  );
};
