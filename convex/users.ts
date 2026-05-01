import { query, mutation } from './_generated/server'
import { v } from 'convex/values'
import { getAuthUserId } from '@convex-dev/auth/server'

/** Get the currently authenticated user (or null) */
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return null
    return await ctx.db.get(userId)
  },
})

/** List all users — owner only */
export const listUsers = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return []
    const caller = await ctx.db.get(userId)
    if (!caller || caller.role !== 'owner') return []
    return await ctx.db.query('users').order('asc').collect()
  },
})

/**
 * Pre-create a user record so they get the correct role when they sign up.
 * Owner only.
 */
export const preCreateUser = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    role: v.union(v.literal('owner'), v.literal('manager'), v.literal('worker')),
  },
  handler: async (ctx, args) => {
    const callerId = await getAuthUserId(ctx)
    if (!callerId) throw new Error('Not authenticated')
    const caller = await ctx.db.get(callerId)
    if (!caller || caller.role !== 'owner') throw new Error('Unauthorized')

    const existing = await ctx.db
      .query('users')
      .withIndex('by_email', (q) => q.eq('email', args.email))
      .first()
    if (existing) throw new Error('A user with this email already exists')

    return await ctx.db.insert('users', { ...args, isActive: true })
  },
})

/** Update a user's name, role, or active status — owner only */
export const updateUser = mutation({
  args: {
    userId: v.id('users'),
    name: v.optional(v.string()),
    role: v.optional(
      v.union(v.literal('owner'), v.literal('manager'), v.literal('worker'))
    ),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, { userId, name, role, isActive }) => {
    const callerId = await getAuthUserId(ctx)
    if (!callerId) throw new Error('Not authenticated')
    const caller = await ctx.db.get(callerId)
    if (!caller || caller.role !== 'owner') throw new Error('Unauthorized')

    const patch: Record<string, unknown> = {}
    if (name !== undefined) patch.name = name
    if (role !== undefined) patch.role = role
    if (isActive !== undefined) patch.isActive = isActive

    await ctx.db.patch(userId, patch)
  },
})

/** Delete a user — owner only, cannot delete self */
export const deleteUser = mutation({
  args: { userId: v.id('users') },
  handler: async (ctx, { userId }) => {
    const callerId = await getAuthUserId(ctx)
    if (!callerId) throw new Error('Not authenticated')
    const caller = await ctx.db.get(callerId)
    if (!caller || caller.role !== 'owner') throw new Error('Unauthorized')
    if (callerId === userId) throw new Error('Cannot delete your own account')
    await ctx.db.delete(userId)
  },
})
