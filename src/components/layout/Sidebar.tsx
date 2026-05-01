import { useState } from 'react'
import { Link, useRouterState } from '@tanstack/react-router'
import {
  LayoutDashboard,
  ClipboardList,
  ArrowLeftRight,
  CalendarCheck,
  Package,
  Users,
  LogOut,
  CupSoda,
  Menu,
  X,
} from 'lucide-react'
import { useAuthActions } from '@convex-dev/auth/react'
import { cn } from '@/lib/utils'
import { useCurrentUser } from '@/hooks/useCurrentUser'

interface NavItem {
  to: string
  icon: React.ElementType
  label: string
  roles: string[]
}

const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard',       icon: LayoutDashboard, label: 'Dashboard',      roles: ['owner', 'manager'] },
  { to: '/stock-taking',    icon: ClipboardList,   label: 'Stock Taking',   roles: ['owner', 'manager', 'worker'] },
  { to: '/movements',       icon: ArrowLeftRight,  label: 'Movements',      roles: ['owner', 'manager'] },
  { to: '/daily-summary',   icon: CalendarCheck,   label: 'Daily Summary',  roles: ['owner', 'manager'] },
  { to: '/vending-machine', icon: CupSoda,         label: 'Vending Machine',roles: ['owner', 'manager'] },
  { to: '/products',        icon: Package,         label: 'Products',       roles: ['owner'] },
  { to: '/users',           icon: Users,           label: 'Users',          roles: ['owner'] },
]

// Max items shown in the bottom bar before "More" appears
const MOBILE_PRIMARY = 4

function useIsActive(path: string) {
  const { location } = useRouterState()
  return location.pathname === path || location.pathname.startsWith(path + '/')
}

// ── Desktop sidebar nav item ────────────────────────────────────────────────
function NavItemLink({ item }: { item: NavItem }) {
  const isActive = useIsActive(item.to)
  return (
    <Link
      to={item.to}
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 group',
        isActive
          ? 'bg-coral-500/15 text-coral-400 font-medium'
          : 'text-ink-secondary hover:text-ink-primary hover:bg-surface-card'
      )}
    >
      <item.icon
        size={17}
        className={cn(
          'transition-colors shrink-0',
          isActive ? 'text-coral-400' : 'text-ink-tertiary group-hover:text-ink-secondary'
        )}
      />
      {item.label}
    </Link>
  )
}

// ── Desktop sidebar ─────────────────────────────────────────────────────────
export function Sidebar() {
  const user = useCurrentUser()
  const { signOut } = useAuthActions()

  const visibleItems = NAV_ITEMS.filter(
    (item) => user && item.roles.includes(user.role)
  )

  return (
    <aside className="hidden lg:flex flex-col w-60 bg-surface-raised border-r border-surface-border shrink-0">
      {/* Brand */}
      <div className="px-5 py-6 border-b border-surface-border">
        <div className="flex items-baseline gap-2">
          <span className="font-display italic text-2xl text-coral-500">P&S</span>
          <span className="text-xs text-ink-tertiary uppercase tracking-widest">Inventory</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {visibleItems.map((item) => (
          <NavItemLink key={item.to} item={item} />
        ))}
      </nav>

      {/* User + Logout */}
      <div className="px-3 py-4 border-t border-surface-border">
        {user && (
          <div className="px-3 py-2 mb-1">
            <p className="text-sm font-medium text-ink-primary truncate">{user.name}</p>
            <p className="text-xs text-ink-tertiary capitalize">{user.role}</p>
          </div>
        )}
        <button
          onClick={() => void signOut()}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-ink-tertiary hover:text-rose hover:bg-rose-bg transition-all duration-150"
        >
          <LogOut size={16} />
          Sign out
        </button>
      </div>
    </aside>
  )
}

// ── Mobile: bottom bar item ─────────────────────────────────────────────────
function MobileNavItem({ item, onPress }: { item: NavItem; onPress?: () => void }) {
  const isActive = useIsActive(item.to)
  return (
    <Link
      to={item.to}
      onClick={onPress}
      className={cn(
        'flex-1 flex flex-col items-center justify-center py-2 gap-1 transition-colors min-w-0',
        isActive ? 'text-coral-400' : 'text-ink-tertiary'
      )}
    >
      <div className={cn(
        'relative flex items-center justify-center w-10 h-7 rounded-xl transition-colors',
        isActive ? 'bg-coral-500/15' : ''
      )}>
        <item.icon size={19} />
      </div>
      <span className="text-[10px] font-medium leading-none truncate w-full text-center px-1">
        {item.label}
      </span>
    </Link>
  )
}

