import { describe, test, expect } from 'vitest';
import { FilterEngine, filterRequests, validateFilterCondition, validateFilterTemplate } from '../routes/network/components/FilterTemplate/filterEngine';
import { ExtendedMessageEventStoreValue } from '@/store/messageEventCache';
import { FilterTemplate, FilterCondition, PRESET_TEMPLATES } from '../routes/network/components/FilterTemplate/types';

// 模拟测试数据
const createMockRequest = (overrides: Partial<ExtendedMessageEventStoreValue> = {}): ExtendedMessageEventStoreValue => {
  return {
    traceId: 'test-id',
    isNew: false,
    status: 'Completed',
    timings: {
      proxyStart: 1000,
      proxyEnd: 1200,
      requestStart: 1000,
      requestEnd: 1050,
      reponseBodyStart: 1150,
      reponseBodyEnd: 1200,
    },
    request: {
      url: 'https://api.example.com/api/users',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer token123',
      },
      body: '',
      version: 'HTTP/1.1',
      headerSize: 150,
    },
    response: {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: '{"users": []}',
      version: 'HTTP/1.1',
      headerSize: 100,
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  };
};

// 测试数据集
const testData: ExtendedMessageEventStoreValue[] = [
  // 正常 API 请求
  createMockRequest({
    traceId: 'req-1',
    request: {
      url: 'https://api.example.com/api/users',
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      body: '',
      version: 'HTTP/1.1',
      headerSize: 150,
    },
    response: {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: '{"users": []}',
      version: 'HTTP/1.1',
      headerSize: 100,
    },
    timings: {
      proxyStart: 1000,
      proxyEnd: 1200, // 200ms
      requestStart: 1000,
      requestEnd: 1050,
      reponseBodyStart: 1150,
      reponseBodyEnd: 1200,
    },
  }),
  
  // 错误请求
  createMockRequest({
    traceId: 'req-2',
    request: {
      url: 'https://api.example.com/api/invalid',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"data": "test"}',
      version: 'HTTP/1.1',
      headerSize: 150,
    },
    response: {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
      body: '{"error": "Not found"}',
      version: 'HTTP/1.1',
      headerSize: 100,
    },
    timings: {
      proxyStart: 2000,
      proxyEnd: 2100, // 100ms
      requestStart: 2000,
      requestEnd: 2050,
      reponseBodyStart: 2080,
      reponseBodyEnd: 2100,
    },
  }),
  
  // 慢请求
  createMockRequest({
    traceId: 'req-3',
    request: {
      url: 'https://slow.example.com/data',
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      body: '',
      version: 'HTTP/1.1',
      headerSize: 150,
    },
    response: {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: '{"data": "large response"}',
      version: 'HTTP/1.1',
      headerSize: 100,
    },
    timings: {
      proxyStart: 3000,
      proxyEnd: 4500, // 1500ms
      requestStart: 3000,
      requestEnd: 3100,
      reponseBodyStart: 4400,
      reponseBodyEnd: 4500,
    },
  }),
  
  // 非 API 请求
  createMockRequest({
    traceId: 'req-4',
    request: {
      url: 'https://example.com/page.html',
      method: 'GET',
      headers: { 'Accept': 'text/html' },
      body: '',
      version: 'HTTP/1.1',
      headerSize: 150,
    },
    response: {
      status: 200,
      headers: { 'Content-Type': 'text/html' },
      body: '<html><body>Hello</body></html>',
      version: 'HTTP/1.1',
      headerSize: 100,
    },
    timings: {
      proxyStart: 4000,
      proxyEnd: 4300, // 300ms
      requestStart: 4000,
      requestEnd: 4100,
      reponseBodyStart: 4200,
      reponseBodyEnd: 4300,
    },
  }),
  
  // 服务器错误
  createMockRequest({
    traceId: 'req-5',
    request: {
      url: 'https://api.example.com/api/server-error',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"action": "process"}',
      version: 'HTTP/1.1',
      headerSize: 150,
    },
    response: {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
      body: '{"error": "Internal server error"}',
      version: 'HTTP/1.1',
      headerSize: 100,
    },
    timings: {
      proxyStart: 5000,
      proxyEnd: 5800, // 800ms
      requestStart: 5000,
      requestEnd: 5100,
      reponseBodyStart: 5700,
      reponseBodyEnd: 5800,
    },
  }),
];

