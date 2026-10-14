import type { AuthResponse, ChatMessage, Conversation, Site } from '../types/api'

export const API_URL = import.meta.env.VITE_API_URL?.replace(/\/+$/, '') ?? ''
export const AUTH_STORAGE_KEY = 'livechat_auth'

async function request<T>(
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  if (!API_URL) {
    throw new Error('The dashboard API URL is not configured.')
  }

  let token: string | null = null
  try {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY)
    const session: unknown = stored ? JSON.parse(stored) : null
    if (
      typeof session === 'object' && session !== null &&
      'token' in session && typeof session.token === 'string' && session.token
    ) {
      token = session.token
    }
  } catch {
    // A missing or unreadable session is treated as signed out.
  }

  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(`${API_URL}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  })

  let data: unknown = null
  try {
    data = await response.json()
  } catch {
    if (response.ok) {
      throw new Error('The server returned an invalid response.')
    }
  }

  if (!response.ok) {
    if (response.status === 401 && token) {
      localStorage.removeItem(AUTH_STORAGE_KEY)
      window.location.replace('/login')
    }
    const message = typeof data === 'object' && data !== null &&
      'message' in data && typeof data.message === 'string' && data.message
      ? data.message
      : `Request failed (${response.status}). Please try again.`
    throw new Error(message)
  }

  // Network JSON is converted to its expected API type only here.
  return data as T
}

export const api = {
  register(email: string, password: string): Promise<AuthResponse> {
    return request<AuthResponse>('/auth/register', { method: 'POST', body: { email, password } })
  },
  login(email: string, password: string): Promise<AuthResponse> {
    return request<AuthResponse>('/auth/login', { method: 'POST', body: { email, password } })
  },
  getSites(): Promise<Site[]> {
    return request<Site[]>('/api/sites')
  },
  createSite(name: string, allowedDomain?: string): Promise<Site> {
    return request<Site>('/api/sites', {
      method: 'POST',
      body: { name, allowedDomain: allowedDomain?.trim() || null },
    })
  },
  getConversations(siteId: number): Promise<Conversation[]> {
    return request<Conversation[]>(`/api/conversations?siteId=${siteId}`)
  },
  getMessages(conversationId: number): Promise<ChatMessage[]> {
    return request<ChatMessage[]>(`/api/conversations/${conversationId}/messages`)
  },
}
