import { httpRouter } from 'convex/server'
import { auth } from './auth'

const http = httpRouter()

// Mount Convex Auth's HTTP routes (needed for OAuth callbacks, etc.)
auth.addHttpRoutes(http)

export default http
