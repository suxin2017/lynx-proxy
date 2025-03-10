import React, { useEffect, useMemo } from 'react';
import { Spin, Tabs } from 'antd';
import HexViewer from '@/routes/network/components/Contents/HexViewer';
import { JsonPreview } from '@/routes/network/components/Contents/JsonPreview';
import { Headers } from '@/routes/network/components/Contents/Headers';
import { filter } from 'lodash';
import { ifTrue } from '@/utils/ifTrue';
import { MediaViewer } from '../MediaViewer';
import TextView from '../TextViewer';
import CodeViewer from '../CodeViewer';
import FormViewer from '../FormView';

interface IContentsProps {
  title: string;
  contentType?: string;
  body?: ArrayBuffer;
  headers?: Record<string, string>;
  isLoading?: boolean;
}
export enum ContentPreviewType {
  Headers = 'Headers',
  Code = 'Code',
  Json = 'Json',
  Text = 'Text',
  Hex = 'Hex',
  Form = 'Form',
  Media = 'Media',
}

export const ContentPreviewTabs: React.FC<IContentsProps> = ({
  title,
  body,
  contentType,
  headers,
  isLoading,
}) => {
  const [activeKey, setActiveKey] = React.useState<string>('0');
  useEffect(() => {}, [body]);
  const contentTypeCheck = useMemo(() => {
    const contentTypeJson = !!contentType?.includes('application/json');
    const contentTypeImage = !!contentType?.includes('image');
    const contentTypeVideo = !!contentType?.includes('video');
    const contentTypeHtml = !!contentType?.includes('html');
    const contentTypeXml = !!contentType?.includes('xml');
    const contentTypeCss = !!contentType?.includes('css');
    const contentTypeJavascript = !!contentType?.includes('javascript');
    const contentTypeMultiForm = !!contentType?.includes('multipart/form-data');
    const contentTypeForm = !!contentType?.includes(
      'application/x-www-form-urlencoded',
    );
    return {
      contentTypeJson,
      contentTypeImage,
      contentTypeVideo,
      contentTypeHtml,
      contentTypeXml,
      contentTypeCss,
      contentTypeJavascript,
      contentTypeMultiForm,
      contentType,
      contentTypeForm,
    };
  }, [contentType]);
  const defaultActiveKey = useMemo(() => {
    if (contentTypeCheck.contentTypeJson) {
      return ContentPreviewType.Json;
    } else if (
      contentTypeCheck.contentTypeImage ||
      contentTypeCheck.contentTypeVideo
    ) {
      return ContentPreviewType.Media;
    } else if (
      contentTypeCheck.contentTypeHtml ||
      contentTypeCheck.contentTypeXml ||
      contentTypeCheck.contentTypeCss ||
      contentTypeCheck.contentTypeJavascript
    ) {
      return ContentPreviewType.Code;
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
      contentTypeHtml,
      contentTypeXml,
      contentTypeCss,
      contentTypeJavascript,
      contentTypeMultiForm,
      contentTypeForm,
    } = contentTypeCheck;
    const contentTypeCode =
      contentTypeHtml ||
      contentTypeXml ||
      contentTypeCss ||
      contentTypeJavascript;
    return filter(
      [
        {
          key: ContentPreviewType.Headers,
          label: 'Headers',
          children: <Headers data={headers} />,
        },
        ifTrue(contentTypeJson, {
          key: ContentPreviewType.Json,
          label: 'Json',
          children: <JsonPreview arrayBuffer={body} />,
        }),
        ifTrue(contentTypeImage || contentTypeVideo, {
          key: ContentPreviewType.Media,
          label: 'Media Preview',
          children: (
            <MediaViewer
              arrayBuffer={body}
              contentType={contentType}
              type={[contentTypeImage, contentTypeVideo]}
            />
          ),
        }),
        ifTrue(contentTypeCode, {
          key: ContentPreviewType.Code,
          label: 'Code',
          children: (
            <CodeViewer
              arrayBuffer={body}
              type={[
                contentTypeHtml,
                contentTypeXml,
                contentTypeCss,
                contentTypeJavascript,
              ]}
            />
          ),
        }),
        ifTrue(
          !contentTypeJson &&
            !contentTypeImage &&
            !contentTypeVideo &&
            !contentTypeCode,
          {
            key: ContentPreviewType.Text,
            label: 'Text',
            children: <TextView arrayBuffer={body} />,
          },
        ),
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
          children: <HexViewer arrayBuffer={body} />,
        },
      ],
      (item) => item != null,
    );
  }, [body, contentTypeCheck, headers]);

  return (
    <Tabs
      activeKey={activeKey}
      onChange={(key) => setActiveKey(key)}
      tabBarExtraContent={{
        left: <span className="p-2">{title}</span>,
        right: (
          <span className="p-2">
            <Spin size="small" spinning={isLoading} />
          </span>
        ),
      }}
      className="h-full [&_.ant-tabs-content]:h-full [&_.ant-tabs-content]:overflow-auto [&_.ant-tabs-tabpane]:h-full"
      defaultActiveKey="0"
      size="small"
      type="card"
      items={items}
    />
  );
};
