'use client'

import { useMemo } from 'react'
import { getConsolidatedPositions, CEDEAR_RATIOS } from '@/lib/portfolio-data'
import { PriceData } from '@/hooks/usePrices'
import { formatCurrency, formatPercent, getPnlColor } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

interface RatiosTableProps {
  prices: Record<string, PriceData>
  dolarCCL: number
}

export function RatiosTable({ prices, dolarCCL }: RatiosTableProps) {
  const positions = getConsolidatedPositions()

  const rows = useMemo(() => {
    return positions.map(pos => {
      const priceData = prices[pos.tickerYF]
      const priceNYSE = priceData?.price ?? 0
      const ratio = CEDEAR_RATIOS[pos.ticker] ?? 1

      // Para calcular paridad: precio CEDEAR en ARS = priceNYSE * dolarCCL / ratio
      // El precio en ARS en el mercado sería el CEDEAR
      // Aquí mostramos el precio implícito en USD vía CCL
      const impliedUSD = priceNYSE // El precio en NYSE ya es el subyacente

      return {
        ticker: pos.ticker,
        name: pos.name,
        ratio,
        priceNYSE,
        impliedARS: priceNYSE * dolarCCL / ratio,
        hasPrice: !!priceData,
        changePercent: priceData?.changePercent ?? 0,
      }
    })
  }, [positions, prices, dolarCCL])

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-700/50">
            {['Ticker CEDEAR', 'Nombre', 'Ratio', 'Precio NYSE (USD)', 'Precio implícito ARS', 'Variación'].map(h => (
              <th key={h} className="text-left py-2.5 px-3 text-xs font-medium text-slate-400 uppercase tracking-wider">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-700/30">
          {rows.map(row => (
            <tr key={row.ticker} className="hover:bg-slate-700/20 transition-colors">
              <td className="py-2.5 px-3 font-bold text-slate-100">{row.ticker}</td>
              <td className="py-2.5 px-3 text-slate-400 text-xs">{row.name}</td>
              <td className="py-2.5 px-3">
                <Badge variant="outline">1:{row.ratio}</Badge>
              </td>
              <td className="py-2.5 px-3 font-mono text-slate-100">
                {row.hasPrice ? formatCurrency(row.priceNYSE) : '—'}
              </td>
              <td className="py-2.5 px-3 font-mono text-slate-300">
                {row.hasPrice
                  ? `≈ $${row.impliedARS.toLocaleString('es-AR', { maximumFractionDigits: 0 })}`
                  : '—'}
              </td>
              <td className={`py-2.5 px-3 font-mono text-xs ${getPnlColor(row.changePercent)}`}>
                {row.hasPrice ? formatPercent(row.changePercent) : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
