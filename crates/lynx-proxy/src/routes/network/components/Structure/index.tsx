import { Splitter } from 'antd';
import React, { useEffect, useRef } from 'react';
import { Detail } from '../Detail';
import { ShowTypeSegmented } from '../ShowTypeSegmented';
import { RequestTree } from '../RequestTree';
import { useSize } from 'ahooks';
import { Toolbar } from '../Toolbar';

interface IStructureProps {}

export const Structure: React.FC<IStructureProps> = () => {
  const ref = useRef<HTMLDivElement>(null);
  const size = useSize(ref);
  const [sizes, setSizes] = React.useState([320, 400]);

  useEffect(() => {
    if (size?.width) {
      setSizes([320, size.width - 240]);
    }
  }, [size?.width]);

  return (
    <div className="animate-fade-in flex-1">
      <div ref={ref} className="h-full">
        {size && (
          <Splitter
            onResize={(sizes) => {
              if (sizes[0] < 240) {
                return;
              }
              setSizes(sizes);
            }}
            className="h-full max-h-screen"
            layout="horizontal"
          >
            <Splitter.Panel
              size={sizes[0]}
              className="flex flex-col"
              min={320}
              max="70%"
            >
              <ShowTypeSegmented />
              <RequestTree />
            </Splitter.Panel>
            <Splitter.Panel size={sizes[1]} min={'40%'} max="90%">
              <div className="flex h-full flex-col">
                <Toolbar />
                <Detail />
              </div>
            </Splitter.Panel>
          </Splitter>
        )}
      </div>
    </div>
  );
};
