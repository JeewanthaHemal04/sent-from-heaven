import { useState } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import {
  TrendingDown,
  TrendingUp,
  Minus,
  AlertTriangle,
  DollarSign,
  ShoppingCart,
  Activity,
} from 'lucide-react'
import { FullPageSpinner } from '@/components/ui/spinner'
import { Badge } from '@/components/ui/badge'
import { formatLKR, formatVariance, todaySL, formatDate } from '@/lib/utils'
import { useCurrentUser } from '@/hooks/useCurrentUser'

function SummaryCard({
  label,
  value,
  icon: Icon,
  sub,
  accent = false,
}: {
  label: string
  value: string
  icon: React.ElementType
  sub?: string
  accent?: boolean
}) {
  return (
    <div
      className="rounded-2xl border border-surface-border p-5"
      style={{ background: 'linear-gradient(135deg, #1e1e1e 0%, #1a1a1a 100%)' }}
    >
      <div className="flex items-start justify-between mb-3">
        <div
          className={`p-2 rounded-lg ${
            accent ? 'bg-coral-500/15 text-coral-400' : 'bg-surface-elevated text-ink-secondary'
          }`}
        >
          <Icon size={17} />
        </div>
      </div>
      <p className="text-2xl font-bold text-ink-primary mb-1 tabular-nums">{value}</p>
      <p className="text-xs font-medium text-ink-tertiary uppercase tracking-wider">{label}</p>
      {sub && <p className="text-xs text-ink-tertiary mt-1">{sub}</p>}
    </div>
  )
}

export function DashboardPage() {
  const user = useCurrentUser()
  const today = todaySL()
  const [selectedDate, setSelectedDate] = useState(today)

  const summary = useQuery(api.analysis.getDashboardSummary, { date: today })
  const variance = useQuery(api.analysis.getVarianceForDate, { date: selectedDate })

  if (!user || summary === undefined) return <FullPageSpinner />

  const totalSales = summary?.totalSales ?? 0

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-display italic text-3xl text-ink-primary mb-1">Dashboard</h1>
        <p className="text-sm text-ink-secondary">{formatDate(today)}</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        <SummaryCard
          label="Total Sales"
          value={formatLKR(totalSales)}
          icon={ShoppingCart}
          sub={summary?.hasDailySummary ? 'Recorded' : 'Not recorded yet'}
          accent
        />
        <SummaryCard
          label="P&S Settlement"
          value={formatLKR(summary?.pereraSettlement ?? 0)}
          icon={DollarSign}
          sub="Settled today"
        />
        <SummaryCard
          label="Movements"
          value={String(summary?.movementCount ?? 0)}
          icon={Activity}
          sub="Today"
        />
        <SummaryCard
          label="Stock Count"
          value={summary?.sessionStatus === 'submitted' ? 'Done' : summary?.sessionStatus === 'draft' ? 'In progress' : 'Pending'}
          icon={AlertTriangle}
          sub={summary?.sessionStatus === 'submitted' ? '✓ Submitted' : 'Not started'}
        />
      </div>

      {/* Variance section */}
      <div className="rounded-2xl border border-surface-border overflow-hidden">
        <div className="px-5 py-4 border-b border-surface-border flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-ink-primary">Variance Analysis</h2>
            <p className="text-xs text-ink-secondary mt-0.5">
              Compare actual vs expected stock — negative variance = potential shortage
            </p>
          </div>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="text-sm bg-surface-elevated border border-surface-border rounded-lg px-3 py-1.5 text-ink-primary focus:outline-none focus:border-coral-500"
          />
        </div>

        {variance === undefined ? (
          <div className="p-8 flex justify-center">
            <FullPageSpinner label="Calculating variance…" />
          </div>
        ) : variance === null ? (
          <div className="px-5 py-12 text-center">
            <AlertTriangle size={32} className="text-surface-muted mx-auto mb-3" />
            <p className="text-sm font-medium text-ink-secondary mb-1">No submitted stock count</p>
            <p className="text-xs text-ink-tertiary">
              Submit a stock count for {selectedDate} to see variance analysis.
            </p>
          </div>
        ) : (
          <>
            {/* Summary bar */}
            <div className="px-5 py-3 bg-surface-raised border-b border-surface-border flex items-center gap-4 text-xs flex-wrap">
              <span className="text-ink-secondary">
                {variance.summary.totalProducts} products
              </span>
              {variance.summary.totalShortage > 0 && (
                <span className="flex items-center gap-1 text-rose font-medium">
                  <TrendingDown size={12} />
                  {variance.summary.totalShortage} short
                </span>
              )}
              {variance.summary.totalExcess > 0 && (
                <span className="flex items-center gap-1 text-emerald font-medium">
                  <TrendingUp size={12} />
                  {variance.summary.totalExcess} excess
                </span>
              )}
              <span className="text-ink-tertiary ml-auto">
                Financial impact:{' '}
                <span
                  className={
                    variance.summary.totalFinancialImpact < 0 ? 'text-rose' : 'text-emerald'
                  }
                >
                  {formatLKR(variance.summary.totalFinancialImpact)}
                </span>
              </span>
            </div>

            {/* Variance table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-border">
                    {['Product', 'Category', 'Opening', '+In', '−Out', 'Expected', 'Actual', 'Variance', 'Impact'].map(
                      (h) => (
                        <th
                          key={h}
                          className="px-4 py-3 text-left text-xs font-medium text-ink-tertiary uppercase tracking-wider whitespace-nowrap"
                        >
                          {h}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody>
                  {variance.items.map((item) => (
                    <tr
                      key={item.productId.toString()}
                      className="border-b border-surface-border/50 hover:bg-surface-raised/50 transition-colors"
                    >
                      <td className="px-4 py-3 font-medium text-ink-primary whitespace-nowrap">{item.productName}</td>
                      <td className="px-4 py-3 text-ink-tertiary">{item.category}</td>
                      <td className="px-4 py-3 text-ink-secondary tabular-nums">{item.opening}</td>
                      <td className="px-4 py-3 text-emerald tabular-nums">+{item.inQty}</td>
                      <td className="px-4 py-3 text-rose tabular-nums">−{item.outQty}</td>
                      <td className="px-4 py-3 text-ink-secondary tabular-nums font-medium">{item.expected}</td>
                      <td className="px-4 py-3 text-ink-primary tabular-nums font-medium">{item.actual}</td>
                      <td className="px-4 py-3 tabular-nums">
                        <Badge
                          variant={
                            item.variance < 0 ? 'error' : item.variance > 0 ? 'success' : 'default'
                          }
                        >
                          <span className="flex items-center gap-1">
                            {item.variance < 0 ? (
                              <TrendingDown size={10} />
                            ) : item.variance > 0 ? (
                              <TrendingUp size={10} />
                            ) : (
                              <Minus size={10} />
                            )}
                            {formatVariance(item.variance)}
                          </span>
                        </Badge>
                      </td>
                      <td className="px-4 py-3 tabular-nums text-xs">
                        <span
                          className={
                            item.financialImpact < 0
                              ? 'text-rose'
                              : item.financialImpact > 0
                              ? 'text-emerald'
                              : 'text-ink-tertiary'
                          }
                        >
                          {item.financialImpact !== 0 ? formatLKR(item.financialImpact) : '—'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {variance.items.length === 0 && (
              <div className="px-5 py-8 text-center text-sm text-ink-tertiary">
                No products found.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
