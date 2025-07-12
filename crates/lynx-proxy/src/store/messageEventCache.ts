import { SseEventData } from './sseStore';
import { 
    MessageEventStoreValue,
    MessageEventStatus,
    WebSocketStatus,
    WebSocketLog,
    WebSocketDirection,
    TunnelStatus
} from '../services/generated/utoipaAxum.schemas';

// 前端使用的扩展类型，包含时间戳字段
export interface ExtendedMessageEventStoreValue extends MessageEventStoreValue {
    createdAt: number;
    updatedAt: number;
}

// 事件缓存类
export class MessageEventCache {
    private cache = new Map<string, ExtendedMessageEventStoreValue>();
    private maxSize: number;
    private listeners: Set<(events: ExtendedMessageEventStoreValue[]) => void> = new Set();

    constructor(maxSize: number = 1000) {
        this.maxSize = maxSize;
    }

    // 添加事件监听器
    addListener(listener: (events: ExtendedMessageEventStoreValue[]) => void) {
        this.listeners.add(listener);
    }

    // 移除事件监听器
    removeListener(listener: (events: ExtendedMessageEventStoreValue[]) => void) {
        this.listeners.delete(listener);
    }

    // 通知所有监听器
    private notifyListeners() {
        const events = Array.from(this.cache.values());
        this.listeners.forEach(listener => listener(events));
    }

    // 获取事件
    get(traceId: string): ExtendedMessageEventStoreValue | undefined {
        return this.cache.get(traceId);
    }

    // 获取所有事件
    getAll(): ExtendedMessageEventStoreValue[] {
        return Array.from(this.cache.values());
    }

    // 插入或更新事件
    upsert(traceId: string, value: ExtendedMessageEventStoreValue): void {
        value.updatedAt = Date.now();
        this.cache.set(traceId, value);
        
        // 控制缓存大小
        if (this.cache.size > this.maxSize) {
            // 移除最旧的条目
            const oldestKey = this.cache.keys().next().value;
            if (oldestKey) {
                this.cache.delete(oldestKey);
            }
        }
        
        this.notifyListeners();
    }

    // 创建新的事件值
    private createNewValue(traceId: string): ExtendedMessageEventStoreValue {
        const now = Date.now();
        return {
            traceId,
            status: 'Initial' as MessageEventStatus,
            timings: {},
            isNew: true,
            createdAt: now,
            updatedAt: now,
        };
    }

    // 获取或创建事件值
    private getOrCreate(traceId: string): ExtendedMessageEventStoreValue {
        let value = this.get(traceId);
        if (!value) {
            value = this.createNewValue(traceId);
            this.upsert(traceId, value);
        }
        return value;
    }

    // 处理单个 SSE 事件
    handleSseEvent(event: SseEventData): void {
        const traceId = event.traceId;
        const value = this.getOrCreate(traceId);
        
        try {
            switch (event.eventType) {
                case 'requestStart':
                    this.handleRequestStart(value, event);
                    break;
                case 'requestBody':
                    this.handleRequestBody(value, event);
                    break;
                case 'requestEnd':
                    this.handleRequestEnd(value, event);
                    break;
                case 'responseStart':
                    this.handleResponseStart(value, event);
                    break;
                case 'responseBody':
                    this.handleResponseBody(value, event);
                    break;
                case 'proxyStart':
                    this.handleProxyStart(value, event);
                    break;
                case 'proxyEnd':
                    this.handleProxyEnd(value, event);
                    break;
                case 'websocketStart':
                    this.handleWebSocketStart(value, event);
                    break;
                case 'websocketMessage':
                    this.handleWebSocketMessage(value, event);
                    break;
                case 'websocketError':
                    this.handleWebSocketError(value, event);
                    break;
                case 'tunnelStart':
                    this.handleTunnelStart(value, event);
                    break;
                case 'tunnelEnd':
                    this.handleTunnelEnd(value, event);
                    break;
                case 'error':
                    this.handleError(value, event);
                    break;
                default:
                    console.warn('Unknown SSE event type:', event.eventType);
            }
            
            this.upsert(traceId, value);
        } catch (error) {
            console.error('Error handling SSE event:', error, event);
        }
    }

    // 处理请求开始事件
    private handleRequestStart(value: ExtendedMessageEventStoreValue, event: SseEventData): void {
        if (event.data) {
            try {
                const requestData = JSON.parse(event.data);
                value.request = {
                    method: requestData.method || '',
                    url: requestData.url || '',
                    headers: requestData.headers || {},
                    version: requestData.version || '',
                    headerSize: requestData.headerSize?.size || 0,
                    body: requestData.body || '', // 使用 string 类型，符合生成的接口
                };
            } catch (error) {
                console.error('Error parsing request data:', error);
            }
        }
        
        value.status = 'RequestStarted' as MessageEventStatus;
        value.timings.requestStart = event.timestamp * 1000;
    }

