import React, { useMemo } from 'react';
import { Tabs } from 'antd';
import HexViewer from '@/routes/network/components/Contents/HexViewer';
import { JsonPreview } from '@/routes/network/components/Contents/JsonPreview';
import { Headers } from '@/routes/network/components/Contents/Headers';
import { filter } from 'lodash';
import { ifTrue } from '@/utils/ifTrue';
import { MediaViewer } from '../MediaViewer';

interface IContentsProps {
  title: string;
  contentType?: string;
  body?: ArrayBuffer;
  headers?: Record<string, string>;
}

export const ContextTabs: React.FC<IContentsProps> = ({
  title,
  body,
  contentType,
  headers,
}) => {
  const items = useMemo(() => {
    const contextTypeJson = !!contentType?.includes('application/json');
    const contextTypeImage = !!contentType?.includes('image');
    return filter(
      [
        {
          key: '0',
          label: 'Headers',
          children: <Headers data={headers} />,
        },
        ifTrue(contextTypeJson, {
          key: '2',
          label: 'Json',
          children: <JsonPreview arrayBuffer={body} />,
        }),
        ifTrue(contextTypeImage, {
          key: '3',
          label: 'Preview',
          children: <MediaViewer arrayBuffer={body} />,
        }),
        {
          key: '1',
          label: 'Hex',
          children: <HexViewer arrayBuffer={body} />,
        },
      ],
      (item) => item != null,
    );
  }, [body, contentType, headers]);

  return (
    <Tabs
      tabBarExtraContent={{ left: <span className="p-2">{title}</span> }}
      className="h-full"
      defaultActiveKey="0"
      size="small"
      type="card"
      items={items}
    />
  );
};
