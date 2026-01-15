import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { api, setAuthToken } from '../lib/api'
import { toast } from 'sonner'

export type User = {
  id: number
  name: string
  email: string
  role?: 'user' | 'moderator' | 'admin'
  avatar_url?: string | null
  bio?: string | null
}

type AuthState = {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string, bio?: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthState | undefined>(undefined)

const REFRESH_TOKEN_KEY = 'refreshToken'
const ACCESS_TOKEN_KEY = 'accessToken'
const USER_KEY = 'user'

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function refreshWithRetry(refreshToken: string, retries = 2) {
  let lastErr: unknown
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await api.post('/api/auth/refresh', { refreshToken })
    } catch (err) {
      lastErr = err
      if (attempt === retries) throw err
      await sleep(250 * (attempt + 1))
    }
  }
  throw lastErr
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const didBootstrapRefresh = useRef(false)
  const [user, setUser] = useState<User | null>(() => {
    try {
      const raw = localStorage.getItem(USER_KEY)
      return raw ? (JSON.parse(raw) as User) : null
    } catch {
      return null
    }
  })

  const [accessToken, setAccessToken] = useState<string | null>(() => {
    try {
      return sessionStorage.getItem(ACCESS_TOKEN_KEY)
    } catch {
      return null
    }
  })
  const [refreshToken, setRefreshToken] = useState<string | null>(() => {
    try {
      return localStorage.getItem(REFRESH_TOKEN_KEY) || sessionStorage.getItem(REFRESH_TOKEN_KEY)
    } catch {
      return null
    }
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    setAuthToken(accessToken)

    try {
      if (accessToken) {
        sessionStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
      } else {
        sessionStorage.removeItem(ACCESS_TOKEN_KEY)
      }
    } catch {
      // ignore
    }
  }, [accessToken])

  useEffect(() => {
    let cancelled = false

    async function hydrateUserFromAccessToken() {
      try {
        if (!accessToken || user) return
        const profile = await api.get('/api/users/profile', {
          headers: { Authorization: `Bearer ${accessToken}` },
        })
        if (!cancelled) {
          setUser(profile.data)
        }
      } catch {
        // ignore
      }
    }

    hydrateUserFromAccessToken()

    return () => {
      cancelled = true
    }
  }, [accessToken, user])

  useEffect(() => {
    try {
      if (user) {
        localStorage.setItem(USER_KEY, JSON.stringify(user))
      } else {
        localStorage.removeItem(USER_KEY)
      }
    } catch {
      // ignore
    }
  }, [user])

  useEffect(() => {
    let cancelled = false

    async function bootstrap() {
      try {
        if (didBootstrapRefresh.current) return
        didBootstrapRefresh.current = true
        if (!refreshToken) return

        const refreshed = await refreshWithRetry(refreshToken, 2)
        const newAccess = refreshed.data?.accessToken as string | undefined
        const newRefresh = refreshed.data?.refreshToken as string | undefined
        const newUser = refreshed.data?.user as User | undefined

        if (!newAccess || !newRefresh) return

        if (!cancelled) {
          setAccessToken(newAccess)
          setRefreshToken(newRefresh)
          localStorage.setItem(REFRESH_TOKEN_KEY, newRefresh)
          try {
            sessionStorage.setItem(REFRESH_TOKEN_KEY, newRefresh)
          } catch {
            // ignore
          }

          if (newUser) {
            setUser(newUser)
          } else {
            const profile = await api.get('/api/users/profile', {
              headers: { Authorization: `Bearer ${newAccess}` },
            })
            setUser(profile.data)
          }
        }
      } catch (err: any) {
        const status = err?.response?.status
        const msg = err?.response?.data?.message || err?.message || 'Erreur refresh'

        // On ne déconnecte PAS sur erreurs réseau/transitoires.
        // On déconnecte seulement si le refresh token est invalide/expiré.
        if (!cancelled && (status === 401 || status === 403)) {
          console.error('Auth refresh failed:', { status, msg })
          toast.error(status ? `${msg} (HTTP ${status})` : msg)
          setUser(null)
          setAccessToken(null)
          setRefreshToken(null)
          try {
            localStorage.removeItem(REFRESH_TOKEN_KEY)
            localStorage.removeItem(USER_KEY)
          } catch {
            // ignore
          }
          try {
            sessionStorage.removeItem(ACCESS_TOKEN_KEY)
            sessionStorage.removeItem(REFRESH_TOKEN_KEY)
          } catch {
            // ignore
          }
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    bootstrap()

    return () => {
      cancelled = true
    }
  }, [])

  async function login(email: string, password: string) {
    const res = await api.post('/api/auth/login', { email, password })
    const newAccess = res.data?.accessToken as string
    const newRefresh = res.data?.refreshToken as string
    const loggedUser = res.data?.user as User

    setAccessToken(newAccess)
    setRefreshToken(newRefresh)
    setUser(loggedUser)
    localStorage.setItem(REFRESH_TOKEN_KEY, newRefresh)
    try {
      sessionStorage.setItem(ACCESS_TOKEN_KEY, newAccess)
    } catch {
      // ignore
    }
    try {
      sessionStorage.setItem(REFRESH_TOKEN_KEY, newRefresh)
    } catch {
      // ignore
    }
    try {
      localStorage.setItem(USER_KEY, JSON.stringify(loggedUser))
    } catch {
      // ignore
    }
  }

  async function register(name: string, email: string, password: string, bio?: string) {
    await api.post('/api/auth/register', { name, email, password, bio: bio || null })
    await login(email, password)
  }

  async function logout() {
    try {
      if (refreshToken) {
        await api.post('/api/auth/logout', { refreshToken })
      }
    } finally {
      setUser(null)
      setAccessToken(null)
      setRefreshToken(null)
      try {
        localStorage.removeItem(REFRESH_TOKEN_KEY)
        localStorage.removeItem(USER_KEY)
      } catch {
        // ignore
      }

      try {
        sessionStorage.removeItem(ACCESS_TOKEN_KEY)
        sessionStorage.removeItem(REFRESH_TOKEN_KEY)
      } catch {
        // ignore
      }
    }
  }

  const value = useMemo<AuthState>(
    () => ({ user, accessToken, refreshToken, isLoading, login, register, logout }),
    [user, accessToken, refreshToken, isLoading]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
