import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { useSelector } from 'react-redux';
import { IViewMessageEventStoreValue, RootState } from './useSortPoll';
import { FilterEngine } from '@/routes/network/components/FilterTemplate/filterEngine';
import { useFilterTemplate } from '@/routes/network/components/FilterTemplate/context';
import { ExtendedMessageEventStoreValue } from './messageEventCache';

export interface IRequestTreeNode {
  id: string;
  name: string;
  record?: IViewMessageEventStoreValue;
  children: IRequestTreeNode[];
}

export type IRequestTree = IRequestTreeNode[];

export interface RequestTreeState {
  requestTree: IRequestTree;
}

const initialState: RequestTreeState = {
  requestTree: [],
};

// ==================== 工具函数 ====================

/**
 * 安全地解析URL为路径段
 * @param url 原始URL字符串
 * @returns 解析后的路径段数组
 */
function parseUrlToPathSegments(url: string): string[] {
  if (!url || typeof url !== 'string') {
    return [];
  }

  try {
    // 使用URL构造函数进行标准化解析
    const urlObj = new URL(url);

    // 获取协议和主机部分
    const origin = urlObj.origin;

    // 获取路径部分，移除开头的斜杠和查询参数
    const pathname = urlObj.pathname.replace(/^\/+/, '');

    // 构建路径段数组
    const segments: string[] = [origin];

    if (pathname) {
      // 分割路径，过滤空字符串
      const pathParts = pathname.split('/').filter(part => part.length > 0);
      segments.push(...pathParts);
    }

    return segments;
  } catch (error) {
    // 如果URL解析失败，尝试简单的字符串处理
    console.warn('URL parsing failed, falling back to string processing:', error);
    return fallbackUrlParsing(url);
  }
}

/**
 * 备用的URL解析方法
 * @param url 原始URL字符串
 * @returns 解析后的路径段数组
 */
function fallbackUrlParsing(url: string): string[] {
  const segments: string[] = [];

  // 查找协议部分
  const schemaMatch = url.match(/^([a-zA-Z][a-zA-Z0-9+.-]*:\/\/)/);
  if (!schemaMatch) {
    return [url]; // 如果没有协议，直接返回原始URL
  }

  const schema = schemaMatch[1];
  const remaining = url.slice(schema.length);

  // 分离主机和路径
  const firstSlashIndex = remaining.indexOf('/');
  if (firstSlashIndex === -1) {
    // 没有路径部分
    segments.push(schema + remaining);
  } else {
    // 有路径部分
    const host = remaining.slice(0, firstSlashIndex);
    const path = remaining.slice(firstSlashIndex + 1);

    segments.push(schema + host);

    if (path) {
      // 移除查询参数
      const pathWithoutQuery = path.split('?')[0];
      // 分割路径，过滤空字符串
      const pathParts = pathWithoutQuery.split('/').filter(part => part.length > 0);
      segments.push(...pathParts);
    }
  }

  return segments;
}

/**
 * 查找或创建树节点
 * @param currentNode 当前节点数组
 * @param pathSegment 路径段
 * @param nodeId 节点ID
 * @returns 找到或创建的节点
 */
function findOrCreateNode(
  currentNode: IRequestTreeNode[],
  pathSegment: string,
  nodeId: string
): IRequestTreeNode {
  let node = currentNode.find(n => n.id === nodeId);

  if (!node) {
    node = {
      id: nodeId,
      name: pathSegment,
      record: undefined,
      children: [],
    };
    currentNode.push(node);
  }

  return node;
}

/**
 * 生成节点ID
 * @param segments 路径段数组
 * @param index 当前索引
 * @returns 生成的ID
 */
function generateNodeId(segments: string[], index: number): string {
  return segments.slice(0, index + 1).join('/');
}

/**
 * 深度优先搜索查找节点
 * @param tree 树节点数组
 * @param traceId 要查找的traceId
 * @param callback 找到节点时的回调函数
 * @returns 是否找到节点
 */
function dfsFind(
  tree: IRequestTree,
  traceId: string,
  callback: (node: IRequestTreeNode) => void,
): boolean {
  for (const node of tree) {
    // 检查当前节点
    if (node.record?.traceId === traceId) {
      callback(node);
      return true;
    }

    // 递归搜索子节点
    if (node.children && node.children.length > 0) {
      if (dfsFind(node.children, traceId, callback)) {
        return true;
      }
    }
  }
  return false;
}

/**
 * 深度优先搜索过滤节点
 * @param tree 树节点数组
 * @param callback 过滤回调函数
 * @returns 过滤后的树
 */
