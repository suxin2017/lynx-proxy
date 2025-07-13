import { SseEventData } from './sseStore';
import { base64ToArrayBuffer } from './useSortPoll';
import { throttle } from 'lodash';

function uint8ToBase64(bytes: Uint8Array): string {
    let binary = '';
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
        binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize) as any);
    }
    return btoa(binary);
}
import { 
    MessageEventStoreValue,
    MessageEventStatus,
    WebSocketStatus,
    WebSocketLog,
    WebSocketDirection,
    TunnelStatus,
    MessageEventRequest,
    MessageEventResponse
} from '../services/generated/utoipaAxum.schemas';

export interface ExpendMessageEventRequest extends MessageEventRequest{
    bodyArrayBuffer?: ArrayBuffer; 
}

export interface ExtendMessageEventResponse extends MessageEventResponse{
    bodyArrayBuffer?: ArrayBuffer; 
}

export interface ExtendedMessageEventStoreValue extends MessageEventStoreValue {
    request?: ExpendMessageEventRequest | null;
    response?: ExtendMessageEventResponse | null;
    createdAt: number;
    updatedAt: number;
}

export class MessageEventCache {
    private cache = new Map<string, ExtendedMessageEventStoreValue>();
    private maxSize: number;
    private listeners: Set<(events: ExtendedMessageEventStoreValue[]) => void> = new Set();
    private insertOrUpdateCallback?: (events: ExtendedMessageEventStoreValue[]) => void;
    
    private needNotifyValues: Set<ExtendedMessageEventStoreValue> = new Set();
    private throttledNotifyListeners: () => void;

    constructor(maxSize: number = 1000, debounceDelay: number = 1000) {
        this.maxSize = maxSize;
        this.throttledNotifyListeners =throttle(() => {
            this.notifyListeners();
        }, debounceDelay);
    }

    addListener(listener: (events: ExtendedMessageEventStoreValue[]) => void) {
        this.listeners.add(listener);
    }

    removeListener(listener: (events: ExtendedMessageEventStoreValue[]) => void) {
        this.listeners.delete(listener);
    }

    setInsertOrUpdateCallback(callback: (events: ExtendedMessageEventStoreValue[]) => void) {
        this.insertOrUpdateCallback = callback;
    }

    removeInsertOrUpdateCallback() {
        this.insertOrUpdateCallback = undefined;
    }

    
    private notifyListeners() {
        const events = Array.from(this.needNotifyValues);
        this.listeners.forEach(listener => listener(events));
        
        // 调用 insertOrUpdateRequests 回调
        if (this.insertOrUpdateCallback && events.length > 0) {
            this.insertOrUpdateCallback(events);
        }
        
        this.needNotifyValues.clear();
    }

    get(traceId: string): ExtendedMessageEventStoreValue | undefined {
        return this.cache.get(traceId);
    }

    getAll(): ExtendedMessageEventStoreValue[] {
        return Array.from(this.cache.values());
    }

    upsert(traceId: string, value: ExtendedMessageEventStoreValue): void {
        value.updatedAt = Date.now();
        this.cache.set(traceId, value);
        
        if (this.cache.size > this.maxSize) {
            const oldestKey = this.cache.keys().next().value;
            if (oldestKey) {
                this.cache.delete(oldestKey);
            }
        }
        this.needNotifyValues.add(value);
        this.throttledNotifyListeners();
    }

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

    private getOrCreate(traceId: string): ExtendedMessageEventStoreValue {
        let value = this.get(traceId);
        if (!value) {
            value = this.createNewValue(traceId);
            this.upsert(traceId, value);
        }
        return value;
    }

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
                case 'requestError':
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

