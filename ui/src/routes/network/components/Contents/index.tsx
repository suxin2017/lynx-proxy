import React from 'react';
import { JsonPreview } from './JsonPreview';
import HexViewer from './HexViewer';
import { Splitter, Tabs } from 'antd';
import { Headers } from './Headers';
import { Request } from './Request';
import { Response } from './Reponse';

interface IContentsProps { }
const sampleData = new TextEncoder().encode(
  'This is a sample string to demonstrate a hex viewer.'
);
export const Contents: React.FC<IContentsProps> = (_props) => {
  return (
    <Splitter className="h-full" layout="vertical">
      <Splitter.Panel defaultSize="50%" min="20%" max="70%">
        <Request />
      </Splitter.Panel>
      <Splitter.Panel defaultSize="50%" min="20%" max="70%">
        <Response />
      </Splitter.Panel>
    </Splitter>
  );
};
