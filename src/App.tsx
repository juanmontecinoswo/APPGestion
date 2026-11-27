import { useEffect, useRef, useState } from 'react'
import type { UserAccount, ViewId, WorkSection } from './types'
import { MENU_ITEMS, WORK_SECTIONS } from './types'
import {
  monthKeyFromDate,
  downloadUserBackup,
  readBackupFile,
  importUserBackup,
  restoreAutoBackup,
} from './lib/storage'
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
  calendario: '▦',
  proyectos: '◎',
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
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [ready, setReady] = useState(false)
  const [sidebarExpanded, setSidebarExpanded] = useState(readSidebarExpanded)
  const [backupMessage, setBackupMessage] = useState<string | null>(null)
  const [backupError, setBackupError] = useState<string | null>(null)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const backupInputRef = useRef<HTMLInputElement>(null)
  const store = useAppStore(user.id, monthKey, user.username)

  const pendingTasks = store.monthTasks.filter((task) => !task.done).length
  const pendingPayments = store.monthExpenses.filter(
    (expense) => !expense.paid,
  ).length

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

  useEffect(() => {
    if (!userMenuOpen) return
    function onPointerDown(event: MouseEvent) {
      if (!userMenuRef.current?.contains(event.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setUserMenuOpen(false)
    }
    window.addEventListener('mousedown', onPointerDown)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('mousedown', onPointerDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [userMenuOpen])

  useEffect(() => {
    if (!mobileMenuOpen) return
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setMobileMenuOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mobileMenuOpen])

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

  function isNarrowViewport() {
    return (
      typeof window !== 'undefined' &&
      window.matchMedia('(max-width: 760px)').matches
    )
  }

  function toggleSidebar() {
    setSidebarExpanded((open) => !open)
  }

  function toggleMenu() {
    if (isNarrowViewport()) {
      setMobileMenuOpen((open) => !open)
      return
    }
    toggleSidebar()
  }

  function closeMobileMenu() {
    setMobileMenuOpen(false)
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
    setMobileMenuOpen(false)
  }

  function openWorkSection(section: WorkSection) {
    setView('trabajo')
    setWorkSection(section)
    setTrabajoMenuOpen(true)
    setMobileMenuOpen(false)
  }

  function handleDownloadBackup() {
    setBackupError(null)
    downloadUserBackup(
      {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
      },
      store.data,
    )
    setBackupMessage('Backup descargado.')
    window.setTimeout(() => setBackupMessage(null), 2500)
  }

  async function handleBackupFile(file: File | null) {
    if (!file) return
    setBackupError(null)
    setBackupMessage(null)
    const confirmed = window.confirm(
      'Esto reemplazará todos los datos del usuario actual con el backup. ¿Continuar?',
    )
    if (!confirmed) {
      if (backupInputRef.current) backupInputRef.current.value = ''
      return
    }
    try {
      const parsed = await readBackupFile(file)
      const next = importUserBackup(user.id, parsed, user.username)
      store.replaceState(next)
      setBackupMessage('Backup cargado correctamente.')
      setMobileMenuOpen(false)
      setView('dashboard')
      window.setTimeout(() => setBackupMessage(null), 3000)
    } catch (error) {
      setBackupError(
        error instanceof Error
          ? error.message
          : 'No se pudo cargar el backup.',
      )
    } finally {
      if (backupInputRef.current) backupInputRef.current.value = ''
    }
  }

  function handleRestoreAutoBackup(dayKey: string) {
    setBackupError(null)
    try {
      const next = restoreAutoBackup(user.id, dayKey, user.username)
      store.replaceState(next)
      setBackupMessage('Respaldo automático restaurado.')
      setView('dashboard')
      window.setTimeout(() => setBackupMessage(null), 3000)
    } catch (error) {
      setBackupError(
        error instanceof Error
          ? error.message
          : 'No se pudo restaurar el respaldo automático.',
      )
    }
  }

  return (
    <div
      className={`shell shell--app${ready ? ' is-ready' : ''}${sidebarExpanded ? '' : ' is-sidebar-collapsed'}${mobileMenuOpen ? ' is-mobile-menu-open' : ''}`}
    >
      {mobileMenuOpen && (
        <button
          type="button"
          className="sidebar-backdrop"
          aria-label="Cerrar menú"
          onClick={closeMobileMenu}
        />
      )}

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
          <button
            type="button"
            className="btn btn--icon sidebar__close-mobile"
            aria-label="Cerrar menú"
            onClick={closeMobileMenu}
          >
            ×
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

        <div className="sidebar__backup" aria-label="Respaldo">
          <p className="sidebar__backup-label">Respaldo</p>
          <div className="sidebar__backup-row">
            <button
              type="button"
              className="sidebar__backup-btn"
              title="Guardar backup de tus datos"
              aria-label="Guardar backup"
              onClick={handleDownloadBackup}
            >
              <span aria-hidden="true">↓</span>
              <span className="sidebar__backup-btn-text">Guardar</span>
            </button>
            <button
              type="button"
              className="sidebar__backup-btn"
              title="Cargar backup desde un archivo"
              aria-label="Cargar backup"
              onClick={() => backupInputRef.current?.click()}
            >
              <span aria-hidden="true">↑</span>
              <span className="sidebar__backup-btn-text">Cargar</span>
            </button>
            <input
              ref={backupInputRef}
              className="sidebar__backup-input"
              type="file"
              accept="application/json,.json"
              aria-label="Seleccionar archivo de backup"
              onChange={(e) => {
                void handleBackupFile(e.target.files?.[0] ?? null)
              }}
            />
          </div>
          {(backupMessage || backupError) && (
            <p
              className={`sidebar__backup-msg${backupError ? ' sidebar__backup-msg--error' : ''}`}
              title={backupError ?? backupMessage ?? ''}
            >
              {backupError ?? backupMessage}
            </p>
          )}
        </div>
      </aside>

      <div className="shell__main">
        <header className="topbar">
          <div className="topbar__leading">
            <button
              type="button"
              className="btn btn--icon topbar__menu-toggle"
              aria-label={
                mobileMenuOpen || sidebarExpanded
                  ? 'Cerrar menú lateral'
                  : 'Abrir menú lateral'
              }
              aria-expanded={mobileMenuOpen || sidebarExpanded}
              onClick={toggleMenu}
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

          <div className="topbar__stats" aria-label="Resumen del mes">
            <button
              type="button"
              className="topbar-stat"
              onClick={() => openView('tareas')}
            >
              <span className="topbar-stat__value">{pendingTasks}</span>
              <span className="topbar-stat__label">
                <span className="topbar-stat__full">
                  {pendingTasks === 1 ? 'tarea pendiente' : 'tareas pendientes'}
                </span>
                <span className="topbar-stat__short" aria-hidden="true">
                  tareas
                </span>
              </span>
            </button>
            <button
              type="button"
              className="topbar-stat topbar-stat--pay"
              onClick={() => openView('finanzas')}
            >
              <span className="topbar-stat__value">{pendingPayments}</span>
              <span className="topbar-stat__label">
                <span className="topbar-stat__full">
                  {pendingPayments === 1
                    ? 'pago pendiente'
                    : 'pagos pendientes'}
                </span>
                <span className="topbar-stat__short" aria-hidden="true">
                  pagos
                </span>
              </span>
            </button>
          </div>

          <div className="topbar__user-wrap" ref={userMenuRef}>
            <button
              type="button"
              className={`topbar__avatar-btn${userMenuOpen ? ' is-open' : ''}`}
              aria-label="Abrir información de usuario"
              aria-expanded={userMenuOpen}
              aria-haspopup="menu"
              onClick={() => setUserMenuOpen((open) => !open)}
            >
              <span className="topbar__avatar" aria-hidden="true">
                {userInitials(user.displayName)}
              </span>
            </button>

            {userMenuOpen && (
              <div className="user-menu" role="menu">
                <div className="user-menu__head">
                  <strong>{user.displayName}</strong>
                  <span>@{user.username}</span>
                </div>
                <button
                  type="button"
                  className="user-menu__item"
                  role="menuitem"
                  onClick={() => {
                    setUserMenuOpen(false)
                    setView('cuenta')
                  }}
                >
                  Cuenta
                </button>
                <button
                  type="button"
                  className="user-menu__item user-menu__item--danger"
                  role="menuitem"
                  onClick={() => {
                    setUserMenuOpen(false)
                    onLogout()
                  }}
                >
                  Cerrar sesión
                </button>
              </div>
            )}
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
              workDayEntries={store.workDayEntries}
              workProjects={store.workProjects}
              onAdd={store.addWorkItem}
              onUpdate={store.updateWorkItem}
              onRemove={store.removeWorkItem}
              onAddNote={store.addWorkNote}
              onUpdateNote={store.updateWorkNote}
              onRemoveNote={store.removeWorkNote}
              onAddLink={store.addWorkLink}
              onUpdateLink={store.updateWorkLink}
              onRemoveLink={store.removeWorkLink}
              onAddDayEntry={store.addWorkDayEntry}
              onRemoveDayEntry={store.removeWorkDayEntry}
              onAddProject={store.addWorkProject}
              onUpdateProject={store.updateWorkProject}
              onRemoveProject={store.removeWorkProject}
            />
          )}
          {view === 'cuenta' && (
            <AccountPanel
              user={user}
              onUserChanged={onUserChanged}
              onDownloadBackup={handleDownloadBackup}
              onUploadBackup={handleBackupFile}
              onRestoreAutoBackup={handleRestoreAutoBackup}
              backupMessage={backupMessage}
              backupError={backupError}
            />
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
