import { useEffect, useState } from 'react'
import type { AppState, Expense, Task } from '../types'
import {
  ensureMonthlyExpenses,
  ensureMonthlyTasks,
  loadState,
  saveState,
} from '../lib/storage'

export function useAppStore(activeMonth: string) {
  const [state, setState] = useState<AppState>(() => loadState())

  useEffect(() => {
    setState((prev) => {
      const tasks = ensureMonthlyTasks(prev.tasks, activeMonth)
      const expenses = ensureMonthlyExpenses(prev.expenses, activeMonth)
      if (tasks === prev.tasks && expenses === prev.expenses) return prev
      const next = { tasks, expenses }
      saveState(next)
      return next
    })
  }, [activeMonth])

  useEffect(() => {
    saveState(state)
  }, [state])

  const monthTasks = state.tasks.filter((t) => t.monthKey === activeMonth)
  const monthExpenses = state.expenses.filter((e) => e.monthKey === activeMonth)

  function addTask(task: Task) {
    setState((s) => ({ ...s, tasks: [task, ...s.tasks] }))
  }

  function updateTask(id: string, patch: Partial<Task>) {
    setState((s) => ({
      ...s,
      tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    }))
  }

  function removeTask(id: string) {
    setState((s) => ({ ...s, tasks: s.tasks.filter((t) => t.id !== id) }))
  }

  function toggleTask(id: string) {
    setState((s) => ({
      ...s,
      tasks: s.tasks.map((t) =>
        t.id === id ? { ...t, done: !t.done } : t,
      ),
    }))
  }

  function addExpense(expense: Expense) {
    setState((s) => ({ ...s, expenses: [expense, ...s.expenses] }))
  }

  function updateExpense(id: string, patch: Partial<Expense>) {
    setState((s) => ({
      ...s,
      expenses: s.expenses.map((e) =>
        e.id === id ? { ...e, ...patch } : e,
      ),
    }))
  }

  function removeExpense(id: string) {
    setState((s) => ({
      ...s,
      expenses: s.expenses.filter((e) => e.id !== id),
    }))
  }

  return {
    monthTasks,
    monthExpenses,
    addTask,
    updateTask,
    removeTask,
    toggleTask,
    addExpense,
    updateExpense,
    removeExpense,
  }
}
