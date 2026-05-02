import { useState } from 'react'
import { Check, AlertCircle, Edit2, Send } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ConfirmModal } from '@/components/ui/modal'

interface Product {
  _id: string
  name: string
  category: string
  imageServingUrl?: string | null
}

interface Count {
  productId: string
  countedQuantity: number
}

interface SessionReviewProps {
  products: Product[]
  counts: Count[]
  onEditProduct: (index: number) => void
  onSubmit: () => Promise<void>
  isSubmitting: boolean
  date: string
  /** If provided, edit buttons call this instead of navigating to card mode (for submitted sessions) */
  onAdminEdit?: (productId: string, productName: string, currentCount: number) => void
  /** When true, the submit footer is hidden (session already submitted) */
  isSubmitted?: boolean
}

export function SessionReview({
  products,
  counts,
  onEditProduct,
  onSubmit,
  isSubmitting,
  date,
  onAdminEdit,
  isSubmitted,
}: SessionReviewProps) {
  const [showConfirm, setShowConfirm] = useState(false)

  const countsMap = new Map(counts.map((c) => [c.productId, c.countedQuantity]))
  const uncounted = products.filter((p) => !countsMap.has(p._id))
  const canSubmit = uncounted.length === 0

  // Group by category
  const byCategory = products.reduce<Record<string, Product[]>>((acc, p) => {
    if (!acc[p.category]) acc[p.category] = []
    acc[p.category].push(p)
    return acc
  }, {})

  return (
    <div className="flex flex-col h-dvh bg-surface-bg">
      {/* Header */}
      <div className="px-5 py-5 border-b border-surface-border bg-surface-raised shrink-0">
        <h1 className="font-display italic text-2xl text-ink-primary mb-1">Review Counts</h1>
        <p className="text-sm text-ink-secondary">
          {date} · {products.length - uncounted.length} of {products.length} products counted
        </p>
      </div>

      {/* Warning banner */}
      {uncounted.length > 0 && (
        <div className="mx-4 mt-4 flex items-start gap-3 p-3 rounded-xl bg-amber-bg border border-amber/30 shrink-0">
          <AlertCircle size={16} className="text-amber mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber">
              {uncounted.length} product{uncounted.length > 1 ? 's' : ''} not yet counted
            </p>
            <p className="text-xs text-amber/70 mt-0.5">
              {uncounted.slice(0, 3).map((p) => p.name).join(', ')}
              {uncounted.length > 3 && ` +${uncounted.length - 3} more`}
            </p>
          </div>
        </div>
      )}

      {/* Product list */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {Object.entries(byCategory).map(([category, catProducts]) => (
          <div key={category}>
            <h3 className="text-xs font-semibold text-ink-tertiary uppercase tracking-widest mb-2 px-1">
              {category}
            </h3>
            <div className="space-y-1.5">
              {catProducts.map((product) => {
                const count = countsMap.get(product._id)
                const isCounted = count !== undefined
                const productIndex = products.findIndex((p) => p._id === product._id)

                return (
                  <div
                    key={product._id}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 rounded-xl border',
                      isCounted
                        ? 'bg-surface-card border-surface-border'
                        : 'bg-amber-bg/30 border-amber/20'
                    )}
                  >
                    {/* Status icon */}
                    <div
                      className={cn(
                        'w-6 h-6 rounded-full flex items-center justify-center shrink-0',
                        isCounted ? 'bg-emerald-bg text-emerald' : 'bg-amber-bg text-amber'
                      )}
                    >
                      {isCounted ? <Check size={13} /> : <span className="text-xs font-bold">!</span>}
                    </div>

                    {/* Name */}
                    <span className={cn('flex-1 text-sm', isCounted ? 'text-ink-primary' : 'text-amber')}>
                      {product.name}
                    </span>

                    {/* Count */}
                    {isCounted ? (
                      <span className="text-sm font-semibold text-ink-primary tabular-nums">
                        {count}
                      </span>
                    ) : (
                      <span className="text-xs text-amber">—</span>
                    )}

                    {/* Edit button */}
                    <button
                      onClick={() => {
                        if (onAdminEdit) {
                          onAdminEdit(product._id, product.name, count ?? 0)
                        } else {
                          onEditProduct(productIndex)
                        }
                      }}
                      className="p-1.5 rounded-lg text-ink-tertiary hover:text-coral-400 hover:bg-coral-500/10 transition-colors"
                      aria-label={`Edit count for ${product.name}`}
                    >
                      <Edit2 size={14} />
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Submit footer — hidden for already-submitted sessions */}
      {!isSubmitted && (
        <div
          className="px-5 py-4 border-t border-surface-border bg-surface-raised shrink-0"
          style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
        >
          {canSubmit ? (
            <Button
              size="lg"
              className="w-full"
              leftIcon={<Send size={16} />}
              onClick={() => setShowConfirm(true)}
            >
              Submit Stock Count
            </Button>
          ) : (
            <div className="text-center text-sm text-ink-tertiary">
              Count all {uncounted.length} remaining products to submit
            </div>
          )}
        </div>
      )}

      <ConfirmModal
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={() => {
          setShowConfirm(false)
          void onSubmit()
        }}
        title="Submit Stock Count"
        message={`Submit the stock count for ${date}? This cannot be undone.`}
        confirmLabel="Submit"
        isLoading={isSubmitting}
      />
    </div>
  )
}
