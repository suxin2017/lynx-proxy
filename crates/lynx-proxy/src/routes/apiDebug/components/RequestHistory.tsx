import {
  ClearOutlined,
  DeleteOutlined,
  HistoryOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import {
  Button,
  Card,
  Empty,
  List,
  Modal,
  Spin,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useClearAllDebugEntries,
  useDeleteDebugEntry,
  useListDebugEntries,
} from '../../../services/generated/api-debug/api-debug';
import {
  ApiDebugResponse,
  HttpMethod,
  RequestStatus,
} from '../../../services/generated/utoipaAxum.schemas';

const { Text } = Typography;

interface RequestHistoryProps {
  onSelectRequest?: (request: ApiDebugResponse) => void;
  onLoadRequest: (request: ApiDebugResponse) => void;
  className?: string;
}

const getMethodColor = (method: HttpMethod): string => {
  const colors: Record<HttpMethod, string> = {
    [HttpMethod.GET]: 'blue',
    [HttpMethod.POST]: 'green',
    [HttpMethod.PUT]: 'orange',
    [HttpMethod.DELETE]: 'red',
    [HttpMethod.PATCH]: 'purple',
    [HttpMethod.HEAD]: 'cyan',
    [HttpMethod.OPTIONS]: 'gray',
  };
  return colors[method] || 'default';
};

const getStatusColor = (status: RequestStatus): string => {
  const colors: Record<RequestStatus, string> = {
    [RequestStatus.success]: 'success',
    [RequestStatus.failed]: 'error',
    [RequestStatus.pending]: 'processing',
    [RequestStatus.timeout]: 'warning',
  };
  return colors[status] || 'default';
};

export function RequestHistory({
  onSelectRequest,
  onLoadRequest,
  className,
}: RequestHistoryProps) {
  const [page, setPage] = useState(1);
  const [allRequests, setAllRequests] = useState<ApiDebugResponse[]>([]);
  const pageSize = 20;
  const { t } = useTranslation();

  const getStatusText = (status: RequestStatus): string => {
    const texts: Record<RequestStatus, string> = {
      [RequestStatus.success]: t('apiDebug.success'),
      [RequestStatus.failed]: t('apiDebug.failed'),
      [RequestStatus.pending]: t('apiDebug.pending'),
      [RequestStatus.timeout]: t('apiDebug.timeout'),
    };
    return texts[status] || status;
  };

  const {
    data: historyData,
    isLoading,
    refetch,
    error,
  } = useListDebugEntries(
    { page, perPage: pageSize },
    {
      query: {
        enabled: true,
        refetchOnWindowFocus: false,
      },
    },
  );

  const deleteRequestMutation = useDeleteDebugEntry({
    mutation: {
      onSuccess: () => {
        setPage(1);
        setAllRequests([]);
        refetch();
      },
    },
  });

  const clearAllMutation = useClearAllDebugEntries({
    mutation: {
      onSuccess: () => {
        message.success(t('apiDebug.clearSuccess'));
        setPage(1);
        setAllRequests([]);
        refetch();
      },
      onError: (error) => {
        console.error('Failed to clear all history:', error);
        message.error(t('apiDebug.clearFailed'));
      },
    },
  });

  const handleDeleteRequest = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    deleteRequestMutation.mutate({ id });
  };

  const handleRefresh = () => {
    setPage(1);
    setAllRequests([]);
    refetch();
  };

  const handleClearAll = () => {
    Modal.confirm({
      title: t('apiDebug.clearAllHistoryConfirm'),
      content: t('apiDebug.clearAllHistoryWarning'),
      okText: t('apiDebug.confirmClear'),
      cancelText: t('apiDebug.cancel'),
      okType: 'danger',
      onOk: () => {
        clearAllMutation.mutate();
      },
    });
  };

  // 当新数据加载时，更新累积的请求列表
  useEffect(() => {
    if (historyData?.data?.data) {
      const newRequests = historyData.data.data;
      if (page === 1) {
        // 第一页或刷新时，替换所有数据
        setAllRequests(newRequests);
      } else {
        // 后续页面，追加到现有数据
        setAllRequests(prev => {
          const existingIds = new Set(prev.map(req => req.id));
          const uniqueNewRequests = newRequests.filter(req => !existingIds.has(req.id));
          return [...prev, ...uniqueNewRequests];
        });
      }
    }
  }, [historyData, page]);

  const requests = allRequests;

  const totalCount = historyData?.data?.total || 0;

  const formatTimestamp = (timestamp: number): string => {
    try {
      const date = new Date(timestamp * 1000);
      const now = new Date();
      const diffInMs = now.getTime() - date.getTime();
      const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
      const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
      const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

      if (diffInMinutes < 1) {
        return t('apiDebug.justNow');
      } else if (diffInMinutes < 60) {
        return t('apiDebug.minutesAgo', { count: diffInMinutes });
      } else if (diffInHours < 24) {
        return t('apiDebug.hoursAgo', { count: diffInHours });
      } else if (diffInDays < 7) {
        return t('apiDebug.daysAgo', { count: diffInDays });
      } else {
        return date.toLocaleDateString();
      }
    } catch {
      return t('apiDebug.unknownTime');
    }
  };

  const renderRequestItem = (request: ApiDebugResponse) => {
    const {
      id,
      method,
      name,
      url,
      status,
      responseStatus,
      responseTime,
      createdAt,
    } = request;

    return (
      <List.Item
        key={id}
        className="cursor-pointer border-b border-gray-100 p-1 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
        onClick={() => {
          onSelectRequest?.(request);
          onLoadRequest(request);
        }}
        actions={[
          <Tooltip key="delete" title={t('apiDebug.deleteHistory')}>
            <Button
              type="text"
              size="small"
              icon={<DeleteOutlined />}
              onClick={(e) => handleDeleteRequest(e, id)}
              loading={deleteRequestMutation.isPending}
              className="text-gray-400 hover:text-red-500"
            />
          </Tooltip>,
        ]}
        styles={{
          actions: {
            margin: 0,
          },
        }}
      >
        <List.Item.Meta
          title={
            <div className="flex items-center justify-between">
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <Tag
                  color={getMethodColor(method)}
                  className="font-mono text-xs"
                >
                  {method}
                </Tag>
                <Text className="truncate text-sm font-medium" title={name}>
                  {name}
                </Text>
              </div>
              <Tag
                color={getStatusColor(status)}
                className="flex-shrink-0 text-xs"
              >
                {getStatusText(status)}
              </Tag>
            </div>
          }
          description={
            <div className="space-y-1">
              <Tooltip title={url}>
                <Text className="block truncate text-xs text-gray-500">
                  {url}
                </Text>
              </Tooltip>
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>{formatTimestamp(createdAt)}</span>
                <div className="flex items-center gap-2">
                  {responseStatus && (
                    <span
                      className={`${responseStatus >= 400 ? 'text-red-500' : 'text-green-500'}`}
                    >
                      {responseStatus}
                    </span>
                  )}
                  {responseTime && <span>{responseTime}ms</span>}
                </div>
              </div>
            </div>
          }
        />
      </List.Item>
    );
  };

  return (
    <Card
      size="small"
      variant="borderless"
      className={className}
      title={
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HistoryOutlined />
            <span>{t('apiDebug.requestHistory')}</span>
            <Text type="secondary" className="text-xs">
              ({totalCount})
            </Text>
          </div>
          <div className="flex items-center gap-1">
            <Tooltip title={t('apiDebug.clearAllHistory')}>
              <Button
                type="text"
                size="small"
                icon={<ClearOutlined />}
                onClick={handleClearAll}
                loading={clearAllMutation.isPending}
                disabled={totalCount === 0 || isLoading}
                className="text-gray-400 hover:text-red-500"
              />
            </Tooltip>
            <Tooltip title={t('apiDebug.refresh')}>
              <Button
                type="text"
                size="small"
                icon={<ReloadOutlined />}
                onClick={handleRefresh}
                loading={isLoading}
                className="text-gray-400 hover:text-blue-500"
              />
            </Tooltip>
          </div>
        </div>
      }
      styles={{
        body: {
          display: 'flex',
          flex:1,
          flexDirection: 'column',
          padding: 0,
          overflow:'auto'
        },
      }}
    >
      {error ? (
        <div className="p-4 text-center">
          <Text type="danger">{t('apiDebug.loadHistoryFailed')}</Text>
          <br />
          <Button size="small" onClick={handleRefresh} className="mt-2">
            {t('apiDebug.retry')}
          </Button>
        </div>
      ) : requests.length === 0 && !isLoading ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={t('apiDebug.noHistory')}
          className="py-8"
        />
      ) : (
        <div className="overflow-y-auto">
          <Spin spinning={isLoading}>
            <List
              className="flex-1"
              dataSource={requests}
              renderItem={renderRequestItem}
              size="small"
              split={false}
            />
          </Spin>
          {requests.length > 0 && requests.length < totalCount && (
            <div className="border-t border-gray-100 p-2 text-center dark:border-gray-700">
              <Button
                size="small"
                type="link"
                onClick={() => setPage((prev) => prev + 1)}
                disabled={isLoading}
              >
                {t('apiDebug.loadMore')}
              </Button>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
