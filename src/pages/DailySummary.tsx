import { useState, useEffect } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { Plus, Trash2, Save } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { FullPageSpinner } from '@/components/ui/spinner'
import { todaySL, formatDate, formatLKR } from '@/lib/utils'

const DEFAULT_DELIVERY_APPS = ['Uber Eats', 'PickMe Food']

export function DailySummaryPage() {
  const today = todaySL()
  const [date, setDate] = useState(today)
  const [isSaving, setIsSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState('')

  const existing = useQuery(api.dailySummary.getForDate, { date })
  const upsert = useMutation(api.dailySummary.upsertForDate)

  const [cash, setCash] = useState('')
  const [card, setCard] = useState('')
  const [deliveryApps, setDeliveryApps] = useState(
    DEFAULT_DELIVERY_APPS.map((name) => ({ name, amount: '' }))
  )
  const [specialOrder, setSpecialOrder] = useState('')
  const [pereraSettlement, setPereraSettlement] = useState('')
  const [tradingPayment, setTradingPayment] = useState('')
  const [notes, setNotes] = useState('')

  // Load existing data when date changes
  useEffect(() => {
    if (existing) {
      setCash(String(existing.cashAmount))
      setCard(String(existing.cardAmount))
      setDeliveryApps(
        existing.deliveryApps.map((d) => ({ name: d.name, amount: String(d.amount) }))
      )
      setSpecialOrder(String(existing.specialOrderAmount))
      setPereraSettlement(String(existing.pereraSettlementAmount))
      setTradingPayment(String(existing.tradingPaymentAmount ?? ''))
      setNotes(existing.notes ?? '')
    } else if (existing === null) {
      // Reset
      setCash('')
      setCard('')
      setDeliveryApps(DEFAULT_DELIVERY_APPS.map((name) => ({ name, amount: '' })))
      setSpecialOrder('')
      setPereraSettlement('')
      setTradingPayment('')
      setNotes('')
    }
  }, [existing, date])

  function parseNum(val: string) {
    const n = parseFloat(val)
    return isNaN(n) ? 0 : n
  }

  const totalSales =
    parseNum(cash) +
    parseNum(card) +
    deliveryApps.reduce((s, d) => s + parseNum(d.amount), 0) +
    parseNum(specialOrder)

  async function handleSave() {
    setIsSaving(true)
    try {
      await upsert({
        date,
        cashAmount: parseNum(cash),
        cardAmount: parseNum(card),
        deliveryApps: deliveryApps.map((d) => ({ name: d.name, amount: parseNum(d.amount) })),
        specialOrderAmount: parseNum(specialOrder),
        pereraSettlementAmount: parseNum(pereraSettlement),
        tradingPaymentAmount: tradingPayment ? parseNum(tradingPayment) : undefined,
        notes: notes || undefined,
      })
      setSavedMsg('Saved!')
      setTimeout(() => setSavedMsg(''), 2500)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setIsSaving(false)
    }
  }

  if (existing === undefined) return <FullPageSpinner />

  return (
    <div className="max-w-xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-display italic text-3xl text-ink-primary mb-1">Daily Summary</h1>
        <p className="text-sm text-ink-secondary">Record day-end sales and settlement</p>
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

      <div className="space-y-4">
        {/* Sales section */}
        <div className="rounded-2xl border border-surface-border p-5 space-y-4" style={{ background: '#1e1e1e' }}>
          <h3 className="text-xs font-semibold text-ink-tertiary uppercase tracking-widest">Sales</h3>
          <Input
            label="Cash"
            type="number"
            min="0"
            step="0.01"
            value={cash}
            onChange={(e) => setCash(e.target.value)}
            placeholder="0.00"
            leftAddon={<span className="text-xs">LKR</span>}
          />
          <Input
            label="Card"
            type="number"
            min="0"
            step="0.01"
            value={card}
            onChange={(e) => setCard(e.target.value)}
            placeholder="0.00"
            leftAddon={<span className="text-xs">LKR</span>}
          />

          {/* Delivery apps */}
          <div>
            <label className="text-xs font-medium text-ink-secondary uppercase tracking-wider block mb-2">
              Delivery Apps
            </label>
            <div className="space-y-2">
              {deliveryApps.map((app, idx) => (
                <div key={idx} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <input
                    type="text"
                    value={app.name}
                    onChange={(e) => {
                      const next = [...deliveryApps]
                      next[idx] = { ...next[idx], name: e.target.value }
                      setDeliveryApps(next)
                    }}
                    placeholder="App name"
                    className="w-full sm:w-32 bg-surface-bg border border-surface-border rounded-lg px-2.5 py-2.5 text-sm text-ink-primary focus:outline-none focus:border-coral-500"
                  />
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      inputMode="decimal"
                      value={app.amount}
                      onChange={(e) => {
                        const next = [...deliveryApps]
                        next[idx] = { ...next[idx], amount: e.target.value }
                        setDeliveryApps(next)
                      }}
                      placeholder="0.00"
                      className="flex-1 bg-surface-bg border border-surface-border rounded-lg px-2.5 py-2.5 text-sm text-ink-primary focus:outline-none focus:border-coral-500"
                    />
                    <button
                      onClick={() => setDeliveryApps(deliveryApps.filter((_, i) => i !== idx))}
                      className="p-2 text-ink-tertiary hover:text-rose transition-colors shrink-0"
                      aria-label="Remove"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
              <button
                onClick={() => setDeliveryApps([...deliveryApps, { name: '', amount: '' }])}
                className="flex items-center gap-1.5 text-xs text-coral-400 hover:text-coral-300 transition-colors"
              >
                <Plus size={13} />
                Add delivery app
              </button>
            </div>
          </div>

          <Input
            label="Special Orders Collected"
            type="number"
            min="0"
            step="0.01"
            value={specialOrder}
            onChange={(e) => setSpecialOrder(e.target.value)}
            placeholder="0.00"
            leftAddon={<span className="text-xs">LKR</span>}
            hint="Cash collected from special order pickups today"
          />
        </div>

        {/* Settlement section */}
        <div className="rounded-2xl border border-surface-border p-5 space-y-4" style={{ background: '#1e1e1e' }}>
          <h3 className="text-xs font-semibold text-ink-tertiary uppercase tracking-widest">Settlements & Payments</h3>
          <Input
            label="Perera & Sons Settlement"
            type="number"
            min="0"
            step="0.01"
            value={pereraSettlement}
            onChange={(e) => setPereraSettlement(e.target.value)}
            placeholder="0.00"
            leftAddon={<span className="text-xs">LKR</span>}
            hint="Amount paid to Perera & Sons today"
          />
          <Input
            label="Trading Invoice Payment (optional)"
            type="number"
            min="0"
            step="0.01"
            value={tradingPayment}
            onChange={(e) => setTradingPayment(e.target.value)}
            placeholder="0.00"
            leftAddon={<span className="text-xs">LKR</span>}
            hint="Payment made to trading suppliers (due within 7 days)"
          />
          <div>
            <label className="text-xs font-medium text-ink-secondary uppercase tracking-wider block mb-1.5">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any notes for today…"
              rows={3}
              className="w-full bg-surface-bg border border-surface-border rounded-xl px-3 py-2.5 text-sm text-ink-primary placeholder:text-ink-tertiary/60 focus:outline-none focus:border-coral-500 resize-none"
            />
          </div>
        </div>

        {/* Totals */}
        <div className="rounded-2xl border border-coral-500/20 bg-coral-900/20 p-5">
          <h3 className="text-xs font-semibold text-ink-tertiary uppercase tracking-widest mb-3">Summary</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-ink-secondary">Total Sales</span>
              <span className="font-semibold text-ink-primary tabular-nums">{formatLKR(totalSales)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-secondary">P&S Settlement</span>
              <span className="text-ink-primary tabular-nums">{formatLKR(parseNum(pereraSettlement))}</span>
            </div>
            {tradingPayment && (
              <div className="flex justify-between">
                <span className="text-ink-secondary">Trading Payment</span>
                <span className="text-ink-primary tabular-nums">{formatLKR(parseNum(tradingPayment))}</span>
              </div>
            )}
            <div className="border-t border-surface-border pt-2 flex justify-between font-semibold">
              <span className="text-ink-primary">Net (Sales − Settlement)</span>
              <span
                className={
                  totalSales - parseNum(pereraSettlement) >= 0 ? 'text-emerald tabular-nums' : 'text-rose tabular-nums'
                }
              >
                {formatLKR(totalSales - parseNum(pereraSettlement))}
              </span>
            </div>
          </div>
        </div>

        {/* Save */}
        <Button
          size="lg"
          className="w-full"
          leftIcon={<Save size={16} />}
          isLoading={isSaving}
          onClick={() => void handleSave()}
        >
          {savedMsg || 'Save Daily Summary'}
        </Button>
      </div>
    </div>
  )
}
