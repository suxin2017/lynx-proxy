import { useState } from 'react';
import { Modal, Input, Button, message } from 'antd';
import { ImportOutlined } from '@ant-design/icons';

const { TextArea } = Input;

interface ParsedCurlResult {
  method: string;
  url: string;
  headers: Record<string, string>;
  body: string;
}

// 自定义 cURL 解析函数
function parseCurlCommand(curlCommand: string): ParsedCurlResult {
  const result: ParsedCurlResult = {
    method: 'GET',
    url: '',
    headers: {},
    body: '',
  };

  // 移除多余的空白字符和换行符
  let cmd = curlCommand
    .trim()
    .replace(/\\\s*\n\s*/g, ' ')
    .replace(/\s+/g, ' ');

  // 移除开头的 curl 命令
  cmd = cmd.replace(/^curl\s+/, '');

  // 解析参数的正则表达式
  const tokens: string[] = [];
  let current = '';
  let inQuotes = false;
  let quoteChar = '';
  let escaped = false;

  for (let i = 0; i < cmd.length; i++) {
    const char = cmd[i];

    if (escaped) {
      // 保持转义字符的完整性，包括反斜杠
      current += '\\' + char;
      escaped = false;
      continue;
    }

    if (char === '\\') {
      escaped = true;
      continue;
    }

    if (inQuotes) {
      if (char === quoteChar && !escaped) {
        inQuotes = false;
        quoteChar = '';
      } else {
        current += char;
      }
    } else {
      if (char === '"' || char === "'") {
        inQuotes = true;
        quoteChar = char;
      } else if (char === ' ') {
        if (current.trim()) {
          tokens.push(current.trim());
          current = '';
        }
      } else {
        current += char;
      }
    }
  }

  if (current.trim()) {
    tokens.push(current.trim());
  }

  // 解析 tokens
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    // 解析 HTTP 方法
    if (token === '-X' || token === '--request') {
      if (i + 1 < tokens.length) {
        result.method = tokens[i + 1];
        i++;
      }
    }
    // 解析请求头
    else if (token === '-H' || token === '--header') {
      if (i + 1 < tokens.length) {
        const headerValue = tokens[i + 1];
        const colonIndex = headerValue.indexOf(':');
        if (colonIndex > 0) {
          const key = headerValue.substring(0, colonIndex).trim();
          const value = headerValue.substring(colonIndex + 1).trim();
          result.headers[key] = value;
        }
        i++;
      }
    }
    // 解析 Cookie
    else if (token === '-b' || token === '--cookie') {
      if (i + 1 < tokens.length) {
        result.headers['Cookie'] = tokens[i + 1];
        i++;
      }
    }
    // 解析用户代理
    else if (token === '-A' || token === '--user-agent') {
      if (i + 1 < tokens.length) {
        result.headers['User-Agent'] = tokens[i + 1];
        i++;
      }
    }
    // 解析 Referer
    else if (token === '-e' || token === '--referer') {
      if (i + 1 < tokens.length) {
        result.headers['Referer'] = tokens[i + 1];
        i++;
      }
    }
    // 解析请求体数据
    else if (
      token === '-d' ||
      token === '--data' ||
      token === '--data-raw' ||
      token === '--data-binary'
    ) {
      if (i + 1 < tokens.length) {
        let bodyData = tokens[i + 1];

        // 处理 bash 的 $'...' 格式
        if (bodyData.startsWith("$'") && bodyData.endsWith("'")) {
          bodyData = bodyData.slice(2, -1);
          // 简单处理一些常见的转义序列
          bodyData = bodyData
            .replace(/\\n/g, '\n')
            .replace(/\\t/g, '\t')
            .replace(/\\r/g, '\r')
            .replace(/\\\\/g, '\\')
            .replace(/\\'/g, "'");

          // 处理 Unicode 转义序列 \uXXXX
          bodyData = bodyData.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => {
            return String.fromCharCode(parseInt(hex, 16));
          });

          // 处理八进制转义序列 \XXX
          bodyData = bodyData.replace(/\\([0-7]{1,3})/g, (_, oct) => {
            return String.fromCharCode(parseInt(oct, 8));
          });
        } else if (token === '--data-raw') {
          // 对于 --data-raw，保持原始字符串，完全不处理转义字符
          // 只处理外层的引号包装
          if ((bodyData.startsWith('"') && bodyData.endsWith('"')) || 
              (bodyData.startsWith("'") && bodyData.endsWith("'"))) {
            bodyData = bodyData.slice(1, -1);
          }
        }

        result.body = bodyData;

        // 如果有请求体数据，且 headers 中没有 Content-Type，则设置默认值
        // 优先保持 headers 中已有的 Content-Type 配置
        const hasContentType = Object.keys(result.headers).some(
          (key) => key.toLowerCase() === 'content-type',
        );

        if (!hasContentType) {
          // 根据数据类型推断 Content-Type
          if (token === '--data-binary') {
            result.headers['Content-Type'] = 'application/octet-stream';
          } else if (
            bodyData.trim().startsWith('{') ||
            bodyData.trim().startsWith('[')
          ) {
            result.headers['Content-Type'] = 'application/json';
          } else {
            result.headers['Content-Type'] =
              'application/x-www-form-urlencoded';
          }
        }

        i++;
      }
    }
    // 解析 URL（通常是最后一个不以 - 开头的参数）
    else if (!token.startsWith('-') && !result.url) {
      result.url = token;
    }
  }

  // 如果没有找到 URL，尝试从第一个不以 - 开头的 token 获取
  if (!result.url) {
    for (const token of tokens) {
      if (!token.startsWith('-') && token.includes('://')) {
        result.url = token;
        break;
      }
    }
  }

  // 如果有请求体但没有明确指定方法，默认为POST（符合curl行为）
  if (result.body && result.method === 'GET') {
    result.method = 'POST';
  }

  return result;
}

