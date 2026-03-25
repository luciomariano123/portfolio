'use client'

import { useMemo } from 'react'
import { usePrices } from '@/hooks/usePrices'
import { usePositions } from '@/hooks/usePositions'
import { COUPON_SCHEDULE, HISTORICAL_DATA, CASH_POSITIONS, FIXED_INCOME, SECTOR_COLORS } from '@/lib/portfolio-data'
import { formatCurrency, formatPercent, getPnlColor, getPnlBg } from '@/lib/utils'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

// ── Types ────────────────────────────────────────────────────────────────────

type RecType = 'alerta' | 'sugerencia' | 'positivo'

interface Rec {
  tipo: RecType
  titulo: string
  detalle: string
}

interface PositionWithMetrics {
  ticker: string
  name: string
  sector: string
  value: number
  pct: number
  pnlPct: number
  ppc: number
  quantity: number
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const REC_STYLES: Record<RecType, { bg: string; border: string; text: string; icon: string }> = {
  alerta:     { bg: 'bg-red-500/10',    border: 'border-red-500/25',    text: 'text-red-400',    icon: '⚠️' },
  sugerencia: { bg: 'bg-amber-500/10',  border: 'border-amber-500/25',  text: 'text-amber-400',  icon: '💡' },
  positivo:   { bg: 'bg-emerald-500/10', border: 'border-emerald-500/25', text: 'text-emerald-400', icon: '✅' },
}

function herfindahl(weights: number[]): number {
  return weights.reduce((s, w) => s + w * w, 0)
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AnalisisPage() {
  const { positions: rawPositions, consolidated, mounted } = usePositions()

  // Tickers for price fetching
  const allTickerYFs = useMemo(
    () => [...new Set(consolidated.map(p => p.tickerYF))],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [consolidated.map(p => p.tickerYF).join(',')]
  )

  const { prices, loading } = usePrices(allTickerYFs, 60000)

  // Compute position metrics
  const posMetrics: PositionWithMetrics[] = useMemo(() => {
    if (!mounted || allTickerYFs.length === 0) return []
    const rows: PositionWithMetrics[] = []
    for (const pos of consolidated) {
      const pd = prices[pos.tickerYF]
      if (!pd) continue
      const price = pd.price
      const value = pos.quantity * price
      const costBasis = pos.quantity * pos.ppc
      const pnlPct = costBasis > 0 ? ((value - costBasis) / costBasis) * 100 : 0
      rows.push({
        ticker: pos.ticker,
        name: pos.name,
        sector: pos.sector ?? 'Otro',
        value,
        pct: 0, // filled below
        pnlPct,
        ppc: pos.ppc,
        quantity: pos.quantity,
      })
    }
    const totalVal = rows.reduce((s, r) => s + r.value, 0)
    for (const r of rows) r.pct = totalVal > 0 ? (r.value / totalVal) * 100 : 0
    return rows.sort((a, b) => b.value - a.value)
  }, [mounted, prices, consolidated, allTickerYFs])

  // Sector distribution
  const sectorData = useMemo(() => {
    const map: Record<string, number> = {}
    for (const p of posMetrics) {
      map[p.sector] = (map[p.sector] ?? 0) + p.value
    }
    const total = Object.values(map).reduce((s, v) => s + v, 0)
    return Object.entries(map)
      .map(([sector, value]) => ({ sector, value, pct: total > 0 ? (value / total) * 100 : 0 }))
      .sort((a, b) => b.value - a.value)
  }, [posMetrics])

  // Cash + ONs
  const cashUSD = CASH_POSITIONS.filter(c => c.currency === 'USD').reduce((s, c) => s + c.amount, 0)
  const onValue = FIXED_INCOME.reduce((s, fi) => s + fi.nominal, 0)
  const cedearTotal = posMetrics.reduce((s, p) => s + p.value, 0)
  const grandTotal = cedearTotal + cashUSD + onValue

  const cashPct = grandTotal > 0 ? (cashUSD / grandTotal) * 100 : 0
  const onPct = grandTotal > 0 ? (onValue / grandTotal) * 100 : 0

  // YTD
  const now = new Date()
  const ytdBase = HISTORICAL_DATA
    .filter(d => d.date <= `${now.getFullYear() - 1}-12-31`)
    .at(-1)
  const ytdPct = ytdBase ? ((grandTotal - ytdBase.quotaPart) / ytdBase.quotaPart) * 100 : 0

  // Risk metrics
  const techPct = sectorData.find(s => s.sector === 'Tecnología')?.pct ?? 0
  const argPct = (sectorData.find(s => s.sector === 'Energía')?.pct ?? 0) // PAMP/TGS/YPF are all Energía here

  const numSectors = sectorData.length
  const weights = sectorData.map(s => s.pct / 100)
  const hhi = herfindahl(weights)
  const diversScore = Math.max(0, Math.min(100, Math.round((1 - hhi) * 100 * (numSectors / 5))))

  const top3pct = posMetrics.slice(0, 3).reduce((s, p) => s + p.pct, 0)

  // Upcoming coupons (90 days)
  const todayStr = now.toISOString().slice(0, 10)
  const in90 = new Date(now)
  in90.setDate(in90.getDate() + 90)
  const in90Str = in90.toISOString().slice(0, 10)
  const upcomingCoupons = COUPON_SCHEDULE.filter(
    c => !c.paid && c.date >= todayStr && c.date <= in90Str
  ).sort((a, b) => a.date.localeCompare(b.date))

  // Recommendations engine
  const recs: Rec[] = useMemo(() => {
    if (!mounted || posMetrics.length === 0) return []
    const result: Rec[] = []

    // 1. Tech concentration
    if (techPct > 55)
      result.push({ tipo: 'alerta', titulo: 'Alta concentración en Tecnología', detalle: `${techPct.toFixed(0)}% en tech. Considera reducir y diversificar en otros sectores.` })

    // 2. Argentina risk (Energía proxy for PAMP/TGS/YPF)
    if (argPct > 30)
      result.push({ tipo: 'alerta', titulo: 'Alta exposición Argentina', detalle: `${argPct.toFixed(0)}% en activos argentinos (PAMP/TGS/YPF). Riesgo país elevado.` })

    // 3. Single position overweight
    for (const pos of posMetrics) {
      if (pos.pct > 20)
        result.push({ tipo: 'alerta', titulo: `${pos.ticker} sobreponderado`, detalle: `${pos.pct.toFixed(0)}% de la cartera. Considera reducir para limitar riesgo específico.` })
    }

    // 4. Take profits
    for (const pos of posMetrics) {
      if (pos.pnlPct > 60)
        result.push({ tipo: 'sugerencia', titulo: `Tomar ganancias en ${pos.ticker}`, detalle: `+${pos.pnlPct.toFixed(0)}% de ganancia total. Podrías realizarlas parcialmente.` })
    }

    // 5. Stop loss candidate
    for (const pos of posMetrics) {
      if (pos.pnlPct < -20)
        result.push({ tipo: 'alerta', titulo: `Revisar tesis en ${pos.ticker}`, detalle: `${pos.pnlPct.toFixed(0)}% bajo agua. Evaluar si el caso de inversión sigue válido.` })
    }

    // 6. Cash low
    if (cashPct < 5)
      result.push({ tipo: 'sugerencia', titulo: 'Baja liquidez', detalle: 'Menos del 5% en cash. Difícil aprovechar caídas para comprar.' })

    // 7. ONs underweight
    if (onPct < 12)
      result.push({ tipo: 'sugerencia', titulo: 'Aumentar renta fija', detalle: `ONs representan ${onPct.toFixed(0)}% del portafolio. Podrías aumentar para reducir volatilidad.` })

    // 8. Good diversification
    if (numSectors >= 4 && techPct < 55)
      result.push({ tipo: 'positivo', titulo: 'Buena diversificación sectorial', detalle: `${numSectors} sectores en cartera con distribución razonable.` })

    // 9. YTD positive
    if (ytdPct > 5)
      result.push({ tipo: 'positivo', titulo: `YTD sólido: +${ytdPct.toFixed(1)}%`, detalle: 'La cartera viene superando la inflación esperada del año.' })

    return result
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, posMetrics, techPct, argPct, cashPct, onPct, numSectors, ytdPct])

  const dateStr = now.toLocaleDateString('es-AR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  if (!mounted) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 max-w-[1400px]">

      {/* ── Header ── */}
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Análisis de Cartera</h1>
        <p className="text-slate-400 text-sm mt-0.5 capitalize">{dateStr}</p>
      </div>

      {/* ── Resumen de Riesgo ── */}
      <section>
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">Resumen de Riesgo</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Diversificación */}
          <div className="bg-slate-800 rounded-xl p-5">
            <p className="text-xs text-slate-500 mb-1">Diversificación</p>
            <p className="text-3xl font-bold text-slate-100">{diversScore}<span className="text-lg text-slate-400">/100</span></p>
            <div className="mt-3 h-2 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${diversScore}%`,
                  background: diversScore >= 70 ? '#10b981' : diversScore >= 40 ? '#f59e0b' : '#ef4444',
                }}
              />
            </div>
            <p className="text-xs text-slate-500 mt-2">{numSectors} sectores · HHI {hhi.toFixed(2)}</p>
          </div>

          {/* Concentración Top 3 */}
          <div className="bg-slate-800 rounded-xl p-5">
            <p className="text-xs text-slate-500 mb-1">Concentración Top 3</p>
            <p className="text-3xl font-bold text-slate-100">{top3pct.toFixed(0)}<span className="text-lg text-slate-400">%</span></p>
            <div className="mt-3 h-2 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(top3pct, 100)}%`,
                  background: top3pct > 60 ? '#ef4444' : top3pct > 40 ? '#f59e0b' : '#10b981',
                }}
              />
            </div>
            <p className="text-xs text-slate-500 mt-2">
              {posMetrics.slice(0, 3).map(p => p.ticker).join(' / ')}
            </p>
          </div>

          {/* Exposición Argentina */}
          <div className="bg-slate-800 rounded-xl p-5">
            <p className="text-xs text-slate-500 mb-1">Exposición Argentina</p>
            <p className="text-3xl font-bold text-slate-100">{argPct.toFixed(0)}<span className="text-lg text-slate-400">%</span></p>
            <div className="mt-3 h-2 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(argPct, 100)}%`,
                  background: argPct > 30 ? '#ef4444' : argPct > 20 ? '#f59e0b' : '#10b981',
                }}
              />
            </div>
            <p className="text-xs text-slate-500 mt-2">PAMP · TGSU2 · YPF</p>
          </div>
        </div>
      </section>

      {/* ── Distribución Sectorial ── */}
      <section>
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">Distribución Sectorial</h2>
        <div className="bg-slate-800 rounded-xl p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Donut chart */}
            <div className="h-48">
              {loading ? (
                <div className="h-full flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={sectorData}
                      dataKey="value"
                      nameKey="sector"
                      cx="50%"
                      cy="50%"
                      innerRadius="55%"
                      outerRadius="80%"
                      paddingAngle={2}
                    >
                      {sectorData.map((entry) => (
                        <Cell
                          key={entry.sector}
                          fill={SECTOR_COLORS[entry.sector] ?? '#6366f1'}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => [formatCurrency(Number(value ?? 0)), 'Valor']}
                      contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
                      labelStyle={{ color: '#94a3b8' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Bars */}
            <div className="space-y-3 self-center">
              {sectorData.map(({ sector, pct }) => (
                <div key={sector}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-200">{sector}</span>
                    <span className="text-slate-400 font-mono">{pct.toFixed(1)}%</span>
                  </div>
                  <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${pct}%`,
                        background: SECTOR_COLORS[sector] ?? '#6366f1',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Top Posiciones por Peso ── */}
      <section>
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">Top Posiciones por Peso</h2>
        <div className="bg-slate-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700/50">
                <th className="text-left px-4 py-3 text-slate-400 font-medium">Ticker</th>
                <th className="text-right px-4 py-3 text-slate-400 font-medium">Valor</th>
                <th className="text-right px-4 py-3 text-slate-400 font-medium">Peso</th>
                <th className="text-right px-4 py-3 text-slate-400 font-medium">P&L%</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/30">
              {loading && posMetrics.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                    Cargando precios...
                  </td>
                </tr>
              ) : (
                posMetrics.map((pos) => (
                  <tr key={pos.ticker} className="hover:bg-slate-700/20 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-100">{pos.ticker}</div>
                      <div className="text-xs text-slate-500 truncate max-w-[120px]">{pos.name}</div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-slate-200">
                      {formatCurrency(pos.value)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-indigo-500 rounded-full"
                            style={{ width: `${Math.min(pos.pct, 100)}%` }}
                          />
                        </div>
                        <span className="font-mono text-slate-300 text-xs w-10 text-right">
                          {pos.pct.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`px-2 py-0.5 rounded text-xs font-mono font-semibold ${getPnlBg(pos.pnlPct)}`}>
                        {formatPercent(pos.pnlPct)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Recomendaciones ── */}
      <section>
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">Recomendaciones</h2>
        {recs.length === 0 ? (
          <div className="bg-slate-800 rounded-xl p-5 text-slate-500 text-sm">
            No hay recomendaciones disponibles (esperando datos de precios).
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {recs.map((rec, i) => {
              const style = REC_STYLES[rec.tipo]
              return (
                <div
                  key={i}
                  className={`rounded-xl p-4 border ${style.bg} ${style.border}`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-lg leading-none mt-0.5">{style.icon}</span>
                    <div>
                      <p className={`text-sm font-bold ${style.text}`}>{rec.titulo}</p>
                      <p className="text-xs text-slate-400 mt-1">{rec.detalle}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* ── Próximos Cupones ONs ── */}
      <section>
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">Próximos Cupones ONs (90 días)</h2>
        <div className="bg-slate-800 rounded-xl p-5">
          {upcomingCoupons.length === 0 ? (
            <p className="text-slate-500 text-sm">No hay cupones en los próximos 90 días.</p>
          ) : (
            <div className="space-y-3">
              {upcomingCoupons.map((c) => {
                const [year, month, day] = c.date.split('-')
                const daysUntil = Math.ceil((new Date(c.date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
                return (
                  <div key={`${c.date}-${c.onTicker}`} className="flex items-center gap-4">
                    {/* Date badge */}
                    <div className="flex-shrink-0 text-center w-14">
                      <div className="text-xs text-slate-500">{new Date(c.date + 'T12:00:00').toLocaleDateString('es-AR', { month: 'short' }).toUpperCase()}</div>
                      <div className="text-xl font-bold text-slate-100 leading-tight">{day}</div>
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-200">{c.onName}</p>
                      <p className="text-xs text-slate-500">en {daysUntil} días</p>
                    </div>
                    {/* Amount */}
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-emerald-400">+{formatCurrency(c.amount)}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </section>

    </div>
  )
}
