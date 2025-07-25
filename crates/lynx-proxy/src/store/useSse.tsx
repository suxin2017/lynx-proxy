import { useGetCaptureStatus } from '@/services/generated/net-request/net-request';
import { cloneDeep } from 'lodash';
import { useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { ExtendedMessageEventStoreValue, MessageEventCache } from './messageEventCache';
import { insertOrUpdateRequests, removeOldRequest, useRequestLogCount } from './requestTableStore';
import { requestTreeSliceAction } from './requestTreeStore';
import { SseConnectionStatus, SseEventData, sseManager } from './sseStore';
import { ConnectType, useGeneralSetting } from './useGeneralState';
import { filterConnectRequest, formatItem } from './useSortPoll';
import { useSelectRequest } from '@/routes/network/components/store/selectRequestStore';

const { insertOrUpdateTreeNode } = requestTreeSliceAction;

export const useSse = () => {
    const { data: netWorkCaptureStatusData } = useGetCaptureStatus();
    const dispatch = useDispatch();
    const requestLogCount = useRequestLogCount();
    const { maxLogSize = 1000, connectType } = useGeneralSetting();
    const { selectRequest, setSelectRequest } = useSelectRequest();


    useEffect(() => {
        if (requestLogCount >= maxLogSize) {
            dispatch(
                removeOldRequest({
                    maxLogSize,
                }),
            );
        }
    }, [dispatch, requestLogCount, maxLogSize]);

    const eventCache = useRef(new MessageEventCache(1000));


    const handleSseEvent = (event: SseEventData) => {

        eventCache.current.handleSseEvent(event);
    };

    const handleStatusChange = (status: SseConnectionStatus) => {
        console.log('📡 SSE 连接状态变化:', status);
    };

    const getEventByTraceId = (traceId: string) => {
        return eventCache.current.get(traceId);
    };

    const connect = () => {
        console.log('🚀 开始连接 SSE...');
        sseManager.connect();
    };

    const disconnect = () => {
        console.log('🔌 断开 SSE 连接...');
        sseManager.disconnect();
    };

    useEffect(() => {
        if (netWorkCaptureStatusData?.data.recordingStatus === "pauseRecording" && connectType === ConnectType.SSE) {

            sseManager.setOnEventCallback(handleSseEvent);
            sseManager.setOnStatusChangeCallback(handleStatusChange);

            const insertOrUpdateCallback = (events: ExtendedMessageEventStoreValue[]) => {
                const formattedEvents = events.filter(item => item.status !== "Initial").filter(filterConnectRequest).map(formatItem).map(item => cloneDeep(item));
                console.log('🔄 直接通过缓存回调更新 Redux store:', formattedEvents);
                const currentSelectUpdateRequest = selectRequest?.traceId ? formattedEvents.find(item => item.traceId === selectRequest?.traceId) : null;

                if (currentSelectUpdateRequest) {
                    setSelectRequest(currentSelectUpdateRequest);
                }
                if (events)
                    dispatch(insertOrUpdateRequests(formattedEvents));
                dispatch(insertOrUpdateTreeNode(formattedEvents))
            };
            eventCache.current.setInsertOrUpdateCallback(insertOrUpdateCallback);
            if (!sseManager.isConnected()) {
                connect();
            }

        }

        const cache = eventCache.current;

        return () => {
            console.log('🔌 组件卸载，断开 SSE 连接...');
            disconnect();
            cache?.removeInsertOrUpdateCallback();
        };
    }, [connectType, dispatch, netWorkCaptureStatusData]);


    useEffect(() => {
        const cache = eventCache.current;
        if (connectType === ConnectType.ShortPoll) {
            disconnect();
            cache?.removeInsertOrUpdateCallback();
        }
    }, [connectType])

    return {
        connect,
        disconnect,
        eventCache: eventCache.current,
        getEventByTraceId,
    };
};

// 专门用于监听和打印 SSE 事件的 Hook
export const useSseMonitor = () => {
    const sse = useSse();

    return sse;
};

// 导出工具函数
export type { SseConnectionStatus, SseEventData } from './sseStore';

