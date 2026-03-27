'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { usePrices, useDolar } from '@/hooks/usePrices'
import { usePositions } from '@/hooks/usePositions'
import { EditPositionModal } from '@/components/EditPositionModal'
import { EditablePosition, loadCash, saveCash, AccountCash } from '@/lib/positions-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatPercent, formatNumber, getPnlColor } from '@/lib/utils'
import { computeTotalPortfolioValue, saveTodaySnapshot } from '@/lib/history-store'
import { SECTOR_COLORS } from '@/lib/portfolio-data'
import {
  Plus, Pencil, Trash2, RefreshCw, Clock,
  TrendingUp, TrendingDown, Minus, AlertCircle, Check,
} from 'lucide-react'
import { Treemap, ResponsiveContainer, Tooltip } from 'recharts'

type AccountFilter = 'all' | 'Lucio' | 'Agro'
type TabType = 'positions' | 'ccl' | 'treemap'

const SECTOR_BADGE_COLORS: Record<string, string> = {
  'Tecnología': 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
  'Energía':    'text-amber-400 bg-amber-500/10 border-amber-500/20',
  'Financiero': 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  'Consumo':    'text-pink-400 bg-pink-500/10 border-pink-500/20',
  'ETF':        'text-purple-400 bg-purple-500/10 border-purple-500/20',
}

interface TreemapContentProps {
  x?: number
  y?: number
  width?: number
  height?: number
  name?: string
  sector?: string
  pnlPct?: number
  value?: number
  [key: string]: unknown
}

function CustomTreemapContent(props: TreemapContentProps) {
  const { x = 0, y = 0, width = 0, height = 0, name, sector, pnlPct = 0 } = props
  const sectorHex = (sector && SECTOR_COLORS[sector]) ?? '#6366f1'
  const pnlBg = pnlPct > 5 ? '#064e3b' : pnlPct > 0 ? '#022c22' : pnlPct > -5 ? '#450a0a' : '#7f1d1d'
  if (width < 40 || height < 30) return null
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} style={{ fill: pnlBg, stroke: sectorHex, strokeWidth: 2, strokeOpacity: 0.6 }} rx={4} />
      <text x={x + width / 2} y={y + height / 2 - 8} textAnchor="middle" fill="white" fontSize={Math.min(14, width / 5)} fontWeight="bold">{name}</text>
      {height > 50 && (
        <text x={x + width / 2} y={y + height / 2 + 8} textAnchor="middle" fill={pnlPct >= 0 ? '#34d399' : '#f87171'} fontSize={Math.min(11, width / 7)}>
          {pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(1)}%
        </text>
      )}
    </g>
  )
}

interface TooltipPayloadItem {
  payload?: {
    name?: string
    sector?: string
    pnlPct?: number
    value?: number
  }
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayloadItem[] }) {
  if (!active || !payload?.[0]?.payload) return null
  const d = payload[0].payload
  return (
    <div className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-xs shadow-lg">
      <p className="font-bold text-slate-100">{d.name}</p>
      <p className="text-slate-400">{d.sector}</p>
      <p className="font-mono text-slate-200">{formatCurrency(d.value ?? 0)}</p>
      <p className={`font-mono ${getPnlColor(d.pnlPct ?? 0)}`}>
        {(d.pnlPct ?? 0) >= 0 ? '+' : ''}{(d.pnlPct ?? 0).toFixed(1)}%
      </p>
    </div>
  )
}

