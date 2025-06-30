import { Button, Input, Switch, Typography } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { QueryParamItem } from './types';

const { Title } = Typography;

interface QueryParamsEditorProps {
  queryParams: QueryParamItem[];
  onChange: (queryParams: QueryParamItem[]) => void;
}

export function QueryParamsEditor({
  queryParams,
  onChange,
}: QueryParamsEditorProps) {
  const addQueryParam = () => {
    const newQueryParam: QueryParamItem = {
      key: '',
      value: '',
      enabled: true,
    };
    onChange([...queryParams, newQueryParam]);
  };

  const updateQueryParam = (
    index: number,
    field: keyof QueryParamItem,
    value: string | boolean,
  ) => {
    const updated = queryParams.map((param, i) =>
      i === index ? { ...param, [field]: value } : param,
    );
    onChange(updated);
  };

  const removeQueryParam = (index: number) => {
    onChange(queryParams.filter((_, i) => i !== index));
  };

  return (
    <div className="flex h-full flex-col p-4">
      <div className="mb-4 flex items-center justify-between">
        <Title level={5} className="m-0">
          Query Parameters
        </Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={addQueryParam}>
          Add Parameter
        </Button>
      </div>

      <div className="flex-1 space-y-2">
        {queryParams.length === 0 ? (
          <div className="flex h-32 items-center justify-center text-gray-500">
            No query parameters. Click &quot;Add Parameter&quot; to get started.
          </div>
        ) : (
          queryParams.map((param, index) => (
            <div
              key={index}
              className="flex items-center gap-2 rounded border border-gray-200 p-2 dark:border-gray-600"
            >
              <Switch
                checked={param.enabled}
                onChange={(checked) =>
                  updateQueryParam(index, 'enabled', checked)
                }
              />

              <Input
                placeholder="Parameter key"
                value={param.key}
                onChange={(e) => updateQueryParam(index, 'key', e.target.value)}
                className="flex-1"
              />

              <Input
                placeholder="Parameter value"
                value={param.value}
                onChange={(e) =>
                  updateQueryParam(index, 'value', e.target.value)
                }
                className="flex-1"
              />

              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                onClick={() => removeQueryParam(index)}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
