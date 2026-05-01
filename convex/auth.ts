import { convexAuth } from '@convex-dev/auth/server'
import { Password } from '@convex-dev/auth/providers/Password'

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Password],
  callbacks: {
    /**
     * Called when a user authenticates for the first time (or links a new provider).
     *
     * Strategy:
     * - If a user record already exists for this session, return it.
     * - If the owner pre-created a user record for this email, link to it.
     * - The very first user to sign up becomes the Owner (auto-activated).
     * - All other self-registrations become inactive Workers (owner must activate).
     */
    async createOrUpdateUser(ctx, args) {
      if (args.existingUserId) {
        return args.existingUserId
      }

      const email = (args.profile.email as string | undefined) ?? ''
      const name = (args.profile.name as string | undefined) ?? email.split('@')[0]

      // Check if owner pre-created this user (invite-based flow).
      // Use collect() + filter to avoid index typing issues with GenericMutationCtx.
      const allUsers = await ctx.db.query('users').collect()
      const preExisting = allUsers.find((u) => (u as { email: string }).email === email)

      if (preExisting) {
        return preExisting._id
      }

      const isFirst = allUsers.length === 0

      return await ctx.db.insert('users', {
        email,
        name,
        role: isFirst ? 'owner' : 'worker',
        isActive: isFirst,
      } as Parameters<typeof ctx.db.insert<'users'>>[1])
    },
  },
})
