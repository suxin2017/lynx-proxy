import React, { useMemo } from 'react';

interface IMediaViewerProps {
  arrayBuffer?: ArrayBuffer;
  contentType?: string;
  type: [
    boolean, // image
    boolean, // video
  ];
}

export const MediaViewer: React.FC<IMediaViewerProps> = ({
  arrayBuffer,
  type,
  contentType,
}) => {
  const mediaUrl = useMemo(() => {
    if (!arrayBuffer) {
      return null;
    }
    const blob = new Blob([arrayBuffer], { type: contentType });
    return URL.createObjectURL(blob);
  }, [arrayBuffer, contentType]);

  if (!mediaUrl) {
    return null;
  }

  if (type[1]) {
    return <video controls src={mediaUrl} />;
  }

  return <img src={mediaUrl} />;
};