    private handleRequestBody(value: ExtendedMessageEventStoreValue, event: SseEventData): void {
        if (!value.timings.requestBodyStart) {
            value.timings.requestBodyStart = event.timestamp * 1000;
        }
        
        if (event.data && value.request) {
            try {
                const newArrayBuffer = base64ToArrayBuffer(event.data);
                if (value.request.bodyArrayBuffer) {
                    const oldBuffer = value.request.bodyArrayBuffer;
                    const combinedBuffer = new ArrayBuffer(oldBuffer.byteLength + newArrayBuffer.byteLength);
                    const combinedView = new Uint8Array(combinedBuffer);
                    combinedView.set(new Uint8Array(oldBuffer), 0);
                    combinedView.set(new Uint8Array(newArrayBuffer), oldBuffer.byteLength);
                    value.request.bodyArrayBuffer = combinedBuffer;
                } else {
                    value.request.bodyArrayBuffer = newArrayBuffer;
                }
            } catch (error) {
                console.error('Error processing request body:', error);
            }
        } else {
            value.timings.requestBodyEnd = event.timestamp * 1000;
            
            if (value.request && value.request.bodyArrayBuffer) {
                try {
                    const bytes = new Uint8Array(value.request.bodyArrayBuffer);
                    value.request.body = uint8ToBase64(bytes);
                } catch (error) {
                    console.error('Error converting request body to base64:', error);
                }
            }
        }
    }

    private handleRequestEnd(value: ExtendedMessageEventStoreValue, event: SseEventData): void {
        value.timings.requestEnd = event.timestamp * 1000;
        value.status = 'Completed' as MessageEventStatus;
    }

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
        
        value.timings.reponseBodyStart = event.timestamp * 1000;
    }

    private handleResponseBody(value: ExtendedMessageEventStoreValue, event: SseEventData): void {
        if (!value.timings.reponseBodyStart) {
            value.timings.reponseBodyStart = event.timestamp * 1000;
        }
        
        if (event.data && value.response) {
            try {
                const newArrayBuffer = base64ToArrayBuffer(event.data);
                if (value.response.bodyArrayBuffer) {
                    const oldBuffer = value.response.bodyArrayBuffer;
                    const combinedBuffer = new ArrayBuffer(oldBuffer.byteLength + newArrayBuffer.byteLength);
                    const combinedView = new Uint8Array(combinedBuffer);
                    combinedView.set(new Uint8Array(oldBuffer), 0);
                    combinedView.set(new Uint8Array(newArrayBuffer), oldBuffer.byteLength);
                    value.response.bodyArrayBuffer = combinedBuffer;
                } else {
                    value.response.bodyArrayBuffer = newArrayBuffer;
                }
            } catch (error) {
                console.error('Error processing response body:', error);
            }
        } else {
            value.timings.reponseBodyEnd = event.timestamp * 1000;
            
            if (value.response && value.response.bodyArrayBuffer) {
                try {
                    const bytes = new Uint8Array(value.response.bodyArrayBuffer);
                    value.response.body = uint8ToBase64(bytes);
                } catch (error) {
                    console.error('Error converting response body to base64:', error);
                }
            }
        }
    }

    private handleProxyStart(value: ExtendedMessageEventStoreValue, event: SseEventData): void {
        value.timings.proxyStart = event.timestamp * 1000;
    }

    private handleProxyEnd(value: ExtendedMessageEventStoreValue, event: SseEventData): void {
        value.timings.proxyEnd = event.timestamp * 1000;
    }

    private handleWebSocketStart(value: ExtendedMessageEventStoreValue, event: SseEventData): void {
        value.timings.websocketStart = event.timestamp * 1000;
        value.messages = {
            status: 'Start' as WebSocketStatus,
            message: [],
        };
    }

    private handleWebSocketMessage(value: ExtendedMessageEventStoreValue, event: SseEventData): void {
        if (event.data && value.messages) {
            try {
                const messageData = JSON.parse(event.data);
                
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

    private handleTunnelStart(value: ExtendedMessageEventStoreValue, event: SseEventData): void {
        value.timings.tunnelStart = event.timestamp * 1000;
        value.tunnel = {
            status: 'Connected' as TunnelStatus,
        };
    }

    private handleTunnelEnd(value: ExtendedMessageEventStoreValue, event: SseEventData): void {
        value.timings.tunnelEnd = event.timestamp * 1000;
        
        if (value.tunnel) {
            value.tunnel.status = 'Disconnected' as TunnelStatus;
        }
    }

    private handleError(value: ExtendedMessageEventStoreValue, event: SseEventData): void {
        value.timings.requestEnd = event.timestamp * 1000;

                
        value.status = {Error:event.data || 'Unknown error'} as MessageEventStatus;
    }

    clear(): void {
        this.cache.clear();
        this.notifyListeners();
    }

    size(): number {
        return this.cache.size;
    }
}
