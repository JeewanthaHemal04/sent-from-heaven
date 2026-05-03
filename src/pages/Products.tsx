import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import { Plus, Eye, EyeOff, Edit2, Package, ClipboardCheck, ClipboardX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { FullPageSpinner } from '@/components/ui/spinner'
import { useIsOwner } from '@/hooks/useCurrentUser'

type ProductDoc = {
  _id: Id<'products'>
  name: string
  sku: string
  category: string
  imageUrl?: string
  imageServingUrl?: string | null
  isActive: boolean
  sortOrder: number
  unitCost?: number
  isNotStockTaking?: boolean
}

export function ProductsPage() {
  const products = useQuery(api.products.listAll)
  const toggleActive = useMutation(api.products.toggleActive)
  const toggleNotStockTaking = useMutation(api.products.toggleNotStockTaking)
  const updateProduct = useMutation(api.products.update)
  const isOwner = useIsOwner()
  const [editProduct, setEditProduct] = useState<ProductDoc | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  // Inline sort order editing: productId → current edit value
  const [editingSortId, setEditingSortId] = useState<string | null>(null)
  const [sortEditValue, setSortEditValue] = useState('')
  const sortInputRef = useRef<HTMLInputElement>(null)

  function startSortEdit(product: ProductDoc) {
    setEditingSortId(product._id.toString())
    setSortEditValue(String(product.sortOrder))
    setTimeout(() => { sortInputRef.current?.select() }, 0)
  }

  async function commitSortEdit(product: ProductDoc) {
    const val = parseInt(sortEditValue, 10)
    if (!isNaN(val) && val !== product.sortOrder) {
      await updateProduct({ productId: product._id, sortOrder: val }).catch(() => {})
    }
    setEditingSortId(null)
  }

  if (products === undefined) return <FullPageSpinner />

  const grouped = products.reduce<Record<string, ProductDoc[]>>((acc, p) => {
    if (!acc[p.category]) acc[p.category] = []
    acc[p.category].push(p as ProductDoc)
    return acc
  }, {})

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display italic text-3xl text-ink-primary mb-1">Products</h1>
          <p className="text-sm text-ink-secondary">
            {products.filter((p) => p.isActive).length} active · {products.length} total
          </p>
        </div>
        <Button size="md" leftIcon={<Plus size={15} />} onClick={() => setShowAdd(true)}>
          Add Product
        </Button>
      </div>

      {products.length === 0 ? (
        <div className="text-center py-16">
          <Package size={40} className="text-surface-muted mx-auto mb-3" />
          <p className="text-sm text-ink-tertiary">No products yet. Add your first product to get started.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([category, prods]) => (
            <div key={category}>
              <h3 className="text-xs font-semibold text-ink-tertiary uppercase tracking-widest mb-2 px-1">
                {category}
              </h3>
              <div className="space-y-1.5">
                {prods.map((product) => {
                  const isEditingSort = editingSortId === product._id.toString()
                  return (
                  <div
                    key={product._id.toString()}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors ${
                      product.isActive
                        ? 'bg-surface-card border-surface-border'
                        : 'bg-surface-raised/50 border-surface-border/50 opacity-60'
                    }`}
                  >
                    {/* Inline sort order */}
                    {isOwner && (
                      isEditingSort ? (
                        <input
                          ref={sortInputRef}
                          type="number"
                          value={sortEditValue}
                          onChange={(e) => setSortEditValue(e.target.value)}
                          onBlur={() => void commitSortEdit(product)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') void commitSortEdit(product)
                            if (e.key === 'Escape') setEditingSortId(null)
                          }}
                          className="w-12 text-center text-xs font-mono bg-surface-elevated border border-coral-500 rounded-lg px-1 py-1 text-ink-primary focus:outline-none shrink-0"
                        />
                      ) : (
                        <button
                          onClick={() => startSortEdit(product)}
                          className="w-12 text-center text-xs font-mono text-ink-tertiary hover:text-ink-primary bg-surface-elevated hover:bg-surface-border rounded-lg px-1 py-1 transition-colors shrink-0"
                          title="Click to edit sort order"
                        >
                          {product.sortOrder}
                        </button>
                      )
                    )}

                    {/* Image / icon */}
                    <div className="w-10 h-10 rounded-lg bg-surface-elevated flex items-center justify-center shrink-0 overflow-hidden">
                      {product.imageServingUrl ?? product.imageUrl ? (
                        <img
                          src={(product.imageServingUrl ?? product.imageUrl)!}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Package size={16} className="text-surface-muted" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-ink-primary truncate">{product.name}</p>
                      <p className="text-xs text-ink-tertiary">
                        {product.sku}
                        {product.unitCost != null && ` · LKR ${product.unitCost}`}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {/* Stock taking toggle — prominent labeled button */}
                      {isOwner && (
                        <button
                          onClick={() => void toggleNotStockTaking({ productId: product._id })}
                          className={`flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-lg border transition-colors ${
                            product.isNotStockTaking
                              ? 'bg-surface-elevated border-surface-border text-ink-tertiary hover:border-emerald-500/50 hover:text-emerald-400'
                              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-surface-elevated hover:border-surface-border hover:text-ink-tertiary'
                          }`}
                          title={product.isNotStockTaking ? 'Click to include in stock taking' : 'Click to exclude from stock taking'}
                        >
                          {product.isNotStockTaking
                            ? <><ClipboardX size={11} />Stock Count</>
                            : <><ClipboardCheck size={11} />Stock Count</>
                          }
                        </button>
                      )}
                      <button
                        onClick={() => setEditProduct(product)}
                        className="p-1.5 rounded-lg text-ink-tertiary hover:text-ink-primary hover:bg-surface-elevated transition-colors"
                        aria-label="Edit"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => void toggleActive({ productId: product._id })}
                        className="p-1.5 rounded-lg text-ink-tertiary hover:text-ink-primary hover:bg-surface-elevated transition-colors"
                        aria-label={product.isActive ? 'Deactivate' : 'Activate'}
                      >
                        {product.isActive ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <ProductFormModal
        open={showAdd || !!editProduct}
        onClose={() => { setShowAdd(false); setEditProduct(null) }}
        product={editProduct}
      />
    </div>
  )
}

// ── Product Form Modal ────────────────────────────────────────────────────

interface ProductFormModalProps {
  open: boolean
  onClose: () => void
  product: ProductDoc | null
}

function ProductFormModal({ open, onClose, product }: ProductFormModalProps) {
  const createProduct = useMutation(api.products.create)
  const updateProduct = useMutation(api.products.update)

  const [name, setName] = useState(product?.name ?? '')
  const [sku, setSku] = useState(product?.sku ?? '')
  const [category, setCategory] = useState(product?.category ?? '')
  const [imageUrl, setImageUrl] = useState(product?.imageUrl ?? '')
  const [unitCost, setUnitCost] = useState(product?.unitCost != null ? String(product.unitCost) : '')
  const [isSaving, setIsSaving] = useState(false)

  // Sync form with product whenever open or product changes
  useEffect(() => {
    if (open) {
      if (product) {
        setName(product.name)
        setSku(product.sku)
        setCategory(product.category)
        setImageUrl(product.imageUrl ?? '')
        setUnitCost(product.unitCost != null ? String(product.unitCost) : '')
      } else {
        // New product — reset form
        setName('')
        setSku('')
        setCategory('')
        setImageUrl('')
        setUnitCost('')
      }
    }
  }, [open, product])

  // Reset when product changes
  const resetForm = () => {
    setName(product?.name ?? '')
    setSku(product?.sku ?? '')
    setCategory(product?.category ?? '')
    setImageUrl(product?.imageUrl ?? '')
    setUnitCost(product?.unitCost != null ? String(product.unitCost) : '')
  }

  async function handleSubmit() {
    if (!name || !sku || !category) return alert('Name, SKU and category are required')
    setIsSaving(true)
    try {
      if (product) {
        await updateProduct({
          productId: product._id,
          name,
          sku,
          category,
          imageUrl: imageUrl || undefined,
          unitCost: unitCost ? parseFloat(unitCost) : undefined,
        })
      } else {
        await createProduct({
          name,
          sku,
          category,
          imageUrl: imageUrl || undefined,
          unitCost: unitCost ? parseFloat(unitCost) : undefined,
        })
      }
      onClose()
      resetForm()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => { onClose(); resetForm() }}
      title={product ? 'Edit Product' : 'Add Product'}
    >
      <div className="space-y-4">
        <Input label="Product Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Chocolate Éclair" />
        <div className="grid grid-cols-2 gap-3">
          <Input label="SKU" value={sku} onChange={(e) => setSku(e.target.value)} placeholder="e.g. SKU-001" />
          <Input label="Category" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. Short Eat" />
        </div>
        <Input
          label="Image URL (optional)"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          placeholder="https://…"
          hint="Paste a direct image URL"
        />
        <Input
          label="Unit Cost (LKR, optional)"
          type="number"
          min="0"
          step="0.01"
          value={unitCost}
          onChange={(e) => setUnitCost(e.target.value)}
          placeholder="0.00"
          hint="Used to calculate financial impact of variance"
          leftAddon={<span className="text-xs">LKR</span>}
        />
        <div className="flex gap-3 pt-2">
          <Button variant="ghost" onClick={onClose} className="flex-1">Cancel</Button>
          <Button isLoading={isSaving} onClick={() => void handleSubmit()} className="flex-1">
            {product ? 'Save Changes' : 'Add Product'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
