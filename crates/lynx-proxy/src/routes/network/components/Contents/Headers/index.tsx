import { Descriptions, Empty } from 'antd';
import { keys, map } from 'lodash';
import React, { useMemo } from 'react';

interface IOverviewProps {
  data?: Record<string, string>;
}

export const Headers: React.FC<IOverviewProps> = ({ data }) => {
  const items = useMemo(() => {
    if (data) {
      return map(keys(data), (key) => {
        return {
          key,
          label: key,
          children: <p>{data[key]}</p>,
        };
      });
    }
  }, [data]);

  if (!data) {
    return (
      <div className="flex flex-1  items-center justify-center">
        <Empty />
      </div>
    );
  }
  return (
    <Descriptions
      bordered
      size="small"
      className="[&_p]:m-0"
      styles={{ label: { width: 200 } }}
      column={1}
      items={items}
    />
  );
};
