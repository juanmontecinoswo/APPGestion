import type { FormEvent } from 'react'
import { useEffect, useMemo, useState } from 'react'
import type { WorkDayEntry } from '../types'
import {
  createWorkDayEntry,
  dateKeyFromParts,
  daysInMonth,
  formatMonthLabel,
  monthKeyFromDate,
  parseMonthKey,
} from '../lib/storage'

interface Props {
  monthKey: string
  blurb: string
  entries: WorkDayEntry[]
  onAdd: (entry: WorkDayEntry) => void
  onRemove: (id: string) => void
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

export function WorkCalendarSection({
  monthKey,
  blurb,
  entries,
  onAdd,
  onRemove,
}: Props) {
  const [selectedDay, setSelectedDay] = useState(() =>
    defaultSelectedDay(monthKey),
  )
  const [amount, setAmount] = useState('')
  const maxDay = daysInMonth(monthKey)
  const monthLabel = formatMonthLabel(monthKey)
  const cells = useMemo(() => buildCalendar(monthKey), [monthKey])
  const todayKey = monthKeyFromDate()
  const todayDay = new Date().getDate()

  useEffect(() => {
    setSelectedDay(defaultSelectedDay(monthKey))
    setAmount('')
  }, [monthKey])

  useEffect(() => {
    if (selectedDay > maxDay) setSelectedDay(maxDay)
  }, [selectedDay, maxDay])

  const monthPrefix = `${monthKey}-`
  const monthEntries = useMemo(
    () => entries.filter((entry) => entry.dateKey.startsWith(monthPrefix)),
    [entries, monthPrefix],
  )

  const countsByDay = useMemo(() => {
    const map = new Map<number, number>()
    for (const entry of monthEntries) {
      const day = Number(entry.dateKey.slice(-2))
      if (!Number.isFinite(day)) continue
      map.set(day, (map.get(day) ?? 0) + 1)
    }
    return map
  }, [monthEntries])

  const selectedKey = dateKeyFromParts(monthKey, selectedDay)
  const dayEntries = monthEntries
    .filter((entry) => entry.dateKey === selectedKey)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const dayCount = dayEntries.length
  const monthCount = monthEntries.length

  function handleAdd(e: FormEvent) {
    e.preventDefault()
    const text = amount.trim()
    if (!text) return
    onAdd(
      createWorkDayEntry({
        dateKey: selectedKey,
        text,
      }),
    )
    setAmount('')
  }

  return (
    <section className="panel work-cal" aria-labelledby="work-cal-title">
      <header className="panel__head">
        <div>
          <h2 id="work-cal-title">Calendario</h2>
          <p>{blurb}</p>
        </div>
      </header>

      <div className="work-cal__layout">
        <div className="work-cal__board">
          <header className="work-cal__board-head">
            <div>
              <p className="board-card__eyebrow">Mes</p>
              <h3>{monthLabel}</h3>
            </div>
            <span className="work-cal__month-total">
              {monthCount} {monthCount === 1 ? 'número' : 'números'}
            </span>
          </header>

          <div className="cal-grid work-cal__grid" role="grid" aria-label={monthLabel}>
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
              const count = countsByDay.get(day) ?? 0
              const hasCount = count > 0
              return (
                <button
                  key={day}
                  type="button"
                  className={`cal-grid__day work-cal__day${isToday ? ' is-today' : ''}${isSelected ? ' is-selected' : ''}${hasCount ? ' has-total' : ''}`}
                  aria-pressed={isSelected}
                  aria-label={
                    hasCount
                      ? `Día ${day}, ${count} ${count === 1 ? 'número' : 'números'}`
                      : `Día ${day}`
                  }
                  onClick={() => setSelectedDay(day)}
                >
                  <span className="work-cal__day-num">{day}</span>
                  {hasCount && (
                    <span className="work-cal__day-sum">{count}</span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        <div className="cal-day-panel work-cal__day-panel">
          <header className="cal-day-panel__head">
            <div>
              <p className="board-card__eyebrow">Día seleccionado</p>
              <h3>Día {selectedDay}</h3>
            </div>
            <span className="cal-day-panel__count">
              Total: {dayCount}
            </span>
          </header>

          <form className="cal-add work-cal__add" onSubmit={handleAdd}>
            <label className="field">
              <span>Agregar número</span>
              <input
                type="text"
                inputMode="text"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Ej. 44.139"
                required
                aria-label={`Número para el día ${selectedDay}`}
              />
            </label>
            <button type="submit" className="btn btn--primary">
              Agregar
            </button>
          </form>

          <ul className="list work-cal__entries">
            {dayEntries.length === 0 && (
              <li className="list__empty">
                Aún no hay números en este día.
              </li>
            )}
            {dayEntries.map((entry) => (
              <li key={entry.id} className="list__item">
                <div className="list__main">
                  <strong className="work-cal__entry-text">{entry.text}</strong>
                </div>
                <div className="list__ops">
                  <button
                    type="button"
                    className="btn btn--tiny btn--danger"
                    onClick={() => onRemove(entry.id)}
                  >
                    Borrar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
