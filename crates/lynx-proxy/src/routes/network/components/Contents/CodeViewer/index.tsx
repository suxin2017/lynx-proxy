import React, { useEffect, useMemo, useRef, useState } from 'react';

import './hight.theme.css';
import { Button } from 'antd';

interface CodeViewerProps {
  arrayBuffer?: ArrayBuffer;
  type: [
    boolean, // contentTypeHtml,
    boolean, // contentTypeXml,
    boolean, // contentTypeCss,
    boolean, // contentTypeJavascript,
  ];
}

const MAX_LINES = 1000;

const CodeViewer: React.FC<CodeViewerProps> = ({ arrayBuffer, type }) => {
  const codeRef = useRef<HTMLElement>(null);
  const [visibleLines, setVisibleLines] = useState(MAX_LINES);
  const [highlightedHtml, setHighlightedHtml] = useState<string>('');
  const workerRef = useRef<Worker | null>(null);

  const data = useMemo(() => {
    if (!arrayBuffer) return null;
    return new TextDecoder('utf-8').decode(new Uint8Array(arrayBuffer));
  }, [arrayBuffer]);

  const languageType = useMemo(() => {
    if (type[0]) return 'html';
    if (type[1]) return 'xml';
    if (type[2]) return 'css';
    if (type[3]) return 'javascript';
    return 'plain';
  }, [type]);

  const displayData = useMemo(() => {
    if (!data) return '';
    const lines = data.split('\n');
    if (lines.length <= visibleLines) return data;
    return (
      lines.slice(0, visibleLines).join('\n') +
      `\n... (${lines.length - visibleLines} more lines, click to load more) ...`
    );
  }, [data, visibleLines]);

  // Prism highlight in worker
  useEffect(() => {
    if (!displayData) {
      setHighlightedHtml('');
      return;
    }
    if (!workerRef.current) {
      workerRef.current = new Worker(
        new URL('./prism.worker.ts', import.meta.url),
        { type: 'module', name: 'CodeViewerWorker' },
      );
    }
    const worker = workerRef.current;
    worker.onmessage = (e) => {
      console.log('worker message', e.data);
      setHighlightedHtml(e.data.html);
    };
    worker.postMessage({ code: displayData, language: languageType });
    return () => {
    };
  }, [displayData, languageType]);

  useEffect(() => {
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, []);

  if (!data) return null;

  return (
    <div className="flex h-full flex-col rounded-sm border-gray-300 p-1 font-mono text-xs">
      <pre>
        <code
          ref={codeRef}
          className={`language-${languageType}`}
          dangerouslySetInnerHTML={{ __html: highlightedHtml || displayData }}
        />
      </pre>
      {data.split('\n').length > visibleLines && (
        <Button
          className="mt-2 text-blue-500 underline"
          onClick={() => setVisibleLines((v) => v + MAX_LINES)}
        >
          Load more lines
        </Button>
      )}
    </div>
  );
};

export default CodeViewer;
