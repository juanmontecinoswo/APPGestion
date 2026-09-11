import { useCallback, useEffect, useState } from 'react'
import type { UserAccount } from '../types'
import {
  ensureAuthSeeded,
  findUserById,
  getSessionUserId,
  login as authLogin,
  logout as authLogout,
  setSessionUserId,
} from '../lib/auth'

export function useAuth() {
  const [user, setUser] = useState<UserAccount | null>(null)
  const [booting, setBooting] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      await ensureAuthSeeded()
      if (cancelled) return
      const sessionId = getSessionUserId()
      if (sessionId) {
        const found = findUserById(sessionId)
        if (found && found.active) setUser(found)
        else setSessionUserId(null)
      }
      setBooting(false)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const refreshUser = useCallback(() => {
    const sessionId = getSessionUserId()
    if (!sessionId) {
      setUser(null)
      return
    }
    const found = findUserById(sessionId)
    setUser(found && found.active ? found : null)
  }, [])

  async function login(username: string, password: string) {
    setBusy(true)
    setError(null)
    try {
      const result = await authLogin(username, password)
      if (!result.ok) {
        setError(result.error)
        return false
      }
      setUser(result.user)
      return true
    } finally {
      setBusy(false)
    }
  }

  function logout() {
    authLogout()
    setUser(null)
    setError(null)
  }

  return {
    user,
    booting,
    busy,
    error,
    login,
    logout,
    refreshUser,
    clearError: () => setError(null),
  }
}
