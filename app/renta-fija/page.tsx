'use client'

import { useMemo, useEffect, useState, useCallback } from 'react'
import { FIXED_INCOME, COUPON_SCHEDULE } from '@/lib/portfolio-data'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import { Calendar, DollarSign, TrendingUp, Clock, CheckCircle2, Tag, Pencil, Save } from 'lucide-react'

const ON_COLORS: Record<string, string> = {
  'TTC9D.BA': 'bg-indigo-500/15 text-indigo-400 border-indigo-500/25',
  'PN36D.BA':  'bg-amber-500/15 text-amber-400 border-amber-500/25',
  'IRCOD.BA':  'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
}

const ON_PRICES_KEY = 'on_prices_v1'

// Default prices from user's broker screenshot (23/03/2026)
const DEFAULT_ON_PRICES: Record<string, number> = {
  'TTC9D.BA': 1.0595,
  'PN36D.BA':  1.09,
  'IRCOD.BA':  1.056,
}

function OnBadge({ ticker }: { ticker: string }) {
  const label = ticker.replace('.BA', '')
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-mono border ${ON_COLORS[ticker] ?? 'bg-slate-700 text-slate-400 border-slate-600'}`}>
      <Tag size={9} />
      {label}
    </span>
  )
}

export default function RentaFijaPage() {
  const today = new Date().toISOString().slice(0, 10)
  const [onPrices, setOnPrices] = useState<Record<string, number>>(DEFAULT_ON_PRICES)
  const [editingPrices, setEditingPrices] = useState<Record<string, string>>({})
  const [isEditing, setIsEditing] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    try {
      const raw = localStorage.getItem(ON_PRICES_KEY)
      if (raw) {
        const saved = JSON.parse(raw)
        setOnPrices({ ...DEFAULT_ON_PRICES, ...saved })
      }
    } catch {}
  }, [])

  const saveOnPrices = useCallback(() => {
    const updated: Record<string, number> = { ...onPrices }
    for (const [k, v] of Object.entries(editingPrices)) {
      const n = parseFloat(v)
      if (!isNaN(n) && n > 0) updated[k] = n
    }
    setOnPrices(updated)
    localStorage.setItem(ON_PRICES_KEY, JSON.stringify(updated))
    setIsEditing(false)
    setEditingPrices({})
  }, [onPrices, editingPrices])

  const schedule = useMemo(() =>
    COUPON_SCHEDULE.map(c => ({ ...c, paid: c.date < today }))
      .sort((a, b) => a.date.localeCompare(b.date)),
    [today]
  )

  const schedule2026 = schedule.filter(c => c.date.startsWith('2026'))
  const schedule2027 = schedule.filter(c => c.date.startsWith('2027'))

  const totalNominal = FIXED_INCOME.reduce((s, f) => s + f.nominal, 0)
  const totalAnual   = FIXED_INCOME.reduce((s, f) => s + f.nominal * f.rate / 100, 0)
  const totalMktValue = FIXED_INCOME.reduce((s, fi) => {
    const p = onPrices[fi.onTicker] ?? 1
    return s + fi.nominal * p
  }, 0)

  const upcoming = schedule.filter(c => !c.paid)[0]
  const totalAnual2026 = schedule2026.reduce((s, c) => s + c.amount, 0)

  const formatDate = (d: string) =>
    new Date(d + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })

  const monthName = (d: string) =>
    new Date(d + 'T12:00:00').toLocaleDateString('es-AR', { month: 'short' }).toUpperCase()

  if (!mounted) return null

  return (
    <div className="p-6 space-y-6 max-w-[1200px]">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Renta Fija</h1>
        <p className="text-slate-400 text-sm mt-0.5">
          Obligaciones Negociables — cronograma de cupones y posiciones
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-slate-500 mb-1 flex items-center gap-1.5"><DollarSign size={11}/> Nominal total</p>
            <p className="text-lg font-bold font-mono text-slate-100">{formatCurrency(totalNominal)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-slate-500 mb-1 flex items-center gap-1.5"><DollarSign size={11}/> Valor mercado</p>
            <p className="text-lg font-bold font-mono text-slate-100">{formatCurrency(totalMktValue)}</p>
            <p className={`text-xs mt-0.5 ${totalMktValue >= totalNominal ? 'text-emerald-400' : 'text-red-400'}`}>
              {totalMktValue >= totalNominal ? '+' : ''}{((totalMktValue / totalNominal - 1) * 100).toFixed(2)}% vs nominal
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-slate-500 mb-1 flex items-center gap-1.5"><TrendingUp size={11}/> Intereses anuales</p>
            <p className="text-lg font-bold font-mono text-emerald-400">{formatCurrency(totalAnual)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-slate-500 mb-1 flex items-center gap-1.5"><Calendar size={11}/> Cobros 2026</p>
            <p className="text-lg font-bold font-mono text-slate-100">{formatCurrency(totalAnual2026)}</p>
            {upcoming && (
              <p className="text-xs text-slate-500 mt-0.5">Próx: {formatDate(upcoming.date)}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ONs table */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Posiciones en ONs</CardTitle>
            <div className="flex gap-2">
              {isEditing ? (
                <button
                  onClick={saveOnPrices}
                  className="flex items-center gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg transition-colors"
                >
                  <Save size={12}/> Guardar precios
                </button>
              ) : (
                <button
                  onClick={() => {
                    setIsEditing(true)
                    const init: Record<string, string> = {}
                    FIXED_INCOME.forEach(fi => { init[fi.onTicker] = String(onPrices[fi.onTicker] ?? 1) })
                    setEditingPrices(init)
                  }}
                  className="flex items-center gap-1.5 text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <Pencil size={12}/> Actualizar precios
                </button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 pb-2">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700/50">
                {['ON / Ticker BYMA', 'Cuenta', 'Nominal', 'Precio (per unit)', 'Valor mercado', 'Tasa', 'Cupón semi-anual', 'Vencimiento'].map(h => (
                  <th key={h} className="text-left py-3 px-4 text-xs font-medium text-slate-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/30">
              {FIXED_INCOME.map(fi => {
                const coupon = fi.nominal * fi.rate / 200
                const price = onPrices[fi.onTicker] ?? 1
                const mktValue = fi.nominal * price

                return (
                  <tr key={fi.name} className="hover:bg-slate-700/20 transition-colors">
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-slate-100">{fi.name}</p>
                      <div className="mt-1"><OnBadge ticker={fi.onTicker} /></div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${fi.account === 'Lucio' ? 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20' : 'text-purple-400 bg-purple-500/10 border-purple-500/20'}`}>
                        {fi.account === 'Lucio' ? 'Balanz Lucio' : 'Balanz Agro'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-semibold text-slate-100">{formatCurrency(fi.nominal)}</td>
                    <td className="py-3.5 px-4">
                      {isEditing ? (
                        <input
                          type="number"
                          step="0.0001"
                          value={editingPrices[fi.onTicker] ?? ''}
                          onChange={e => setEditingPrices(p => ({ ...p, [fi.onTicker]: e.target.value }))}
                          className="w-24 bg-slate-700 border border-slate-500 rounded px-2 py-1 text-sm font-mono text-slate-100 focus:outline-none focus:border-indigo-400"
                        />
                      ) : (
                        <span className="font-mono text-slate-100">${price.toFixed(4)}</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-semibold">
                      <span className={mktValue >= fi.nominal ? 'text-emerald-400' : 'text-red-400'}>
                        {formatCurrency(mktValue)}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-mono text-emerald-400">{fi.rate.toFixed(2)}%</span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-amber-400 font-medium">{formatCurrency(coupon)}</td>
                    <td className="py-3.5 px-4 font-mono text-slate-400 text-xs">{fi.maturity.slice(0, 7)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <p className="text-xs text-slate-600 px-4 pb-3 mt-1">
            💡 Los precios de ONs no están disponibles en Yahoo Finance. Actualizá manualmente desde tu broker (precio por unidad, ej: 1.0595 = 105.95% del nominal).
          </p>
        </CardContent>
      </Card>

      {/* Coupon schedule */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {[{ year: '2026', payments: schedule2026 }, { year: '2027', payments: schedule2027 }].map(({ year, payments }) => {
          const yearTotal = payments.reduce((s, c) => s + c.amount, 0)
          return (
            <Card key={year}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Cronograma {year}</CardTitle>
                  <span className="text-sm font-mono font-semibold text-emerald-400">{formatCurrency(yearTotal)}</span>
                </div>
              </CardHeader>
              <CardContent className="p-0 pb-4">
                <div className="divide-y divide-slate-700/30">
                  {payments.map((c, i) => (
                    <div key={i} className={`flex items-center gap-3 px-4 py-3 transition-colors ${c.paid ? 'opacity-40' : 'hover:bg-slate-700/20'}`}>
                      <div className="w-12 h-12 rounded-lg bg-slate-700/70 flex flex-col items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-slate-400">{monthName(c.date)}</span>
                        <span className="text-sm font-bold text-slate-200">{c.date.slice(8)}</span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-200">{c.onName}</p>
                        <div className="mt-0.5"><OnBadge ticker={c.onTicker} /></div>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-mono font-semibold text-slate-100">{formatCurrency(c.amount)}</p>
                        {c.paid ? (
                          <span className="flex items-center justify-end gap-1 text-xs text-slate-500">
                            <CheckCircle2 size={10}/> Cobrado
                          </span>
                        ) : (
                          <span className="text-xs text-amber-500">Pendiente</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
