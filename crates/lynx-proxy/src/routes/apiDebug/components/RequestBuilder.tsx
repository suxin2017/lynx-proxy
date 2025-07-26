import { Button, Select, Input, Space } from 'antd';
import {
  SendOutlined,
  LoadingOutlined,
} from '@ant-design/icons';
import { HttpMethod } from '../../../services/generated/utoipaAxum.schemas';

interface RequestBuilderProps {
  method: string;
  url: string;
  onMethodChange: (method: string) => void;
  onUrlChange: (url: string) => void;
  onSend: () => void;
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
  isLoading = false,
}: RequestBuilderProps) {
  return (
    <Space.Compact className="flex-1 flex">
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


      <Button
        type="primary"
        onClick={onSend}
        disabled={!url || isLoading}
        icon={isLoading ? <LoadingOutlined /> : <SendOutlined />}
      >
        {isLoading ? '发送中' : '发送'}
      </Button>
    </Space.Compact>
  );
}
