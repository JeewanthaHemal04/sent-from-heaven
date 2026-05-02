import { query, mutation } from './_generated/server'
import { v } from 'convex/values'
import { getAuthUserId } from '@convex-dev/auth/server'

/** Get or create today's stock session (idempotent) */
export const getOrCreateForToday = mutation({
  args: { date: v.string() }, // YYYY-MM-DD in SL timezone
  handler: async (ctx, { date }) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error('Not authenticated')

    const existing = await ctx.db
      .query('stockSessions')
      .withIndex('by_date', (q) => q.eq('date', date))
      .first()

    if (existing) return existing._id

    return await ctx.db.insert('stockSessions', {
      date,
      status: 'draft',
      createdBy: userId,
    })
  },
})

/** Get today's session (query, reactive) */
export const getTodaySession = query({
  args: { date: v.string() },
  handler: async (ctx, { date }) => {
    return await ctx.db
      .query('stockSessions')
      .withIndex('by_date', (q) => q.eq('date', date))
      .first()
  },
})

/**
 * Full session data: session metadata + all counts + all active products.
 * Powers the card-by-card stock taking UI.
 */
export const getSessionWithCounts = query({
  args: { sessionId: v.id('stockSessions') },
  handler: async (ctx, { sessionId }) => {
    const session = await ctx.db.get(sessionId)
    if (!session) return null

    const [products, counts] = await Promise.all([
      ctx.db
        .query('products')
        .withIndex('by_active_sort', (q) => q.eq('isActive', true))
        .order('asc')
        .collect(),
      ctx.db
        .query('stockCounts')
        .withIndex('by_session', (q) => q.eq('sessionId', sessionId))
        .collect(),
    ])

    // Exclude products opted out of stock taking
    const stockTakingProducts = products.filter((p) => !p.isNotStockTaking)

    // Attach serving URLs
    const productsWithImages = await Promise.all(
      stockTakingProducts.map(async (p) => ({
        ...p,
        imageServingUrl: p.imageStorageId
          ? await ctx.storage.getUrl(p.imageStorageId)
          : null,
      }))
    )

    return { session, products: productsWithImages, counts }
  },
})

/** List recent sessions for the session list page */
export const listRecent = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit = 30 }) => {
    const sessions = await ctx.db
      .query('stockSessions')
      .order('desc')
      .take(limit)

    return await Promise.all(
      sessions.map(async (session) => {
        const counts = await ctx.db
          .query('stockCounts')
          .withIndex('by_session', (q) => q.eq('sessionId', session._id))
          .collect()
        const creator = await ctx.db.get(session.createdBy)
        return { ...session, countTotal: counts.length, creatorName: creator?.name ?? 'Unknown' }
      })
    )
  },
})

/**
 * Submit a session — validates all active products are counted.
 * Irreversible.
 */
export const submitSession = mutation({
  args: {
    sessionId: v.id('stockSessions'),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { sessionId, notes }) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error('Not authenticated')

    const session = await ctx.db.get(sessionId)
    if (!session) throw new Error('Session not found')
    if (session.status === 'submitted') throw new Error('Session already submitted')

    const [activeProducts, counts] = await Promise.all([
      ctx.db
        .query('products')
        .withIndex('by_active_sort', (q) => q.eq('isActive', true))
        .collect(),
      ctx.db
        .query('stockCounts')
        .withIndex('by_session', (q) => q.eq('sessionId', sessionId))
        .collect(),
    ])

    // Only require counts for stock-taking products
    const stockTakingProducts = activeProducts.filter((p) => !p.isNotStockTaking)
    const countedIds = new Set(counts.map((c) => c.productId.toString()))
    const uncounted = stockTakingProducts.filter((p) => !countedIds.has(p._id.toString()))

    if (uncounted.length > 0) {
      throw new Error(
        `${uncounted.length} product${uncounted.length > 1 ? 's' : ''} not yet counted`
      )
    }

    await ctx.db.patch(sessionId, {
      status: 'submitted',
      submittedAt: Date.now(),
      ...(notes ? { notes } : {}),
    })
  },
})
