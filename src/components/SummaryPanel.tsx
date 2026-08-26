import type { Expense, Task } from '../types'
import { formatMoney } from '../lib/storage'

interface Props {
  monthLabel: string
  tasks: Task[]
  expenses: Expense[]
  onGoTasks: () => void
  onGoExpenses: () => void
}

export function SummaryPanel({
  monthLabel,
  tasks,
  expenses,
  onGoTasks,
  onGoExpenses,
}: Props) {
  const total = expenses.reduce((sum, e) => sum + e.amount, 0)
  const fixed = expenses
    .filter((e) => e.kind === 'fijo' || e.kind === 'mensual')
    .reduce((sum, e) => sum + e.amount, 0)
  const pending = tasks.filter((t) => !t.done)
  const high = pending.filter((t) => t.importance === 'alta')
  const done = tasks.filter((t) => t.done).length
  const progress = tasks.length === 0 ? 0 : Math.round((done / tasks.length) * 100)

  const byCategory = Object.entries(
    expenses.reduce<Record<string, number>>((acc, e) => {
      acc[e.category] = (acc[e.category] ?? 0) + e.amount
      return acc
    }, {}),
  ).sort((a, b) => b[1] - a[1])

  return (
    <section className="panel panel--summary" aria-labelledby="resumen-title">
      <header className="panel__head">
        <div>
          <h2 id="resumen-title">Resumen de {monthLabel}</h2>
          <p>Vista rápida de gastos y tareas pendientes.</p>
        </div>
      </header>

      <div className="summary-grid">
        <article className="stat">
          <p className="stat__label">Total gastado</p>
          <p className="stat__value">{formatMoney(total)}</p>
          <p className="stat__hint">
            {formatMoney(fixed)} en fijos / mensuales
          </p>
          <button type="button" className="btn btn--ghost" onClick={onGoExpenses}>
            Ver gastos
          </button>
        </article>

        <article className="stat">
          <p className="stat__label">Tareas</p>
          <p className="stat__value">
            {pending.length}
            <span className="stat__suffix"> pendientes</span>
          </p>
          <p className="stat__hint">
            {high.length} de importancia alta · {progress}% completado
          </p>
          <button type="button" className="btn btn--ghost" onClick={onGoTasks}>
            Ver tareas
          </button>
        </article>
      </div>

      <div className="progress" aria-hidden="true">
        <div className="progress__bar" style={{ width: `${progress}%` }} />
      </div>

      <div className="summary-cols">
        <div>
          <h3>Por categoría</h3>
          {byCategory.length === 0 ? (
            <p className="muted">Sin gastos registrados.</p>
          ) : (
            <ul className="bars">
              {byCategory.map(([cat, amount]) => {
                const pct = total === 0 ? 0 : Math.round((amount / total) * 100)
                return (
                  <li key={cat}>
                    <div className="bars__label">
                      <span>{cat}</span>
                      <span>{formatMoney(amount)}</span>
                    </div>
                    <div className="bars__track">
                      <div className="bars__fill" style={{ width: `${pct}%` }} />
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <div>
          <h3>Prioridades altas</h3>
          {high.length === 0 ? (
            <p className="muted">No hay tareas urgentes pendientes.</p>
          ) : (
            <ul className="priority-list">
              {high.slice(0, 6).map((t) => (
                <li key={t.id}>
                  <span className="dot" />
                  <span>{t.title}</span>
                  {t.dueDay != null && (
                    <span className="muted">Día {t.dueDay}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  )
}
