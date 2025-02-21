 
import { IRuleModel } from '@/api/models';
import constate from 'constate';
import { useState } from 'react';
import { useImmer } from 'use-immer';

export const [SelectedRuleProvider, useSelectedRuleContext] = constate(() => {
  const [state, setState] = useState<IRuleModel | undefined>();
  return {
    selectedRule: state,
    setSelectedRule: setState,
  };
});

export const [RuleContentStateProvider, useRuleContentState] = constate(() => {
  const [state, setState] = useImmer<{
    isChanged: boolean;
  }>({
    isChanged: false,
  });
  return {
    state,
    setState,
  };
});
