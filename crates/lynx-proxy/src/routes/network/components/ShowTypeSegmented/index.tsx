import { Segmented } from 'antd';
import { useState } from 'react';
import constate from 'constate';

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

  return (
    <Segmented
      className="bg-white"
      options={options}
      value={state}
      onChange={(value) => {
        setState(value);
      }}
    />
  );
}
