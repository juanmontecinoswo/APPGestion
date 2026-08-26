export type Importance = 'alta' | 'media' | 'baja'
export type Recurrence = 'fija' | 'mensual'
export type ExpenseKind = 'unico' | 'fijo' | 'mensual'

export type ViewId = 'resumen' | 'gastos' | 'tareas'

export interface Task {
  id: string
  title: string
  notes: string
  importance: Importance
  recurrence: Recurrence
  /** YYYY-MM for the month this task belongs to (mensual regenerates) */
  monthKey: string
  dueDay: number | null
  done: boolean
  createdAt: string
}

export interface Expense {
  id: string
  title: string
  amount: number
  category: string
  kind: ExpenseKind
  /** YYYY-MM */
  monthKey: string
  day: number | null
  notes: string
  createdAt: string
}

export interface AppState {
  tasks: Task[]
  expenses: Expense[]
}

export const EXPENSE_CATEGORIES = [
  'Vivienda',
  'Comida',
  'Transporte',
  'Servicios',
  'Salud',
  'Ocio',
  'Suscripciones',
  'Otros',
] as const
