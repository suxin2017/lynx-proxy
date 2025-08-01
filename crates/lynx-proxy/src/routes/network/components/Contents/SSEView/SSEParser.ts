// SSE事件接口定义
export interface SSEEvent {
    id?: string;
    event?: string;
    data: string;
    retry?: number;
}

// SSE解析器类
export class SSEParser {
    /**
     * 解析SSE格式的字符串，返回事件对象数组
     * @param sseString SSE格式的字符串
     * @returns 解析后的事件对象数组
     */
    static parse(sseString: string): SSEEvent[] {
        const events: SSEEvent[] = [];

        // 按双换行符分割事件块
        const eventBlocks = sseString.split(/\n\n|\r\n\r\n/);

        for (const block of eventBlocks) {
            if (!block.trim()) continue;

            const event = this.parseEventBlock(block);
            if (event) {
                events.push(event);
            }
        }

        return events;
    }

    /**
     * 解析单个事件块
     * @param block 事件块字符串
     * @returns 解析后的事件对象
     */
    private static parseEventBlock(block: string): SSEEvent | null {
        const lines = block.split(/\n|\r\n/);
        const event: Partial<SSEEvent> = { data: '' };
        const dataLines: string[] = [];

        for (let line of lines) {
            line = line.trim();

            // 跳过注释行（以:开头）
            if (line.startsWith(':') || line === '') {
                continue;
            }

            // 解析字段
            const colonIndex = line.indexOf(':');
            if (colonIndex === -1) {
                // 没有冒号的行被视为字段名，值为空
                continue;
            }

            const field = line.substring(0, colonIndex).trim();
            let value = line.substring(colonIndex + 1).trim();

            // 移除值开头的单个空格（SSE规范）
            if (value.startsWith(' ')) {
                value = value.substring(1);
            }

            switch (field) {
                case 'id':
                    event.id = value;
                    break;
                case 'event':
                    event.event = value;
                    break;
                case 'data':
                    dataLines.push(value);
                    break;
                case 'retry':
                    {
                        const retryValue = parseInt(value, 10);
                        if (!isNaN(retryValue)) {
                            event.retry = retryValue;
                        }
                        break;
                    }
            }
        }

        // 合并多行data字段
        if (dataLines.length > 0) {
            event.data = dataLines.join('\n');
        }

        // 如果没有data字段，返回null
        if (event.data === undefined) {
            return null;
        }

        return event as SSEEvent;
    }

    /**
     * 解析单个SSE事件（用于流式处理）
     * @param eventString 单个事件的字符串
     * @returns 解析后的事件对象
     */
    static parseSingle(eventString: string): SSEEvent | null {
        return this.parseEventBlock(eventString);
    }
}

