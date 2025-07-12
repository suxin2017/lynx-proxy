// SSE 事件数据结构
export interface SseEventData {
    eventType: string;
    traceId: string;
    timestamp: number;
    data: string | null;
}

// SSE 连接状态
export enum SseConnectionStatus {
    DISCONNECTED = 'disconnected',
    CONNECTING = 'connecting',
    CONNECTED = 'connected',
    ERROR = 'error',
}

// SSE 管理类
export class SseManager {
    private static instance: SseManager;
    private eventSource: EventSource | null = null;
    private connectionStatus: SseConnectionStatus = SseConnectionStatus.DISCONNECTED;
    private onEventCallback?: (event: SseEventData) => void;
    private onStatusChangeCallback?: (status: SseConnectionStatus) => void;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private reconnectDelay = 1000; // 1秒

    private constructor() { }

    static getInstance(): SseManager {
        if (!SseManager.instance) {
            SseManager.instance = new SseManager();
        }
        return SseManager.instance;
    }

    // 设置事件回调
    setOnEventCallback(callback: (event: SseEventData) => void) {
        this.onEventCallback = callback;
    }

    // 设置状态变化回调
    setOnStatusChangeCallback(callback: (status: SseConnectionStatus) => void) {
        this.onStatusChangeCallback = callback;
    }

    // 获取当前连接状态
    getConnectionStatus(): SseConnectionStatus {
        return this.connectionStatus;
    }

    // 更新连接状态
    private updateConnectionStatus(status: SseConnectionStatus) {
        this.connectionStatus = status;
        if (this.onStatusChangeCallback) {
            this.onStatusChangeCallback(status);
        }
    }

    // 连接 SSE
    connect(url: string = '/api/net_request/sse/message-events') {
        if (this.eventSource) {
            this.disconnect();
        }

        try {
            this.updateConnectionStatus(SseConnectionStatus.CONNECTING);

            this.eventSource = new EventSource(url);

            // 连接成功
            this.eventSource.onopen = (event) => {
                console.log('SSE 连接成功:', event);
                this.updateConnectionStatus(SseConnectionStatus.CONNECTED);
                this.reconnectAttempts = 0;
            };

            // 接收消息
            this.eventSource.onmessage = (event) => {
                try {
                    const data: SseEventData = JSON.parse(event.data);
                    console.log('收到 SSE 事件:', data);

                    if (this.onEventCallback) {
                        this.onEventCallback(data);
                    }
                } catch (error) {
                    console.error('解析 SSE 数据失败:', error);
                }
            };

            // 连接错误
            this.eventSource.onerror = (event) => {
                console.error('SSE 连接错误:', event);
                this.updateConnectionStatus(SseConnectionStatus.ERROR);

                // 尝试重连
                this.handleReconnect(url);
            };

            // 监听特定事件类型
            this.setupEventListeners();

        } catch (error) {
            console.error('创建 SSE 连接失败:', error);
            this.updateConnectionStatus(SseConnectionStatus.ERROR);
        }
    }

    // 断开连接
    disconnect() {
        if (this.eventSource) {
            this.eventSource.close();
            this.eventSource = null;
        }
        this.updateConnectionStatus(SseConnectionStatus.DISCONNECTED);
        this.reconnectAttempts = 0;
    }

    // 处理重连
    private handleReconnect(url: string) {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`尝试重连 SSE (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

            setTimeout(() => {
                this.connect(url);
            }, this.reconnectDelay * this.reconnectAttempts);
        } else {
            console.error('SSE 重连失败，达到最大重连次数');
        }
    }

    // 设置事件监听器
    private setupEventListeners() {
        if (!this.eventSource) return;

        // 监听特定事件类型
        const eventTypes = [
            'requestStart',
            'requestBody',
            'requestEnd',
            'responseStart',
            'responseBody',
            'proxyStart',
            'proxyEnd',
            'websocketStart',
            'websocketMessage',
            'websocketError',
            'tunnelStart',
            'tunnelEnd',
            'error',
        ];

        eventTypes.forEach(eventType => {
            this.eventSource!.addEventListener(eventType, (event) => {
                try {
                    const data: SseEventData = JSON.parse(event.data);
                    console.log(`收到 ${eventType} 事件:`, data);

                    if (this.onEventCallback) {
                        this.onEventCallback(data);
                    }
                } catch (error) {
                    console.error(`解析 ${eventType} 事件数据失败:`, error);
                }
            });
        });
    }
}

// 创建全局实例
export const sseManager = SseManager.getInstance();


// 辅助函数：关闭 SSE 连接
export function closeSse() {
    sseManager.disconnect();
}
