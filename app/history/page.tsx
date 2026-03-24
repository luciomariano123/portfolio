'use client'

import { useMemo, useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, ReferenceDot } from 'recharts'
import { loadHistory } from '@/lib/history-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency, formatPercent, getPnlColor } from '@/lib/utils'
import { TrendingUp, TrendingDown } from 'lucide-react'

function getYearReturn(data: { date: string; value: number }[], year: number) {
  const lastPrevYear = [...data].reverse().find(d => d.date <= `${year - 1}-12-31`)
  const today = new Date().toISOString().slice(0, 10)
  const lastThisYear = [...data].reverse().find(d => d.date <= today && d.date.startsWith(`${year}`))
  if (!lastPrevYear || !lastThisYear) return null
  return ((lastThisYear.value - lastPrevYear.value) / lastPrevYear.value) * 100
}

function getFullYearReturn(data: { date: string; value: number }[], year: number) {
  const start = [...data].reverse().find(d => d.date <= `${year - 1}-12-31`)
  const end   = [...data].reverse().find(d => d.date <= `${year}-12-31`)
  if (!start || !end || start.date === end.date) return null
  return ((end.value - start.value) / start.value) * 100
}

function getMaxDrawdown(data: { date: string; value: number }[]) {
  let peak = data[0]?.value ?? 0
  let maxDD = 0
  for (const d of data) {
    if (d.value > peak) peak = d.value
    const dd = peak > 0 ? (peak - d.value) / peak * 100 : 0
    if (dd > maxDD) maxDD = dd
  }
  return -maxDD
}

function getBestWorstMonth(data: { date: string; value: number }[]) {
  const monthly: Record<string, { start: number; end: number }> = {}
  for (const d of data) {
    const key = d.date.slice(0, 7)
    if (!monthly[key]) monthly[key] = { start: d.value, end: d.value }
    monthly[key].end = d.value
  }
  const returns = Object.entries(monthly).map(([m, v]) => ({
    month: m,
    ret: v.start > 0 ? ((v.end - v.start) / v.start) * 100 : 0,
  }))
  if (returns.length === 0) return { best: null, worst: null }
  const best  = returns.reduce((a, b) => a.ret > b.ret ? a : b)
  const worst = returns.reduce((a, b) => a.ret < b.ret ? a : b)
  return { best, worst }
}

const MONTH_LABEL: Record<string, string> = {
  '01': 'Ene', '02': 'Feb', '03': 'Mar', '04': 'Abr',
  '05': 'May', '06': 'Jun', '07': 'Jul', '08': 'Ago',
  '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dic',
}

interface SpyDataPoint { date: string; spy: number }

