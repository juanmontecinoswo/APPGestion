export type Importance = 'alta' | 'media' | 'baja'
export type Recurrence = 'fija' | 'mensual'
export type ExpenseKind = 'unico' | 'fijo' | 'mensual'
export type RecurringKind = 'fijo' | 'mensual'
export type RecurrenceEnd = 'manual' | 'months'
export type WorkStatus = 'pendiente' | 'en_curso' | 'hecho'
export type WorkSection = 'encargos' | 'notas' | 'links' | 'calendario'

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

export interface WorkNote {
  id: string
  title: string
  body: string
  createdAt: string
  updatedAt: string
}

export interface WorkLink {
  id: string
  title: string
  url: string
  description: string
  createdAt: string
}

/** Número registrado en un día del calendario de trabajo */
export interface WorkDayEntry {
  id: string
  /** YYYY-MM-DD */
  dateKey: string
  value: number
  createdAt: string
}

export interface AppState {
  tasks: Task[]
  expenses: Expense[]
  recurringExpenses: RecurringExpense[]
  reminders: Reminder[]
  workItems: WorkItem[]
  workNotes: WorkNote[]
  workLinks: WorkLink[]
  workDayEntries: WorkDayEntry[]
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
  shortLabel: string
  blurb: string
}[] = [
  {
    id: 'finanzas',
    label: 'Finanzas',
    shortLabel: 'Gastos',
    blurb: 'Controla cargos únicos, fijos y mensuales en pesos chilenos.',
  },
  {
    id: 'tareas',
    label: 'Tareas',
    shortLabel: 'Tareas',
    blurb: 'Organiza pendientes con importancia alta, media o baja.',
  },
  {
    id: 'recordatorios',
    label: 'Recordatorios',
    shortLabel: 'Avisos',
    blurb: 'Avisos del mes con día y hora para no olvidar nada.',
  },
  {
    id: 'trabajo',
    label: 'Trabajo',
    shortLabel: 'Trabajo',
    blurb: 'Seguimiento de encargos, proyectos y estados laborales.',
  },
]

export const WORK_SECTIONS: {
  id: WorkSection
  label: string
  shortLabel: string
  blurb: string
}[] = [
  {
    id: 'encargos',
    label: 'Encargos',
    shortLabel: 'Encargos',
    blurb: 'Pendientes y proyectos del mes con estado e importancia.',
  },
  {
    id: 'notas',
    label: 'Notas',
    shortLabel: 'Notas',
    blurb: 'Apuntes rápidos del trabajo, ideas y recordatorios libres.',
  },
  {
    id: 'links',
    label: 'Links',
    shortLabel: 'Links',
    blurb: 'Enlaces con descripción para documentos y referencias.',
  },
  {
    id: 'calendario',
    label: 'Calendario',
    shortLabel: 'Calendario',
    blurb: 'Registra números por día y ve el total acumulado en el mes.',
  },
]

/** Credenciales iniciales del administrador (cámbialas después del primer ingreso). */
export const DEFAULT_ADMIN = {
  username: 'admin',
  password: 'admin123',
  displayName: 'Administrador',
} as const
