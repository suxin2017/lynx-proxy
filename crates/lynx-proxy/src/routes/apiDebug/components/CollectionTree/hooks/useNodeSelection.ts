import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import type { TreeNodeResponse } from '@/services/generated/utoipaAxum.schemas';
import { useApiDebug } from '../../store';

/**
 * 自定义hook用于管理树节点选择状态
 * 避免prop drilling，提供统一的节点选择逻辑
 */
export function useNodeSelection() {
  const [selectedNodeId, setSelectedNodeId] = useState<string | undefined>();
  const queryClient = useQueryClient();
  const { loadFromApiDebugResponse } = useApiDebug();

  const handleNodeSelect = useCallback(async (node: TreeNodeResponse) => {
    setSelectedNodeId(node.id?.toString());

    // 如果是request节点且有关联的api_debug_id，则加载请求数据
    if (node.nodeType === 'request' && node.apiDebugId) {
      try {
        const response = await queryClient.fetchQuery({
          queryKey: [`/api_debug/debug/${node.apiDebugId}`],
          queryFn: async () => {
            const { getDebugEntry } = await import('../../../../../services/generated/api-debug/api-debug');
            return getDebugEntry(node.apiDebugId!);
          },
        });

        if (response.data) {
          loadFromApiDebugResponse(response.data);
        }
      } catch (error) {
        console.error('Failed to load request from collection:', error);
        message.error('加载请求失败');
      }
    }
  }, [queryClient, loadFromApiDebugResponse]);

  return {
    selectedNodeId,
    handleNodeSelect,
    setSelectedNodeId,
  };
}