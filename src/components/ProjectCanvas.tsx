import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import type {
  ProjectNode,
  ProjectNodeTone,
  ProjectPort,
  WorkProject,
} from '../types'
import { createProjectEdge, createProjectNode } from '../lib/storage'

interface Props {
  project: WorkProject
  onChange: (patch: Pick<WorkProject, 'nodes' | 'edges' | 'title'>) => void
  onBack: () => void
}

const NODE_W = 248
const PORTS: ProjectPort[] = ['n', 'e', 's', 'w']
const TONES: ProjectNodeTone[] = ['sky', 'mint', 'sand', 'coral', 'violet']
const GRID = 24

type PendingLink = { nodeId: string; port: ProjectPort }

function nodeHeight(node: ProjectNode): number {
  const lines = Math.max(node.points.length, 0)
  return 118 + lines * 28
}

function portPoint(
  node: ProjectNode,
  port: ProjectPort,
): { x: number; y: number } {
  const height = nodeHeight(node)
  switch (port) {
    case 'n':
      return { x: node.x + NODE_W / 2, y: node.y }
    case 'e':
      return { x: node.x + NODE_W, y: node.y + height * 0.42 }
    case 's':
      return { x: node.x + NODE_W / 2, y: node.y + height }
    case 'w':
      return { x: node.x, y: node.y + height * 0.42 }
  }
}

function edgePath(
  from: { x: number; y: number },
  to: { x: number; y: number },
  fromPort: ProjectPort,
  toPort: ProjectPort,
): string {
  const pull = (port: ProjectPort, amount: number) => {
    if (port === 'e') return amount
    if (port === 'w') return -amount
    return 0
  }
  const pullY = (port: ProjectPort, amount: number) => {
    if (port === 's') return amount
    if (port === 'n') return -amount
    return 0
  }
  const amount = Math.max(48, Math.abs(to.x - from.x) * 0.4)
  const c1x = from.x + pull(fromPort, amount)
  const c1y = from.y + pullY(fromPort, amount)
  const c2x = to.x + pull(toPort, amount)
  const c2y = to.y + pullY(toPort, amount)
  return `M ${from.x} ${from.y} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${to.x} ${to.y}`
}

function snap(value: number, enabled: boolean): number {
  if (!enabled) return Math.max(8, value)
  return Math.max(8, Math.round(value / GRID) * GRID)
}

function nextTone(current?: ProjectNodeTone): ProjectNodeTone {
  const index = TONES.indexOf(current ?? 'sky')
  return TONES[(index + 1) % TONES.length]
}

