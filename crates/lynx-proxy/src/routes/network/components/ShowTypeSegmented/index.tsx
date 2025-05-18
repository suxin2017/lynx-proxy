import { Segmented, Tag } from 'antd';
import { useState } from 'react';
import constate from 'constate';
import { useRequestLogCount } from '@/store/requestTableStore';
import { useTranslation } from 'react-i18next';

export const [
  ShowTypeSegmentedStateContextProvider,
  useShowTypeSegmentedStateContext,
] = constate(() => {
  const [state, setState] = useState('Sequence');

  return {
    state,
    setState,
  };
});

export function ShowTypeSegmented() {
  const { t } = useTranslation();
  const { state, setState } = useShowTypeSegmentedStateContext();
  const requestCount = useRequestLogCount();

  const options = [t('network.sequence'), t('network.structure')];

  return (
    <div className="mb-2">
      <Segmented
        options={options}
        value={t(`network.${state.toLowerCase()}`)}
        onChange={(value) => {
          setState(value === t('network.sequence') ? 'Sequence' : 'Structure');
        }}
      />
      <Tag className="ml-2">{requestCount}</Tag>
    </div>
  );
}
