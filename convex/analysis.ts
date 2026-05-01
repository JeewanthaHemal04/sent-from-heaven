import { query } from './_generated/server'
import { v } from 'convex/values'
import { getAuthUserId } from '@convex-dev/auth/server'

/**
 * Variance analysis for a specific date.
 *
 * Formula per product:
 *   expected = previousSessionCount + GRN + TradingGRN + TransferIn − CR − TransferOut
 *   variance = actualCount − expected
 *
 * Negative variance = potential theft / unrecorded stock out.
 */
export const getVarianceForDate = query({
  args: { date: v.string() },
  handler: async (ctx, { date }) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return null
    const caller = await ctx.db.get(userId)
    if (!caller || caller.role === 'worker') return null

    // 1. Find the submitted session for the target date
    const session = await ctx.db
      .query('stockSessions')
      .withIndex('by_date', (q) => q.eq('date', date))
      .first()

    if (!session || session.status !== 'submitted') return null

    // 2. Get all counts for this session
    const counts = await ctx.db
      .query('stockCounts')
      .withIndex('by_session', (q) => q.eq('sessionId', session._id))
      .collect()

    // 3. Get all movements for this date
    const movements = await ctx.db
      .query('stockMovements')
      .withIndex('by_date', (q) => q.eq('date', date))
      .collect()

    // 4. Get the most recent submitted session before this date (opening stock)
    const previousSession = await ctx.db
      .query('stockSessions')
      .withIndex('by_status_date', (q) =>
        q.eq('status', 'submitted').lt('date', date)
      )
      .order('desc')
      .first()

    const openingCounts = previousSession
      ? await ctx.db
          .query('stockCounts')
          .withIndex('by_session', (q) => q.eq('sessionId', previousSession._id))
          .collect()
      : []

    // 5. Get all active products
    const products = await ctx.db
      .query('products')
      .withIndex('by_active_sort', (q) => q.eq('isActive', true))
      .order('asc')
      .collect()

    // 6. Build lookup maps
    const openingMap = new Map(openingCounts.map((c) => [c.productId.toString(), c.countedQuantity]))
    const actualMap = new Map(counts.map((c) => [c.productId.toString(), c.countedQuantity]))

    const stockIn = new Map<string, number>()
    const stockOut = new Map<string, number>()
    const IN_TYPES = new Set(['GRN', 'TradingGRN', 'TransferIn'])

    for (const movement of movements) {
      const map = IN_TYPES.has(movement.type) ? stockIn : stockOut
      for (const item of movement.items) {
        const key = item.productId.toString()
        map.set(key, (map.get(key) ?? 0) + item.quantity)
      }
    }

    // 7. Calculate variance per product
    const items = products.map((product) => {
      const key = product._id.toString()
      const opening = openingMap.get(key) ?? 0
      const inQty = stockIn.get(key) ?? 0
      const outQty = stockOut.get(key) ?? 0
      const expected = opening + inQty - outQty
      const actual = actualMap.get(key) ?? 0
      const variance = actual - expected
      const unitCost = product.unitCost ?? 0

      return {
        productId: product._id,
        productName: product.name,
        category: product.category,
        opening,
        inQty,
        outQty,
        expected,
        actual,
        variance,
        financialImpact: variance * unitCost,
      }
    })

    // Sort: most negative variance first (highest theft risk)
    items.sort((a, b) => a.variance - b.variance)

    const totalShortage = items.filter((i) => i.variance < 0).length
    const totalExcess = items.filter((i) => i.variance > 0).length
    const totalFinancialImpact = items.reduce((sum, i) => sum + i.financialImpact, 0)

    return {
      date,
      sessionId: session._id,
      hasPreviousSession: !!previousSession,
      previousSessionDate: previousSession?.date,
      items,
      summary: {
        totalProducts: products.length,
        totalShortage,
        totalExcess,
        totalMatched: products.length - totalShortage - totalExcess,
        totalFinancialImpact,
      },
    }
  },
})

/** Dashboard summary for today */
export const getDashboardSummary = query({
  args: { date: v.string() },
  handler: async (ctx, { date }) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return null
    const caller = await ctx.db.get(userId)
    if (!caller || caller.role === 'worker') return null

    const [session, dailySummary, movements] = await Promise.all([
      ctx.db.query('stockSessions').withIndex('by_date', (q) => q.eq('date', date)).first(),
      ctx.db.query('dailySalesSummary').withIndex('by_date', (q) => q.eq('date', date)).first(),
      ctx.db.query('stockMovements').withIndex('by_date', (q) => q.eq('date', date)).collect(),
    ])

    const totalSales = dailySummary
      ? dailySummary.cashAmount +
        dailySummary.cardAmount +
        dailySummary.deliveryApps.reduce((s, d) => s + d.amount, 0) +
        dailySummary.specialOrderAmount
      : 0

    return {
      sessionStatus: session?.status ?? null,
      hasDailySummary: !!dailySummary,
      totalSales,
      pereraSettlement: dailySummary?.pereraSettlementAmount ?? 0,
      movementCount: movements.length,
      dailySummary,
    }
  },
})
