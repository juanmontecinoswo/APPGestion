import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'
import {
  createTask,
  daysInMonth,
  formatMoney,
  formatMonthLabel,
  monthKeyFromDate,
  parseMonthKey,
  paidExpenseTotal,
  shiftMonth,
} from '../lib/storage'
import type {
  Expense,
  Importance,
  Reminder,
  Task,
  ViewId,
  WorkItem,
} from '../types'

interface Props {
  monthKey: string
  onMonthChange: (key: string) => void
  tasks: Task[]
  expenses: Expense[]
  reminders: Reminder[]
  workItems: WorkItem[]
  onToggleTask: (id: string) => void
  onToggleReminder: (id: string) => void
  onAddTask: (task: Task) => void
  onOpen: (view: Exclude<ViewId, 'dashboard' | 'cuenta'>) => void
}

const WEEKDAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

function buildCalendar(monthKey: string) {
  const { year, month } = parseMonthKey(monthKey)
  const total = daysInMonth(monthKey)
  const first = new Date(year, month - 1, 1)
  const offset = (first.getDay() + 6) % 7
  const cells: Array<number | null> = []
  for (let i = 0; i < offset; i++) cells.push(null)
  for (let d = 1; d <= total; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

function defaultSelectedDay(monthKey: string): number {
  const todayKey = monthKeyFromDate()
  if (monthKey === todayKey) return new Date().getDate()
  return 1
}

export function HomeBoard({
  monthKey,
  onMonthChange,
  tasks,
  expenses,
  reminders,
  workItems,
  onToggleTask,
  onToggleReminder,
  onAddTask,
  onOpen,
}: Props) {
  const [selectedDay, setSelectedDay] = useState(() =>
    defaultSelectedDay(monthKey),
  )
  const [newTitle, setNewTitle] = useState('')
  const [importance, setImportance] = useState<Importance>('media')

  const monthLabel = formatMonthLabel(monthKey)
  const cells = buildCalendar(monthKey)
  const todayKey = monthKeyFromDate()
  const todayDay = new Date().getDate()
  const maxDay = daysInMonth(monthKey)
  const unpaid = expenses.filter((e) => !e.paid)
  const pendingTasks = tasks.filter((t) => !t.done)
  const activeReminders = reminders.filter((r) => !r.done)
  const openWork = workItems.filter((w) => w.status !== 'hecho')
  const paidTotal = paidExpenseTotal(expenses)

  const dayTasks = tasks
    .filter((t) => t.dueDay === selectedDay)
    .sort((a, b) => Number(a.done) - Number(b.done))

  const markedDays = new Set<number>()
  for (const t of tasks) if (t.dueDay != null) markedDays.add(t.dueDay)
  for (const e of expenses) if (e.day != null) markedDays.add(e.day)
  for (const r of reminders) if (r.dueDay != null) markedDays.add(r.dueDay)

  useEffect(() => {
    setSelectedDay(defaultSelectedDay(monthKey))
    setNewTitle('')
  }, [monthKey])

  useEffect(() => {
    if (selectedDay > maxDay) setSelectedDay(maxDay)
  }, [selectedDay, maxDay])

  function handleAddTask(e: FormEvent) {
    e.preventDefault()
    if (!newTitle.trim()) return
    onAddTask(
      createTask({
        title: newTitle.trim(),
        notes: '',
        importance,
        recurrence: 'fija',
        monthKey,
        dueDay: selectedDay,
      }),
    )
    setNewTitle('')
    setImportance('media')
  }

  return (
    <div className="home-board">
      <section className="board-card board-card--calendar" aria-label="Calendario">
        <header className="board-card__head">
          <div>
            <p className="board-card__eyebrow">Calendario</p>
            <h2>{monthLabel}</h2>
          </div>
          <div className="cal-nav">
            <button
              type="button"
              className="btn btn--icon"
              aria-label="Mes anterior"
              onClick={() => onMonthChange(shiftMonth(monthKey, -1))}
            >
              ‹
            </button>
            <button
              type="button"
              className="btn btn--ghost btn--tiny"
              onClick={() => onMonthChange(todayKey)}
            >
              Hoy
            </button>
            <button
              type="button"
              className="btn btn--icon"
              aria-label="Mes siguiente"
              onClick={() => onMonthChange(shiftMonth(monthKey, 1))}
            >
              ›
            </button>
          </div>
        </header>

        <div className="cal-grid" role="grid" aria-label={monthLabel}>
          {WEEKDAYS.map((d) => (
            <span key={d} className="cal-grid__weekday">
              {d}
            </span>
          ))}
          {cells.map((day, i) => {
            if (day == null) {
              return <span key={`e-${i}`} className="cal-grid__empty" />
            }
            const isToday = monthKey === todayKey && day === todayDay
            const isSelected = day === selectedDay
            const hasMark = markedDays.has(day)
            return (
              <button
                key={day}
                type="button"
                className={`cal-grid__day${isToday ? ' is-today' : ''}${isSelected ? ' is-selected' : ''}${hasMark ? ' has-mark' : ''}`}
                aria-pressed={isSelected}
                aria-label={`Día ${day}`}
                onClick={() => setSelectedDay(day)}
              >
                {day}
              </button>
            )
          })}
        </div>

        <div className="cal-day-panel">
          <header className="cal-day-panel__head">
            <div>
              <p className="board-card__eyebrow">Tareas del día</p>
              <h3>Día {selectedDay}</h3>
            </div>
            <span className="cal-day-panel__count">
              {dayTasks.length}{' '}
              {dayTasks.length === 1 ? 'tarea' : 'tareas'}
            </span>
          </header>

          <ul className="board-list">
            {dayTasks.length === 0 && (
              <li className="board-list__empty">
                No hay tareas para este día.
              </li>
            )}
            {dayTasks.map((task) => (
              <li
                key={task.id}
                className={`board-list__item${task.done ? ' is-done' : ''}`}
              >
                <label className="check">
                  <input
                    type="checkbox"
                    checked={task.done}
                    onChange={() => onToggleTask(task.id)}
                    aria-label={`Marcar ${task.title}`}
                  />
                  <span className="check__box" aria-hidden="true" />
                </label>
                <div>
                  <strong>{task.title}</strong>
                  <span>{task.importance}</span>
                </div>
              </li>
            ))}
          </ul>

          <form className="cal-add" onSubmit={handleAddTask}>
            <p className="board-card__eyebrow">Agregar tarea al día {selectedDay}</p>
            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Ej. Llamar al banco"
              required
            />
            <div className="cal-add__row">
              <select
                value={importance}
                onChange={(e) => setImportance(e.target.value as Importance)}
                aria-label="Importancia"
              >
                <option value="alta">Alta</option>
                <option value="media">Media</option>
                <option value="baja">Baja</option>
              </select>
              <button type="submit" className="btn btn--primary">
                Agregar
              </button>
            </div>
          </form>
        </div>

        <div className="cal-pay">
          <div>
            <p className="board-card__eyebrow">Por pagar</p>
            <strong>{unpaid.length} cargos</strong>
          </div>
          <button
            type="button"
            className="btn btn--primary btn--round"
            onClick={() => onOpen('finanzas')}
            aria-label="Ir a finanzas"
          >
            →
          </button>
        </div>
      </section>

      <div className="home-board__center">
        <section className="board-card board-card--tasks" aria-label="Listado de tareas">
          <header className="board-card__head">
            <div>
              <p className="board-card__eyebrow">Listado de tareas</p>
              <h2>{pendingTasks.length} pendientes</h2>
            </div>
            <button
              type="button"
              className="btn btn--round"
              onClick={() => onOpen('tareas')}
              aria-label="Abrir tareas"
            >
              +
            </button>
          </header>

          <ul className="board-list">
            {pendingTasks.length === 0 && (
              <li className="board-list__empty">Sin tareas pendientes.</li>
            )}
            {pendingTasks.slice(0, 6).map((task) => (
              <li key={task.id} className="board-list__item">
                <label className="check">
                  <input
                    type="checkbox"
                    checked={task.done}
                    onChange={() => onToggleTask(task.id)}
                    aria-label={`Marcar ${task.title}`}
                  />
                  <span className="check__box" aria-hidden="true" />
                </label>
                <div>
                  <strong>{task.title}</strong>
                  <span>
                    {task.importance}
                    {task.dueDay != null ? ` · Día ${task.dueDay}` : ''}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <div className="home-board__mini">
          <button
            type="button"
            className="board-card board-card--mini"
            onClick={() => onOpen('finanzas')}
          >
            <p className="board-card__eyebrow">Finanzas</p>
            <strong>{formatMoney(paidTotal)}</strong>
            <span>{unpaid.length} por pagar</span>
          </button>
          <button
            type="button"
            className="board-card board-card--mini"
            onClick={() => onOpen('trabajo')}
          >
            <p className="board-card__eyebrow">Trabajo</p>
            <strong>{openWork.length}</strong>
            <span>encargos abiertos</span>
          </button>
        </div>
      </div>

      <div className="home-board__right">
        <section
          className="board-card board-card--reminders"
          aria-label="Recordatorios"
        >
          <header className="board-card__head">
            <div>
              <p className="board-card__eyebrow">Recordatorios</p>
              <h2>{activeReminders.length} activos</h2>
            </div>
            <button
              type="button"
              className="btn btn--round"
              onClick={() => onOpen('recordatorios')}
              aria-label="Abrir recordatorios"
            >
              +
            </button>
          </header>

          <ul className="board-list">
            {activeReminders.length === 0 && (
              <li className="board-list__empty">Sin recordatorios.</li>
            )}
            {activeReminders.slice(0, 5).map((item) => (
              <li key={item.id} className="board-list__item">
                <label className="check">
                  <input
                    type="checkbox"
                    checked={item.done}
                    onChange={() => onToggleReminder(item.id)}
                    aria-label={`Marcar ${item.title}`}
                  />
                  <span className="check__box" aria-hidden="true" />
                </label>
                <div>
                  <strong>{item.title}</strong>
                  <span>
                    {item.dueDay != null ? `Día ${item.dueDay}` : 'Sin día'}
                    {item.time ? ` · ${item.time}` : ''}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="board-card board-card--stat">
          <p className="board-card__eyebrow">Resumen del mes</p>
          <div className="stat-row">
            <span>Tareas</span>
            <strong>
              {tasks.filter((t) => t.done).length}/{tasks.length}
            </strong>
          </div>
          <div className="progress" aria-hidden="true">
            <div
              className="progress__bar"
              style={{
                width: `${tasks.length === 0 ? 0 : Math.round((tasks.filter((t) => t.done).length / tasks.length) * 100)}%`,
              }}
            />
          </div>
        </section>

        <section className="board-card board-card--stat">
          <p className="board-card__eyebrow">Próximo foco</p>
          <strong>
            {pendingTasks[0]?.title ??
              unpaid[0]?.title ??
              activeReminders[0]?.title ??
              'Todo al día'}
          </strong>
          <button
            type="button"
            className="btn btn--ghost btn--tiny"
            onClick={() => onOpen(pendingTasks[0] ? 'tareas' : 'finanzas')}
          >
            Ver detalle
          </button>
        </section>
      </div>
    </div>
  )
}
