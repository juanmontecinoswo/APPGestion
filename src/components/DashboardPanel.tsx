import type { Expense, Reminder, Task, ViewId, WorkItem } from '../types'
import { MENU_ITEMS } from '../types'
import { formatMoney } from '../lib/storage'

interface Props {
  monthLabel: string
  tasks: Task[]
  expenses: Expense[]
  reminders: Reminder[]
  workItems: WorkItem[]
  onOpen: (view: Exclude<ViewId, 'dashboard'>) => void
}

export function DashboardPanel({
  monthLabel,
  tasks,
  expenses,
  reminders,
  workItems,
  onOpen,
}: Props) {
  const total = expenses.reduce((sum, e) => sum + e.amount, 0)
  const pendingTasks = tasks.filter((t) => !t.done).length
  const pendingReminders = reminders.filter((r) => !r.done).length
  const openWork = workItems.filter((w) => w.status !== 'hecho').length

  const counts: Record<Exclude<ViewId, 'dashboard'>, string> = {
    gastos: formatMoney(total),
    tareas: `${pendingTasks} pendientes`,
    recordatorios: `${pendingReminders} activos`,
    trabajo: `${openWork} en curso`,
  }

  return (
    <section className="panel panel--dashboard" aria-labelledby="dash-title">
      <header className="panel__head">
        <div>
          <h2 id="dash-title">Dashboard de {monthLabel}</h2>
          <p>Elige un menú para gestionar cada área del mes.</p>
        </div>
      </header>

      <div className="dash-grid">
        {MENU_ITEMS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`dash-card dash-card--${item.id}`}
            onClick={() => onOpen(item.id)}
          >
            <span className="dash-card__label">{item.label}</span>
            <strong className="dash-card__stat">{counts[item.id]}</strong>
            <span className="dash-card__blurb">{item.blurb}</span>
            <span className="dash-card__cta">Abrir {item.label}</span>
          </button>
        ))}
      </div>
    </section>
  )
}
