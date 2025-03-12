import React, { useMemo } from 'react';

interface IMediaViewerProps {
  arrayBuffer?: ArrayBuffer;
  contentType?: string;
  type: [
    boolean, // image
    boolean, // video
    boolean, // font
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

  if (type[2]) {
    const fontCode = `
  @font-face {
      font-family: 'font';
      src: url(${mediaUrl});
      font-display: block;
  }
  .custom-font * {
    font-family: 'font';
  }
`;

    return (
      <>
        <style>{fontCode}</style>
        <div className="custom-font text-center text-xl">
          <div>A B C D E F G H I J K L M N O P Q R S T U V W X Y Z</div>
          <div>
            庐山烟雨浙江潮，未至千般恨不消。 到得还来别无事，庐山烟雨浙江潮。
          </div>
        </div>
      </>
    );
  }

  if (type[1]) {
    return <video controls src={mediaUrl} />;
  }

  return <img src={mediaUrl} />;
};
