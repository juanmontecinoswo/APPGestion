import type { FormEvent } from 'react'
import { useEffect, useMemo, useState } from 'react'
import type { WorkDayEntry } from '../types'
import {
  createWorkDayEntry,
  dateKeyFromParts,
  daysInMonth,
  formatMonthLabel,
  formatWorkNumber,
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

function parseNumberInput(raw: string): number | null {
  const trimmed = raw.trim().replace(/\s/g, '').replace(',', '.')
  if (!trimmed) return null
  const value = Number(trimmed)
  if (!Number.isFinite(value)) return null
  return value
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

  const totalsByDay = useMemo(() => {
    const map = new Map<number, number>()
    for (const entry of monthEntries) {
      const day = Number(entry.dateKey.slice(-2))
      if (!Number.isFinite(day)) continue
      map.set(day, (map.get(day) ?? 0) + entry.value)
    }
    return map
  }, [monthEntries])

  const selectedKey = dateKeyFromParts(monthKey, selectedDay)
  const dayEntries = monthEntries
    .filter((entry) => entry.dateKey === selectedKey)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const dayTotal = totalsByDay.get(selectedDay) ?? 0
  const monthTotal = monthEntries.reduce((sum, entry) => sum + entry.value, 0)

  function handleAdd(e: FormEvent) {
    e.preventDefault()
    const value = parseNumberInput(amount)
    if (value == null) return
    onAdd(
      createWorkDayEntry({
        dateKey: selectedKey,
        value,
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
              Total mes: {formatWorkNumber(monthTotal)}
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
              const total = totalsByDay.get(day)
              const hasTotal = total != null && total !== 0
              return (
                <button
                  key={day}
                  type="button"
                  className={`cal-grid__day work-cal__day${isToday ? ' is-today' : ''}${isSelected ? ' is-selected' : ''}${hasTotal ? ' has-total' : ''}`}
                  aria-pressed={isSelected}
                  aria-label={
                    hasTotal
                      ? `Día ${day}, total ${formatWorkNumber(total)}`
                      : `Día ${day}`
                  }
                  onClick={() => setSelectedDay(day)}
                >
                  <span className="work-cal__day-num">{day}</span>
                  {hasTotal && (
                    <span className="work-cal__day-sum">
                      {formatWorkNumber(total)}
                    </span>
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
              Total: {formatWorkNumber(dayTotal)}
            </span>
          </header>

          <form className="cal-add work-cal__add" onSubmit={handleAdd}>
            <label className="field">
              <span>Agregar número</span>
              <input
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Ej. 10"
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
                  <strong>{formatWorkNumber(entry.value)}</strong>
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
