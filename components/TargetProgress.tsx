'use client'

import type { AnnualTarget } from '@/lib/portfolio-data'
import { formatPercent, getPnlColor } from '@/lib/utils'

const usd = (n: number) => 'USD ' + n.toLocaleString('es-AR', { maximumFractionDigits: 0 })

interface Props {
  target: AnnualTarget | undefined
  currentValue: number
  loading?: boolean
}

export function TargetProgress({ target, currentValue, loading }: Props) {
  if (!target) {
    return <p className="text-sm text-slate-500">Sin datos de inicio de año.</p>
  }

  const { year, rate, base, target: goal, progress } = target
  const ytdAbs = currentValue - base
  const ytdPct = base > 0 ? (ytdAbs / base) * 100 : 0
  const remaining = goal - currentValue
  const barPct = Math.max(0, Math.min(progress, 1)) * 100
  const achieved = progress >= 1

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <div>
          <p className="text-xs text-slate-500">Meta +{(rate * 100).toFixed(0)}% anual</p>
          <p className="text-lg font-bold text-slate-100">{usd(goal)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-500">Cumplido</p>
          <p className={`text-lg font-bold font-mono ${achieved ? 'text-emerald-400' : 'text-amber-400'}`}>
            {loading ? '—' : `${(progress * 100).toFixed(0)}%`}
          </p>
        </div>
      </div>

      <div className="h-2.5 rounded-full bg-slate-700 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${achieved ? 'bg-emerald-500' : 'bg-amber-500'}`}
          style={{ width: loading ? '0%' : `${barPct}%` }}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <p className="text-slate-500">Inicio {year}</p>
          <p className="font-mono text-slate-300">{usd(base)}</p>
        </div>
        <div className="text-right">
          <p className="text-slate-500">Ganancia {year}</p>
          <p className={`font-mono ${getPnlColor(ytdAbs)}`}>
            {loading ? '—' : `${ytdAbs >= 0 ? '+' : '-'}${usd(Math.abs(ytdAbs))} (${formatPercent(ytdPct)})`}
          </p>
        </div>
      </div>

      <p className="text-xs text-slate-500">
        {loading
          ? ' '
          : achieved
            ? `Objetivo superado por ${usd(-remaining)}.`
            : `Faltan ${usd(remaining)} para llegar al objetivo.`}
      </p>
    </div>
  )
}
