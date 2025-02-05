import { Descriptions, Empty } from 'antd';
import React, { useMemo } from 'react';
import { keys, map } from 'lodash';
import { useSelectRequest } from '../store/selectRequestStore';

interface IOverviewProps {}

export const Overview: React.FC<IOverviewProps> = (_props) => {
  const selectRequest = useSelectRequest();
  const descriptionItems = useMemo(() => {
    const items = [];
    if (selectRequest?.uri) {
      items.push({
        key: 'url',
        label: 'URL',
        children: <p>{selectRequest.uri}</p>,
      });
    }
    if (selectRequest?.version) {
      items.push({
        key: 'version',
        label: 'Version',
        children: <p>{selectRequest.version}</p>,
      });
    }
    if (selectRequest?.statusCode) {
      items.push({
        key: 'status',
        label: 'Status',
        children: <p>{selectRequest.statusCode}</p>,
      });
    }

    if (selectRequest?.method) {
      items.push({
        key: 'method',
        label: 'Method',
        children: <p>{selectRequest.method}</p>,
      });
    }

    if (selectRequest?.header) {
      const headerItems = map(keys(selectRequest.header), (key) => {
        return {
          key,
          label: key,
          children: <p>{selectRequest.header[key]}</p>,
        };
      });
      items.push(...headerItems);
    }
    console.log(items, 'items');
    return items;
  }, [selectRequest?.header, selectRequest?.method, selectRequest?.statusCode, selectRequest?.uri, selectRequest?.version]);

  if (!descriptionItems) {
    return (
      <div className="h-full flex justify-center items-center">
        <Empty description={false} />
      </div>
    );
  }

  return (
    <Descriptions
      styles={{ label: { width: 180, textAlign: 'right' } }}
      bordered
      className="[&_p]:m-0 h-full overflow-auto"
      size="middle"
      column={1}
      items={descriptionItems}
    />
  );
};
