import type { FormEvent } from 'react'
import { useEffect, useRef, useState } from 'react'
import type { Expense, RecurringExpense } from '../types'
import { EXPENSE_CATEGORIES } from '../types'
import {
  createExpense,
  daysInMonth,
  formatMoney,
  paidExpenseTotal,
  parseAmountInput,
} from '../lib/storage'
import { AddIconButton, FormSheet } from './FormSheet'
import { RecurringExpensesSection } from './RecurringExpensesSection'

interface Props {
  monthKey: string
  expenses: Expense[]
  recurring: RecurringExpense[]
  onAdd: (expense: Expense) => void
  onUpdate: (id: string, patch: Partial<Expense>) => void
  onRemove: (id: string) => void
  onAddRecurring: (item: RecurringExpense) => void
  onUpdateRecurring: (id: string, patch: Partial<RecurringExpense>) => void
  onRemoveRecurring: (id: string) => void
}

const KIND_LABEL = {
  unico: 'Único',
  fijo: 'Fijo',
  mensual: 'Mensual',
} as const

function amountLabel(expense: Expense): string {
  if (expense.paid && expense.amount != null) return formatMoney(expense.amount)
  if (expense.amount != null) return `Est. ${formatMoney(expense.amount)}`
  return 'Sin monto'
}

function sortByDay(a: Expense, b: Expense): number {
  const da = a.day ?? 99
  const db = b.day ?? 99
  return da - db || a.title.localeCompare(b.title)
}

export function ExpensesPanel({
  monthKey,
  expenses,
  recurring,
  onAdd,
  onUpdate,
  onRemove,
  onAddRecurring,
  onUpdateRecurring,
  onRemoveRecurring,
}: Props) {
  const [allExpanded, setAllExpanded] = useState(true)
  const [open, setOpen] = useState(false)
  const [payOpen, setPayOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [payAmount, setPayAmount] = useState('')
  const [category, setCategory] = useState<string>(EXPENSE_CATEGORIES[0])
  const [day, setDay] = useState('')
  const [notes, setNotes] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [payingId, setPayingId] = useState<string | null>(null)
  const firstFieldRef = useRef<HTMLInputElement>(null)
  const payFieldRef = useRef<HTMLInputElement>(null)

  const maxDay = daysInMonth(monthKey)
  const payingExpense = expenses.find((e) => e.id === payingId)
  const unpaid = expenses.filter((e) => !e.paid).sort(sortByDay)
  const allSorted = [...expenses].sort((a, b) => {
    if (a.paid !== b.paid) return a.paid ? 1 : -1
    return sortByDay(a, b)
  })
  const paidTotal = paidExpenseTotal(expenses)

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

    if (editing?.paid && parsedAmount == null) return

    const payload = {
      title: title.trim(),
      amount: parsedAmount,
      category,
      kind: editing?.kind ?? 'unico',
      monthKey,
      day: dayNum && !Number.isNaN(dayNum) ? dayNum : null,
      notes: notes.trim(),
      paid: editing?.paid ?? false,
      recurringId: editing?.recurringId ?? null,
    }

    if (editingId) {
      onUpdate(editingId, payload)
    } else {
      onAdd(
        createExpense({
          ...payload,
          kind: 'unico',
          paid: false,
          recurringId: null,
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
    <div className="finanzas-stack">
      <section className="panel panel--registry" aria-labelledby="all-expenses-title">
        <header className="panel__head panel__head--collapse">
          <button
            type="button"
            className="collapse-trigger"
            aria-expanded={allExpanded}
            aria-controls="all-expenses-body"
            onClick={() => setAllExpanded((v) => !v)}
          >
            <span className="collapse-trigger__chevron" aria-hidden="true">
              {allExpanded ? '▾' : '▸'}
            </span>
            <span className="collapse-trigger__text">
              <strong id="all-expenses-title">Todos los gastos</strong>
              <span>
                {expenses.length} cargos · toca para{' '}
                {allExpanded ? 'contraer' : 'expandir'}
              </span>
            </span>
          </button>
          <AddIconButton label="Añadir cargo" onClick={openCreate} />
        </header>

        <div
          id="all-expenses-body"
          className={`collapse-body${allExpanded ? '' : ' is-collapsed'}`}
          hidden={!allExpanded}
        >
          <p className="panel__hint">
            Registro completo del mes. Puedes contraer esta ventana cuando no la
            necesites.
          </p>

          <ul className="list">
            {allSorted.length === 0 && (
              <li className="list__empty">Aún no hay cargos este mes.</li>
            )}
            {allSorted.map((expense) => (
              <li key={expense.id} className="list__item">
                <div className="list__main">
                  <div className="list__title-row">
                    <strong>{expense.title}</strong>
                    <span className="chip chip--kind">
                      {KIND_LABEL[expense.kind]}
                    </span>
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
                  <span className="amount">{amountLabel(expense)}</span>
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
        </div>
      </section>

      <RecurringExpensesSection
        monthKey={monthKey}
        recurring={recurring}
        onAdd={onAddRecurring}
        onUpdate={onUpdateRecurring}
        onRemove={onRemoveRecurring}
      />

      <section className="panel panel--payqueue" aria-labelledby="pay-title">
        <header className="panel__head">
          <h2 id="pay-title">Por pagar este mes</h2>
          <p>
            {unpaid.length === 0
              ? 'No tienes cargos pendientes. Total pagado: ' +
                formatMoney(paidTotal)
              : `${unpaid.length} pendiente${unpaid.length === 1 ? '' : 's'} · Pagado: ${formatMoney(paidTotal)}`}
          </p>
        </header>

        <ul className="list list--pay">
          {unpaid.length === 0 && (
            <li className="list__empty">Todo al día por ahora.</li>
          )}
          {unpaid.map((expense) => (
            <li key={expense.id} className="list__item list__item--pay">
              <div className="list__main">
                <div className="list__title-row">
                  <strong>{expense.title}</strong>
                  <span className="chip chip--kind">
                    {KIND_LABEL[expense.kind]}
                  </span>
                </div>
                <div className="list__meta">
                  <span>{expense.category}</span>
                  {expense.day != null && <span>Día {expense.day}</span>}
                  {expense.amount != null ? (
                    <span>Estimado {formatMoney(expense.amount)}</span>
                  ) : (
                    <span>Sin monto asignado</span>
                  )}
                </div>
              </div>
              <div className="list__side">
                <button
                  type="button"
                  className="btn btn--primary btn--pay-main"
                  onClick={() => startPay(expense)}
                >
                  Pagar
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <FormSheet
        open={open}
        title={editingId ? 'Editar cargo' : 'Nuevo cargo'}
        description="El importe es opcional. Si lo ingresas, queda como estimado hasta pagar."
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
              {editingId && expenses.find((e) => e.id === editingId)?.paid
                ? 'Importe pagado (CLP)'
                : 'Importe estimado (CLP)'}
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                inputMode="numeric"
                placeholder="Opcional"
                required={
                  !!editingId && !!expenses.find((e) => e.id === editingId)?.paid
                }
              />
            </label>
          </div>
          <div className="form__row">
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
            ? payingExpense.amount != null
              ? `Confirma o corrige el monto pagado de "${payingExpense.title}".`
              : `Ingresa el monto pagado de "${payingExpense.title}".`
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
              placeholder="Ingresa el valor a pagar"
              required
            />
          </label>
          <div className="form__actions">
            <button type="button" className="btn btn--ghost" onClick={closePayForm}>
              Cancelar
            </button>
            <button type="submit" className="btn btn--primary">
              Confirmar pago
            </button>
          </div>
        </form>
      </FormSheet>
    </div>
  )
}
