import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import type { ProjectNode, ProjectPort, WorkProject } from '../types'
import { createProjectEdge, createProjectNode } from '../lib/storage'

interface Props {
  project: WorkProject
  onChange: (patch: Pick<WorkProject, 'nodes' | 'edges' | 'title'>) => void
  onBack: () => void
}

const NODE_W = 220
const PORTS: ProjectPort[] = ['n', 'e', 's', 'w']

type PendingLink = { nodeId: string; port: ProjectPort }

function portOffset(port: ProjectPort): { x: number; y: number } {
  switch (port) {
    case 'n':
      return { x: NODE_W / 2, y: 0 }
    case 'e':
      return { x: NODE_W, y: 36 }
    case 's':
      return { x: NODE_W / 2, y: 1 }
    case 'w':
      return { x: 0, y: 36 }
  }
}

function nodeHeight(node: ProjectNode): number {
  const lines = Math.max(node.points.length, 1)
  return 72 + lines * 22
}

function portPoint(node: ProjectNode, port: ProjectPort): { x: number; y: number } {
  const height = nodeHeight(node)
  const base = portOffset(port)
  const y =
    port === 's' ? height : port === 'n' ? 0 : Math.min(height - 12, Math.max(24, base.y))
  return { x: node.x + base.x, y: node.y + y }
}

function edgePath(
  from: { x: number; y: number },
  to: { x: number; y: number },
): string {
  const dx = Math.max(40, Math.abs(to.x - from.x) * 0.45)
  return `M ${from.x} ${from.y} C ${from.x + (to.x >= from.x ? dx : -dx)} ${from.y}, ${
    to.x - (to.x >= from.x ? dx : -dx)
  } ${to.y}, ${to.x} ${to.y}`
}

