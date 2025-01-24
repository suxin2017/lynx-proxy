import React from 'react';
import { Tabs } from 'antd';
import HexViewer from '@/routes/network/components/Contents/HexViewer';
import { JsonPreview } from '@/routes/network/components/Contents/JsonPreview';
import { Headers } from '@/routes/network/components/Contents/Headers';

interface IContentsProps { }
const sampleData = new TextEncoder().encode(
    'This is a sample string to demonstrate a hex viewer.'
);
export const Response: React.FC<IContentsProps> = (_props) => {
    return (
        <Tabs tabBarExtraContent={{ left: <span className="p-2">Response</span> }} defaultActiveKey="1" size="small" type="card" items={[
            { key: '0', label: "Headers", children: <Headers /> },
            { key: '1', label: 'Hex', children: <HexViewer data={sampleData} /> },
            { key: '2', label: 'Json', children: <JsonPreview /> },
        ]} />

    );
};
