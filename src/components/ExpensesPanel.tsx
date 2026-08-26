import type { FormEvent } from 'react'
import { useState } from 'react'
import type { Expense, ExpenseKind } from '../types'
import { EXPENSE_CATEGORIES } from '../types'
import { createExpense, daysInMonth } from '../lib/storage'

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
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState<string>(EXPENSE_CATEGORIES[0])
  const [kind, setKind] = useState<ExpenseKind>('unico')
  const [day, setDay] = useState('')
  const [notes, setNotes] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)

  const maxDay = daysInMonth(monthKey)
  const sorted = [...expenses].sort((a, b) => {
    const da = a.day ?? 99
    const db = b.day ?? 99
    return da - db || b.amount - a.amount
  })

  function resetForm() {
    setTitle('')
    setAmount('')
    setCategory(EXPENSE_CATEGORIES[0])
    setKind('unico')
    setDay('')
    setNotes('')
    setEditingId(null)
  }

  function startEdit(expense: Expense) {
    setEditingId(expense.id)
    setTitle(expense.title)
    setAmount(String(expense.amount))
    setCategory(expense.category)
    setKind(expense.kind)
    setDay(expense.day != null ? String(expense.day) : '')
    setNotes(expense.notes)
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const parsedAmount = Number(amount.replace(',', '.'))
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
    resetForm()
  }

  return (
    <section className="panel" aria-labelledby="gastos-title">
      <header className="panel__head">
        <div>
          <h2 id="gastos-title">Gastos del mes</h2>
          <p>Registra cargos únicos, fijos o que se repiten cada mes.</p>
        </div>
      </header>

      <form className="form" onSubmit={handleSubmit}>
        <div className="form__row">
          <label>
            Concepto
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej. Supermercado"
              required
            />
          </label>
          <label>
            Importe (€)
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              inputMode="decimal"
              placeholder="0,00"
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
          {editingId && (
            <button type="button" className="btn btn--ghost" onClick={resetForm}>
              Cancelar
            </button>
          )}
          <button type="submit" className="btn btn--primary">
            {editingId ? 'Guardar gasto' : 'Añadir gasto'}
          </button>
        </div>
      </form>

      <ul className="list">
        {sorted.length === 0 && (
          <li className="list__empty">Aún no hay gastos este mes.</li>
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
              <span className="amount">{expense.amount.toLocaleString('es-ES', {
                style: 'currency',
                currency: 'EUR',
              })}</span>
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
    </section>
  )
}
