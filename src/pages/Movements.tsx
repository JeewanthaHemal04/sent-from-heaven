import { useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import { Plus, ChevronDown, ChevronUp, Trash2, Play, Loader2, CheckCircle2, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal, ConfirmModal } from '@/components/ui/modal'
import { MovementBadge } from '@/components/ui/badge'
import { FullPageSpinner } from '@/components/ui/spinner'
import { todaySL, formatDate, MOVEMENT_LABELS } from '@/lib/utils'
import type { MovementType } from '@/lib/utils'
import { useIsOwner, useIsManager } from '@/hooks/useCurrentUser'

const ALL_TYPES: MovementType[] = ['GRN', 'TradingGRN', 'TransferIn', 'CR', 'TransferOut']

export function MovementsPage() {
  const isOwner = useIsOwner()
  const isManager = useIsManager()
  const today = todaySL()
  const [filterDate, setFilterDate] = useState(today)
  const [showForm, setShowForm] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [isTriggeringRun, setIsTriggeringRun] = useState(false)

  const movements = useQuery(api.movements.listByDate, { date: filterDate })
  const deleteMovement = useMutation(api.movements.deleteMovement)
  const latestRun = useQuery(api.automationTrigger.getLatestRun, { date: filterDate })
  const triggerRun = useMutation(api.automationTrigger.triggerRun)

  async function handleTriggerRun() {
    setIsTriggeringRun(true)
    try {
      await triggerRun({ date: filterDate })
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to trigger run')
    } finally {
      setIsTriggeringRun(false)
    }
  }

  if (!movements) return <FullPageSpinner />

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display italic text-3xl text-ink-primary mb-1">Movements</h1>
          <p className="text-sm text-ink-secondary">GRN, Trading GRN, CR, Transfers</p>
        </div>
        <Button size="md" leftIcon={<Plus size={15} />} onClick={() => setShowForm(true)}>
          Add
        </Button>
      </div>

      {/* Date filter + automation trigger */}
      <div className="flex items-center gap-3 mb-3">
        <input
          type="date"
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
          className="text-sm bg-surface-elevated border border-surface-border rounded-xl px-4 py-2.5 text-ink-primary focus:outline-none focus:border-coral-500"
        />
        <span className="text-xs text-ink-tertiary">{formatDate(filterDate)}</span>
        {isManager && (
          <button
            onClick={() => void handleTriggerRun()}
            disabled={isTriggeringRun || latestRun?.status === 'pending' || latestRun?.status === 'running'}
            className="ml-auto flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg bg-surface-elevated border border-surface-border text-ink-secondary hover:text-ink-primary hover:border-coral-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isTriggeringRun || latestRun?.status === 'running' ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <Play size={13} />
            )}
            Run Movements
          </button>
        )}
      </div>

      {/* Automation run status banner */}
      {isManager && latestRun && (
        <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg mb-4 ${
          latestRun.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
          latestRun.status === 'failed' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
          'bg-surface-elevated border border-surface-border text-ink-secondary'
        }`}>
          {latestRun.status === 'pending' && <><Loader2 size={12} className="animate-spin shrink-0" /><span>Automation run queued — waiting for local process…</span></>}
          {latestRun.status === 'running' && <><Loader2 size={12} className="animate-spin shrink-0" /><span>Importing movements from POS system…</span></>}
          {latestRun.status === 'completed' && <><CheckCircle2 size={12} className="shrink-0" /><span>Imported {latestRun.importedCount} movement{latestRun.importedCount !== 1 ? 's' : ''} from POS</span></>}
          {latestRun.status === 'failed' && <><XCircle size={12} className="shrink-0" /><span>Import failed: {latestRun.error}</span></>}
        </div>
      )}

      {/* Movements list */}
      {movements.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">📋</p>
          <p className="text-sm text-ink-tertiary">No movements recorded for this date</p>
        </div>
      ) : (
        <div className="space-y-2">
          {movements.map((m) => {
            const isExpanded = expandedId === m._id.toString()
            return (
              <div
                key={m._id.toString()}
                className="rounded-xl border border-surface-border bg-surface-card overflow-hidden"
              >
                <button
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-surface-elevated/50 transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : m._id.toString())}
                >
                  <MovementBadge type={m.type} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ink-primary">
                      {m.referenceNumber ?? MOVEMENT_LABELS[m.type]}
                      {m.supplierName && (
                        <span className="text-ink-tertiary font-normal"> · {m.supplierName}</span>
                      )}
                    </p>
                    <p className="text-xs text-ink-tertiary">
                      {m.items.length} item{m.items.length !== 1 ? 's' : ''} · by {m.creatorName}
                      {m.source === 'playwright' && ' · auto-imported'}
                    </p>
                  </div>
                  {isExpanded ? (
                    <ChevronUp size={15} className="text-ink-tertiary shrink-0" />
                  ) : (
                    <ChevronDown size={15} className="text-ink-tertiary shrink-0" />
                  )}
                </button>

                {isExpanded && (
                  <div className="border-t border-surface-border px-4 py-3">
                    <table className="w-full text-xs">
                      <thead>
                        <tr>
                          <th className="text-left text-ink-tertiary font-medium py-1 pr-4">Product</th>
                          <th className="text-right text-ink-tertiary font-medium py-1">Qty</th>
                          <th className="text-right text-ink-tertiary font-medium py-1 pl-4">Unit Cost</th>
                        </tr>
                      </thead>
                      <tbody>
                        {m.items.map((item, i) => (
                          <tr key={i} className="border-t border-surface-border/50">
                            <td className="py-1.5 pr-4 text-ink-secondary">{item.productName}</td>
                            <td className="py-1.5 text-right text-ink-primary font-medium">{item.quantity}</td>
                            <td className="py-1.5 text-right pl-4 text-ink-tertiary">
                              {item.unitCost != null ? `LKR ${item.unitCost}` : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {m.notes && (
                      <p className="text-xs text-ink-tertiary mt-2 pt-2 border-t border-surface-border/50">
                        {m.notes}
                      </p>
                    )}
                    {isOwner && (
                      <div className="flex justify-end mt-3">
                        <button
                          onClick={() => setDeleteId(m._id.toString())}
                          className="flex items-center gap-1.5 text-xs text-rose hover:text-rose/80 transition-colors"
                        >
                          <Trash2 size={12} />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Add movement form modal */}
      <AddMovementModal
        open={showForm}
        onClose={() => setShowForm(false)}
        defaultDate={filterDate}
      />

      {/* Delete confirm */}
      <ConfirmModal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={async () => {
          if (!deleteId) return
          await deleteMovement({ movementId: deleteId as Id<'stockMovements'> })
          setDeleteId(null)
        }}
        title="Delete Movement"
        message="This will permanently remove this movement record. This cannot be undone."
        confirmLabel="Delete"
        danger
      />
    </div>
  )
}

// ── Add Movement Form ──────────────────────────────────────────────────────

interface AddMovementModalProps {
  open: boolean
  onClose: () => void
  defaultDate: string
}

function AddMovementModal({ open, onClose, defaultDate }: AddMovementModalProps) {
  const products = useQuery(api.products.listActive)
  const [type, setType] = useState<MovementType>('GRN')
  const [date, setDate] = useState(defaultDate)
  const [referenceNumber, setReferenceNumber] = useState('')
  const [supplierName, setSupplierName] = useState('')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState([{ productId: '', quantity: '' }])
  const [isSaving, setIsSaving] = useState(false)

  const createGRN = useMutation(api.movements.createGRN)
  const createTradingGRN = useMutation(api.movements.createTradingGRN)
  const createTransferIn = useMutation(api.movements.createTransferIn)
  const createCR = useMutation(api.movements.createCR)
  const createTransferOut = useMutation(api.movements.createTransferOut)

  const mutationMap = {
    GRN: createGRN,
    TradingGRN: createTradingGRN,
    TransferIn: createTransferIn,
    CR: createCR,
    TransferOut: createTransferOut,
  }

  async function handleSubmit() {
    const validItems = items.filter((i) => i.productId && i.quantity)
    if (validItems.length === 0) return alert('Add at least one item')

    setIsSaving(true)
    try {
      await mutationMap[type]({
        date,
        referenceNumber: referenceNumber || undefined,
        supplierName: supplierName || undefined,
        notes: notes || undefined,
        source: 'manual',
        items: validItems.map((i) => ({
          productId: i.productId as Id<'products'>,
          quantity: parseInt(i.quantity, 10),
        })),
      })
      onClose()
      setItems([{ productId: '', quantity: '' }])
      setReferenceNumber('')
      setSupplierName('')
      setNotes('')
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Add Movement" size="md">
      <div className="space-y-4">
        {/* Type selector */}
        <div>
          <label className="text-xs font-medium text-ink-secondary uppercase tracking-wider block mb-2">Type</label>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
            {ALL_TYPES.map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`py-2 px-1 rounded-lg text-[11px] font-medium text-center leading-tight transition-colors ${
                  type === t
                    ? 'bg-coral-500 text-white'
                    : 'bg-surface-elevated border border-surface-border text-ink-secondary hover:text-ink-primary'
                }`}
              >
                {MOVEMENT_LABELS[t]}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-ink-secondary uppercase tracking-wider block mb-1.5">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full text-sm bg-surface-elevated border border-surface-border rounded-lg px-3 py-2.5 text-ink-primary focus:outline-none focus:border-coral-500"
            />
          </div>
          <Input
            label="Reference No."
            value={referenceNumber}
            onChange={(e) => setReferenceNumber(e.target.value)}
            placeholder="e.g. GRN-001"
          />
        </div>

        <Input
          label="Supplier / Source (optional)"
          value={supplierName}
          onChange={(e) => setSupplierName(e.target.value)}
          placeholder={type === 'GRN' ? 'Perera & Sons' : type === 'CR' ? 'Perera & Sons' : ''}
        />

        {/* Items */}
        <div>
          <label className="text-xs font-medium text-ink-secondary uppercase tracking-wider block mb-2">Items</label>
          <div className="space-y-2">
            {items.map((item, idx) => (
              <div key={idx} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <select
                  value={item.productId}
                  onChange={(e) => {
                    const next = [...items]
                    next[idx] = { ...next[idx], productId: e.target.value }
                    setItems(next)
                  }}
                  className="flex-1 bg-surface-bg border border-surface-border rounded-lg px-3 py-2.5 text-sm text-ink-primary focus:outline-none focus:border-coral-500"
                >
                  <option value="">Select product…</option>
                  {products?.map((p) => (
                    <option key={p._id.toString()} value={p._id.toString()}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    inputMode="numeric"
                    value={item.quantity}
                    onChange={(e) => {
                      const next = [...items]
                      next[idx] = { ...next[idx], quantity: e.target.value }
                      setItems(next)
                    }}
                    placeholder="Qty"
                    className="flex-1 sm:w-20 sm:flex-none bg-surface-bg border border-surface-border rounded-lg px-3 py-2.5 text-sm text-ink-primary focus:outline-none focus:border-coral-500"
                  />
                  {items.length > 1 && (
                    <button
                      onClick={() => setItems(items.filter((_, i) => i !== idx))}
                      className="p-2 text-ink-tertiary hover:text-rose transition-colors shrink-0"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            ))}
            <button
              onClick={() => setItems([...items, { productId: '', quantity: '' }])}
              className="flex items-center gap-1.5 text-xs text-coral-400 hover:text-coral-300 transition-colors mt-1"
            >
              <Plus size={13} />
              Add item
            </button>
          </div>
        </div>

        <Input
          label="Notes (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any additional notes…"
        />

        <div className="flex gap-3 pt-2">
          <Button variant="ghost" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button isLoading={isSaving} onClick={() => void handleSubmit()} className="flex-1">
            Save Movement
          </Button>
        </div>
      </div>
    </Modal>
  )
}

