import { RequestContextMenu, useRequestContextMenuContext } from '@/components/RequestContextMenu';
import { MessageEventTimings } from '@/services/generated/utoipaAxum.schemas';
import { useFilteredTableData } from '@/store/requestTableStore';
import { useKeyPress } from 'ahooks';
import { Empty, theme } from 'antd';
import { get } from 'lodash';
import prettyMs from 'pretty-ms';
import React, { useCallback } from 'react';
import { AutoSizer, List, ListRowRenderer } from 'react-virtualized';
import { useCustomColumnContext } from '../CustomColumn/hook';
import { useSelectRequest } from '../store/selectRequestStore';


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

  const requestTable = useFilteredTableData();
  const listRef = React.useRef<List>(null);
  const { selectRequest, setSelectRequest, selectedRequest } = useSelectRequest();

  const { token } = useToken();
  const {customColumns: columns} = useCustomColumnContext()

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
    <div className="h-full flex items-center justify-center ">
      <Empty description={null} />
    </div>
  );

  const { handleContextMenu } = useRequestContextMenuContext();


  const rowRenderer: ListRowRenderer = useCallback(({ index, key, style }) => {
    const data = requestTable[index];
    const hasSelectedRequest = selectedRequest[data?.traceId];

    const activeClass = selectRequest?.traceId === data?.traceId ? 'bg-blue-100 dark:bg-blue-400' : '';
    const hasClicked = hasSelectedRequest && !activeClass ? 'text-stone-500 dark:text-stone-600' : '';
    return (
      <div key={key} style={{
        ...style,
        borderColor: token.colorBorder,
      }}
        onContextMenu={(e) => {
          handleContextMenu(data, e);
        }}
        className={`flex items-center cursor-pointer hover:bg-gray-100 border-b dark:hover:bg-gray-700 transition-colors ${activeClass} ${hasClicked}`} onClick={() => {
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
  }, [columns, handleContextMenu, requestTable, selectRequest?.traceId, selectedRequest, setSelectRequest, token.colorBorder])

  const width = columns.reduce((total, column) => total + (column.width || 60), 0);
  return <div className="flex flex-1  flex-col">
    <div className=" flex border-b border-gray-200 dark:border-gray-500 h-10 items-center">
      {columns.map((column) => (
        <div key={column.key} style={{ display: 'inline-block', minWidth: column.minWidth, width: column.width, textAlign: column.align as React.CSSProperties['textAlign'] ?? "left", flex: column.width ? 'none' : 1 }} className="text-center">
          <strong>{column.title}</strong>
        </div>
      ))}
    </div>
    <RequestContextMenu>
      <div className="flex flex-1">
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