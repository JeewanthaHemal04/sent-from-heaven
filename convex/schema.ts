import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'
import { authTables } from '@convex-dev/auth/server'

export default defineSchema({
  // ── Convex Auth built-in tables ──────────────────────────────────────────
  ...authTables,

  // ── Users (linked to Convex Auth accounts) ───────────────────────────────
  users: defineTable({
    name: v.string(),
    email: v.string(),
    role: v.union(v.literal('owner'), v.literal('manager'), v.literal('worker')),
    isActive: v.boolean(),
  })
    .index('by_email', ['email']),

  // ── Products ─────────────────────────────────────────────────────────────
  products: defineTable({
    name: v.string(),
    sku: v.string(),
    category: v.string(),
    imageUrl: v.optional(v.string()),
    imageStorageId: v.optional(v.id('_storage')),
    isActive: v.boolean(),
    sortOrder: v.number(),
    unitCost: v.optional(v.number()), // For variance financial impact calc
  })
    .index('by_sku', ['sku'])
    .index('by_category', ['category'])
    .index('by_sort', ['sortOrder'])
    .index('by_active_sort', ['isActive', 'sortOrder']),

  // ── Stock Sessions (one per day) ─────────────────────────────────────────
  stockSessions: defineTable({
    date: v.string(), // YYYY-MM-DD (Sri Lanka timezone)
    status: v.union(v.literal('draft'), v.literal('submitted')),
    createdBy: v.id('users'),
    submittedAt: v.optional(v.number()),
    notes: v.optional(v.string()),
  })
    .index('by_date', ['date'])
    .index('by_status', ['status'])
    .index('by_status_date', ['status', 'date']),

  // ── Stock Counts (one per product per session) ────────────────────────────
  stockCounts: defineTable({
    sessionId: v.id('stockSessions'),
    productId: v.id('products'),
    countedQuantity: v.number(),
    countedAt: v.number(),
    countedBy: v.id('users'),
  })
    .index('by_session', ['sessionId'])
    .index('by_session_product', ['sessionId', 'productId']),

  // ── Stock Movements ───────────────────────────────────────────────────────
  // IN types:  GRN (Perera & Sons), TradingGRN (suppliers), TransferIn
  // OUT types: CR (returns to P&S), TransferOut
  stockMovements: defineTable({
    type: v.union(
      v.literal('GRN'),
      v.literal('TradingGRN'),
      v.literal('TransferIn'),
      v.literal('CR'),
      v.literal('TransferOut')
    ),
    date: v.string(), // YYYY-MM-DD
    referenceNumber: v.optional(v.string()),
    supplierName: v.optional(v.string()),
    notes: v.optional(v.string()),
    createdBy: v.id('users'),
    createdAt: v.number(),
    source: v.union(v.literal('manual'), v.literal('playwright')),
    items: v.array(
      v.object({
        productId: v.id('products'),
        quantity: v.number(),
        unitCost: v.optional(v.number()),
      })
    ),
  })
    .index('by_date', ['date'])
    .index('by_type', ['type'])
    .index('by_type_date', ['type', 'date'])
    .index('by_reference', ['referenceNumber']),

  // ── Daily Sales Summary ───────────────────────────────────────────────────
  dailySalesSummary: defineTable({
    date: v.string(), // YYYY-MM-DD
    cashAmount: v.number(),
    cardAmount: v.number(),
    deliveryApps: v.array(
      v.object({
        name: v.string(), // "Uber Eats", "PickMe Food", etc.
        amount: v.number(),
      })
    ),
    specialOrderAmount: v.number(),
    pereraSettlementAmount: v.number(),
    tradingPaymentAmount: v.optional(v.number()),
    notes: v.optional(v.string()),
    createdBy: v.id('users'),
    updatedAt: v.number(),
  })
    .index('by_date', ['date']),

  // ── Vending Machine Products ──────────────────────────────────────────────
  vendingMachineProducts: defineTable({
    name: v.string(),
    cupsPerPacket: v.number(),   // cups yielded by one full packet
    gramsPerPacket: v.number(),  // weight of one full packet in grams
    isActive: v.boolean(),
    sortOrder: v.number(),
  })
    .index('by_active_sort', ['isActive', 'sortOrder'])
    .index('by_sort', ['sortOrder']),

  // ── Vending Machine Daily Logs ────────────────────────────────────────────
  vendingMachineLogs: defineTable({
    date: v.string(),                          // YYYY-MM-DD (Sri Lanka tz)
    productId: v.id('vendingMachineProducts'),
    physicalCupCount: v.number(),              // actual cups dispensed today
    closingGrams: v.number(),                  // total grams remaining (all packets)
    createdBy: v.id('users'),
    updatedAt: v.number(),
    notes: v.optional(v.string()),
  })
    .index('by_date', ['date'])
    .index('by_date_product', ['date', 'productId'])
    .index('by_product_date', ['productId', 'date']),

  // ── Special Orders ────────────────────────────────────────────────────────
  specialOrders: defineTable({
    customerName: v.string(),
    customerPhone: v.optional(v.string()),
    orderDate: v.string(),
    deliveryDate: v.string(),
    items: v.array(
      v.object({
        productId: v.id('products'),
        quantity: v.number(),
        unitPrice: v.number(),
      })
    ),
    totalAmount: v.number(),
    advanceAmount: v.number(),
    balanceAmount: v.number(),
    status: v.union(
      v.literal('pending'),
      v.literal('advance_collected'),
      v.literal('delivered'),
      v.literal('cancelled')
    ),
    advanceCollectedAt: v.optional(v.number()),
    deliveredAt: v.optional(v.number()),
    notes: v.optional(v.string()),
    createdBy: v.id('users'),
  })
    .index('by_delivery_date', ['deliveryDate'])
    .index('by_status', ['status']),
})
