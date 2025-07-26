import React from 'react';
import { Card, Select, Input, Button, Form } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import { useFilterTemplate } from './context';
import { FilterCondition, FilterConditionType, FilterOperator } from './types';
import { validateConditionValue } from './utils';

const { Option } = Select;

interface FilterConditionEditorProps {
  condition: FilterCondition;
  disabled?: boolean;
}

// 条件类型选项
const CONDITION_TYPE_OPTIONS: { value: FilterConditionType; label: string }[] = [
  { value: 'url', label: 'URL' },
  { value: 'method', label: '请求方法' },
  { value: 'status', label: '状态码' },
  { value: 'requestHeaders', label: '请求头' },
  { value: 'responseHeaders', label: '响应头' },
  { value: 'requestBody', label: '请求体' },
  { value: 'responseBody', label: '响应体' },
];

// 操作符选项
const OPERATOR_OPTIONS: { value: FilterOperator; label: string }[] = [
  { value: 'contains', label: '包含' },
  { value: 'equals', label: '等于' },
  { value: 'startsWith', label: '开始于' },
  { value: 'endsWith', label: '结束于' },
  { value: 'regex', label: '正则表达式' },
  { value: 'greaterThan', label: '大于' },
  { value: 'lessThan', label: '小于' },
  { value: 'between', label: '介于' },
];

// 根据条件类型获取可用的操作符
const getAvailableOperators = (type: FilterConditionType): FilterOperator[] => {
  switch (type) {
    case 'status':
      return ['equals', 'greaterThan', 'lessThan', 'between'];
    case 'method':
      return ['equals'];
    default:
      return ['contains', 'equals', 'startsWith', 'endsWith', 'regex'];
  }
};

export const FilterConditionEditor: React.FC<FilterConditionEditorProps> = ({
  condition,
  disabled = false,
}) => {
  const { updateCondition, removeCondition } = useFilterTemplate();

  const availableOperators = getAvailableOperators(condition.type);
  const filteredOperatorOptions = OPERATOR_OPTIONS.filter(option => 
    availableOperators.includes(option.value)
  );

  const handleTypeChange = (type: FilterConditionType) => {
    const newAvailableOperators = getAvailableOperators(type);
    const newOperator = newAvailableOperators.includes(condition.operator) 
      ? condition.operator 
      : newAvailableOperators[0];
    
    updateCondition(condition.id, { 
      type, 
      operator: newOperator,
      value: '' // 重置值
    });
  };

  const handleOperatorChange = (operator: FilterOperator) => {
    updateCondition(condition.id, { operator });
  };

  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateCondition(condition.id, { value: e.target.value });
  };



  const handleRemove = () => {
    removeCondition(condition.id);
  };

  const isValueValid = validateConditionValue(condition.operator, condition.value);
  const valueError = !isValueValid && condition.value ? '值格式不正确' : undefined;

  return (
    <Card 
      className={`${
        !isValueValid && condition.value ? 'border-red-500' : ''
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <Form layout="vertical" >
            <div className="flex gap-2 mb-2">
              <Form.Item className="flex-1 !m-0" label="条件类型">
                <Select
                  value={condition.type}
                  onChange={handleTypeChange}
                  disabled={disabled}
                  
                >
                  {CONDITION_TYPE_OPTIONS.map(option => (
                    <Option key={option.value} value={option.value}>
                      {option.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
              
              <Form.Item className="flex-1 !m-0" label="操作符">
                <Select
                  value={condition.operator}
                  onChange={handleOperatorChange}
                  disabled={disabled}
                  
                >
                  {filteredOperatorOptions.map(option => (
                    <Option key={option.value} value={option.value}>
                      {option.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </div>
            
            <Form.Item 
              className="!m-0" 
              label="值" 
              validateStatus={valueError ? 'error' : ''}
              help={valueError}
            >
              <Input
                value={condition.value}
                onChange={handleValueChange}
                placeholder={getValuePlaceholder(condition.type, condition.operator)}
                disabled={disabled}
                
              />
            </Form.Item>
          </Form>
        </div>
        
        <div className="flex items-center gap-2 pt-6">
          {!disabled && (
            <Button
              type="text"
              icon={<DeleteOutlined />}
              onClick={handleRemove}
              danger
              title="删除条件"
            />
          )}
        </div>
      </div>
    </Card>
  );
};

// 获取值输入框的占位符
function getValuePlaceholder(type: FilterConditionType, operator: FilterOperator): string {
  if (operator === 'regex') {
    return '请输入正则表达式';
  }
  
  switch (type) {
    case 'url':
      return '例如: /api/users';
    case 'method':
      return '例如: GET, POST';
    case 'status':
      return '例如: 200, 404';
    case 'requestHeaders':
    case 'responseHeaders':
      return '例如: Content-Type: application/json';
    case 'requestBody':
    case 'responseBody':
      return '例如: {"key": "value"}';
    default:
      return '请输入值';
  }
}