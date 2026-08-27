import type { FormEvent } from 'react'
import { useEffect, useRef, useState } from 'react'
import type { Importance, Recurrence, WorkItem, WorkStatus } from '../types'
import { createWorkItem, daysInMonth } from '../lib/storage'
import { AddIconButton, FormSheet } from './FormSheet'

interface Props {
  monthKey: string
  workItems: WorkItem[]
  onAdd: (item: WorkItem) => void
  onUpdate: (id: string, patch: Partial<WorkItem>) => void
  onRemove: (id: string) => void
}

const IMPORTANCE_LABEL: Record<Importance, string> = {
  alta: 'Alta',
  media: 'Media',
  baja: 'Baja',
}

const STATUS_LABEL: Record<WorkStatus, string> = {
  pendiente: 'Pendiente',
  en_curso: 'En curso',
  hecho: 'Hecho',
}

const RECURRENCE_LABEL: Record<Recurrence, string> = {
  fija: 'Fija',
  mensual: 'Mensual',
}

export function WorkPanel({
  monthKey,
  workItems,
  onAdd,
  onUpdate,
  onRemove,
}: Props) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [project, setProject] = useState('')
  const [notes, setNotes] = useState('')
  const [importance, setImportance] = useState<Importance>('media')
  const [status, setStatus] = useState<WorkStatus>('pendiente')
  const [recurrence, setRecurrence] = useState<Recurrence>('fija')
  const [dueDay, setDueDay] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const firstFieldRef = useRef<HTMLInputElement>(null)

  const maxDay = daysInMonth(monthKey)
  const sorted = [...workItems].sort((a, b) => {
    const order: Record<WorkStatus, number> = {
      en_curso: 0,
      pendiente: 1,
      hecho: 2,
    }
    return (
      order[a.status] - order[b.status] ||
      (a.dueDay ?? 99) - (b.dueDay ?? 99)
    )
  })

  useEffect(() => {
    if (open) {
      const timer = window.setTimeout(() => firstFieldRef.current?.focus(), 40)
      return () => window.clearTimeout(timer)
    }
  }, [open])

  function resetForm() {
    setTitle('')
    setProject('')
    setNotes('')
    setImportance('media')
    setStatus('pendiente')
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

  function startEdit(item: WorkItem) {
    setEditingId(item.id)
    setTitle(item.title)
    setProject(item.project)
    setNotes(item.notes)
    setImportance(item.importance)
    setStatus(item.status)
    setRecurrence(item.recurrence)
    setDueDay(item.dueDay != null ? String(item.dueDay) : '')
    setOpen(true)
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    const dayNum = dueDay ? Math.min(Math.max(1, Number(dueDay)), maxDay) : null
    const payload = {
      title: title.trim(),
      project: project.trim() || 'General',
      notes: notes.trim(),
      importance,
      status,
      recurrence,
      monthKey,
      dueDay: dayNum && !Number.isNaN(dayNum) ? dayNum : null,
    }

    if (editingId) {
      onUpdate(editingId, payload)
    } else {
      onAdd(createWorkItem(payload))
    }
    closeForm()
  }

  return (
    <section className="panel" aria-labelledby="work-title">
      <header className="panel__head panel__head--row">
        <div>
          <h2 id="work-title">Trabajo</h2>
          <p>
            Encargos y proyectos del mes. Marca el estado y la importancia de
            cada uno.
          </p>
        </div>
        <AddIconButton label="Añadir trabajo" onClick={openCreate} />
      </header>

      <ul className="list">
        {sorted.length === 0 && (
          <li className="list__empty">No hay encargos este mes.</li>
        )}
        {sorted.map((item) => (
          <li
            key={item.id}
            className={`list__item${item.status === 'hecho' ? ' is-done' : ''}`}
          >
            <div className="list__main">
              <div className="list__title-row">
                <strong>{item.title}</strong>
                <span className={`chip chip--status chip--${item.status}`}>
                  {STATUS_LABEL[item.status]}
                </span>
                <span className={`chip chip--imp chip--${item.importance}`}>
                  {IMPORTANCE_LABEL[item.importance]}
                </span>
                <span className="chip chip--kind">
                  {RECURRENCE_LABEL[item.recurrence]}
                </span>
              </div>
              <div className="list__meta">
                <span>{item.project}</span>
                {item.dueDay != null && <span>Día {item.dueDay}</span>}
                {item.notes && <span>{item.notes}</span>}
              </div>
            </div>
            <div className="list__ops">
              <button
                type="button"
                className="btn btn--tiny"
                onClick={() =>
                  onUpdate(item.id, {
                    status:
                      item.status === 'pendiente'
                        ? 'en_curso'
                        : item.status === 'en_curso'
                          ? 'hecho'
                          : 'pendiente',
                  })
                }
              >
                Avanzar
              </button>
              <button
                type="button"
                className="btn btn--tiny"
                onClick={() => startEdit(item)}
              >
                Editar
              </button>
              <button
                type="button"
                className="btn btn--tiny btn--danger"
                onClick={() => onRemove(item.id)}
              >
                Borrar
              </button>
            </div>
          </li>
        ))}
      </ul>

      <FormSheet
        open={open}
        title={editingId ? 'Editar trabajo' : 'Nuevo trabajo'}
        description="Completa el encargo y su estado."
        onClose={closeForm}
      >
        <form className="form form--sheet" onSubmit={handleSubmit}>
          <div className="form__row">
            <label>
              Encargo
              <input
                ref={firstFieldRef}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej. Entregar informe"
                required
              />
            </label>
            <label>
              Proyecto / cliente
              <input
                value={project}
                onChange={(e) => setProject(e.target.value)}
                placeholder="Ej. Cliente Norte"
              />
            </label>
          </div>
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
              Estado
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as WorkStatus)}
              >
                <option value="pendiente">Pendiente</option>
                <option value="en_curso">En curso</option>
                <option value="hecho">Hecho</option>
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
          </div>
          <div className="form__row">
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
            <button type="button" className="btn btn--ghost" onClick={closeForm}>
              Cancelar
            </button>
            <button type="submit" className="btn btn--primary">
              {editingId ? 'Guardar cambios' : 'Guardar trabajo'}
            </button>
          </div>
        </form>
      </FormSheet>
    </section>
  )
}
