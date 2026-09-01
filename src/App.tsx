import { useEffect, useState } from 'react'
import type { ViewId } from './types'
import { MENU_ITEMS } from './types'
import {
  formatMonthLabel,
  monthKeyFromDate,
  shiftMonth,
} from './lib/storage'
import { useAppStore } from './hooks/useAppStore'
import { DashboardPanel } from './components/DashboardPanel'
import { ExpensesPanel } from './components/ExpensesPanel'
import { TasksPanel } from './components/TasksPanel'
import { RemindersPanel } from './components/RemindersPanel'
import { WorkPanel } from './components/WorkPanel'
import './App.css'

const NAV: { id: ViewId; label: string }[] = [
  { id: 'dashboard', label: 'Dashboard' },
  ...MENU_ITEMS.map((item) => ({ id: item.id, label: item.label })),
]

export default function App() {
  const [monthKey, setMonthKey] = useState(() => monthKeyFromDate())
  const [view, setView] = useState<ViewId>('dashboard')
  const [ready, setReady] = useState(false)

  const store = useAppStore(monthKey)
  const monthLabel = formatMonthLabel(monthKey)

  useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true))
    return () => cancelAnimationFrame(id)
  }, [])

  return (
    <div className={`app-shell${ready ? ' is-ready' : ''}`}>
      <div className="atmosphere" aria-hidden="true" />

      <aside className="sidebar" aria-label="Menú principal">
        <div className="sidebar__brand">
          <p className="brand">Mesura</p>
          <p className="sidebar__tagline">Organiza tu mes</p>
        </div>

        <nav className="sidebar__nav">
          {NAV.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`sidebar__link${view === item.id ? ' is-active' : ''}`}
              aria-current={view === item.id ? 'page' : undefined}
              onClick={() => setView(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      <div className="app">
        <header className="hero">
          <div className="hero__brand">
            <h1>Dashboard del mes</h1>
            <p className="hero__lead">
              Gestiona finanzas en CLP, tareas, recordatorios y trabajo desde un
              solo panel.
            </p>
          </div>

          <div className="month-nav" role="group" aria-label="Mes activo">
            <button
              type="button"
              className="btn btn--icon"
              aria-label="Mes anterior"
              onClick={() => setMonthKey((m) => shiftMonth(m, -1))}
            >
              ‹
            </button>
            <div className="month-nav__label">
              <span className="month-nav__eyebrow">Mes actual</span>
              <strong>{monthLabel}</strong>
            </div>
            <button
              type="button"
              className="btn btn--icon"
              aria-label="Mes siguiente"
              onClick={() => setMonthKey((m) => shiftMonth(m, 1))}
            >
              ›
            </button>
            <button
              type="button"
              className="btn btn--ghost month-nav__today"
              onClick={() => setMonthKey(monthKeyFromDate())}
            >
              Hoy
            </button>
          </div>
        </header>

        <main className="main">
          {view === 'dashboard' && (
            <DashboardPanel
              monthLabel={monthLabel}
              tasks={store.monthTasks}
              expenses={store.monthExpenses}
              reminders={store.monthReminders}
              workItems={store.monthWork}
              onOpen={setView}
            />
          )}
          {view === 'finanzas' && (
            <ExpensesPanel
              monthKey={monthKey}
              expenses={store.monthExpenses}
              recurring={store.recurringExpenses}
              onAdd={store.addExpense}
              onUpdate={store.updateExpense}
              onRemove={store.removeExpense}
              onAddRecurring={store.addRecurring}
              onUpdateRecurring={store.updateRecurring}
              onRemoveRecurring={store.removeRecurring}
            />
          )}
          {view === 'tareas' && (
            <TasksPanel
              monthKey={monthKey}
              tasks={store.monthTasks}
              onAdd={store.addTask}
              onUpdate={store.updateTask}
              onRemove={store.removeTask}
              onToggle={store.toggleTask}
            />
          )}
          {view === 'recordatorios' && (
            <RemindersPanel
              monthKey={monthKey}
              reminders={store.monthReminders}
              onAdd={store.addReminder}
              onUpdate={store.updateReminder}
              onRemove={store.removeReminder}
              onToggle={store.toggleReminder}
            />
          )}
          {view === 'trabajo' && (
            <WorkPanel
              monthKey={monthKey}
              workItems={store.monthWork}
              onAdd={store.addWorkItem}
              onUpdate={store.updateWorkItem}
              onRemove={store.removeWorkItem}
            />
          )}
        </main>

        <footer className="footer">
          <p>
            Montos en pesos chilenos (CLP). Los datos se guardan en este
            navegador.
          </p>
        </footer>
      </div>
    </div>
  )
}
