import { usePrevious, useSize } from 'ahooks';
import { Grid, Spin, Splitter } from 'antd';
import React, { useEffect, useRef, useState } from 'react';
import { Detail } from '../Detail';
import { RequestTable } from '../RequestTable';


interface ISequenceProps { }

const { useBreakpoint } = Grid;

export const useSplitSize = () => {
  const ref = useRef<HTMLDivElement>(null);

  const defaultSize = useRef<[number, number]>([0, 0]);

  const screens = useBreakpoint();

  const size = useSize(ref);
  const prevSize = usePrevious(size);

  const [splitSize, setSplitSize] = useState<[number, number]>([0, 0]);

  useEffect(() => {
    if (!prevSize && size && screens) {
      let right = 400; // Default right panel width
      if (screens.xxl) {
        right = size.width / 4;
      } else if (screens.xl) {
        right = size.width / 3;
      } else if (screens.lg) {
        right = size.width / 2;
      }

      const left = size.width - right;
      defaultSize.current = [left, right];
      setSplitSize([left, right]);
    }
  }, [size, prevSize, screens]);
  return { ref, size, splitSize, setSplitSize, defaultSize };
}

export const Sequence: React.FC<ISequenceProps> = () => {
  const { ref, size, splitSize, setSplitSize } = useSplitSize();

  return (
    <div className="flex-1 flex" ref={ref} >
      {!size ? (
        <div className="flex   items-center justify-center">
          <Spin />
        </div>
      ) : (
        <Splitter
          className=""
          layout="horizontal"
          onResize={([size1, size2]) => {
            setSplitSize([size1, size2]);
          }}
        >
          <Splitter.Panel className='flex' size={splitSize[0]} min="10%" max="90%">
            <RequestTable />
          </Splitter.Panel>
          <Splitter.Panel className='flex' size={splitSize[1]} min="10%" max="90%">
            <Detail />
          </Splitter.Panel>
        </Splitter>
      )}
    </div>
  );
};
