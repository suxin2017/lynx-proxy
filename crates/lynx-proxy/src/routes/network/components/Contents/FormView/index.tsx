import { Descriptions } from 'antd';
import { get, keys } from 'lodash';
import { useMemo } from 'react';

const FormViewer: React.FC<{
  arrayBuffer?: ArrayBuffer;
  type: [boolean, boolean];
}> = ({ arrayBuffer, type }) => {
  const data = useMemo(() => {
    if (!arrayBuffer) return null;
    return new TextDecoder('utf-8').decode(new Uint8Array(arrayBuffer));
  }, [arrayBuffer]);

  const formType = useMemo(() => {
    if (type[0]) return 'form-data';
    if (type[1]) return 'urlencoded';
    return 'unknown';
  }, [type]);

  const jsonData = useMemo(() => {
    if (!data) return null;

    if (formType === 'urlencoded') {
      // Parse URL encoded form data
      try {
        const params = new URLSearchParams(data);
        const result: Record<string, string> = {};
        for (const [key, value] of params.entries()) {
          result[key] = value;
        }
        return result;
      } catch (e) {
        console.error('Failed to parse URL encoded form data', e);
        return data;
      }
    } else if (formType === 'form-data') {
      // Parse multipart/form-data
      try {
        const boundary = data.split('\r\n')[0].trim();
        const parts = data.split(boundary).filter((part) => part.length > 4);
        const result: Record<
          string,
          string | { filename: string; content: string }
        > = {};

        parts.forEach((part) => {
          if (!part || part === '--' || part === '--\r\n') return;

          // Extract headers and body
          const [headers, ...bodyParts] = part.substring(2).split('\r\n\r\n');
          const body = bodyParts.join('\r\n\r\n').replace(/\r\n$/, '');

          // Extract field name from Content-Disposition header
          const contentDisposition = headers
            .split('\r\n')
            .find((h) => h.startsWith('Content-Disposition'));

          if (contentDisposition) {
            const nameMatch = contentDisposition.match(/name="([^"]+)"/);
            if (nameMatch) {
              const name = nameMatch[1];
              const filenameMatch =
                contentDisposition.match(/filename="([^"]+)"/);

              if (filenameMatch) {
                result[name] = {
                  filename: filenameMatch[1],
                  content:
                    body.length > 100
                      ? `${body.substring(0, 100)}... [truncated]`
                      : body,
                };
              } else {
                result[name] = body;
              }
            }
          }
        });
        return result;
      } catch (e) {
        console.error('Failed to parse multipart/form-data', e);
        return data;
      }
    }

    return data;
  }, [data, formType]);

  if (!data) return null;

  return (
    <div className="flex h-full flex-col rounded-sm border-gray-300 p-1 font-mono text-xs">
      <Descriptions
        bordered
        size="small"
        className="[&_p]:m-0"
        styles={{ label: { width: 200 } }}
        column={1}
        items={keys(jsonData).map((key) => {
          const value = get(jsonData, key);
          if (typeof value === 'string') {
            return {
              key,
              label: key,
              children: value,
            };
          }

          return {
            key,
            label: key,
            children: value.filename
              ? `${value.filename} (${value.content.length} bytes)`
              : value.content,
          };
        })}
      />
    </div>
  );
};

export default FormViewer;