function dfsFilter(
  tree: IRequestTree,
  callback: (node: IRequestTreeNode) => boolean,
): IRequestTree {
  return tree
    .filter(callback)
    .map((node) => {
      const children = dfsFilter(node.children, callback);
      return {
        ...node,
        children,
      };
    })
    .filter((node) => {
      // 保留有记录的节点或有子节点的节点
      if (node.record) {
        return true;
      }
      return node?.children?.length > 0;
    });
}

/**
 * 构建URL请求树
 * @param state 状态对象，包含requestTree数组
 * @param payload 请求值数组
 */
function buildRequestTree(
  state: { requestTree: IRequestTreeNode[] },
  payload: IViewMessageEventStoreValue[]
): void {
  if (!payload || !Array.isArray(payload)) {
    console.warn('Invalid payload provided to buildRequestTree');
    return;
  }

  payload.forEach((requestValue) => {
    try {
      const { request } = requestValue;
      const url = request?.url;

      if (!url) {
        console.warn('Request missing URL, skipping:', requestValue);
        return;
      }

      // 解析URL为路径段
      const segments = parseUrlToPathSegments(url);

      if (segments.length === 0) {
        console.warn('Failed to parse URL segments:', url);
        return;
      }

      // 遍历路径段，构建树结构
      let currentNode = state.requestTree;

      for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
        const isEndNode = i === segments.length - 1;
        const nodeId = generateNodeId(segments, i);

        if (isEndNode) {
          // 叶子节点，包含请求记录
          const leafNode: IRequestTreeNode = {
            id: `${nodeId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // 确保唯一性
            name: segment,
            record: requestValue,
            children: [],
          };
          currentNode.push(leafNode);
        } else {
          // 中间节点，继续构建树
          const node = findOrCreateNode(currentNode, segment, nodeId);
          currentNode = node.children;
        }
      }
    } catch (error) {
      console.error('Error processing request value:', error, requestValue);
    }
  });
}

/**
 * 插入或更新树节点
 * @param state 状态对象，包含requestTree数组
 * @param payload 请求值数组
 */
function insertOrUpdateTreeNode(
  state: { requestTree: IRequestTreeNode[] },
  payload: IViewMessageEventStoreValue[]
): void {
  if (!payload || !Array.isArray(payload)) {
    console.warn('Invalid payload provided to insertOrUpdateTreeNode');
    return;
  }

  payload.forEach((requestValue) => {
    try {
      const { traceId, request } = requestValue;

      if (!traceId) {
        console.warn('Request missing traceId, skipping:', requestValue);
        return;
      }

      let found = false;

      // 查找并更新现有节点
      found = dfsFind(state.requestTree, traceId, (node) => {
        node.record = requestValue;
        // 可能需要更新节点名称（如果URL发生变化）
        const url = request?.url;
        if (url) {
          const segments = parseUrlToPathSegments(url);
          if (segments.length > 0) {
            const lastSegment = segments[segments.length - 1];
            node.name = lastSegment || '/';
          }
        }
      });

      // 如果没有找到现有节点，则插入新节点
      if (!found) {
        const url = request?.url;

        if (!url) {
          console.warn('Request missing URL, skipping:', requestValue);
          return;
        }

        // 解析URL为路径段
        const segments = parseUrlToPathSegments(url);

        if (segments.length === 0) {
          console.warn('Failed to parse URL segments:', url);
          return;
        }

        // 遍历路径段，构建或找到树结构
        let currentNode = state.requestTree;

        for (let i = 0; i < segments.length; i++) {
          const segment = segments[i];
          const isEndNode = i === segments.length - 1;
          const nodeId = generateNodeId(segments, i);

          if (isEndNode) {
            // 叶子节点，包含请求记录
            const leafNode: IRequestTreeNode = {
              id: `${nodeId}_${traceId}`, // 使用traceId确保唯一性
              name: segment,
              record: requestValue,
              children: [],
            };
            currentNode.push(leafNode);
          } else {
            // 中间节点，继续构建树
            const node = findOrCreateNode(currentNode, segment, nodeId);
            currentNode = node.children;
          }
        }
      }
    } catch (error) {
      console.error('Error processing request value:', error, requestValue);
    }
  });
}

/**
 * 替换树节点记录
 * @param state 状态对象
 * @param payload 请求值数组
 */
function replaceTreeNodeRecords(
  state: { requestTree: IRequestTreeNode[] },
  payload: IViewMessageEventStoreValue[]
): void {
  if (!payload || !Array.isArray(payload)) {
    console.warn('Invalid payload provided to replaceTreeNodeRecords');
    return;
  }

  payload.forEach((requestValue) => {
    try {
      const { traceId } = requestValue;

      if (!traceId) {
        console.warn('Request missing traceId, skipping:', requestValue);
        return;
      }

      dfsFind(state.requestTree, traceId, (node) => {
        node.record = requestValue;
      });
    } catch (error) {
      console.error('Error processing request value:', error, requestValue);
    }
  });
}

/**
 * 清理空的中间节点
 * @param state 状态对象
 */
function cleanupEmptyNodes(state: { requestTree: IRequestTreeNode[] }): void {
  function cleanupNodes(nodes: IRequestTreeNode[]): void {
    for (let i = nodes.length - 1; i >= 0; i--) {
      const node = nodes[i];

      if (node.children && node.children.length > 0) {
        cleanupNodes(node.children);

        // 如果子节点为空且当前节点没有记录，则删除当前节点
        if (node.children.length === 0 && !node.record) {
          nodes.splice(i, 1);
        }
      }
    }
  }

  cleanupNodes(state.requestTree);
}

// ==================== Redux Slice ====================

const requestTreeSlice = createSlice({
  name: 'requestTree',
  initialState,
  reducers: {
    clearRequestTree: () => initialState,
    insertOrUpdateTreeNode: (
      state,
      action: PayloadAction<IViewMessageEventStoreValue[]>,
    ) => {
      insertOrUpdateTreeNode(state, action.payload);
    },
    replaceTreeNode: (
      state,
      action: PayloadAction<IViewMessageEventStoreValue[] | undefined>,
    ) => {
      if (action.payload) {
        replaceTreeNodeRecords(state, action.payload);
      }
    },

    appendTreeNode: (
      state,
      action: PayloadAction<IViewMessageEventStoreValue[] | undefined>,
    ) => {
      if (action.payload) {
        buildRequestTree(state, action.payload);
      }
    },

    cleanupEmptyNodes: (state) => {
      cleanupEmptyNodes(state);
    },

    batchUpdateNodes: (
      state,
      action: PayloadAction<IViewMessageEventStoreValue[]>
    ) => {
      insertOrUpdateTreeNode(state, action.payload);
    },
  },
});

// ==================== Selectors ====================

/**
 * 获取过滤后的树数据
 */
export const useTreeData = () => {
  const { state: filterTemplateState } = useFilterTemplate();

  return useSelector((state: RootState) => {
    return dfsFilter(state.requestTree.requestTree, (node) => {
      // 对于没有记录的中间节点，直接返回true
      if (!node.record) {
        return true;
      }

      // 首先应用原有的URI和MIME类型过滤
      // 检查URI过滤条件
      if (
        state.requestTable.filterUri &&
        !node.record?.request?.url?.includes(state.requestTable.filterUri)
      ) {
        return false;
      }

      // 应用过滤引擎
       const enabledTemplates = filterTemplateState.templates.filter(template => template.enabled);
       
       if (enabledTemplates.length) {
         // 将单个节点记录包装成数组进行过滤
         const filterResult = FilterEngine.filter(
           [node.record] as ExtendedMessageEventStoreValue[], 
           enabledTemplates
         );
         // 如果过滤结果为空，说明该节点不匹配任何启用的模板
         return !!filterResult.filtered.length;
       }

      return true;
    });
  });
};

/**
 * 根据traceId查找节点
 */
export const useNodeByTraceId = (traceId: string) => {
  return useSelector((state: RootState) => {
    let foundNode: IRequestTreeNode | undefined;

    if (traceId) {
      dfsFind(state.requestTree.requestTree, traceId, (node) => {
        foundNode = node;
      });
    }

    return foundNode;
  });
};

/**
 * 获取树的统计信息
 */
export const useTreeStats = () => {
  return useSelector((state: RootState) => {
    let totalNodes = 0;
    let leafNodes = 0;
    let maxDepth = 0;

    function calculateStats(nodes: IRequestTreeNode[], depth: number = 0): void {
      maxDepth = Math.max(maxDepth, depth);

      for (const node of nodes) {
        totalNodes++;

        if (node.record) {
          leafNodes++;
        }

        if (node.children && node.children.length > 0) {
          calculateStats(node.children, depth + 1);
        }
      }
    }

    calculateStats(state.requestTree.requestTree);

    return {
      totalNodes,
      leafNodes,
      maxDepth,
      intermediateNodes: totalNodes - leafNodes,
    };
  });
};

// ==================== Exports ====================

export const requestTreeSliceAction = requestTreeSlice.actions;

export const requestTreeReducer = requestTreeSlice.reducer;