'use client'

import { useState } from 'react'
import { usePrices } from '@/hooks/usePrices'
import { getConsolidatedPositions } from '@/lib/portfolio-data'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency, formatPercent, getPnlColor, getPnlBg } from '@/lib/utils'
import { TrendingUp, TrendingDown, Activity, BarChart3 } from 'lucide-react'

// Simple technical signal calculation
function calcSignals(price: number, prevClose: number) {
  const changePercent = prevClose > 0 ? ((price - prevClose) / prevClose) * 100 : 0

  // Simulated indicators (in production these would use real OHLCV data)
  const rsi = 40 + Math.random() * 30 // 40-70 range simulation
  const above200 = Math.random() > 0.4
  const aboveSMA50 = Math.random() > 0.35
  const bollingerPos = Math.random() // 0 = oversold, 1 = overbought

  const signals: { name: string; signal: 'BUY' | 'SELL' | 'NEUTRAL'; value: string }[] = [
    { name: 'RSI (14)', signal: rsi < 35 ? 'BUY' : rsi > 65 ? 'SELL' : 'NEUTRAL', value: rsi.toFixed(1) },
    { name: 'SMA 200', signal: above200 ? 'BUY' : 'SELL', value: above200 ? 'Precio > SMA200' : 'Precio < SMA200' },
    { name: 'SMA 50', signal: aboveSMA50 ? 'BUY' : 'SELL', value: aboveSMA50 ? 'Precio > SMA50' : 'Precio < SMA50' },
    { name: 'Bollinger', signal: bollingerPos < 0.2 ? 'BUY' : bollingerPos > 0.8 ? 'SELL' : 'NEUTRAL', value: `${(bollingerPos * 100).toFixed(0)}% banda` },
    { name: 'Momentum', signal: changePercent > 1 ? 'BUY' : changePercent < -1 ? 'SELL' : 'NEUTRAL', value: formatPercent(changePercent) },
  ]

  const buyCount = signals.filter(s => s.signal === 'BUY').length
  const sellCount = signals.filter(s => s.signal === 'SELL').length
  const score = (buyCount / signals.length) * 100

  return { signals, score, rsi }
}

const SIGNAL_STYLE = {
  BUY: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25',
  SELL: 'bg-red-500/15 text-red-400 border border-red-500/25',
  NEUTRAL: 'bg-slate-500/15 text-slate-400 border border-slate-500/25',
}

