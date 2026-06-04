import { authHeaders, getAuthToken } from '@/lib/auth/token'

const API_BASE = '/api'

export async function fetchBaseAddresses(): Promise<string[]> {
  const response = await fetch(`${API_BASE}/base_info/address`, {
    headers: authHeaders(),
  })
  if (!response.ok) {
    const text = await response.text()
    throw new Error(text || `HTTP ${response.status}`)
  }

  return response.json() as Promise<string[]>
}

export function certificateDownloadUrl(host: string): string {
  const normalized = host.includes('://') ? host : `http://${host}`
  const base = `${normalized.replace(/\/$/, '')}/api/certificate/download`
  const token = getAuthToken()
  if (!token) {
    return base
  }
  const params = new URLSearchParams({ token })
  return `${base}?${params.toString()}`
}
