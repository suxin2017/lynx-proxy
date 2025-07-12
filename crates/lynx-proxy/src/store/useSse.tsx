import { useEffect, useRef, useState } from 'react';
import { SseEventData, SseConnectionStatus, sseManager } from './sseStore';
import { ExtendedMessageEventStoreValue, MessageEventCache } from './messageEventCache';

// SSE Hook 返回类型
interface UseSseReturn {
    connectionStatus: SseConnectionStatus;
    isConnected: boolean;
    connect: () => void;
    disconnect: () => void;
    lastEvent: SseEventData | null;
    eventCount: number;
    // 新增：事件缓存相关
    eventCache: MessageEventCache;
    messageEvents: ExtendedMessageEventStoreValue[];
    getEventByTraceId: (traceId: string) => ExtendedMessageEventStoreValue | undefined;
}

// 使用 SSE 的 Hook
export const useSse = (autoConnect: boolean = true): UseSseReturn => {
    const [connectionStatus, setConnectionStatus] = useState<SseConnectionStatus>(
        SseConnectionStatus.DISCONNECTED
    );
    const [lastEvent, setLastEvent] = useState<SseEventData | null>(null);
    const [eventCount, setEventCount] = useState(0);
    const [messageEvents, setMessageEvents] = useState<ExtendedMessageEventStoreValue[]>([]);
    const isInitialized = useRef(false);
    const eventCache = useRef(new MessageEventCache(1000));


    // 事件处理函数
    const handleSseEvent = (event: SseEventData) => {
        console.log('📥 收到 SSE 事件:', event);
        setLastEvent(event);
        setEventCount(prev => prev + 1);

        // 将事件传递给缓存处理
        eventCache.current.handleSseEvent(event);
    };

    // 状态变化处理函数
    const handleStatusChange = (status: SseConnectionStatus) => {
        console.log('📡 SSE 连接状态变化:', status);
        setConnectionStatus(status);
    };

    // 获取指定 traceId 的事件
    const getEventByTraceId = (traceId: string) => {
        return eventCache.current.get(traceId);
    };

    // 连接函数
    const connect = () => {
        console.log('🚀 开始连接 SSE...');
        sseManager.connect();
    };

    // 断开连接函数
    const disconnect = () => {
        console.log('🔌 断开 SSE 连接...');
        sseManager.disconnect();
    };

    // 初始化 SSE 连接
    useEffect(() => {
        if (!isInitialized.current) {
            isInitialized.current = true;

            // 设置事件和状态回调
            sseManager.setOnEventCallback(handleSseEvent);
            sseManager.setOnStatusChangeCallback(handleStatusChange);

            // 设置事件缓存监听器
            const cacheListener = (events: ExtendedMessageEventStoreValue[]) => {
                setMessageEvents([...events]);
            };
            eventCache.current.addListener(cacheListener);

            // 清理函数
            return () => {
                eventCache.current.removeListener(cacheListener);
            };
        }
        // 自动连接
        if (autoConnect) {
            connect();
        }

        return () => {
            if (isInitialized.current) {
                console.log('🔌 组件卸载，断开 SSE 连接...');
                disconnect();
            }
        };
    }, []);
    console.log(messageEvents, "messageEvents")
    return {
        connectionStatus,
        isConnected: connectionStatus === SseConnectionStatus.CONNECTED,
        connect,
        disconnect,
        lastEvent,
        eventCount,
        eventCache: eventCache.current,
        messageEvents,
        getEventByTraceId,
    };
};

// 专门用于监听和打印 SSE 事件的 Hook
export const useSseMonitor = () => {
    const [events, setEvents] = useState<SseEventData[]>([]);
    const [maxEvents, setMaxEvents] = useState(100);

    const sse = useSse(true);

    // 监听新事件
    useEffect(() => {
        if (sse.lastEvent) {
            setEvents(prev => {
                const newEvents = [...prev, sse.lastEvent!];

                // 限制事件数量
                if (newEvents.length > maxEvents) {
                    return newEvents.slice(-maxEvents);
                }

                return newEvents;
            });
        }
    }, [sse.lastEvent, maxEvents]);

    // 按事件类型分组统计
    const eventStats = events.reduce((acc, event) => {
        const type = event.eventType;
        acc[type] = (acc[type] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    // 按 traceId 分组统计
    const traceIdStats = events.reduce((acc, event) => {
        const traceId = event.traceId;
        acc[traceId] = (acc[traceId] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    // 打印事件统计信息
    const printEventStats = () => {
        console.log('📊 SSE 事件统计:', {
            总事件数: events.length,
            连接状态: sse.connectionStatus,
            事件类型统计: eventStats,
            活跃请求数: Object.keys(traceIdStats).length,
            缓存中的请求数: sse.eventCache.size(),
        });
    };

    // 打印缓存中的消息事件
    const printMessageEvents = () => {
        console.log('📨 消息事件缓存:', {
            总数: sse.messageEvents.length,
            事件详情: sse.messageEvents.map(event => ({
                traceId: event.traceId,
                status: event.status,
                url: event.request?.url,
                method: event.request?.method,
                responseStatus: event.response?.status,
                createdAt: new Date(event.createdAt).toLocaleString(),
            })),
        });
    };

    // 清空事件记录
    const clearEvents = () => {
        setEvents([]);
        sse.eventCache.clear();
        console.log('🗑️ 已清空 SSE 事件记录');
    };

    // 按 trace_id 过滤事件
    const getEventsByTraceId = (traceId: string) => {
        return events.filter(event => event.traceId === traceId);
    };

    // 按事件类型过滤事件
    const getEventsByType = (eventType: string) => {
        return events.filter(event => event.eventType === eventType);
    };

    // 获取完整的消息事件（通过 traceId）
    const getMessageEventByTraceId = (traceId: string) => {
        return sse.getEventByTraceId(traceId);
    };

    // 获取所有活跃的请求
    const getActiveRequests = () => {
        return sse.messageEvents.filter(event =>
            event.status === 'RequestStarted' || event.status === 'Initial'
        );
    };

    // 获取已完成的请求
    const getCompletedRequests = () => {
        return sse.messageEvents.filter(event => event.status === 'Completed');
    };

    // 获取错误的请求
    const getErrorRequests = () => {
        return sse.messageEvents.filter(event => typeof event.status === 'object' && event.status.Error);
    };

    return {
        ...sse,
        events,
        eventStats,
        traceIdStats,
        maxEvents,
        setMaxEvents,
        printEventStats,
        printMessageEvents,
        clearEvents,
        getEventsByTraceId,
        getEventsByType,
        getMessageEventByTraceId,
        getActiveRequests,
        getCompletedRequests,
        getErrorRequests,
    };
};

// 导出工具函数
export type { SseEventData, SseConnectionStatus } from './sseStore';
