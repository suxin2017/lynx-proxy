import { Splitter } from 'antd';
import React from 'react';
import { Detail } from '../Detail';
import { RequestTable } from '../RequestTable';

interface ISequenceProps {}

export const Sequence: React.FC<ISequenceProps> = () => {
  return (
    <Splitter className="h-full bg-white" layout="vertical">
      <Splitter.Panel defaultSize="50%" min="10%" max="90%">
        <RequestTable />
      </Splitter.Panel>
      <Splitter.Panel defaultSize="50%" min="10%" max="90%">
        <Detail />
      </Splitter.Panel>
    </Splitter>
  );
};
