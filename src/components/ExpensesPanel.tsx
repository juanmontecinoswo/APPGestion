import type { FormEvent } from 'react'
import { useEffect, useRef, useState } from 'react'
import type { Expense, ExpenseKind } from '../types'
import { EXPENSE_CATEGORIES } from '../types'
import { createExpense, daysInMonth, formatMoney } from '../lib/storage'
import { AddIconButton, FormSheet } from './FormSheet'

interface Props {
  monthKey: string
  expenses: Expense[]
  onAdd: (expense: Expense) => void
  onUpdate: (id: string, patch: Partial<Expense>) => void
  onRemove: (id: string) => void
}

const KIND_LABEL: Record<ExpenseKind, string> = {
  unico: 'Único',
  fijo: 'Fijo',
  mensual: 'Mensual',
}

export function ExpensesPanel({
  monthKey,
  expenses,
  onAdd,
  onUpdate,
  onRemove,
}: Props) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState<string>(EXPENSE_CATEGORIES[0])
  const [kind, setKind] = useState<ExpenseKind>('unico')
  const [day, setDay] = useState('')
  const [notes, setNotes] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const firstFieldRef = useRef<HTMLInputElement>(null)

  const maxDay = daysInMonth(monthKey)
  const sorted = [...expenses].sort((a, b) => {
    const da = a.day ?? 99
    const db = b.day ?? 99
    return da - db || b.amount - a.amount
  })

  useEffect(() => {
    if (open) {
      const timer = window.setTimeout(() => firstFieldRef.current?.focus(), 40)
      return () => window.clearTimeout(timer)
    }
  }, [open])

  function resetForm() {
    setTitle('')
    setAmount('')
    setCategory(EXPENSE_CATEGORIES[0])
    setKind('unico')
    setDay('')
    setNotes('')
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

  function startEdit(expense: Expense) {
    setEditingId(expense.id)
    setTitle(expense.title)
    setAmount(String(expense.amount))
    setCategory(expense.category)
    setKind(expense.kind)
    setDay(expense.day != null ? String(expense.day) : '')
    setNotes(expense.notes)
    setOpen(true)
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const parsedAmount = Math.round(
      Number(amount.replace(/[.\s]/g, '').replace(',', '.')),
    )
    if (!title.trim() || Number.isNaN(parsedAmount) || parsedAmount < 0) return

    const dayNum = day ? Math.min(Math.max(1, Number(day)), maxDay) : null
    const payload = {
      title: title.trim(),
      amount: parsedAmount,
      category,
      kind,
      monthKey,
      day: dayNum && !Number.isNaN(dayNum) ? dayNum : null,
      notes: notes.trim(),
    }

    if (editingId) {
      onUpdate(editingId, payload)
    } else {
      onAdd(createExpense(payload))
    }
    closeForm()
  }

  return (
    <section className="panel" aria-labelledby="finanzas-title">
      <header className="panel__head panel__head--row">
        <div>
          <h2 id="finanzas-title">Finanzas del mes</h2>
          <p>Registra cargos únicos, fijos o que se repiten cada mes.</p>
        </div>
        <AddIconButton label="Añadir cargo" onClick={openCreate} />
      </header>

      <ul className="list">
        {sorted.length === 0 && (
          <li className="list__empty">Aún no hay cargos este mes.</li>
        )}
        {sorted.map((expense) => (
          <li key={expense.id} className="list__item">
            <div className="list__main">
              <div className="list__title-row">
                <strong>{expense.title}</strong>
                <span className="chip chip--kind">{KIND_LABEL[expense.kind]}</span>
              </div>
              <div className="list__meta">
                <span>{expense.category}</span>
                {expense.day != null && <span>Día {expense.day}</span>}
                {expense.notes && <span>{expense.notes}</span>}
              </div>
            </div>
            <div className="list__side">
              <span className="amount">{formatMoney(expense.amount)}</span>
              <div className="list__ops">
                <button
                  type="button"
                  className="btn btn--tiny"
                  onClick={() => startEdit(expense)}
                >
                  Editar
                </button>
                <button
                  type="button"
                  className="btn btn--tiny btn--danger"
                  onClick={() => onRemove(expense.id)}
                >
                  Borrar
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <FormSheet
        open={open}
        title={editingId ? 'Editar gasto' : 'Nuevo gasto'}
        description="Completa los datos y guarda el cargo."
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
                placeholder="Ej. Supermercado"
                required
              />
            </label>
            <label>
              Importe (CLP)
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                inputMode="numeric"
                placeholder="450000"
                required
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
                onChange={(e) => setKind(e.target.value as ExpenseKind)}
              >
                <option value="unico">Único</option>
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
              {editingId ? 'Guardar cambios' : 'Guardar gasto'}
            </button>
          </div>
        </form>
      </FormSheet>
    </section>
  )
}
