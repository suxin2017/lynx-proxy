import { authHeaders, clearAuthToken, setAuthToken } from './token'

const API_BASE = '/api'

export interface AuthStatus {
  enabled: boolean
  authed: boolean
}

export interface LoginResult {
  token: string
  expiresAt: number
}

export async function fetchAuthStatus(): Promise<AuthStatus> {
  const response = await fetch(`${API_BASE}/auth/status`, {
    headers: authHeaders(),
  })
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }
  return response.json() as Promise<AuthStatus>
}

export async function login(username: string, password: string): Promise<LoginResult> {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username, password }),
  })
  if (!response.ok) {
    throw new Error(response.status === 401 ? '账号或密码错误' : `HTTP ${response.status}`)
  }
  const result = await response.json() as LoginResult
  setAuthToken(result.token)
  return result
}

export function logout() {
  clearAuthToken()
}