export default function PortfolioPage() {
  const { positions, consolidated, mounted, addPosition, updatePosition, removePosition, resetToDefaults } = usePositions()
  const [filter, setFilter] = useState<AccountFilter>('all')
  const [tab, setTab] = useState<TabType>('positions')
  const [showModal, setShowModal] = useState(false)
  const [editTarget, setEditTarget] = useState<EditablePosition | null>(null)

  // Liquidez (cash) per account — persisted in localStorage
  const [cash, setCash] = useState<AccountCash>({ Lucio: 0, Agro: 0 })
  const [editingCash, setEditingCash] = useState<'Lucio' | 'Agro' | null>(null)
  const [cashInput, setCashInput] = useState('')
  useEffect(() => { setCash(loadCash()) }, [])

  function startEditCash(account: 'Lucio' | 'Agro') {
    setEditingCash(account)
    setCashInput(cash[account].toString())
  }
  function commitCash() {
    if (!editingCash) return
    const val = parseFloat(cashInput)
    const updated = { ...cash, [editingCash]: isNaN(val) ? 0 : val }
    setCash(updated)
    saveCash(updated)
    setEditingCash(null)
  }

  // Cash shown for current filter
  const cashForFilter: number = filter === 'all'
    ? cash.Lucio + cash.Agro
    : filter === 'Lucio' ? cash.Lucio : cash.Agro

  const displayPositions = useMemo(() => {
    if (filter === 'all') return consolidated
    return positions.filter(p => p.account === filter)
  }, [positions, consolidated, filter])

  // USD tickers (BYMA D-class, e.g. PAMPD.BA) + ARS tickers (e.g. PAMP.BA) for CCL calc
  const usdTickers = [...new Set(displayPositions.map(p => p.tickerYF))]
  const arsTickers = [...new Set(usdTickers.map(t => t.replace(/D\.BA$/, '.BA')))]
  const allTickers = [...new Set([...usdTickers, ...arsTickers])]
  const { prices, loading, lastUpdated, refresh } = usePrices(allTickers, 60000)
  const { rates } = useDolar()

  const rows = useMemo(() => {
    return displayPositions.map(pos => {
      const usdData  = prices[pos.tickerYF]
      const arsTicker = pos.tickerYF.replace(/D\.BA$/, '.BA')
      const arsData  = prices[arsTicker]

      // BYMA USD price per lámina (ratio=1 for all, so qty × price = value)
      const priceBYMA = usdData?.price ?? 0
      const currentValueUSD = pos.quantity * priceBYMA
      const costUSD = pos.quantity * pos.ppc
      const pnlUSD = currentValueUSD - costUSD
      const pnlPct = costUSD > 0 ? (pnlUSD / costUSD) * 100 : 0
      const changePercent = usdData?.changePercent ?? 0
      const dailyPnlUSD = currentValueUSD * (changePercent / 100)

      // CCL implícito = CEDEAR ARS (lámina) / CEDEAR USD (lámina)
      const priceARS = arsData?.price ?? null
      const cclImplicito = priceARS && priceBYMA > 0 ? priceARS / priceBYMA : null
      const cclRef = rates.ccl ?? 1430
      const gapCCL = cclImplicito ? ((cclImplicito - cclRef) / cclRef) * 100 : null

      return {
        ...pos,
        arsTicker,
        priceBYMA,
        priceARS,
        currentValueUSD,
        costUSD,
        pnlUSD,
        pnlPct,
        changePercent,
        dailyPnlUSD,
        hasPrice: !!usdData,
        cclImplicito,
        gapCCL,
      }
    })
  }, [displayPositions, prices, rates])

  const summary = useMemo(() => {
    const totalValue = rows.reduce((s, r) => s + r.currentValueUSD, 0)
    const totalCost = rows.reduce((s, r) => s + r.costUSD, 0)
    const totalPnl = totalValue - totalCost
    const dailyPnl = rows.reduce((s, r) => s + r.dailyPnlUSD, 0)
    return {
      totalValue,
      totalCost,
      totalPnl,
      pnlPct: totalCost > 0 ? (totalPnl / totalCost) * 100 : 0,
      dailyPnl,
      dailyPct: totalValue > 0 ? (dailyPnl / totalValue) * 100 : 0,
    }
  }, [rows])

  const totalValue = rows.reduce((s, r) => s + r.currentValueUSD, 0)

  // Feature 4: Total real portfolio value (CEDEARs + cash + ONs)
  const totalPortfolio = useMemo(() => {
    if (typeof window === 'undefined') return summary.totalValue
    return computeTotalPortfolioValue(summary.totalValue)
  }, [summary.totalValue])

  // Auto-save daily snapshot once prices are loaded
  const snapshotSavedRef = useRef(false)
  useEffect(() => {
    if (loading || summary.totalValue <= 0 || snapshotSavedRef.current) return
    snapshotSavedRef.current = true
    const total = computeTotalPortfolioValue(summary.totalValue)
    saveTodaySnapshot(total)
  }, [loading, summary.totalValue])

  // Feature 5: Treemap data
  const treemapData = useMemo(() => {
    return rows
      .filter(r => r.hasPrice && r.currentValueUSD > 0)
      .map(r => ({
        name: r.ticker,
        size: Math.round(r.currentValueUSD),
        sector: r.sector,
        pnlPct: r.pnlPct,
        value: r.currentValueUSD,
        priceBYMA: r.priceBYMA,
      }))
  }, [rows])

  if (!mounted) return null

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-[1400px]">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Cartera</h1>
          <p className="text-slate-400 text-sm mt-0.5">CEDEARs — valor en USD (precio BYMA mercado dólar)</p>
        </div>
        <div className="flex items-center gap-2">
          {lastUpdated && (
            <span className="text-xs flex items-center gap-1.5 text-slate-500">
              <Clock size={12} />
              {lastUpdated.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          )}
          <button onClick={refresh} className="p-2 rounded-lg border border-slate-700 bg-slate-800 text-slate-400 hover:text-slate-200">
            <RefreshCw size={13} />
          </button>
          <button
            onClick={() => { setEditTarget(null); setShowModal(true) }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium transition-colors"
          >
            <Plus size={14} />
            Agregar
          </button>
        </div>
      </div>

      {/* Summary strip — Feature 4: show total portfolio and CEDEARs separately */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-slate-500 mb-1">Valor total (USD)</p>
            <p className="text-base font-bold font-mono truncate text-slate-100">{formatCurrency(totalPortfolio)}</p>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              CEDEARs: {formatCurrency(summary.totalValue)}
              {cashForFilter > 0 && ` + ${formatCurrency(cashForFilter)} cash`}
            </p>
          </CardContent>
        </Card>
        {[
          { label: 'P&L total', value: (summary.totalPnl >= 0 ? '+' : '') + formatCurrency(summary.totalPnl), color: getPnlColor(summary.totalPnl), sub: formatPercent(summary.pnlPct) },
          { label: 'Variación hoy', value: (summary.dailyPnl >= 0 ? '+' : '') + formatCurrency(summary.dailyPnl), color: getPnlColor(summary.dailyPnl), sub: formatPercent(summary.dailyPct) },
          { label: 'CCL referencia', value: `$${(rates.ccl ?? 1470).toLocaleString('es-AR')}`, color: 'text-amber-400', sub: `Blue $${(rates.blue ?? 1475).toLocaleString('es-AR')}` },
        ].map(item => (
          <Card key={item.label}>
            <CardContent className="p-4">
              <p className="text-xs text-slate-500 mb-1">{item.label}</p>
              <p className={`text-base font-bold font-mono truncate ${item.color}`}>{item.value}</p>
              {item.sub && <p className="text-xs text-slate-500 font-mono mt-0.5">{item.sub}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs + account filter */}
      <Card>
        <CardHeader className="pb-0">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex gap-1 p-1 rounded-lg bg-slate-700/40">
              {([['positions', 'Posiciones'], ['ccl', 'CCL Implícito'], ['treemap', 'Mapa']] as const).map(([key, label]) => (
                <button key={key} onClick={() => setTab(key as TabType)}
                  className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${tab === key ? 'bg-slate-700 text-slate-100' : 'text-slate-400 hover:text-slate-200'}`}>
                  {label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <div className="flex gap-1 p-1 rounded-lg bg-slate-700/40">
                {([['all', 'Consolidado'], ['Lucio', 'Lucio'], ['Agro', 'Agro']] as const).map(([k, l]) => (
                  <button key={k} onClick={() => setFilter(k)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${filter === k ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
                    {l}
                  </button>
                ))}
              </div>
              <button onClick={resetToDefaults} className="text-xs text-slate-600 hover:text-slate-400 transition-colors px-2 py-1">
                Reset
              </button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0 pt-2">
          {tab === 'positions' ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700/50">
                    {['Ticker', 'Sector', 'Láminas', 'PPC (USD)', 'Precio BYMA', 'Var. día', 'Valor (USD)', 'P&L (USD)', 'P&L %', 'Peso', ''].map(h => (
                      <th key={h} className="text-left py-3 px-3 text-xs font-medium text-slate-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/30">
                  {rows.map(row => {
                    const weight = totalValue > 0 ? (row.currentValueUSD / totalValue) * 100 : 0
                    return (
                      <tr key={`${row.ticker}_${row.account}`} className="hover:bg-slate-700/20 transition-colors group">
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center flex-shrink-0">
                              <span className="text-xs font-bold text-slate-200">{row.ticker.slice(0,2)}</span>
                            </div>
                            <div>
                              <p className="font-semibold text-slate-100">{row.ticker}</p>
                              <p className="text-xs text-slate-500 truncate max-w-[100px]">{row.name}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border ${SECTOR_BADGE_COLORS[row.sector] ?? 'text-slate-400 bg-slate-500/10 border-slate-500/20'}`}>
                            {row.sector}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-300">{formatNumber(row.quantity, 0)}</td>
                        <td className="py-3 px-3 font-mono text-slate-300">{formatCurrency(row.ppc)}</td>
                        <td className="py-3 px-3 font-mono">
                          {loading && !row.hasPrice
                            ? <div className="h-4 w-16 bg-slate-700 rounded animate-pulse" />
                            : row.hasPrice
                            ? <span className="text-slate-100 font-medium">{formatCurrency(row.priceBYMA)}</span>
                            : <span className="text-slate-500">—</span>}
                        </td>
                        <td className="py-3 px-3">
                          {row.hasPrice ? (
                            <div className={`flex items-center gap-1 text-xs font-mono ${getPnlColor(row.changePercent)}`}>
                              {row.changePercent > 0 ? <TrendingUp size={11}/> : row.changePercent < 0 ? <TrendingDown size={11}/> : <Minus size={11}/>}
                              {formatPercent(row.changePercent)}
                            </div>
                          ) : '—'}
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-100 font-medium">
                          {row.hasPrice ? formatCurrency(row.currentValueUSD) : '—'}
                        </td>
                        <td className={`py-3 px-3 font-mono ${getPnlColor(row.pnlUSD)}`}>
                          {row.hasPrice ? (row.pnlUSD >= 0 ? '+' : '') + formatCurrency(row.pnlUSD) : '—'}
                        </td>
                        <td className="py-3 px-3">
                          {row.hasPrice
                            ? <Badge variant={row.pnlPct > 0 ? 'positive' : row.pnlPct < 0 ? 'negative' : 'neutral'}>{formatPercent(row.pnlPct)}</Badge>
                            : '—'}
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2 w-24">
                            <div className="flex-1 h-1.5 bg-slate-700 rounded-full">
                              <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${Math.min(weight, 100)}%` }} />
                            </div>
                            <span className="text-xs text-slate-400 font-mono w-9 text-right">{weight.toFixed(1)}%</span>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => { setEditTarget(row as EditablePosition); setShowModal(true) }}
                              className="p-1.5 rounded hover:bg-slate-600 text-slate-400 hover:text-slate-200 transition-colors"
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              onClick={() => removePosition(row.ticker, row.account)}
                              className="p-1.5 rounded hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                  {/* ── LIQUIDEZ row ── */}
                  {(filter === 'Lucio' || filter === 'Agro' || filter === 'all') && (() => {
                    const accts: ('Lucio' | 'Agro')[] = filter === 'all' ? ['Lucio', 'Agro'] : [filter as 'Lucio' | 'Agro']
                    return accts.map(acct => (
                      <tr key={`cash_${acct}`} className="hover:bg-slate-700/20 transition-colors group border-t border-slate-600/40">
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-slate-600/60 flex items-center justify-center flex-shrink-0">
                              <span className="text-xs font-bold text-slate-300">$</span>
                            </div>
                            <div>
                              <p className="font-semibold text-slate-100">LIQUIDEZ</p>
                              <p className="text-xs text-slate-500">{acct}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border text-slate-400 bg-slate-500/10 border-slate-500/20">
                            Efectivo
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-500">—</td>
                        <td className="py-3 px-3 text-slate-500">—</td>
                        <td className="py-3 px-3 text-slate-500">—</td>
                        <td className="py-3 px-3 text-slate-500">—</td>
                        <td className="py-3 px-3 font-mono text-slate-100 font-medium">
                          {editingCash === acct ? (
                            <div className="flex items-center gap-1">
                              <span className="text-slate-400 text-sm">$</span>
                              <input
                                autoFocus
                                type="number"
                                min="0"
                                step="100"
                                className="w-24 bg-slate-700 border border-indigo-500 rounded px-2 py-0.5 text-sm text-slate-100 focus:outline-none"
                                value={cashInput}
                                onChange={e => setCashInput(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') commitCash(); if (e.key === 'Escape') setEditingCash(null) }}
                                onBlur={commitCash}
                              />
                              <button onClick={commitCash} className="p-1 rounded hover:bg-slate-600 text-emerald-400">
                                <Check size={12} />
                              </button>
                            </div>
                          ) : (
                            formatCurrency(cash[acct])
                          )}
                        </td>
                        <td className="py-3 px-3 text-slate-500">—</td>
                        <td className="py-3 px-3 text-slate-500">—</td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2 w-24">
                            <div className="flex-1 h-1.5 bg-slate-700 rounded-full">
                              <div className="h-full bg-slate-500 rounded-full"
                                style={{ width: `${totalValue > 0 ? Math.min((cash[acct] / (totalValue + cashForFilter)) * 100, 100) : 0}%` }} />
                            </div>
                            <span className="text-xs text-slate-400 font-mono w-9 text-right">
                              {totalValue > 0 ? ((cash[acct] / (totalValue + cashForFilter)) * 100).toFixed(1) : '0.0'}%
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => startEditCash(acct)}
                              className="p-1.5 rounded hover:bg-slate-600 text-slate-400 hover:text-slate-200 transition-colors"
                            >
                              <Pencil size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  })()}
                </tbody>
              </table>
            </div>
          ) : tab === 'ccl' ? (
            /* CCL Implícito tab */
            <div className="p-4 space-y-4">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                <AlertCircle size={15} className="text-indigo-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-indigo-300">
                  CCL implícito calculado automáticamente desde precios BYMA.
                  <span className="ml-2 text-indigo-400 font-mono">CCL = Precio CEDEAR en ARS ÷ Precio CEDEAR en USD</span>
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700/50">
                      {['Ticker', 'CEDEAR en ARS', 'CEDEAR en USD', 'CCL implícito', 'CCL ref.', 'Gap'].map(h => (
                        <th key={h} className="text-left py-2.5 px-3 text-xs font-medium text-slate-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/30">
                    {rows.map(row => (
                      <tr key={row.ticker} className="hover:bg-slate-700/20 transition-colors">
                        <td className="py-2.5 px-3">
                          <p className="font-bold text-slate-100">{row.ticker}</p>
                          <p className="text-xs text-slate-500 font-mono">{row.arsTicker}</p>
                        </td>
                        <td className="py-2.5 px-3 font-mono">
                          {row.priceARS !== null
                            ? <span className="text-slate-100">ARS {row.priceARS.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</span>
                            : loading ? <div className="h-4 w-16 bg-slate-700 rounded animate-pulse" /> : <span className="text-slate-600">—</span>}
                        </td>
                        <td className="py-2.5 px-3 font-mono">
                          {row.hasPrice
                            ? <span className="text-slate-100">{formatCurrency(row.priceBYMA)}</span>
                            : loading ? <div className="h-4 w-16 bg-slate-700 rounded animate-pulse" /> : <span className="text-slate-500">—</span>}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-semibold">
                          {row.cclImplicito
                            ? <span className="text-indigo-400 text-base">${row.cclImplicito.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</span>
                            : <span className="text-slate-600">—</span>}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-400">
                          ${(rates.ccl ?? 1430).toLocaleString('es-AR')}
                        </td>
                        <td className="py-2.5 px-3">
                          {row.gapCCL !== null ? (
                            <Badge variant={row.gapCCL > 2 ? 'positive' : row.gapCCL < -2 ? 'negative' : 'neutral'}>
                              {row.gapCCL > 0 ? '+' : ''}{row.gapCCL.toFixed(1)}%
                            </Badge>
                          ) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* Feature 5: Treemap */
            <div className="p-4">
              {treemapData.length === 0 ? (
                <div className="flex items-center justify-center py-20 text-slate-500 text-sm">
                  Cargando precios...
                </div>
              ) : (
                <>
                  {/* Sector legend */}
                  <div className="flex flex-wrap gap-3 mb-4">
                    {Object.entries(SECTOR_COLORS).filter(([s]) => treemapData.some(d => d.sector === s)).map(([sector, color]) => (
                      <div key={sector} className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
                        <span className="text-xs text-slate-400">{sector}</span>
                      </div>
                    ))}
                  </div>
                  <ResponsiveContainer width="100%" height={400}>
                    <Treemap
                      data={treemapData}
                      dataKey="size"
                      content={<CustomTreemapContent />}
                    >
                      <Tooltip content={<CustomTooltip />} />
                    </Treemap>
                  </ResponsiveContainer>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal */}
      {showModal && (
        <EditPositionModal
          initial={editTarget ?? undefined}
          onSave={pos => {
            if (editTarget) {
              updatePosition(editTarget.ticker, editTarget.account, {
                quantity: pos.quantity,
                ppc: pos.ppc,
                targetPct: pos.targetPct,
              })
            } else {
              addPosition(pos)
            }
          }}
          onClose={() => { setShowModal(false); setEditTarget(null) }}
        />
      )}
    </div>
  )
}
