import { Spin, Splitter } from 'antd';
import React from 'react';
import { Detail } from '../Detail';
import { RequestTree } from '../RequestTree';
import { useSplitSize } from '../Sequence';

interface IStructureProps { }

export const Structure: React.FC<IStructureProps> = () => {
  const { ref, size, splitSize, setSplitSize } = useSplitSize();

  return (
    <div className="animate-fade-in flex-1 flex">
      <div ref={ref} className="flex flex-1">
        {!size ? (
          <div className="flex flex-1  items-center justify-center">
            <Spin />
          </div>
        ) : (
          <Splitter
            onResize={([size1, size2]) => {
              setSplitSize([size1, size2]);
            }}
            className="flex-1 max-h-screen"
            layout="horizontal"
          >
            <Splitter.Panel
              size={splitSize[0]}
              className="flex flex-col"
              min={400}
              max="70%"
            >
              <RequestTree />
            </Splitter.Panel>
            <Splitter.Panel className="flex " size={splitSize[1]} min={'40%'} max="90%" >
              123
              <Detail />
            </Splitter.Panel>
          </Splitter>
        )}
      </div>
    </div>
  );
};
