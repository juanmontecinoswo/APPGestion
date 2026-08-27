import type {
  AppState,
  Expense,
  Reminder,
  Task,
  WorkItem,
} from '../types'

const STORAGE_KEY = 'mesura-v2'

function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export function monthKeyFromDate(date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
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

export function formatMoney(amount: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(Math.round(amount))
}

function seedState(monthKey: string): AppState {
  const now = new Date().toISOString()
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
    {
      id: uid(),
      title: 'Organizar lista de la compra',
      notes: '',
      importance: 'media',
      recurrence: 'mensual',
      monthKey,
      dueDay: null,
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
      monthKey,
      day: new Date().getDate(),
      notes: '',
      createdAt: now,
    },
    {
      id: uid(),
      title: 'Internet + móvil',
      amount: 35990,
      category: 'Servicios',
      kind: 'mensual',
      monthKey,
      day: 10,
      notes: '',
      createdAt: now,
    },
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
    {
      id: uid(),
      title: 'Reunión familiar',
      notes: '',
      importance: 'media',
      recurrence: 'fija',
      monthKey,
      dueDay: 20,
      time: '19:30',
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
    {
      id: uid(),
      title: 'Actualizar propuesta cliente',
      project: 'Cliente Norte',
      notes: '',
      importance: 'media',
      status: 'en_curso',
      recurrence: 'fija',
      monthKey,
      dueDay: 15,
      createdAt: now,
    },
  ]

  return { tasks, expenses, reminders, workItems }
}

function normalizeState(raw: Partial<AppState>): AppState {
  return {
    tasks: raw.tasks ?? [],
    expenses: raw.expenses ?? [],
    reminders: raw.reminders ?? [],
    workItems: raw.workItems ?? [],
  }
}

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      const initial = seedState(monthKeyFromDate())
      saveState(initial)
      return initial
    }
    const parsed = normalizeState(JSON.parse(raw) as Partial<AppState>)
    if (!Array.isArray(parsed.tasks) || !Array.isArray(parsed.expenses)) {
      throw new Error('invalid')
    }
    return parsed
  } catch {
    const fallback = seedState(monthKeyFromDate())
    saveState(fallback)
    return fallback
  }
}

export function saveState(state: AppState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
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

function cloneRecurringByMonth<T extends { monthKey: string; recurrence?: RecurrenceKind; kind?: string }>(
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
  targetMonth: string,
): Expense[] {
  return cloneRecurringByMonth(
    expenses,
    targetMonth,
    (e) => e.kind === 'fijo' || e.kind === 'mensual',
    (e) =>
      createExpense({
        title: e.title,
        amount: e.amount,
        category: e.category,
        kind: e.kind,
        monthKey: targetMonth,
        day: e.day,
        notes: e.notes,
      }),
  )
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
