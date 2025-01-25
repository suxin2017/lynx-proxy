import { Descriptions, Empty } from 'antd';
import React, { useMemo } from 'react';
import { RootState } from '../store';
import { useSelector } from 'react-redux';
import { keys, map } from 'lodash';

interface IOverviewProps {}

export const Overview: React.FC<IOverviewProps> = (_props) => {
  const selectRequest = useSelector(
    (state: RootState) => state.requestTable.selectRequest,
  );
  const descriptionItems = useMemo(() => {
    if (selectRequest?.header) {
      return map(keys(selectRequest.header), (key) => {
        return {
          key,
          label: key,
          children: <p>{selectRequest.header[key]}</p>,
        };
      });
    }
  }, [selectRequest?.header]);

  if (!descriptionItems) {
    return <Empty />;
  }

  return (
    <Descriptions
      labelStyle={{ width: 120, textAlign: 'right' }}
      bordered
      size="small"
      column={1}
      items={descriptionItems}
    />
  );
};
