import { useState, type FormEvent } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useAuthActions } from '@convex-dev/auth/react'
import { useConvexAuth } from 'convex/react'
import { useEffect } from 'react'
import { Eye, EyeOff, Mail, Lock } from 'lucide-react'
import { cn } from '@/lib/utils'

export function LoginPage() {
  const { signIn } = useAuthActions()
  const { isAuthenticated } = useConvexAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Already logged in → redirect
  useEffect(() => {
    if (isAuthenticated) {
      void navigate({ to: '/' })
    }
  }, [isAuthenticated, navigate])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setIsLoading(true)
    try {
      await signIn('password', { email, password, flow: 'signIn' })
    } catch {
      setError('Invalid email or password. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div
      className="min-h-dvh flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden"
      style={{
        background: [
          'radial-gradient(ellipse at 20% 10%, rgba(224,92,58,0.18) 0%, transparent 50%)',
          'radial-gradient(ellipse at 80% 90%, rgba(245,158,11,0.06) 0%, transparent 50%)',
          '#0e0e0e',
        ].join(', '),
      }}
    >
      {/* Decorative circles */}
      <div
        className="absolute top-[-120px] left-[-120px] w-80 h-80 rounded-full opacity-30"
        style={{ background: 'radial-gradient(circle, rgba(224,92,58,0.2) 0%, transparent 70%)' }}
        aria-hidden
      />
      <div
        className="absolute bottom-[-80px] right-[-80px] w-60 h-60 rounded-full opacity-20"
        style={{ background: 'radial-gradient(circle, rgba(245,158,11,0.15) 0%, transparent 70%)' }}
        aria-hidden
      />

      {/* Brand mark */}
      <div className="text-center mb-8 relative z-10">
        <div
          className="font-display text-6xl text-coral-500 leading-none mb-2"
          style={{ fontStyle: 'italic', textShadow: '0 0 40px rgba(224,92,58,0.4)' }}
        >
          P&amp;S
        </div>
        <p className="text-xs text-ink-tertiary uppercase tracking-[0.25em] font-medium">
          Perera &amp; Sons · Inventory
        </p>
      </div>

      {/* Login card */}
      <div
        className="relative z-10 w-full max-w-[360px] rounded-2xl border border-surface-border p-8"
        style={{
          background: 'linear-gradient(135deg, rgba(30,30,30,0.95) 0%, rgba(22,22,22,0.95) 100%)',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.04)',
        }}
      >
        <h1 className="text-lg font-semibold text-ink-primary mb-1">Sign in</h1>
        <p className="text-sm text-ink-tertiary mb-6">
          Access your inventory dashboard
        </p>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-rose-bg border border-rose/20 text-rose text-sm">
            {error}
          </div>
        )}

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          {/* Email */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-ink-secondary uppercase tracking-wider">
              Email
            </label>
            <div className="relative">
              <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-tertiary pointer-events-none" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
                className={cn(
                  'w-full pl-9 pr-3 py-2.5 rounded-xl text-sm',
                  'bg-surface-bg border border-surface-border',
                  'text-ink-primary placeholder:text-ink-tertiary/60',
                  'focus:outline-none focus:border-coral-500 focus:ring-1 focus:ring-coral-500/20',
                  'transition-colors'
                )}
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-ink-secondary uppercase tracking-wider">
              Password
            </label>
            <div className="relative">
              <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-tertiary pointer-events-none" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                required
                className={cn(
                  'w-full pl-9 pr-10 py-2.5 rounded-xl text-sm',
                  'bg-surface-bg border border-surface-border',
                  'text-ink-primary placeholder:text-ink-tertiary/60',
                  'focus:outline-none focus:border-coral-500 focus:ring-1 focus:ring-coral-500/20',
                  'transition-colors'
                )}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-tertiary hover:text-ink-secondary transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || !email || !password}
            className={cn(
              'w-full mt-2 py-3 rounded-xl font-semibold text-sm transition-all duration-200',
              'focus:outline-none focus:ring-2 focus:ring-coral-500/40',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'bg-coral-500 hover:bg-coral-600 active:bg-coral-700 text-white',
              'shadow-sm'
            )}
          >
            {isLoading ? (
              <span className="inline-flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Signing in…
              </span>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <p className="text-center text-xs text-ink-tertiary mt-6">
          Don&apos;t have an account? Ask the owner to set one up for you.
        </p>
      </div>

      {/* Footer */}
      <p className="mt-8 text-xs text-ink-tertiary/50 relative z-10">
        Perera &amp; Sons Franchise · Sri Lanka
      </p>
    </div>
  )
}
