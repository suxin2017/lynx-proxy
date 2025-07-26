import React from 'react';
import { Form, Input, Select, Button, Typography } from 'antd';
import { FolderOpenOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface LocalFileConfigProps {
  field: {
    key: number;
    name: number;
  };
}

export const LocalFileConfig: React.FC<LocalFileConfigProps> = ({ field }) => {
  const commonContentTypes = [
    { value: 'text/html', label: 'HTML (text/html)' },
    { value: 'application/json', label: 'JSON (application/json)' },
    { value: 'text/plain', label: '纯文本 (text/plain)' },
    {
      value: 'application/javascript',
      label: 'JavaScript (application/javascript)',
    },
    { value: 'text/css', label: 'CSS (text/css)' },
    { value: 'application/xml', label: 'XML (application/xml)' },
    { value: 'image/png', label: 'PNG 图片 (image/png)' },
    { value: 'image/jpeg', label: 'JPEG 图片 (image/jpeg)' },
    { value: 'image/gif', label: 'GIF 图片 (image/gif)' },
    { value: 'image/svg+xml', label: 'SVG 图片 (image/svg+xml)' },
    { value: 'application/pdf', label: 'PDF (application/pdf)' },
    {
      value: 'application/octet-stream',
      label: '二进制文件 (application/octet-stream)',
    },
  ];
  return (
    <div className="space-y-4">
      <div className="space-y-4">
        <Form.Item
          name={[field.name, 'handlerType', 'filePath']}
          label="文件/文件夹路径"
          rules={[{ required: true, message: '请输入文件路径' }]}
          extra="支持绝对路径和相对路径，相对路径基于服务器工作目录"
        >
          <Input
            placeholder="/path/to/your/file.html 或 ./static/index.html 或 /var/www/html"
            addonAfter={
              <Button type="text" icon={<FolderOpenOutlined />} size="small" />
            }
          />
        </Form.Item>

        <div className="grid grid-cols-2 gap-4">
          <Form.Item
            name={[field.name, 'handlerType', 'contentType']}
            label="内容类型"
            extra="自动根据文件扩展名推断，也可手动指定"
          >
            <Select
              placeholder="选择或输入 Content-Type"
              options={commonContentTypes}
              showSearch
              allowClear
            />
          </Form.Item>
        </div>
      </div>

      <div className="text-sm text-gray-500">
        <Text type="secondary">
          本地文件处理器将从指定路径读取文件内容并作为响应返回。
          确保文件路径正确且服务器有读取权限。
        </Text>
      </div>
    </div>
  );
};
