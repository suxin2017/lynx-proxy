import React, { useMemo, useState } from 'react';
import { List, AutoSizer } from 'react-virtualized';
import { Select } from 'antd';

// Define character set types
type CharsetType = 'ASCII' | 'UTF-8' | 'UTF-16' | 'HEX';

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
  const [charset, setCharset] = useState<CharsetType>('ASCII');

  const formatHex = (byte: number) =>
    byte.toString(16).padStart(2, '0').toUpperCase();

  // Format a byte according to the selected charset
  const formatChar = (byte: number, idx: number, bytes: Uint8Array): string => {
    switch (charset) {
      case 'ASCII':
        return byte >= 32 && byte <= 126 ? String.fromCharCode(byte) : '.';
      case 'UTF-8':
        // Proper UTF-8 handling with multi-byte character detection
        if ((byte & 0x80) === 0) {
          // Single byte (0xxxxxxx)
          return byte >= 32 ? String.fromCharCode(byte) : '.';
        } else if ((byte & 0xe0) === 0xc0 && idx + 1 < bytes.length) {
          // Two bytes (110xxxxx 10xxxxxx)
          const nextByte = bytes[idx + 1];
          if ((nextByte & 0xc0) === 0x80) {
            const codePoint = ((byte & 0x1f) << 6) | (nextByte & 0x3f);
            return String.fromCodePoint(codePoint);
          }
        } else if ((byte & 0xf0) === 0xe0 && idx + 2 < bytes.length) {
          // Three bytes (1110xxxx 10xxxxxx 10xxxxxx)
          const nextByte1 = bytes[idx + 1];
          const nextByte2 = bytes[idx + 2];
          if ((nextByte1 & 0xc0) === 0x80 && (nextByte2 & 0xc0) === 0x80) {
            const codePoint =
              ((byte & 0x0f) << 12) |
              ((nextByte1 & 0x3f) << 6) |
              (nextByte2 & 0x3f);
            return String.fromCodePoint(codePoint);
          }
        } else if ((byte & 0xf8) === 0xf0 && idx + 3 < bytes.length) {
          // Four bytes (11110xxx 10xxxxxx 10xxxxxx 10xxxxxx)
          const nextByte1 = bytes[idx + 1];
          const nextByte2 = bytes[idx + 2];
          const nextByte3 = bytes[idx + 3];
          if (
            (nextByte1 & 0xc0) === 0x80 &&
            (nextByte2 & 0xc0) === 0x80 &&
            (nextByte3 & 0xc0) === 0x80
          ) {
            const codePoint =
              ((byte & 0x07) << 18) |
              ((nextByte1 & 0x3f) << 12) |
              ((nextByte2 & 0x3f) << 6) |
              (nextByte3 & 0x3f);
            return String.fromCodePoint(codePoint);
          }
        }
        // Return byte as is if not part of a valid UTF-8 sequence
        return byte >= 32 && byte <= 126 ? String.fromCharCode(byte) : '.';
      case 'UTF-16':
        // For UTF-16, we need to pair bytes
        if (idx % 2 === 0 && idx + 1 < bytes.length) {
          const codePoint = (byte << 8) | bytes[idx + 1];
          try {
            return String.fromCodePoint(codePoint);
          } catch (_) {
            return '.';
          }
        } else if (idx % 2 === 1) {
          // Skip odd indices as they're handled with the previous byte
          return '';
        }
        return '.';
      case 'HEX':
        return formatHex(byte);
      default:
        return '.';
    }
  };

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
      <div className="flex flex-col border-b border-gray-300">
        <div className="mb-2 flex justify-end">
          <span className="mr-2 text-gray-600">Character Set:</span>
          <Select
            value={charset}
            onChange={(value: CharsetType) => setCharset(value)}
            options={[
              { label: 'ASCII', value: 'ASCII' },
              { label: 'UTF-8', value: 'UTF-8' },
              { label: 'UTF-16', value: 'UTF-16' },
              { label: 'HEX', value: 'HEX' },
            ]}
            size="small"
            style={{ width: 100 }}
          />
        </div>
        <div className="flex items-center font-bold text-gray-600">
          <span className="mr-4 w-[8ch] text-right"></span>
          {headers.map((header, idx) => (
            <span key={idx} className="w-6 text-center">
              {header}
            </span>
          ))}
          <span className="flex-1 pl-4 text-left">Decoded Text</span>
        </div>
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

    type DecodedChar = {
      char: string;
      start: number;
      end: number;
    };
    const decodedChars: DecodedChar[] = [];
    let i = 0;
    while (i < hexBytes.length) {
      const globalIdx = index * 16 + i;
      let char = '.';
      let byteLen = 1;
      if (charset === 'ASCII') {
        char = formatChar(hexBytes[i], i, new Uint8Array(hexBytes));
      } else if (charset === 'HEX') {
        char = formatHex(hexBytes[i]);
      } else if (charset === 'UTF-8' || charset === 'UTF-16') {
        const decoderCharset = charset === 'UTF-8' ? 'utf-8' : 'utf-16be';
        const maxLen = charset === 'UTF-8' ? 4 : 2;
        const remain = hexBytes.length - i;
        const tryLen = Math.min(maxLen, remain);
        let found = false;
        for (let l = tryLen; l >= 1; l--) {
          try {
            const bytes = hexBytes.slice(i, i + l);
            const decoder = new TextDecoder(decoderCharset, { fatal: true });
            const str = decoder.decode(new Uint8Array(bytes));
            if (str && str.length > 0 && str !== '\uFFFD') {
              char = str;
              byteLen = l;
              found = true;
              break;
            }
          } catch (_) {
            // ignore decode error, try shorter length
          }
        }
        if (!found) {
          char = '.';
          byteLen = 1;
        }
      }
      decodedChars.push({
        char,
        start: globalIdx,
        end: globalIdx + byteLen - 1,
      });
      i += byteLen;
    }

    return (
      <div key={key} style={style} className="flex items-center">
        <span className="mr-4 w-[8ch] text-right text-gray-500 select-none">
          {offset}
        </span>
        {hexBytes.map((byte, idx) => {
          const globalIndex = index * 16 + idx;
          const selected = isSelected(globalIndex);
          return (
            <span
              key={idx}
              className={`w-6 cursor-pointer text-center ${selected ? 'bg-blue-200' : ''}`}
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
        <span className="flex flex-1 pl-4 text-gray-700">
          {decodedChars.map((item, idx) => {
            const selected =
              selection &&
              (() => {
                const [start, end] = selection;
                const min = Math.min(start, end);
                const max = Math.max(start, end);
                return item.end >= min && item.start <= max;
              })();
            return (
              <span
                key={idx}
                className={`w-[1em] cursor-pointer text-center ${selected ? 'bg-blue-200' : ''}`}
                onMouseDown={() => startSelection(item.start)}
                onMouseEnter={() => updateSelection(item.start)}
              >
                {item.char}
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
      className="flex-1 flex flex-col rounded-sm border border-gray-300  p-1 font-mono text-xs text-black dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
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
