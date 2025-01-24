import React from 'react';
import { JsonPreview } from './JsonPreview';

interface IContentsProps {}

export const Contents: React.FC<IContentsProps> = (_props) => {
  return (
      <JsonPreview />
  );
};
