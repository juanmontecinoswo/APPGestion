import { useEffect, useState } from 'react'
import type { ViewId } from './types'
import {
  formatMonthLabel,
  monthKeyFromDate,
  shiftMonth,
} from './lib/storage'
import { useAppStore } from './hooks/useAppStore'
import { SummaryPanel } from './components/SummaryPanel'
import { ExpensesPanel } from './components/ExpensesPanel'
import { TasksPanel } from './components/TasksPanel'
import './App.css'

const NAV: { id: ViewId; label: string }[] = [
  { id: 'resumen', label: 'Resumen' },
  { id: 'gastos', label: 'Gastos' },
  { id: 'tareas', label: 'Tareas' },
]

export default function App() {
  const [monthKey, setMonthKey] = useState(() => monthKeyFromDate())
  const [view, setView] = useState<ViewId>('resumen')
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
          <h1>Gastos y tareas, mes a mes</h1>
          <p className="hero__lead">
            Organiza tu mes: controla gastos y prioriza tareas fijas o
            mensuales según su importancia.
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

      <nav className="tabs" aria-label="Secciones">
        {NAV.map((item) => (
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
        {view === 'resumen' && (
          <SummaryPanel
            monthLabel={monthLabel}
            tasks={store.monthTasks}
            expenses={store.monthExpenses}
            onGoTasks={() => setView('tareas')}
            onGoExpenses={() => setView('gastos')}
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
      </main>

      <footer className="footer">
        <p>
          Los datos se guardan en este navegador. Cambia de mes para ver o
          generar la copia mensual de tareas y gastos recurrentes.
        </p>
      </footer>
    </div>
  )
}
