import { Button, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useCreateRule } from '@/services/generated/request-processing/request-processing';
import { useQueryClient } from '@tanstack/react-query';
import { getListRulesQueryKey } from '@/services/generated/request-processing/request-processing';
import { useApiDebug } from './store';
import { CreateRuleRequest } from '@/services/generated/utoipaAxum.schemas';

interface CreateResponseOverrideButtonProps {
  className?: string;
}

export function CreateResponseOverrideButton({ className }: CreateResponseOverrideButtonProps) {
  const queryClient = useQueryClient();
  const { url, method, response } = useApiDebug();

  const createRuleMutation = useCreateRule({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListRulesQueryKey() });
        message.success('响应覆盖规则创建成功');
      },
      onError: (error) => {
        console.error('Failed to create response override rule:', error);
        message.error('响应覆盖规则创建失败');
      },
    },
  });

  const handleCreateResponseOverride = () => {
    if (!url) {
      message.warning('请输入URL');
      return;
    }

    if (!response) {
      message.warning('没有响应数据可覆盖');
      return;
    }

    try {
      // 从URL中提取完整URL模式（不包括查询参数）
      const urlObj = new URL(url.startsWith('http') ? url : `http://${url}`);
      const pathPattern = `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`;
      
      // 创建规则请求数据
      const ruleRequest: CreateRuleRequest = {
        name: `响应覆盖 - ${method} ${urlObj.hostname}${urlObj.pathname}`,
        description: `自动创建的响应覆盖规则，用于 ${method} ${url}`,
        enabled: true,
        priority: 10,
        capture: {
          condition: {
            type: 'simple',
            urlPattern: {
              captureType: 'exact',
              pattern: pathPattern,
            }
          },
        },
        handlers: [
          {
            name: '覆盖响应内容',
            description: '覆盖原始响应的状态码、响应头和响应体',
            enabled: true,
            executionOrder: 80,
            handlerType: {
              type: 'modifyResponse',
              modifyBody: response.body,
            },
          },
        ],
      };

      createRuleMutation.mutate({ data: ruleRequest });
    } catch (error) {
      console.error('Error creating response override rule:', error);
      message.error('无效的URL');
    }
  };

  return (
    <Button
      onClick={handleCreateResponseOverride}
      loading={createRuleMutation.isPending}
      icon={<PlusOutlined />}
      className={className}
      disabled={!url || !response}
    >
      创建响应覆盖
    </Button>
  );
}