// Form types for CreateRuleForm component
import {
  RequestRule,
  CaptureCondition,
  CaptureType,
  LogicalOperator,
  HandlerRuleTypeOneOf,
  HandlerRuleTypeOneOfFour,
  HandlerRuleTypeOneOfSeven,
  HandlerRuleTypeOneOfOnezero,
  HandlerRuleTypeOneOfOnethree,
  HandlerRuleType,
} from '@/services/generated/utoipaAxum.schemas';
import { FormInstance } from 'antd';

// Form-specific types for type-safe form handling

export interface CreateRuleFormValues {
  name: string;
  description?: string;
  enabled: boolean;
  priority: number;
  capture: CaptureRuleFormValues;
  handlers: HandlerRuleFormValues[];
}

export interface CaptureRuleFormValues {
  type: 'simple' | 'complex';
  simpleCondition?: CaptureCondition;
  complexCondition?: CaptureCondition;
}

// Handler form values based on the generated types
export interface HandlerRuleFormValues {
  name: string;
  description?: string;
  enabled: boolean;
  executionOrder: number;
  handlerType: HandlerRuleTypeFormValues;
}

export type HandlerRuleTypeFormValues =
  | HandlerRuleTypeOneOf
  | (Omit<HandlerRuleTypeOneOfFour, 'modifyHeaders'> & {
      modifyHeaders: { key: string; value: string }[];
    })
  | HandlerRuleTypeOneOfSeven
  | (Omit<HandlerRuleTypeOneOfOnezero, 'modifyHeaders'> & {
      modifyHeaders: { key: string; value: string }[];
    })
  | HandlerRuleTypeOneOfOnethree;

// Simple capture condition form values - using the generated type directly
export interface UrlPatternFormValues {
  pattern: string;
  captureType: CaptureType;
}

// Complex capture rule form values - using the generated type directly
export interface ComplexCaptureRuleFormValues {
  operator: LogicalOperator;
  conditions: CaptureCondition[];
}

// Type guards for form validation
export const isSimpleCaptureCondition = (
  condition: CaptureCondition,
): condition is CaptureCondition & { type: 'simple' } => {
  return 'type' in condition && condition.type === 'simple';
};

export const isComplexCaptureCondition = (
  condition: CaptureCondition,
): condition is CaptureCondition & { type: 'complex' } => {
  return 'type' in condition && condition.type === 'complex';
};

// Utility function to convert API RequestRule to form values
export const requestRuleToFormValues = (
  rule: RequestRule,
): CreateRuleFormValues => {
  const capture = rule.capture;

  return {
    name: rule.name,
    description: rule.description || '',
    enabled: rule.enabled,
    priority: rule.priority,
    capture: {
      type: capture.condition.type === 'simple' ? 'simple' : 'complex',
      simpleCondition:
        capture.condition.type === 'simple'
          ? capture.condition
          : getDefaultSimpleCaptureCondition(),
      complexCondition:
        capture.condition.type === 'complex'
          ? capture.condition
          : getDefaultComplexCaptureCondition(),
    },
    handlers: rule.handlers.map((handler) => {
      const handlerType = handler.handlerType;
      let newHandlerType: HandlerRuleTypeFormValues =
        handlerType as HandlerRuleTypeFormValues;
      if (
        handler.handlerType.type === 'modifyRequest' ||
        handler.handlerType.type === 'modifyResponse'
      ) {
        const modifyHeaders = Object.entries(
          handler.handlerType.modifyHeaders ?? {},
        ).map(([key, value]) => ({
          key,
          value,
        }));

        newHandlerType = {
          ...handler.handlerType,
          modifyHeaders,
        };
      }
      return {
        name: handler.name,
        description: handler.description || '',
        enabled: handler.enabled,
        executionOrder: handler.executionOrder,
        handlerType: newHandlerType,
      };
    }),
  };
};

export const safeSetFormFields = (
  form: FormInstance,
  values: CreateRuleFormValues,
) => {
  form.setFieldsValue(values);
};

// Utility function to convert form values to API request format
export const formValuesToRequestRule = (
  formValues: CreateRuleFormValues,
): Omit<RequestRule, 'id'> => {
  const handlers = formValues.handlers.map((handler) => {
    let newHandlerType = handler.handlerType as HandlerRuleType;
    if (
      newHandlerType.type === 'modifyRequest' ||
      newHandlerType.type === 'modifyResponse'
    ) {
      const modifyHeaders =
        (newHandlerType.modifyHeaders as unknown as {
          key: string;
          value: string;
        }[]) || [];

      newHandlerType = {
        ...newHandlerType,
        modifyHeaders: modifyHeaders.reduce(
          (acc, header) => {
            acc[header.key] = header.value;
            return acc;
          },
          {} as Record<string, string>,
        ),
      };
    }

    return {
      name: handler.name,
      description: handler.description || null,
      enabled: handler.enabled,
      executionOrder: handler.executionOrder,
      handlerType,
    };
  });

  return {
    name: formValues.name,
    description: formValues.description || null,
    enabled: formValues.enabled,
    priority: formValues.priority,
    capture: {
      condition:
        formValues.capture.type === 'simple'
          ? (formValues.capture.simpleCondition as CaptureCondition)
          : (formValues.capture.complexCondition as CaptureCondition),
    },
    handlers,
  };
};

export const getDefaultSimpleCaptureCondition = (): CaptureCondition => ({
  type: 'simple',
  urlPattern: {
    pattern: '',
    captureType: 'glob',
  },
  method: null,
  host: null,
  headers: null,
});

export const getDefaultComplexCaptureCondition = (): CaptureCondition => ({
  type: 'complex',
  operator: 'and',
  conditions: [],
});

// Initial form values
export const getInitialFormValues = (): CreateRuleFormValues => ({
  name: '',
  description: '',
  enabled: true,
  priority: 50,
  capture: {
    type: 'simple',
    simpleCondition: getDefaultSimpleCaptureCondition(),
    complexCondition: getDefaultComplexCaptureCondition(),
  },
  handlers: [],
});

// Form validation rules
export const formValidationRules = {
  name: [
    { required: true, message: '请输入规则名称' },
    { max: 255, message: '规则名称不能超过255个字符' },
  ],
  description: [{ max: 500, message: '规则描述不能超过500个字符' }],
  priority: [
    { required: true, message: '请输入优先级' },
    { type: 'number' as const, min: 0, max: 100, message: '优先级范围：0-100' },
  ],
};
