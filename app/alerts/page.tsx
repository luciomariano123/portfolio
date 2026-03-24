'use client'

import { useEffect, useState } from 'react'
import { usePrices } from '@/hooks/usePrices'
import { usePositions } from '@/hooks/usePositions'
import { useAlerts } from '@/hooks/useAlerts'
import { AlertToast } from '@/components/AlertToast'
import { markAlertsRead } from '@/lib/alerts-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency, formatPercent, getPnlColor } from '@/lib/utils'
import { Bell, Plus, Trash2, BellRing, Activity, ChevronDown, ChevronUp, RefreshCw, CheckCircle2 } from 'lucide-react'
import type { PortfolioAlert } from '@/lib/alerts-store'

const TYPE_LABELS: Record<string, string> = {
  price_above: 'Precio mayor a',
  price_below: 'Precio menor a',
  change_up: 'Sube más de',
  change_down: 'Baja más de',
}

const TYPE_DESCRIPTIONS: Record<string, string> = {
  price_above: 'Se dispara cuando el precio sube sobre el umbral',
  price_below: 'Se dispara cuando el precio baja del umbral',
  change_up: 'Se dispara cuando la variación diaria supera X%',
  change_down: 'Se dispara cuando la variación diaria cae más de X%',
}

type AlertTypeKey = 'price_above' | 'price_below' | 'change_up' | 'change_down'

