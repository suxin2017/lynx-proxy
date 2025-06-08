import { Spin, Splitter } from 'antd';
import React from 'react';
import { Detail } from '../Detail';
import { RequestTree } from '../RequestTree';
import { useSplitSize } from '../Sequence';

interface IStructureProps { }

export const Structure: React.FC<IStructureProps> = () => {
  const { ref, size, splitSize, setSplitSize } = useSplitSize();

  return (
    <div className="animate-fade-in flex-1">
      <div ref={ref} className="h-full">
        {!size ? (
          <div className="flex h-full w-full items-center justify-center">
            <Spin />
          </div>
        ) : (
          <Splitter
            onResize={([size1, size2]) => {
              setSplitSize([size1, size2]);
            }}
            className="h-full max-h-screen"
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
            <Splitter.Panel size={splitSize[1]} min={'40%'} max="90%" >
              <div className="flex h-full flex-col">
                <Detail />
              </div>
            </Splitter.Panel>
          </Splitter>
        )}
      </div>
    </div>
  );
};
