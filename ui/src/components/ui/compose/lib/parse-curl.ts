import type { ComposeDraft, ComposeHttpMethod, KeyValueRow } from '../types'
import { createEmptyDraft } from './empty-draft'
import { parseUrlParams } from './parse-url-params'

export interface ParsedCurl {
  method: ComposeHttpMethod
  url: string
  headers: Record<string, string>
  body: string
}

function tokenizeCurl(cmd: string): string[] {
  const tokens: string[] = []
  let current = ''
  let inQuotes = false
  let quoteChar = ''
  let escaped = false

  for (let i = 0; i < cmd.length; i++) {
    const char = cmd[i]

    if (escaped) {
      current += `\\${char}`
      escaped = false
      continue
    }

    if (char === '\\') {
      escaped = true
      continue
    }

    if (inQuotes) {
      if (char === quoteChar) {
        inQuotes = false
        quoteChar = ''
      }
      else {
        current += char
      }
    }
    else if (char === '"' || char === '\'') {
      inQuotes = true
      quoteChar = char
    }
    else if (char === ' ') {
      if (current.trim()) {
        tokens.push(current.trim())
        current = ''
      }
    }
    else {
      current += char
    }
  }

  if (current.trim()) {
    tokens.push(current.trim())
  }

  return tokens
}

function normalizeMethod(method: string): ComposeHttpMethod {
  const upper = method.toUpperCase()
  const allowed: ComposeHttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']
  return allowed.includes(upper as ComposeHttpMethod) ? upper as ComposeHttpMethod : 'GET'
}

function headersToRows(headers: Record<string, string>): KeyValueRow[] {
  return Object.entries(headers).map(([key, value]) => ({
    key,
    value,
    enabled: true,
  }))
}

export function parseCurlCommand(curlCommand: string): ParsedCurl {
  const result: ParsedCurl = {
    method: 'GET',
    url: '',
    headers: {},
    body: '',
  }

  let cmd = curlCommand
    .trim()
    .replace(/\\\s*\n\s*/g, ' ')
    .replace(/\s+/g, ' ')

  cmd = cmd.replace(/^curl\s+/i, '')
  const tokens = tokenizeCurl(cmd)

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]

    if (token === '-X' || token === '--request') {
      if (i + 1 < tokens.length) {
        result.method = normalizeMethod(tokens[i + 1])
        i++
      }
    }
    else if (token === '-H' || token === '--header') {
      if (i + 1 < tokens.length) {
        const headerValue = tokens[i + 1]
        const colonIndex = headerValue.indexOf(':')
        if (colonIndex > 0) {
          const key = headerValue.slice(0, colonIndex).trim()
          const value = headerValue.slice(colonIndex + 1).trim()
          result.headers[key] = value
        }
        i++
      }
    }
    else if (token === '-b' || token === '--cookie') {
      if (i + 1 < tokens.length) {
        result.headers.Cookie = tokens[i + 1]
        i++
      }
    }
    else if (token === '-A' || token === '--user-agent') {
      if (i + 1 < tokens.length) {
        result.headers['User-Agent'] = tokens[i + 1]
        i++
      }
    }
    else if (token === '-e' || token === '--referer') {
      if (i + 1 < tokens.length) {
        result.headers.Referer = tokens[i + 1]
        i++
      }
    }
    else if (
      token === '-d'
      || token === '--data'
      || token === '--data-raw'
      || token === '--data-binary'
    ) {
      if (i + 1 < tokens.length) {
        let bodyData = tokens[i + 1]

        if (bodyData.startsWith('$\'') && bodyData.endsWith('\'')) {
          bodyData = bodyData.slice(2, -1)
            .replace(/\\n/g, '\n')
            .replace(/\\t/g, '\t')
            .replace(/\\r/g, '\r')
            .replace(/\\\\/g, '\\')
            .replace(/\\'/g, '\'')
            .replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(Number.parseInt(hex, 16)))
        }
        else if (
          (bodyData.startsWith('"') && bodyData.endsWith('"'))
          || (bodyData.startsWith('\'') && bodyData.endsWith('\''))
        ) {
          bodyData = bodyData.slice(1, -1)
        }

        result.body = bodyData

        const hasContentType = Object.keys(result.headers).some(
          key => key.toLowerCase() === 'content-type',
        )

        if (!hasContentType) {
          if (token === '--data-binary') {
            result.headers['Content-Type'] = 'application/octet-stream'
          }
          else if (bodyData.trim().startsWith('{') || bodyData.trim().startsWith('[')) {
            result.headers['Content-Type'] = 'application/json'
          }
          else {
            result.headers['Content-Type'] = 'application/x-www-form-urlencoded'
          }
        }

        i++
      }
    }
    else if (!token.startsWith('-') && !result.url) {
      result.url = token
    }
  }

  if (!result.url) {
    for (const token of tokens) {
      if (!token.startsWith('-') && token.includes('://')) {
        result.url = token
        break
      }
    }
  }

  if (result.body && result.method === 'GET') {
    result.method = 'POST'
  }

  return result
}

export function parsedCurlToDraft(parsed: ParsedCurl, base?: ComposeDraft): ComposeDraft {
  const contentType = parsed.headers['Content-Type'] ?? parsed.headers['content-type']
  let body = parsed.body

  if (body && contentType?.includes('application/json')) {
    try {
      body = JSON.stringify(JSON.parse(body), null, 2)
    }
    catch {
      // keep original body
    }
  }

  return {
    ...(base ?? createEmptyDraft()),
    method: parsed.method,
    url: parsed.url,
    queryParams: parseUrlParams(parsed.url),
    headers: headersToRows(parsed.headers),
    body,
  }
}

export function mergeCurlIntoDraft(draft: ComposeDraft, curlText: string): ComposeDraft {
  const parsed = parseCurlCommand(curlText)
  if (!parsed.url) {
    throw new Error('无法从 cURL 中解析 URL')
  }
  return parsedCurlToDraft(parsed, draft)
}
