import React, { useEffect, useMemo } from 'react';
import Prism from 'prismjs';

import './hight.theme.css';

interface CodeViewerProps {
  arrayBuffer?: ArrayBuffer;
  type: [
    boolean, // contentTypeHtml,
    boolean, // contentTypeXml,
    boolean, // contentTypeCss,
    boolean, // contentTypeJavascript,
  ];
}


// Returns a highlighted HTML string
const CodeViewer: React.FC<CodeViewerProps> = ({ arrayBuffer, type }) => {
  const data = useMemo(() => {
    if (!arrayBuffer) return null;

    return new TextDecoder('utf-8').decode(new Uint8Array(arrayBuffer));
  }, [arrayBuffer]);
  const languageType = useMemo(() => {
    if (type[0]) return 'html';
    if (type[1]) return 'xml';
    if (type[2]) return 'css';
    if (type[3]) return 'javascript';
    return 'unknown';
  }, [type]);

  useEffect(() => {
    Prism.highlightAll();
  }, [data]);
  if (!data) return null;

  return (
    <div className="flex h-full flex-col rounded-sm border-gray-300 p-1 font-mono text-xs">
      <pre>
        <code className={`language-${languageType}`}>{data}</code>
      </pre>
    </div>
  );
};

export default CodeViewer;
