import { Descriptions, Empty } from 'antd';
import React, { useMemo } from 'react';
import { keys, map } from 'lodash';
import { useSelectRequest } from '../store/selectRequestStore';

interface IOverviewProps {}

export const Overview: React.FC<IOverviewProps> = (_props) => {
  const { selectRequest } = useSelectRequest();
  const descriptionItems = useMemo(() => {
    const items = [];
    if (selectRequest?.request?.url) {
      items.push({
        key: 'url',
        label: 'URL',
        children: <p>{selectRequest.request.url}</p>,
      });
    }
    if (selectRequest?.request?.version) {
      items.push({
        key: 'version',
        label: 'Version',
        children: <p>{selectRequest.request.version}</p>,
      });
    }
    if (selectRequest?.response?.status) {
      items.push({
        key: 'status',
        label: 'Status',
        children: <p>{selectRequest.response.status}</p>,
      });
    }

    if (selectRequest?.request?.method) {
      items.push({
        key: 'method',
        label: 'Method',
        children: <p>{selectRequest.request.method}</p>,
      });
    }

    if (selectRequest?.request?.headers) {
      const headerItems = map(keys(selectRequest.request.headers), (key) => {
        return {
          key,
          label: key,
          children: <p>{selectRequest.request?.headers[key]}</p>,
        };
      });
      items.push(...headerItems);
    }
    console.log(items, 'items');
    return items;
  }, [
    selectRequest?.request?.url,
    selectRequest?.request?.version,
    selectRequest?.response?.status,
    selectRequest?.request?.method,
    selectRequest?.request?.headers,
  ]);

  if (!descriptionItems) {
    return (
      <div className="flex h-full items-center justify-center">
        <Empty description={false} />
      </div>
    );
  }

  return (
    <Descriptions
      styles={{ label: { width: 180, textAlign: 'right' } }}
      bordered
      className="h-full overflow-auto [&_p]:m-0"
      size="small"
      column={1}
      items={descriptionItems}
    />
  );
};
