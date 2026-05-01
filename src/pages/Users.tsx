import { useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import { Plus, UserCheck, UserX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { RoleBadge } from '@/components/ui/badge'
import { Modal, ConfirmModal } from '@/components/ui/modal'
import { FullPageSpinner } from '@/components/ui/spinner'
import { useCurrentUser } from '@/hooks/useCurrentUser'

type UserRole = 'owner' | 'manager' | 'worker'

export function UsersPage() {
  const currentUser = useCurrentUser()
  const users = useQuery(api.users.listUsers)
  const updateUser = useMutation(api.users.updateUser)
  const [showAdd, setShowAdd] = useState(false)
  const [toggleUserId, setToggleUserId] = useState<string | null>(null)

  if (!currentUser || users === undefined) return <FullPageSpinner />

  const pendingUser = toggleUserId ? users.find((u) => u._id.toString() === toggleUserId) : null

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display italic text-3xl text-ink-primary mb-1">Users</h1>
          <p className="text-sm text-ink-secondary">
            {users.filter((u) => u.isActive).length} active · {users.length} total
          </p>
        </div>
        <Button size="md" leftIcon={<Plus size={15} />} onClick={() => setShowAdd(true)}>
          Add User
        </Button>
      </div>

      <div className="space-y-2">
        {users.map((user) => (
          <div
            key={user._id.toString()}
            className={`flex items-center gap-3 px-4 py-3.5 rounded-xl border transition-colors ${
              user.isActive
                ? 'bg-surface-card border-surface-border'
                : 'bg-surface-raised/50 border-surface-border/50 opacity-60'
            }`}
          >
            {/* Avatar */}
            <div className="w-9 h-9 rounded-full bg-coral-500/20 text-coral-400 flex items-center justify-center text-sm font-semibold shrink-0">
              {user.name.slice(0, 1).toUpperCase()}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-ink-primary truncate">{user.name}</p>
                {user._id.toString() === currentUser._id.toString() && (
                  <span className="text-[10px] text-ink-tertiary border border-surface-muted rounded-full px-1.5 py-0.5">you</span>
                )}
              </div>
              <p className="text-xs text-ink-tertiary">{user.email}</p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <RoleBadge role={user.role} />

              {/* Role selector */}
              {user._id.toString() !== currentUser._id.toString() && (
                <>
                  <select
                    value={user.role}
                    onChange={(e) =>
                      void updateUser({ userId: user._id, role: e.target.value as UserRole })
                    }
                    className="text-xs bg-surface-elevated border border-surface-border rounded-lg px-2 py-1.5 text-ink-secondary focus:outline-none focus:border-coral-500"
                  >
                    <option value="worker">Worker</option>
                    <option value="manager">Manager</option>
                    <option value="owner">Owner</option>
                  </select>

                  <button
                    onClick={() => setToggleUserId(user._id.toString())}
                    className={`p-1.5 rounded-lg transition-colors ${
                      user.isActive
                        ? 'text-ink-tertiary hover:text-rose hover:bg-rose-bg'
                        : 'text-ink-tertiary hover:text-emerald hover:bg-emerald-bg'
                    }`}
                    title={user.isActive ? 'Deactivate user' : 'Activate user'}
                  >
                    {user.isActive ? <UserX size={15} /> : <UserCheck size={15} />}
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Instruction */}
      <div className="mt-6 p-4 rounded-xl bg-surface-elevated border border-surface-border text-xs text-ink-tertiary leading-relaxed">
        <strong className="text-ink-secondary">How to add a user:</strong> Add their email and role here,
        then have them sign up at the login page using that email. They&apos;ll be assigned the role you set.
        If they sign up before being added, they&apos;ll appear as an inactive Worker — activate them here.
      </div>

      <AddUserModal open={showAdd} onClose={() => setShowAdd(false)} />

      <ConfirmModal
        open={!!toggleUserId}
        onClose={() => setToggleUserId(null)}
        onConfirm={async () => {
          if (!pendingUser) return
          await updateUser({ userId: pendingUser._id as Id<'users'>, isActive: !pendingUser.isActive })
          setToggleUserId(null)
        }}
        title={pendingUser?.isActive ? 'Deactivate User' : 'Activate User'}
        message={
          pendingUser?.isActive
            ? `${pendingUser.name} will lose access to the app immediately.`
            : `${pendingUser?.name} will regain access to the app.`
        }
        confirmLabel={pendingUser?.isActive ? 'Deactivate' : 'Activate'}
        danger={pendingUser?.isActive}
      />
    </div>
  )
}

function AddUserModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const preCreate = useMutation(api.users.preCreateUser)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<UserRole>('worker')
  const [isSaving, setIsSaving] = useState(false)

  async function handleSubmit() {
    if (!name || !email) return alert('Name and email are required')
    setIsSaving(true)
    try {
      await preCreate({ name, email, role })
      onClose()
      setName('')
      setEmail('')
      setRole('worker')
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to add user')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Add User" size="sm">
      <div className="space-y-4">
        <Input label="Full Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Kamal Perera" />
        <Input label="Email Address" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="kamal@example.com" />
        <div>
          <label className="text-xs font-medium text-ink-secondary uppercase tracking-wider block mb-1.5">Role</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            className="w-full bg-surface-elevated border border-surface-border rounded-lg px-3 py-2.5 text-sm text-ink-primary focus:outline-none focus:border-coral-500"
          >
            <option value="worker">Worker — Stock taking only</option>
            <option value="manager">Manager — Stock + Movements + Summary</option>
            <option value="owner">Owner — Full access</option>
          </select>
        </div>
        <div className="flex gap-3 pt-1">
          <Button variant="ghost" onClick={onClose} className="flex-1">Cancel</Button>
          <Button isLoading={isSaving} onClick={() => void handleSubmit()} className="flex-1">Add User</Button>
        </div>
      </div>
    </Modal>
  )
}
