import React from 'react';
import { Empty, Splitter } from 'antd';
import { Request } from './Request';
import { Response } from './Reponse';
import { useSelectRequest } from '../store/selectRequestStore';

export const Contents: React.FC = (_props) => {
  const [sizes, setSizes] = React.useState<(number | string)[]>(['50%', '50%']);
  const { selectRequest } = useSelectRequest();
  
  if (!selectRequest) {
    return (
      <div className="flex flex-1  items-center justify-center">
        <Empty description={false} />
      </div>
    );
  }

  return (
    <Splitter
      layout="vertical"
      onResize={(sizes) => {
        if (sizes[0] != null && sizes[1] != null) {
          setSizes([Math.max(sizes[0], 40), Math.max(sizes[1], 40)]);
        }
      }}
    >
      <Splitter.Panel
        defaultSize={'50%'}
        size={sizes[0]}
        min={40}
        max={'70%'}
        className='flex'
      >
        <Request />
      </Splitter.Panel>
      <Splitter.Panel
        defaultSize={'50%'}
        size={sizes[1]}
        min={40}
        max={'70%'}
        className='flex'
      >
        <Response />
      </Splitter.Panel>
    </Splitter>
  );
};
