'use client'
import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface User {
  id: string
  name: string
  email: string
  role: string
  village?: { id: string; name: string } | null
}

interface AuthContextType {
  user: User | null
  token: string | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  loading: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const t = localStorage.getItem('token')
    if (t) {
      setToken(t)
      fetch('/api/auth/me', { headers: { Authorization: `Bearer ${t}` } })
        .then(r => r.json())
        .then(data => { if (data.user) setUser(data.user) })
        .catch(() => { localStorage.removeItem('token') })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const login = async (email: string, password: string) => {
    const res = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Login failed')
    localStorage.setItem('token', data.token)
    setToken(data.token)
    setUser(data.user)
  }

  const logout = () => {
    localStorage.removeItem('token')
    setToken(null)
    setUser(null)
    fetch('/api/auth/logout', { method: 'POST' })
    window.location.href = '/login'
  }

  return <AuthContext.Provider value={{ user, token, login, logout, loading }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}