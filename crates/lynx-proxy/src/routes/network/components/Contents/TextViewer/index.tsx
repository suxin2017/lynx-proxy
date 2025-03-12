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
    <div className="flex h-full flex-col rounded-sm border-gray-300 p-1 font-mono text-xs">
      <pre>{data}</pre>
    </div>
  );
};

export default TextView;
