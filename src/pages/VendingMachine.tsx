import { useState, useEffect } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import { Save, CupSoda, TrendingDown, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FullPageSpinner } from '@/components/ui/spinner'
import { todaySL, formatDate } from '@/lib/utils'

type EntryState = Record<string, { physicalCupCount: string; closingGrams: string }>

function SummaryCard({
  label,
  value,
  icon: Icon,
  variant = 'default',
}: {
  label: string
  value: string
  icon: React.ElementType
  variant?: 'default' | 'accent' | 'loss'
}) {
  const iconClass =
    variant === 'accent'
      ? 'bg-coral-500/15 text-coral-400'
      : variant === 'loss'
        ? 'bg-rose/10 text-rose'
        : 'bg-surface-elevated text-ink-secondary'

  return (
    <div
      className="rounded-2xl border border-surface-border p-4 sm:p-5"
      style={{ background: 'linear-gradient(135deg, #1e1e1e 0%, #1a1a1a 100%)' }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2 rounded-lg ${iconClass}`}>
          <Icon size={16} />
        </div>
      </div>
      <p className="text-xl sm:text-2xl font-bold text-ink-primary mb-1 tabular-nums">{value}</p>
      <p className="text-[10px] sm:text-xs font-medium text-ink-tertiary uppercase tracking-wider">{label}</p>
    </div>
  )
}

function fmt(n: number | null, unit = '') {
  if (n === null) return '—'
  return `${n}${unit}`
}

export function VendingMachinePage() {
  const today = todaySL()
  const [date, setDate] = useState(today)
  const [entries, setEntries] = useState<EntryState>({})
  const [isSaving, setIsSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState('')

  const products = useQuery(api.vendingMachineProducts.listActive)
  const logs = useQuery(api.vendingMachineLogs.getLogsForDate, { date })
  const analysis = useQuery(api.vendingMachineLogs.getAnalysisForDate, { date })
  const upsert = useMutation(api.vendingMachineLogs.upsertForDate)

  useEffect(() => {
    if (logs === undefined || products === undefined) return
    if (logs.length > 0) {
      const next: EntryState = {}
      for (const log of logs) {
        next[log.productId] = {
          physicalCupCount: String(log.physicalCupCount),
          closingGrams: String(log.closingGrams),
        }
      }
      setEntries(next)
    } else {
      setEntries({})
    }
  }, [logs, date]) // eslint-disable-line react-hooks/exhaustive-deps

  function parseNum(val: string) {
    const n = parseFloat(val)
    return isNaN(n) ? 0 : n
  }

  function setField(productId: Id<'vendingMachineProducts'>, field: 'physicalCupCount' | 'closingGrams', value: string) {
    setEntries((prev) => ({
      ...prev,
      [productId]: { ...prev[productId], [field]: value },
    }))
  }

  async function handleSave() {
    if (!products) return
    setIsSaving(true)
    try {
      await upsert({
        date,
        entries: products.map((p) => ({
          productId: p._id,
          physicalCupCount: parseNum(entries[p._id]?.physicalCupCount ?? ''),
          closingGrams: parseNum(entries[p._id]?.closingGrams ?? ''),
        })),
      })
      setSavedMsg('Saved!')
      setTimeout(() => setSavedMsg(''), 2500)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setIsSaving(false)
    }
  }

  if (products === undefined) return <FullPageSpinner />

  const totals = analysis?.totals

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-display italic text-3xl text-ink-primary mb-1">Vending Machine</h1>
        <p className="text-sm text-ink-secondary">Log daily cup counts and grams remaining</p>
      </div>

      {/* Date selector */}
      <div className="mb-6">
        <label className="text-xs font-medium text-ink-secondary uppercase tracking-wider block mb-1.5">Date</label>
        <input
          type="date"
          value={date}
          max={today}
          onChange={(e) => setDate(e.target.value)}
          className="text-sm bg-surface-elevated border border-surface-border rounded-xl px-4 py-2.5 text-ink-primary focus:outline-none focus:border-coral-500 w-full"
        />
        <p className="text-xs text-ink-tertiary mt-1">{formatDate(date)}</p>
      </div>

      {/* Log entry */}
      <div
        className="rounded-2xl border border-surface-border overflow-hidden mb-6"
        style={{ background: '#1e1e1e' }}
      >
        <div className="px-5 py-4 border-b border-surface-border">
          <h3 className="text-xs font-semibold text-ink-tertiary uppercase tracking-widest">Daily Entry</h3>
        </div>

        {products.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <CupSoda size={32} className="mx-auto mb-3 text-ink-tertiary" />
            <p className="text-sm text-ink-secondary mb-1">No products configured</p>
            <p className="text-xs text-ink-tertiary">Ask an owner to seed the vending machine products.</p>
          </div>
        ) : (
          <>
            {/* Mobile: card list */}
            <div className="md:hidden divide-y divide-surface-border">
              {products.map((product) => (
                <div key={product._id} className="px-4 py-4">
                  <p className="font-medium text-ink-primary mb-0.5">{product.name}</p>
                  <p className="text-xs text-ink-tertiary mb-3">
                    {product.cupsPerPacket} cups / {product.gramsPerPacket}g packet
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-ink-tertiary block mb-1.5">Cup Count</label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        inputMode="numeric"
                        value={entries[product._id]?.physicalCupCount ?? ''}
                        onChange={(e) => setField(product._id, 'physicalCupCount', e.target.value)}
                        placeholder="0"
                        className="w-full bg-surface-bg border border-surface-border rounded-lg px-3 py-2.5 text-sm text-ink-primary focus:outline-none focus:border-coral-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-ink-tertiary block mb-1.5">Grams Left</label>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          inputMode="numeric"
                          value={entries[product._id]?.closingGrams ?? ''}
                          onChange={(e) => setField(product._id, 'closingGrams', e.target.value)}
                          placeholder="0"
                          className="flex-1 min-w-0 bg-surface-bg border border-surface-border rounded-lg px-3 py-2.5 text-sm text-ink-primary focus:outline-none focus:border-coral-500"
                        />
                        <span className="text-xs text-ink-tertiary shrink-0">g</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop: table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-border">
                    <th className="text-left px-5 py-3 text-xs font-medium text-ink-tertiary uppercase tracking-wider">Product</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-ink-tertiary uppercase tracking-wider">Physical Cup Count</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-ink-tertiary uppercase tracking-wider">Total Grams Remaining</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {products.map((product) => (
                    <tr key={product._id}>
                      <td className="px-5 py-4">
                        <p className="font-medium text-ink-primary">{product.name}</p>
                        <p className="text-xs text-ink-tertiary">{product.cupsPerPacket} cups / {product.gramsPerPacket}g packet</p>
                      </td>
                      <td className="px-4 py-4">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={entries[product._id]?.physicalCupCount ?? ''}
                          onChange={(e) => setField(product._id, 'physicalCupCount', e.target.value)}
                          placeholder="0"
                          className="w-28 bg-surface-bg border border-surface-border rounded-lg px-3 py-2 text-sm text-ink-primary focus:outline-none focus:border-coral-500"
                        />
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={entries[product._id]?.closingGrams ?? ''}
                            onChange={(e) => setField(product._id, 'closingGrams', e.target.value)}
                            placeholder="0"
                            className="w-28 bg-surface-bg border border-surface-border rounded-lg px-3 py-2 text-sm text-ink-primary focus:outline-none focus:border-coral-500"
                          />
                          <span className="text-xs text-ink-tertiary">g</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        <div className="px-4 sm:px-5 py-4 border-t border-surface-border">
          <Button
            size="lg"
            className="w-full sm:w-auto"
            leftIcon={<Save size={16} />}
            isLoading={isSaving}
            onClick={() => void handleSave()}
            disabled={products.length === 0}
          >
            {savedMsg || 'Save Log'}
          </Button>
        </div>
      </div>

      {/* Analysis section */}
      {analysis && analysis.items.length > 0 && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <SummaryCard
              label="Expected Cups"
              value={fmt(totals?.totalExpectedCups ?? null)}
              icon={CupSoda}
              variant="accent"
            />
            <SummaryCard
              label="Actual Cups"
              value={fmt(totals?.totalActualCups ?? null)}
              icon={CheckCircle}
            />
            <SummaryCard
              label="Total Loss"
              value={fmt(totals?.totalLossCups ?? null, ' cups')}
              icon={TrendingDown}
              variant={totals?.totalLossCups !== null && (totals?.totalLossCups ?? 0) > 0 ? 'loss' : 'default'}
            />
          </div>

          {/* Analysis — mobile: cards */}
          <div className="md:hidden space-y-3 mb-6">
            <h3 className="text-xs font-semibold text-ink-tertiary uppercase tracking-widest px-1">Cup Loss Analysis</h3>
            {analysis.items.map((item) => {
              const lossPositive = item.lossCups !== null && item.lossCups > 0
              const lossZero = item.lossCups !== null && item.lossCups === 0
              return (
                <div
                  key={item.productId}
                  className="rounded-2xl border border-surface-border p-4"
                  style={{ background: '#1e1e1e' }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-medium text-ink-primary">{item.productName}</p>
                      <p className="text-xs text-ink-tertiary">{item.cupsPerPacket} cups / {item.gramsPerPacket}g</p>
                    </div>
                    <span className={`text-sm font-bold tabular-nums ${
                      item.lossCups === null ? 'text-ink-tertiary' : lossPositive ? 'text-rose' : lossZero ? 'text-emerald' : 'text-ink-secondary'
                    }`}>
                      {item.lossCups === null ? '—' : item.lossCups > 0 ? `+${item.lossCups}` : String(item.lossCups)}
                      {item.lossCups !== null && <span className="text-xs font-normal ml-1">loss</span>}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    {[
                      { label: 'Prev g', value: fmt(item.prevClosingGrams, 'g') },
                      { label: 'Today g', value: fmt(item.closingGrams, 'g') },
                      { label: 'Used', value: fmt(item.gramsConsumed, 'g') },
                    ].map(({ label, value }) => (
                      <div key={label} className="bg-surface-elevated/50 rounded-lg py-2 px-1">
                        <p className="text-[10px] text-ink-tertiary mb-0.5">{label}</p>
                        <p className="text-xs font-medium text-ink-secondary tabular-nums">{value}</p>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-center mt-2">
                    {[
                      { label: 'Exp. Cups', value: fmt(item.expectedCups) },
                      { label: 'Act. Cups', value: String(item.actualCups) },
                    ].map(({ label, value }) => (
                      <div key={label} className="bg-surface-elevated/50 rounded-lg py-2 px-1">
                        <p className="text-[10px] text-ink-tertiary mb-0.5">{label}</p>
                        <p className="text-xs font-medium text-ink-secondary tabular-nums">{value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}

            {/* Mobile totals */}
            <div className="rounded-2xl border border-coral-500/20 bg-coral-900/10 p-4">
              <p className="text-xs font-semibold text-ink-tertiary uppercase tracking-widest mb-3">Totals</p>
              <div className="grid grid-cols-3 gap-2 text-center">
                {[
                  { label: 'Exp. Cups', value: fmt(totals?.totalExpectedCups ?? null) },
                  { label: 'Act. Cups', value: String(totals?.totalActualCups ?? 0) },
                  {
                    label: 'Loss',
                    value: totals?.totalLossCups == null ? '—' : totals.totalLossCups > 0 ? `+${totals.totalLossCups}` : String(totals.totalLossCups),
                    rose: totals?.totalLossCups != null && (totals?.totalLossCups ?? 0) > 0,
                  },
                ].map(({ label, value, rose }) => (
                  <div key={label} className="bg-surface-elevated/50 rounded-lg py-2 px-1">
                    <p className="text-[10px] text-ink-tertiary mb-0.5">{label}</p>
                    <p className={`text-sm font-bold tabular-nums ${rose ? 'text-rose' : 'text-ink-primary'}`}>{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Analysis — desktop: table */}
          <div
            className="hidden md:block rounded-2xl border border-surface-border overflow-hidden"
            style={{ background: '#1e1e1e' }}
          >
            <div className="px-5 py-4 border-b border-surface-border">
              <h3 className="text-xs font-semibold text-ink-tertiary uppercase tracking-widest">Cup Loss Analysis</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-border">
                    <th className="text-left px-5 py-3 text-xs font-medium text-ink-tertiary uppercase tracking-wider">Product</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-ink-tertiary uppercase tracking-wider">Prev Grams</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-ink-tertiary uppercase tracking-wider">Today Grams</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-ink-tertiary uppercase tracking-wider">Grams Used</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-ink-tertiary uppercase tracking-wider">Exp. Cups</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-ink-tertiary uppercase tracking-wider">Act. Cups</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-ink-tertiary uppercase tracking-wider">Loss Cups</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {analysis.items.map((item) => {
                    const lossClass =
                      item.lossCups === null
                        ? 'text-ink-tertiary'
                        : item.lossCups > 0
                          ? 'text-rose font-semibold'
                          : 'text-emerald'
                    return (
                      <tr key={item.productId} className="hover:bg-surface-elevated/30 transition-colors">
                        <td className="px-5 py-3.5">
                          <p className="font-medium text-ink-primary">{item.productName}</p>
                          <p className="text-xs text-ink-tertiary">{item.cupsPerPacket} cups/{item.gramsPerPacket}g</p>
                        </td>
                        <td className="px-4 py-3.5 text-right text-ink-secondary tabular-nums">{fmt(item.prevClosingGrams, 'g')}</td>
                        <td className="px-4 py-3.5 text-right text-ink-secondary tabular-nums">{fmt(item.closingGrams, 'g')}</td>
                        <td className="px-4 py-3.5 text-right text-ink-secondary tabular-nums">{fmt(item.gramsConsumed, 'g')}</td>
                        <td className="px-4 py-3.5 text-right text-ink-secondary tabular-nums">{fmt(item.expectedCups)}</td>
                        <td className="px-4 py-3.5 text-right text-ink-primary tabular-nums">{item.actualCups}</td>
                        <td className={`px-4 py-3.5 text-right tabular-nums ${lossClass}`}>
                          {item.lossCups === null ? '—' : item.lossCups > 0 ? `+${item.lossCups}` : String(item.lossCups)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-surface-border bg-surface-elevated/20">
                    <td className="px-5 py-3.5 font-semibold text-ink-primary" colSpan={4}>Totals</td>
                    <td className="px-4 py-3.5 text-right font-semibold text-ink-primary tabular-nums">{fmt(totals?.totalExpectedCups ?? null)}</td>
                    <td className="px-4 py-3.5 text-right font-semibold text-ink-primary tabular-nums">{totals?.totalActualCups ?? 0}</td>
                    <td className={`px-4 py-3.5 text-right font-semibold tabular-nums ${
                      totals?.totalLossCups == null ? 'text-ink-tertiary' : (totals?.totalLossCups ?? 0) > 0 ? 'text-rose' : 'text-emerald'
                    }`}>
                      {totals?.totalLossCups == null
                        ? '—'
                        : totals.totalLossCups > 0
                          ? `+${totals.totalLossCups}`
                          : String(totals.totalLossCups)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
