import { CommonCard } from '@/routes/settings/components/CommonCard';
import { ColumnHeightOutlined, ColumnWidthOutlined, MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons';
import { useQueryClient } from '@tanstack/react-query';
import { Button, message } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useExecuteApiRequest } from '../../../services/generated/api-debug-executor/api-debug-executor';
import { getListDebugEntriesQueryKey, useUpdateDebugEntry } from '../../../services/generated/api-debug/api-debug';
import {
  ApiDebugResponse,
  HttpMethod,
  UpdateApiDebugRequest,
} from '../../../services/generated/utoipaAxum.schemas';
import { CreateResponseOverrideButton } from './CreateResponseOverrideButton';
import { CurlImportModal } from './CurlImportModal';
import { MainContent } from './MainContent';
import { RequestBuilder } from './RequestBuilder';
import SaveToCollectionModal from './SaveToCollectionModal';
import { Sidebar } from './Sidebar';
import { useApiDebug } from './store';
import { FormattedResponse } from './types';
import { NodeSelectionProvider } from './CollectionTree/context/NodeSelectionContext';

export function ApiDebugPage() {
  const [historyVisible, setHistoryVisible] = useState<boolean>(true);
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const {
    id,
    method,
    url,
    headers,
    queryParams,
    body,
    curlModalVisible,
    layoutDirection,
    setMethod,
    setResponse,
    setCurlModalVisible,
    setLayoutDirection,
    importCurl,
    updateUrlAndParams,
    loadFromApiDebugResponse,
  } = useApiDebug();

  const [saveToCollectionModalVisible, setSaveToCollectionModalVisible] = useState(false);


  // 自定义的URL设置函数，同时解析查询参数
  const handleUrlChange = (newUrl: string) => {
    updateUrlAndParams(newUrl);
  };

  const executeRequestMutation = useExecuteApiRequest<Error>({
    mutation: {
      onSuccess: (data) => {
        const responseData = data.data;
        if (responseData) {
          const formattedResponse: FormattedResponse = {
            status: responseData.responseStatus || 0,
            statusText: getStatusText(responseData.responseStatus || 0),
            headers:
              (responseData.responseHeaders as Record<string, string>) || {},
            body: responseData.responseBody || '',
            responseTime: responseData.responseTime || 0,
            size: responseData.responseBody
              ? new Blob([responseData.responseBody]).size
              : 0,
          };
          setResponse(formattedResponse);
        }
        // 自动刷新历史记录
        queryClient.invalidateQueries({
          queryKey: getListDebugEntriesQueryKey(),
        });
        message.success(t('apiDebug.requestCompleted'));
      },
      onError: (error) => {
        console.error('Request failed:', error);
        message.error(t('apiDebug.requestFailed'));
        setResponse(null);
      },
    },
  });

  const updateDebugEntryMutation = useUpdateDebugEntry<Error>({
    mutation: {
      onSuccess: () => {
        message.success('API Debug 更新成功');
        // 刷新历史记录
        queryClient.invalidateQueries({
          queryKey: getListDebugEntriesQueryKey(),
        });
      },
      onError: (error) => {
        console.error('Update failed:', error);
        message.error('API Debug 更新失败');
      },
    },
  });

  const getStatusText = (status: number): string => {
    const statusTexts: Record<number, string> = {
      200: 'OK',
      201: 'Created',
      204: 'No Content',
      400: 'Bad Request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not Found',
      500: 'Internal Server Error',
    };
    return statusTexts[status] || 'Unknown';
  };

  const handleSendRequest = () => {
    if (!url) {
      message.warning(t('apiDebug.enterUrl'));
      return;
    }

    // Build URL with query parameters
    let finalUrl = url;
    const enabledQueryParams = queryParams.filter(
      (param) => param.enabled && param.key,
    );
    if (enabledQueryParams.length > 0) {
      const urlObject = new URL(url.startsWith('http') ? url : `http://${url}`);
      enabledQueryParams.forEach((param) => {
        urlObject.searchParams.set(param.key, param.value);
      });
      finalUrl = urlObject.toString();
    }

    // Convert headers array to object
    const headersObject: Record<string, string> = {};
    headers
      .filter((header) => header.enabled && header.key && header.value)
      .forEach((header) => {
        headersObject[header.key] = header.value;
      });

    // Add default content type to headers if body exists and no content-type is set
    if (
      body &&
      !headersObject['Content-Type'] &&
      !headersObject['content-type']
    ) {
      headersObject['Content-Type'] = 'application/json';
    }

    const requestData = {
      method: method as HttpMethod,
      url: finalUrl,
      headers: Object.keys(headersObject).length > 0 ? headersObject : null,
      body: body || null,
      timeout: 30,
      name: `${method} ${finalUrl}`, // Required field
    };

    executeRequestMutation.mutate({ data: requestData });
  };

  const handleImportCurl = (data: {
    method: string;
    url: string;
    headers: Record<string, string>;
    body: string;
  }) => {
    importCurl(data);
  };

  const handleLoadFromHistory = (request: ApiDebugResponse) => {
    loadFromApiDebugResponse(request);
  };

  const handleSaveToCollection = () => {
    if (!url) {
      message.warning(t('apiDebug.enterUrl'));
      return;
    }
    setSaveToCollectionModalVisible(true);
  };

  const handleUpdateApiDebug = () => {
    if (!id) {
      message.warning('没有可更新的 API Debug ID');
      return;
    }

    if (!url) {
      message.warning(t('apiDebug.enterUrl'));
      return;
    }

    // Build URL with query parameters
    let finalUrl = url;
    const enabledQueryParams = queryParams.filter(
      (param) => param.enabled && param.key,
    );
    if (enabledQueryParams.length > 0) {
      const urlObject = new URL(url.startsWith('http') ? url : `http://${url}`);
      enabledQueryParams.forEach((param) => {
        urlObject.searchParams.set(param.key, param.value);
      });
      finalUrl = urlObject.toString();
    }

    // Convert headers array to object
    const headersObject: Record<string, string> = {};
    headers
      .filter((header) => header.enabled && header.key && header.value)
      .forEach((header) => {
        headersObject[header.key] = header.value;
      });

    const updateData: UpdateApiDebugRequest = {
      method: method as HttpMethod,
      url: finalUrl,
      headers: Object.keys(headersObject).length > 0 ? headersObject : undefined,
      body: body || undefined,
      name: `${method} ${finalUrl}`,
    };

    updateDebugEntryMutation.mutate({ id, data: updateData });
  };


  return (
    <NodeSelectionProvider>
      <div className="flex flex-1">
        {/* Sidebar */}
        {historyVisible && (
          <div className="w-80 flex flex-col">
            <Sidebar
              onLoadRequest={handleLoadFromHistory}
              className="flex flex-1 max-h-[98vh] flex-col"
            />
          </div>
        )}

        {/* Main Content */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <CommonCard
            extra={
              <div className="flex gap-2">
                <Button
                  onClick={() => setCurlModalVisible(true)}
                >
                  {t('apiDebug.importCurl')}
                </Button>
                <CreateResponseOverrideButton />
                  <Button
                    onClick={handleSaveToCollection}
                    disabled={!url}
                    title="Save to Collection"
                  >
                    保存
                  </Button>

                {!!id && handleUpdateApiDebug && (
                  <Button
                    onClick={handleUpdateApiDebug}
                    disabled={!url || updateDebugEntryMutation.isPending}
                    title="Update API Debug"
                  >
                    更新
                  </Button>
                )}
              </div>
            }
            className="flex flex-1 flex-col pb-0"
          >
            <div className='flex flex-col flex-1'>

              {/* Request Builder */}
              <div className="mt-2 shadow-sm">
                <RequestBuilder
                  method={method}
                  url={url}
                  onMethodChange={setMethod}
                  onUrlChange={handleUrlChange}
                  onSend={handleSendRequest}
                  isLoading={executeRequestMutation.isPending}
                />
              </div>

              {/* Main Content */}
              <MainContent />
              {/* Layout Direction Toggle */}
              <div className='flex justify-between'>
                <div className="flex justify-start">
                  <div className="flex items-center gap-2">
                    <Button
                      type="text"
                      icon={
                        historyVisible ? <MenuFoldOutlined /> : <MenuUnfoldOutlined />
                      }
                      onClick={() => setHistoryVisible(!historyVisible)}
                      className="text-gray-500 hover:text-blue-500"
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button
                    size='small'
                    type="text"
                    icon={layoutDirection === 'horizontal' ? <ColumnHeightOutlined /> : <ColumnWidthOutlined />}
                    onClick={() => setLayoutDirection(layoutDirection === 'horizontal' ? 'vertical' : 'horizontal')}
                    className="text-gray-500 hover:text-blue-500"
                    title={layoutDirection === 'horizontal' ? '切换到垂直布局' : '切换到水平布局'}
                  />
                </div>
              </div>

            </div>

          </CommonCard>
        </div>
        {/* cURL Import Modal */}
        <CurlImportModal
          visible={curlModalVisible}
          onClose={() => setCurlModalVisible(false)}
          onImport={handleImportCurl}
        />

        {/* Save to Collection Modal */}
        <SaveToCollectionModal
          visible={saveToCollectionModalVisible}
          onClose={() => setSaveToCollectionModalVisible(false)}
          requestData={{
            method,
            url,
            headers,
            queryParams,
            body,
          }}
        />
      </div>
    </NodeSelectionProvider>
  );
}
