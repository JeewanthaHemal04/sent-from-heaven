/**
 * Perera & Sons — Inventory Management System
 *
 * SETUP STEPS (first time):
 *  1. npm install                       ← already done
 *  2. npx convex dev                    ← initialises Convex, generates _generated/ files, creates .env.local
 *  3. npx @convex-dev/auth              ← sets up auth (generates AUTH_SECRET)
 *  4. npm run dev                       ← start the dev server
 *
 * Run `npx convex dev` in a separate terminal while developing.
 */

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ConvexAuthProvider } from '@convex-dev/auth/react'
import { ConvexReactClient } from 'convex/react'
import { RouterProvider } from '@tanstack/react-router'
import { router } from './router'
import './index.css'

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConvexAuthProvider client={convex}>
      <RouterProvider router={router} />
    </ConvexAuthProvider>
  </StrictMode>
)
