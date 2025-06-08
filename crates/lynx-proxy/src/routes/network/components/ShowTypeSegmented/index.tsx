import { RiListUnordered, RiNodeTree } from '@remixicon/react';
import { Segmented } from 'antd';
import constate from 'constate';
import { useState } from 'react';
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


  return (
    <Segmented
      className='h-9 [&_.ant-segmented-item-label]:h-8 [&_.ant-segmented-item-label]:flex [&_.ant-segmented-item-label]:items-center'
      options={[
        { label: <RiListUnordered className="align-sub" size={18} />, value: t('network.sequence') },
        { label: <RiNodeTree className="align-sub" size={18} />, value: t('network.structure') },
      ]}
      value={t(`network.${state.toLowerCase()}`)}
      onChange={(value) => {
        setState(value === t('network.sequence') ? 'Sequence' : 'Structure');
      }}
    />
  );
}
