import { query, mutation } from './_generated/server'
import { v } from 'convex/values'
import { getAuthUserId } from '@convex-dev/auth/server'

/** All active products sorted by sortOrder — used in stock taking flow */
export const listActive = query({
  args: {},
  handler: async (ctx) => {
    const products = await ctx.db
      .query('products')
      .withIndex('by_active_sort', (q) => q.eq('isActive', true))
      .order('asc')
      .collect()

    // Attach serving URLs for stored images
    return await Promise.all(
      products.map(async (p) => ({
        ...p,
        imageServingUrl: p.imageStorageId
          ? await ctx.storage.getUrl(p.imageStorageId)
          : null,
      }))
    )
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

    const products = await ctx.db
      .query('products')
      .withIndex('by_sort')
      .order('asc')
      .collect()

    return await Promise.all(
      products.map(async (p) => ({
        ...p,
        imageServingUrl: p.imageStorageId
          ? await ctx.storage.getUrl(p.imageStorageId)
          : null,
      }))
    )
  },
})

/** List distinct categories */
export const listCategories = query({
  args: {},
  handler: async (ctx) => {
    const products = await ctx.db.query('products').collect()
    const cats = [...new Set(products.map((p) => p.category))].sort()
    return cats
  },
})

/** Generate a signed URL for uploading a product image */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error('Not authenticated')
    const caller = await ctx.db.get(userId)
    if (!caller || caller.role !== 'owner') throw new Error('Unauthorized')
    return await ctx.storage.generateUploadUrl()
  },
})

/** Create a new product — owner only */
export const create = mutation({
  args: {
    name: v.string(),
    sku: v.string(),
    category: v.string(),
    imageUrl: v.optional(v.string()),
    imageStorageId: v.optional(v.id('_storage')),
    unitCost: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error('Not authenticated')
    const caller = await ctx.db.get(userId)
    if (!caller || caller.role !== 'owner') throw new Error('Unauthorized')

    // Assign sortOrder = max existing + 10 (leaves room for future reordering)
    const allProducts = await ctx.db.query('products').order('asc').collect()
    const maxOrder = allProducts.length > 0
      ? Math.max(...allProducts.map((p) => p.sortOrder))
      : 0

    return await ctx.db.insert('products', {
      ...args,
      isActive: true,
      sortOrder: maxOrder + 10,
    })
  },
})

/** Update a product — owner only */
export const update = mutation({
  args: {
    productId: v.id('products'),
    name: v.optional(v.string()),
    sku: v.optional(v.string()),
    category: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    imageStorageId: v.optional(v.id('_storage')),
    unitCost: v.optional(v.number()),
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
  args: { productId: v.id('products') },
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

/** Update sort order for multiple products at once */
export const updateSortOrders = mutation({
  args: {
    updates: v.array(v.object({ productId: v.id('products'), sortOrder: v.number() })),
  },
  handler: async (ctx, { updates }) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error('Not authenticated')
    const caller = await ctx.db.get(userId)
    if (!caller || caller.role !== 'owner') throw new Error('Unauthorized')

    await Promise.all(
      updates.map(({ productId, sortOrder }) =>
        ctx.db.patch(productId, { sortOrder })
      )
    )
  },
})
