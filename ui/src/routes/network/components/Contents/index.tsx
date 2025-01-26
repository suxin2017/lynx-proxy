import React from 'react';
import { Splitter } from 'antd';
import { Request } from './Request';
import { Response } from './Reponse';

interface IContentsProps {}

export const Contents: React.FC<IContentsProps> = (_props) => {
  const [sizes, setSizes] = React.useState<(number | string)[]>(['50%', '50%']);

  return (
    <Splitter
      className="h-full"
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
        collapsible
      >
        <Request />
      </Splitter.Panel>
      <Splitter.Panel
        defaultSize={'50%'}
        size={sizes[1]}
        min={40}
        max={'70%'}
        collapsible
      >
        <Response />
      </Splitter.Panel>
    </Splitter>
  );
};
