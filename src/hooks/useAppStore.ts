import { useEffect, useState } from 'react'
import type {
  AppState,
  Expense,
  RecurringExpense,
  Reminder,
  Task,
  WorkDayEntry,
  WorkItem,
  WorkLink,
  WorkNote,
} from '../types'
import {
  ensureMonthlyExpenses,
  ensureMonthlyReminders,
  ensureMonthlyTasks,
  ensureMonthlyWork,
  expenseFromRecurring,
  loadState,
  saveState,
} from '../lib/storage'

export function useAppStore(userId: string, activeMonth: string) {
  const [state, setState] = useState<AppState>(() => loadState(userId))

  useEffect(() => {
    setState(loadState(userId))
  }, [userId])

  useEffect(() => {
    setState((prev) => {
      const tasks = ensureMonthlyTasks(prev.tasks, activeMonth)
      const expenses = ensureMonthlyExpenses(
        prev.expenses,
        prev.recurringExpenses,
        activeMonth,
      )
      const reminders = ensureMonthlyReminders(prev.reminders, activeMonth)
      const workItems = ensureMonthlyWork(prev.workItems, activeMonth)
      if (
        tasks === prev.tasks &&
        expenses === prev.expenses &&
        reminders === prev.reminders &&
        workItems === prev.workItems
      ) {
        return prev
      }
      const next: AppState = {
        ...prev,
        tasks,
        expenses,
        reminders,
        workItems,
      }
      saveState(userId, next)
      return next
    })
  }, [activeMonth, userId])

  useEffect(() => {
    saveState(userId, state)
  }, [state, userId])

  const monthTasks = state.tasks.filter((t) => t.monthKey === activeMonth)
  const monthExpenses = state.expenses.filter((e) => e.monthKey === activeMonth)
  const monthReminders = state.reminders.filter(
    (r) => r.monthKey === activeMonth,
  )
  const monthWork = state.workItems.filter((w) => w.monthKey === activeMonth)

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

  function addRecurring(item: RecurringExpense) {
    setState((s) => {
      const recurringExpenses = [item, ...s.recurringExpenses]
      const exists = s.expenses.some(
        (expense) =>
          expense.recurringId === item.id && expense.monthKey === activeMonth,
      )
      const expenses = exists
        ? s.expenses
        : [expenseFromRecurring(item, activeMonth), ...s.expenses]
      return { ...s, recurringExpenses, expenses }
    })
  }

  function updateRecurring(id: string, patch: Partial<RecurringExpense>) {
    setState((s) => ({
      ...s,
      recurringExpenses: s.recurringExpenses.map((item) =>
        item.id === id ? { ...item, ...patch } : item,
      ),
    }))
  }

  function removeRecurring(id: string) {
    setState((s) => ({
      ...s,
      recurringExpenses: s.recurringExpenses.filter((item) => item.id !== id),
      expenses: s.expenses.filter((expense) => expense.recurringId !== id),
    }))
  }

  function addReminder(reminder: Reminder) {
    setState((s) => ({ ...s, reminders: [reminder, ...s.reminders] }))
  }

  function updateReminder(id: string, patch: Partial<Reminder>) {
    setState((s) => ({
      ...s,
      reminders: s.reminders.map((r) =>
        r.id === id ? { ...r, ...patch } : r,
      ),
    }))
  }

  function removeReminder(id: string) {
    setState((s) => ({
      ...s,
      reminders: s.reminders.filter((r) => r.id !== id),
    }))
  }

  function toggleReminder(id: string) {
    setState((s) => ({
      ...s,
      reminders: s.reminders.map((r) =>
        r.id === id ? { ...r, done: !r.done } : r,
      ),
    }))
  }

  function addWorkItem(item: WorkItem) {
    setState((s) => ({ ...s, workItems: [item, ...s.workItems] }))
  }

  function updateWorkItem(id: string, patch: Partial<WorkItem>) {
    setState((s) => ({
      ...s,
      workItems: s.workItems.map((w) =>
        w.id === id ? { ...w, ...patch } : w,
      ),
    }))
  }

  function removeWorkItem(id: string) {
    setState((s) => ({
      ...s,
      workItems: s.workItems.filter((w) => w.id !== id),
    }))
  }

  function addWorkNote(note: WorkNote) {
    setState((s) => ({ ...s, workNotes: [note, ...s.workNotes] }))
  }

  function updateWorkNote(id: string, patch: Partial<WorkNote>) {
    setState((s) => ({
      ...s,
      workNotes: s.workNotes.map((note) =>
        note.id === id
          ? { ...note, ...patch, updatedAt: new Date().toISOString() }
          : note,
      ),
    }))
  }

  function removeWorkNote(id: string) {
    setState((s) => ({
      ...s,
      workNotes: s.workNotes.filter((note) => note.id !== id),
    }))
  }

  function addWorkLink(link: WorkLink) {
    setState((s) => ({ ...s, workLinks: [link, ...s.workLinks] }))
  }

  function updateWorkLink(id: string, patch: Partial<WorkLink>) {
    setState((s) => ({
      ...s,
      workLinks: s.workLinks.map((link) =>
        link.id === id ? { ...link, ...patch } : link,
      ),
    }))
  }

  function removeWorkLink(id: string) {
    setState((s) => ({
      ...s,
      workLinks: s.workLinks.filter((link) => link.id !== id),
    }))
  }

  function addWorkDayEntry(entry: WorkDayEntry) {
    setState((s) => ({
      ...s,
      workDayEntries: [entry, ...s.workDayEntries],
    }))
  }

  function removeWorkDayEntry(id: string) {
    setState((s) => ({
      ...s,
      workDayEntries: s.workDayEntries.filter((entry) => entry.id !== id),
    }))
  }

  function replaceState(next: AppState) {
    const normalized = next
    setState(normalized)
    saveState(userId, normalized)
  }

  return {
    data: state,
    monthTasks,
    monthExpenses,
    monthReminders,
    monthWork,
    workNotes: state.workNotes,
    workLinks: state.workLinks,
    workDayEntries: state.workDayEntries,
    recurringExpenses: state.recurringExpenses,
    addTask,
    updateTask,
    removeTask,
    toggleTask,
    addExpense,
    updateExpense,
    removeExpense,
    addRecurring,
    updateRecurring,
    removeRecurring,
    addReminder,
    updateReminder,
    removeReminder,
    toggleReminder,
    addWorkItem,
    updateWorkItem,
    removeWorkItem,
    addWorkNote,
    updateWorkNote,
    removeWorkNote,
    addWorkLink,
    updateWorkLink,
    removeWorkLink,
    addWorkDayEntry,
    removeWorkDayEntry,
    replaceState,
  }
}
