// Simple cURL parser for web environment
export interface ParsedCurl {
  method: string;
  url: string;
  headers: Record<string, string>;
  body: string;
}

export function parseCurl(curlCommand: string): ParsedCurl {
  const result: ParsedCurl = {
    method: 'GET',
    url: '',
    headers: {},
    body: '',
  };

  // Clean the command - remove line breaks and extra spaces
  let cleanCommand = curlCommand
    .replace(/\\\s*\n\s*/g, ' ') // Remove line breaks with backslashes
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .trim();

  // Remove 'curl' at the beginning
  cleanCommand = cleanCommand.replace(/^curl\s+/i, '');

  // Extract method (-X or --request)
  const methodMatch = cleanCommand.match(/-X\s+(\w+)|--request\s+(\w+)/i);
  if (methodMatch) {
    result.method = (methodMatch[1] || methodMatch[2]).toUpperCase();
    cleanCommand = cleanCommand.replace(/-X\s+\w+|--request\s+\w+/i, '').trim();
  }

  // Extract headers (-H or --header)
  const headerRegex = /-H\s+['"]([^'"]+)['"]|--header\s+['"]([^'"]+)['"]/g;
  let headerMatch;
  while ((headerMatch = headerRegex.exec(cleanCommand)) !== null) {
    const headerValue = headerMatch[1] || headerMatch[2];
    const [key, ...valueParts] = headerValue.split(':');
    if (key && valueParts.length > 0) {
      result.headers[key.trim()] = valueParts.join(':').trim();
    }
  }
  // Remove header arguments from command
  cleanCommand = cleanCommand
    .replace(/-H\s+['"][^'"]+['"]|--header\s+['"][^'"]+['"]/g, '')
    .trim();

  // Extract body data (-d, --data, --data-raw)
  const dataMatch = cleanCommand.match(
    /-d\s+['"]([^'"]*?)['"]|--data\s+['"]([^'"]*?)['"]|--data-raw\s+['"]([^'"]*?)['"]|--data\s+([^\s]+)|--data-raw\s+([^\s]+)|-d\s+([^\s]+)/,
  );
  if (dataMatch) {
    result.body =
      dataMatch[1] ||
      dataMatch[2] ||
      dataMatch[3] ||
      dataMatch[4] ||
      dataMatch[5] ||
      dataMatch[6] ||
      '';
    cleanCommand = cleanCommand
      .replace(
        /-d\s+['"][^'"]*['"]|--data\s+['"][^'"]*['"]|--data-raw\s+['"][^'"]*['"]|--data\s+[^\s]+|--data-raw\s+[^\s]+|-d\s+[^\s]+/,
        '',
      )
      .trim();
  }

  // Extract URL (remaining part, usually quoted)
  const urlMatch = cleanCommand.match(/['"]([^'"]+)['"]|([^\s]+)/);
  if (urlMatch) {
    result.url = urlMatch[1] || urlMatch[2] || '';
  }

  // Set default method to POST if body exists and no method specified
  if (result.body && result.method === 'GET') {
    result.method = 'POST';
  }

  return result;
}

// Test function for development
export function testCurlParser() {
  const testCases = [
    `curl -X POST "https://api.example.com/users" \\
      -H "Content-Type: application/json" \\
      -H "Authorization: Bearer token123" \\
      -d '{"name": "John", "email": "john@example.com"}'`,

    `curl -X GET "https://api.example.com/users/123" \\
      -H "Authorization: Bearer token123"`,

    `curl --request POST \\
      --url https://api.example.com/data \\
      --header 'Content-Type: application/json' \\
      --data '{"test": true}'`,
  ];

  testCases.forEach((testCase, index) => {
    console.log(`Test case ${index + 1}:`, parseCurl(testCase));
  });
}
