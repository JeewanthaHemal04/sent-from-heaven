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
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: ['owner', 'manager'] },
  { to: '/stock-taking', icon: ClipboardList, label: 'Stock Taking', roles: ['owner', 'manager', 'worker'] },
  { to: '/movements', icon: ArrowLeftRight, label: 'Movements', roles: ['owner', 'manager'] },
  { to: '/daily-summary', icon: CalendarCheck, label: 'Daily Summary', roles: ['owner', 'manager'] },
  { to: '/vending-machine', icon: CupSoda, label: 'Vending Machine', roles: ['owner', 'manager'] },
  { to: '/products', icon: Package, label: 'Products', roles: ['owner'] },
  { to: '/users', icon: Users, label: 'Users', roles: ['owner'] },
]

function useIsActive(path: string) {
  const { location } = useRouterState()
  return location.pathname === path || location.pathname.startsWith(path + '/')
}

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

/** Bottom navigation for mobile */
function MobileNavItem({ item }: { item: NavItem }) {
  const isActive = useIsActive(item.to)
  return (
    <Link
      to={item.to}
      className={cn(
        'flex-1 flex flex-col items-center justify-center py-2.5 gap-1 text-[10px] transition-colors',
        isActive ? 'text-coral-400' : 'text-ink-tertiary'
      )}
    >
      <item.icon size={20} />
      <span className="font-medium">{item.label}</span>
    </Link>
  )
}

export function MobileNav() {
  const user = useCurrentUser()

  const visibleItems = NAV_ITEMS.filter(
    (item) => user && item.roles.includes(user.role)
  ).slice(0, 5)

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-surface-raised border-t border-surface-border">
      <div className="flex" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {visibleItems.map((item) => (
          <MobileNavItem key={item.to} item={item} />
        ))}
      </div>
    </nav>
  )
}
