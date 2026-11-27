import type { FormEvent } from 'react'
import { useState } from 'react'
import { DEFAULT_ADMIN } from '../types'

interface Props {
  busy: boolean
  error: string | null
  onLogin: (username: string, password: string) => Promise<boolean>
  onClearError: () => void
}

export function LoginScreen({ busy, error, onLogin, onClearError }: Props) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    onClearError()
    await onLogin(username, password)
  }

  return (
    <div className="login-screen">
      <div className="atmosphere" aria-hidden="true" />
      <div className="login-card">
        <p className="brand">Organizador</p>
        <h1>Inicia sesión</h1>
        <p className="login-card__lead">
          Accede a tu cuenta para gestionar finanzas, tareas y más.
        </p>

        <form className="form form--sheet" onSubmit={handleSubmit}>
          <label>
            Usuario
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              placeholder="admin"
              required
            />
          </label>
          <label>
            Contraseña
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              placeholder="••••••••"
              required
            />
          </label>
          {error && <p className="form-error">{error}</p>}
          <button
            type="submit"
            className="btn btn--primary login-card__submit"
            disabled={busy}
          >
            {busy ? 'Ingresando…' : 'Entrar'}
          </button>
        </form>

        <p className="login-card__hint">
          Admin inicial: <strong>{DEFAULT_ADMIN.username}</strong> /{' '}
          <strong>{DEFAULT_ADMIN.password}</strong>
        </p>
      </div>
    </div>
  )
}
