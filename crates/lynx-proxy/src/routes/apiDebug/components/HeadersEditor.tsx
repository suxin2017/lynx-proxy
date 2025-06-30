import { Button, Input, Switch, Typography, Dropdown } from 'antd';
import { PlusOutlined, DeleteOutlined, DownOutlined } from '@ant-design/icons';
import { HeaderItem } from './types';

const { Title, Text } = Typography;

const COMMON_HEADERS = [
  { key: 'Content-Type', value: 'application/json' },
  { key: 'Authorization', value: 'Bearer ' },
  { key: 'Accept', value: 'application/json' },
  { key: 'User-Agent', value: 'Lynx-Proxy-Debugger' },
  { key: 'Cache-Control', value: 'no-cache' },
  { key: 'Accept-Encoding', value: 'gzip, deflate' },
];

interface HeadersEditorProps {
  headers: HeaderItem[];
  onChange: (headers: HeaderItem[]) => void;
}

export function HeadersEditor({ headers, onChange }: HeadersEditorProps) {
  const handleAddHeader = () => {
    const newHeaders = [...headers, { key: '', value: '', enabled: true }];
    onChange(newHeaders);
  };

  const handleAddCommonHeader = (header: { key: string; value: string }) => {
    const newHeaders = [...headers, { ...header, enabled: true }];
    onChange(newHeaders);
  };

  const handleRemoveHeader = (index: number) => {
    const newHeaders = headers.filter((_, i) => i !== index);
    onChange(newHeaders);
  };

  const handleHeaderChange = (
    index: number,
    field: keyof HeaderItem,
    value: string | boolean,
  ) => {
    const newHeaders = headers.map((header, i) =>
      i === index ? { ...header, [field]: value } : header,
    );
    onChange(newHeaders);
  };

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <Title level={5} className="m-0">
          Headers
        </Title>
        <div className="flex gap-2">
          <Dropdown
            menu={{
              items: COMMON_HEADERS.map((header, index) => ({
                key: index.toString(),
                label: `${header.key}: ${header.value}`,
                onClick: () => handleAddCommonHeader(header),
              })),
            }}
            trigger={['click']}
          >
            <Button icon={<DownOutlined />}>Quick Add</Button>
          </Dropdown>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAddHeader}
          >
            Add Header
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {headers.map((header, index) => (
          <div key={index} className="flex items-center gap-2">
            <Switch
              checked={header.enabled}
              onChange={(checked) =>
                handleHeaderChange(index, 'enabled', checked)
              }
            />
            <Input
              placeholder="Key"
              value={header.key}
              onChange={(e) => handleHeaderChange(index, 'key', e.target.value)}
              className="flex-1"
              disabled={!header.enabled}
            />
            <Input
              placeholder="Value"
              value={header.value}
              onChange={(e) =>
                handleHeaderChange(index, 'value', e.target.value)
              }
              className="flex-1"
              disabled={!header.enabled}
            />
            <Button
              type="text"
              icon={<DeleteOutlined />}
              onClick={() => handleRemoveHeader(index)}
              danger
            />
          </div>
        ))}

        {headers.length === 0 && (
          <div className="rounded border border-dashed border-gray-300 p-6 text-center dark:border-gray-500">
            <Text type="secondary">
              No headers added. Click &quot;Add Header&quot; to add one.
            </Text>
          </div>
        )}
      </div>
    </div>
  );
}
