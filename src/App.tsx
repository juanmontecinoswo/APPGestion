import { useEffect, useState } from 'react'
import type { UserAccount, ViewId, WorkSection } from './types'
import { MENU_ITEMS, WORK_SECTIONS } from './types'
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

const SIDEBAR_KEY = 'organizador-sidebar-v1'

const NAV_ICONS: Record<Exclude<ViewId, 'cuenta'>, string> = {
  dashboard: '⌂',
  finanzas: '$',
  tareas: '✓',
  recordatorios: '◷',
  trabajo: '▣',
}

const WORK_SECTION_ICONS: Record<WorkSection, string> = {
  encargos: '▣',
  notas: '✎',
  links: '⛓',
}

function userInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

function readSidebarExpanded(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_KEY) !== 'collapsed'
  } catch {
    return true
  }
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
  const [workSection, setWorkSection] = useState<WorkSection>('encargos')
  const [trabajoMenuOpen, setTrabajoMenuOpen] = useState(false)
  const [ready, setReady] = useState(false)
  const [sidebarExpanded, setSidebarExpanded] = useState(readSidebarExpanded)
  const store = useAppStore(user.id, monthKey)

  useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true))
    return () => cancelAnimationFrame(id)
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(
        SIDEBAR_KEY,
        sidebarExpanded ? 'expanded' : 'collapsed',
      )
    } catch {
      /* ignore */
    }
  }, [sidebarExpanded])

  useEffect(() => {
    if (view !== 'trabajo') setTrabajoMenuOpen(false)
  }, [view])

  const sideNavItems: { id: Exclude<ViewId, 'cuenta'>; label: string }[] = [
    { id: 'dashboard', label: 'Inicio' },
    ...MENU_ITEMS.map((item) => ({
      id: item.id as Exclude<ViewId, 'cuenta'>,
      label: item.label,
    })),
  ]

  const mobileNavItems: { id: ViewId; label: string; icon: string }[] = [
    { id: 'dashboard', label: 'Inicio', icon: NAV_ICONS.dashboard },
    ...MENU_ITEMS.map((item) => ({
      id: item.id as ViewId,
      label: item.shortLabel,
      icon: NAV_ICONS[item.id],
    })),
  ]

  function toggleSidebar() {
    setSidebarExpanded((open) => !open)
  }

  function openView(next: ViewId) {
    if (next === 'trabajo') {
      setView('trabajo')
      setWorkSection('encargos')
      setTrabajoMenuOpen((open) => (view === 'trabajo' ? !open : true))
      return
    }
    setView(next)
    setTrabajoMenuOpen(false)
  }

  function openWorkSection(section: WorkSection) {
    setView('trabajo')
    setWorkSection(section)
    setTrabajoMenuOpen(true)
  }

  return (
    <div
      className={`shell shell--app${ready ? ' is-ready' : ''}${sidebarExpanded ? '' : ' is-sidebar-collapsed'}`}
    >
      <aside className="sidebar" aria-label="Menú lateral">
        <div className="sidebar__top">
          <button
            type="button"
            className="sidebar__brand"
            onClick={() => openView('dashboard')}
            title="Inicio"
          >
            <span className="topbar__logo" aria-hidden="true">
              O
            </span>
            <span className="sidebar__brand-text">Organizador</span>
          </button>
          <button
            type="button"
            className="btn btn--icon sidebar__toggle"
            aria-label={
              sidebarExpanded ? 'Contraer menú lateral' : 'Expandir menú lateral'
            }
            aria-expanded={sidebarExpanded}
            onClick={toggleSidebar}
          >
            {sidebarExpanded ? '‹' : '›'}
          </button>
        </div>

        <nav className="sidebar__nav">
          {sideNavItems.map((item) => (
            <div key={item.id} className="sidebar__group">
              <button
                type="button"
                className={`sidebar__btn${
                  view === item.id && item.id !== 'trabajo' ? ' is-active' : ''
                }${item.id === 'trabajo' && view === 'trabajo' ? ' is-active' : ''}`}
                aria-current={
                  view === item.id && item.id !== 'trabajo' ? 'page' : undefined
                }
                aria-expanded={
                  item.id === 'trabajo' ? trabajoMenuOpen : undefined
                }
                title={item.label}
                onClick={() => openView(item.id)}
              >
                <span className="sidebar__icon" aria-hidden="true">
                  {NAV_ICONS[item.id]}
                </span>
                <span className="sidebar__label">{item.label}</span>
                {item.id === 'trabajo' && (
                  <span className="sidebar__chevron" aria-hidden="true">
                    {trabajoMenuOpen ? '▾' : '▸'}
                  </span>
                )}
              </button>

              {item.id === 'trabajo' && (
                <div
                  className={`sidebar__subnav${trabajoMenuOpen ? ' is-open' : ''}`}
                  role="group"
                  aria-label="Submenús de trabajo"
                  hidden={!trabajoMenuOpen}
                >
                  {WORK_SECTIONS.map((section) => (
                    <button
                      key={section.id}
                      type="button"
                      className={`sidebar__subbtn${view === 'trabajo' && workSection === section.id ? ' is-active' : ''}`}
                      aria-current={
                        view === 'trabajo' && workSection === section.id
                          ? 'page'
                          : undefined
                      }
                      title={section.label}
                      onClick={() => openWorkSection(section.id)}
                    >
                      <span className="sidebar__icon" aria-hidden="true">
                        {WORK_SECTION_ICONS[section.id]}
                      </span>
                      <span className="sidebar__label">{section.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>
      </aside>

      <div className="shell__main">
        <header className="topbar">
          <div className="topbar__leading">
            <button
              type="button"
              className="btn btn--icon topbar__menu-toggle"
              aria-label={
                sidebarExpanded
                  ? 'Contraer menú lateral'
                  : 'Expandir menú lateral'
              }
              aria-expanded={sidebarExpanded}
              onClick={toggleSidebar}
            >
              ≡
            </button>
            <button
              type="button"
              className="topbar__brand"
              onClick={() => openView('dashboard')}
            >
              <span
                className="topbar__logo topbar__logo--compact"
                aria-hidden="true"
              >
                O
              </span>
              <span className="brand">Organizador</span>
            </button>
          </div>

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
              onOpen={(next) => openView(next)}
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
              section={workSection}
              onSectionChange={setWorkSection}
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
      </div>

      <nav className="mobile-nav" aria-label="Navegación móvil">
        {mobileNavItems.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`mobile-nav__btn${view === item.id ? ' is-active' : ''}`}
            aria-current={view === item.id ? 'page' : undefined}
            onClick={() => openView(item.id)}
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
