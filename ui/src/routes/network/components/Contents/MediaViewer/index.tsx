import React, { useMemo } from 'react';

interface IMediaViewerProps {
  arrayBuffer?: ArrayBuffer;
}

export const MediaViewer: React.FC<IMediaViewerProps> = ({ arrayBuffer }) => {
  const image = useMemo(() => {
    if (!arrayBuffer) {
      return null;
    }
    const blob = new Blob([arrayBuffer], { type: 'image/jpeg' });
    return URL.createObjectURL(blob);
  }, [arrayBuffer]);
  if (!image) {
    return null;
  }
  return <img src={image} />;
};
