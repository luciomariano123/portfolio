'use client'

import { formatCurrency } from '@/lib/utils'

interface Props {
  cedears: number
  cash: number
  fi: number
  loading?: boolean
}

export function TenenciaBreakdown({ cedears, cash, fi, loading }: Props) {
  const total = cedears + fi + cash
  const groups = [
    { label: 'Renta variable', sub: 'CEDEARs', value: cedears, dot: 'bg-indigo-500' },
    { label: 'Renta fija',     sub: 'ONs a precio de mercado', value: fi, dot: 'bg-cyan-500' },
    { label: 'Liquidez',       sub: 'Efectivo USD', value: cash, dot: 'bg-slate-400' },
  ].map(g => ({ ...g, pct: total > 0 ? (g.value / total) * 100 : 0 }))

  const fmt = (n: number) => loading ? '—' : formatCurrency(n)
  const pct = (n: number) => loading ? '—' : n.toFixed(1) + '%'

  return (
    <div className="space-y-4">
      {/* Stacked bar */}
      <div className="h-3 rounded-full overflow-hidden flex gap-px">
        {groups.map(g => (
          <div
            key={g.label}
            className={`${g.dot} transition-all duration-500`}
            style={{ width: `${g.pct}%` }}
            title={`${g.label} ${pct(g.pct)}`}
          />
        ))}
      </div>

      <div className="space-y-2.5">
        <div className="flex items-center justify-between py-2 border-b border-slate-700/40">
          <span className="text-sm font-semibold text-slate-200">Total cartera</span>
          <span className="text-sm font-bold font-mono text-slate-100">{fmt(total)}</span>
        </div>

        {groups.map(g => (
          <div key={g.label} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${g.dot}`} />
              <div className="min-w-0">
                <p className="text-sm text-slate-300 font-medium">{g.label}</p>
                <p className="text-xs text-slate-500 truncate">{g.sub}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <span className="text-xs font-mono text-slate-500 w-12 text-right">{pct(g.pct)}</span>
              <span className="text-sm font-mono font-semibold text-slate-100 w-28 text-right">{fmt(g.value)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
