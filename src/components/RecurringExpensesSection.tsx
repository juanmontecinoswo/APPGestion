import type { FormEvent } from 'react'
import { useEffect, useRef, useState } from 'react'
import type { RecurrenceEnd, RecurringExpense, RecurringKind } from '../types'
import { EXPENSE_CATEGORIES } from '../types'
import {
  createRecurringExpense,
  daysInMonth,
  formatMoney,
  parseAmountInput,
  recurringEndLabel,
} from '../lib/storage'
import { AddIconButton, FormSheet } from './FormSheet'

interface Props {
  monthKey: string
  recurring: RecurringExpense[]
  embedded?: boolean
  onAdd: (item: RecurringExpense) => void
  onUpdate: (id: string, patch: Partial<RecurringExpense>) => void
  onRemove: (id: string) => void
}

const KIND_LABEL: Record<RecurringKind, string> = {
  fijo: 'Fijo',
  mensual: 'Mensual',
}

export function RecurringExpensesSection({
  monthKey,
  recurring,
  embedded = false,
  onAdd,
  onUpdate,
  onRemove,
}: Props) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [plannedAmount, setPlannedAmount] = useState('')
  const [category, setCategory] = useState<string>(EXPENSE_CATEGORIES[0])
  const [kind, setKind] = useState<RecurringKind>('mensual')
  const [day, setDay] = useState('')
  const [notes, setNotes] = useState('')
  const [recurrenceEnd, setRecurrenceEnd] = useState<RecurrenceEnd>('manual')
  const [recurrenceMonths, setRecurrenceMonths] = useState('12')
  const [editingId, setEditingId] = useState<string | null>(null)
  const firstFieldRef = useRef<HTMLInputElement>(null)

  const maxDay = daysInMonth(monthKey)

  useEffect(() => {
    if (open) {
      const timer = window.setTimeout(() => firstFieldRef.current?.focus(), 40)
      return () => window.clearTimeout(timer)
    }
  }, [open])

  function resetForm() {
    setTitle('')
    setPlannedAmount('')
    setCategory(EXPENSE_CATEGORIES[0])
    setKind('mensual')
    setDay('')
    setNotes('')
    setRecurrenceEnd('manual')
    setRecurrenceMonths('12')
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

  function startEdit(item: RecurringExpense) {
    setEditingId(item.id)
    setTitle(item.title)
    setPlannedAmount(
      item.plannedAmount != null ? String(item.plannedAmount) : '',
    )
    setCategory(item.category)
    setKind(item.kind)
    setDay(item.day != null ? String(item.day) : '')
    setNotes(item.notes)
    setRecurrenceEnd(item.recurrenceEnd)
    setRecurrenceMonths(
      item.recurrenceMonths != null ? String(item.recurrenceMonths) : '12',
    )
    setOpen(true)
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!title.trim()) return

    const months =
      recurrenceEnd === 'months'
        ? Math.max(1, Number(recurrenceMonths) || 0)
        : null
    if (recurrenceEnd === 'months' && (!months || Number.isNaN(months))) return

    const dayNum = day ? Math.min(Math.max(1, Number(day)), maxDay) : null
    const payload = {
      title: title.trim(),
      plannedAmount: parseAmountInput(plannedAmount),
      category,
      kind,
      day: dayNum && !Number.isNaN(dayNum) ? dayNum : null,
      notes: notes.trim(),
      startMonthKey: monthKey,
      recurrenceEnd,
      recurrenceMonths: months,
      active: true,
    }

    if (editingId) {
      const current = recurring.find((item) => item.id === editingId)
      onUpdate(editingId, {
        ...payload,
        startMonthKey: current?.startMonthKey ?? monthKey,
      })
    } else {
      onAdd(createRecurringExpense(payload))
    }
    closeForm()
  }

  const content = (
    <>
      <header className="panel__head panel__head--row">
        <div>
          <h3 id="recurring-title">Gastos fijos y mensuales</h3>
          <p>
            Define cargos recurrentes con fin manual o por cantidad de meses.
          </p>
        </div>
        <AddIconButton label="Añadir recurrente" onClick={openCreate} />
      </header>

      <ul className="list">
        {recurring.length === 0 && (
          <li className="list__empty">No hay gastos recurrentes configurados.</li>
        )}
        {recurring.map((item) => (
          <li key={item.id} className="list__item">
            <div className="list__main">
              <div className="list__title-row">
                <strong>{item.title}</strong>
                <span className="chip chip--kind">{KIND_LABEL[item.kind]}</span>
                <span
                  className={`chip chip--status chip--${item.active ? 'en_curso' : 'pendiente'}`}
                >
                  {item.active ? 'Activo' : 'Detenido'}
                </span>
              </div>
              <div className="list__meta">
                <span>{item.category}</span>
                {item.day != null && <span>Día {item.day}</span>}
                <span>{recurringEndLabel(item, monthKey)}</span>
                {item.plannedAmount != null && (
                  <span>Est. {formatMoney(item.plannedAmount)}</span>
                )}
              </div>
            </div>
            <div className="list__ops">
              {item.active && (
                <button
                  type="button"
                  className="btn btn--tiny"
                  onClick={() => onUpdate(item.id, { active: false })}
                >
                  Detener
                </button>
              )}
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
        title={editingId ? 'Editar recurrente' : 'Nuevo gasto recurrente'}
        description="El monto es opcional. Se usará como estimado en cada mes."
        onClose={closeForm}
      >
        <form className="form form--sheet" onSubmit={handleSubmit}>
          <div className="form__row">
            <label>
              Concepto
              <input
                ref={firstFieldRef}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej. Arriendo"
                required
              />
            </label>
            <label>
              Monto estimado (CLP)
              <input
                value={plannedAmount}
                onChange={(e) => setPlannedAmount(e.target.value)}
                inputMode="numeric"
                placeholder="Opcional"
              />
            </label>
          </div>
          <div className="form__row form__row--3">
            <label>
              Categoría
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Tipo
              <select
                value={kind}
                onChange={(e) => setKind(e.target.value as RecurringKind)}
              >
                <option value="fijo">Fijo</option>
                <option value="mensual">Mensual</option>
              </select>
            </label>
            <label>
              Día
              <input
                type="number"
                min={1}
                max={maxDay}
                value={day}
                onChange={(e) => setDay(e.target.value)}
                placeholder="—"
              />
            </label>
          </div>
          <div className="form__row">
            <label>
              Fin de recurrencia
              <select
                value={recurrenceEnd}
                onChange={(e) =>
                  setRecurrenceEnd(e.target.value as RecurrenceEnd)
                }
              >
                <option value="manual">Manual (hasta detenerlo)</option>
                <option value="months">Cantidad de meses</option>
              </select>
            </label>
            {recurrenceEnd === 'months' && (
              <label>
                Meses
                <input
                  type="number"
                  min={1}
                  max={120}
                  value={recurrenceMonths}
                  onChange={(e) => setRecurrenceMonths(e.target.value)}
                  required
                />
              </label>
            )}
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
              {editingId ? 'Guardar cambios' : 'Guardar recurrente'}
            </button>
          </div>
        </form>
      </FormSheet>
    </>
  )

  if (embedded) {
    return <div className="recurring-block">{content}</div>
  }

  return (
    <section className="panel panel--nested" aria-labelledby="recurring-title">
      {content}
    </section>
  )
}
