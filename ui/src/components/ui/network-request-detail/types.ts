export interface NetworkDetailKeyValue {
  key: string
  value: string
}

export interface NetworkDetailSize {
  requestBytes?: number
  responseBytes?: number
  decodedBytes?: number
}

export interface NetworkDetailTiming {
  blockedMs?: number
  dnsMs?: number
  tcpMs?: number
  tlsMs?: number
  requestSentMs?: number
  waitingMs?: number
  downloadMs?: number
}

export interface NetworkDetailRecord {
  id: string
  method: string
  url: string
  status: 'success' | 'error' | 'pending' | 'cancelled'
  statusCode?: number
  requestType?: string
  protocol?: string
  host?: string
  path?: string
  remoteAddress?: string
  startTime?: string
  durationMs?: number
  size?: NetworkDetailSize
  query?: NetworkDetailKeyValue[]
  requestHeaders?: NetworkDetailKeyValue[]
  responseHeaders?: NetworkDetailKeyValue[]
  requestCookies?: NetworkDetailKeyValue[]
  responseCookies?: NetworkDetailKeyValue[]
  requestBody?: unknown
  responseBody?: unknown
  requestContentType?: string
  responseContentType?: string
  timing?: NetworkDetailTiming
}
