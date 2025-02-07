import React from 'react';
import Markdown from 'react-markdown';

import markdownDoc from './en.md';

export const CertificateInstallDoc: React.FC = () => {
  return <Markdown>{markdownDoc}</Markdown>;
};
