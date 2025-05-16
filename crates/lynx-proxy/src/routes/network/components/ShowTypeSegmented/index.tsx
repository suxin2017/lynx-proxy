import { Segmented, Tag } from 'antd';
import { useState } from 'react';
import constate from 'constate';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';

const options = ['Sequence', 'Structure'];

export const [
  ShowTypeSegmentedStateContextProvider,
  useShowTypeSegmentedStateContext,
] = constate(() => {
  const [state, setState] = useState(options[0]);

  return {
    state,
    setState,
  };
});

export function ShowTypeSegmented() {
  const { state, setState } = useShowTypeSegmentedStateContext();
  const requestLogLength = useSelector(
    (state: RootState) => state.requestTable.requests?.length,
  );

  return (
    <div className="flex min-w-56 items-center">
      <Segmented
        options={options}
        value={state}
        onChange={(value) => {
          setState(value);
        }}
      />
      <div className="text-xs font-light">
        <Tag color="blue">Requests: {requestLogLength}</Tag>
      </div>
    </div>
  );
}
