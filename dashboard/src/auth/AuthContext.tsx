import { createContext, useContext, useState } from 'react'
import type { ReactElement, ReactNode } from 'react'
import { AUTH_STORAGE_KEY } from '../api/http'
import type { AuthResponse } from '../types/api'

interface AuthContextValue {
  session: AuthResponse | null
  login: (data: AuthResponse) => void
  logout: () => void
  isAuthenticated: boolean
}

interface AuthProviderProps {
  children: ReactNode
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

function loadSession(): AuthResponse | null {
  try {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY)
    if (!stored) return null
    const data: unknown = JSON.parse(stored)
    if (
      typeof data === 'object' && data !== null &&
      'token' in data && typeof data.token === 'string' && data.token.trim() !== '' &&
      'userId' in data && typeof data.userId === 'number' &&
      Number.isSafeInteger(data.userId) && data.userId > 0 &&
      'email' in data && typeof data.email === 'string' && data.email.trim() !== ''
    ) {
      return { token: data.token, userId: data.userId, email: data.email }
    }
    localStorage.removeItem(AUTH_STORAGE_KEY)
  } catch {
    // Invalid or unavailable local storage must not prevent the login page from loading.
  }
  return null
}

export function AuthProvider({ children }: AuthProviderProps): ReactElement {
  const [session, setSession] = useState<AuthResponse | null>(loadSession)

  function login(data: AuthResponse): void {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(data))
    setSession(data)
  }

  function logout(): void {
    localStorage.removeItem(AUTH_STORAGE_KEY)
    setSession(null)
  }

  return (
    <AuthContext.Provider value={{ session, login, logout, isAuthenticated: session !== null }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used inside AuthProvider.')
  }
  return context
}
