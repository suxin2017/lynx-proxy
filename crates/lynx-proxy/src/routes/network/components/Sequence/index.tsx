import { usePrevious, useSize } from 'ahooks';
import { Spin, Splitter } from 'antd';
import React, { useEffect, useRef, useState } from 'react';
import { Detail } from '../Detail';
import { RequestTable } from '../RequestTable';
import { ShowTypeSegmented } from '../ShowTypeSegmented';
import { AutoScrollProvider } from '../store/autoScrollStore';
import { Toolbar } from '../Toolbar';
import { AutoScrollToBottom } from '../BackToBottomButton';

interface ISequenceProps {}

export const Sequence: React.FC<ISequenceProps> = () => {
  const ref = useRef<HTMLDivElement>(null);
  const size = useSize(ref);
  const prevSize = usePrevious(size);

  const [splitSize, setSplitSize] = useState<[number, number]>([0, 0]);

  useEffect(() => {
    if (!prevSize && size) {
      setSplitSize([size.height / 2, size.height / 2]);
    }
  }, [size, prevSize]);

  return (
    <AutoScrollProvider>
      <div className="animate-fade-in flex h-full w-full flex-1 flex-col">
        <div className="flex items-center">
          <ShowTypeSegmented />
          <Toolbar>
            <AutoScrollToBottom />
          </Toolbar>
        </div>
        <div className="max-h-full flex-1" ref={ref}>
          {!size ? (
            <div className="flex h-full w-full items-center justify-center">
              <Spin />
            </div>
          ) : (
            <Splitter
              className="h-full"
              layout="vertical"
              onResize={([size1, size2]) => {
                setSplitSize([size1, size2]);
              }}
            >
              <Splitter.Panel size={splitSize[0]} min="10%" max="90%">
                <RequestTable maxHeight={splitSize[0]} />
              </Splitter.Panel>

              <Splitter.Panel size={splitSize[1]} min="10%" max="90%">
                <Detail />
              </Splitter.Panel>
            </Splitter>
          )}
        </div>
      </div>
    </AutoScrollProvider>
  );
};
