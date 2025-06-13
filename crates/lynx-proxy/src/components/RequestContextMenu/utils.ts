
/**
 * 下载 JSON 数据为文件
 */
export const downloadJsonFile = (data: unknown, filename: string) => {
    const jsonData = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

/**
 * 复制文本到剪贴板
 */
export const copyToClipboard = async (text: string): Promise<boolean> => {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch (_: unknown) {
        return false;
    }
};

/**
 * 生成时间戳文件名
 */
export const generateTimestampFilename = (prefix: string, extension: string = 'json'): string => {
    return `${prefix}-${new Date().toISOString()}.${extension}`;
};
