import { IRuleModel } from '@/api/models';
import constate from 'constate';
import { useState } from 'react';

export const [SelectedRuleProvider, useSelectedRuleContext] = constate(() => {
  const [state, setState] = useState<IRuleModel | undefined>();
  return {
    selectedRule: state,
    setSelectedRule: setState,
  };
});
