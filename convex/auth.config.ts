type Env = {
  CONVEX_SITE_URL?: string
  VITE_CONVEX_SITE_URL?: string
}

const env = (globalThis as typeof globalThis & { process?: { env?: Env } }).process?.env ?? {}
const domain = env.CONVEX_SITE_URL ?? env.VITE_CONVEX_SITE_URL

if (!domain) {
  throw new Error('Missing CONVEX_SITE_URL or VITE_CONVEX_SITE_URL')
}

export default {
  providers: [
    {
      domain,
      applicationID: 'convex',
    },
  ],
}