import { Descriptions } from 'antd';
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

  return (
    <Descriptions
      bordered
      size="small"
      labelStyle={{ width: 200 }}
      column={1}
      items={items}
    />
  );
};