interface CurlImportModalProps {
  visible: boolean;
  onClose: () => void;
  onImport: (data: {
    method: string;
    url: string;
    headers: Record<string, string>;
    body: string;
  }) => void;
}

export function CurlImportModal({
  visible,
  onClose,
  onImport,
}: CurlImportModalProps) {
  const [curlText, setCurlText] = useState('');
  const [loading, setLoading] = useState(false);

  const parseCurl = async () => {
    if (!curlText.trim()) {
      message.warning('Please enter a cURL command');
      return;
    }

    setLoading(true);
    try {
      const result = parseCurlCommand(curlText);
      console.log('Parsed result:', result);

      // Validate parsed result
      if (!result.url) {
        message.error('Could not extract URL from cURL command');
        return;
      }

      // 尝试格式化 JSON 请求体
      let formattedBody = result.body;
      const contentType = result.headers['Content-Type'] || result.headers['content-type'];
      
      if (result.body && contentType?.includes('application/json')) {
        try {
          console.log(result.body);
          // 尝试解析并重新格式化 JSON，但保持嵌套的 JSON 字符串格式
          const parsed = JSON.parse(result.body);
          formattedBody = JSON.stringify(parsed, null, 2);
        } catch (error) {
          console.warn('Body is not valid JSON, keeping original format:', error);
          // 如果解析失败，保持原始格式，但给用户提示
          message.warning('Request body appears to be JSON but contains syntax errors. Please verify the format.');
        }
      }

      onImport({
        method: result.method.toUpperCase(),
        url: result.url,
        headers: result.headers,
        body: formattedBody,
      });

      message.success('cURL command imported successfully');
      setCurlText('');
      onClose();
    } catch (error) {
      console.error('Error parsing cURL:', error);
      message.error('Failed to parse cURL command. Please check the format.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setCurlText('');
    onClose();
  };

  return (
    <Modal
      title={
        <div className="flex items-center gap-2">
          <ImportOutlined />
          Import from cURL
        </div>
      }
      open={visible}
      onCancel={handleCancel}
      footer={[
        <Button key="cancel" onClick={handleCancel}>
          Cancel
        </Button>,
        <Button
          key="import"
          type="primary"
          loading={loading}
          onClick={parseCurl}
          disabled={!curlText.trim()}
        >
          Import
        </Button>,
      ]}
      width={800}
    >
      <div className="mb-4">
        <p className="mb-2">
          Paste your cURL command below and we&apos;ll parse it into the request
          form:
        </p>
        <TextArea
          value={curlText}
          onChange={(e) => setCurlText(e.target.value)}
          placeholder={`curl -X POST "https://api.example.com/users" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer your-token" \\
  -d '{"name": "John Doe", "email": "john@example.com"}'`}
          rows={8}
          className="font-mono text-sm"
        />
      </div>
    </Modal>
  );
}
