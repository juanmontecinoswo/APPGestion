import type { AppState, Expense, Task } from '../types'

const STORAGE_KEY = 'mesura-v1'

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
  const label = date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
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
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 2,
  }).format(amount)
}

function seedState(monthKey: string): AppState {
  const now = new Date().toISOString()
  const tasks: Task[] = [
    {
      id: uid(),
      title: 'Revisar extracto bancario',
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
      title: 'Pagar alquiler',
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
      title: 'Alquiler',
      amount: 750,
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
      amount: 86.4,
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
      amount: 42,
      category: 'Servicios',
      kind: 'mensual',
      monthKey,
      day: 10,
      notes: '',
      createdAt: now,
    },
  ]

  return { tasks, expenses }
}

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      const initial = seedState(monthKeyFromDate())
      saveState(initial)
      return initial
    }
    const parsed = JSON.parse(raw) as AppState
    if (!parsed.tasks || !parsed.expenses) throw new Error('invalid')
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

/** Carry monthly tasks into a month that has none yet */
export function ensureMonthlyTasks(
  tasks: Task[],
  targetMonth: string,
): Task[] {
  const hasAnyForMonth = tasks.some((t) => t.monthKey === targetMonth)
  if (hasAnyForMonth) return tasks

  const templates = tasks.filter((t) => t.recurrence === 'mensual')
  if (templates.length === 0) return tasks

  // Prefer templates from the nearest previous month that has monthly tasks
  const months = [...new Set(templates.map((t) => t.monthKey))].sort()
  const sourceMonth =
    [...months].reverse().find((m) => m < targetMonth) ?? months[months.length - 1]

  const clones = templates
    .filter((t) => t.monthKey === sourceMonth)
    .map((t) =>
      createTask({
        title: t.title,
        notes: t.notes,
        importance: t.importance,
        recurrence: 'mensual',
        monthKey: targetMonth,
        dueDay: t.dueDay,
      }),
    )

  return [...tasks, ...clones]
}

/** Carry fixed/monthly expenses into empty months */
export function ensureMonthlyExpenses(
  expenses: Expense[],
  targetMonth: string,
): Expense[] {
  const hasAnyForMonth = expenses.some((e) => e.monthKey === targetMonth)
  if (hasAnyForMonth) return expenses

  const recurring = expenses.filter(
    (e) => e.kind === 'fijo' || e.kind === 'mensual',
  )
  if (recurring.length === 0) return expenses

  const months = [...new Set(recurring.map((e) => e.monthKey))].sort()
  const sourceMonth =
    [...months].reverse().find((m) => m < targetMonth) ?? months[months.length - 1]

  const clones = recurring
    .filter((e) => e.monthKey === sourceMonth)
    .map((e) =>
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

  return [...expenses, ...clones]
}
