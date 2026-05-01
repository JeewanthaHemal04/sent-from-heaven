import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import type { UserRole } from '@/lib/utils'

export function useCurrentUser() {
  return useQuery(api.users.getCurrentUser)
}

export function useRole(): UserRole | null {
  const user = useCurrentUser()
  return user?.role ?? null
}

export function useIsOwner() {
  return useRole() === 'owner'
}

export function useIsManager() {
  const role = useRole()
  return role === 'owner' || role === 'manager'
}

export function useCanAccessDashboard() {
  const role = useRole()
  return role === 'owner' || role === 'manager'
}
