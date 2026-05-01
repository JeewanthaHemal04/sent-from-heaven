import { query, mutation } from './_generated/server'
import { v } from 'convex/values'
import { getAuthUserId } from '@convex-dev/auth/server'

/** All active vending machine products sorted by sortOrder */
export const listActive = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query('vendingMachineProducts')
      .withIndex('by_active_sort', (q) => q.eq('isActive', true))
      .order('asc')
      .collect()
  },
})

/** All products (active + inactive) — owner/manager only */
export const listAll = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return []
    const caller = await ctx.db.get(userId)
    if (!caller || caller.role === 'worker') return []

    return await ctx.db
      .query('vendingMachineProducts')
      .withIndex('by_sort')
      .order('asc')
      .collect()
  },
})

/** Create a new vending machine product — owner only */
export const create = mutation({
  args: {
    name: v.string(),
    cupsPerPacket: v.number(),
    gramsPerPacket: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error('Not authenticated')
    const caller = await ctx.db.get(userId)
    if (!caller || caller.role !== 'owner') throw new Error('Unauthorized')

    const all = await ctx.db.query('vendingMachineProducts').order('asc').collect()
    const maxOrder = all.length > 0 ? Math.max(...all.map((p) => p.sortOrder)) : 0

    return await ctx.db.insert('vendingMachineProducts', {
      ...args,
      isActive: true,
      sortOrder: maxOrder + 10,
    })
  },
})

/** Update a vending machine product — owner only */
export const update = mutation({
  args: {
    productId: v.id('vendingMachineProducts'),
    name: v.optional(v.string()),
    cupsPerPacket: v.optional(v.number()),
    gramsPerPacket: v.optional(v.number()),
  },
  handler: async (ctx, { productId, ...rest }) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error('Not authenticated')
    const caller = await ctx.db.get(userId)
    if (!caller || caller.role !== 'owner') throw new Error('Unauthorized')

    const patch: Record<string, unknown> = {}
    for (const [key, val] of Object.entries(rest)) {
      if (val !== undefined) patch[key] = val
    }
    await ctx.db.patch(productId, patch)
  },
})

/** Toggle active/inactive — owner only */
export const toggleActive = mutation({
  args: { productId: v.id('vendingMachineProducts') },
  handler: async (ctx, { productId }) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error('Not authenticated')
    const caller = await ctx.db.get(userId)
    if (!caller || caller.role !== 'owner') throw new Error('Unauthorized')

    const product = await ctx.db.get(productId)
    if (!product) throw new Error('Product not found')
    await ctx.db.patch(productId, { isActive: !product.isActive })
  },
})

/** Seed the 4 default products — owner only, runs once */
export const seedProducts = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error('Not authenticated')
    const caller = await ctx.db.get(userId)
    if (!caller || caller.role !== 'owner') throw new Error('Unauthorized')

    const existing = await ctx.db.query('vendingMachineProducts').first()
    if (existing) throw new Error('Already seeded')

    await Promise.all([
      ctx.db.insert('vendingMachineProducts', { name: 'Nescafe', cupsPerPacket: 55, gramsPerPacket: 500, isActive: true, sortOrder: 10 }),
      ctx.db.insert('vendingMachineProducts', { name: 'Nestea', cupsPerPacket: 55, gramsPerPacket: 500, isActive: true, sortOrder: 20 }),
      ctx.db.insert('vendingMachineProducts', { name: 'Nestea Cardamom', cupsPerPacket: 55, gramsPerPacket: 500, isActive: true, sortOrder: 30 }),
      ctx.db.insert('vendingMachineProducts', { name: 'Milo', cupsPerPacket: 30, gramsPerPacket: 500, isActive: true, sortOrder: 40 }),
    ])
  },
})
