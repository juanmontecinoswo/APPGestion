import type { FormEvent } from 'react'
import { useEffect, useRef, useState } from 'react'
import type { Expense, ExpenseKind } from '../types'
import { EXPENSE_CATEGORIES } from '../types'
import {
  createExpense,
  daysInMonth,
  formatMoney,
  parseAmountInput,
} from '../lib/storage'
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
  const [payOpen, setPayOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [payAmount, setPayAmount] = useState('')
  const [category, setCategory] = useState<string>(EXPENSE_CATEGORIES[0])
  const [kind, setKind] = useState<ExpenseKind>('unico')
  const [day, setDay] = useState('')
  const [notes, setNotes] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [payingId, setPayingId] = useState<string | null>(null)
  const firstFieldRef = useRef<HTMLInputElement>(null)
  const payFieldRef = useRef<HTMLInputElement>(null)

  const maxDay = daysInMonth(monthKey)
  const payingExpense = expenses.find((e) => e.id === payingId)
  const sorted = [...expenses].sort((a, b) => {
    if (a.paid !== b.paid) return a.paid ? 1 : -1
    const da = a.day ?? 99
    const db = b.day ?? 99
    return da - db || (b.amount ?? 0) - (a.amount ?? 0)
  })

  useEffect(() => {
    if (open) {
      const timer = window.setTimeout(() => firstFieldRef.current?.focus(), 40)
      return () => window.clearTimeout(timer)
    }
  }, [open])

  useEffect(() => {
    if (payOpen) {
      const timer = window.setTimeout(() => payFieldRef.current?.focus(), 40)
      return () => window.clearTimeout(timer)
    }
  }, [payOpen])

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

  function closePayForm() {
    setPayOpen(false)
    setPayAmount('')
    setPayingId(null)
  }

  function openCreate() {
    resetForm()
    setOpen(true)
  }

  function startEdit(expense: Expense) {
    setEditingId(expense.id)
    setTitle(expense.title)
    setAmount(expense.amount != null ? String(expense.amount) : '')
    setCategory(expense.category)
    setKind(expense.kind)
    setDay(expense.day != null ? String(expense.day) : '')
    setNotes(expense.notes)
    setOpen(true)
  }

  function startPay(expense: Expense) {
    setPayingId(expense.id)
    setPayAmount(expense.amount != null ? String(expense.amount) : '')
    setPayOpen(true)
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!title.trim()) return

    const parsedAmount = parseAmountInput(amount)
    const dayNum = day ? Math.min(Math.max(1, Number(day)), maxDay) : null
    const editing = editingId ? expenses.find((item) => item.id === editingId) : null

    if (editing?.paid) {
      if (parsedAmount == null) return
    }

    const payload = {
      title: title.trim(),
      amount: editing?.paid ? parsedAmount : null,
      category,
      kind,
      monthKey,
      day: dayNum && !Number.isNaN(dayNum) ? dayNum : null,
      notes: notes.trim(),
      paid: editing?.paid ?? false,
    }

    if (editingId) {
      onUpdate(editingId, payload)
    } else {
      onAdd(
        createExpense({
          ...payload,
          paid: false,
          amount: null,
        }),
      )
    }
    closeForm()
  }

  function handlePaySubmit(e: FormEvent) {
    e.preventDefault()
    if (!payingId) return
    const parsedAmount = parseAmountInput(payAmount)
    if (parsedAmount == null) return

    onUpdate(payingId, { amount: parsedAmount, paid: true })
    closePayForm()
  }

  return (
    <section className="panel" aria-labelledby="finanzas-title">
      <header className="panel__head panel__head--row">
        <div>
          <h2 id="finanzas-title">Finanzas del mes</h2>
          <p>
            Registra cargos sin monto y complétalo al pagar para sumarlo al
            total mensual.
          </p>
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
                <span
                  className={`chip chip--status chip--${expense.paid ? 'hecho' : 'pendiente'}`}
                >
                  {expense.paid ? 'Pagado' : 'Por pagar'}
                </span>
              </div>
              <div className="list__meta">
                <span>{expense.category}</span>
                {expense.day != null && <span>Día {expense.day}</span>}
                {expense.notes && <span>{expense.notes}</span>}
              </div>
            </div>
            <div className="list__side">
              <span className="amount">
                {expense.paid && expense.amount != null
                  ? formatMoney(expense.amount)
                  : 'Sin pagar'}
              </span>
              <div className="list__ops">
                {!expense.paid && (
                  <button
                    type="button"
                    className="btn btn--tiny btn--pay"
                    onClick={() => startPay(expense)}
                  >
                    Pagar
                  </button>
                )}
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
        title={editingId ? 'Editar cargo' : 'Nuevo cargo'}
        description="El importe es opcional. Podrás ingresarlo al momento de pagar."
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
            {editingId && expenses.find((e) => e.id === editingId)?.paid ? (
              <label>
                Importe pagado (CLP)
                <input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  inputMode="numeric"
                  placeholder="450000"
                  required
                />
              </label>
            ) : (
              <label>
                Importe (CLP)
                <input
                  value={amount}
                  disabled
                  placeholder="Se ingresa al pagar"
                />
              </label>
            )}
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
              {editingId ? 'Guardar cambios' : 'Guardar cargo'}
            </button>
          </div>
        </form>
      </FormSheet>

      <FormSheet
        open={payOpen}
        title="Registrar pago"
        description={
          payingExpense
            ? `Ingresa el monto pagado de "${payingExpense.title}".`
            : 'Ingresa el monto pagado.'
        }
        onClose={closePayForm}
      >
        <form className="form form--sheet" onSubmit={handlePaySubmit}>
          <label>
            Importe pagado (CLP)
            <input
              ref={payFieldRef}
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
              inputMode="numeric"
              placeholder="450000"
              required
            />
          </label>
          <div className="form__actions">
            <button
              type="button"
              className="btn btn--ghost"
              onClick={closePayForm}
            >
              Cancelar
            </button>
            <button type="submit" className="btn btn--primary">
              Confirmar pago
            </button>
          </div>
        </form>
      </FormSheet>
    </section>
  )
}
