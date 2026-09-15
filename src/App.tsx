import { useEffect, useState } from 'react'
import type { UserAccount, ViewId } from './types'
import { MENU_ITEMS } from './types'
import { monthKeyFromDate } from './lib/storage'
import { useAuth } from './hooks/useAuth'
import { useAppStore } from './hooks/useAppStore'
import { LoginScreen } from './components/LoginScreen'
import { HomeBoard } from './components/HomeBoard'
import { ExpensesPanel } from './components/ExpensesPanel'
import { TasksPanel } from './components/TasksPanel'
import { RemindersPanel } from './components/RemindersPanel'
import { WorkPanel } from './components/WorkPanel'
import { AccountPanel } from './components/AccountPanel'
import './App.css'

function userInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

function AuthenticatedApp({
  user,
  onLogout,
  onUserChanged,
}: {
  user: UserAccount
  onLogout: () => void
  onUserChanged: () => void
}) {
  const [monthKey, setMonthKey] = useState(() => monthKeyFromDate())
  const [view, setView] = useState<ViewId>('dashboard')
  const [ready, setReady] = useState(false)
  const store = useAppStore(user.id, monthKey)

  useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true))
    return () => cancelAnimationFrame(id)
  }, [])

  const mobileNavItems: { id: ViewId; label: string; icon: string }[] = [
    { id: 'dashboard', label: 'Inicio', icon: '⌂' },
    ...MENU_ITEMS.map((item) => ({
      id: item.id as ViewId,
      label: item.shortLabel,
      icon:
        item.id === 'finanzas'
          ? '$'
          : item.id === 'tareas'
            ? '✓'
            : item.id === 'recordatorios'
              ? '◷'
              : '▣',
    })),
  ]

  return (
    <div className={`shell shell--app${ready ? ' is-ready' : ''}`}>
      <header className="topbar">
        <button
          type="button"
          className="topbar__brand"
          onClick={() => setView('dashboard')}
        >
          <span className="topbar__logo" aria-hidden="true">
            O
          </span>
          <span className="brand">Organizador</span>
        </button>

        <div className="topbar__user" aria-label="Información de usuario">
          <div className="topbar__avatar" aria-hidden="true">
            {userInitials(user.displayName)}
          </div>
          <div className="topbar__meta">
            <strong>{user.displayName}</strong>
            <span>@{user.username}</span>
          </div>
          <button
            type="button"
            className="btn btn--icon topbar__action"
            aria-label="Cuenta"
            onClick={() => setView('cuenta')}
          >
            ⚙
          </button>
          <button
            type="button"
            className="btn btn--icon topbar__action"
            aria-label="Cerrar sesión"
            onClick={onLogout}
          >
            ⎋
          </button>
        </div>
      </header>

      <nav className="main-menu" aria-label="Menú principal">
        {MENU_ITEMS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`main-menu__btn${view === item.id ? ' is-active' : ''}`}
            aria-current={view === item.id ? 'page' : undefined}
            onClick={() => setView(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <main className="workspace">
        {view === 'dashboard' && (
          <HomeBoard
            monthKey={monthKey}
            onMonthChange={setMonthKey}
            tasks={store.monthTasks}
            expenses={store.monthExpenses}
            reminders={store.monthReminders}
            workItems={store.monthWork}
            onToggleTask={store.toggleTask}
            onToggleReminder={store.toggleReminder}
            onAddTask={store.addTask}
            onOpen={setView}
          />
        )}
        {view === 'finanzas' && (
          <ExpensesPanel
            monthKey={monthKey}
            expenses={store.monthExpenses}
            recurring={store.recurringExpenses}
            onAdd={store.addExpense}
            onUpdate={store.updateExpense}
            onRemove={store.removeExpense}
            onAddRecurring={store.addRecurring}
            onUpdateRecurring={store.updateRecurring}
            onRemoveRecurring={store.removeRecurring}
          />
        )}
        {view === 'tareas' && (
          <TasksPanel
            monthKey={monthKey}
            tasks={store.monthTasks}
            onAdd={store.addTask}
            onUpdate={store.updateTask}
            onRemove={store.removeTask}
            onToggle={store.toggleTask}
          />
        )}
        {view === 'recordatorios' && (
          <RemindersPanel
            monthKey={monthKey}
            reminders={store.monthReminders}
            onAdd={store.addReminder}
            onUpdate={store.updateReminder}
            onRemove={store.removeReminder}
            onToggle={store.toggleReminder}
          />
        )}
        {view === 'trabajo' && (
          <WorkPanel
            monthKey={monthKey}
            workItems={store.monthWork}
            workNotes={store.workNotes}
            workLinks={store.workLinks}
            onAdd={store.addWorkItem}
            onUpdate={store.updateWorkItem}
            onRemove={store.removeWorkItem}
            onAddNote={store.addWorkNote}
            onUpdateNote={store.updateWorkNote}
            onRemoveNote={store.removeWorkNote}
            onAddLink={store.addWorkLink}
            onUpdateLink={store.updateWorkLink}
            onRemoveLink={store.removeWorkLink}
          />
        )}
        {view === 'cuenta' && (
          <AccountPanel user={user} onUserChanged={onUserChanged} />
        )}
      </main>

      <nav className="mobile-nav" aria-label="Navegación móvil">
        {mobileNavItems.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`mobile-nav__btn${view === item.id ? ' is-active' : ''}`}
            aria-current={view === item.id ? 'page' : undefined}
            onClick={() => setView(item.id)}
          >
            <span className="mobile-nav__icon" aria-hidden="true">
              {item.icon}
            </span>
            <span className="mobile-nav__label">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}

export default function App() {
  const auth = useAuth()

  if (auth.booting) {
    return (
      <div className="login-screen">
        <p className="login-loading">Cargando Organizador…</p>
      </div>
    )
  }

  if (!auth.user) {
    return (
      <LoginScreen
        busy={auth.busy}
        error={auth.error}
        onLogin={auth.login}
        onClearError={auth.clearError}
      />
    )
  }

  return (
    <AuthenticatedApp
      user={auth.user}
      onLogout={auth.logout}
      onUserChanged={auth.refreshUser}
    />
  )
}
