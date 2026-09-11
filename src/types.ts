export type Importance = 'alta' | 'media' | 'baja'
export type Recurrence = 'fija' | 'mensual'
export type ExpenseKind = 'unico' | 'fijo' | 'mensual'
export type RecurringKind = 'fijo' | 'mensual'
export type RecurrenceEnd = 'manual' | 'months'
export type WorkStatus = 'pendiente' | 'en_curso' | 'hecho'

export type UserRole = 'admin' | 'user'

export type ViewId =
  | 'dashboard'
  | 'finanzas'
  | 'tareas'
  | 'recordatorios'
  | 'trabajo'
  | 'cuenta'

export interface UserAccount {
  id: string
  username: string
  displayName: string
  passwordHash: string
  role: UserRole
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface AuthState {
  users: UserAccount[]
}

export interface Task {
  id: string
  title: string
  notes: string
  importance: Importance
  recurrence: Recurrence
  /** YYYY-MM */
  monthKey: string
  dueDay: number | null
  done: boolean
  createdAt: string
}

export interface Expense {
  id: string
  title: string
  /** Estimado si no está pagado; monto real al pagar */
  amount: number | null
  category: string
  kind: ExpenseKind
  paid: boolean
  recurringId: string | null
  /** YYYY-MM */
  monthKey: string
  day: number | null
  notes: string
  createdAt: string
}

export interface RecurringExpense {
  id: string
  title: string
  plannedAmount: number | null
  category: string
  kind: RecurringKind
  day: number | null
  notes: string
  startMonthKey: string
  recurrenceEnd: RecurrenceEnd
  recurrenceMonths: number | null
  active: boolean
  createdAt: string
}

export interface Reminder {
  id: string
  title: string
  notes: string
  importance: Importance
  recurrence: Recurrence
  /** YYYY-MM */
  monthKey: string
  dueDay: number | null
  time: string
  done: boolean
  createdAt: string
}

export interface WorkItem {
  id: string
  title: string
  project: string
  notes: string
  importance: Importance
  status: WorkStatus
  recurrence: Recurrence
  /** YYYY-MM */
  monthKey: string
  dueDay: number | null
  createdAt: string
}

export interface AppState {
  tasks: Task[]
  expenses: Expense[]
  recurringExpenses: RecurringExpense[]
  reminders: Reminder[]
  workItems: WorkItem[]
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

export const MENU_ITEMS: {
  id: Exclude<ViewId, 'dashboard' | 'cuenta'>
  label: string
  blurb: string
}[] = [
  {
    id: 'finanzas',
    label: 'Finanzas',
    blurb: 'Controla cargos únicos, fijos y mensuales en pesos chilenos.',
  },
  {
    id: 'tareas',
    label: 'Tareas',
    blurb: 'Organiza pendientes con importancia alta, media o baja.',
  },
  {
    id: 'recordatorios',
    label: 'Recordatorios',
    blurb: 'Avisos del mes con día y hora para no olvidar nada.',
  },
  {
    id: 'trabajo',
    label: 'Trabajo',
    blurb: 'Seguimiento de encargos, proyectos y estados laborales.',
  },
]

/** Credenciales iniciales del administrador (cámbialas después del primer ingreso). */
export const DEFAULT_ADMIN = {
  username: 'admin',
  password: 'admin123',
  displayName: 'Administrador',
} as const
