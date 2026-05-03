import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Package, ChevronLeft, ChevronRight, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Product {
  _id: string
  name: string
  sku: string
  category: string
  imageServingUrl?: string | null
  imageUrl?: string
}

interface StockTakingCardProps {
  product: Product
  existingCount: number | undefined
  onSave: (quantity: number) => Promise<void>
  onPrevious: () => void
  canGoPrevious: boolean
  isLastProduct: boolean
  currentIndex: number
  totalProducts: number
  countsMap: Map<string, number>
  allProductIds: string[]
  allProducts: Product[]
  onNavigateTo: (index: number) => void
  direction: number // 1 = forward, -1 = backward
}

const cardVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? '100%' : '-100%',
    opacity: 0,
    scale: 0.96,
  }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? '-100%' : '100%',
    opacity: 0,
    scale: 0.96,
  }),
}

const SWIPE_THRESHOLD = 80

export function StockTakingCard({
  product,
  existingCount,
  onSave,
  onPrevious,
  canGoPrevious,
  isLastProduct,
  currentIndex,
  totalProducts,
  countsMap,
  allProductIds,
  allProducts,
  onNavigateTo,
  direction,
}: StockTakingCardProps) {
  const [quantity, setQuantity] = useState<string>(
    existingCount !== undefined ? String(existingCount) : ''
  )
  const [jumpValue, setJumpValue] = useState<string>('')
  const [isSaving, setIsSaving] = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Reset input when product changes
  useEffect(() => {
    setQuantity(existingCount !== undefined ? String(existingCount) : '')
    setSavedFlash(false)
    // Auto-focus the input (delay slightly to let animation complete)
    const t = setTimeout(() => inputRef.current?.select(), 200)
    return () => clearTimeout(t)
  }, [product._id, existingCount])

  const parsedQty = parseInt(quantity, 10)
  const isValidQty = !isNaN(parsedQty) && parsedQty >= 0

  async function handleSaveAndNext() {
    if (!isValidQty || isSaving) return
    setIsSaving(true)
    try {
      await onSave(parsedQty)
      setSavedFlash(true)
    } finally {
      setIsSaving(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') void handleSaveAndNext()
  }

  function adjust(delta: number) {
    const current = parseInt(quantity, 10)
    const next = isNaN(current) ? 0 : Math.max(0, current + delta)
    setQuantity(String(next))
  }

  const imageUrl = product.imageServingUrl ?? product.imageUrl

  // Progress dots (for ≤20 products) or text
  const showDots = totalProducts <= 20

  return (
    <div
      className="relative h-dvh w-full overflow-hidden"
      style={{
        background: 'radial-gradient(ellipse at 50% 0%, rgba(224,92,58,0.12) 0%, transparent 60%), #0e0e0e',
      }}
    >
      {/* Top progress bar */}
      <div className="absolute top-0 left-0 right-0 z-10">
        <div className="h-0.5 bg-surface-border">
          <motion.div
            className="h-full bg-coral-500"
            initial={false}
            animate={{ width: `${((currentIndex + 1) / totalProducts) * 100}%` }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          />
        </div>

        {/* Progress indicator */}
        <div className="px-4 py-3 flex items-center justify-between">
          <span className="text-xs text-ink-tertiary font-medium">
            {currentIndex + 1} <span className="text-ink-tertiary/50">/</span> {totalProducts}
          </span>

          {showDots ? (
            <div className="flex items-center gap-1 flex-wrap justify-center max-w-[60%]">
              {allProductIds.map((id, i) => {
                const isCounted = countsMap.has(id)
                const isCurrent = i === currentIndex
                return (
                  <button
                    key={id}
                    onClick={() => onNavigateTo(i)}
                    aria-label={`Go to product ${i + 1}`}
                    className={cn(
                      'rounded-full transition-all duration-200',
                      isCurrent
                        ? 'w-4 h-2 bg-coral-500'
                        : isCounted
                        ? 'w-2 h-2 bg-emerald/60'
                        : 'w-2 h-2 bg-surface-muted'
                    )}
                  />
                )
              })}
            </div>
          ) : (
            <div className="text-xs text-ink-tertiary">
              <span className="text-emerald">{countsMap.size}</span> counted
            </div>
          )}

          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-emerald">
              {Math.round((countsMap.size / totalProducts) * 100)}%
            </span>

            {/* SKU jump input */}
            <form
              onSubmit={(e) => {
                e.preventDefault()
                const q = jumpValue.trim().toUpperCase()
                if (!q) return
                const idx = allProducts.findIndex(
                  (p) => p.sku.toUpperCase() === q || p.sku.toUpperCase().includes(q)
                )
                if (idx >= 0) { onNavigateTo(idx); setJumpValue('') }
              }}
              className="flex items-center gap-1.5"
            >
              <input
                type="text"
                value={jumpValue}
                onChange={(e) => setJumpValue(e.target.value)}
                placeholder="SKU"
                className="w-20 text-xs bg-surface-bg border border-surface-border rounded-lg px-2 py-1 text-ink-primary focus:outline-none focus:border-coral-500/60 uppercase placeholder:normal-case"
                aria-label="Jump to SKU"
              />
              <button
                type="submit"
                className="px-2 py-1 rounded-lg bg-surface-elevated border border-surface-border text-xs text-ink-secondary hover:text-ink-primary"
              >
                Go
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Card — animated */}
      <AnimatePresence initial={false} custom={direction} mode="wait">
        <motion.div
          key={product._id}
          custom={direction}
          variants={cardVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{
            x: { type: 'spring', stiffness: 320, damping: 32 },
            opacity: { duration: 0.15 },
            scale: { duration: 0.2 },
          }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.15}
          onDragEnd={(_, info) => {
            if (info.offset.x > SWIPE_THRESHOLD && canGoPrevious) {
              onPrevious()
            } else if (info.offset.x < -SWIPE_THRESHOLD && isValidQty) {
              void handleSaveAndNext()
            }
          }}
          className="absolute inset-0 flex flex-col items-center justify-center px-5 pt-20 pb-28 select-none"
        >
          {/* Product card */}
          <div
            className="w-full max-w-sm rounded-2xl border border-surface-border overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, #1e1e1e 0%, #1a1a1a 100%)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(224,92,58,0.05)',
            }}
          >
            {/* Product image */}
            <div className="relative bg-surface-raised" style={{ height: '45vw', maxHeight: '220px' }}>
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                  <Package size={40} className="text-surface-muted" />
                  <span className="text-xs text-ink-tertiary">No image</span>
                </div>
              )}
              {/* Category badge */}
              <div className="absolute top-3 left-3">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-black/50 backdrop-blur-sm text-ink-secondary border border-surface-border/50">
                  {product.category}
                </span>
              </div>
              {/* Counted check */}
              {existingCount !== undefined && (
                <div className="absolute top-3 right-3">
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-bg border border-emerald/30 text-emerald">
                    <Check size={10} />
                    Counted
                  </span>
                </div>
              )}
            </div>

            {/* Product info + input */}
            <div className="px-5 pt-4 pb-5">
              <h2
                className="font-display text-2xl text-ink-primary mb-4 leading-tight"
                style={{ fontStyle: 'italic' }}
              >
                {product.name}
              </h2>

              {/* Stepper */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => adjust(-1)}
                  disabled={parseInt(quantity, 10) <= 0}
                  className="w-11 h-11 rounded-xl bg-surface-elevated border border-surface-border text-ink-secondary hover:text-ink-primary hover:border-coral-500/50 transition-all disabled:opacity-30 flex items-center justify-center shrink-0"
                  aria-label="Decrease"
                >
                  <span className="text-xl font-light">−</span>
                </button>

                <div className="flex-1 relative">
                  <input
                    ref={inputRef}
                    type="number"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    min="0"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    onFocus={(e) => e.target.select()}
                    onKeyDown={handleKeyDown}
                    placeholder="0"
                    className={cn(
                      'w-full text-center text-3xl font-bold bg-surface-bg',
                      'border-2 rounded-xl py-2.5 transition-colors',
                      'focus:outline-none placeholder:text-ink-tertiary/40',
                      savedFlash
                        ? 'border-emerald text-emerald'
                        : isValidQty
                        ? 'border-coral-500/60 text-ink-primary focus:border-coral-500'
                        : 'border-surface-border text-ink-primary focus:border-coral-500'
                    )}
                    aria-label="Stock count"
                  />
                </div>

                <button
                  onClick={() => adjust(1)}
                  className="w-11 h-11 rounded-xl bg-surface-elevated border border-surface-border text-ink-secondary hover:text-ink-primary hover:border-coral-500/50 transition-all flex items-center justify-center shrink-0"
                  aria-label="Increase"
                >
                  <span className="text-xl font-light">+</span>
                </button>
              </div>

              {/* Units label */}
              <p className="text-center text-xs text-ink-tertiary mt-2">
                Enter quantity in stock
              </p>
            </div>
          </div>

          {/* Swipe hint */}
          <p className="mt-4 text-xs text-ink-tertiary/50 select-none">
            Swipe left to save & next · Swipe right to go back
          </p>
        </motion.div>
      </AnimatePresence>

      {/* Bottom navigation */}
      <div
        className="absolute bottom-0 left-0 right-0 px-5 py-4 flex items-center gap-3"
        style={{
          background: 'linear-gradient(to top, #0e0e0e 60%, transparent)',
          paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))',
        }}
      >
        {/* Previous */}
        <motion.button
          onClick={onPrevious}
          disabled={!canGoPrevious}
          className="flex items-center gap-2 px-4 py-3 rounded-xl bg-surface-elevated border border-surface-border text-ink-secondary hover:text-ink-primary disabled:opacity-30 disabled:cursor-not-allowed transition-all text-sm font-medium shrink-0"
          whileTap={{ scale: 0.97 }}
          aria-label="Previous product"
        >
          <ChevronLeft size={17} />
          Prev
        </motion.button>

        {/* Save & Next */}
        <motion.button
          onClick={() => void handleSaveAndNext()}
          disabled={!isValidQty || isSaving}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold',
            'transition-all disabled:opacity-40 disabled:cursor-not-allowed',
            isValidQty
              ? 'bg-coral-500 hover:bg-coral-600 text-white shadow-glow-coral'
              : 'bg-surface-elevated border border-surface-border text-ink-tertiary'
          )}
          whileTap={{ scale: 0.98 }}
        >
          {isSaving ? (
            <span className="animate-pulse">Saving…</span>
          ) : isLastProduct ? (
            <>Review & Submit <ChevronRight size={17} /></>
          ) : (
            <>Save &amp; Next <ChevronRight size={17} /></>
          )}
        </motion.button>
      </div>
    </div>
  )
}
