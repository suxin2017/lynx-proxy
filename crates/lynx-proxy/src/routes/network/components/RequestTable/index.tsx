import { MessageEventTimings } from '@/services/generated/utoipaAxum.schemas';
import { IViewMessageEventStoreValue } from '@/store';
import { useFilteredTableData } from '@/store/requestTableStore';
import { useKeyPress } from 'ahooks';
import { Empty, theme, Typography } from 'antd';
import dayjs from 'dayjs';
import { get } from 'lodash';
import React, { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { AutoSizer, List, ListRowRenderer } from 'react-virtualized';
import { useSelectRequest } from '../store/selectRequestStore';
import prettyMs from 'pretty-ms';
import duration from 'dayjs/plugin/duration';
import relativeTime from 'dayjs/plugin/relativeTime';
import { RequestContextMenu, useRequestContextMenuContext } from '@/components/RequestContextMenu';
import { AppIcon } from './utils/remixAppDetector';

dayjs.extend(duration);
dayjs.extend(relativeTime);

const { useToken } = theme;

export const getDurationTime = (timings: MessageEventTimings) => {
  const {
    requestStart,
    requestEnd,
    tunnelEnd,
    tunnelStart,
    reponseBodyStart,
    reponseBodyEnd,
    websocketEnd,
    websocketStart,
  } = timings ?? {};

  if (tunnelStart) {
    return prettyMs((tunnelEnd ?? Date.now()) - tunnelStart);
  }
  if (websocketStart && requestStart) {
    return prettyMs((websocketEnd ?? Date.now()) - requestStart);
  }
  if (reponseBodyStart && requestStart) {
    return prettyMs((reponseBodyEnd ?? Date.now()) - requestStart);
  }
  if (requestStart) {
    return prettyMs((requestEnd ?? Date.now()) - requestStart);
  }

  return '-';
};
export const RequestTable: React.FC = () => {
  const { t } = useTranslation();
  const requestTable = useFilteredTableData();
  const listRef = React.useRef<List>(null);
  const { selectRequest, setSelectRequest } = useSelectRequest();
  const { token } = useToken();

  const columns = useMemo(() => [
    {
      title: '#',
      width: 40,
      dataIndex: 'traceId',
      key: 'traceId',
      align: 'center',
      ellipsis: true,
      render: (_traceId: string, _raw: IViewMessageEventStoreValue, index: number) => {
        return <Typography.Text ellipsis>{index}</Typography.Text>;
      },
    },
    {
      title: t('network.table.app'),
      width: 50,
      key: 'app',
      align: 'center',
      ellipsis: true,
      render: (_value: unknown, raw: IViewMessageEventStoreValue) => {
        const headers = raw?.request?.headers || {};
        return <AppIcon headers={headers} size={16} />;
      },
    },
    {
      title: t('network.table.status'),
      width: 100,
      key: 'status',
      dataIndex: ['response', 'status'],
      ellipsis: true,
      render: (status: number, raw: IViewMessageEventStoreValue) => {
        if (raw?.request?.headers?.['connection'] === 'Upgrade') {
          return <span>101</span>;
        }
        if (raw?.tunnel) {
          return <span>{raw.tunnel?.status}</span>;
        }
        if (!status) {
          return '-';
        }
        return <span>{status}</span>;
      },
    },
    {
      title: t('network.table.path'),
      key: 'uri',
      minWidth: 60,
      ellipsis: true,
      dataIndex: ['request', 'url'],
    },
    {
      title: t('network.table.schema'),
      width: 80,
      key: 'schema',
      dataIndex: ['request', 'url'],
      ellipsis: true,
      render: (url: string, raw: IViewMessageEventStoreValue) => {
        if (raw?.tunnel) {
          return <span>Tunnel</span>;
        }
        if (!url) {
          return '-';
        }
        try {
          const protocol = new URL(url).protocol;

          if (
            raw?.request?.headers?.['connection'] === 'Upgrade' &&
            raw?.request?.headers?.['upgrade'] === 'websocket' &&
            raw?.request?.headers?.['sec-websocket-key'] !== undefined
          ) {
            if (protocol === 'http:') {
              return <span>ws</span>;
            }
            if (protocol === 'https:') {
              return <span>wss</span>;
            }
          }

          return <span>{protocol}</span>;
        } catch (e) {
          console.error(e);
          return '-';
        }
      },
    },
    {
      title: t('network.table.version'),
      width: 80,
      ellipsis: true,
      key: 'version',
      dataIndex: ['request', 'version'],
    },
    {
      title: t('network.table.method'),
      width: 80,
      ellipsis: true,
      dataIndex: ['request', 'method'],
      key: 'method',
    },

    {
      title: t('network.table.type'),
      key: 'type',
      width: 200,
      ellipsis: true,
      dataIndex: ['response', 'headers', 'content-type'],
      render: (type: string, raw: IViewMessageEventStoreValue) => {
        if (raw?.request?.headers?.['connection'] === 'Upgrade') {
          return <span>Upgrade</span>;
        }
        if (!type) {
          return '-';
        }

        const contentType = type.split(';')[0];
        return <span>{contentType}</span>;
      },
    },
    {
      title: t('network.table.startTime'),
      key: 'startTime',
      width: 160,
      dataIndex: ['timings', 'requestStart'],
      render: (requestStart: number) => {
        if (!requestStart) {
          return '-';
        }
        const formattedTime = dayjs(requestStart).format('YYYY-MM-DD HH:mm:ss');
        return <span>{formattedTime}</span>;
      },
    },

    {
      title: t('network.table.time'),
      key: 'time',
      width: 140,
      dataIndex: ['timings'],
      render: (timings: MessageEventTimings) => {
        return getDurationTime(timings);
      },
    },
  ] as {
    title: string;
    width?: number;
    minWidth?: number;
    dataIndex: string | string[];
    key?: string;
    align?: 'left' | 'center' | 'right';
    ellipsis?: boolean;
    render?: (value: unknown, record: unknown, index: number) => React.ReactNode;
  }[], [t]);


  useKeyPress(38, () => {
    if (selectRequest) {
      const currentIndex = requestTable.findIndex(
        (item) => item.traceId === selectRequest?.traceId,
      );
      if (currentIndex > 0) {
        setSelectRequest(requestTable[currentIndex - 1]);
        listRef.current?.scrollToRow(currentIndex - 1);
      }
    }
  });

  useKeyPress(40, () => {
    if (selectRequest) {
      const currentIndex = requestTable.findIndex(
        (item) => item.traceId === selectRequest?.traceId,
      );
      if (currentIndex < requestTable.length - 1) {
        setSelectRequest(requestTable[currentIndex + 1]);
        listRef.current?.scrollToRow(currentIndex + 1);
      }
    }
  });

  const noRowsRenderer = () => (
    <div className="flex items-center justify-center h-full">
      <Empty description={null} />
    </div>
  );

  const { handleContextMenu } = useRequestContextMenuContext();


  const rowRenderer: ListRowRenderer = useCallback(({ index, key, style }) => {
    const data = requestTable[index];
    const activeClass = selectRequest?.traceId === data?.traceId ? 'bg-blue-100 dark:bg-blue-500' : '';
    return (
      <div key={key} style={{
        ...style,
        borderColor: token.colorBorder,
      }}
        onContextMenu={(e) => {
          handleContextMenu(data, e);
        }}
        className={`flex items-center cursor-pointer hover:bg-gray-100 border-b dark:hover:bg-gray-700 transition-colors ${activeClass}`} onClick={() => {
          if (data) {
            setSelectRequest(data);
          }
        }} >
        {columns.map((column) => {
          const col = get(data, column.dataIndex);
          const columnNode = column.render?.(col, data, index);
          return (
            <div key={column.key} style={{ display: 'inline-block', minWidth: column.minWidth, width: column.width, textAlign: column.align as React.CSSProperties['textAlign'] ?? "left", flex: column.width ? 'none' : 1 }}
              className="text-ellipsis overflow-hidden whitespace-nowrap  ">
              {columnNode ? columnNode : col}
            </div>
          )
        })}
      </div>
    );
  }, [columns, handleContextMenu, requestTable, selectRequest?.traceId, setSelectRequest, token.colorBorder])

  const width = columns.reduce((total, column) => total + (column.width || 60), 0);
  return <div className="w-full h-full overflow-x-auto overflow-y-hidden">
    <div className="w-full flex border-b border-gray-200 dark:border-gray-500 h-10 items-center">
      {columns.map((column) => (
        <div key={column.key} style={{ display: 'inline-block', minWidth: column.minWidth, width: column.width, textAlign: column.align as React.CSSProperties['textAlign'] ?? "left", flex: column.width ? 'none' : 1 }} className="text-center">
          <strong>{column.title}</strong>
        </div>
      ))}
    </div>
    <RequestContextMenu>

      <div className="w-full h-full">

        <AutoSizer>
          {({ width: contentWidth, height }) => {
            const maxWidth = Math.max(contentWidth, width);
            return <List
              ref={listRef}
              height={height - 40}
              overscanRowCount={10}
              noRowsRenderer={noRowsRenderer}
              rowCount={requestTable?.length ?? 0}
              rowHeight={
                36
              }
              rowRenderer={rowRenderer}
              width={maxWidth}
            />

          }}
        </AutoSizer>
      </div>
    </RequestContextMenu>


  </div >
}