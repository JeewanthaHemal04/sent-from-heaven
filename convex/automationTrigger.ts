import { query, mutation } from './_generated/server'
import { v } from 'convex/values'
import { getAuthUserId } from '@convex-dev/auth/server'

/** Trigger a new automation run for a given date — owner or manager only */
export const triggerRun = mutation({
  args: { date: v.string() },
  handler: async (ctx, { date }) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error('Not authenticated')
    const caller = await ctx.db.get(userId)
    if (!caller || (caller.role !== 'owner' && caller.role !== 'manager'))
      throw new Error('Unauthorized')

    // Prevent double-trigger: block if a pending or running run exists for this date
    const existing = await ctx.db
      .query('automationRuns')
      .withIndex('by_date', (q) => q.eq('date', date))
      .collect()
    const inProgress = existing.find(
      (r) => r.status === 'pending' || r.status === 'running'
    )
    if (inProgress) throw new Error('A run is already in progress for this date')

    return await ctx.db.insert('automationRuns', {
      date,
      status: 'pending',
      triggeredBy: userId,
      triggeredAt: Date.now(),
    })
  },
})

/**
 * Returns the first pending run — no auth required.
 * The local automation process subscribes to this reactively via ConvexClient.
 */
export const pollForPending = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query('automationRuns')
      .withIndex('by_status', (q) => q.eq('status', 'pending'))
      .first()
  },
})

/** Mark a run as running — called by automation process, no user auth */
export const markRunStarted = mutation({
  args: { runId: v.id('automationRuns') },
  handler: async (ctx, { runId }) => {
    await ctx.db.patch(runId, { status: 'running' })
  },
})

/** Mark a run as completed — called by automation process, no user auth */
export const markRunCompleted = mutation({
  args: { runId: v.id('automationRuns'), importedCount: v.number() },
  handler: async (ctx, { runId, importedCount }) => {
    await ctx.db.patch(runId, {
      status: 'completed',
      completedAt: Date.now(),
      importedCount,
    })
  },
})

/** Mark a run as failed — called by automation process, no user auth */
export const markRunFailed = mutation({
  args: { runId: v.id('automationRuns'), error: v.string() },
  handler: async (ctx, { runId, error }) => {
    await ctx.db.patch(runId, {
      status: 'failed',
      completedAt: Date.now(),
      error,
    })
  },
})

/** Get the most recent run for a date — UI subscribes reactively */
export const getLatestRun = query({
  args: { date: v.string() },
  handler: async (ctx, { date }) => {
    return await ctx.db
      .query('automationRuns')
      .withIndex('by_date', (q) => q.eq('date', date))
      .order('desc')
      .first()
  },
})
