import { Segmented, Splitter } from 'antd';
import { QueryParamsEditor } from './QueryParamsEditor';
import { HeadersEditor } from './HeadersEditor';
import { BodyEditor } from './BodyEditor';
import { ResponseViewer } from './ResponseViewer';
import { useApiDebug } from './store';
import { useExecuteApiRequest } from '../../../services/generated/api-debug-executor/api-debug-executor';
import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';

const TAB_KEYS = {
  PARAMS: 'params',
  HEADERS: 'headers',
  BODY: 'body',
} as const;

export function MainContent() {
  const { t } = useTranslation();
  const {
    activeTab,
    queryParams,
    headers,
    body,
    response,
    layoutDirection,
    setActiveTab,
    setHeaders,
    setBody,
    updateParamsAndUrl,
  } = useApiDebug();

  // 控制组件挂载状态
  const [isMounted, setIsMounted] = useState(true);

  // 当 layoutDirection 变化时，卸载再挂载组件
  useEffect(() => {
    setIsMounted(false);
    const timer = setTimeout(() => {
      setIsMounted(true);
    }, 0);
    return () => clearTimeout(timer);
  }, [layoutDirection]);

  const executeRequestMutation = useExecuteApiRequest();


  // 自定义的查询参数设置函数，同时更新URL
  const handleQueryParamsChange = (newParams: any[]) => {
    updateParamsAndUrl(newParams);
  };

  const tabItems = [
    {
      key: TAB_KEYS.PARAMS,
      label: `${t('apiDebug.params')} (${queryParams.filter((p) => p.enabled).length})`,
      children: (
        <QueryParamsEditor
          queryParams={queryParams}
          onChange={handleQueryParamsChange}
        />
      ),
    },
    {
      key: TAB_KEYS.HEADERS,
      label: `${t('apiDebug.headers')} (${headers.filter((h) => h.enabled).length})`,
      children: <HeadersEditor headers={headers} onChange={setHeaders} />,
    },
    {
      key: TAB_KEYS.BODY,
      label: t('apiDebug.body'),
      children: (
        <BodyEditor body={body} onBodyChange={setBody} headers={headers} />
      ),
    },
  ];

  const renderTabContent = () => {
    const currentTab = tabItems.find((item) => item.key === activeTab);
    return currentTab?.children;
  };


  return (
    <div className=" flex flex-1 overflow-hidden">
      {isMounted && <Splitter layout={layoutDirection}>
        <Splitter.Panel defaultSize="50%" min="30%" max="70%">
          {/* Left Panel - Request Configuration */}
          <div className="h-full overflow-auto">
            <div className="py-4">
              <Segmented
                value={activeTab}
                onChange={setActiveTab}
                options={tabItems.map((item) => ({
                  label: item.label,
                  value: item.key,
                }))}
              />
              <div className="">{renderTabContent()}</div>
            </div>
          </div>
        </Splitter.Panel>

        <Splitter.Panel defaultSize="50%">
          {/* Right Panel - Response */}
          <div className="h-full overflow-auto">
            <ResponseViewer
              response={response}
              isLoading={executeRequestMutation.isPending}
              error={executeRequestMutation.error as any}
            />
          </div>
        </Splitter.Panel>
      </Splitter>}
    </div>
  );
}