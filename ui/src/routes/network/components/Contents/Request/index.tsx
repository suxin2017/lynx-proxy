import React from 'react';
import { Tabs } from 'antd';
import HexViewer from '@/routes/network/components/Contents/HexViewer';
import { JsonPreview } from '@/routes/network/components/Contents/JsonPreview';
import { Headers } from '@/routes/network/components/Contents/Headers';
import { useSelectRequest } from '../../store/requestTableStore';
import { useGetRequestBodyQuery } from '@/api/request';

interface IContentsProps {}
const sampleData = new TextEncoder().encode(
  'This is a sample string to demonstrate a hex viewer.',
);
export const Request: React.FC<IContentsProps> = (_props) => {
  const selectRequest = useSelectRequest();
  const { data, isLoading } = useGetRequestBodyQuery({
    uri: selectRequest?.uri,
  });
  console.log(data, isLoading, 'data2');
  return (
    <Tabs
      tabBarExtraContent={{ left: <span className="p-2">Request</span> }}
      className="h-full"
      defaultActiveKey="1"
      size="small"
      type="card"
      items={[
        { key: '0', label: 'Headers', children: <Headers /> },
        { key: '1', label: 'Hex', children: <HexViewer data={data} /> },
        { key: '2', label: 'Json', children: <JsonPreview /> },
      ]}
    />
  );
};
