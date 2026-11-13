import type {
  AppState,
  Expense,
  ProjectEdge,
  ProjectNode,
  ProjectNodeTone,
  ProjectPort,
  RecurrenceEnd,
  RecurringExpense,
  Reminder,
  Task,
  WorkDayEntry,
  WorkItem,
  WorkLink,
  WorkNote,
  WorkProject,
} from '../types'

const PROJECT_PORTS: ProjectPort[] = ['n', 'e', 's', 'w']
const PROJECT_TONES: ProjectNodeTone[] = [
  'sky',
  'mint',
  'sand',
  'coral',
  'violet',
]

const STORAGE_PREFIX = 'mesura-data-v1-'
const USERNAME_PREFIX = 'mesura-data-v1-u-'
const AUTO_BACKUP_PREFIX = 'organizador-auto-backups-v1-'
const LEGACY_STORAGE_KEY = 'mesura-v3'
const MAX_AUTO_BACKUPS = 10
const AUTO_BACKUP_THROTTLE_MS = 30_000

const lastAutoBackupWrite = new Map<string, number>()

function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

function dataKeyByUserId(userId: string): string {
  return `${STORAGE_PREFIX}${userId}`
}

function dataKeyByUsername(username: string): string {
  return `${USERNAME_PREFIX}${username.trim().toLowerCase()}`
}

/** Clave estable: preferimos username para no perder datos si el id de cuenta cambia. */
function resolveDataKey(userId: string, username?: string): string {
  if (username?.trim()) return dataKeyByUsername(username)
  return dataKeyByUserId(userId)
}

function readRawStorage(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function listOrphanDataKeys(excludeKeys: string[]): string[] {
  const excluded = new Set(excludeKeys)
  const found: string[] = []
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (!key || excluded.has(key)) continue
      if (key.startsWith(AUTO_BACKUP_PREFIX)) continue
      if (
        key.startsWith(STORAGE_PREFIX) ||
        key.startsWith(USERNAME_PREFIX) ||
        key === LEGACY_STORAGE_KEY
      ) {
        found.push(key)
      }
    }
  } catch {
    return []
  }
  return found
}

function scoreStateSize(raw: string): number {
  try {
    const parsed = JSON.parse(raw) as Partial<AppState>
    return (
      (parsed.tasks?.length ?? 0) +
      (parsed.expenses?.length ?? 0) +
      (parsed.reminders?.length ?? 0) +
      (parsed.workItems?.length ?? 0) +
      (parsed.workNotes?.length ?? 0) +
      (parsed.workLinks?.length ?? 0) +
      (parsed.workDayEntries?.length ?? 0) +
      (parsed.workProjects?.length ?? 0) +
      (parsed.recurringExpenses?.length ?? 0)
    )
  } catch {
    return 0
  }
}

