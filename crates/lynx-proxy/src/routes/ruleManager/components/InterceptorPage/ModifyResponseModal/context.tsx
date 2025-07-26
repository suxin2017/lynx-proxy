import constate from 'constate';
import { useState } from 'react';

export interface ModifyResponseModalState {
  visible: boolean;
  responseContent: string;
  statusCode?: number;
  headers?: Record<string, string>;
  ruleData?: any; // 存储完整的规则数据
}

export const [ModifyResponseModalProvider, useModifyResponseModal] = constate(() => {
  const [state, setState] = useState<ModifyResponseModalState>({
    visible: false,
    responseContent: '',
    statusCode: undefined,
    headers: undefined,
    ruleData: undefined,
  });

  const openModal = (initialData?: {
    responseContent?: string;
    statusCode?: number;
    headers?: Record<string, string>;
    ruleData?: any;
  }) => {
    setState({
      visible: true,
      responseContent: initialData?.responseContent || '',
      statusCode: initialData?.statusCode,
      headers: initialData?.headers,
      ruleData: initialData?.ruleData,
    });
  };

  const closeModal = () => {
    setState({
      visible: false,
      responseContent: '',
      statusCode: undefined,
      headers: undefined,
      ruleData: undefined,
    });
  };

  return {
    state,
    openModal,
    closeModal,
  };
});