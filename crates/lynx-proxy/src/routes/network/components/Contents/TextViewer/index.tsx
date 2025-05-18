import React, { useMemo } from 'react';

interface TextViewProps {
  arrayBuffer?: ArrayBuffer;
}

const TextView: React.FC<TextViewProps> = ({ arrayBuffer }) => {
  const data = useMemo(() => {
    if (!arrayBuffer) return null;

    return new TextDecoder('utf-8').decode(new Uint8Array(arrayBuffer));
  }, [arrayBuffer]);

  if (!data) return null;

  return (
    <div className="flex h-full flex-col rounded-sm border border-gray-300 bg-white p-1 font-mono text-xs text-black dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200">
      <pre>{data}</pre>
    </div>
  );
};

export default TextView;
