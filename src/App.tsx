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
    <div className={`app${ready ? ' is-ready' : ''}`}>
      <div className="atmosphere" aria-hidden="true" />

      <header className="hero">
        <div className="hero__brand">
          <p className="brand">Mesura</p>
          <h1>Dashboard del mes</h1>
          <p className="hero__lead">
            Gestiona gastos en CLP, tareas, recordatorios y trabajo desde un
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

      <nav className="tabs" aria-label="Menús principales">
        <button
          type="button"
          className={`tabs__btn${view === 'dashboard' ? ' is-active' : ''}`}
          aria-current={view === 'dashboard' ? 'page' : undefined}
          onClick={() => setView('dashboard')}
        >
          Dashboard
        </button>
        {MENU_ITEMS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`tabs__btn${view === item.id ? ' is-active' : ''}`}
            aria-current={view === item.id ? 'page' : undefined}
            onClick={() => setView(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>

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
        {view === 'gastos' && (
          <ExpensesPanel
            monthKey={monthKey}
            expenses={store.monthExpenses}
            onAdd={store.addExpense}
            onUpdate={store.updateExpense}
            onRemove={store.removeExpense}
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
  )
}
