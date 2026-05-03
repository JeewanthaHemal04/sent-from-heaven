import { query, mutation } from './_generated/server'
import type { MutationCtx } from './_generated/server'
import { v } from 'convex/values'
import { getAuthUserId } from '@convex-dev/auth/server'
import type { Id } from './_generated/dataModel'

// ── Document type → movement type map ────────────────────────────────────
const DOC_TYPE_MAP: Record<string, 'GRN' | 'TradingGRN' | 'TransferIn' | 'TransferOut' | 'CR'> = {
  FINISHED_GOOD_GRN: 'GRN',
  TRADING_GRN: 'TradingGRN',
  TRANSFER_IN: 'TransferIn',
  TRANSFER_OUT: 'TransferOut',
  CREDIT_RETURN: 'CR',
}

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

/**
 * Bulk-import automation scraped data for a date.
 * - Deletes all existing playwright-sourced movements for that date (override/idempotent)
 * - Upserts products by itemCode (sku); new products get isNotStockTaking=true
 * - Inserts new movements with source='playwright'
 * No user auth required — called by the local automation Node.js process.
 */
export const importMovementsForDate = mutation({
  args: {
    date: v.string(),
    documents: v.array(
      v.object({
        type: v.union(
          v.literal('FINISHED_GOOD_GRN'),
          v.literal('TRADING_GRN'),
          v.literal('TRANSFER_IN'),
          v.literal('TRANSFER_OUT'),
          v.literal('CREDIT_RETURN')
        ),
        id: v.string(),
        total: v.number(),
        date: v.string(),
        items: v.array(
          v.object({
            name: v.string(),
            itemCode: v.string(),
            qty: v.number(),
            unitPrice: v.number(),
          })
        ),
      })
    ),
  },
  handler: async (ctx, { date, documents }) => {
    // Use owner as createdBy (automation has no user session)
    const owner = await ctx.db
      .query('users')
      .filter((q) => q.eq(q.field('role'), 'owner'))
      .first()
    if (!owner) throw new Error('No owner user found in system')

    // 1. Delete all playwright-sourced movements for this date
    const existing = await ctx.db
      .query('stockMovements')
      .withIndex('by_date', (q) => q.eq('date', date))
      .collect()
    await Promise.all(
      existing.filter((m) => m.source === 'playwright').map((m) => ctx.db.delete(m._id))
    )

    // 2. Collect all unique itemCodes across all documents
    const allItems = documents.flatMap((d) => d.items)
    const uniqueCodes = [...new Set(allItems.map((i) => i.itemCode))].filter(Boolean)

    // Compute current max sortOrder once — track locally to avoid re-querying in loop
    const allProducts = await ctx.db.query('products').order('asc').collect()
    let maxOrder = allProducts.length > 0 ? Math.max(...allProducts.map((p) => p.sortOrder)) : 0

    // 3. Resolve or upsert each product by sku (itemCode)
    const itemCodeToProductId: Record<string, Id<'products'>> = {}
    for (const code of uniqueCodes) {
      const product = await ctx.db
        .query('products')
        .withIndex('by_sku', (q) => q.eq('sku', code))
        .first()

      if (product) {
        itemCodeToProductId[code] = product._id
      } else {
        const firstItem = allItems.find((i) => i.itemCode === code)
        const name = firstItem?.name ?? code
        const unitCost = firstItem?.unitPrice || undefined
        maxOrder += 10
        const newId = await ctx.db.insert('products', {
          name,
          sku: code,
          category: 'Uncategorized',
          isActive: true,
          isNotStockTaking: true,
          sortOrder: maxOrder,
          unitCost,
        })
        itemCodeToProductId[code] = newId
      }
    }

    // 4. Insert movements
    for (const doc of documents) {
      const movementType = DOC_TYPE_MAP[doc.type]
      if (!movementType) continue

      const items = doc.items
        .filter((i) => i.itemCode && itemCodeToProductId[i.itemCode])
        .map((i) => ({
          productId: itemCodeToProductId[i.itemCode],
          quantity: i.qty,
          unitCost: i.unitPrice || undefined,
        }))

      if (items.length === 0) continue

      await ctx.db.insert('stockMovements', {
        type: movementType,
        date,
        referenceNumber: doc.id || undefined,
        items,
        source: 'playwright',
        createdBy: owner._id,
        createdAt: Date.now(),
      })
    }

    return { importedCount: documents.length }
  },
})
