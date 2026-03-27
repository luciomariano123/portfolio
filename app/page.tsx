'use client'

import { useMemo, useState } from 'react'
import { usePrices, useDolar } from '@/hooks/usePrices'
import { usePositions } from '@/hooks/usePositions'
import { CASH_POSITIONS, FIXED_INCOME, HISTORICAL_DATA, INITIAL_CAPITAL } from '@/lib/portfolio-data'
import { SummaryCards } from '@/components/SummaryCards'
import { EvolutionChart } from '@/components/EvolutionChart'
import { SectorChart } from '@/components/SectorChart'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency, formatPercent, getPnlColor } from '@/lib/utils'
import { TrendingUp, TrendingDown, RefreshCw, Clock, Banknote, Send, Loader2, CheckCircle } from 'lucide-react'
import { loadRecentChanges, formatChangesForMessage } from '@/lib/changes-store'

export default function DashboardPage() {
  const { consolidated: positions, mounted } = usePositions()
  const allTickers = [...new Set(positions.map(p => p.tickerYF))]

  const { prices, loading, lastUpdated, refresh } = usePrices(allTickers, 60000)
  const { rates } = useDolar()

  const [sending, setSending]   = useState(false)
  const [sendState, setSendState] = useState<'idle' | 'ok' | 'error'>('idle')
  const [sendError, setSendError] = useState('')

  async function sendAiReport() {
    setSending(true)
    setSendState('idle')
    setSendError('')
    try {
      const recipients = JSON.parse(localStorage.getItem('whatsapp_recipients_v1') ?? '[]') as string[]
      const recentChanges = loadRecentChanges(7)
      const changesText = formatChangesForMessage(recentChanges)
      const res = await fetch('/api/whatsapp/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret: 'portfolio_cron_2026', recipients, changesText }),
      })
      const data = await res.json().catch(() => ({})) as { error?: string; preview?: string; sent?: number }
      if (res.ok) {
        setSendState('ok')
        setSendError(`Enviado a ${data.sent ?? 1} destinatario(s)`)
      } else {
        setSendState('error')
        setSendError(data.error ?? `HTTP ${res.status}`)
      }
    } catch (e) {
      setSendState('error')
      setSendError(String(e))
    } finally {
      setSending(false)
      setTimeout(() => { setSendState('idle'); setSendError('') }, 6000)
    }
  }

  const stats = useMemo(() => {
    let totalValueUSD = 0
    let totalCostUSD = 0
    let prevDayValueUSD = 0

    for (const pos of positions) {
      const priceData = prices[pos.tickerYF]
      if (!priceData) continue

      const adrEquiv = pos.quantity / pos.ratio

      const currentValue = adrEquiv * priceData.price
      const prevValue = adrEquiv * (priceData.price - priceData.change)

      totalValueUSD += currentValue
      prevDayValueUSD += prevValue
      totalCostUSD += pos.quantity * pos.ppc  // ppc is per lámina
    }

    const cashUSD = CASH_POSITIONS
      .filter(c => c.currency === 'USD')
      .reduce((s, c) => s + c.amount, 0)
    const fiValue = FIXED_INCOME.reduce((s, f) => s + f.nominal, 0)

    const totalWithCash = totalValueUSD + cashUSD + fiValue
    const dailyPnlUSD = totalValueUSD - prevDayValueUSD
    const dailyPnlPct = prevDayValueUSD > 0 ? (dailyPnlUSD / prevDayValueUSD) * 100 : 0
    const totalPnlUSD = totalValueUSD - totalCostUSD
    const totalPnlPct = totalCostUSD > 0 ? (totalPnlUSD / totalCostUSD) * 100 : 0

    return { totalValueUSD: totalWithCash, totalCostUSD, totalPnlUSD, totalPnlPct, dailyPnlUSD, dailyPnlPct }
  }, [positions, prices])

  const movers = useMemo(() => {
    return positions
      .filter(p => prices[p.tickerYF])
      .map(p => ({
        ticker: p.ticker,
        name: p.name,
        changePercent: prices[p.tickerYF]?.changePercent ?? 0,
        price: prices[p.tickerYF]?.price ?? 0,
      }))
      .sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent))
      .slice(0, 6)
  }, [positions, prices])

  const ytdReturn = useMemo(() => {
    const currentYear = new Date().getFullYear()
    const ytdBase = HISTORICAL_DATA.filter(d => d.date <= `${currentYear - 1}-12-31`).at(-1)
    const base = ytdBase?.quotaPart ?? INITIAL_CAPITAL
    const last = HISTORICAL_DATA[HISTORICAL_DATA.length - 1]
    if (!last) return 0
    return ((last.quotaPart - base) / base) * 100
  }, [])

  const totalReturn = useMemo(() => {
    const last = HISTORICAL_DATA[HISTORICAL_DATA.length - 1]
    if (!last) return 0
    return ((last.quotaPart - INITIAL_CAPITAL) / INITIAL_CAPITAL) * 100
  }, [])

  if (!mounted) return null

  return (
    <div className="p-6 space-y-6 max-w-[1400px]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Dashboard</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Cartera consolidada — Balanz Lucio + Balanz Agropecuaria
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-xs flex items-center gap-1.5 text-slate-500">
              <Clock size={12} />
              {lastUpdated.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button
            onClick={refresh}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm border border-[var(--app-border)] bg-[var(--card-bg)] text-slate-400 hover:text-slate-200 hover:border-slate-600 transition-colors"
          >
            <RefreshCw size={13} />
            Actualizar
          </button>
          <button
            onClick={sendAiReport}
            disabled={sending || loading}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm border transition-colors disabled:opacity-50
              bg-emerald-600/20 border-emerald-500/30 text-emerald-400 hover:bg-emerald-600/30 hover:border-emerald-500/50"
          >
            {sending
              ? <Loader2 size={13} className="animate-spin" />
              : sendState === 'ok'
              ? <CheckCircle size={13} />
              : <Send size={13} />}
            {sending ? 'Generando...' : sendState === 'ok' ? 'Enviado' : sendState === 'error' ? 'Error' : 'Resumen IA'}
          </button>
        </div>
        {sendError && (
          <p className={`text-xs mt-1 ${sendState === 'error' ? 'text-red-400' : 'text-emerald-400'}`}>
            {sendError}
          </p>
        )}
      </div>

      <SummaryCards
        totalValueUSD={stats.totalValueUSD}
        totalPnlUSD={stats.totalPnlUSD}
        totalPnlPct={stats.totalPnlPct}
        dailyPnlUSD={stats.dailyPnlUSD}
        dailyPnlPct={stats.dailyPnlPct}
        dolarCCL={rates.ccl ?? 1430}
        dolarBlue={rates.blue ?? 1450}
        loading={loading}
      />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Evolución Cuota-Parte</CardTitle>
                <div className="flex gap-4 text-xs">
                  <div>
                    <span className="text-slate-500">YTD </span>
                    <span className={`font-mono ${getPnlColor(ytdReturn)}`}>{formatPercent(ytdReturn)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Total </span>
                    <span className={`font-mono ${getPnlColor(totalReturn)}`}>{formatPercent(totalReturn)}</span>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <EvolutionChart />
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Distribución por Sector</CardTitle>
          </CardHeader>
          <CardContent>
            <SectorChart prices={prices} positions={positions} />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Mayores Movimientos Hoy</CardTitle>
          </CardHeader>
          <CardContent className="p-0 pb-4">
            {loading ? (
              <div className="px-6 space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-10 bg-slate-700 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="divide-y divide-slate-700/40">
                {movers.map(m => (
                  <div key={m.ticker} className="flex items-center gap-3 px-6 py-3 hover:bg-slate-700/20 transition-colors">
                    <div className="w-9 h-9 rounded-lg bg-slate-700 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-slate-200">{m.ticker.slice(0, 2)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-100">{m.ticker}</p>
                      <p className="text-xs text-slate-500 truncate">{m.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-mono text-slate-200">{formatCurrency(m.price)}</p>
                      <div className={`flex items-center justify-end gap-1 text-xs font-mono ${getPnlColor(m.changePercent)}`}>
                        {m.changePercent >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                        {formatPercent(m.changePercent)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Efectivo y Renta Fija</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500 mb-2">Efectivo</p>
                {CASH_POSITIONS.map((c, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-slate-700/40">
                    <div className="flex items-center gap-2">
                      <Banknote size={14} className="text-slate-500" />
                      <span className="text-sm text-slate-300">{c.currency} — {c.account}</span>
                    </div>
                    <span className="text-sm font-mono font-medium text-slate-100">
                      {c.currency === 'USD' ? formatCurrency(c.amount) : `$${c.amount.toLocaleString('es-AR')}`}
                    </span>
                  </div>
                ))}
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500 mb-2">Obligaciones Negociables</p>
                {FIXED_INCOME.map((fi, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-slate-700/40">
                    <div>
                      <p className="text-sm font-medium text-slate-300">{fi.name}</p>
                      <p className="text-xs text-slate-500">{fi.rate}% — Vto. {fi.maturity.slice(0, 7)} — {fi.account}</p>
                    </div>
                    <span className="text-sm font-mono text-slate-100">{formatCurrency(fi.nominal)}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
