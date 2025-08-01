import { ExtendedMessageEventStoreValue } from '@/store/messageEventCache';

// 过滤条件类型
export type FilterConditionType =
  | 'url'
  | 'method'
  | 'status'
  | 'requestHeaders'
  | 'responseHeaders'
  | 'requestBody'
  | 'responseBody';

// 过滤操作符
export type FilterOperator =
  | 'contains'
  | 'equals'
  | 'startsWith'
  | 'endsWith'
  | 'regex'
  | 'greaterThan'
  | 'lessThan'
  | 'between';

// 单个过滤条件
export interface FilterCondition {
  id: string;
  type: FilterConditionType;
  operator: FilterOperator;
  value: string;
  value2?: string; // 用于 between 操作符
}
// 过滤模板
export interface FilterTemplate {
  id: string;
  name: string;
  description?: string;
  conditions: FilterCondition[];
  isPreset: boolean; // 是否为预制模板
  enabled: boolean; // 模板开关状态
}

// 过滤结果
export interface FilterResult {
  total: number;
  filtered: ExtendedMessageEventStoreValue[];
}

// 预制模板类型
export const PRESET_TEMPLATES: FilterTemplate[] = [
  // 静态资源类
  {
    id: 'preset-static-resources',
    name: '静态资源',
    description: '所有静态资源文件 (CSS、JS、HTML、字体等)',
    conditions: [
      {
        id: 'static-content-type',
        type: 'responseHeaders',
        operator: 'regex',
        value: '(text/css|text/javascript|application/javascript|text/html|application/x-font|font/)',
      },
    ],
    isPreset: true,
    enabled: false,
  },
  // 媒体资源类
  {
    id: 'preset-media-resources',
    name: '媒体资源',
    description: '所有媒体文件 (图片、视频、音频)',
    conditions: [
      {
        id: 'media-content-type',
        type: 'responseHeaders',
        operator: 'regex',
        value: '(image/|video/|audio/)',
      },
    ],
    isPreset: true,
    enabled: false,
  },
  // API 请求类
  {
    id: 'preset-api-requests',
    name: 'API 请求',
    description: '所有 API 接口请求',
    conditions: [
      {
        id: 'api-headers',
        type: 'responseHeaders',
        operator: 'regex',
        value: 'application/json',
      },
    ],
    isPreset: true,
    enabled: false,
  },
  // 错误请求
  {
    id: 'preset-errors',
    name: '错误请求',
    description: '状态码为 4xx 或 5xx 的请求',
    conditions: [
      {
        id: 'error-status',
        type: 'status',
        operator: 'greaterThan',
        value: '399',
      },
    ],
    isPreset: true,
    enabled: false,
  },
  // POST 请求
  {
    id: 'preset-post',
    name: 'POST 请求',
    description: '所有 POST 方法的请求',
    conditions: [
      {
        id: 'post-method',
        type: 'method',
        operator: 'equals',
        value: 'POST',
      },
    ],
    isPreset: true,
    enabled: false,
  }
];