    // 处理请求体事件
    private handleRequestBody(value: ExtendedMessageEventStoreValue, event: SseEventData): void {
        if (!value.timings.requestBodyStart) {
            value.timings.requestBodyStart = event.timestamp * 1000;
        }
        
        if (event.data && value.request) {
            try {
                // 处理 base64 编码的请求体数据，转换为字符串
                const bodyData = atob(event.data);
                
                // 合并请求体数据
                const oldBody = value.request.body || '';
                value.request.body = oldBody + bodyData;
            } catch (error) {
                console.error('Error processing request body:', error);
            }
        } else {
            // 请求体结束
            value.timings.requestBodyEnd = event.timestamp * 1000;
        }
    }

    // 处理请求结束事件
    private handleRequestEnd(value: ExtendedMessageEventStoreValue, event: SseEventData): void {
        value.timings.requestEnd = event.timestamp * 1000;
        value.status = 'Completed' as MessageEventStatus;
    }

    // 处理响应开始事件
    private handleResponseStart(value: ExtendedMessageEventStoreValue, event: SseEventData): void {
        if (event.data) {
            try {
                const responseData = JSON.parse(event.data);
                value.response = {
                    status: responseData.status || 0,
                    headers: responseData.headers || {},
                    version: responseData.version || '',
                    headerSize: responseData.headerSize?.size || 0,
                    body: responseData.body || '', // 使用 string 类型，符合生成的接口
                };
            } catch (error) {
                console.error('Error parsing response data:', error);
            }
        }
        
        // 注意：生成的类型中是 reponseBodyStart，不是 responseStart
        value.timings.reponseBodyStart = event.timestamp * 1000;
    }

    // 处理响应体事件
    private handleResponseBody(value: ExtendedMessageEventStoreValue, event: SseEventData): void {
        if (!value.timings.reponseBodyStart) {
            value.timings.reponseBodyStart = event.timestamp * 1000;
        }
        
        if (event.data && value.response) {
            try {
                console.log('Processing response body:', event.data);
                // 处理 base64 编码的响应体数据，转换为字符串
                const bodyData = atob(event.data);
                console.log('Decoded response body:', bodyData);
                // 合并响应体数据
                const oldBody = value.response.body || '';
                value.response.body = oldBody + bodyData;
            } catch (error) {
                console.error('Error processing response body:', error);
            }
        } else {
            // 响应体结束
            value.timings.reponseBodyEnd = event.timestamp * 1000;
        }
    }

    // 处理代理开始事件
    private handleProxyStart(value: ExtendedMessageEventStoreValue, event: SseEventData): void {
        value.timings.proxyStart = event.timestamp * 1000;
    }

    // 处理代理结束事件
    private handleProxyEnd(value: ExtendedMessageEventStoreValue, event: SseEventData): void {
        value.timings.proxyEnd = event.timestamp * 1000;
    }

    // 处理 WebSocket 开始事件
    private handleWebSocketStart(value: ExtendedMessageEventStoreValue, event: SseEventData): void {
        value.timings.websocketStart = event.timestamp * 1000;
        value.messages = {
            status: 'Start' as WebSocketStatus,
            message: [],
        };
    }

    // 处理 WebSocket 消息事件
    private handleWebSocketMessage(value: ExtendedMessageEventStoreValue, event: SseEventData): void {
        if (event.data && value.messages) {
            try {
                const messageData = JSON.parse(event.data);
                
                // 处理消息，注意生成的类型结构
                const log: WebSocketLog = {
                    direction: messageData.direction === 'ClientToServer' 
                        ? 'ClientToServer' as WebSocketDirection
                        : 'ServerToClient' as WebSocketDirection,
                    timestamp: messageData.timestamp || event.timestamp * 1000,
                    message: messageData.message, // 直接使用，不需要类型转换
                };
                
                value.messages.message.push(log);
                value.messages.status = 'Connected' as WebSocketStatus;
            } catch (error) {
                console.error('Error processing WebSocket message:', error);
            }
        }
    }

    // 处理 WebSocket 错误事件
    private handleWebSocketError(value: ExtendedMessageEventStoreValue, event: SseEventData): void {
        value.timings.websocketEnd = event.timestamp * 1000;
        
        if (!value.messages) {
            value.messages = {
                status: { Error: 'WebSocket connection error' } as WebSocketStatus,
                message: [],
            };
        } else {
            value.messages.status = { Error: 'WebSocket connection error' } as WebSocketStatus;
        }
    }

    // 处理隧道开始事件
    private handleTunnelStart(value: ExtendedMessageEventStoreValue, event: SseEventData): void {
        value.timings.tunnelStart = event.timestamp * 1000;
        value.tunnel = {
            status: 'Connected' as TunnelStatus,
        };
    }

    // 处理隧道结束事件
    private handleTunnelEnd(value: ExtendedMessageEventStoreValue, event: SseEventData): void {
        value.timings.tunnelEnd = event.timestamp * 1000;
        
        if (value.tunnel) {
            value.tunnel.status = 'Disconnected' as TunnelStatus;
        }
    }

    // 处理错误事件
    private handleError(value: ExtendedMessageEventStoreValue, event: SseEventData): void {
        value.timings.requestEnd = event.timestamp * 1000;
        value.status = { Error: 'Request processing error' } as MessageEventStatus;
    }

    // 清空缓存
    clear(): void {
        this.cache.clear();
        this.notifyListeners();
    }

    // 获取缓存大小
    size(): number {
        return this.cache.size;
    }
}
