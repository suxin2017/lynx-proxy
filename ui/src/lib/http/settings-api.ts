const API_BASE = '/api'

export async function fetchBaseAddresses(): Promise<string[]> {
  const response = await fetch(`${API_BASE}/base_info/address`)
  if (!response.ok) {
    const text = await response.text()
    throw new Error(text || `HTTP ${response.status}`)
  }

  return response.json() as Promise<string[]>
}

export function certificateDownloadUrl(host: string): string {
  const normalized = host.includes('://') ? host : `http://${host}`
  return `${normalized.replace(/\/$/, '')}/api/certificate/download`
}