describe('过滤引擎', () => {
  describe('基本过滤功能', () => {
    test('无启用模板时返回所有数据', () => {
      const templates: FilterTemplate[] = [
        {
          id: 'test-template',
          name: '测试模板',
          conditions: [{
            id: 'test-condition',
            type: 'url',
            operator: 'contains',
            value: 'api',
          }],
          isPreset: false,
          enabled: false, // 未启用
        },
      ];
      
      const result = FilterEngine.filter(testData, templates);
      expect(result.total).toBe(5);
      expect(result.filtered).toHaveLength(5);
    });
    
    test('空模板数组时返回所有数据', () => {
      const result = FilterEngine.filter(testData, []);
      expect(result.total).toBe(5);
      expect(result.filtered).toHaveLength(5);
    });
  });
  
  describe('URL 过滤', () => {
    test('包含操作符', () => {
      const template: FilterTemplate = {
        id: 'url-contains',
        name: 'URL 包含测试',
        conditions: [{
          id: 'url-condition',
          type: 'url',
          operator: 'contains',
          value: 'api',
        }],
        isPreset: false,
        enabled: true,
      };
      
      const result = FilterEngine.filter(testData, [template]);
      expect(result.filtered).toHaveLength(3); // req-1, req-2, req-5
      expect(result.filtered.map(r => r.traceId)).toEqual(['req-1', 'req-2', 'req-5']);
    });
    
    test('开始于操作符', () => {
      const template: FilterTemplate = {
        id: 'url-starts',
        name: 'URL 开始测试',
        conditions: [{
          id: 'url-condition',
          type: 'url',
          operator: 'startsWith',
          value: 'https://api',
        }],
        isPreset: false,
        enabled: true,
      };
      
      const result = FilterEngine.filter(testData, [template]);
      expect(result.filtered).toHaveLength(3); // req-1, req-2, req-5
    });
    
    test('正则表达式操作符', () => {
      const template: FilterTemplate = {
        id: 'url-regex',
        name: 'URL 正则测试',
        conditions: [{
          id: 'url-condition',
          type: 'url',
          operator: 'regex',
          value: '\\.com/api/(users|invalid)',
        }],
        isPreset: false,
        enabled: true,
      };
      
      const result = FilterEngine.filter(testData, [template]);
      expect(result.filtered).toHaveLength(2); // req-1, req-2
    });
  });
  
  describe('状态码过滤', () => {
    test('等于操作符', () => {
      const template: FilterTemplate = {
        id: 'status-equals',
        name: '状态码等于测试',
        conditions: [{
          id: 'status-condition',
          type: 'status',
          operator: 'equals',
          value: '200',
        }],
        isPreset: false,
        enabled: true,
      };
      
      const result = FilterEngine.filter(testData, [template]);
      expect(result.filtered).toHaveLength(3); // req-1, req-3, req-4
    });
    
    test('大于操作符', () => {
      const template: FilterTemplate = {
        id: 'status-gt',
        name: '状态码大于测试',
        conditions: [{
          id: 'status-condition',
          type: 'status',
          operator: 'greaterThan',
          value: '399',
        }],
        isPreset: false,
        enabled: true,
      };
      
      const result = FilterEngine.filter(testData, [template]);
      expect(result.filtered).toHaveLength(2); // req-2 (404), req-5 (500)
    });
  });
  
  
  describe('请求方法过滤', () => {
    test('等于操作符', () => {
      const template: FilterTemplate = {
        id: 'method-equals',
        name: '请求方法测试',
        conditions: [{
          id: 'method-condition',
          type: 'method',
          operator: 'equals',
          value: 'POST',
        }],
        isPreset: false,
        enabled: true,
      };
      
      const result = FilterEngine.filter(testData, [template]);
      expect(result.filtered).toHaveLength(2); // req-2, req-5
    });
  });
  
  describe('多条件过滤', () => {
    test('AND 逻辑 - 所有条件都匹配', () => {
      const template: FilterTemplate = {
        id: 'multi-and',
        name: '多条件 AND 测试',
        conditions: [
          {
            id: 'url-condition',
            type: 'url',
            operator: 'contains',
            value: 'api',
          },
          {
            id: 'method-condition',
            type: 'method',
            operator: 'equals',
            value: 'POST',
          },
        ],
        isPreset: false,
        enabled: true,
      };
      
      const result = FilterEngine.filter(testData, [template]);
      expect(result.filtered).toHaveLength(2); // req-2, req-5
    });
  
  });
  
 
  describe('预制模板测试', () => {
    test('错误请求模板', () => {
      const errorTemplate = PRESET_TEMPLATES.find(t => t.id === 'preset-errors')!;
      const result = FilterEngine.filter(testData, [errorTemplate]);
      expect(result.filtered).toHaveLength(2); // req-2 (404), req-5 (500)
    });
    

    
    test('API 请求模板', () => {
      const apiTemplate = PRESET_TEMPLATES.find(t => t.id === 'preset-api-requests')!;
      const result = FilterEngine.filter(testData, [apiTemplate]);
      expect(result.filtered).toHaveLength(4); // req-1, req-2, req-3, req-5
    });
    
    test('POST请求模板', () => {
      const postTemplate = PRESET_TEMPLATES.find(t => t.id === 'preset-post')!;
      const result = FilterEngine.filter(testData, [postTemplate]);
      expect(result.filtered).toHaveLength(2); // req-2, req-5
    });
  });
});

