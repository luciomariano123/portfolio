'use client'

import { useMemo } from 'react'
import { getConsolidatedPositions, CEDEAR_RATIOS } from '@/lib/portfolio-data'
import { PriceData } from '@/hooks/usePrices'
import { formatCurrency, formatPercent, formatNumber, getPnlColor } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface PortfolioTableProps {
  prices: Record<string, PriceData>
  dolarCCL: number
  loading: boolean
  filter?: 'all' | 'lucio' | 'agro'
}

const SECTOR_BADGE_COLOR: Record<string, string> = {
  'Tecnología': 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
  'Energía': 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  'Financiero': 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  'Consumo': 'text-pink-400 bg-pink-500/10 border-pink-500/20',
  'ETF': 'text-purple-400 bg-purple-500/10 border-purple-500/20',
}

export function PortfolioTable({ prices, dolarCCL, loading, filter = 'all' }: PortfolioTableProps) {
  const positions = getConsolidatedPositions()

  const rows = useMemo(() => {
    return positions.map(pos => {
      const priceData = prices[pos.tickerYF]
      const currentPriceUSD = priceData?.price ?? 0

      const qtyLucio = filter === 'agro' ? 0 : pos.quantityLucio
      const qtyAgro = filter === 'lucio' ? 0 : pos.quantityAgro
      const totalQty = qtyLucio + qtyAgro

      // Weighted average PPC
      const totalCostLucio = qtyLucio * pos.ppcLucio
      const totalCostAgro = qtyAgro * pos.ppcAgro
      const totalCost = totalCostLucio + totalCostAgro
      const avgPPC = totalQty > 0 ? totalCost / totalQty : 0

      // USD values: divide qty by ratio to get ADR equivalents
      const ratio = CEDEAR_RATIOS[pos.ticker] ?? 1
      const adrEquivalent = totalQty / ratio

      const currentValueUSD = adrEquivalent * currentPriceUSD
      // ppc is price per ADR → cost = adrEquiv * ppc
      const costValueUSD = (qtyLucio / ratio) * pos.ppcLucio + (qtyAgro / ratio) * pos.ppcAgro
      const pnlUSD = currentValueUSD - costValueUSD
      const pnlPct = costValueUSD > 0 ? (pnlUSD / costValueUSD) * 100 : 0

      const changePercent = priceData?.changePercent ?? 0
      const dailyPnlUSD = currentValueUSD * (changePercent / 100)

      return {
        ...pos,
        totalQty,
        avgPPC,
        currentPriceUSD,
        currentValueUSD,
        pnlUSD,
        pnlPct,
        changePercent,
        dailyPnlUSD,
        hasPrice: !!priceData,
      }
    }).filter(r => r.totalQty > 0)
  }, [positions, prices, filter])

  const totalValueUSD = rows.reduce((s, r) => s + r.currentValueUSD, 0)

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-700/50">
            {['Ticker', 'Nombre', 'Sector', 'Cant.', 'PPC (USD)', 'Precio actual', 'Variación día', 'Valor (USD)', 'P&L (USD)', 'P&L %', 'Peso %'].map(h => (
              <th key={h} className="text-left py-3 px-3 text-xs font-medium text-slate-400 uppercase tracking-wider whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-700/30">
          {rows.map(row => {
            const weight = totalValueUSD > 0 ? (row.currentValueUSD / totalValueUSD) * 100 : 0
            return (
              <tr key={row.ticker} className="hover:bg-slate-700/20 transition-colors group">
                {/* Ticker */}
                <td className="py-3 px-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center">
                      <span className="text-xs font-bold text-slate-200">
                        {row.ticker.slice(0, 2)}
                      </span>
                    </div>
                    <span className="font-semibold text-slate-100">{row.ticker}</span>
                  </div>
                </td>

                {/* Name */}
                <td className="py-3 px-3 text-slate-300 max-w-[140px] truncate">{row.name}</td>

                {/* Sector */}
                <td className="py-3 px-3">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border ${SECTOR_BADGE_COLOR[row.sector] ?? 'text-slate-400 bg-slate-500/10 border-slate-500/20'}`}>
                    {row.sector}
                  </span>
                </td>

                {/* Quantity */}
                <td className="py-3 px-3 text-slate-300 font-mono">
                  {formatNumber(row.totalQty, 0)}
                </td>

                {/* PPC */}
                <td className="py-3 px-3 text-slate-300 font-mono">
                  {row.avgPPC > 0 ? formatCurrency(row.avgPPC) : '—'}
                </td>

                {/* Current price */}
                <td className="py-3 px-3 font-mono">
                  {loading && !row.hasPrice ? (
                    <div className="h-4 w-16 bg-slate-700 rounded animate-pulse" />
                  ) : row.hasPrice ? (
                    <span className="text-slate-100 font-medium">{formatCurrency(row.currentPriceUSD)}</span>
                  ) : (
                    <span className="text-slate-500">—</span>
                  )}
                </td>

                {/* Daily change */}
                <td className="py-3 px-3">
                  {row.hasPrice ? (
                    <div className={`flex items-center gap-1 ${getPnlColor(row.changePercent)}`}>
                      {row.changePercent > 0 ? <TrendingUp size={12} /> : row.changePercent < 0 ? <TrendingDown size={12} /> : <Minus size={12} />}
                      <span className="font-mono text-xs">{formatPercent(row.changePercent)}</span>
                    </div>
                  ) : <span className="text-slate-500">—</span>}
                </td>

                {/* Value */}
                <td className="py-3 px-3 font-mono text-slate-100 font-medium">
                  {row.hasPrice ? formatCurrency(row.currentValueUSD) : '—'}
                </td>

                {/* P&L USD */}
                <td className={`py-3 px-3 font-mono ${getPnlColor(row.pnlUSD)}`}>
                  {row.hasPrice ? (
                    <span>{row.pnlUSD >= 0 ? '+' : ''}{formatCurrency(row.pnlUSD)}</span>
                  ) : '—'}
                </td>

                {/* P&L % */}
                <td className="py-3 px-3">
                  {row.hasPrice ? (
                    <Badge variant={row.pnlPct > 0 ? 'positive' : row.pnlPct < 0 ? 'negative' : 'neutral'}>
                      {formatPercent(row.pnlPct)}
                    </Badge>
                  ) : '—'}
                </td>

                {/* Weight */}
                <td className="py-3 px-3">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-slate-700 rounded-full min-w-[40px]">
                      <div
                        className="h-full bg-indigo-500 rounded-full"
                        style={{ width: `${Math.min(weight, 100)}%` }}
                      />
                    </div>
                    <span className="text-slate-400 font-mono text-xs w-10 text-right">
                      {formatNumber(weight, 1)}%
                    </span>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
