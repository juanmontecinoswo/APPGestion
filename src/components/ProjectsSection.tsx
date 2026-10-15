import type { FormEvent } from 'react'
import { useEffect, useRef, useState } from 'react'
import type { WorkProject } from '../types'
import { createWorkProject } from '../lib/storage'
import { AddIconButton, FormSheet } from './FormSheet'
import { ProjectCanvas } from './ProjectCanvas'

interface Props {
  blurb: string
  projects: WorkProject[]
  onAdd: (project: WorkProject) => void
  onUpdate: (id: string, patch: Partial<WorkProject>) => void
  onRemove: (id: string) => void
}

export function ProjectsSection({
  blurb,
  projects,
  onAdd,
  onUpdate,
  onRemove,
}: Props) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [activeId, setActiveId] = useState<string | null>(null)
  const titleRef = useRef<HTMLInputElement>(null)

  const active = projects.find((project) => project.id === activeId) ?? null
  const sorted = [...projects].sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  )

  useEffect(() => {
    if (!open) return
    const id = window.requestAnimationFrame(() => titleRef.current?.focus())
    return () => window.cancelAnimationFrame(id)
  }, [open])

  useEffect(() => {
    if (activeId && !projects.some((project) => project.id === activeId)) {
      setActiveId(null)
    }
  }, [activeId, projects])

  function closeForm() {
    setOpen(false)
    setTitle('')
  }

  function handleCreate(e: FormEvent) {
    e.preventDefault()
    const name = title.trim()
    if (!name) return
    const project = createWorkProject({ title: name })
    onAdd(project)
    closeForm()
    setActiveId(project.id)
  }

  if (active) {
    return (
      <ProjectCanvas
        project={active}
        onBack={() => setActiveId(null)}
        onChange={(patch) => onUpdate(active.id, patch)}
      />
    )
  }

  return (
    <section className="panel" aria-labelledby="projects-title">
      <header className="panel__head panel__head--row">
        <div>
          <h2 id="projects-title">Proyectos</h2>
          <p>{blurb}</p>
        </div>
        <AddIconButton label="Agregar proyecto" onClick={() => setOpen(true)} />
      </header>

      <ul className="list">
        {sorted.length === 0 && (
          <li className="list__empty">
            Aún no hay proyectos. Crea uno para abrir un canvas.
          </li>
        )}
        {sorted.map((project) => (
          <li key={project.id} className="list__item">
            <div className="list__main">
              <div className="list__title-row">
                <strong>{project.title}</strong>
                <span className="chip chip--kind">
                  {project.nodes.length}{' '}
                  {project.nodes.length === 1 ? 'ventana' : 'ventanas'}
                </span>
                <span className="chip chip--kind">
                  {project.edges.length}{' '}
                  {project.edges.length === 1 ? 'conexión' : 'conexiones'}
                </span>
              </div>
              <div className="list__meta">
                <span>
                  Actualizado{' '}
                  {new Date(project.updatedAt).toLocaleString('es-CL')}
                </span>
              </div>
            </div>
            <div className="list__ops">
              <button
                type="button"
                className="btn btn--tiny btn--primary"
                onClick={() => setActiveId(project.id)}
              >
                Abrir
              </button>
              <button
                type="button"
                className="btn btn--tiny btn--danger"
                onClick={() => {
                  if (
                    window.confirm(
                      `¿Eliminar el proyecto "${project.title}"?`,
                    )
                  ) {
                    onRemove(project.id)
                  }
                }}
              >
                Borrar
              </button>
            </div>
          </li>
        ))}
      </ul>

      <FormSheet
        open={open}
        title="Nuevo proyecto"
        description="Se crea un canvas donde podrás agregar ventanas flotantes y conectarlas."
        onClose={closeForm}
      >
        <form className="form form--sheet" onSubmit={handleCreate}>
          <label>
            Nombre del proyecto
            <input
              ref={titleRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej. Lanzamiento app"
              required
            />
          </label>
          <div className="form__actions">
            <button type="button" className="btn btn--ghost" onClick={closeForm}>
              Cancelar
            </button>
            <button type="submit" className="btn btn--primary">
              Crear proyecto
            </button>
          </div>
        </form>
      </FormSheet>
    </section>
  )
}
