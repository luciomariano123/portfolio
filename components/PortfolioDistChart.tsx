'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { formatCurrency } from '@/lib/utils'

const SECTOR_PALETTE: Record<string, string[]> = {
  'Tecnología': ['#6366f1', '#818cf8', '#a5b4fc', '#4f46e5', '#4338ca', '#3730a3', '#312e81'],
  'Energía':    ['#f59e0b', '#fbbf24', '#fcd34d', '#d97706', '#b45309'],
  'Consumo':    ['#ec4899', '#f472b6', '#db2777', '#be185d', '#9d174d'],
  'ETF':        ['#8b5cf6', '#a78bfa', '#7c3aed', '#6d28d9'],
  'Financiero': ['#10b981', '#34d399', '#059669', '#047857'],
  'Renta Fija': ['#06b6d4', '#22d3ee', '#0891b2'],
  'Efectivo':   ['#64748b', '#94a3b8'],
}

export interface DistItem {
  label: string       // ticker
  sublabel?: string   // full name
  value: number       // USD value
  sector: string
}

interface TooltipProps {
  active?: boolean
  payload?: Array<{ payload: DistItem & { pct: number; color: string } }>
}

function CustomTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="font-bold text-slate-100">{d.label}</p>
      {d.sublabel && <p className="text-slate-400 mb-1">{d.sublabel}</p>}
      <p className="font-mono text-slate-200">{formatCurrency(d.value)}</p>
      <p className="font-mono text-slate-400">{d.pct.toFixed(1)}%</p>
    </div>
  )
}

export function PortfolioDistChart({ items }: { items: DistItem[] }) {
  const total = items.reduce((s, i) => s + i.value, 0)

  const colorCounters: Record<string, number> = {}
  const data = items
    .filter(i => i.value > 0)
    .sort((a, b) => b.value - a.value)
    .map(i => {
      const palette = SECTOR_PALETTE[i.sector] ?? ['#6366f1']
      const idx = colorCounters[i.sector] ?? 0
      colorCounters[i.sector] = idx + 1
      return {
        ...i,
        pct: total > 0 ? (i.value / total) * 100 : 0,
        color: palette[idx % palette.length],
      }
    })

  return (
    <div className="flex flex-col gap-3">
      {/* Donut */}
      <div className="relative h-44">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" innerRadius={52} outerRadius={80} paddingAngle={1.5} dataKey="value" strokeWidth={0}>
              {data.map((d, i) => <Cell key={i} fill={d.color} />)}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <p className="text-[10px] text-slate-500 uppercase tracking-wide">Total</p>
          <p className="text-sm font-bold font-mono text-slate-100">{formatCurrency(total)}</p>
        </div>
      </div>

      {/* Legend list */}
      <div className="space-y-1 max-h-56 overflow-y-auto pr-0.5">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-2 py-0.5">
            <div className="w-2 h-2 rounded-sm flex-shrink-0" style={{ backgroundColor: d.color }} />
            <span className="text-xs font-mono font-semibold text-slate-200 w-12 flex-shrink-0">{d.label}</span>
            <div className="flex-1 h-1 bg-slate-700/60 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(d.pct, 100)}%`, backgroundColor: d.color + 'cc' }} />
            </div>
            <span className="text-xs font-mono text-slate-500 w-10 text-right flex-shrink-0">{d.pct.toFixed(1)}%</span>
            <span className="text-xs font-mono text-slate-300 w-20 text-right flex-shrink-0">{formatCurrency(d.value)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
