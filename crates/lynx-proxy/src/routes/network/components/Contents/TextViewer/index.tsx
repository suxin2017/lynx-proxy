import { Empty } from 'antd';
import React, { useMemo } from 'react';

interface TextViewProps {
  arrayBuffer?: ArrayBuffer;
  text?: string;
}

const TextView: React.FC<TextViewProps> = ({ arrayBuffer, text }) => {
  const data = useMemo(() => {
    if (text) return text;
    if (!arrayBuffer) return null;

    return new TextDecoder().decode(new Uint8Array(arrayBuffer));
  }, [arrayBuffer, text]);

  if (!data)
    return (
      <div className="flex h-full items-center justify-center text-gray-500">
        <Empty />
      </div>
    );

  return (
    <div className="flex h-full flex-col rounded-sm border border-gray-300  p-1 font-mono text-xs text-black dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200">
      <pre className="break-all whitespace-normal">{data}</pre>
    </div>
  );
};

export default TextView;
