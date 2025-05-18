import { MessageEventStoreValue } from '@/services/generated/utoipaAxum.schemas';

export function generateCurlCommand(request: MessageEventStoreValue): string {
  if (!request.request) {
    return '';
  }

  const { method = 'GET', headers = {}, url = '', body } = request.request;

  let curlCommand = `curl '${url}'`;

  // Add method if not GET
  if (method !== 'GET') {
    curlCommand += ` -X ${method}`;
  }

  // Add headers
  Object.entries(headers).forEach(([key, value]) => {
    // Skip connection headers as they're handled by curl automatically
    if (!['connection', 'content-length'].includes(key.toLowerCase())) {
      curlCommand += `\n  -H '${key}: ${value}'`;
    }
  });

  // Add body if exists
  if (body) {
    try {
      const bodyText = new TextDecoder().decode(body as ArrayBuffer);
      const contentType = headers['content-type'] || '';

      if (contentType.includes('application/json')) {
        // For JSON data, format it properly
        curlCommand += `\n  -d '${bodyText}'`;
      } else if (contentType.includes('application/x-www-form-urlencoded')) {
        // For form data, keep it as is
        curlCommand += `\n  --data '${bodyText}'`;
      } else {
        // For other types, add as binary data
        curlCommand += `\n  --data-binary '${bodyText}'`;
      }
    } catch (e) {
      console.error('Failed to decode request body:', e);
    }
  }

  return curlCommand;
}
