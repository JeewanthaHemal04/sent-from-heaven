import { query, mutation } from './_generated/server'
import { v } from 'convex/values'
import { getAuthUserId } from '@convex-dev/auth/server'

/** Upsert daily log entries for all vending machine products — manager/owner only */
export const upsertForDate = mutation({
  args: {
    date: v.string(),
    entries: v.array(
      v.object({
        productId: v.id('vendingMachineProducts'),
        physicalCupCount: v.number(),
        closingGrams: v.number(),
        notes: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, { date, entries }) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error('Not authenticated')
    const caller = await ctx.db.get(userId)
    if (!caller || caller.role === 'worker') throw new Error('Unauthorized')

    await Promise.all(
      entries.map(async ({ productId, physicalCupCount, closingGrams, notes }) => {
        const existing = await ctx.db
          .query('vendingMachineLogs')
          .withIndex('by_date_product', (q) => q.eq('date', date).eq('productId', productId))
          .first()

        if (existing) {
          await ctx.db.patch(existing._id, {
            physicalCupCount,
            closingGrams,
            notes,
            updatedAt: Date.now(),
          })
        } else {
          await ctx.db.insert('vendingMachineLogs', {
            date,
            productId,
            physicalCupCount,
            closingGrams,
            notes,
            createdBy: userId,
            updatedAt: Date.now(),
          })
        }
      })
    )
  },
})

/** Get all logs for a specific date */
export const getLogsForDate = query({
  args: { date: v.string() },
  handler: async (ctx, { date }) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return []

    return await ctx.db
      .query('vendingMachineLogs')
      .withIndex('by_date', (q) => q.eq('date', date))
      .collect()
  },
})

/** Get full cup-loss analysis for a date — manager/owner only */
export const getAnalysisForDate = query({
  args: { date: v.string() },
  handler: async (ctx, { date }) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return null
    const caller = await ctx.db.get(userId)
    if (!caller || caller.role === 'worker') return null

    // Fetch all active products
    const products = await ctx.db
      .query('vendingMachineProducts')
      .withIndex('by_active_sort', (q) => q.eq('isActive', true))
      .order('asc')
      .collect()

    // Fetch today's logs
    const todayLogs = await ctx.db
      .query('vendingMachineLogs')
      .withIndex('by_date', (q) => q.eq('date', date))
      .collect()

    const todayLogMap = new Map(todayLogs.map((l) => [l.productId, l]))

    // Build analysis per product
    let totalExpectedCups = 0
    let totalActualCups = 0
    let totalLossCups = 0
    let hasAnyExpected = false

    const items = await Promise.all(
      products.map(async (product) => {
        const todayLog = todayLogMap.get(product._id)

        // Find the most recent log BEFORE today for this product
        const recentLogs = await ctx.db
          .query('vendingMachineLogs')
          .withIndex('by_product_date', (q) => q.eq('productId', product._id))
          .order('desc')
          .take(2)

        // If top result is today's log, use the second; otherwise use the first
        let prevLog = recentLogs[0]
        if (prevLog && prevLog.date === date) {
          prevLog = recentLogs[1]
        }

        const physicalCupCount = todayLog?.physicalCupCount ?? 0
        const closingGrams = todayLog?.closingGrams ?? null
        const prevClosingGrams = prevLog?.closingGrams ?? null

        let gramsConsumed: number | null = null
        let expectedCups: number | null = null
        let lossCups: number | null = null

        if (prevClosingGrams !== null && closingGrams !== null) {
          gramsConsumed = prevClosingGrams - closingGrams
          expectedCups = Math.round((gramsConsumed * product.cupsPerPacket) / product.gramsPerPacket)
          lossCups = expectedCups - physicalCupCount

          totalExpectedCups += expectedCups
          totalActualCups += physicalCupCount
          totalLossCups += lossCups
          hasAnyExpected = true
        } else {
          totalActualCups += physicalCupCount
        }

        return {
          productId: product._id,
          productName: product.name,
          cupsPerPacket: product.cupsPerPacket,
          gramsPerPacket: product.gramsPerPacket,
          physicalCupCount,
          closingGrams,
          prevClosingGrams,
          gramsConsumed,
          expectedCups,
          actualCups: physicalCupCount,
          lossCups,
        }
      })
    )

    return {
      date,
      items,
      totals: {
        totalExpectedCups: hasAnyExpected ? totalExpectedCups : null,
        totalActualCups,
        totalLossCups: hasAnyExpected ? totalLossCups : null,
      },
    }
  },
})