export function ProjectCanvas({ project, onChange, onBack }: Props) {
  const boardRef = useRef<HTMLDivElement>(null)
  const [title, setTitle] = useState(project.title)
  const [pending, setPending] = useState<PendingLink | null>(null)
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null)
  const [drag, setDrag] = useState<{
    id: string
    offsetX: number
    offsetY: number
  } | null>(null)
  const [pointDrafts, setPointDrafts] = useState<Record<string, string>>({})

  useEffect(() => {
    setTitle(project.title)
  }, [project.id, project.title])

  const nodeMap = useMemo(() => {
    const map = new Map<string, ProjectNode>()
    for (const node of project.nodes) map.set(node.id, node)
    return map
  }, [project.nodes])

  const commit = useCallback(
    (patch: Partial<Pick<WorkProject, 'nodes' | 'edges' | 'title'>>) => {
      onChange({
        title: patch.title ?? title,
        nodes: patch.nodes ?? project.nodes,
        edges: patch.edges ?? project.edges,
      })
    },
    [onChange, project.edges, project.nodes, title],
  )

  function addWindow() {
    const index = project.nodes.length
    const node = createProjectNode({
      title: `Ventana ${index + 1}`,
      x: 60 + (index % 4) * 40,
      y: 60 + (index % 4) * 40,
      points: [],
    })
    commit({ nodes: [...project.nodes, node] })
  }

  function updateNode(id: string, patch: Partial<ProjectNode>) {
    commit({
      nodes: project.nodes.map((node) =>
        node.id === id ? { ...node, ...patch } : node,
      ),
    })
  }

  function removeNode(id: string) {
    commit({
      nodes: project.nodes.filter((node) => node.id !== id),
      edges: project.edges.filter(
        (edge) => edge.fromId !== id && edge.toId !== id,
      ),
    })
    if (pending?.nodeId === id) setPending(null)
  }

  function addPoint(nodeId: string) {
    const text = (pointDrafts[nodeId] ?? '').trim()
    if (!text) return
    const node = nodeMap.get(nodeId)
    if (!node) return
    updateNode(nodeId, { points: [...node.points, text] })
    setPointDrafts((prev) => ({ ...prev, [nodeId]: '' }))
  }

  function removePoint(nodeId: string, index: number) {
    const node = nodeMap.get(nodeId)
    if (!node) return
    updateNode(nodeId, {
      points: node.points.filter((_, i) => i !== index),
    })
  }

  function onPortClick(nodeId: string, port: ProjectPort) {
    if (!pending) {
      setPending({ nodeId, port })
      setSelectedEdgeId(null)
      return
    }
    if (pending.nodeId === nodeId) {
      setPending({ nodeId, port })
      return
    }
    const exists = project.edges.some(
      (edge) =>
        (edge.fromId === pending.nodeId &&
          edge.fromPort === pending.port &&
          edge.toId === nodeId &&
          edge.toPort === port) ||
        (edge.fromId === nodeId &&
          edge.fromPort === port &&
          edge.toId === pending.nodeId &&
          edge.toPort === pending.port),
    )
    if (!exists) {
      const edge = createProjectEdge({
        fromId: pending.nodeId,
        fromPort: pending.port,
        toId: nodeId,
        toPort: port,
      })
      commit({ edges: [...project.edges, edge] })
    }
    setPending(null)
  }

  function removeSelectedEdge() {
    if (!selectedEdgeId) return
    commit({
      edges: project.edges.filter((edge) => edge.id !== selectedEdgeId),
    })
    setSelectedEdgeId(null)
  }

  function onNodePointerDown(
    event: ReactPointerEvent<HTMLElement>,
    node: ProjectNode,
  ) {
    if ((event.target as HTMLElement).closest('[data-port], button, input, textarea')) {
      return
    }
    const board = boardRef.current
    if (!board) return
    const rect = board.getBoundingClientRect()
    setDrag({
      id: node.id,
      offsetX: event.clientX - rect.left - node.x + board.scrollLeft,
      offsetY: event.clientY - rect.top - node.y + board.scrollTop,
    })
    ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
  }

  function onBoardPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!drag || !boardRef.current) return
    const rect = boardRef.current.getBoundingClientRect()
    const x = Math.max(
      8,
      event.clientX - rect.left + boardRef.current.scrollLeft - drag.offsetX,
    )
    const y = Math.max(
      8,
      event.clientY - rect.top + boardRef.current.scrollTop - drag.offsetY,
    )
    updateNode(drag.id, { x, y })
  }

  function onBoardPointerUp() {
    setDrag(null)
  }

  const canvasSize = useMemo(() => {
    let maxX = 900
    let maxY = 560
    for (const node of project.nodes) {
      maxX = Math.max(maxX, node.x + NODE_W + 120)
      maxY = Math.max(maxY, node.y + nodeHeight(node) + 120)
    }
    return { width: maxX, height: maxY }
  }, [project.nodes])

  return (
    <section className="panel project-canvas" aria-label={`Proyecto ${project.title}`}>
      <header className="panel__head panel__head--row project-canvas__head">
        <div className="project-canvas__title-wrap">
          <button type="button" className="btn btn--ghost btn--tiny" onClick={onBack}>
            ← Proyectos
          </button>
          <input
            className="project-canvas__title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => {
              if (title.trim() && title.trim() !== project.title) {
                commit({ title: title.trim() })
              } else {
                setTitle(project.title)
              }
            }}
            aria-label="Nombre del proyecto"
          />
        </div>
        <div className="project-canvas__actions">
          {pending && (
            <span className="project-canvas__hint">
              Elige otro punto para conectar
            </span>
          )}
          {selectedEdgeId && (
            <button
              type="button"
              className="btn btn--tiny btn--danger"
              onClick={removeSelectedEdge}
            >
              Borrar conexión
            </button>
          )}
          {pending && (
            <button
              type="button"
              className="btn btn--tiny"
              onClick={() => setPending(null)}
            >
              Cancelar
            </button>
          )}
          <button type="button" className="btn btn--primary" onClick={addWindow}>
            Agregar ventana
          </button>
        </div>
      </header>

      <p className="project-canvas__help">
        Arrastra las ventanas. Haz clic en un punto (●) y luego en otro para
        conectarlas. Dentro de cada ventana puedes agregar puntos.
      </p>

      <div
        ref={boardRef}
        className={`project-canvas__board${pending ? ' is-linking' : ''}`}
        onPointerMove={onBoardPointerMove}
        onPointerUp={onBoardPointerUp}
        onPointerLeave={onBoardPointerUp}
      >
        <div
          className="project-canvas__surface"
          style={{ width: canvasSize.width, height: canvasSize.height }}
        >
          <svg
            className="project-canvas__edges"
            width={canvasSize.width}
            height={canvasSize.height}
          >
            {project.edges.map((edge) => {
              const from = nodeMap.get(edge.fromId)
              const to = nodeMap.get(edge.toId)
              if (!from || !to) return null
              const a = portPoint(from, edge.fromPort)
              const b = portPoint(to, edge.toPort)
              const selected = edge.id === selectedEdgeId
              return (
                <path
                  key={edge.id}
                  d={edgePath(a, b)}
                  className={`project-canvas__edge${selected ? ' is-selected' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedEdgeId(edge.id)
                    setPending(null)
                  }}
                />
              )
            })}
          </svg>

          {project.nodes.map((node) => (
            <article
              key={node.id}
              className={`project-window${drag?.id === node.id ? ' is-dragging' : ''}`}
              style={{
                width: NODE_W,
                left: node.x,
                top: node.y,
              }}
              onPointerDown={(e) => onNodePointerDown(e, node)}
            >
              <header className="project-window__head">
                <input
                  value={node.title}
                  onChange={(e) => updateNode(node.id, { title: e.target.value })}
                  aria-label="Título de la ventana"
                />
                <button
                  type="button"
                  className="btn btn--icon btn--tiny"
                  aria-label="Borrar ventana"
                  onClick={() => removeNode(node.id)}
                >
                  ×
                </button>
              </header>

              <ul className="project-window__points">
                {node.points.length === 0 && (
                  <li className="project-window__empty">Sin puntos</li>
                )}
                {node.points.map((point, index) => (
                  <li key={`${node.id}-${index}`}>
                    <span>{point}</span>
                    <button
                      type="button"
                      className="btn btn--tiny btn--danger"
                      onClick={() => removePoint(node.id, index)}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>

              <form
                className="project-window__add"
                onSubmit={(e) => {
                  e.preventDefault()
                  addPoint(node.id)
                }}
              >
                <input
                  value={pointDrafts[node.id] ?? ''}
                  onChange={(e) =>
                    setPointDrafts((prev) => ({
                      ...prev,
                      [node.id]: e.target.value,
                    }))
                  }
                  placeholder="Nuevo punto"
                  aria-label={`Agregar punto a ${node.title}`}
                />
                <button type="submit" className="btn btn--tiny btn--primary">
                  +
                </button>
              </form>

              {PORTS.map((port) => (
                <button
                  key={port}
                  type="button"
                  data-port={port}
                  className={`project-window__port project-window__port--${port}${
                    pending?.nodeId === node.id && pending.port === port
                      ? ' is-active'
                      : ''
                  }`}
                  aria-label={`Punto ${port} de ${node.title}`}
                  onClick={(e) => {
                    e.stopPropagation()
                    onPortClick(node.id, port)
                  }}
                />
              ))}
            </article>
          ))}

          {project.nodes.length === 0 && (
            <p className="project-canvas__empty">
              Agrega una ventana para empezar el canvas.
            </p>
          )}
        </div>
      </div>
    </section>
  )
}
