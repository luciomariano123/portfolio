'use client'

import { formatCurrency } from '@/lib/utils'

interface Props {
  cedears: number
  cash: number
  fi: number
  loading?: boolean
}

export function TenenciaBreakdown({ cedears, cash, fi, loading }: Props) {
  const variable = cedears + cash
  const total    = variable + fi
  const varPct   = total > 0 ? (variable / total) * 100 : 0
  const fiPct    = total > 0 ? (fi / total) * 100 : 0
  const cdrPct   = total > 0 ? (cedears / total) * 100 : 0
  const cashPct  = total > 0 ? (cash / total) * 100 : 0

  const fmt = (n: number) => loading ? '—' : formatCurrency(n)
  const pct = (n: number) => loading ? '—' : n.toFixed(1) + '%'

  return (
    <div className="space-y-4">
      {/* Stacked bar */}
      <div className="h-3 rounded-full overflow-hidden flex gap-px">
        <div className="bg-indigo-500 transition-all duration-500" style={{ width: `${cdrPct}%` }} title={`CEDEARs ${pct(cdrPct)}`} />
        <div className="bg-slate-500 transition-all duration-500"  style={{ width: `${cashPct}%` }} title={`Cash ${pct(cashPct)}`} />
        <div className="bg-cyan-500 transition-all duration-500"   style={{ width: `${fiPct}%` }}   title={`Renta Fija ${pct(fiPct)}`} />
      </div>

      {/* Breakdown rows */}
      <div className="space-y-2.5">
        {/* Total */}
        <div className="flex items-center justify-between py-2 border-b border-slate-700/40">
          <span className="text-sm font-semibold text-slate-200">Total cartera</span>
          <span className="text-sm font-bold font-mono text-slate-100">{fmt(total)}</span>
        </div>

        {/* Variable */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-indigo-500/70" />
              <span className="text-sm text-slate-300 font-medium">Renta variable</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono text-slate-500 w-12 text-right">{pct(varPct)}</span>
              <span className="text-sm font-mono font-semibold text-slate-100 w-28 text-right">{fmt(variable)}</span>
            </div>
          </div>
          <div className="ml-4 space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                <span className="text-xs text-slate-500">CEDEARs</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono text-slate-600 w-12 text-right">{pct(cdrPct)}</span>
                <span className="text-xs font-mono text-slate-400 w-28 text-right">{fmt(cedears)}</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                <span className="text-xs text-slate-500">Efectivo USD</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono text-slate-600 w-12 text-right">{pct(cashPct)}</span>
                <span className="text-xs font-mono text-slate-400 w-28 text-right">{fmt(cash)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Renta fija */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-cyan-500/70" />
            <span className="text-sm text-slate-300 font-medium">Renta fija</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-slate-500 w-12 text-right">{pct(fiPct)}</span>
            <span className="text-sm font-mono font-semibold text-slate-100 w-28 text-right">{fmt(fi)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
