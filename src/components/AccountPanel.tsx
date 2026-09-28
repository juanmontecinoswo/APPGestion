import type { FormEvent } from 'react'
import { useEffect, useRef, useState } from 'react'
import type { UserAccount } from '../types'
import {
  adminDeleteUser,
  adminUpdateUser,
  createUser,
  listManagedUsers,
  updateUserProfile,
} from '../lib/auth'
import { AddIconButton, FormSheet } from './FormSheet'

interface Props {
  user: UserAccount
  onUserChanged: () => void
  onDownloadBackup: () => void
  onUploadBackup: (file: File) => Promise<void>
  backupMessage?: string | null
  backupError?: string | null
}

export function AccountPanel({
  user,
  onUserChanged,
  onDownloadBackup,
  onUploadBackup,
  backupMessage = null,
  backupError = null,
}: Props) {
  const isAdmin = user.role === 'admin'
  const [displayName, setDisplayName] = useState(user.displayName)
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const backupInputRef = useRef<HTMLInputElement>(null)

  const [users, setUsers] = useState(() => listManagedUsers())
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editing, setEditing] = useState<UserAccount | null>(null)

  const [newUsername, setNewUsername] = useState('')
  const [newName, setNewName] = useState('')
  const [newPassword, setNewPassword] = useState('')

  const [editName, setEditName] = useState('')
  const [editPassword, setEditPassword] = useState('')

  useEffect(() => {
    setDisplayName(user.displayName)
  }, [user.displayName])

  function refreshUsers() {
    setUsers(listManagedUsers())
  }

  async function handleProfileSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      const result = await updateUserProfile(user.id, {
        displayName,
        password: password || undefined,
      })
      if (!result.ok) {
        setError(result.error)
        return
      }
      setPassword('')
      setMessage('Datos de la cuenta actualizados.')
      onUserChanged()
    } finally {
      setBusy(false)
    }
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      const result = await createUser(user.id, {
        username: newUsername,
        displayName: newName,
        password: newPassword,
      })
      if (!result.ok) {
        setError(result.error)
        return
      }
      setCreateOpen(false)
      setNewUsername('')
      setNewName('')
      setNewPassword('')
      setMessage(`Cuenta "${result.user.username}" creada.`)
      refreshUsers()
    } finally {
      setBusy(false)
    }
  }

  function openEdit(target: UserAccount) {
    setEditing(target)
    setEditName(target.displayName)
    setEditPassword('')
    setEditOpen(true)
  }

  async function handleEdit(e: FormEvent) {
    e.preventDefault()
    if (!editing) return
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      const result = await adminUpdateUser(user.id, editing.id, {
        displayName: editName,
        password: editPassword || undefined,
      })
      if (!result.ok) {
        setError(result.error)
        return
      }
      setEditOpen(false)
      setEditing(null)
      setMessage('Usuario actualizado.')
      refreshUsers()
    } finally {
      setBusy(false)
    }
  }

  async function toggleActive(target: UserAccount) {
    setError(null)
    const result = await adminUpdateUser(user.id, target.id, {
      active: !target.active,
    })
    if (!result.ok) {
      setError(result.error)
      return
    }
    refreshUsers()
  }

  function removeUser(target: UserAccount) {
    if (!window.confirm(`¿Eliminar la cuenta de ${target.displayName}?`)) return
    const result = adminDeleteUser(user.id, target.id)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setMessage('Usuario eliminado.')
    refreshUsers()
  }

  return (
    <div className="finanzas-stack">
      <section className="panel" aria-labelledby="account-title">
        <header className="panel__head">
          <h2 id="account-title">Mi cuenta</h2>
          <p>
            {isAdmin
              ? 'Administrador: puedes cambiar tus datos y gestionar usuarios.'
              : 'Actualiza tu nombre y contraseña.'}
          </p>
        </header>

        <form className="form form--sheet" onSubmit={handleProfileSubmit}>
          <div className="form__row">
            <label>
              Usuario
              <input value={user.username} disabled />
            </label>
            <label>
              Rol
              <input
                value={isAdmin ? 'Administrador' : 'Usuario'}
                disabled
              />
            </label>
          </div>
          <label>
            Nombre
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
            />
          </label>
          <label>
            Nueva contraseña
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Dejar vacío para no cambiar"
              autoComplete="new-password"
            />
          </label>
          {error && <p className="form-error">{error}</p>}
          {message && <p className="form-success">{message}</p>}
          <div className="form__actions">
            <button type="submit" className="btn btn--primary" disabled={busy}>
              Guardar cambios
            </button>
          </div>
        </form>
      </section>

      <section className="panel" aria-labelledby="backup-title">
        <header className="panel__head">
          <h2 id="backup-title">Respaldo de datos</h2>
          <p>
            Guarda un archivo JSON con toda la información de tu usuario
            (gastos, tareas, recordatorios, trabajo y calendario) o restáurala
            desde un backup anterior.
          </p>
        </header>

        <div className="backup-actions">
          <button
            type="button"
            className="btn btn--primary"
            onClick={onDownloadBackup}
          >
            Guardar backup
          </button>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => backupInputRef.current?.click()}
          >
            Cargar backup
          </button>
          <input
            ref={backupInputRef}
            className="sidebar__backup-input"
            type="file"
            accept="application/json,.json"
            aria-label="Seleccionar archivo de backup"
            onChange={(e) => {
              const file = e.target.files?.[0] ?? null
              if (!file) return
              void onUploadBackup(file).finally(() => {
                if (backupInputRef.current) backupInputRef.current.value = ''
              })
            }}
          />
        </div>
        {backupError && <p className="form-error">{backupError}</p>}
        {backupMessage && <p className="form-success">{backupMessage}</p>}
        <p className="backup-hint">
          Al cargar un archivo se reemplazan solo los datos de tu sesión actual.
          Las cuentas de otros usuarios no se modifican.
        </p>
      </section>

      {isAdmin && (
        <section className="panel panel--users" aria-labelledby="users-title">
          <header className="panel__head panel__head--row">
            <div>
              <h2 id="users-title">Usuarios</h2>
              <p>Crea y gestiona cuentas que no son administrador.</p>
            </div>
            <AddIconButton
              label="Crear usuario"
              onClick={() => setCreateOpen(true)}
            />
          </header>

          <ul className="list">
            {users.length === 0 && (
              <li className="list__empty">Aún no hay usuarios creados.</li>
            )}
            {users.map((item) => (
              <li key={item.id} className="list__item">
                <div className="list__main">
                  <div className="list__title-row">
                    <strong>{item.displayName}</strong>
                    <span
                      className={`chip chip--status chip--${item.active ? 'en_curso' : 'pendiente'}`}
                    >
                      {item.active ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                  <div className="list__meta">
                    <span>@{item.username}</span>
                    <span>Usuario</span>
                  </div>
                </div>
                <div className="list__ops">
                  <button
                    type="button"
                    className="btn btn--tiny"
                    onClick={() => openEdit(item)}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    className="btn btn--tiny"
                    onClick={() => toggleActive(item)}
                  >
                    {item.active ? 'Desactivar' : 'Activar'}
                  </button>
                  <button
                    type="button"
                    className="btn btn--tiny btn--danger"
                    onClick={() => removeUser(item)}
                  >
                    Borrar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <FormSheet
        open={createOpen}
        title="Nuevo usuario"
        description="Se crea una cuenta normal (sin permisos de administrador)."
        onClose={() => setCreateOpen(false)}
      >
        <form className="form form--sheet" onSubmit={handleCreate}>
          <label>
            Nombre
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              required
            />
          </label>
          <label>
            Usuario
            <input
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              placeholder="ej. maria"
              required
            />
          </label>
          <label>
            Contraseña
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={6}
            />
          </label>
          {error && <p className="form-error">{error}</p>}
          <div className="form__actions">
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => setCreateOpen(false)}
            >
              Cancelar
            </button>
            <button type="submit" className="btn btn--primary" disabled={busy}>
              Crear cuenta
            </button>
          </div>
        </form>
      </FormSheet>

      <FormSheet
        open={editOpen}
        title="Editar usuario"
        description={
          editing
            ? `Gestionar cuenta de @${editing.username}`
            : 'Gestionar usuario'
        }
        onClose={() => setEditOpen(false)}
      >
        <form className="form form--sheet" onSubmit={handleEdit}>
          <label>
            Nombre
            <input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              required
            />
          </label>
          <label>
            Nueva contraseña
            <input
              type="password"
              value={editPassword}
              onChange={(e) => setEditPassword(e.target.value)}
              placeholder="Opcional"
            />
          </label>
          {error && <p className="form-error">{error}</p>}
          <div className="form__actions">
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => setEditOpen(false)}
            >
              Cancelar
            </button>
            <button type="submit" className="btn btn--primary" disabled={busy}>
              Guardar
            </button>
          </div>
        </form>
      </FormSheet>
    </div>
  )
}
