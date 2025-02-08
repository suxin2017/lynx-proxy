import { Splitter } from 'antd';
import React from 'react';
import { Detail } from '../Detail';
import { RequestTable } from '../RequestTable';
import { ShowTypeSegmented } from '../ShowTypeSegmented';
import { Toolbar } from '../Toolbar';

interface ISequenceProps {}

export const Sequence: React.FC<ISequenceProps> = () => {
  return (
    <div className="flex-1 flex flex-col h-full w-full animate-fade-in">
      <div className="flex items-center">
        <ShowTypeSegmented />
        <Toolbar />
      </div>
      <div className="flex-1">
        <Splitter className="h-full bg-white" layout="vertical">
          <Splitter.Panel defaultSize="50%" min="10%" max="90%">
            <RequestTable />
          </Splitter.Panel>
          <Splitter.Panel defaultSize="50%" min="10%" max="90%">
            <Detail />
          </Splitter.Panel>
        </Splitter>
      </div>
    </div>
  );
};
