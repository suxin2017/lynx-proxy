import constate from 'constate';
import { useNodeSelection } from '../hooks/useNodeSelection';

/**
 * 使用 constate 创建节点选择状态的 Context
 * 避免 prop drilling，提供统一的节点选择逻辑
 */
export const [NodeSelectionProvider, useNodeSelectionContext] = constate(useNodeSelection);