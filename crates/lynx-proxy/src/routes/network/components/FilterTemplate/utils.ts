// 生成唯一 ID
export const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// 验证模板名称
export const validateTemplateName = (name: string): boolean => {
  return name.trim().length > 0 && name.trim().length <= 50;
};

// 验证过滤条件值
export const validateConditionValue = (value: string, operator: string): boolean => {
  if (!value.trim()) return false;
  
  if (operator === 'greaterThan' || operator === 'lessThan') {
    return !isNaN(Number(value));
  }
  
  if (operator === 'regex') {
    try {
      new RegExp(value);
      return true;
    } catch {
      return false;
    }
  }
  
  return true;
};