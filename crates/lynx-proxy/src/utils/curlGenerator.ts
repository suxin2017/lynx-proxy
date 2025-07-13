import { IViewMessageEventStoreValue } from '@/store/useSortPoll';

export function generateCurlCommand(
  request: IViewMessageEventStoreValue,
): string {
  if (!request.request) {
    return '';
  }

  const {
    method = 'GET',
    headers = {},
    url = '',
    bodyArrayBuffer,
  } = request.request;

  // Start with curl and URL, add line continuation
  let curlCommand = `curl  '${url}'`;

  // Add method if not GET
  if (method !== 'GET') {
    curlCommand += ` \\\n  -X ${method}`;
  }

  // Add headers
  Object.entries(headers).forEach(([key, value]) => {
    if (key === 'accept-encoding') {
      return;
    }
    // Skip connection headers as they're handled by curl automatically
    if (!['connection', 'content-length'].includes(key.toLowerCase())) {
      curlCommand += ` \\\n  -H '${key}: ${value}'`;
    }
  });

  // Add body if exists
  if (bodyArrayBuffer) {
    try {
      const bodyText = new TextDecoder().decode(bodyArrayBuffer);
      const contentType = headers['content-type'] || '';

      if (contentType.includes('application/json')) {
        // For JSON data, format it properly
        curlCommand += ` \\\n  -d '${bodyText}'`;
      } else if (contentType.includes('application/x-www-form-urlencoded')) {
        // For form data, keep it as is
        curlCommand += ` \\\n  --data '${bodyText}'`;
      } else {
        // For other types, add as binary data
        curlCommand += ` \\\n  --data-binary '${bodyText}'`;
      }
    } catch (e) {
      console.error('Failed to decode request body:', e);
    }
  }

  return curlCommand;
}
