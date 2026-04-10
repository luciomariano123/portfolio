'use client'

import { useState, useMemo } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import { HISTORICAL_DATA } from '@/lib/portfolio-data'
import { formatCurrency, formatDate, formatPercent } from '@/lib/utils'
import { cn } from '@/lib/utils'

type Range = '1M' | '3M' | '6M' | 'YTD' | '1A' | 'TODO'

const RANGES: Range[] = ['1M', '3M', '6M', 'YTD', '1A', 'TODO']

function filterByRange(data: typeof HISTORICAL_DATA, range: Range) {
  const now = new Date()
  const yr = now.getFullYear()

  // Use string comparison (dates stored as YYYY-MM-DD) to avoid timezone issues
  let cutoffStr: string
  switch (range) {
    case 'TODO': return data
    case 'YTD': cutoffStr = `${yr - 1}-12-31`; break  // include Dec 31 as baseline
    case '1M':  { const d = new Date(now); d.setMonth(d.getMonth() - 1);       cutoffStr = d.toISOString().slice(0, 10); break }
    case '3M':  { const d = new Date(now); d.setMonth(d.getMonth() - 3);       cutoffStr = d.toISOString().slice(0, 10); break }
    case '6M':  { const d = new Date(now); d.setMonth(d.getMonth() - 6);       cutoffStr = d.toISOString().slice(0, 10); break }
    case '1A':  { const d = new Date(now); d.setFullYear(d.getFullYear() - 1); cutoffStr = d.toISOString().slice(0, 10); break }
    default: return data
  }

  return data.filter(d => d.date >= cutoffStr)
}

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{ value: number; payload: { date: string; quotaPart: number } }>
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="bg-slate-800 border border-slate-600 rounded-lg p-3 shadow-xl">
      <p className="text-slate-400 text-xs mb-1">{formatDate(d.date)}</p>
      <p className="text-slate-100 font-bold text-sm">
        {d.quotaPart.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
      </p>
    </div>
  )
}

export function EvolutionChart({ liveValue }: { liveValue?: number }) {
  const [range, setRange] = useState<Range>('TODO')

  const dataWithLive = useMemo(() => {
    if (!liveValue || liveValue <= 0) return HISTORICAL_DATA
    const today = new Date().toISOString().slice(0, 10)
    const last = HISTORICAL_DATA[HISTORICAL_DATA.length - 1]
    if (last?.date === today) return HISTORICAL_DATA
    return [...HISTORICAL_DATA, { date: today, quotaPart: liveValue }]
  }, [liveValue])

  const filteredData = useMemo(() => filterByRange(dataWithLive, range), [dataWithLive, range])

  const firstValue = filteredData[0]?.quotaPart ?? 0
  const lastValue = filteredData[filteredData.length - 1]?.quotaPart ?? 0
  const totalReturn = firstValue > 0 ? ((lastValue - firstValue) / firstValue) * 100 : 0
  const isPositive = totalReturn >= 0

  const minVal = Math.min(...filteredData.map(d => d.quotaPart))
  const maxVal = Math.max(...filteredData.map(d => d.quotaPart))
  const padding = (maxVal - minVal) * 0.1

  return (
    <div className="space-y-4">
      {/* Header with range selector */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-slate-400 text-xs">Rendimiento periodo</p>
          <p className={`text-xl font-bold ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
            {formatPercent(totalReturn)}
          </p>
        </div>
        <div className="flex gap-1">
          {RANGES.map(r => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-lg transition-all',
                range === r
                  ? 'bg-indigo-500 text-white'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700'
              )}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={filteredData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
          <defs>
            <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={isPositive ? '#6366f1' : '#ef4444'} />
              <stop offset="100%" stopColor={isPositive ? '#8b5cf6' : '#f97316'} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" strokeOpacity={0.5} />
          <XAxis
            dataKey="date"
            tickFormatter={(v) => {
              const d = new Date(v)
              return `${d.getDate()}/${d.getMonth() + 1}`
            }}
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            axisLine={{ stroke: '#334155' }}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[minVal - padding, maxVal + padding]}
            tickFormatter={(v) => (v / 1000).toFixed(0) + 'k'}
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={40}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={firstValue} stroke="#475569" strokeDasharray="4 4" strokeOpacity={0.6} />
          <Line
            type="monotone"
            dataKey="quotaPart"
            stroke="url(#lineGrad)"
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 4, fill: '#6366f1', strokeWidth: 0 }}
          />
        </LineChart>
      </ResponsiveContainer>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 pt-2 border-t border-slate-700/50">
        <div>
          <p className="text-xs text-slate-500">Valor inicial</p>
          <p className="text-sm font-semibold text-slate-300">
            {firstValue.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Valor actual</p>
          <p className="text-sm font-semibold text-slate-100">
            {lastValue.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Variación</p>
          <p className={`text-sm font-semibold ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
            {(lastValue - firstValue).toLocaleString('es-AR', { maximumFractionDigits: 0 })}
          </p>
        </div>
      </div>
    </div>
  )
}