// ── Mobile: drawer item ─────────────────────────────────────────────────────
function DrawerNavItem({ item, onNavigate }: { item: NavItem; onNavigate: () => void }) {
  const isActive = useIsActive(item.to)
  return (
    <Link
      to={item.to}
      onClick={onNavigate}
      className={cn(
        'flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm transition-all duration-150',
        isActive
          ? 'bg-coral-500/15 text-coral-400 font-medium'
          : 'text-ink-secondary hover:text-ink-primary hover:bg-surface-card'
      )}
    >
      <item.icon
        size={18}
        className={cn('shrink-0', isActive ? 'text-coral-400' : 'text-ink-tertiary')}
      />
      {item.label}
    </Link>
  )
}

// ── Mobile nav (bottom bar + drawer) ───────────────────────────────────────
export function MobileNav() {
  const user = useCurrentUser()
  const { signOut } = useAuthActions()
  const [drawerOpen, setDrawerOpen] = useState(false)

  const visibleItems = NAV_ITEMS.filter(
    (item) => user && item.roles.includes(user.role)
  )

  const primaryItems = visibleItems.slice(0, MOBILE_PRIMARY)
  const overflowItems = visibleItems.slice(MOBILE_PRIMARY)
  const hasOverflow = overflowItems.length > 0

  function closeDrawer() { setDrawerOpen(false) }

  return (
    <>
      {/* Backdrop */}
      {drawerOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={closeDrawer}
        />
      )}

      {/* Slide-up drawer */}
      <div
        className={cn(
          'lg:hidden fixed inset-x-0 bottom-0 z-50 bg-surface-raised rounded-t-2xl border-t border-surface-border transition-transform duration-300 ease-out',
          drawerOpen ? 'translate-y-0' : 'translate-y-full'
        )}
      >
        {/* Handle + header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <div className="w-8 h-1 rounded-full bg-surface-muted absolute left-1/2 -translate-x-1/2 top-3" />
          <span className="text-xs font-semibold text-ink-tertiary uppercase tracking-widest">Menu</span>
          <button
            onClick={closeDrawer}
            className="p-1.5 rounded-lg text-ink-tertiary hover:text-ink-primary hover:bg-surface-card transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Overflow nav items */}
        <nav className="px-3 pb-2 space-y-0.5">
          {overflowItems.map((item) => (
            <DrawerNavItem key={item.to} item={item} onNavigate={closeDrawer} />
          ))}
        </nav>

        {/* User info + sign out */}
        {user && (
          <div className="mx-3 mb-3 border-t border-surface-border pt-3">
            <div className="px-4 py-2 mb-1">
              <p className="text-sm font-medium text-ink-primary">{user.name}</p>
              <p className="text-xs text-ink-tertiary capitalize">{user.role}</p>
            </div>
            <button
              onClick={() => void signOut()}
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm text-ink-tertiary hover:text-rose hover:bg-rose-bg transition-all duration-150"
            >
              <LogOut size={18} />
              Sign out
            </button>
          </div>
        )}

        <div style={{ paddingBottom: 'env(safe-area-inset-bottom)' }} />
      </div>

      {/* Bottom bar */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-surface-raised/95 backdrop-blur-md border-t border-surface-border">
        <div className="flex items-stretch" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
          {primaryItems.map((item) => (
            <MobileNavItem key={item.to} item={item} />
          ))}

          {hasOverflow ? (
            <button
              onClick={() => setDrawerOpen((o) => !o)}
              className={cn(
                'flex-1 flex flex-col items-center justify-center py-2 gap-1 transition-colors min-w-0',
                drawerOpen ? 'text-coral-400' : 'text-ink-tertiary'
              )}
            >
              <div className={cn(
                'flex items-center justify-center w-10 h-7 rounded-xl transition-colors',
                drawerOpen ? 'bg-coral-500/15' : ''
              )}>
                <Menu size={19} />
              </div>
              <span className="text-[10px] font-medium leading-none">More</span>
            </button>
          ) : (
            // No overflow — show sign out as last item for single-item roles (worker)
            visibleItems.length <= MOBILE_PRIMARY && (
              <button
                onClick={() => void signOut()}
                className="flex-1 flex flex-col items-center justify-center py-2 gap-1 text-ink-tertiary transition-colors min-w-0"
              >
                <div className="flex items-center justify-center w-10 h-7">
                  <LogOut size={19} />
                </div>
                <span className="text-[10px] font-medium leading-none">Sign out</span>
              </button>
            )
          )}
        </div>
      </nav>
    </>
  )
}
