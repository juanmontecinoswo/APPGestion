import type { FormEvent } from 'react'
import { useEffect, useRef, useState } from 'react'
import type {
  Importance,
  Recurrence,
  WorkItem,
  WorkLink,
  WorkNote,
  WorkStatus,
} from '../types'
import {
  createWorkItem,
  createWorkLink,
  createWorkNote,
  daysInMonth,
} from '../lib/storage'
import { AddIconButton, FormSheet } from './FormSheet'

interface Props {
  monthKey: string
  workItems: WorkItem[]
  workNotes: WorkNote[]
  workLinks: WorkLink[]
  onAdd: (item: WorkItem) => void
  onUpdate: (id: string, patch: Partial<WorkItem>) => void
  onRemove: (id: string) => void
  onAddNote: (note: WorkNote) => void
  onUpdateNote: (id: string, patch: Partial<WorkNote>) => void
  onRemoveNote: (id: string) => void
  onAddLink: (link: WorkLink) => void
  onUpdateLink: (id: string, patch: Partial<WorkLink>) => void
  onRemoveLink: (id: string) => void
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

function normalizeUrl(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return ''
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return `https://${trimmed}`
}

export function WorkPanel({
  monthKey,
  workItems,
  workNotes,
  workLinks,
  onAdd,
  onUpdate,
  onRemove,
  onAddNote,
  onUpdateNote,
  onRemoveNote,
  onAddLink,
  onUpdateLink,
  onRemoveLink,
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

  const [noteOpen, setNoteOpen] = useState(false)
  const [noteTitle, setNoteTitle] = useState('')
  const [noteBody, setNoteBody] = useState('')
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const noteFieldRef = useRef<HTMLInputElement>(null)

  const [linkOpen, setLinkOpen] = useState(false)
  const [linkTitle, setLinkTitle] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [linkDescription, setLinkDescription] = useState('')
  const [editingLinkId, setEditingLinkId] = useState<string | null>(null)
  const linkFieldRef = useRef<HTMLInputElement>(null)

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

  const sortedNotes = [...workNotes].sort(
    (a, b) => b.updatedAt.localeCompare(a.updatedAt),
  )
  const sortedLinks = [...workLinks].sort(
    (a, b) => b.createdAt.localeCompare(a.createdAt),
  )

  useEffect(() => {
    if (open) {
      const timer = window.setTimeout(() => firstFieldRef.current?.focus(), 40)
      return () => window.clearTimeout(timer)
    }
  }, [open])

  useEffect(() => {
    if (noteOpen) {
      const timer = window.setTimeout(() => noteFieldRef.current?.focus(), 40)
      return () => window.clearTimeout(timer)
    }
  }, [noteOpen])

  useEffect(() => {
    if (linkOpen) {
      const timer = window.setTimeout(() => linkFieldRef.current?.focus(), 40)
      return () => window.clearTimeout(timer)
    }
  }, [linkOpen])

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

  function resetNoteForm() {
    setNoteTitle('')
    setNoteBody('')
    setEditingNoteId(null)
  }

  function closeNoteForm() {
    setNoteOpen(false)
    resetNoteForm()
  }

  function openCreateNote() {
    resetNoteForm()
    setNoteOpen(true)
  }

  function startEditNote(note: WorkNote) {
    setEditingNoteId(note.id)
    setNoteTitle(note.title)
    setNoteBody(note.body)
    setNoteOpen(true)
  }

  function handleNoteSubmit(e: FormEvent) {
    e.preventDefault()
    if (!noteTitle.trim()) return
    const payload = {
      title: noteTitle.trim(),
      body: noteBody.trim(),
    }
    if (editingNoteId) {
      onUpdateNote(editingNoteId, payload)
    } else {
      onAddNote(createWorkNote(payload))
    }
    closeNoteForm()
  }

  function resetLinkForm() {
    setLinkTitle('')
    setLinkUrl('')
    setLinkDescription('')
    setEditingLinkId(null)
  }

  function closeLinkForm() {
    setLinkOpen(false)
    resetLinkForm()
  }

  function openCreateLink() {
    resetLinkForm()
    setLinkOpen(true)
  }

  function startEditLink(link: WorkLink) {
    setEditingLinkId(link.id)
    setLinkTitle(link.title)
    setLinkUrl(link.url)
    setLinkDescription(link.description)
    setLinkOpen(true)
  }

  function handleLinkSubmit(e: FormEvent) {
    e.preventDefault()
    if (!linkTitle.trim() || !linkUrl.trim()) return
    const payload = {
      title: linkTitle.trim(),
      url: normalizeUrl(linkUrl),
      description: linkDescription.trim(),
    }
    if (editingLinkId) {
      onUpdateLink(editingLinkId, payload)
    } else {
      onAddLink(createWorkLink(payload))
    }
    closeLinkForm()
  }

  return (
    <section className="panel" aria-labelledby="work-title">
      <header className="panel__head panel__head--row">
        <div>
          <h2 id="work-title">Trabajo</h2>
          <p>
            Encargos, notas y enlaces útiles. Marca el estado de cada encargo y
            guarda referencias del día a día.
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

      <div className="work-extras">
        <section className="work-block" aria-labelledby="work-notes-title">
          <header className="panel__head panel__head--row">
            <div>
              <h3 id="work-notes-title">Notas</h3>
              <p>Apuntes rápidos del trabajo, ideas y recordatorios libres.</p>
            </div>
            <AddIconButton label="Añadir nota" onClick={openCreateNote} />
          </header>

          <ul className="list">
            {sortedNotes.length === 0 && (
              <li className="list__empty">Aún no hay notas.</li>
            )}
            {sortedNotes.map((note) => (
              <li key={note.id} className="list__item">
                <div className="list__main">
                  <div className="list__title-row">
                    <strong>{note.title}</strong>
                  </div>
                  {note.body && (
                    <p className="work-block__body">{note.body}</p>
                  )}
                </div>
                <div className="list__ops">
                  <button
                    type="button"
                    className="btn btn--tiny"
                    onClick={() => startEditNote(note)}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    className="btn btn--tiny btn--danger"
                    onClick={() => onRemoveNote(note.id)}
                  >
                    Borrar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="work-block" aria-labelledby="work-links-title">
          <header className="panel__head panel__head--row">
            <div>
              <h3 id="work-links-title">Links</h3>
              <p>
                Enlaces con descripción para documentos, paneles y referencias.
              </p>
            </div>
            <AddIconButton label="Añadir link" onClick={openCreateLink} />
          </header>

          <ul className="list">
            {sortedLinks.length === 0 && (
              <li className="list__empty">Aún no hay links.</li>
            )}
            {sortedLinks.map((link) => (
              <li key={link.id} className="list__item">
                <div className="list__main">
                  <div className="list__title-row">
                    <strong>
                      <a
                        className="work-link"
                        href={link.url}
                        target="_blank"
                        rel="noreferrer noopener"
                      >
                        {link.title}
                      </a>
                    </strong>
                  </div>
                  <div className="list__meta">
                    <span className="work-link__url">{link.url}</span>
                    {link.description && <span>{link.description}</span>}
                  </div>
                </div>
                <div className="list__ops">
                  <button
                    type="button"
                    className="btn btn--tiny"
                    onClick={() => startEditLink(link)}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    className="btn btn--tiny btn--danger"
                    onClick={() => onRemoveLink(link.id)}
                  >
                    Borrar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>

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

      <FormSheet
        open={noteOpen}
        title={editingNoteId ? 'Editar nota' : 'Nueva nota'}
        description="Guarda un apunte con título y contenido."
        onClose={closeNoteForm}
      >
        <form className="form form--sheet" onSubmit={handleNoteSubmit}>
          <label>
            Título
            <input
              ref={noteFieldRef}
              value={noteTitle}
              onChange={(e) => setNoteTitle(e.target.value)}
              placeholder="Ej. Ideas reunión"
              required
            />
          </label>
          <label>
            Contenido
            <textarea
              value={noteBody}
              onChange={(e) => setNoteBody(e.target.value)}
              placeholder="Escribe la nota…"
              rows={5}
            />
          </label>
          <div className="form__actions">
            <button
              type="button"
              className="btn btn--ghost"
              onClick={closeNoteForm}
            >
              Cancelar
            </button>
            <button type="submit" className="btn btn--primary">
              {editingNoteId ? 'Guardar cambios' : 'Guardar nota'}
            </button>
          </div>
        </form>
      </FormSheet>

      <FormSheet
        open={linkOpen}
        title={editingLinkId ? 'Editar link' : 'Nuevo link'}
        description="Agrega un enlace con título y descripción."
        onClose={closeLinkForm}
      >
        <form className="form form--sheet" onSubmit={handleLinkSubmit}>
          <label>
            Título
            <input
              ref={linkFieldRef}
              value={linkTitle}
              onChange={(e) => setLinkTitle(e.target.value)}
              placeholder="Ej. Panel del cliente"
              required
            />
          </label>
          <label>
            URL
            <input
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://…"
              required
            />
          </label>
          <label>
            Descripción
            <textarea
              value={linkDescription}
              onChange={(e) => setLinkDescription(e.target.value)}
              placeholder="Para qué sirve este enlace…"
              rows={3}
            />
          </label>
          <div className="form__actions">
            <button
              type="button"
              className="btn btn--ghost"
              onClick={closeLinkForm}
            >
              Cancelar
            </button>
            <button type="submit" className="btn btn--primary">
              {editingLinkId ? 'Guardar cambios' : 'Guardar link'}
            </button>
          </div>
        </form>
      </FormSheet>
    </section>
  )
}
