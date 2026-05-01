import { Outlet, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { useConvexAuth } from 'convex/react'
import { Sidebar, MobileNav } from './Sidebar'
import { FullPageSpinner } from '@/components/ui/spinner'
import { useCurrentUser } from '@/hooks/useCurrentUser'

export function AppLayout() {
  const { isAuthenticated, isLoading } = useConvexAuth()
  const navigate = useNavigate()
  const user = useCurrentUser()

  // Redirect unauthenticated users to login
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      void navigate({ to: '/login' })
    }
  }, [isAuthenticated, isLoading, navigate])

  if (isLoading || user === undefined) {
    return <FullPageSpinner />
  }

  if (!isAuthenticated || !user) {
    return null
  }

  // Inactive accounts cannot access the app
  if (!user.isActive) {
    return (
      <div className="flex h-dvh items-center justify-center p-6">
        <div className="max-w-sm text-center">
          <div className="text-4xl mb-4">⏳</div>
          <h1 className="font-display text-2xl text-ink-primary mb-2">Account Pending</h1>
          <p className="text-sm text-ink-secondary">
            Your account is awaiting activation by the owner. Please check back shortly.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-dvh overflow-hidden bg-surface-bg">
      <Sidebar />
      <main className="flex-1 overflow-y-auto pb-16 lg:pb-0">
        <Outlet />
      </main>
      <MobileNav />
    </div>
  )
}
