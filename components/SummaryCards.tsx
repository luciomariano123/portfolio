'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { formatCurrency, formatPercent, getPnlColor } from '@/lib/utils'
import { TrendingUp, TrendingDown, DollarSign, Activity, Wallet, ChevronDown, ChevronUp } from 'lucide-react'

export interface DailyBreakdownRow {
  ticker: string
  dailyPnlUSD: number
  changePercent: number
}

interface SummaryCardsProps {
  totalValueUSD: number
  totalPnlUSD: number
  totalPnlPct: number
  dailyPnlUSD: number
  dailyPnlPct: number
  dolarCCL: number
  dolarBlue: number
  loading: boolean
  dailyBreakdown?: DailyBreakdownRow[]
}

export function SummaryCards({
  totalValueUSD,
  totalPnlUSD,
  totalPnlPct,
  dailyPnlUSD,
  dailyPnlPct,
  dolarCCL,
  dolarBlue,
  loading,
  dailyBreakdown,
}: SummaryCardsProps) {
  const [showBreakdown, setShowBreakdown] = useState(false)
  const cards = [
    {
      title: 'Valor Total Cartera',
      icon: Wallet,
      iconColor: 'text-indigo-400',
      iconBg: 'bg-indigo-500/10',
      value: loading ? null : formatCurrency(totalValueUSD),
      sub: loading ? null : `ARS ${(totalValueUSD * dolarCCL).toLocaleString('es-AR', { maximumFractionDigits: 0 })}`,
      highlight: false,
    },
    {
      title: 'P&L Total',
      icon: totalPnlPct >= 0 ? TrendingUp : TrendingDown,
      iconColor: totalPnlPct >= 0 ? 'text-emerald-400' : 'text-red-400',
      iconBg: totalPnlPct >= 0 ? 'bg-emerald-500/10' : 'bg-red-500/10',
      value: loading ? null : (totalPnlUSD >= 0 ? '+' : '') + formatCurrency(totalPnlUSD),
      sub: loading ? null : formatPercent(totalPnlPct) + ' desde compra',
      valueColor: getPnlColor(totalPnlUSD),
      highlight: false,
    },
    {
      title: 'Variación del Día',
      icon: Activity,
      iconColor: dailyPnlPct >= 0 ? 'text-emerald-400' : 'text-red-400',
      iconBg: dailyPnlPct >= 0 ? 'bg-emerald-500/10' : 'bg-red-500/10',
      value: loading ? null : (dailyPnlUSD >= 0 ? '+' : '') + formatCurrency(dailyPnlUSD),
      sub: loading ? null : formatPercent(dailyPnlPct) + ' hoy',
      valueColor: getPnlColor(dailyPnlUSD),
      highlight: false,
      hasBreakdown: true,
    },
    {
      title: 'Tipos de Cambio',
      icon: DollarSign,
      iconColor: 'text-amber-400',
      iconBg: 'bg-amber-500/10',
      value: loading ? null : `CCL $${dolarCCL.toLocaleString('es-AR')}`,
      sub: loading ? null : `Blue $${dolarBlue.toLocaleString('es-AR')}`,
      highlight: false,
    },
  ]

  const sortedBreakdown = dailyBreakdown
    ? [...dailyBreakdown].sort((a, b) => Math.abs(b.dailyPnlUSD) - Math.abs(a.dailyPnlUSD))
    : []

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {cards.map((card) => {
        const canExpand = card.hasBreakdown && sortedBreakdown.length > 0 && !loading
        return (
          <Card key={card.title} className="relative overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">{card.title}</p>
                  {card.value === null ? (
                    <div className="h-7 w-32 bg-slate-700 rounded animate-pulse mb-1" />
                  ) : (
                    <p className={`text-xl font-bold truncate ${card.valueColor ?? 'text-slate-100'}`}>
                      {card.value}
                    </p>
                  )}
                  {card.sub === null ? (
                    <div className="h-4 w-24 bg-slate-700/60 rounded animate-pulse mt-1" />
                  ) : (
                    <p className="text-xs text-slate-500 mt-1">{card.sub}</p>
                  )}
                </div>
                <div className={`w-10 h-10 rounded-xl ${card.iconBg} flex items-center justify-center flex-shrink-0 ml-3`}>
                  <card.icon size={18} className={card.iconColor} />
                </div>
              </div>
              {canExpand && (
                <>
                  <button
                    onClick={() => setShowBreakdown(v => !v)}
                    className="mt-3 flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    {showBreakdown ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    {showBreakdown ? 'Ocultar detalle' : 'Ver detalle por ticker'}
                  </button>
                  {showBreakdown && (
                    <div className="mt-2 border-t border-slate-700/60 pt-2 max-h-52 overflow-y-auto">
                      <table className="w-full text-xs">
                        <tbody className="divide-y divide-slate-800">
                          {sortedBreakdown.map((r) => (
                            <tr key={r.ticker}>
                              <td className="py-1.5 text-slate-300 font-medium">{r.ticker}</td>
                              <td className={`py-1.5 text-right font-mono ${getPnlColor(r.changePercent)}`}>
                                {formatPercent(r.changePercent)}
                              </td>
                              <td className={`py-1.5 text-right font-mono pl-3 ${getPnlColor(r.dailyPnlUSD)}`}>
                                {(r.dailyPnlUSD >= 0 ? '+' : '') + formatCurrency(r.dailyPnlUSD)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
