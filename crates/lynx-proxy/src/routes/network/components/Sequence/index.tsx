import { Splitter } from 'antd';
import React, { useRef } from 'react';
import { Detail } from '../Detail';
import { RequestTable } from '../RequestTable';
import { ShowTypeSegmented } from '../ShowTypeSegmented';
import { Toolbar } from '../Toolbar';
import { useSize } from 'ahooks';

interface ISequenceProps {}

export const Sequence: React.FC<ISequenceProps> = () => {
  const ref = useRef(null);
  const size = useSize(ref);

  return (
    <div className="animate-fade-in flex h-full w-full flex-1 flex-col">
      <div className="flex items-center">
        <ShowTypeSegmented />
        <Toolbar />
      </div>
      <div className="flex-1 max-h-full" ref={ref}>
        <Splitter
          className="h-full"
          layout="vertical"
        >
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
