import { useNavigate } from '@tanstack/react-router'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { ClipboardList, Plus, CheckCircle2, Clock, ChevronRight } from 'lucide-react'
import { FullPageSpinner } from '@/components/ui/spinner'
import { Badge } from '@/components/ui/badge'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { todaySL, formatDate } from '@/lib/utils'

export function StockTakingPage() {
  const navigate = useNavigate()
  const user = useCurrentUser()
  const today = todaySL()

  const sessions = useQuery(api.stockSessions.listRecent, { limit: 20 })
  const todaySession = useQuery(api.stockSessions.getTodaySession, { date: today })
  const getOrCreate = useMutation(api.stockSessions.getOrCreateForToday)

  async function startTodaySession() {
    const sessionId = await getOrCreate({ date: today })
    void navigate({ to: '/stock-taking/$sessionId', params: { sessionId: sessionId as string } })
  }

  async function openSession(sessionId: string) {
    void navigate({ to: '/stock-taking/$sessionId', params: { sessionId } })
  }

  if (!user || sessions === undefined) return <FullPageSpinner />

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-display italic text-3xl text-ink-primary mb-1">Stock Taking</h1>
        <p className="text-sm text-ink-secondary">Record daily stock counts</p>
      </div>

      {/* Today's card */}
      <div
        className="rounded-2xl border border-surface-border overflow-hidden mb-6"
        style={{
          background: 'linear-gradient(135deg, #1e1e1e 0%, #1a1614 100%)',
        }}
      >
        <div className="p-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-xs text-ink-tertiary uppercase tracking-widest font-medium mb-1">Today</p>
              <h2 className="text-lg font-semibold text-ink-primary">{formatDate(today)}</h2>
            </div>
            {todaySession ? (
              <Badge variant={todaySession.status === 'submitted' ? 'success' : 'gold'}>
                {todaySession.status === 'submitted' ? '✓ Done' : '● In Progress'}
              </Badge>
            ) : (
              <Badge variant="default">Not started</Badge>
            )}
          </div>

          {todaySession?.status === 'submitted' ? (
            <div className="flex items-center gap-2 text-emerald text-sm mb-4">
              <CheckCircle2 size={16} />
              <span>Stock count submitted for today</span>
            </div>
          ) : (
            <button
              onClick={() => void startTodaySession()}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-coral-500 hover:bg-coral-600 text-white font-semibold text-sm transition-colors"
            >
              {todaySession ? (
                <>
                  <ClipboardList size={16} />
                  Continue Today&apos;s Count
                </>
              ) : (
                <>
                  <Plus size={16} />
                  Start Today&apos;s Count
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Recent sessions */}
      {sessions.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-ink-tertiary uppercase tracking-widest mb-3">
            Recent Sessions
          </h3>
          <div className="space-y-2">
            {sessions
              .filter((s) => s.date !== today) // today is shown above
              .map((session) => (
                <button
                  key={session._id}
                  onClick={() => void openSession(session._id as string)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl bg-surface-card border border-surface-border hover:border-surface-muted transition-all text-left group"
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                      session.status === 'submitted'
                        ? 'bg-emerald-bg text-emerald'
                        : 'bg-amber-bg text-amber'
                    }`}
                  >
                    {session.status === 'submitted' ? (
                      <CheckCircle2 size={15} />
                    ) : (
                      <Clock size={15} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ink-primary">{formatDate(session.date)}</p>
                    <p className="text-xs text-ink-tertiary">
                      {session.countTotal} products · by {session.creatorName}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={session.status === 'submitted' ? 'success' : 'warning'}>
                      {session.status === 'submitted' ? 'Submitted' : 'Draft'}
                    </Badge>
                    <ChevronRight size={15} className="text-ink-tertiary group-hover:text-ink-secondary transition-colors" />
                  </div>
                </button>
              ))}
          </div>
        </div>
      )}

      {sessions.length === 0 && (
        <div className="text-center py-12">
          <ClipboardList size={40} className="text-surface-muted mx-auto mb-3" />
          <p className="text-sm text-ink-tertiary">No sessions yet. Start your first stock count above.</p>
        </div>
      )}
    </div>
  )
}
