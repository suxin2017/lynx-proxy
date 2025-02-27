import React, { useMemo, useState } from 'react';
import { List, AutoSizer } from 'react-virtualized';

interface HexViewerProps {
  arrayBuffer?: ArrayBuffer;
}

const HexViewer: React.FC<HexViewerProps> = ({ arrayBuffer }) => {
  const data = useMemo(() => {
    if (!arrayBuffer) return null;
    return new Uint8Array(arrayBuffer);
  }, [arrayBuffer]);
  const [selection, setSelection] = useState<[number, number] | null>(null); // [start, end]
  const [isSelecting, setIsSelecting] = useState(false);

  const formatHex = (byte: number) =>
    byte.toString(16).padStart(2, '0').toUpperCase();
  const formatAscii = (byte: number) =>
    byte >= 32 && byte <= 126 ? String.fromCharCode(byte) : '.';

  const startSelection = (index: number) => {
    setSelection([index, index]);
    setIsSelecting(true);
  };

  const updateSelection = (index: number) => {
    if (isSelecting && selection) {
      const [start] = selection;
      setSelection([start, index]);
    }
  };

  const endSelection = () => {
    setIsSelecting(false);
  };

  const isSelected = (index: number) => {
    if (!selection) return false;
    const [start, end] = selection;
    const min = Math.min(start, end);
    const max = Math.max(start, end);
    return index >= min && index <= max;
  };

  const renderHeader = () => {
    const headers = Array.from({ length: 16 }, (_, i) => formatHex(i));
    return (
      <div className="flex items-center border-b border-gray-300 text-gray-600 font-bold">
        <span className="w-[8ch] text-right mr-4"></span>
        {headers.map((header, idx) => (
          <span key={idx} className="w-6 text-center">
            {header}
          </span>
        ))}
        <span className="flex-1 text-left pl-4">Decoded Text</span>
      </div>
    );
  };

  const renderRow = ({
    index,
    key,
    style,
  }: {
    index: number;
    key: string;
    style: React.CSSProperties;
  }) => {
    const offset = (index * 16).toString(16).padStart(8, '0').toUpperCase();
    const hexBytes = Array.from(data!.slice(index * 16, index * 16 + 16));

    return (
      <div key={key} style={style} className="flex items-center">
        <span className="w-[8ch] text-right text-gray-500 mr-4 select-none">{offset}</span>
        {hexBytes.map((byte, idx) => {
          const globalIndex = index * 16 + idx;
          return (
            <span
              key={idx}
              className={`w-6 text-center cursor-pointer `}
              onMouseDown={() => startSelection(globalIndex)}
              onMouseEnter={() => updateSelection(globalIndex)}
            >
              {formatHex(byte)}
            </span>
          );
        })}
        {hexBytes.length < 16 &&
          Array.from({ length: 16 - hexBytes.length }).map((_, idx) => (
            <span key={idx} className="w-6"></span>
          ))}
        <span className="flex-1 pl-4 text-gray-700">
          {hexBytes.map((byte, idx) => {
            const globalIndex = index * 16 + idx;
            const selected = isSelected(globalIndex);
            return (
              <span
                key={idx}
                className={`cursor-pointer ${selected ? 'bg-blue-200' : ''}`}
                onMouseDown={() => startSelection(globalIndex)}
                onMouseEnter={() => updateSelection(globalIndex)}
              >
                {formatAscii(byte)}
              </span>
            );
          })}
        </span>
      </div>
    );
  };

  if (!data) return null;

  return (
    <div
      className="border border-gray-300 rounded-sm p-1 font-mono text-xs flex h-full flex-col"
      onMouseUp={endSelection} // Finish selection
    >
      {renderHeader()}
      <div className="flex-1">
        <AutoSizer>
          {({ height, width }) => (
            <List
              height={height}
              width={width}
              rowCount={Math.ceil(data.length / 16)}
              rowHeight={24}
              rowRenderer={renderRow}
            />
          )}
        </AutoSizer>
      </div>
    </div>
  );
};

export default HexViewer;
