import React from 'react';
import ReactJson from 'react18-json-view';
import 'react18-json-view/src/style.css';

interface IJsonPreviewProps { }

export const JsonPreview: React.FC<IJsonPreviewProps> = (_props) => {
  return (
    <div>
      <ReactJson className="text-sm" src={{ a: 123 }} />
    </div>
  );
};
