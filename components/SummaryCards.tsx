'use client'

import { Card, CardContent } from '@/components/ui/card'
import { formatCurrency, formatPercent, getPnlColor } from '@/lib/utils'
import { TrendingUp, TrendingDown, DollarSign, Activity, Wallet } from 'lucide-react'
import { HISTORICAL_DATA, INITIAL_CAPITAL } from '@/lib/portfolio-data'

interface SummaryCardsProps {
  totalValueUSD: number
  totalPnlUSD: number
  totalPnlPct: number
  dailyPnlUSD: number
  dailyPnlPct: number
  dolarCCL: number
  dolarBlue: number
  loading: boolean
}

// Calculate year P&L from historical data
function yearPnl(year: number, currentValue: number): { abs: number; pct: number } {
  const startEntry = year === 2024
    ? null  // use INITIAL_CAPITAL
    : HISTORICAL_DATA.filter(d => d.date <= `${year - 1}-12-31`).at(-1)
  const endEntry = HISTORICAL_DATA.filter(d => d.date <= `${year}-12-31`).at(-1)
  const startVal = year === 2024 ? INITIAL_CAPITAL : (startEntry?.quotaPart ?? INITIAL_CAPITAL)
  const endVal = endEntry && endEntry.date.startsWith(String(year))
    ? endEntry.quotaPart
    : (endEntry?.quotaPart ?? currentValue)
  // For current year use live value
  const now = new Date()
  const finalVal = year === now.getFullYear() ? currentValue : endVal
  const abs = finalVal - startVal
  const pct = startVal > 0 ? (abs / startVal) * 100 : 0
  return { abs, pct }
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
}: SummaryCardsProps) {
  const now = new Date()
  const currentYear = now.getFullYear()

  // P&L desde inicio (vs INITIAL_CAPITAL)
  const inceptionPnl = totalValueUSD - INITIAL_CAPITAL
  const inceptionPct = (inceptionPnl / INITIAL_CAPITAL) * 100

  // Year breakdowns
  const years = [2024, 2025, currentYear].filter((y, i, arr) => arr.indexOf(y) === i)
  const yearBreakdown = years.map(y => {
    const { pct } = yearPnl(y, totalValueUSD)
    return `${y}: ${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`
  }).join(' · ')

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
      title: 'P&L Desde Inicio',
      icon: inceptionPct >= 0 ? TrendingUp : TrendingDown,
      iconColor: inceptionPct >= 0 ? 'text-emerald-400' : 'text-red-400',
      iconBg: inceptionPct >= 0 ? 'bg-emerald-500/10' : 'bg-red-500/10',
      value: loading ? null : (inceptionPnl >= 0 ? '+' : '') + formatCurrency(inceptionPnl),
      sub: loading ? null : `${formatPercent(inceptionPct)} vs $200k inicial · ${yearBreakdown}`,
      valueColor: getPnlColor(inceptionPnl),
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

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {cards.map((card) => (
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
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
