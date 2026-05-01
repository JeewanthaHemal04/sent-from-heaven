import { mutation } from './_generated/server'
import { v } from 'convex/values'
import { getAuthUserId } from '@convex-dev/auth/server'

/**
 * Save or update a product count within a session.
 * Idempotent: calling multiple times with the same (sessionId, productId)
 * updates the existing record rather than creating duplicates.
 */
export const upsertCount = mutation({
  args: {
    sessionId: v.id('stockSessions'),
    productId: v.id('products'),
    countedQuantity: v.number(),
  },
  handler: async (ctx, { sessionId, productId, countedQuantity }) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error('Not authenticated')

    // Verify session is still in draft
    const session = await ctx.db.get(sessionId)
    if (!session) throw new Error('Session not found')
    if (session.status === 'submitted') throw new Error('Session already submitted')

    const existing = await ctx.db
      .query('stockCounts')
      .withIndex('by_session_product', (q) =>
        q.eq('sessionId', sessionId).eq('productId', productId)
      )
      .first()

    if (existing) {
      await ctx.db.patch(existing._id, {
        countedQuantity,
        countedAt: Date.now(),
        countedBy: userId,
      })
    } else {
      await ctx.db.insert('stockCounts', {
        sessionId,
        productId,
        countedQuantity,
        countedAt: Date.now(),
        countedBy: userId,
      })
    }
  },
})
