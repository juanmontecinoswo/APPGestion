import type { AuthState, UserAccount, UserRole } from '../types'
import { DEFAULT_ADMIN } from '../types'

const AUTH_KEY = 'mesura-auth-v1'
const SESSION_KEY = 'mesura-session-v1'

function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export async function hashPassword(password: string): Promise<string> {
  const data = new TextEncoder().encode(password)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

async function seedAuth(): Promise<AuthState> {
  const now = new Date().toISOString()
  const admin: UserAccount = {
    id: uid(),
    username: DEFAULT_ADMIN.username,
    displayName: DEFAULT_ADMIN.displayName,
    passwordHash: await hashPassword(DEFAULT_ADMIN.password),
    role: 'admin',
    active: true,
    createdAt: now,
    updatedAt: now,
  }
  const state = { users: [admin] }
  saveAuth(state)
  return state
}

export function loadAuth(): AuthState {
  try {
    const raw = localStorage.getItem(AUTH_KEY)
    if (!raw) return { users: [] }
    const parsed = JSON.parse(raw) as AuthState
    if (!Array.isArray(parsed.users)) return { users: [] }
    return parsed
  } catch {
    return { users: [] }
  }
}

export function saveAuth(state: AuthState): void {
  localStorage.setItem(AUTH_KEY, JSON.stringify(state))
}

export async function ensureAuthSeeded(): Promise<AuthState> {
  const current = loadAuth()
  if (current.users.length > 0) return current
  return seedAuth()
}

export function getSessionUserId(): string | null {
  return localStorage.getItem(SESSION_KEY)
}

export function setSessionUserId(userId: string | null): void {
  if (userId) localStorage.setItem(SESSION_KEY, userId)
  else localStorage.removeItem(SESSION_KEY)
}

export function findUserById(userId: string): UserAccount | null {
  return loadAuth().users.find((u) => u.id === userId) ?? null
}

export function findUserByUsername(username: string): UserAccount | null {
  const key = username.trim().toLowerCase()
  return (
    loadAuth().users.find((u) => u.username.toLowerCase() === key) ?? null
  )
}

export async function login(
  username: string,
  password: string,
): Promise<{ ok: true; user: UserAccount } | { ok: false; error: string }> {
  await ensureAuthSeeded()
  const user = findUserByUsername(username)
  if (!user || !user.active) {
    return { ok: false, error: 'Usuario o contraseña incorrectos.' }
  }
  const hash = await hashPassword(password)
  if (hash !== user.passwordHash) {
    return { ok: false, error: 'Usuario o contraseña incorrectos.' }
  }
  setSessionUserId(user.id)
  return { ok: true, user }
}

export function logout(): void {
  setSessionUserId(null)
}

export function publicUser(user: UserAccount): Omit<UserAccount, 'passwordHash'> {
  const { passwordHash: _, ...rest } = user
  return rest
}

export async function createUser(
  adminId: string,
  input: {
    username: string
    displayName: string
    password: string
    role?: UserRole
  },
): Promise<{ ok: true; user: UserAccount } | { ok: false; error: string }> {
  const auth = await ensureAuthSeeded()
  const admin = auth.users.find((u) => u.id === adminId)
  if (!admin || admin.role !== 'admin') {
    return { ok: false, error: 'Solo el administrador puede crear usuarios.' }
  }

  const username = input.username.trim().toLowerCase()
  const displayName = input.displayName.trim()
  if (!username || !displayName || !input.password) {
    return { ok: false, error: 'Completa todos los campos.' }
  }
  if (input.password.length < 6) {
    return { ok: false, error: 'La contraseña debe tener al menos 6 caracteres.' }
  }
  if (!/^[a-z0-9._-]{3,30}$/.test(username)) {
    return {
      ok: false,
      error: 'Usuario: 3-30 caracteres (letras, números, . _ -).',
    }
  }

  if (auth.users.some((u) => u.username.toLowerCase() === username)) {
    return { ok: false, error: 'Ese nombre de usuario ya existe.' }
  }

  const now = new Date().toISOString()
  const user: UserAccount = {
    id: uid(),
    username,
    displayName,
    passwordHash: await hashPassword(input.password),
    role: 'user',
    active: true,
    createdAt: now,
    updatedAt: now,
  }
  saveAuth({ users: [...auth.users, user] })
  return { ok: true, user }
}

export async function updateUserProfile(
  userId: string,
  patch: { displayName?: string; password?: string },
): Promise<{ ok: true; user: UserAccount } | { ok: false; error: string }> {
  const auth = loadAuth()
  const index = auth.users.findIndex((u) => u.id === userId)
  if (index < 0) return { ok: false, error: 'Usuario no encontrado.' }

  const current = auth.users[index]
  const displayName = patch.displayName?.trim() ?? current.displayName
  if (!displayName) return { ok: false, error: 'El nombre no puede estar vacío.' }

  let passwordHash = current.passwordHash
  if (patch.password != null && patch.password !== '') {
    if (patch.password.length < 6) {
      return { ok: false, error: 'La contraseña debe tener al menos 6 caracteres.' }
    }
    passwordHash = await hashPassword(patch.password)
  }

  const updated: UserAccount = {
    ...current,
    displayName,
    passwordHash,
    updatedAt: new Date().toISOString(),
  }
  const users = [...auth.users]
  users[index] = updated
  saveAuth({ users })
  return { ok: true, user: updated }
}

export async function adminUpdateUser(
  adminId: string,
  targetId: string,
  patch: {
    displayName?: string
    password?: string
    active?: boolean
  },
): Promise<{ ok: true; user: UserAccount } | { ok: false; error: string }> {
  const auth = loadAuth()
  const admin = auth.users.find((u) => u.id === adminId)
  if (!admin || admin.role !== 'admin') {
    return { ok: false, error: 'Solo el administrador puede hacer esto.' }
  }
  const index = auth.users.findIndex((u) => u.id === targetId)
  if (index < 0) return { ok: false, error: 'Usuario no encontrado.' }
  const target = auth.users[index]
  if (target.role === 'admin') {
    return { ok: false, error: 'No se puede gestionar otra cuenta administrador.' }
  }

  const displayName = patch.displayName?.trim() ?? target.displayName
  if (!displayName) return { ok: false, error: 'El nombre no puede estar vacío.' }

  let passwordHash = target.passwordHash
  if (patch.password != null && patch.password !== '') {
    if (patch.password.length < 6) {
      return { ok: false, error: 'La contraseña debe tener al menos 6 caracteres.' }
    }
    passwordHash = await hashPassword(patch.password)
  }

  const updated: UserAccount = {
    ...target,
    displayName,
    passwordHash,
    active: patch.active ?? target.active,
    updatedAt: new Date().toISOString(),
  }
  const users = [...auth.users]
  users[index] = updated
  saveAuth({ users })
  return { ok: true, user: updated }
}

export function adminDeleteUser(
  adminId: string,
  targetId: string,
): { ok: true } | { ok: false; error: string } {
  const auth = loadAuth()
  const admin = auth.users.find((u) => u.id === adminId)
  if (!admin || admin.role !== 'admin') {
    return { ok: false, error: 'Solo el administrador puede hacer esto.' }
  }
  const target = auth.users.find((u) => u.id === targetId)
  if (!target) return { ok: false, error: 'Usuario no encontrado.' }
  if (target.role === 'admin') {
    return { ok: false, error: 'No se puede eliminar la cuenta administrador.' }
  }
  saveAuth({ users: auth.users.filter((u) => u.id !== targetId) })
  try {
    localStorage.removeItem(`mesura-data-v1-${targetId}`)
    localStorage.removeItem(
      `mesura-data-v1-u-${target.username.trim().toLowerCase()}`,
    )
  } catch {
    /* ignore */
  }
  return { ok: true }
}

export function listManagedUsers(): UserAccount[] {
  return loadAuth()
    .users.filter((u) => u.role !== 'admin')
    .sort((a, b) => a.displayName.localeCompare(b.displayName, 'es'))
}
