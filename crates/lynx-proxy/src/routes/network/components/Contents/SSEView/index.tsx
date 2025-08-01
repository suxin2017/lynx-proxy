import React, { useState, useEffect } from 'react';
import { AutoSizer, List as VirtualizedList } from 'react-virtualized';
import { SSEEvent, SSEParser } from './SSEParser';
import { CopyFilled } from '@ant-design/icons';
import { App } from 'antd';

interface SSEViewProps {
    arrayBuffer?: ArrayBuffer;
}



export const SSEView: React.FC<SSEViewProps> = ({ arrayBuffer }) => {
    const { message } = App.useApp();

    const [messages, setMessages] = useState<SSEEvent[]>([]);

    const parseArrayBuffer = (arrayBuffer: ArrayBuffer) => {
        if (!arrayBuffer || !(arrayBuffer instanceof ArrayBuffer)) {
            return null;
        }
        try {
            const decoder = new TextDecoder('utf-8');
            const text = decoder.decode(arrayBuffer);
            return text;
        } catch (error) {
            console.error('解析 ArrayBuffer 失败:', error);
            return null;
        }
    };

    useEffect(() => {
        if (arrayBuffer) {
            const messageText = parseArrayBuffer(arrayBuffer);
            if (messageText) {
                const events = SSEParser.parse(messageText);

                setMessages(events.slice(-100)); // 最多保留100条
            }
        }
    }, [arrayBuffer]);

    const rowRenderer = ({
        index,
        key,
        style,
    }: {
        index: number;
        key: string;
        style: React.CSSProperties;
    }) => {
        const messageData = messages[index];
        return (
            <div key={key} className='grid items-center p-1 border-b border-gray-200 grid-cols-[80px_80px_1fr] gap-4' style={style}>
                <div className='text-xs text-gray-500'>{messageData.id}</div>
                <div className='text-xs text-gray-500'>{messageData.event}</div>
                <div className='text-xs flex min-w-0 text-gray-500' title={messageData.data}>
                    <span className='flex-1 min-w-0 truncate'>
                        {messageData.data}
                    </span>
                    <CopyFilled
                        className='ml-2 cursor-pointer text-gray-400 hover:text-gray-600'
                        onClick={() => {
                            navigator.clipboard.writeText(messageData.data);
                            message.success('已复制到剪贴板');
                        }}
                    />
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-1 flex-col p-2 min-w-0">
            <div className='grid items-center p-1 border-b border-gray-200 grid-cols-[80px_80px_1fr] gap-4'>
                <div className='text-xs text-gray-500 '>ID</div>
                <div className='text-xs text-gray-500  '>事件类型</div>
                <div className='text-xs text-gray-500 '>内容</div>
            </div>
            <div className='flex flex-1 min-w-0'>
                <AutoSizer>
                    {({ height, width }) => (
                        <VirtualizedList
                            width={width}
                            height={height}
                            rowCount={messages.length}
                            rowHeight={24}
                            rowRenderer={rowRenderer}
                        />
                    )}
                </AutoSizer>
            </div>
        </div >
    );
};
