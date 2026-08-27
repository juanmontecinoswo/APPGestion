import type { FormEvent } from 'react'
import { useState } from 'react'
import type { Importance, Recurrence, Reminder } from '../types'
import { createReminder, daysInMonth } from '../lib/storage'

interface Props {
  monthKey: string
  reminders: Reminder[]
  onAdd: (reminder: Reminder) => void
  onUpdate: (id: string, patch: Partial<Reminder>) => void
  onRemove: (id: string) => void
  onToggle: (id: string) => void
}

const IMPORTANCE_LABEL: Record<Importance, string> = {
  alta: 'Alta',
  media: 'Media',
  baja: 'Baja',
}

const RECURRENCE_LABEL: Record<Recurrence, string> = {
  fija: 'Fija',
  mensual: 'Mensual',
}

export function RemindersPanel({
  monthKey,
  reminders,
  onAdd,
  onUpdate,
  onRemove,
  onToggle,
}: Props) {
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [importance, setImportance] = useState<Importance>('media')
  const [recurrence, setRecurrence] = useState<Recurrence>('fija')
  const [dueDay, setDueDay] = useState('')
  const [time, setTime] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)

  const maxDay = daysInMonth(monthKey)
  const sorted = [...reminders].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1
    return (a.dueDay ?? 99) - (b.dueDay ?? 99)
  })

  function resetForm() {
    setTitle('')
    setNotes('')
    setImportance('media')
    setRecurrence('fija')
    setDueDay('')
    setTime('')
    setEditingId(null)
  }

  function startEdit(reminder: Reminder) {
    setEditingId(reminder.id)
    setTitle(reminder.title)
    setNotes(reminder.notes)
    setImportance(reminder.importance)
    setRecurrence(reminder.recurrence)
    setDueDay(reminder.dueDay != null ? String(reminder.dueDay) : '')
    setTime(reminder.time)
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    const dayNum = dueDay ? Math.min(Math.max(1, Number(dueDay)), maxDay) : null
    const payload = {
      title: title.trim(),
      notes: notes.trim(),
      importance,
      recurrence,
      monthKey,
      dueDay: dayNum && !Number.isNaN(dayNum) ? dayNum : null,
      time: time.trim(),
    }

    if (editingId) {
      onUpdate(editingId, payload)
    } else {
      onAdd(createReminder(payload))
    }
    resetForm()
  }

  return (
    <section className="panel" aria-labelledby="reminders-title">
      <header className="panel__head">
        <div>
          <h2 id="reminders-title">Recordatorios</h2>
          <p>
            Avisos del mes con día y hora. Los mensuales se repiten al cambiar
            de mes.
          </p>
        </div>
      </header>

      <form className="form" onSubmit={handleSubmit}>
        <label>
          Recordatorio
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ej. Pagar luz"
            required
          />
        </label>
        <div className="form__row form__row--3">
          <label>
            Importancia
            <select
              value={importance}
              onChange={(e) => setImportance(e.target.value as Importance)}
            >
              <option value="alta">Alta</option>
              <option value="media">Media</option>
              <option value="baja">Baja</option>
            </select>
          </label>
          <label>
            Tipo
            <select
              value={recurrence}
              onChange={(e) => setRecurrence(e.target.value as Recurrence)}
            >
              <option value="fija">Fija (este mes)</option>
              <option value="mensual">Mensual</option>
            </select>
          </label>
          <label>
            Día
            <input
              type="number"
              min={1}
              max={maxDay}
              value={dueDay}
              onChange={(e) => setDueDay(e.target.value)}
              placeholder="—"
            />
          </label>
        </div>
        <div className="form__row">
          <label>
            Hora
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </label>
          <label>
            Notas
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Opcional"
            />
          </label>
        </div>
        <div className="form__actions">
          {editingId && (
            <button type="button" className="btn btn--ghost" onClick={resetForm}>
              Cancelar
            </button>
          )}
          <button type="submit" className="btn btn--primary">
            {editingId ? 'Guardar recordatorio' : 'Añadir recordatorio'}
          </button>
        </div>
      </form>

      <ul className="list">
        {sorted.length === 0 && (
          <li className="list__empty">No hay recordatorios este mes.</li>
        )}
        {sorted.map((reminder) => (
          <li
            key={reminder.id}
            className={`list__item list__item--task${reminder.done ? ' is-done' : ''}`}
          >
            <label className="check">
              <input
                type="checkbox"
                checked={reminder.done}
                onChange={() => onToggle(reminder.id)}
                aria-label={`Marcar ${reminder.title}`}
              />
              <span className="check__box" aria-hidden="true" />
            </label>
            <div className="list__main">
              <div className="list__title-row">
                <strong>{reminder.title}</strong>
                <span className={`chip chip--imp chip--${reminder.importance}`}>
                  {IMPORTANCE_LABEL[reminder.importance]}
                </span>
                <span className="chip chip--kind">
                  {RECURRENCE_LABEL[reminder.recurrence]}
                </span>
              </div>
              <div className="list__meta">
                {reminder.dueDay != null && <span>Día {reminder.dueDay}</span>}
                {reminder.time && <span>{reminder.time}</span>}
                {reminder.notes && <span>{reminder.notes}</span>}
              </div>
            </div>
            <div className="list__ops">
              <button
                type="button"
                className="btn btn--tiny"
                onClick={() => startEdit(reminder)}
              >
                Editar
              </button>
              <button
                type="button"
                className="btn btn--tiny btn--danger"
                onClick={() => onRemove(reminder.id)}
              >
                Borrar
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
