import type {
  AppState,
  Expense,
  RecurrenceEnd,
  RecurringExpense,
  Reminder,
  Task,
  WorkItem,
} from '../types'

const STORAGE_KEY = 'mesura-v3'

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

  return { tasks, expenses, recurringExpenses, reminders, workItems }
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
