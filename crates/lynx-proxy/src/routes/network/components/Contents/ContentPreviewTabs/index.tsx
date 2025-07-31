import { Headers } from '@/routes/network/components/Contents/Headers';
import HexViewer from '@/routes/network/components/Contents/HexViewer';
import { JsonPreview } from '@/routes/network/components/Contents/JsonPreview';
import { WebSocketLog } from '@/services/generated/utoipaAxum.schemas';
import { base64ToArrayBuffer } from '@/store/useSortPoll';
import { ifTrue } from '@/utils/ifTrue';
import { Segmented } from 'antd';
import { filter } from 'lodash';
import React, { useEffect, useMemo } from 'react';
import Websocket from '../../Websocket';
import FormViewer from '../FormView';
import { MediaViewer } from '../MediaViewer';
import TextView from '../TextViewer';

interface IContentsProps {
  title: string;
  contentType?: string;
  body?: ArrayBuffer;
  websocketBody?: WebSocketLog[];
  headers?: Record<string, string>;
  isLoading?: boolean;
  rawBody?: string;
}
export enum ContentPreviewType {
  Headers = 'Headers',
  Code = 'Code',
  Json = 'Json',
  Text = 'Text',
  Hex = 'Hex',
  Form = 'Form',
  Media = 'Media',
  Websocket = 'Websocket',
  Base64 = 'Base64',
}

function useAsyncMemo<T>(
  asyncFn: () => Promise<T>,
  deps: React.DependencyList,
) {
  const [value, setValue] = React.useState<T>();

  useEffect(() => {
    let isMounted = true;
    asyncFn().then((result) => {
      if (isMounted) {
        setValue(result);
      }
    });
    return () => {
      isMounted = false;
    };
  }, deps);

  return value;
}

export const ContentPreviewTabs: React.FC<IContentsProps> = ({
  // title,
  websocketBody,
  body,
  contentType,
  headers,
  // _isLoading,
  rawBody,
}) => {
  const [activeKey, setActiveKey] = React.useState<string>(ContentPreviewType.Headers);
  const contentIsEmpty = useMemo(() => body?.byteLength != null, [body]);
  const websocketBodyArrayBuffer = useAsyncMemo(async () => {
    if (!websocketBody) {
      return;
    }
    const blob = new Blob(
      websocketBody?.map(({ message: item }) => {
        if ('text' in item && item.text) {
          return base64ToArrayBuffer(item.text);
        }
        if ('binary' in item && item.binary) {
          return base64ToArrayBuffer(item.binary);
        }
        return new Uint8Array();
      }),
    );
    return blob.arrayBuffer();
  }, [websocketBody]);
  const contentTypeCheck = useMemo(() => {
    const contentTypeJson = !!contentType?.includes('application/json');
    const contentTypeImage = !!contentType?.includes('image');
    const contentTypeVideo = !!contentType?.includes('video');
    const contentTypeFont = !!contentType?.includes('font');
    const contentTypeHtml = !!contentType?.includes('html');
    const contentTypeXml = !!contentType?.includes('xml');
    const contentTypeCss = !!contentType?.includes('css');
    const contentTypeJavascript = !!contentType?.includes('javascript');
    const contentTypeMultiForm = !!contentType?.includes('multipart/form-data');
    const contentTypeForm = !!contentType?.includes(
      'application/x-www-form-urlencoded',
    );
    const contentTypeWebsocket = !!contentType?.includes('websocket');
    return {
      contentTypeJson,
      contentTypeFont,
      contentTypeImage,
      contentTypeVideo,
      contentTypeHtml,
      contentTypeXml,
      contentTypeCss,
      contentTypeJavascript,
      contentTypeMultiForm,
      contentType,
      contentTypeForm,
      contentTypeWebsocket,
    };
  }, [contentType]);
  const defaultActiveKey = useMemo(() => {
    if (contentTypeCheck.contentTypeJson) {
      return ContentPreviewType.Json;
    } else if (
      contentTypeCheck.contentTypeImage ||
      contentTypeCheck.contentTypeVideo ||
      contentTypeCheck.contentTypeFont
    ) {
      return ContentPreviewType.Media;
    } else if (contentTypeCheck.contentTypeWebsocket) {
      return ContentPreviewType.Websocket;
    } else if (
      contentTypeCheck.contentTypeMultiForm ||
      contentTypeCheck.contentTypeForm
    ) {
      return ContentPreviewType.Form;
    }
    return ContentPreviewType.Text;
  }, [contentTypeCheck]);
  useEffect(() => {
    setActiveKey(defaultActiveKey);
  }, [defaultActiveKey]);
  const items = useMemo(() => {
    const {
      contentTypeJson,
      contentTypeVideo,
      contentTypeImage,
      contentTypeMultiForm,
      contentTypeForm,
      contentTypeFont,
      contentTypeWebsocket,
    } = contentTypeCheck;

    const contentTypeMedia =
      contentTypeImage || contentTypeVideo || contentTypeFont;
    let mediaLabel = '媒体预览';
    if (contentTypeMedia) {
      if (contentTypeImage) {
        mediaLabel = '图片预览';
      }
      if (contentTypeVideo) {
        mediaLabel = '视频预览';
      }
      if (contentTypeFont) {
        mediaLabel = '字体预览';
      }
    }
    return filter(
      [
        {
          key: ContentPreviewType.Headers,
          label: 'Headers',
          children: <Headers data={headers} />,
        },
        ifTrue(contentTypeJson && contentIsEmpty, {
          key: ContentPreviewType.Json,
          label: 'Json',
          children: <JsonPreview arrayBuffer={body} />,
        }),
        ifTrue(contentTypeMedia && contentIsEmpty, {
          key: ContentPreviewType.Media,
          label: mediaLabel,
          children: (
            <MediaViewer
              arrayBuffer={body}
              contentType={contentType}
              type={[contentTypeImage, contentTypeVideo, contentTypeFont]}
            />
          ),
        }),
        ifTrue(contentTypeWebsocket, {
          key: ContentPreviewType.Websocket,
          label: 'Websocket',
          children: <Websocket websocketLog={websocketBody} />,
        }),
        ifTrue(!contentTypeMedia, {
          key: ContentPreviewType.Text,
          label: 'Text',
          children: <TextView arrayBuffer={websocketBodyArrayBuffer ?? body} />,
        }),
        ifTrue(contentTypeMultiForm || contentTypeForm, {
          key: ContentPreviewType.Form,
          label: 'Form Data',
          children: (
            <FormViewer
              arrayBuffer={body}
              type={[contentTypeMultiForm, contentTypeForm]}
            />
          ),
        }),

        {
          key: ContentPreviewType.Hex,
          label: 'Hex',
          children: (
            <HexViewer arrayBuffer={websocketBodyArrayBuffer ?? body} />
          ),
        },
        {
          key: ContentPreviewType.Base64,
          label: 'Base64',
          children: <TextView text={rawBody} />,
        },
      ],
      (item) => item != null,
    );
  }, [
    contentTypeCheck,
    headers,
    contentIsEmpty,
    body,
    contentType,
    websocketBody,
    websocketBodyArrayBuffer,
    rawBody,
  ]);

  return (
    <div className="flex-1 flex flex-col" >
      <Segmented value={activeKey} options={items.map(item => ({ label: item.label, value: item.key }))} onChange={(key) => setActiveKey(key)} />
      <div className="flex-1 flex" >
        {items.find(item => item.key === activeKey)?.children}
      </div>
    </div>
  );
};
