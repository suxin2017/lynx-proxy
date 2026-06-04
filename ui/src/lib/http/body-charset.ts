export function parseCharset(contentType?: string): string {
  if (!contentType) {
    return 'utf-8'
  }

  const match = contentType.match(/charset=([^;\s]+)/i)
  if (!match?.[1]) {
    return 'utf-8'
  }

  return match[1].trim().replace(/^["']|["']$/g, '')
}

export type DecodeBytesResult = {
  text: string
  lossy: boolean
}

export function decodeBytes(bytes: Uint8Array, charset?: string): DecodeBytesResult {
  const label = charset ?? 'utf-8'

  try {
    const text = new TextDecoder(label, { fatal: true }).decode(bytes)
    return { text, lossy: false }
  }
  catch {
    try {
      const text = new TextDecoder(label).decode(bytes)
      return { text, lossy: true }
    }
    catch {
      const text = new TextDecoder('utf-8').decode(bytes)
      return { text, lossy: true }
    }
  }
}
