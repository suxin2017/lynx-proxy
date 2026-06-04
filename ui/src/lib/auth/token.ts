const STORAGE_KEY = 'lynx.auth.token'

export function getAuthToken(): string | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    return value?.trim() || null
  }
  catch {
    return null
  }
}

export function setAuthToken(token: string) {
  localStorage.setItem(STORAGE_KEY, token)
}

export function clearAuthToken() {
  localStorage.removeItem(STORAGE_KEY)
}

export function authHeaders(): HeadersInit {
  const token = getAuthToken()
  if (!token) {
    return {}
  }
  return {
    Authorization: `Bearer ${token}`,
  }
}
