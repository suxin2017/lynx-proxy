import constate from 'constate';
import { useState, useCallback } from 'react';
import { FilterTemplate, FilterCondition, PRESET_TEMPLATES } from './types';
import { generateId } from './utils';

export interface FilterTemplateState {
  templates: FilterTemplate[];
  currentTemplate: FilterTemplate | null;
  isModalVisible: boolean;
  isEditing: boolean;
  hasUnsavedChanges: boolean;
}

const STORAGE_KEY = 'filter-templates';
const PRESET_TEMPLATES_STATE_KEY = 'preset-templates-state';

// 从 localStorage 加载预制模板状态
const loadPresetTemplatesState = (): Record<string, boolean> => {
  try {
    const stored = localStorage.getItem(PRESET_TEMPLATES_STATE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Failed to load preset templates state from storage:', error);
  }
  return {};
};

// 保存预制模板状态到 localStorage
const savePresetTemplatesState = (state: Record<string, boolean>) => {
  try {
    localStorage.setItem(PRESET_TEMPLATES_STATE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error('Failed to save preset templates state to storage:', error);
  }
};

// 从 localStorage 加载模板
const loadTemplatesFromStorage = (): FilterTemplate[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const presetState = loadPresetTemplatesState();
    
    // 应用预制模板的状态
    const presetsWithState = PRESET_TEMPLATES.map(template => ({
      ...template,
      enabled: presetState[template.id] !== undefined ? presetState[template.id] : template.enabled
    }));
    
    if (stored) {
      const userTemplates = JSON.parse(stored) as FilterTemplate[];
      return [...presetsWithState, ...userTemplates];
    }
    return presetsWithState;
  } catch (error) {
    console.error('Failed to load templates from storage:', error);
  }
  return PRESET_TEMPLATES;
};

// 保存用户模板到 localStorage
const saveTemplatesToStorage = (templates: FilterTemplate[]) => {
  try {
    const userTemplates = templates.filter(t => !t.isPreset);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userTemplates));
  } catch (error) {
    console.error('Failed to save templates to storage:', error);
  }
};

