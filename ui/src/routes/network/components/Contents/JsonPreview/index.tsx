import React from 'react';
import ReactJson from 'react-json-view';

interface IJsonPreviewProps {}

export const JsonPreview: React.FC<IJsonPreviewProps> = (props) => {
  return (
    <div>
      <ReactJson src={{ a: 123 }} theme="bright:inverted" />
    </div>
  );
};
