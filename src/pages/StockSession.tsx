import { useState, useCallback, useEffect } from 'react'
import { useParams, useNavigate } from '@tanstack/react-router'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import { StockTakingCard } from '@/components/stock/StockTakingCard'
import { SessionReview } from '@/components/stock/SessionReview'
import { FullPageSpinner } from '@/components/ui/spinner'
import { useCurrentUser, useIsOwner } from '@/hooks/useCurrentUser'

export function StockSessionPage() {
  const { sessionId } = useParams({ from: '/_app/stock-taking/$sessionId' })
  const navigate = useNavigate()
  const user = useCurrentUser()
  const isOwner = useIsOwner()

  const sessionData = useQuery(api.stockSessions.getSessionWithCounts, {
    sessionId: sessionId as Id<'stockSessions'>,
  })

  const upsertCount = useMutation(api.stockCounts.upsertCount)
  const submitSession = useMutation(api.stockSessions.submitSession)
  const adminEditCount = useMutation(api.stockCounts.adminEditCount)

  const [currentIndex, setCurrentIndex] = useState(0)
  const [direction, setDirection] = useState(1)
  const [showReview, setShowReview] = useState(false)
  const [viewInitialized, setViewInitialized] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editTarget, setEditTarget] = useState<{
    productId: string
    productName: string
    currentCount: number
  } | null>(null)
  const [editValue, setEditValue] = useState('')
  const [isSavingEdit, setIsSavingEdit] = useState(false)

  useEffect(() => {
    if (!sessionData || viewInitialized) return
    const countedIds = new Set(sessionData.counts.map((c) => c.productId.toString()))
    const allCounted = sessionData.products.every((p) => countedIds.has(p._id.toString()))

    if (allCounted) {
      // If everything is counted, show review
      setShowReview(true)
    } else {
      // Jump to first uncounted product so user resumes where they left off
      const firstUncounted = sessionData.products.findIndex((p) => !countedIds.has(p._id.toString()))
      if (firstUncounted >= 0) {
        setCurrentIndex(firstUncounted)
        setDirection(1)
      }
    }

    setViewInitialized(true)
  }, [sessionData, viewInitialized])

  const handleSaveAndNext = useCallback(
    async (quantity: number) => {
      if (!sessionData || !user) return
      const product = sessionData.products[currentIndex]
      if (!product) return

      await upsertCount({
        sessionId: sessionId as Id<'stockSessions'>,
        productId: product._id,
        countedQuantity: quantity,
      })

      // Advance
      if (currentIndex < sessionData.products.length - 1) {
        setDirection(1)
        setCurrentIndex((i) => i + 1)
      } else {
        // All products reached — go to review
        setShowReview(true)
      }
    },
    [sessionData, user, currentIndex, sessionId, upsertCount]
  )

  const handlePrevious = useCallback(() => {
    if (currentIndex > 0) {
      setDirection(-1)
      setCurrentIndex((i) => i - 1)
    }
  }, [currentIndex])

  const handleNavigateTo = useCallback(
    (index: number) => {
      setDirection(index > currentIndex ? 1 : -1)
      setCurrentIndex(index)
      setShowReview(false)
    },
    [currentIndex]
  )

  const handleSubmit = useCallback(async () => {
    setIsSubmitting(true)
    try {
      await submitSession({ sessionId: sessionId as Id<'stockSessions'> })
      void navigate({ to: '/stock-taking' })
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to submit session')
    } finally {
      setIsSubmitting(false)
    }
  }, [sessionId, submitSession, navigate])

  if (!sessionData) return <FullPageSpinner />

  const { session, products, counts } = sessionData

  if (products.length === 0) {
    return (
      <div className="flex h-dvh items-center justify-center p-6 text-center">
        <div>
          <p className="text-4xl mb-4">📦</p>
          <h2 className="font-display italic text-xl text-ink-primary mb-2">No products yet</h2>
          <p className="text-sm text-ink-secondary">Add products in the Products page first.</p>
        </div>
      </div>
    )
  }

  if (session.status === 'submitted') {
    // Owners can view and edit counts on submitted sessions
    if (isOwner) {
      return (
        <>
          <SessionReview
            products={products}
            counts={counts.map((c) => ({
              productId: c.productId.toString(),
              countedQuantity: c.countedQuantity,
            }))}
            onEditProduct={() => {}}
            onSubmit={async () => {}}
            isSubmitting={false}
            date={session.date}
            isSubmitted
            onAdminEdit={(productId, productName, currentCount) => {
              setEditTarget({ productId, productName, currentCount })
              setEditValue(String(currentCount))
            }}
          />

          {/* Admin edit modal */}
          {editTarget && (
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
              <div className="w-full max-w-sm bg-surface-raised rounded-2xl border border-surface-border p-5 shadow-xl">
                <h3 className="font-display italic text-lg text-ink-primary mb-1">Edit Count</h3>
                <p className="text-sm text-ink-secondary mb-4">{editTarget.productName}</p>
                <input
                  type="number"
                  min="0"
                  inputMode="numeric"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="w-full text-center text-2xl font-semibold bg-surface-elevated border border-surface-border rounded-xl px-4 py-3 text-ink-primary focus:outline-none focus:border-coral-500 mb-4"
                  autoFocus
                  onFocus={(e) => e.target.select()}
                />
                <div className="flex gap-3">
                  <button
                    onClick={() => setEditTarget(null)}
                    className="flex-1 py-2.5 rounded-xl border border-surface-border text-sm text-ink-secondary hover:text-ink-primary transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={isSavingEdit}
                    onClick={async () => {
                      const qty = parseInt(editValue, 10)
                      if (isNaN(qty) || qty < 0) return
                      setIsSavingEdit(true)
                      try {
                        await adminEditCount({
                          sessionId: sessionId as Id<'stockSessions'>,
                          productId: editTarget.productId as Id<'products'>,
                          countedQuantity: qty,
                        })
                        setEditTarget(null)
                      } catch (e) {
                        alert(e instanceof Error ? e.message : 'Failed to save')
                      } finally {
                        setIsSavingEdit(false)
                      }
                    }}
                    className="flex-1 py-2.5 rounded-xl bg-coral-500 hover:bg-coral-600 text-white text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    {isSavingEdit ? 'Saving…' : 'Save'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )
    }

    return (
      <div className="flex h-dvh items-center justify-center p-6 text-center">
        <div>
          <div className="w-16 h-16 rounded-full bg-emerald-bg flex items-center justify-center mx-auto mb-4">
            <span className="text-emerald text-2xl">✓</span>
          </div>
          <h2 className="font-display italic text-2xl text-ink-primary mb-2">Count Submitted</h2>
          <p className="text-sm text-ink-secondary mb-6">
            Stock count for {session.date} has been submitted.
          </p>
          <button
            onClick={() => void navigate({ to: '/stock-taking' })}
            className="px-5 py-2.5 rounded-xl bg-coral-500 hover:bg-coral-600 text-white text-sm font-medium transition-colors"
          >
            Back to Sessions
          </button>
        </div>
      </div>
    )
  }

  const countsMap = new Map(counts.map((c) => [c.productId.toString(), c.countedQuantity]))
  const allProductIds = products.map((p) => p._id.toString())
  const currentProduct = products[currentIndex]

  if (!currentProduct) return <FullPageSpinner />

  const existingCount = countsMap.has(currentProduct._id.toString())
    ? countsMap.get(currentProduct._id.toString())
    : undefined

  if (showReview) {
    return (
      <SessionReview
        products={products}
        counts={counts.map((c) => ({
          productId: c.productId.toString(),
          countedQuantity: c.countedQuantity,
        }))}
        onEditProduct={handleNavigateTo}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        date={session.date}
      />
    )
  }

  return (
    <StockTakingCard
      product={{ ...currentProduct, _id: currentProduct._id.toString() }}
      existingCount={existingCount}
      onSave={handleSaveAndNext}
      onPrevious={handlePrevious}
      canGoPrevious={currentIndex > 0}
      isLastProduct={currentIndex === products.length - 1}
      currentIndex={currentIndex}
      totalProducts={products.length}
      countsMap={countsMap}
      allProductIds={allProductIds}
      onNavigateTo={handleNavigateTo}
      direction={direction}
    />
  )
}