export const [FilterTemplateProvider, useFilterTemplate] = constate(() => {
  const [state, setState] = useState<FilterTemplateState>({
    templates: loadTemplatesFromStorage(),
    currentTemplate: null,
    isModalVisible: false,
    isEditing: false,
    hasUnsavedChanges: false,
  });

  // 打开模板弹窗
  const openModal = useCallback(() => {
    setState(prev => ({
      ...prev,
      isModalVisible: true,
      currentTemplate: null,
      isEditing: false,
      hasUnsavedChanges: false,
    }));
  }, []);

  // 关闭模板弹窗
  const closeModal = useCallback(() => {
    setState(prev => ({
      ...prev,
      templates: loadTemplatesFromStorage(), // 重新加载最新的模板状态
      isModalVisible: false,
      currentTemplate: null,
      isEditing: false,
      hasUnsavedChanges: false,
    }));
  }, []);

  // 选择模板
  const selectTemplate = useCallback((template: FilterTemplate) => {
    setState(prev => ({
      ...prev,
      currentTemplate: { ...template },
      isEditing: false,
      hasUnsavedChanges: false,
    }));
  }, []);

  // 创建新模板
  const createNewTemplate = useCallback(() => {
    const newTemplate: FilterTemplate = {
      id: generateId(),
      name: '新建模板',
      description: '',
      conditions: [],
      isPreset: false,
      enabled: true,
    };
    
    setState(prev => ({
      ...prev,
      currentTemplate: newTemplate,
      isEditing: true,
      hasUnsavedChanges: true,
    }));
  }, []);

  // 编辑模板
  const editTemplate = useCallback((template: FilterTemplate) => {
    if (template.isPreset) {
      // 预制模板不能编辑，创建副本
      const copy: FilterTemplate = {
        ...template,
        id: generateId(),
        name: `${template.name} (副本)`,
        isPreset: false,
        enabled: true,
      };
      setState(prev => ({
        ...prev,
        currentTemplate: copy,
        isEditing: true,
        hasUnsavedChanges: true,
      }));
    } else {
      setState(prev => ({
        ...prev,
        currentTemplate: { ...template },
        isEditing: true,
        hasUnsavedChanges: false,
      }));
    }
  }, []);

  // 保存模板
  const saveTemplate = useCallback((template: FilterTemplate) => {
    setState(prev => {
      const existingIndex = prev.templates.findIndex(t => t.id === template.id);
      let newTemplates: FilterTemplate[];
      
      if (existingIndex >= 0) {
        // 更新现有模板
        newTemplates = [...prev.templates];
        newTemplates[existingIndex] = { ...template };
      } else {
        // 添加新模板
        newTemplates = [...prev.templates, { ...template }];
      }
      
      saveTemplatesToStorage(newTemplates);
      
      return {
        ...prev,
        templates: newTemplates,
        currentTemplate: template,
        hasUnsavedChanges: false,
      };
    });
  }, []);

  // 删除模板
  const deleteTemplate = useCallback((templateId: string) => {
    setState(prev => {
      const userTemplates = prev.templates.filter(t => t.id !== templateId && !t.isPreset);
      saveTemplatesToStorage(userTemplates);
      
      return {
        ...prev,
        templates: [...PRESET_TEMPLATES, ...userTemplates],
        currentTemplate: prev.currentTemplate?.id === templateId ? null : prev.currentTemplate,
      };
    });
  }, []);

  // 更新当前模板
  const updateCurrentTemplate = useCallback((updates: Partial<FilterTemplate>) => {
    setState(prev => {
      if (!prev.currentTemplate) return prev;
      
      return {
        ...prev,
        currentTemplate: { ...prev.currentTemplate, ...updates },
        hasUnsavedChanges: true,
      };
    });
  }, []);

  // 添加过滤条件
  const addCondition = useCallback(() => {
    const newCondition: FilterCondition = {
      id: generateId(),
      type: 'url',
      operator: 'contains',
      value: '',
    };
    
    setState(prev => {
      if (!prev.currentTemplate) return prev;
      
      return {
        ...prev,
        currentTemplate: {
          ...prev.currentTemplate,
          conditions: [...prev.currentTemplate.conditions, newCondition],
        },
        hasUnsavedChanges: true,
      };
    });
  }, []);

  // 更新过滤条件
  const updateCondition = useCallback((conditionId: string, updates: Partial<FilterCondition>) => {
    setState(prev => {
      if (!prev.currentTemplate) return prev;
      
      const newConditions = prev.currentTemplate.conditions.map(condition =>
        condition.id === conditionId ? { ...condition, ...updates } : condition
      );
      
      return {
        ...prev,
        currentTemplate: {
          ...prev.currentTemplate,
          conditions: newConditions,
        },
        hasUnsavedChanges: true,
      };
    });
  }, []);

  // 删除过滤条件
  const removeCondition = useCallback((conditionId: string) => {
    setState(prev => {
      if (!prev.currentTemplate) return prev;
      
      return {
        ...prev,
        currentTemplate: {
          ...prev.currentTemplate,
          conditions: prev.currentTemplate.conditions.filter(c => c.id !== conditionId),
        },
        hasUnsavedChanges: true,
      };
    });
  }, []);

  // 切换模板开关状态
  const toggleTemplateEnabled = useCallback((templateId: string) => {
    setState(prev => {
      const templateIndex = prev.templates.findIndex(t => t.id === templateId);
      if (templateIndex === -1) return prev;
      
      const template = prev.templates[templateIndex];
      const updatedTemplate = { ...template, enabled: !template.enabled };
      const newTemplates = [...prev.templates];
      newTemplates[templateIndex] = updatedTemplate;
      
      if (template.isPreset) {
        // 保存预制模板状态
        const currentPresetState = loadPresetTemplatesState();
        const newPresetState = {
          ...currentPresetState,
          [templateId]: updatedTemplate.enabled
        };
        savePresetTemplatesState(newPresetState);
      } else {
        // 保存用户模板到 localStorage
        saveTemplatesToStorage(newTemplates);
      }
      
      return {
        ...prev,
        templates: newTemplates,
        currentTemplate: prev.currentTemplate?.id === templateId ? updatedTemplate : prev.currentTemplate,
      };
    });
  }, []);

  return {
    state,
    openModal,
    closeModal,
    selectTemplate,
    createNewTemplate,
    editTemplate,
    saveTemplate,
    deleteTemplate,
    updateCurrentTemplate,
    addCondition,
    updateCondition,
    removeCondition,
    toggleTemplateEnabled,
  };
});