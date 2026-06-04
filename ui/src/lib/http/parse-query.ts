import type { NetworkDetailKeyValue } from '@/components/ui/network-request-detail'

export function parseQueryFromUrl(url: string | undefined): NetworkDetailKeyValue[] {
  if (!url?.trim()) {
    return []
  }

  if (url.startsWith('trace://') || url.startsWith('请求 ')) {
    return []
  }

  try {
    const normalized = /^https?:\/\//i.test(url) ? url : `http://${url}`
    const parsed = new URL(normalized)
    const rows: NetworkDetailKeyValue[] = []

    parsed.searchParams.forEach((value, key) => {
      rows.push({ key, value })
    })

    return rows
  } catch {
    return []
  }
}