export function monthKeyFromDate(date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

export function dayKeyFromDate(date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function parseMonthKey(key: string): { year: number; month: number } {
  const [y, m] = key.split('-').map(Number)
  return { year: y, month: m }
}

export function formatMonthLabel(key: string): string {
  const { year, month } = parseMonthKey(key)
  const date = new Date(year, month - 1, 1)
  const label = date.toLocaleDateString('es-CL', {
    month: 'long',
    year: 'numeric',
  })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

export function shiftMonth(key: string, delta: number): string {
  const { year, month } = parseMonthKey(key)
  const d = new Date(year, month - 1 + delta, 1)
  return monthKeyFromDate(d)
}

export function daysInMonth(key: string): number {
  const { year, month } = parseMonthKey(key)
  return new Date(year, month, 0).getDate()
}

export function monthIndex(startKey: string, targetKey: string): number {
  const start = parseMonthKey(startKey)
  const target = parseMonthKey(targetKey)
  return (target.year - start.year) * 12 + (target.month - start.month)
}

export function formatMoney(amount: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(Math.round(amount))
}

export function parseAmountInput(input: string): number | null {
  const trimmed = input.trim()
  if (!trimmed) return null
  const parsed = Math.round(
    Number(trimmed.replace(/[.\s]/g, '').replace(',', '.')),
  )
  if (Number.isNaN(parsed) || parsed < 0) return null
  return parsed
}

export function paidExpenseTotal(expenses: Expense[]): number {
  return expenses
    .filter((e) => e.paid && e.amount != null)
    .reduce((sum, e) => sum + (e.amount ?? 0), 0)
}

export function shouldGenerateRecurring(
  template: RecurringExpense,
  targetMonth: string,
): boolean {
  if (!template.active) return false
  if (targetMonth < template.startMonthKey) return false
  const index = monthIndex(template.startMonthKey, targetMonth)
  if (template.recurrenceEnd === 'months' && template.recurrenceMonths != null) {
    return index < template.recurrenceMonths
  }
  return true
}

export function recurringEndLabel(
  template: RecurringExpense,
  currentMonth: string,
): string {
  if (!template.active) return 'Detenido'
  if (template.recurrenceEnd === 'manual') return 'Fin manual'
  const index = monthIndex(template.startMonthKey, currentMonth)
  const remaining = Math.max(0, (template.recurrenceMonths ?? 0) - index - 1)
  return `${template.recurrenceMonths} meses · quedan ${remaining}`
}

function migrateExpense(expense: Expense): Expense {
  return {
    ...expense,
    recurringId: expense.recurringId ?? null,
    paid: expense.paid ?? (expense.amount != null && expense.amount > 0),
  }
}

export function expenseFromRecurring(
  template: RecurringExpense,
  monthKey: string,
): Expense {
  return createExpense({
    title: template.title,
    amount: template.plannedAmount,
    category: template.category,
    kind: template.kind,
    paid: false,
    recurringId: template.id,
    monthKey,
    day: template.day,
    notes: template.notes,
  })
}

function seedState(monthKey: string): AppState {
  const now = new Date().toISOString()
  const arriendoId = uid()
  const internetId = uid()

  const recurringExpenses: RecurringExpense[] = [
    {
      id: arriendoId,
      title: 'Arriendo',
      plannedAmount: 450000,
      category: 'Vivienda',
      kind: 'fijo',
      day: 1,
      notes: 'Cargo automático',
      startMonthKey: monthKey,
      recurrenceEnd: 'manual',
      recurrenceMonths: null,
      active: true,
      createdAt: now,
    },
    {
      id: internetId,
      title: 'Internet + móvil',
      plannedAmount: 35990,
      category: 'Servicios',
      kind: 'mensual',
      day: 10,
      notes: '',
      startMonthKey: monthKey,
      recurrenceEnd: 'months',
      recurrenceMonths: 12,
      active: true,
      createdAt: now,
    },
  ]

  const tasks: Task[] = [
    {
      id: uid(),
      title: 'Revisar cartola bancaria',
      notes: 'Comprobar cargos duplicados',
      importance: 'alta',
      recurrence: 'mensual',
      monthKey,
      dueDay: 5,
      done: false,
      createdAt: now,
    },
    {
      id: uid(),
      title: 'Pagar arriendo',
      notes: '',
      importance: 'alta',
      recurrence: 'fija',
      monthKey,
      dueDay: 1,
      done: false,
      createdAt: now,
    },
  ]

  const expenses: Expense[] = [
    {
      id: uid(),
      title: 'Arriendo',
      amount: 450000,
      category: 'Vivienda',
      kind: 'fijo',
      paid: true,
      recurringId: arriendoId,
      monthKey,
      day: 1,
      notes: 'Cargo automático',
      createdAt: now,
    },
    {
      id: uid(),
      title: 'Supermercado',
      amount: 78500,
      category: 'Comida',
      kind: 'unico',
      paid: true,
      recurringId: null,
      monthKey,
      day: new Date().getDate(),
      notes: '',
      createdAt: now,
    },
    expenseFromRecurring(
      recurringExpenses.find((r) => r.id === internetId)!,
      monthKey,
    ),
  ]

  const reminders: Reminder[] = [
    {
      id: uid(),
      title: 'Pagar tarjeta de crédito',
      notes: 'Antes de la fecha de facturación',
      importance: 'alta',
      recurrence: 'mensual',
      monthKey,
      dueDay: 12,
      time: '09:00',
      done: false,
      createdAt: now,
    },
  ]

  const workItems: WorkItem[] = [
    {
      id: uid(),
      title: 'Enviar informe semanal',
      project: 'Equipo interno',
      notes: 'Resumen de avances',
      importance: 'alta',
      status: 'pendiente',
      recurrence: 'mensual',
      monthKey,
      dueDay: 7,
      createdAt: now,
    },
  ]

  const workNotes: WorkNote[] = []
  const workLinks: WorkLink[] = []
  const workDayEntries: WorkDayEntry[] = []
  const workProjects: WorkProject[] = []

  return {
    tasks,
    expenses,
    recurringExpenses,
    reminders,
    workItems,
    workNotes,
    workLinks,
    workDayEntries,
    workProjects,
  }
}

function migrateLegacyRecurring(
  expenses: Expense[],
  recurring: RecurringExpense[],
): { expenses: Expense[]; recurringExpenses: RecurringExpense[] } {
  const templates = [...recurring]
  const migrated = expenses.map((expense) => {
    if (expense.recurringId) return expense
    if (expense.kind !== 'fijo' && expense.kind !== 'mensual') {
      return { ...expense, recurringId: null }
    }

    let template = templates.find(
      (item) => item.title === expense.title && item.kind === expense.kind,
    )
    if (!template) {
      template = createRecurringExpense({
        title: expense.title,
        plannedAmount: expense.amount,
        category: expense.category,
        kind: expense.kind,
        day: expense.day,
        notes: expense.notes,
        startMonthKey: expense.monthKey,
        recurrenceEnd: 'manual',
        recurrenceMonths: null,
        active: true,
      })
      templates.push(template)
    }

    return { ...expense, recurringId: template.id }
  })

  return { expenses: migrated, recurringExpenses: templates }
}

function normalizeState(raw: Partial<AppState>): AppState {
  const baseExpenses = (raw.expenses ?? []).map((expense) =>
    migrateExpense(expense as Expense),
  )
  const legacy = migrateLegacyRecurring(
    baseExpenses,
    raw.recurringExpenses ?? [],
  )

  return {
    tasks: raw.tasks ?? [],
    expenses: legacy.expenses,
    recurringExpenses: legacy.recurringExpenses,
    reminders: raw.reminders ?? [],
    workItems: raw.workItems ?? [],
    workNotes: (raw.workNotes ?? []).map((note) => ({
      id: note.id,
      title: note.title ?? '',
      body: note.body ?? '',
      createdAt: note.createdAt ?? new Date().toISOString(),
      updatedAt: note.updatedAt ?? note.createdAt ?? new Date().toISOString(),
    })),
    workLinks: (raw.workLinks ?? []).map((link) => ({
      id: link.id,
      title: link.title ?? '',
      url: link.url ?? '',
      description: link.description ?? '',
      createdAt: link.createdAt ?? new Date().toISOString(),
    })),
    workDayEntries: (raw.workDayEntries ?? [])
      .map((entry) => {
        const legacy = entry as {
          id?: string
          dateKey?: string
          text?: string
          value?: unknown
          createdAt?: string
        }
        const text =
          typeof legacy.text === 'string'
            ? legacy.text.trim()
            : legacy.value != null
              ? String(legacy.value).trim()
              : ''
        if (!legacy.id || !legacy.dateKey || !text) return null
        return {
          id: legacy.id,
          dateKey: legacy.dateKey,
          text,
          createdAt: legacy.createdAt ?? new Date().toISOString(),
        } satisfies WorkDayEntry
      })
      .filter((entry): entry is WorkDayEntry => entry != null),
    workProjects: (raw.workProjects ?? [])
      .map((project) => normalizeWorkProject(project))
      .filter((project): project is WorkProject => project != null),
  }
}

function normalizeWorkProject(raw: Partial<WorkProject>): WorkProject | null {
  if (!raw.id || typeof raw.title !== 'string') return null
  const now = new Date().toISOString()
  const nodes = (raw.nodes ?? [])
    .map((node) => normalizeProjectNode(node))
    .filter((node): node is ProjectNode => node != null)
  const nodeIds = new Set(nodes.map((node) => node.id))
  const edges = (raw.edges ?? [])
    .map((edge) => normalizeProjectEdge(edge, nodeIds))
    .filter((edge): edge is ProjectEdge => edge != null)
  return {
    id: raw.id,
    title: raw.title.trim() || 'Proyecto',
    nodes,
    edges,
    createdAt: raw.createdAt ?? now,
    updatedAt: raw.updatedAt ?? raw.createdAt ?? now,
  }
}

function normalizeProjectNode(raw: Partial<ProjectNode>): ProjectNode | null {
  if (!raw.id) return null
  const tone = PROJECT_TONES.includes(raw.tone as ProjectNodeTone)
    ? (raw.tone as ProjectNodeTone)
    : 'sky'
  return {
    id: raw.id,
    title: typeof raw.title === 'string' ? raw.title : 'Ventana',
    points: Array.isArray(raw.points)
      ? raw.points.filter((p): p is string => typeof p === 'string')
      : [],
    x: Number.isFinite(raw.x) ? Number(raw.x) : 40,
    y: Number.isFinite(raw.y) ? Number(raw.y) : 40,
    tone,
  }
}

function normalizeProjectEdge(
  raw: Partial<ProjectEdge>,
  nodeIds: Set<string>,
): ProjectEdge | null {
  if (!raw.id || !raw.fromId || !raw.toId) return null
  if (!nodeIds.has(raw.fromId) || !nodeIds.has(raw.toId)) return null
  const fromPort = PROJECT_PORTS.includes(raw.fromPort as ProjectPort)
    ? (raw.fromPort as ProjectPort)
    : 'e'
  const toPort = PROJECT_PORTS.includes(raw.toPort as ProjectPort)
    ? (raw.toPort as ProjectPort)
    : 'w'
  return {
    id: raw.id,
    fromId: raw.fromId,
    fromPort,
    toId: raw.toId,
    toPort,
  }
}

export function loadState(userId: string, username?: string): AppState {
  const primaryKey = resolveDataKey(userId, username)
  const legacyUserIdKey = dataKeyByUserId(userId)

  try {
    let sourceKey: string | null = null
    let raw =
      readRawStorage(primaryKey) ??
      (primaryKey !== legacyUserIdKey ? readRawStorage(legacyUserIdKey) : null) ??
      readRawStorage(LEGACY_STORAGE_KEY)

    if (raw) {
      if (readRawStorage(primaryKey)) sourceKey = primaryKey
      else if (readRawStorage(legacyUserIdKey)) sourceKey = legacyUserIdKey
      else sourceKey = LEGACY_STORAGE_KEY
    }

    // Si no hay datos para este usuario, recupera un respaldo huérfano del mismo navegador
    if (!raw) {
      const orphans = listOrphanDataKeys([primaryKey, legacyUserIdKey])
      if (orphans.length > 0) {
        let bestKey = orphans[0]
        let bestScore = -1
        for (const key of orphans) {
          const candidate = readRawStorage(key)
          if (!candidate) continue
          const score = scoreStateSize(candidate)
          if (score > bestScore) {
            bestScore = score
            bestKey = key
            raw = candidate
            sourceKey = key
          }
        }
        if (bestScore <= 0) {
          raw = null
          sourceKey = null
        } else if (bestKey) {
          sourceKey = bestKey
        }
      }
    }

    if (!raw) {
      const initial = seedState(monthKeyFromDate())
      saveState(userId, initial, username)
      return initial
    }

    const parsed = normalizeState(JSON.parse(raw) as Partial<AppState>)
    if (!Array.isArray(parsed.tasks) || !Array.isArray(parsed.expenses)) {
      throw new Error('invalid')
    }

    // Migrar a la clave estable por username
    saveState(userId, parsed, username)
    if (sourceKey && sourceKey !== primaryKey) {
      try {
        if (sourceKey === LEGACY_STORAGE_KEY || sourceKey === legacyUserIdKey) {
          localStorage.removeItem(sourceKey)
        }
      } catch {
        // ignore
      }
    }
    return parsed
  } catch {
    const fallback = seedState(monthKeyFromDate())
    saveState(userId, fallback, username)
    return fallback
  }
}

export function saveState(
  userId: string,
  state: AppState,
  username?: string,
): void {
  const key = resolveDataKey(userId, username)
  localStorage.setItem(key, JSON.stringify(state))
  // Mantener también la clave por id durante la transición
  if (username?.trim()) {
    try {
      localStorage.setItem(dataKeyByUserId(userId), JSON.stringify(state))
    } catch {
      // ignore
    }
  }
  ensureDailyAutoBackup(userId, state, username)
}

export interface AutoBackupInfo {
  dayKey: string
  createdAt: string
  label: string
}

interface AutoBackupEntry {
  dayKey: string
  createdAt: string
  data: AppState
}

interface AutoBackupVault {
  entries: AutoBackupEntry[]
}

function autoBackupKey(userId: string, username?: string): string {
  const slug = username?.trim()
    ? username.trim().toLowerCase()
    : userId
  return `${AUTO_BACKUP_PREFIX}${slug}`
}

function formatAutoBackupLabel(dayKey: string, createdAt: string): string {
  const date = new Date(`${dayKey}T12:00:00`)
  const dayLabel = Number.isNaN(date.getTime())
    ? dayKey
    : date.toLocaleDateString('es-CL', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
  const time = new Date(createdAt)
  const timeLabel = Number.isNaN(time.getTime())
    ? ''
    : time.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })
  return timeLabel ? `${dayLabel} · ${timeLabel}` : dayLabel
}

function loadAutoBackupVault(
  userId: string,
  username?: string,
): AutoBackupVault {
  try {
    const raw = localStorage.getItem(autoBackupKey(userId, username))
    if (!raw) return { entries: [] }
    const parsed = JSON.parse(raw) as Partial<AutoBackupVault>
    const entries = Array.isArray(parsed.entries)
      ? parsed.entries
          .map((entry) => {
            if (!entry?.dayKey || !entry.data) return null
            return {
              dayKey: entry.dayKey,
              createdAt: entry.createdAt ?? new Date().toISOString(),
              data: normalizeState(entry.data),
            } satisfies AutoBackupEntry
          })
          .filter((entry): entry is AutoBackupEntry => entry != null)
      : []
    return { entries }
  } catch {
    return { entries: [] }
  }
}

function saveAutoBackupVault(
  userId: string,
  vault: AutoBackupVault,
  username?: string,
): void {
  localStorage.setItem(
    autoBackupKey(userId, username),
    JSON.stringify(vault),
  )
}

/**
 * Crea o actualiza el respaldo del día y mantiene como máximo 10 días.
 * Al agregar un día nuevo, elimina el más antiguo.
 */
export function ensureDailyAutoBackup(
  userId: string,
  state: AppState,
  username?: string,
  options?: { force?: boolean },
): AutoBackupInfo | null {
  const dayKey = dayKeyFromDate()
  const mapKey = autoBackupKey(userId, username)
  const now = Date.now()
  const lastWrite = lastAutoBackupWrite.get(mapKey) ?? 0
  const vault = loadAutoBackupVault(userId, username)
  const hasToday = vault.entries.some((entry) => entry.dayKey === dayKey)

  if (
    !options?.force &&
    hasToday &&
    now - lastWrite < AUTO_BACKUP_THROTTLE_MS
  ) {
    return null
  }

  const snapshot = normalizeState(state)
  const createdAt = new Date().toISOString()
  const withoutToday = vault.entries.filter((entry) => entry.dayKey !== dayKey)
  const nextEntries: AutoBackupEntry[] = [
    { dayKey, createdAt, data: snapshot },
    ...withoutToday,
  ]
    .sort((a, b) => b.dayKey.localeCompare(a.dayKey))
    .slice(0, MAX_AUTO_BACKUPS)

  saveAutoBackupVault(userId, { entries: nextEntries }, username)
  lastAutoBackupWrite.set(mapKey, now)

  return {
    dayKey,
    createdAt,
    label: formatAutoBackupLabel(dayKey, createdAt),
  }
}

export function listAutoBackups(
  userId: string,
  username?: string,
): AutoBackupInfo[] {
  return loadAutoBackupVault(userId, username)
    .entries.slice()
    .sort((a, b) => b.dayKey.localeCompare(a.dayKey))
    .map((entry) => ({
      dayKey: entry.dayKey,
      createdAt: entry.createdAt,
      label: formatAutoBackupLabel(entry.dayKey, entry.createdAt),
    }))
}

export function restoreAutoBackup(
  userId: string,
  dayKey: string,
  username?: string,
): AppState {
  const entry = loadAutoBackupVault(userId, username).entries.find(
    (item) => item.dayKey === dayKey,
  )
  if (!entry) {
    throw new Error('No se encontró ese respaldo automático.')
  }
  const next = normalizeState(entry.data)
  saveState(userId, next, username)
  return next
}

export interface UserBackupMeta {
  id: string
  username: string
  displayName: string
}

export interface UserBackupFile {
  app: 'organizador'
  version: 1
  exportedAt: string
  user: UserBackupMeta
  data: AppState
}

export function createUserBackup(
  user: UserBackupMeta,
  state: AppState,
): UserBackupFile {
  return {
    app: 'organizador',
    version: 1,
    exportedAt: new Date().toISOString(),
    user: {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
    },
    data: normalizeState(state),
  }
}

export function downloadUserBackup(
  user: UserBackupMeta,
  state: AppState,
): void {
  const backup = createUserBackup(user, state)
  const stamp = backup.exportedAt.slice(0, 10)
  const safeName = user.username.replace(/[^a-zA-Z0-9_-]+/g, '_') || 'usuario'
  const blob = new Blob([JSON.stringify(backup, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `organizador-backup-${safeName}-${stamp}.json`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export function parseUserBackup(raw: unknown): AppState {
  if (!raw || typeof raw !== 'object') {
    throw new Error('El archivo de backup no es válido.')
  }
  const file = raw as Partial<UserBackupFile> & { data?: Partial<AppState> }
  const source =
    file.app === 'organizador' && file.data && typeof file.data === 'object'
      ? file.data
      : (raw as Partial<AppState>)

  const parsed = normalizeState(source)
  if (!Array.isArray(parsed.tasks) || !Array.isArray(parsed.expenses)) {
    throw new Error('El backup no contiene datos reconocibles.')
  }
  return parsed
}

export async function readBackupFile(file: File): Promise<AppState> {
  const text = await file.text()
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('No se pudo leer el archivo JSON.')
  }
  return parseUserBackup(parsed)
}

export function importUserBackup(
  userId: string,
  state: AppState,
  username?: string,
): AppState {
  const next = normalizeState(state)
  saveState(userId, next, username)
  return next
}

export function createTask(
  partial: Omit<Task, 'id' | 'createdAt' | 'done'>,
): Task {
  return {
    ...partial,
    id: uid(),
    done: false,
    createdAt: new Date().toISOString(),
  }
}

export function createExpense(
  partial: Omit<Expense, 'id' | 'createdAt'>,
): Expense {
  return {
    ...partial,
    id: uid(),
    createdAt: new Date().toISOString(),
  }
}

export function createRecurringExpense(
  partial: Omit<RecurringExpense, 'id' | 'createdAt'>,
): RecurringExpense {
  return {
    ...partial,
    id: uid(),
    createdAt: new Date().toISOString(),
  }
}

export function createReminder(
  partial: Omit<Reminder, 'id' | 'createdAt' | 'done'>,
): Reminder {
  return {
    ...partial,
    id: uid(),
    done: false,
    createdAt: new Date().toISOString(),
  }
}

export function createWorkItem(
  partial: Omit<WorkItem, 'id' | 'createdAt'>,
): WorkItem {
  return {
    ...partial,
    id: uid(),
    createdAt: new Date().toISOString(),
  }
}

export function createWorkNote(
  partial: Omit<WorkNote, 'id' | 'createdAt' | 'updatedAt'>,
): WorkNote {
  const now = new Date().toISOString()
  return {
    ...partial,
    id: uid(),
    createdAt: now,
    updatedAt: now,
  }
}

export function createWorkLink(
  partial: Omit<WorkLink, 'id' | 'createdAt'>,
): WorkLink {
  return {
    ...partial,
    id: uid(),
    createdAt: new Date().toISOString(),
  }
}

export function createWorkDayEntry(
  partial: Omit<WorkDayEntry, 'id' | 'createdAt'>,
): WorkDayEntry {
  return {
    ...partial,
    id: uid(),
    createdAt: new Date().toISOString(),
  }
}

export function createWorkProject(
  partial: Pick<WorkProject, 'title'> &
    Partial<Pick<WorkProject, 'nodes' | 'edges'>>,
): WorkProject {
  const now = new Date().toISOString()
  return {
    id: uid(),
    title: partial.title.trim() || 'Proyecto',
    nodes: partial.nodes ?? [],
    edges: partial.edges ?? [],
    createdAt: now,
    updatedAt: now,
  }
}

export function createProjectNode(
  partial?: Partial<Omit<ProjectNode, 'id'>>,
): ProjectNode {
  return {
    id: uid(),
    title: partial?.title?.trim() || 'Nueva ventana',
    points: partial?.points ?? [],
    x: partial?.x ?? 80,
    y: partial?.y ?? 80,
    tone: partial?.tone ?? 'sky',
  }
}

export function createProjectEdge(
  partial: Omit<ProjectEdge, 'id'>,
): ProjectEdge {
  return {
    ...partial,
    id: uid(),
  }
}

export function dateKeyFromParts(monthKey: string, day: number): string {
  return `${monthKey}-${String(day).padStart(2, '0')}`
}

function cloneRecurringByMonth<T extends { monthKey: string; recurrence?: RecurrenceKind }>(
  items: T[],
  targetMonth: string,
  isRecurring: (item: T) => boolean,
  clone: (item: T) => T,
): T[] {
  const hasAnyForMonth = items.some((item) => item.monthKey === targetMonth)
  if (hasAnyForMonth) return items

  const recurring = items.filter(isRecurring)
  if (recurring.length === 0) return items

  const months = [...new Set(recurring.map((item) => item.monthKey))].sort()
  const sourceMonth =
    [...months].reverse().find((m) => m < targetMonth) ??
    months[months.length - 1]

  const clones = recurring
    .filter((item) => item.monthKey === sourceMonth)
    .map(clone)

  return [...items, ...clones]
}

type RecurrenceKind = 'fija' | 'mensual'

export function ensureMonthlyTasks(
  tasks: Task[],
  targetMonth: string,
): Task[] {
  return cloneRecurringByMonth(
    tasks,
    targetMonth,
    (t) => t.recurrence === 'mensual',
    (t) =>
      createTask({
        title: t.title,
        notes: t.notes,
        importance: t.importance,
        recurrence: 'mensual',
        monthKey: targetMonth,
        dueDay: t.dueDay,
      }),
  )
}

export function ensureMonthlyExpenses(
  expenses: Expense[],
  recurringExpenses: RecurringExpense[],
  targetMonth: string,
): Expense[] {
  let next = expenses
  for (const template of recurringExpenses) {
    if (!shouldGenerateRecurring(template, targetMonth)) continue
    const exists = next.some(
      (expense) =>
        expense.recurringId === template.id &&
        expense.monthKey === targetMonth,
    )
    if (!exists) {
      next = [...next, expenseFromRecurring(template, targetMonth)]
    }
  }
  return next
}

export function ensureMonthlyReminders(
  reminders: Reminder[],
  targetMonth: string,
): Reminder[] {
  return cloneRecurringByMonth(
    reminders,
    targetMonth,
    (r) => r.recurrence === 'mensual',
    (r) =>
      createReminder({
        title: r.title,
        notes: r.notes,
        importance: r.importance,
        recurrence: 'mensual',
        monthKey: targetMonth,
        dueDay: r.dueDay,
        time: r.time,
      }),
  )
}

export function ensureMonthlyWork(
  workItems: WorkItem[],
  targetMonth: string,
): WorkItem[] {
  return cloneRecurringByMonth(
    workItems,
    targetMonth,
    (w) => w.recurrence === 'mensual',
    (w) =>
      createWorkItem({
        title: w.title,
        project: w.project,
        notes: w.notes,
        importance: w.importance,
        status: 'pendiente',
        recurrence: 'mensual',
        monthKey: targetMonth,
        dueDay: w.dueDay,
      }),
  )
}

export type { RecurrenceEnd }