export default function AnalysisPage() {
  const positions = getConsolidatedPositions()
  const allTickers = [...new Set(positions.map(p => p.tickerYF))]
  const { prices, loading } = usePrices(allTickers, 60000)
  const [selected, setSelected] = useState(allTickers[0] ?? '')

  const selectedPos = positions.find(p => p.tickerYF === selected)
  const priceData = prices[selected]

  const analysis = priceData ? calcSignals(priceData.price, priceData.price - priceData.change) : null

  return (
    <div className="p-6 space-y-6 max-w-[1400px]">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Análisis Técnico</h1>
        <p className="text-slate-400 text-sm mt-0.5">Indicadores y señales por posición</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Ticker selector */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Seleccionar activo</CardTitle>
          </CardHeader>
          <CardContent className="p-0 pb-2">
            <div className="divide-y divide-slate-700/40">
              {allTickers.map(ticker => {
                const pos = positions.find(p => p.tickerYF === ticker)
                const pd = prices[ticker]
                return (
                  <button
                    key={ticker}
                    onClick={() => setSelected(ticker)}
                    className={`w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-700/30 transition-colors ${selected === ticker ? 'bg-indigo-500/10 border-r-2 border-indigo-500' : ''}`}
                  >
                    <div>
                      <p className={`text-sm font-semibold ${selected === ticker ? 'text-indigo-400' : 'text-slate-200'}`}>
                        {ticker}
                      </p>
                      <p className="text-xs text-slate-500">{pos?.name}</p>
                    </div>
                    {pd && (
                      <span className={`text-xs font-mono ${getPnlColor(pd.changePercent)}`}>
                        {formatPercent(pd.changePercent)}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Analysis panel */}
        <div className="lg:col-span-3 space-y-4">
          {/* Price header */}
          <Card>
            <CardContent className="p-5">
              <div className="flex items-start justify-between flex-wrap gap-4">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h2 className="text-2xl font-bold text-slate-100">{selected}</h2>
                    <span className="text-sm text-slate-400">{selectedPos?.name}</span>
                  </div>
                  {priceData ? (
                    <div className="flex items-center gap-4">
                      <span className="text-3xl font-bold text-slate-100 font-mono">
                        {formatCurrency(priceData.price)}
                      </span>
                      <div className={`flex items-center gap-1 text-sm font-mono ${getPnlColor(priceData.changePercent)}`}>
                        {priceData.changePercent >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                        {formatPercent(priceData.changePercent)} ({priceData.change >= 0 ? '+' : ''}{priceData.change.toFixed(2)})
                      </div>
                    </div>
                  ) : (
                    <div className="h-9 w-40 bg-slate-700 rounded animate-pulse" />
                  )}
                </div>
                {analysis && (
                  <div className="text-right">
                    <p className="text-xs text-slate-500 mb-1">Score técnico</p>
                    <div className={`text-xl font-bold ${analysis.score >= 60 ? 'text-emerald-400' : analysis.score <= 40 ? 'text-red-400' : 'text-amber-400'}`}>
                      {analysis.score.toFixed(0)}%
                    </div>
                    <p className="text-xs text-slate-500">
                      {analysis.score >= 60 ? 'Tendencia alcista' : analysis.score <= 40 ? 'Tendencia bajista' : 'Neutral'}
                    </p>
                  </div>
                )}
              </div>

              {/* Score bar */}
              {analysis && (
                <div className="mt-4">
                  <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${analysis.score}%`,
                        background: analysis.score >= 60 ? '#10b981' : analysis.score <= 40 ? '#ef4444' : '#f59e0b',
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-slate-500 mt-1">
                    <span>Venta</span>
                    <span>Neutral</span>
                    <span>Compra</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Indicators */}
          {analysis && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <BarChart3 size={16} className="text-indigo-400" />
                  <CardTitle className="text-sm">Indicadores técnicos</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analysis.signals.map(sig => (
                    <div key={sig.name} className="flex items-center justify-between">
                      <span className="text-sm text-slate-300">{sig.name}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-500 font-mono">{sig.value}</span>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${SIGNAL_STYLE[sig.signal]}`}>
                          {sig.signal === 'BUY' ? 'COMPRA' : sig.signal === 'SELL' ? 'VENTA' : 'NEUTRAL'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* All tickers overview */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Activity size={16} className="text-indigo-400" />
                <CardTitle className="text-sm">Resumen de cartera</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-0 pb-2">
              <div className="divide-y divide-slate-700/30">
                {allTickers.map(ticker => {
                  const pd = prices[ticker]
                  const pos = positions.find(p => p.tickerYF === ticker)
                  if (!pd) return null
                  const sig = pd.changePercent > 1.5 ? 'BUY' : pd.changePercent < -1.5 ? 'SELL' : 'NEUTRAL'
                  return (
                    <div key={ticker} className="flex items-center gap-3 px-4 py-2.5">
                      <div className="w-8 h-8 rounded bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-200">
                        {ticker.slice(0, 2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-200">{ticker}</p>
                        <p className="text-xs text-slate-500 truncate">{pos?.name}</p>
                      </div>
                      <div className="text-right mr-4">
                        <p className="text-sm font-mono text-slate-100">{formatCurrency(pd.price)}</p>
                        <p className={`text-xs font-mono ${getPnlColor(pd.changePercent)}`}>{formatPercent(pd.changePercent)}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${SIGNAL_STYLE[sig]}`}>
                        {sig === 'BUY' ? 'COMPRA' : sig === 'SELL' ? 'VENTA' : 'NEUTRAL'}
                      </span>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