export default function AlertsPage() {
  const { positions: rawPositions, mounted } = usePositions()
  const positions = rawPositions

  // Get unique USD tickers
  const usdTickers = [...new Set(positions.map(p => p.tickerYF))]
  const { prices, loading, refresh } = usePrices(usdTickers, 60000)
  const { alerts, toasts, dismissToast, addAlert, deleteAlert, toggleAlert } = useAlerts(prices)

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    tickerYF: usdTickers[0] ?? '',
    type: 'price_above' as AlertTypeKey,
    value: '',
  })

  // Mark alerts as read when visiting this page
  useEffect(() => {
    if (mounted) markAlertsRead()
  }, [mounted])

  // Update form ticker when positions load
  useEffect(() => {
    if (usdTickers.length > 0 && !form.tickerYF) {
      setForm(f => ({ ...f, tickerYF: usdTickers[0] }))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usdTickers.join(',')])

  function handleAdd() {
    const v = parseFloat(form.value)
    if (!form.tickerYF || isNaN(v) || v <= 0) return
    const pos = positions.find(p => p.tickerYF === form.tickerYF)
    addAlert({
      tickerYF: form.tickerYF,
      tickerDisplay: pos?.ticker ?? form.tickerYF.replace('D.BA', '').replace('.BA', ''),
      name: pos?.name ?? form.tickerYF,
      type: form.type,
      value: v,
    })
    setForm(f => ({ ...f, value: '' }))
    setShowForm(false)
  }

  const active = alerts.filter((a: PortfolioAlert) => a.active)
  const fired  = alerts.filter((a: PortfolioAlert) => !a.active && a.firedAt)
  const inactive = alerts.filter((a: PortfolioAlert) => !a.active && !a.firedAt)

  if (!mounted) return null

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-[1000px]">
      {/* Toast area */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className="pointer-events-auto">
            <AlertToast toast={t} onDismiss={() => dismissToast(t.id)} />
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Alertas de Precio</h1>
          <p className="text-slate-400 text-sm mt-0.5">Se disparan en tiempo real contra precios BYMA</p>
        </div>
        <div className="flex gap-2">
          <button onClick={refresh} className="p-2 rounded-lg border border-slate-700 bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium transition-colors"
          >
            <Plus size={14} />
            Nueva alerta
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-500/15 flex items-center justify-center flex-shrink-0">
            <BellRing size={16} className="text-indigo-400" />
          </div>
          <div>
            <p className="text-xl font-bold text-slate-100">{active.length}</p>
            <p className="text-xs text-slate-500">Activas</p>
          </div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-slate-700/40 flex items-center justify-center flex-shrink-0">
            <Bell size={16} className="text-slate-400" />
          </div>
          <div>
            <p className="text-xl font-bold text-slate-100">{alerts.length}</p>
            <p className="text-xs text-slate-500">Total</p>
          </div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-500/15 flex items-center justify-center flex-shrink-0">
            <Activity size={16} className="text-amber-400" />
          </div>
          <div>
            <p className="text-xl font-bold text-amber-400">{fired.length}</p>
            <p className="text-xs text-slate-500">Disparadas</p>
          </div>
        </CardContent></Card>
      </div>

      {/* New alert form */}
      {showForm && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Crear alerta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1.5 font-medium">Ticker</label>
                <select
                  className="w-full rounded-lg px-3 py-2 text-sm bg-slate-700 border border-slate-600 text-slate-100 focus:outline-none focus:border-indigo-500"
                  value={form.tickerYF}
                  onChange={e => setForm(f => ({ ...f, tickerYF: e.target.value }))}
                >
                  {positions.map(p => (
                    <option key={`${p.ticker}_${p.account}`} value={p.tickerYF}>
                      {p.ticker} — {p.name}
                    </option>
                  ))}
                </select>
                {form.tickerYF && prices[form.tickerYF] && (
                  <p className="text-xs text-slate-500 mt-1">
                    Actual: <span className="font-mono text-slate-300">{formatCurrency(prices[form.tickerYF].price)}</span>
                    <span className={`ml-1 font-mono ${getPnlColor(prices[form.tickerYF].changePercent)}`}>
                      {formatPercent(prices[form.tickerYF].changePercent)}
                    </span>
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5 font-medium">Condición</label>
                <select
                  className="w-full rounded-lg px-3 py-2 text-sm bg-slate-700 border border-slate-600 text-slate-100 focus:outline-none focus:border-indigo-500"
                  value={form.type}
                  onChange={e => setForm(f => ({ ...f, type: e.target.value as AlertTypeKey }))}
                >
                  {Object.entries(TYPE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
                <p className="text-xs text-slate-600 mt-1">{TYPE_DESCRIPTIONS[form.type]}</p>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5 font-medium">
                  {form.type.startsWith('change') ? 'Umbral (%)' : 'Precio umbral (USD)'}
                </label>
                <input
                  type="number"
                  step={form.type.startsWith('change') ? '0.1' : '0.01'}
                  className="w-full rounded-lg px-3 py-2 text-sm bg-slate-700 border border-slate-600 text-slate-100 focus:outline-none focus:border-indigo-500 font-mono"
                  placeholder={form.type.startsWith('change') ? 'ej: 3.5' : 'ej: 45.00'}
                  value={form.value}
                  onChange={e => setForm(f => ({ ...f, value: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && handleAdd()}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={handleAdd} className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-sm rounded-lg font-medium transition-colors">
                Crear alerta
              </button>
              <button onClick={() => setShowForm(false)} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm rounded-lg transition-colors">
                Cancelar
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active alerts */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Activas ({active.length})</CardTitle>
            {active.length === 0 && (
              <span className="text-xs text-slate-500">Sin alertas activas — creá una arriba</span>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0 pb-2">
          {active.length === 0 ? (
            <div className="flex flex-col items-center py-10 gap-3 text-slate-500">
              <Bell size={32} className="opacity-20" />
              <p className="text-sm">No hay alertas activas</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-700/30">
              {active.map((alert: PortfolioAlert) => {
                const pd = prices[alert.tickerYF]
                const pct = pd ? ((pd.price - alert.value) / alert.value * 100) : null
                const isAbove = alert.type === 'price_above' || alert.type === 'change_up'
                return (
                  <div key={alert.id} className="flex items-center gap-3 px-4 sm:px-5 py-3.5 hover:bg-slate-700/20 transition-colors">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${isAbove ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
                      {isAbove ? <ChevronUp size={16} className="text-emerald-400" /> : <ChevronDown size={16} className="text-red-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-100 text-sm">{alert.tickerDisplay}</span>
                        <span className="text-xs text-slate-400">{TYPE_LABELS[alert.type]}</span>
                        <span className="text-xs font-mono text-amber-400 font-semibold">
                          {alert.type.startsWith('change') ? `${alert.value}%` : formatCurrency(alert.value)}
                        </span>
                      </div>
                      {pd && (
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="text-xs text-slate-500">
                            Precio actual: <span className={`font-mono font-medium ${getPnlColor(pct ?? 0)}`}>{formatCurrency(pd.price)}</span>
                          </span>
                          {pct !== null && (
                            <span className={`text-xs font-mono ${getPnlColor(pct)}`}>
                              {pct >= 0 ? '+' : ''}{pct.toFixed(1)}% vs umbral
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => toggleAlert(alert.id)}
                        className="w-11 h-6 rounded-full bg-indigo-500 relative cursor-pointer transition-colors"
                        title="Desactivar"
                      >
                        <div className="absolute right-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform" />
                      </button>
                      <button onClick={() => deleteAlert(alert.id)} className="p-1.5 hover:text-red-400 text-slate-500 transition-colors rounded-lg hover:bg-red-500/10">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Fired alerts history */}
      {fired.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-amber-400 flex items-center gap-2">
              <Activity size={16} />
              Historial de disparadas ({fired.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 pb-2">
            <div className="divide-y divide-slate-700/30">
              {[...fired].reverse().map((alert: PortfolioAlert) => (
                <div key={alert.id} className="flex items-center gap-3 px-4 sm:px-5 py-3 opacity-70">
                  <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 size={16} className="text-amber-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-200 text-sm">{alert.tickerDisplay}</span>
                      <span className="text-xs text-slate-500">{TYPE_LABELS[alert.type]}</span>
                      <span className="text-xs font-mono text-slate-400">
                        {alert.type.startsWith('change') ? `${alert.value}%` : formatCurrency(alert.value)}
                      </span>
                      <span className="text-xs px-1.5 py-0.5 bg-amber-500/15 text-amber-400 rounded border border-amber-500/20 font-medium">Disparada</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {alert.firedAt && new Date(alert.firedAt).toLocaleString('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      {alert.firedPrice && ` — Precio: ${formatCurrency(alert.firedPrice)}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => toggleAlert(alert.id)}
                      className="text-xs px-2 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"
                      title="Reactivar"
                    >
                      Reactivar
                    </button>
                    <button onClick={() => deleteAlert(alert.id)} className="p-1.5 hover:text-red-400 text-slate-600 transition-colors rounded-lg hover:bg-red-500/10">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Inactive */}
      {inactive.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-500">Inactivas ({inactive.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0 pb-2">
            <div className="divide-y divide-slate-700/30">
              {inactive.map((alert: PortfolioAlert) => (
                <div key={alert.id} className="flex items-center gap-3 px-5 py-3 opacity-50">
                  <div className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center flex-shrink-0">
                    <Bell size={13} className="text-slate-500" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-300 text-sm">{alert.tickerDisplay}</span>
                      <span className="text-xs text-slate-500">{TYPE_LABELS[alert.type]}</span>
                      <span className="text-xs font-mono text-slate-400">
                        {alert.type.startsWith('change') ? `${alert.value}%` : formatCurrency(alert.value)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => toggleAlert(alert.id)}
                      className="w-11 h-6 rounded-full bg-slate-600 relative cursor-pointer"
                    >
                      <div className="absolute left-0.5 top-0.5 w-5 h-5 bg-slate-400 rounded-full shadow" />
                    </button>
                    <button onClick={() => deleteAlert(alert.id)} className="p-1.5 hover:text-red-400 text-slate-600 transition-colors">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