export function ProjectCanvas({ project, onChange, onBack }: Props) {
  const boardRef = useRef<HTMLDivElement>(null)
  const [title, setTitle] = useState(project.title)
  const [nodes, setNodes] = useState(project.nodes)
  const [edges, setEdges] = useState(project.edges)
  const [pending, setPending] = useState<PendingLink | null>(null)
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [editingPoint, setEditingPoint] = useState<{
    nodeId: string
    index: number
  } | null>(null)
  const [pointDrafts, setPointDrafts] = useState<Record<string, string>>({})
  const [zoom, setZoom] = useState(1)
  const [snapGrid, setSnapGrid] = useState(true)
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null)
  const [drag, setDrag] = useState<{
    id: string
    offsetX: number
    offsetY: number
  } | null>(null)
  const nodesRef = useRef(nodes)
  nodesRef.current = nodes

  useEffect(() => {
    setTitle(project.title)
    setNodes(project.nodes)
    setEdges(project.edges)
    setPending(null)
    setSelectedEdgeId(null)
    setSelectedNodeId(null)
    setEditingPoint(null)
  }, [project.id])

  useEffect(() => {
    setTitle(project.title)
  }, [project.title])

  useEffect(() => {
    if (drag) return
    setNodes(project.nodes)
  }, [project.nodes, drag])

  useEffect(() => {
    setEdges(project.edges)
  }, [project.edges])

  const nodeMap = useMemo(() => {
    const map = new Map<string, ProjectNode>()
    for (const node of nodes) map.set(node.id, node)
    return map
  }, [nodes])

  const persist = useCallback(
    (
      nextNodes: ProjectNode[],
      nextEdges: typeof edges,
      nextTitle = title,
    ) => {
      onChange({
        title: nextTitle,
        nodes: nextNodes,
        edges: nextEdges,
      })
    },
    [onChange, title],
  )

  function replaceNodes(updater: (current: ProjectNode[]) => ProjectNode[]) {
    setNodes((current) => {
      const next = updater(current)
      persist(next, edges)
      return next
    })
  }

  function replaceEdges(updater: (current: typeof edges) => typeof edges) {
    setEdges((current) => {
      const next = updater(current)
      persist(nodes, next)
      return next
    })
  }

  function boardPoint(event: { clientX: number; clientY: number }) {
    const board = boardRef.current
    if (!board) return { x: 0, y: 0 }
    const rect = board.getBoundingClientRect()
    return {
      x: (event.clientX - rect.left + board.scrollLeft) / zoom,
      y: (event.clientY - rect.top + board.scrollTop) / zoom,
    }
  }

  function addWindow(at?: { x: number; y: number }) {
    const index = nodes.length
    const tone = TONES[index % TONES.length]
    const node = createProjectNode({
      title: `Idea ${index + 1}`,
      x: snap(at?.x ?? 72 + (index % 5) * 36, snapGrid),
      y: snap(at?.y ?? 72 + (index % 5) * 36, snapGrid),
      points: ['Nuevo punto'],
      tone,
    })
    const next = [...nodes, node]
    setNodes(next)
    setSelectedNodeId(node.id)
    persist(next, edges)
  }

  function updateNodeLocal(id: string, patch: Partial<ProjectNode>) {
    setNodes((current) =>
      current.map((node) => (node.id === id ? { ...node, ...patch } : node)),
    )
  }

  function commitNodes() {
    persist(nodesRef.current, edges)
  }

  function removeNode(id: string) {
    const nextNodes = nodes.filter((node) => node.id !== id)
    const nextEdges = edges.filter(
      (edge) => edge.fromId !== id && edge.toId !== id,
    )
    setNodes(nextNodes)
    setEdges(nextEdges)
    if (pending?.nodeId === id) setPending(null)
    if (selectedNodeId === id) setSelectedNodeId(null)
    persist(nextNodes, nextEdges)
  }

  function addPoint(nodeId: string) {
    const text = (pointDrafts[nodeId] ?? '').trim()
    if (!text) return
    replaceNodes((current) =>
      current.map((node) =>
        node.id === nodeId
          ? { ...node, points: [...node.points, text] }
          : node,
      ),
    )
    setPointDrafts((prev) => ({ ...prev, [nodeId]: '' }))
  }

  function updatePoint(nodeId: string, index: number, text: string) {
    replaceNodes((current) =>
      current.map((node) =>
        node.id === nodeId
          ? {
              ...node,
              points: node.points.map((point, i) =>
                i === index ? text : point,
              ),
            }
          : node,
      ),
    )
  }

  function removePoint(nodeId: string, index: number) {
    replaceNodes((current) =>
      current.map((node) =>
        node.id === nodeId
          ? { ...node, points: node.points.filter((_, i) => i !== index) }
          : node,
      ),
    )
    setEditingPoint(null)
  }

  function onPortClick(nodeId: string, port: ProjectPort) {
    if (!pending) {
      setPending({ nodeId, port })
      setSelectedEdgeId(null)
      setSelectedNodeId(nodeId)
      return
    }
    if (pending.nodeId === nodeId) {
      setPending({ nodeId, port })
      return
    }
    const exists = edges.some(
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
      replaceEdges((current) => [...current, edge])
    }
    setPending(null)
  }

  function removeSelected() {
    if (selectedEdgeId) {
      replaceEdges((current) =>
        current.filter((edge) => edge.id !== selectedEdgeId),
      )
      setSelectedEdgeId(null)
      return
    }
    if (selectedNodeId) {
      removeNode(selectedNodeId)
    }
  }

  function onNodePointerDown(
    event: ReactPointerEvent<HTMLElement>,
    node: ProjectNode,
  ) {
    if (
      (event.target as HTMLElement).closest(
        '[data-port], button, input, textarea, .project-window__points',
      )
    ) {
      return
    }
    const point = boardPoint(event)
    setDrag({
      id: node.id,
      offsetX: point.x - node.x,
      offsetY: point.y - node.y,
    })
    setSelectedNodeId(node.id)
    setSelectedEdgeId(null)
    ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
  }

  function onBoardPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const point = boardPoint(event)
    if (pending) setCursor(point)
    if (!drag) return
    updateNodeLocal(drag.id, {
      x: snap(point.x - drag.offsetX, snapGrid),
      y: snap(point.y - drag.offsetY, snapGrid),
    })
  }

  function onBoardPointerUp() {
    if (drag) {
      commitNodes()
      setDrag(null)
    }
  }

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setPending(null)
        setSelectedEdgeId(null)
        setEditingPoint(null)
        return
      }
      const target = event.target as HTMLElement | null
      if (target && ['INPUT', 'TEXTAREA'].includes(target.tagName)) return
      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault()
        removeSelected()
      }
      if (event.key === '+' || event.key === '=') {
        setZoom((z) => Math.min(1.6, Number((z + 0.1).toFixed(2))))
      }
      if (event.key === '-') {
        setZoom((z) => Math.max(0.6, Number((z - 0.1).toFixed(2))))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const canvasSize = useMemo(() => {
    let maxX = 1100
    let maxY = 700
    for (const node of nodes) {
      maxX = Math.max(maxX, node.x + NODE_W + 180)
      maxY = Math.max(maxY, node.y + nodeHeight(node) + 180)
    }
    return { width: maxX, height: maxY }
  }, [nodes])

  const previewPath =
    pending && cursor
      ? (() => {
          const fromNode = nodeMap.get(pending.nodeId)
          if (!fromNode) return null
          const from = portPoint(fromNode, pending.port)
          return edgePath(from, cursor, pending.port, 'w')
        })()
      : null

  return (
    <section
      className="panel project-canvas"
      aria-label={`Proyecto ${project.title}`}
    >
      <header className="panel__head panel__head--row project-canvas__head">
        <div className="project-canvas__title-wrap">
          <button
            type="button"
            className="btn btn--ghost btn--tiny"
            onClick={onBack}
          >
            ← Proyectos
          </button>
          <input
            className="project-canvas__title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => {
              if (title.trim() && title.trim() !== project.title) {
                persist(nodes, edges, title.trim())
              } else {
                setTitle(project.title)
              }
            }}
            aria-label="Nombre del proyecto"
          />
        </div>
        <div className="project-canvas__actions">
          <div className="project-canvas__zoom" role="group" aria-label="Zoom">
            <button
              type="button"
              className="btn btn--icon btn--tiny"
              aria-label="Alejar"
              onClick={() =>
                setZoom((z) => Math.max(0.6, Number((z - 0.1).toFixed(2))))
              }
            >
              −
            </button>
            <span>{Math.round(zoom * 100)}%</span>
            <button
              type="button"
              className="btn btn--icon btn--tiny"
              aria-label="Acercar"
              onClick={() =>
                setZoom((z) => Math.min(1.6, Number((z + 0.1).toFixed(2))))
              }
            >
              +
            </button>
          </div>
          <button
            type="button"
            className={`btn btn--tiny${snapGrid ? ' btn--primary' : ' btn--ghost'}`}
            onClick={() => setSnapGrid((v) => !v)}
          >
            Cuadrícula
          </button>
          {(selectedEdgeId || selectedNodeId) && (
            <button
              type="button"
              className="btn btn--tiny btn--danger"
              onClick={removeSelected}
            >
              Borrar
            </button>
          )}
          {pending && (
            <button
              type="button"
              className="btn btn--tiny"
              onClick={() => setPending(null)}
            >
              Cancelar enlace
            </button>
          )}
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => addWindow()}
          >
            + Ventana
          </button>
        </div>
      </header>

      <div className="project-canvas__toolbar">
        <p>
          {pending
            ? 'Conectando: elige otro punto ●'
            : 'Arrastra ventanas · doble clic en el lienzo para crear · clic en ● para enlazar · edita los puntos al instante'}
        </p>
        <span>
          {nodes.length} ventanas · {edges.length} enlaces
        </span>
      </div>

      <div
        ref={boardRef}
        className={`project-canvas__board${pending ? ' is-linking' : ''}${snapGrid ? ' has-grid' : ''}`}
        onPointerMove={onBoardPointerMove}
        onPointerUp={onBoardPointerUp}
        onPointerLeave={() => {
          onBoardPointerUp()
          setCursor(null)
        }}
        onDoubleClick={(event) => {
          if ((event.target as HTMLElement).closest('.project-window')) return
          addWindow(boardPoint(event))
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget || (event.target as HTMLElement).classList.contains('project-canvas__surface')) {
            setSelectedNodeId(null)
            setSelectedEdgeId(null)
          }
        }}
      >
        <div
          className="project-canvas__surface"
          style={{
            width: canvasSize.width,
            height: canvasSize.height,
            transform: `scale(${zoom})`,
          }}
        >
          <svg
            className="project-canvas__edges"
            width={canvasSize.width}
            height={canvasSize.height}
          >
            <defs>
              <marker
                id="project-arrow"
                markerWidth="8"
                markerHeight="8"
                refX="6"
                refY="3"
                orient="auto"
              >
                <path d="M0,0 L6,3 L0,6 Z" className="project-canvas__arrow" />
              </marker>
            </defs>
            {edges.map((edge) => {
              const from = nodeMap.get(edge.fromId)
              const to = nodeMap.get(edge.toId)
              if (!from || !to) return null
              const a = portPoint(from, edge.fromPort)
              const b = portPoint(to, edge.toPort)
              const selected = edge.id === selectedEdgeId
              return (
                <path
                  key={edge.id}
                  d={edgePath(a, b, edge.fromPort, edge.toPort)}
                  markerEnd="url(#project-arrow)"
                  className={`project-canvas__edge${selected ? ' is-selected' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedEdgeId(edge.id)
                    setSelectedNodeId(null)
                    setPending(null)
                  }}
                />
              )
            })}
            {previewPath && (
              <path d={previewPath} className="project-canvas__edge is-preview" />
            )}
          </svg>

          {nodes.map((node) => {
            const selected = selectedNodeId === node.id
            return (
              <article
                key={node.id}
                className={`project-window project-window--${node.tone ?? 'sky'}${selected ? ' is-selected' : ''}${drag?.id === node.id ? ' is-dragging' : ''}`}
                style={{
                  width: NODE_W,
                  left: node.x,
                  top: node.y,
                }}
                onPointerDown={(e) => onNodePointerDown(e, node)}
                onClick={(e) => {
                  e.stopPropagation()
                  setSelectedNodeId(node.id)
                  setSelectedEdgeId(null)
                }}
              >
                <div className="project-window__glow" aria-hidden="true" />
                <header className="project-window__head">
                  <span className="project-window__handle" aria-hidden="true">
                    ⋮⋮
                  </span>
                  <input
                    value={node.title}
                    onChange={(e) =>
                      updateNodeLocal(node.id, { title: e.target.value })
                    }
                    onBlur={commitNodes}
                    aria-label="Título de la ventana"
                  />
                  <button
                    type="button"
                    className="btn btn--tiny"
                    title="Cambiar color"
                    aria-label="Cambiar color"
                    onClick={() => {
                      replaceNodes((current) =>
                        current.map((item) =>
                          item.id === node.id
                            ? { ...item, tone: nextTone(item.tone) }
                            : item,
                        ),
                      )
                    }}
                  >
                    ◐
                  </button>
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
                    <li className="project-window__empty">
                      Escribe un punto abajo
                    </li>
                  )}
                  {node.points.map((point, index) => {
                    const editing =
                      editingPoint?.nodeId === node.id &&
                      editingPoint.index === index
                    return (
                      <li key={`${node.id}-${index}`}>
                        {editing ? (
                          <input
                            autoFocus
                            value={point}
                            onChange={(e) =>
                              updatePoint(node.id, index, e.target.value)
                            }
                            onBlur={() => setEditingPoint(null)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                ;(e.target as HTMLInputElement).blur()
                              }
                            }}
                            aria-label="Editar punto"
                          />
                        ) : (
                          <button
                            type="button"
                            className="project-window__point-text"
                            onClick={() =>
                              setEditingPoint({ nodeId: node.id, index })
                            }
                          >
                            <span aria-hidden="true">•</span>
                            <span>{point}</span>
                          </button>
                        )}
                        <button
                          type="button"
                          className="btn btn--tiny btn--danger"
                          onClick={() => removePoint(node.id, index)}
                          aria-label="Borrar punto"
                        >
                          ×
                        </button>
                      </li>
                    )
                  })}
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
                    placeholder="Agregar punto…"
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
                    aria-label={`Conectar por ${port}`}
                    onClick={(e) => {
                      e.stopPropagation()
                      onPortClick(node.id, port)
                    }}
                  />
                ))}
              </article>
            )
          })}

          {nodes.length === 0 && (
            <div className="project-canvas__empty-card">
              <p>Tu lienzo está listo</p>
              <span>Doble clic aquí o usa + Ventana para comenzar</span>
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => addWindow({ x: 120, y: 120 })}
              >
                Crear primera ventana
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
