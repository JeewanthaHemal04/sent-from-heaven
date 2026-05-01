import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  Navigate,
} from '@tanstack/react-router'
import { AppLayout } from '@/components/layout/AppLayout'
import { LoginPage } from '@/pages/Login'
import { SetPasswordPage } from '@/pages/SetPassword'
import { DashboardPage } from '@/pages/Dashboard'
import { StockTakingPage } from '@/pages/StockTaking'
import { StockSessionPage } from '@/pages/StockSession'
import { MovementsPage } from '@/pages/Movements'
import { DailySummaryPage } from '@/pages/DailySummary'
import { ProductsPage } from '@/pages/Products'
import { UsersPage } from '@/pages/Users'
import { VendingMachinePage } from '@/pages/VendingMachine'

// ── Root route ────────────────────────────────────────────────────────────

const rootRoute = createRootRoute({
  component: () => <Outlet />,
})

// ── Public routes ─────────────────────────────────────────────────────────

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: LoginPage,
})

const setPasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/set-password',
  component: SetPasswordPage,
})

// ── Protected layout ──────────────────────────────────────────────────────

const appRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: '_app',
  component: AppLayout,
})

// ── Protected pages ───────────────────────────────────────────────────────

const indexRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/',
  component: () => <Navigate to="/stock-taking" />,
})

const dashboardRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/dashboard',
  component: DashboardPage,
})

const stockTakingRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/stock-taking',
  component: StockTakingPage,
})

const stockSessionRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/stock-taking/$sessionId',
  component: StockSessionPage,
})

const movementsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/movements',
  component: MovementsPage,
})

const dailySummaryRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/daily-summary',
  component: DailySummaryPage,
})

const productsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/products',
  component: ProductsPage,
})

const usersRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/users',
  component: UsersPage,
})

const vendingMachineRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/vending-machine',
  component: VendingMachinePage,
})

// ── Route tree ────────────────────────────────────────────────────────────

const routeTree = rootRoute.addChildren([
  loginRoute,
  setPasswordRoute,
  appRoute.addChildren([
    indexRoute,
    dashboardRoute,
    stockTakingRoute,
    stockSessionRoute,
    movementsRoute,
    dailySummaryRoute,
    productsRoute,
    usersRoute,
    vendingMachineRoute,
  ]),
])

export const router = createRouter({ routeTree })

// Type registration for full type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
