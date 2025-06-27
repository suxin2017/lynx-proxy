import { Button, Select, Input, Space } from 'antd';
import {
  PlayCircleOutlined,
  LoadingOutlined,
  ImportOutlined,
} from '@ant-design/icons';
import { HttpMethod } from '../../../services/generated/utoipaAxum.schemas';

interface RequestBuilderProps {
  method: string;
  url: string;
  onMethodChange: (method: string) => void;
  onUrlChange: (url: string) => void;
  onSend: () => void;
  onImportCurl?: () => void;
  isLoading?: boolean;
}

const HTTP_METHODS = [
  { value: HttpMethod.GET, label: 'GET' },
  { value: HttpMethod.POST, label: 'POST' },
  { value: HttpMethod.PUT, label: 'PUT' },
  { value: HttpMethod.DELETE, label: 'DELETE' },
  { value: HttpMethod.PATCH, label: 'PATCH' },
  { value: HttpMethod.HEAD, label: 'HEAD' },
  { value: HttpMethod.OPTIONS, label: 'OPTIONS' },
];

export function RequestBuilder({
  method,
  url,
  onMethodChange,
  onUrlChange,
  onSend,
  onImportCurl,
  isLoading = false,
}: RequestBuilderProps) {
  return (
    <div>
      <Space.Compact className="w-full">
        <Select
          value={method}
          onChange={onMethodChange}
          className="w-30"
          placeholder="Method"
        >
          {HTTP_METHODS.map((httpMethod) => (
            <Select.Option key={httpMethod.value} value={httpMethod.value}>
              {httpMethod.label}
            </Select.Option>
          ))}
        </Select>

        <Input
          value={url}
          onChange={(e) => onUrlChange(e.target.value)}
          placeholder="Enter request URL..."
          className="flex-1"
        />

        {onImportCurl && (
          <Button
            icon={<ImportOutlined />}
            onClick={onImportCurl}
            title="Import from cURL"
          >
            Import
          </Button>
        )}

        <Button
          type="primary"
          onClick={onSend}
          disabled={!url || isLoading}
          icon={isLoading ? <LoadingOutlined /> : <PlayCircleOutlined />}
          className="min-w-25"
        >
          {isLoading ? 'Sending' : 'Send'}
        </Button>
      </Space.Compact>
    </div>
  );
}