export default function HistoryPage() {
  const [history, setHistory] = useState<{ date: string; value: number }[]>([])
  const [mounted, setMounted] = useState(false)
  const [showBenchmark, setShowBenchmark] = useState(false)
  const [spyData, setSpyData] = useState<SpyDataPoint[]>([])
  const [spyLoading, setSpyLoading] = useState(false)

  useEffect(() => {
    setMounted(true)
    setHistory(loadHistory())
  }, [])

  // Fetch SPY when benchmark toggled on
  useEffect(() => {
    if (!showBenchmark || spyData.length > 0) return
    setSpyLoading(true)
    fetch('/api/benchmark')
      .then(r => r.json())
      .then((data: SpyDataPoint[]) => { setSpyData(data); setSpyLoading(false) })
      .catch(() => setSpyLoading(false))
  }, [showBenchmark, spyData.length])

  const first = history[0]
  const last  = history[history.length - 1]
  const today = new Date().toISOString().slice(0, 10)

  const totalReturn = useMemo(() => {
    if (!first || !last) return 0
    return ((last.value - first.value) / first.value) * 100
  }, [first, last])

  const ytd2026  = useMemo(() => getYearReturn(history, 2026), [history])
  const ret2025  = useMemo(() => getFullYearReturn(history, 2025), [history])
  const ret2024  = useMemo(() => getFullYearReturn(history, 2024), [history])
  const maxDD    = useMemo(() => getMaxDrawdown(history), [history])
  const { best } = useMemo(() => getBestWorstMonth(history), [history])

  // Chart data — normalized vs absolute depending on benchmark mode
  const chartData = useMemo(() => {
    if (showBenchmark && spyData.length > 0) {
      const spyMap = new Map(spyData.map(s => [s.date, s.spy]))
      const base = history[0]?.value ?? 1
      return history.map(d => ({
        ...d,
        isToday: d.date === today,
        portfolio: Math.round((d.value / base) * 10000) / 100,
        spy: spyMap.get(d.date) ?? null,
      }))
    }
    return history.map(d => ({ ...d, isToday: d.date === today, portfolio: null as number | null, spy: null as number | null }))
  }, [history, spyData, showBenchmark, today])

  const isLive = last?.date === today

  if (!mounted) return null

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-[1400px]">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Evolución Histórica</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Datos reales de la cartera — {history.length} snapshots desde {first?.date ?? '—'}
          </p>
        </div>
        {last && (
          <div className="text-right">
            <p className="text-xs text-slate-500 mb-0.5">Último snapshot {isLive ? '(hoy)' : last.date}</p>
            <p className="text-lg font-bold font-mono text-slate-100">{formatCurrency(last.value)}</p>
          </div>
        )}
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          {
            label: 'Rendimiento Total',
            value: formatPercent(totalReturn),
            color: getPnlColor(totalReturn),
          },
          {
            label: 'YTD 2026',
            value: ytd2026 !== null ? formatPercent(ytd2026) : '—',
            color: ytd2026 !== null ? getPnlColor(ytd2026) : 'text-slate-400',
          },
          {
            label: 'Año 2025',
            value: ret2025 !== null ? formatPercent(ret2025) : '—',
            color: ret2025 !== null ? getPnlColor(ret2025) : 'text-slate-400',
          },
          {
            label: 'Año 2024',
            value: ret2024 !== null ? formatPercent(ret2024) : '—',
            color: ret2024 !== null ? getPnlColor(ret2024) : 'text-slate-400',
          },
          {
            label: 'Drawdown máx.',
            value: formatPercent(maxDD),
            color: 'text-red-400',
          },
          {
            label: 'Mejor mes',
            value: best ? `${MONTH_LABEL[best.month.slice(5)] ?? ''} ${best.month.slice(0,4)} ${formatPercent(best.ret)}` : '—',
            color: 'text-emerald-400',
          },
        ].map(m => (
          <Card key={m.label}>
            <CardContent className="p-4">
              <p className="text-xs text-slate-500 mb-1">{m.label}</p>
              <p className={`text-lg font-bold font-mono ${m.color}`}>{m.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main chart */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle>Cartera total — USD</CardTitle>
              <p className="text-xs text-slate-500 mt-0.5">CEDEARs + efectivo USD + ONs a valor de mercado</p>
            </div>
            <div className="flex items-center gap-3">
              {/* Feature 6: Benchmark toggle */}
              <button
                onClick={() => setShowBenchmark(b => !b)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  showBenchmark
                    ? 'bg-orange-500/15 border-orange-500/30 text-orange-400'
                    : 'bg-slate-700/40 border-slate-600 text-slate-400 hover:text-slate-200'
                }`}
              >
                {spyLoading ? (
                  <span className="w-3 h-3 rounded-full border border-current border-t-transparent animate-spin" />
                ) : (
                  <span className="w-2 h-2 rounded-full bg-orange-400" />
                )}
                vs SPY
              </button>
              <div className={`flex items-center gap-1 text-sm font-mono font-bold ${getPnlColor(totalReturn)}`}>
                {totalReturn >= 0 ? <TrendingUp size={14}/> : <TrendingDown size={14}/>}
                {formatPercent(totalReturn)} total
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {showBenchmark && spyData.length > 0 ? (
            // Normalized chart with both lines
            <>
              <div className="flex items-center gap-4 mb-3 text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-0.5 bg-indigo-400 rounded" />
                  <span className="text-slate-400">Cartera (base 100)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-0.5 bg-orange-400 rounded" />
                  <span className="text-slate-400">SPY (base 100)</span>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={360}>
                <LineChart data={chartData} margin={{ top: 5, right: 24, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" strokeOpacity={0.4} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={v => {
                      const [y, m] = v.split('-')
                      return `${MONTH_LABEL[m] ?? m}/${String(y).slice(2)}`
                    }}
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    axisLine={{ stroke: '#334155' }}
                    tickLine={false}
                    interval={Math.floor(history.length / 10)}
                  />
                  <YAxis
                    tickFormatter={v => `${v}`}
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={44}
                    domain={['auto', 'auto']}
                  />
                  <Tooltip
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    formatter={(v: any, name: any) => [
                      `${Number(v).toFixed(1)}`,
                      name === 'portfolio' ? 'Cartera' : 'SPY',
                    ]}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    labelFormatter={(l: any) => new Date(String(l) + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })}
                    contentStyle={{ background: '#1e293b', border: '1px solid #475569', borderRadius: 8 }}
                    labelStyle={{ color: '#94a3b8' }}
                    itemStyle={{ color: '#e2e8f0' }}
                  />
                  <ReferenceLine y={100} stroke="#475569" strokeDasharray="4 2" strokeOpacity={0.5} />
                  <Line
                    type="monotone"
                    dataKey="portfolio"
                    stroke="#6366f1"
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 4, fill: '#6366f1', strokeWidth: 0 }}
                    connectNulls={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="spy"
                    stroke="#f97316"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, fill: '#f97316', strokeWidth: 0 }}
                    connectNulls={false}
                    strokeDasharray="6 2"
                  />
                </LineChart>
              </ResponsiveContainer>
            </>
          ) : (
            // Absolute value chart
            <ResponsiveContainer width="100%" height={360}>
              <LineChart data={chartData} margin={{ top: 5, right: 24, left: 10, bottom: 5 }}>
                <defs>
                  <linearGradient id="histGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#6366f1" />
                    <stop offset="100%" stopColor="#8b5cf6" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" strokeOpacity={0.4} />
                <XAxis
                  dataKey="date"
                  tickFormatter={v => {
                    const [y, m] = v.split('-')
                    return `${MONTH_LABEL[m] ?? m}/${String(y).slice(2)}`
                  }}
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  axisLine={{ stroke: '#334155' }}
                  tickLine={false}
                  interval={Math.floor(history.length / 10)}
                />
                <YAxis
                  tickFormatter={v => '$' + (v / 1000).toFixed(0) + 'k'}
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={52}
                  domain={['auto', 'auto']}
                />
                <Tooltip
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(v: any) => [formatCurrency(Number(v)), 'Cartera total']}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  labelFormatter={(l: any) => new Date(String(l) + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  contentStyle={{ background: '#1e293b', border: '1px solid #475569', borderRadius: 8 }}
                  labelStyle={{ color: '#94a3b8' }}
                  itemStyle={{ color: '#e2e8f0' }}
                />
                <ReferenceLine x="2025-01-01" stroke="#4f46e5" strokeDasharray="4 2" strokeOpacity={0.5}
                  label={{ value: '2025', fill: '#6366f1', fontSize: 10, position: 'insideTopRight' }} />
                <ReferenceLine x="2026-01-01" stroke="#4f46e5" strokeDasharray="4 2" strokeOpacity={0.5}
                  label={{ value: '2026', fill: '#6366f1', fontSize: 10, position: 'insideTopRight' }} />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="url(#histGrad)"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 4, fill: '#6366f1', strokeWidth: 0 }}
                />
                {isLive && last && (
                  <ReferenceDot x={last.date} y={last.value} r={6} fill="#10b981" stroke="#064e3b" strokeWidth={2} />
                )}
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Annual returns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Rendimiento por Año</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-8 items-end justify-center py-4">
              {([
                { year: 2024, ret: ret2024, label: '2024' },
                { year: 2025, ret: ret2025, label: '2025' },
                { year: 2026, ret: ytd2026, label: '2026 YTD' },
              ]).map(({ ret, label }) => {
                if (ret === null) return null
                const isPos = ret >= 0
                const barH = Math.min(Math.abs(ret) * 7, 160)
                return (
                  <div key={label} className="flex flex-col items-center gap-2">
                    <span className={`text-sm font-bold font-mono ${getPnlColor(ret)}`}>{formatPercent(ret)}</span>
                    <div className="w-20 rounded-t-lg" style={{
                      height: barH,
                      background: isPos
                        ? 'linear-gradient(to top, #10b981, #34d399)'
                        : 'linear-gradient(to top, #ef4444, #f87171)',
                    }} />
                    <span className="text-sm text-slate-400 font-medium">{label}</span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Recent snapshots table */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Últimos registros</CardTitle>
          </CardHeader>
          <CardContent className="p-0 pb-3">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700/50">
                    {['Fecha', 'Valor total', 'Cambio'].map(h => (
                      <th key={h} className="text-left py-2 px-4 text-xs font-medium text-slate-400 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/30">
                  {[...history].reverse().slice(0, 10).map((snap, i, arr) => {
                    const prev = arr[i + 1]
                    const chg = prev ? ((snap.value - prev.value) / prev.value) * 100 : null
                    const isToday = snap.date === today
                    return (
                      <tr key={snap.date} className={`hover:bg-slate-700/20 transition-colors ${isToday ? 'bg-emerald-500/5' : ''}`}>
                        <td className="py-2 px-4 font-mono text-xs text-slate-400">
                          {isToday ? <span className="text-emerald-400 font-semibold">Hoy</span> : snap.date}
                        </td>
                        <td className="py-2 px-4 font-mono font-semibold text-slate-100">{formatCurrency(snap.value)}</td>
                        <td className="py-2 px-4 font-mono text-xs">
                          {chg !== null ? (
                            <span className={getPnlColor(chg)}>
                              {chg >= 0 ? '+' : ''}{formatPercent(chg)}
                            </span>
                          ) : '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
