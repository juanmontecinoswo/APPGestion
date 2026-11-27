import type { FormEvent } from 'react'
import { useEffect, useRef, useState } from 'react'
import type { Importance, Recurrence, Task } from '../types'
import { createTask, daysInMonth } from '../lib/storage'
import { AddIconButton, FormSheet } from './FormSheet'

interface Props {
  monthKey: string
  tasks: Task[]
  onAdd: (task: Task) => void
  onUpdate: (id: string, patch: Partial<Task>) => void
  onRemove: (id: string) => void
  onToggle: (id: string) => void
}

const IMPORTANCE_ORDER: Record<Importance, number> = {
  alta: 0,
  media: 1,
  baja: 2,
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

export function TasksPanel({
  monthKey,
  tasks,
  onAdd,
  onUpdate,
  onRemove,
  onToggle,
}: Props) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [importance, setImportance] = useState<Importance>('media')
  const [recurrence, setRecurrence] = useState<Recurrence>('fija')
  const [dueDay, setDueDay] = useState('')
  const [filter, setFilter] = useState<'todas' | Importance | 'pendientes'>('todas')
  const [editingId, setEditingId] = useState<string | null>(null)
  const firstFieldRef = useRef<HTMLInputElement>(null)

  const maxDay = daysInMonth(monthKey)

  const filtered = [...tasks]
    .filter((t) => {
      if (filter === 'pendientes') return !t.done
      if (filter === 'todas') return true
      return t.importance === filter
    })
    .sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1
      const imp = IMPORTANCE_ORDER[a.importance] - IMPORTANCE_ORDER[b.importance]
      if (imp !== 0) return imp
      return (a.dueDay ?? 99) - (b.dueDay ?? 99)
    })

  useEffect(() => {
    if (open) {
      const timer = window.setTimeout(() => firstFieldRef.current?.focus(), 40)
      return () => window.clearTimeout(timer)
    }
  }, [open])

  function resetForm() {
    setTitle('')
    setNotes('')
    setImportance('media')
    setRecurrence('fija')
    setDueDay('')
    setEditingId(null)
  }

  function closeForm() {
    setOpen(false)
    resetForm()
  }

  function openCreate() {
    resetForm()
    setOpen(true)
  }

  function startEdit(task: Task) {
    setEditingId(task.id)
    setTitle(task.title)
    setNotes(task.notes)
    setImportance(task.importance)
    setRecurrence(task.recurrence)
    setDueDay(task.dueDay != null ? String(task.dueDay) : '')
    setOpen(true)
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
    }

    if (editingId) {
      onUpdate(editingId, payload)
    } else {
      onAdd(createTask(payload))
    }
    closeForm()
  }

  return (
    <section className="panel" aria-labelledby="tareas-title">
      <header className="panel__head panel__head--row">
        <div>
          <h2 id="tareas-title">Tareas del mes</h2>
          <p>
            Prioriza por importancia. Las <em>fijas</em> son de este mes; las{' '}
            <em>mensuales</em> se repiten al cambiar de mes.
          </p>
        </div>
        <AddIconButton label="Añadir tarea" onClick={openCreate} />
      </header>

      <div className="filters" role="tablist" aria-label="Filtrar tareas">
        {(
          [
            ['todas', 'Todas'],
            ['pendientes', 'Pendientes'],
            ['alta', 'Alta'],
            ['media', 'Media'],
            ['baja', 'Baja'],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={filter === value}
            className={`filter${filter === value ? ' is-active' : ''}`}
            onClick={() => setFilter(value)}
          >
            {label}
          </button>
        ))}
      </div>

      <ul className="list">
        {filtered.length === 0 && (
          <li className="list__empty">No hay tareas con este filtro.</li>
        )}
        {filtered.map((task) => (
          <li
            key={task.id}
            className={`list__item list__item--task${task.done ? ' is-done' : ''}`}
          >
            <label className="check">
              <input
                type="checkbox"
                checked={task.done}
                onChange={() => onToggle(task.id)}
                aria-label={`Marcar ${task.title}`}
              />
              <span className="check__box" aria-hidden="true" />
            </label>
            <div className="list__main">
              <div className="list__title-row">
                <strong>{task.title}</strong>
                <span className={`chip chip--imp chip--${task.importance}`}>
                  {IMPORTANCE_LABEL[task.importance]}
                </span>
                <span className="chip chip--kind">
                  {RECURRENCE_LABEL[task.recurrence]}
                </span>
              </div>
              <div className="list__meta">
                {task.dueDay != null && <span>Día {task.dueDay}</span>}
                {task.notes && <span>{task.notes}</span>}
              </div>
            </div>
            <div className="list__ops">
              <button
                type="button"
                className="btn btn--tiny"
                onClick={() => startEdit(task)}
              >
                Editar
              </button>
              <button
                type="button"
                className="btn btn--tiny btn--danger"
                onClick={() => onRemove(task.id)}
              >
                Borrar
              </button>
            </div>
          </li>
        ))}
      </ul>

      <FormSheet
        open={open}
        title={editingId ? 'Editar tarea' : 'Nueva tarea'}
        description="Completa los datos de la tarea."
        onClose={closeForm}
      >
        <form className="form form--sheet" onSubmit={handleSubmit}>
          <label>
            Tarea
            <input
              ref={firstFieldRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej. Renovar seguro"
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
                <option value="mensual">Mensual (se repite)</option>
              </select>
            </label>
            <label>
              Día límite
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
          <label>
            Notas
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Opcional"
            />
          </label>
          <div className="form__actions">
            <button type="button" className="btn btn--ghost" onClick={closeForm}>
              Cancelar
            </button>
            <button type="submit" className="btn btn--primary">
              {editingId ? 'Guardar cambios' : 'Guardar tarea'}
            </button>
          </div>
        </form>
      </FormSheet>
    </section>
  )
}
