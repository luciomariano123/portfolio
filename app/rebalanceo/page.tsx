'use client'

import { useMemo } from 'react'
import { usePrices } from '@/hooks/usePrices'
import { usePositions } from '@/hooks/usePositions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency, formatPercent, getPnlColor } from '@/lib/utils'
import { TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle } from 'lucide-react'

export default function RebalanceoPage() {
  const { consolidated } = usePositions()
  const allTickers = [...new Set(consolidated.map(p => p.tickerYF))]
  const { prices, loading } = usePrices(allTickers, 60000)

  const rows = useMemo(() => {
    const portfolioRows = consolidated.map(pos => {
      const priceData = prices[pos.tickerYF]
      const priceNYSE = priceData?.price ?? 0
      const adrEquiv = pos.quantity / pos.ratio
      const currentValueUSD = adrEquiv * priceNYSE
      return { ...pos, priceNYSE, currentValueUSD, hasPrice: !!priceData }
    })

    const totalValue = portfolioRows.reduce((s, r) => s + r.currentValueUSD, 0)

    return portfolioRows.map(row => {
      const currentPct = totalValue > 0 ? (row.currentValueUSD / totalValue) * 100 : 0
      const targetPct = row.targetPct ?? 0
      const diffPct = currentPct - targetPct
      const targetValueUSD = (targetPct / 100) * totalValue
      const diffUSD = row.currentValueUSD - targetValueUSD
      // How many ADRs to buy/sell
      const diffADRs = row.priceNYSE > 0 ? diffUSD / row.priceNYSE : 0
      const diffLaminas = diffADRs * row.ratio

      return {
        ...row,
        currentPct,
        targetPct,
        diffPct,
        targetValueUSD,
        diffUSD,
        diffADRs,
        diffLaminas,
        action: diffPct > 2 ? 'VENDER' : diffPct < -2 ? 'COMPRAR' : 'OK',
      }
    }).sort((a, b) => Math.abs(b.diffPct) - Math.abs(a.diffPct))
  }, [consolidated, prices])

  const totalValue = rows.reduce((s, r) => s + r.currentValueUSD, 0)
  const totalTarget = rows.reduce((s, r) => s + (r.targetPct ?? 0), 0)
  const positionsWithTarget = rows.filter(r => (r.targetPct ?? 0) > 0)

  return (
    <div className="p-6 space-y-6 max-w-[1200px]">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Rebalanceo</h1>
        <p className="text-slate-400 text-sm mt-0.5">
          Comparación entre asignación actual vs target. Editá el target % en cada posición desde Cartera.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-slate-500 mb-1">Valor total cartera</p>
            <p className="text-lg font-bold text-slate-100 font-mono">{formatCurrency(totalValue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-slate-500 mb-1">Suma targets</p>
            <p className={`text-lg font-bold font-mono ${totalTarget === 100 ? 'text-emerald-400' : 'text-amber-400'}`}>
              {totalTarget.toFixed(1)}%
            </p>
            {totalTarget !== 100 && <p className="text-xs text-amber-400 mt-0.5">Debe sumar 100%</p>}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-slate-500 mb-1">Posiciones con target</p>
            <p className="text-lg font-bold text-slate-100">{positionsWithTarget.length} / {rows.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Rebalancing table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Plan de rebalanceo</CardTitle>
        </CardHeader>
        <CardContent className="p-0 pb-2">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700/50">
                  {['Ticker', 'Precio NYSE', 'Actual %', 'Target %', 'Diferencia', 'Valor diferencia', 'Láminas a operar', 'Acción'].map(h => (
                    <th key={h} className="text-left py-3 px-3 text-xs font-medium text-slate-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/30">
                {rows.map(row => (
                  <tr key={row.ticker} className="hover:bg-slate-700/20 transition-colors">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-200">
                          {row.ticker.slice(0,2)}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-100 text-xs">{row.ticker}</p>
                          <p className="text-slate-500 text-xs">{row.name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-200 text-xs">
                      {row.hasPrice ? formatCurrency(row.priceNYSE) : '—'}
                    </td>
                    {/* Actual % with bar */}
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5 bg-slate-700 rounded-full flex-shrink-0">
                          <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${Math.min(row.currentPct, 100)}%` }} />
                        </div>
                        <span className="font-mono text-xs text-slate-300">{row.currentPct.toFixed(1)}%</span>
                      </div>
                    </td>
                    {/* Target % with bar */}
                    <td className="py-3 px-3">
                      {(row.targetPct ?? 0) > 0 ? (
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-1.5 bg-slate-700 rounded-full flex-shrink-0">
                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(row.targetPct ?? 0, 100)}%` }} />
                          </div>
                          <span className="font-mono text-xs text-slate-300">{(row.targetPct ?? 0).toFixed(1)}%</span>
                        </div>
                      ) : <span className="text-xs text-slate-600">— sin target</span>}
                    </td>
                    {/* Diff */}
                    <td className={`py-3 px-3 font-mono text-xs ${getPnlColor(-row.diffPct)}`}>
                      {(row.targetPct ?? 0) > 0 ? (row.diffPct > 0 ? '+' : '') + row.diffPct.toFixed(1) + '%' : '—'}
                    </td>
                    <td className={`py-3 px-3 font-mono text-xs ${getPnlColor(-row.diffUSD)}`}>
                      {(row.targetPct ?? 0) > 0 && row.hasPrice
                        ? (row.diffUSD > 0 ? '+' : '') + formatCurrency(row.diffUSD)
                        : '—'}
                    </td>
                    {/* Láminas */}
                    <td className="py-3 px-3">
                      {(row.targetPct ?? 0) > 0 && row.hasPrice && Math.abs(row.diffLaminas) > 0.5 ? (
                        <span className={`font-mono text-xs font-semibold ${row.diffLaminas > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                          {row.diffLaminas > 0 ? '-' : '+'}{Math.abs(row.diffLaminas).toFixed(0)} lám.
                        </span>
                      ) : <span className="text-slate-600 text-xs">—</span>}
                    </td>
                    {/* Action */}
                    <td className="py-3 px-3">
                      {(row.targetPct ?? 0) > 0 ? (
                        row.action === 'VENDER'
                          ? <span className="flex items-center gap-1 text-xs font-semibold text-red-400"><TrendingDown size={12}/> VENDER</span>
                          : row.action === 'COMPRAR'
                          ? <span className="flex items-center gap-1 text-xs font-semibold text-emerald-400"><TrendingUp size={12}/> COMPRAR</span>
                          : <span className="flex items-center gap-1 text-xs font-semibold text-slate-400"><CheckCircle size={12}/> OK</span>
                      ) : <span className="text-slate-600 text-xs">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <div className="text-xs text-slate-500 flex items-start gap-2">
        <AlertTriangle size={13} className="text-amber-500 mt-0.5 flex-shrink-0" />
        <span>
          Una diferencia de ±2% se considera dentro del rango. Por debajo de eso se sugiere comprar o vender.
          Para editar los targets, andá a <strong className="text-slate-400">Cartera → editar posición</strong>.
        </span>
      </div>
    </div>
  )
}