describe('条件验证', () => {
  test('有效条件', () => {
    const condition: FilterCondition = {
      id: 'test',
      type: 'url',
      operator: 'contains',
      value: 'api',
    };
    
    const result = validateFilterCondition(condition);
    expect(result.valid).toBe(true);
  });
  
  test('空值条件', () => {
    const condition: FilterCondition = {
      id: 'test',
      type: 'url',
      operator: 'contains',
      value: '',
    };
    
    const result = validateFilterCondition(condition);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('过滤值不能为空');
  });
  
  test('无效数值条件', () => {
    const condition: FilterCondition = {
      id: 'test',
      type: 'status',
      operator: 'greaterThan',
      value: 'abc',
    };
    
    const result = validateFilterCondition(condition);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('数值比较需要有效的数字');
  });
  
  
  test('无效正则表达式', () => {
    const condition: FilterCondition = {
      id: 'test',
      type: 'url',
      operator: 'regex',
      value: '[invalid',
    };
    
    const result = validateFilterCondition(condition);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('无效的正则表达式');
  });
});

describe('模板验证', () => {
  test('有效模板', () => {
    const template: FilterTemplate = {
      id: 'test',
      name: '测试模板',
      conditions: [{
        id: 'test-condition',
        type: 'url',
        operator: 'contains',
        value: 'api',
      }],
      isPreset: false,
      enabled: true,
    };
    
    const result = validateFilterTemplate(template);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
  
  test('空名称模板', () => {
    const template: FilterTemplate = {
      id: 'test',
      name: '',
      conditions: [{
        id: 'test-condition',
        type: 'url',
        operator: 'contains',
        value: 'api',
      }],
      isPreset: false,
      enabled: true,
    };
    
    const result = validateFilterTemplate(template);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('模板名称不能为空');
  });
  
  test('无条件模板', () => {
    const template: FilterTemplate = {
      id: 'test',
      name: '测试模板',
      conditions: [],
      isPreset: false,
      enabled: true,
    };
    
    const result = validateFilterTemplate(template);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('模板至少需要一个过滤条件');
  });
});

describe('便捷函数', () => {
  test('过滤请求函数', () => {
    const template: FilterTemplate = {
      id: 'test',
      name: '测试',
      conditions: [{
        id: 'test-condition',
        type: 'url',
        operator: 'contains',
        value: 'api',
      }],
      isPreset: false,
      enabled: true,
    };
    
    const result = filterRequests(testData, [template]);
    expect(result.filtered).toHaveLength(3);
  });
});

// 运行测试的辅助函数
export const runFilterEngineTests = () => {
  console.log('开始运行过滤引擎测试...');
  
  // 这里可以添加手动测试逻辑
  const template: FilterTemplate = {
    id: 'manual-test',
    name: '手动测试',
    conditions: [{
      id: 'test-condition',
      type: 'url',
      operator: 'contains',
      value: 'api',
    }],
    isPreset: false,
    enabled: true,
  };
  
  const result = FilterEngine.filter(testData, [template]);
  console.log('过滤结果:', {
    total: result.total,
    filtered: result.filtered.length,
    ids: result.filtered.map(r => r.traceId),
  });
  
  return result;
};