import { Collapse, Typography } from 'antd';
import React from 'react';
import { Connect } from './Connect';

interface IHandlerProps {}

export const Handler: React.FC<IHandlerProps> = () => {
  return (
    <div>
      <Typography.Title level={4}>Handler</Typography.Title>
      <Collapse
        ghost
        className="[&_.ant-collapse-header]:flex [&_.ant-collapse-header]:items-center"
        expandIconPosition="right"
        defaultActiveKey={['connect', 'request', 'response']}
      >
        <Collapse.Panel
          header={<span className="text-sm">Connect</span>}
          key="connect"
        >
          <Connect />
        </Collapse.Panel>
        {/* <Collapse.Panel
          header={<span className="text-sm">Request</span>}
          key="request"
        >
          <Request />
        </Collapse.Panel> */}
        {/* <Collapse.Panel
          header={<span className="text-sm">Request</span>}
          key="response"
        >
          <Connect />
        </Collapse.Panel> */}
      </Collapse>
    </div>
  );
};
