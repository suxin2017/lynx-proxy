import { ExtendedMessageEventStoreValue } from '@/store/messageEventCache';
import { FilterTemplate, FilterCondition, FilterOperator, FilterConditionType, FilterResult } from './types';

/**
 * 过滤引擎类 - 根据选中的模板进行规则过滤
 */
export class FilterEngine {
  /**
   * 根据启用的模板过滤请求数据
   * @param data 原始请求数据数组
   * @param templates 所有模板
   * @returns 过滤结果
   */
  static filter(data: ExtendedMessageEventStoreValue[], templates: FilterTemplate[]): FilterResult {
    const enabledTemplates = templates.filter(template => template.enabled);
    
    if (enabledTemplates.length === 0) {
      return {
        total: data.length,
        filtered: data,
      };
    }

    const filtered = data.filter(item => {
      // 如果任何一个启用的模板匹配，则包含该项
      return enabledTemplates.some(template => this.matchTemplate(item, template));
    });

    return {
      total: data.length,
      filtered,
    };
  }

  /**
   * 检查单个请求是否匹配模板
   * @param item 请求数据
   * @param template 过滤模板
   * @returns 是否匹配
   */
  private static matchTemplate(item: ExtendedMessageEventStoreValue, template: FilterTemplate): boolean {
    const enabledConditions = template.conditions;
    
    if (enabledConditions.length === 0) {
      return true; // 没有启用的条件，默认匹配
    }

    // 所有条件都必须匹配（AND 逻辑）
    return enabledConditions.every(condition => this.matchCondition(item, condition));
  }

  /**
   * 检查单个条件是否匹配
   * @param item 请求数据
   * @param condition 过滤条件
   * @returns 是否匹配
   */
  private static matchCondition(item: ExtendedMessageEventStoreValue, condition: FilterCondition): boolean {
    const fieldValue = this.getFieldValue(item, condition.type);
    
    if (fieldValue === null || fieldValue === undefined) {
      return false;
    }

    return this.applyOperator(fieldValue, condition.operator, condition.value, condition.value2);
  }

  /**
   * 从请求数据中提取字段值
   * @param item 请求数据
   * @param fieldType 字段类型
   * @returns 字段值
   */
  private static getFieldValue(item: ExtendedMessageEventStoreValue, fieldType: FilterConditionType): any {
    switch (fieldType) {
      case 'url':
        return item.request?.url || '';
      
      case 'method':
        return item.request?.method || '';
      
      case 'status':
        return item.response?.status || 0;
      
      case 'requestHeaders':
        // 只搜索请求头
        return item.request?.headers ? Object.entries(item.request.headers).map(([k, v]) => `${k}: ${v}`).join(' ') : '';
      
      case 'responseHeaders':
        // 只搜索响应头
        return item.response?.headers ? Object.entries(item.response.headers).map(([k, v]) => `${k}: ${v}`).join(' ') : '';
      
      case 'requestBody':
        return this.getBodyAsString(item.request?.body);
      
      case 'responseBody':
        return this.getBodyAsString(item.response?.body);
      
      default:
        return null;
    }
  }



  /**
   * 将请求/响应体转换为字符串
   * @param body 请求/响应体
   * @returns 字符串形式的内容
   */
  private static getBodyAsString(body: any): string {
    if (!body) return '';
    
    if (typeof body === 'string') {
      return body;
    }
    
    if (body instanceof ArrayBuffer) {
      try {
        return new TextDecoder().decode(body);
      } catch {
        return '';
      }
    }
    
    if (typeof body === 'object') {
      try {
        return JSON.stringify(body);
      } catch {
        return '';
      }
    }
    
    return String(body);
  }

  /**
   * 应用操作符进行比较
   * @param fieldValue 字段值
   * @param operator 操作符
   * @param value 比较值
   * @param value2 第二个比较值（用于 between）
   * @returns 比较结果
   */
  private static applyOperator(
    fieldValue: any,
    operator: FilterOperator,
    value: string,
    value2?: string
  ): boolean {
    const fieldStr = String(fieldValue).toLowerCase();
    const valueStr = value.toLowerCase();
    
    switch (operator) {
      case 'contains':
        return fieldStr.includes(valueStr);
      
      case 'equals':
        return fieldStr === valueStr;
      
      case 'startsWith':
        return fieldStr.startsWith(valueStr);
      
      case 'endsWith':
        return fieldStr.endsWith(valueStr);
      
      case 'regex':
        try {
          const regex = new RegExp(value, 'i');
          return regex.test(fieldStr);
        } catch {
          return false;
        }
      
      case 'greaterThan':
        const numValue = parseFloat(value);
        const numField = parseFloat(String(fieldValue));
        return !isNaN(numField) && !isNaN(numValue) && numField > numValue;
      
      case 'lessThan':
        const numValue2 = parseFloat(value);
        const numField2 = parseFloat(String(fieldValue));
        return !isNaN(numField2) && !isNaN(numValue2) && numField2 < numValue2;
      
      case 'between':
        if (!value2) return false;
        const minValue = parseFloat(value);
        const maxValue = parseFloat(value2);
        const numField3 = parseFloat(String(fieldValue));
        return !isNaN(numField3) && !isNaN(minValue) && !isNaN(maxValue) && 
               numField3 >= minValue && numField3 <= maxValue;
      
      default:
        return false;
    }
  }

  /**
   * 验证过滤条件的有效性
   * @param condition 过滤条件
   * @returns 验证结果
   */
  static validateCondition(condition: FilterCondition): { valid: boolean; error?: string } {
    if (!condition.value.trim()) {
      return { valid: false, error: '过滤值不能为空' };
    }

    // 验证数值类型的条件
    if (['greaterThan', 'lessThan'].includes(condition.operator)) {
      if (isNaN(parseFloat(condition.value))) {
        return { valid: false, error: '数值比较需要有效的数字' };
      }
    }

    // 验证 between 操作符
    if (condition.operator === 'between') {
      if (!condition.value2 || !condition.value2.trim()) {
        return { valid: false, error: 'between 操作符需要两个值' };
      }
      if (isNaN(parseFloat(condition.value)) || isNaN(parseFloat(condition.value2))) {
        return { valid: false, error: 'between 操作符需要有效的数字' };
      }
      if (parseFloat(condition.value) >= parseFloat(condition.value2)) {
        return { valid: false, error: '第一个值必须小于第二个值' };
      }
    }

    // 验证正则表达式
    if (condition.operator === 'regex') {
      try {
        new RegExp(condition.value);
      } catch {
        return { valid: false, error: '无效的正则表达式' };
      }
    }

    return { valid: true };
  }

  /**
   * 验证过滤模板的有效性
   * @param template 过滤模板
   * @returns 验证结果
   */
  static validateTemplate(template: FilterTemplate): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!template.name.trim()) {
      errors.push('模板名称不能为空');
    }

    if (template.conditions.length === 0) {
      errors.push('模板至少需要一个过滤条件');
    }

    template.conditions.forEach((condition, index) => {
      const validation = this.validateCondition(condition);
      if (!validation.valid) {
        errors.push(`条件 ${index + 1}: ${validation.error}`);
      }
    });

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

/**
 * 过滤引擎的便捷函数
 */
export const filterRequests = (data: ExtendedMessageEventStoreValue[], templates: FilterTemplate[]): FilterResult => {
  return FilterEngine.filter(data, templates);
};

export const validateFilterCondition = (condition: FilterCondition) => {
  return FilterEngine.validateCondition(condition);
};

export const validateFilterTemplate = (template: FilterTemplate) => {
  return FilterEngine.validateTemplate(template);
};