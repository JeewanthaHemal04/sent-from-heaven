import { query, mutation } from './_generated/server'
import type { MutationCtx } from './_generated/server'
import { v } from 'convex/values'
import { getAuthUserId } from '@convex-dev/auth/server'
import type { Id } from './_generated/dataModel'

// ── Shared validators ─────────────────────────────────────────────────────
const itemsValidator = v.array(
  v.object({
    productId: v.id('products'),
    quantity: v.number(),
    unitCost: v.optional(v.number()),
  })
)

const baseArgs = {
  date: v.string(),
  referenceNumber: v.optional(v.string()),
  notes: v.optional(v.string()),
  items: itemsValidator,
  source: v.union(v.literal('manual'), v.literal('playwright')),
}

// ── Helper ────────────────────────────────────────────────────────────────
async function createMovement(
  ctx: MutationCtx,
  type: 'GRN' | 'TradingGRN' | 'TransferIn' | 'CR' | 'TransferOut',
  args: {
    date: string
    referenceNumber?: string
    supplierName?: string
    notes?: string
    items: Array<{ productId: Id<'products'>; quantity: number; unitCost?: number }>
    source: 'manual' | 'playwright'
  }
) {
  const userId = await getAuthUserId(ctx)
  if (!userId) throw new Error('Not authenticated')

  // Idempotency: skip if same reference number already exists
  if (args.referenceNumber) {
    const existing = await ctx.db
      .query('stockMovements')
      .withIndex('by_reference', (q) => q.eq('referenceNumber', args.referenceNumber))
      .first()
    if (existing) return existing._id
  }

  return await ctx.db.insert('stockMovements', {
    type,
    date: args.date,
    referenceNumber: args.referenceNumber,
    supplierName: args.supplierName,
    notes: args.notes,
    items: args.items,
    source: args.source,
    createdBy: userId,
    createdAt: Date.now(),
  })
}

// ── Mutations (Playwright integration targets) ────────────────────────────

/** Create a GRN from Perera & Sons */
export const createGRN = mutation({
  args: { ...baseArgs, supplierName: v.optional(v.string()) },
  handler: (ctx, args) =>
    createMovement(ctx, 'GRN', {
      ...args,
      supplierName: args.supplierName ?? 'Perera & Sons',
    }),
})

/** Create a Trading GRN from a third-party supplier (pay within 7 days) */
export const createTradingGRN = mutation({
  args: { ...baseArgs, supplierName: v.optional(v.string()) },
  handler: (ctx, args) => createMovement(ctx, 'TradingGRN', args),
})

/** Create a Transfer In from another branch */
export const createTransferIn = mutation({
  args: { ...baseArgs, supplierName: v.optional(v.string()) },
  handler: (ctx, args) => createMovement(ctx, 'TransferIn', args),
})

/** Create a CR — return items to Perera & Sons */
export const createCR = mutation({
  args: { ...baseArgs, supplierName: v.optional(v.string()) },
  handler: (ctx, args) =>
    createMovement(ctx, 'CR', {
      ...args,
      supplierName: args.supplierName ?? 'Perera & Sons',
    }),
})

/** Create a Transfer Out to another branch */
export const createTransferOut = mutation({
  args: { ...baseArgs, supplierName: v.optional(v.string()) },
  handler: (ctx, args) => createMovement(ctx, 'TransferOut', args),
})

/** Delete a movement — owner only */
export const deleteMovement = mutation({
  args: { movementId: v.id('stockMovements') },
  handler: async (ctx, { movementId }) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error('Not authenticated')
    const caller = await ctx.db.get(userId)
    if (!caller || caller.role !== 'owner') throw new Error('Unauthorized')
    await ctx.db.delete(movementId)
  },
})

// ── Queries ───────────────────────────────────────────────────────────────

/** All movements for a specific date */
export const listByDate = query({
  args: { date: v.string() },
  handler: async (ctx, { date }) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return []
    const caller = await ctx.db.get(userId)
    if (!caller || caller.role === 'worker') return []

    const movements = await ctx.db
      .query('stockMovements')
      .withIndex('by_date', (q) => q.eq('date', date))
      .order('desc')
      .collect()

    return await Promise.all(
      movements.map(async (m) => {
        const creator = await ctx.db.get(m.createdBy)
        const items = await Promise.all(
          m.items.map(async (item) => {
            const product = await ctx.db.get(item.productId)
            return { ...item, productName: product?.name ?? 'Unknown' }
          })
        )
        return { ...m, items, creatorName: creator?.name ?? 'Unknown' }
      })
    )
  },
})

/** Movements in a date range */
export const listByDateRange = query({
  args: { startDate: v.string(), endDate: v.string() },
  handler: async (ctx, { startDate, endDate }) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return []
    const caller = await ctx.db.get(userId)
    if (!caller || caller.role === 'worker') return []

    const all = await ctx.db.query('stockMovements').order('desc').collect()
    const filtered = all.filter((m) => m.date >= startDate && m.date <= endDate)

    return await Promise.all(
      filtered.map(async (m) => {
        const creator = await ctx.db.get(m.createdBy)
        return { ...m, creatorName: creator?.name ?? 'Unknown' }
      })
    )
  },
})
