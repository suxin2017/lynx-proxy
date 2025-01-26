import { Splitter } from 'antd';
import React from 'react';
import { Detail } from '../Detail';
import { RequestTree } from '../RequestTree';
import { ShowTypeSegmented } from '../ShowTypeSegmented';

interface IStructureProps {}

export const Structure: React.FC<IStructureProps> = () => {
  return (
    <Splitter className="h-full bg-white flex" layout="horizontal">
      <Splitter.Panel
        className="flex flex-col"
        defaultSize="20%"
        min="20%"
        max="70%"
      >
        <ShowTypeSegmented />
        <RequestTree />
      </Splitter.Panel>
      <Splitter.Panel defaultSize="80%" min="20%" max="80%">
        <Detail />
      </Splitter.Panel>
    </Splitter>
  );
};
