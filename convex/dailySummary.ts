import { query, mutation } from './_generated/server'
import { v } from 'convex/values'
import { getAuthUserId } from '@convex-dev/auth/server'

const deliveryAppValidator = v.object({ name: v.string(), amount: v.number() })

/** Upsert daily sales summary (idempotent by date) */
export const upsertForDate = mutation({
  args: {
    date: v.string(),
    cashAmount: v.number(),
    cardAmount: v.number(),
    deliveryApps: v.array(deliveryAppValidator),
    specialOrderAmount: v.number(),
    pereraSettlementAmount: v.number(),
    tradingPaymentAmount: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error('Not authenticated')
    const caller = await ctx.db.get(userId)
    if (!caller || caller.role === 'worker') throw new Error('Unauthorized')

    const existing = await ctx.db
      .query('dailySalesSummary')
      .withIndex('by_date', (q) => q.eq('date', args.date))
      .first()

    const data = { ...args, createdBy: userId, updatedAt: Date.now() }

    if (existing) {
      await ctx.db.patch(existing._id, data)
      return existing._id
    }
    return await ctx.db.insert('dailySalesSummary', data)
  },
})

/** Get daily summary for a specific date */
export const getForDate = query({
  args: { date: v.string() },
  handler: async (ctx, { date }) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return null
    return await ctx.db
      .query('dailySalesSummary')
      .withIndex('by_date', (q) => q.eq('date', date))
      .first()
  },
})

/** List recent daily summaries */
export const listRecent = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit = 30 }) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return []
    const caller = await ctx.db.get(userId)
    if (!caller || caller.role === 'worker') return []

    return await ctx.db
      .query('dailySalesSummary')
      .order('desc')
      .take(limit)
  },
})
