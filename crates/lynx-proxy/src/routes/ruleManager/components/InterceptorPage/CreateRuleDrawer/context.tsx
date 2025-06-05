import constate from 'constate';
import { useState } from 'react';

export interface CreateRuleDrawerState {
  visible: boolean;
  editMode: boolean;
  editingRuleId?: number;
}

export const [CreateRuleDrawerProvider, useCreateRuleDrawer] = constate(() => {
  const [state, setState] = useState<CreateRuleDrawerState>({
    visible: false,
    editMode: false,
    editingRuleId: undefined,
  });

  const openDrawer = () => {
    setState({
      visible: true,
      editMode: false,
      editingRuleId: undefined,
    });
  };

  const openEditDrawer = (ruleId: number) => {
    setState({
      visible: true,
      editMode: true,
      editingRuleId: ruleId,
    });
  };

  const closeDrawer = () => {
    setState({
      visible: false,
      editMode: false,
      editingRuleId: undefined,
    });
  };

  const updateDrawerState = (updates: Partial<CreateRuleDrawerState>) => {
    setState(prev => ({ ...prev, ...updates }));
  };

  return {
    state,
    openDrawer,
    openEditDrawer,
    closeDrawer,
    updateDrawerState,
  };
});
