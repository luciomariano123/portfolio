'use client'

import { useState, useEffect } from 'react'
import { EditablePosition, KNOWN_TICKERS } from '@/lib/positions-store'
import { X, Search } from 'lucide-react'

interface Props {
  onSave: (pos: EditablePosition) => void
  onClose: () => void
  initial?: EditablePosition
}

export function EditPositionModal({ onSave, onClose, initial }: Props) {
  const [search, setSearch] = useState(initial?.ticker ?? '')
  const [selected, setSelected] = useState<typeof KNOWN_TICKERS[0] | null>(
    initial ? KNOWN_TICKERS.find(t => t.ticker === initial.ticker) ?? null : null
  )
  const [quantity, setQuantity] = useState(initial?.quantity?.toString() ?? '')
  const [ppc, setPpc] = useState(initial?.ppc?.toString() ?? '')
  const [account, setAccount] = useState<EditablePosition['account']>(initial?.account ?? 'Lucio')
  const [targetPct, setTargetPct] = useState(initial?.targetPct?.toString() ?? '')
  const [salePrice, setSalePrice] = useState('')
  const [costOverride, setCostOverride] = useState('')  // editable total cost
  const [error, setError] = useState('')

  const filtered = KNOWN_TICKERS.filter(t =>
    t.ticker.toLowerCase().includes(search.toLowerCase()) ||
    t.name.toLowerCase().includes(search.toLowerCase())
  ).slice(0, 8)

  // Evaluate simple arithmetic: "1500-322", "3091+500", "760*2", etc.
  function evalExpr(expr: string): number {
    try {
      const sanitized = expr.replace(/[^0-9+\-*/().]/g, '')
      // eslint-disable-next-line no-new-func
      const result = new Function('return ' + sanitized)() as number
      return isFinite(result) ? result : NaN
    } catch { return NaN }
  }

  const resolvedQty  = evalExpr(quantity)
  const qtyDisplay   = !isNaN(resolvedQty) && quantity.match(/[+\-*/]/) ? resolvedQty : null

  // Detect sale: expression contains subtraction and result < original quantity
  const isSale       = !!quantity.match(/-/) && !isNaN(resolvedQty) && !!initial && resolvedQty < initial.quantity
  const soldQty      = isSale ? (initial!.quantity - resolvedQty) : 0
  const salePriceNum = parseFloat(salePrice)
  const ppcNum       = parseFloat(ppc)
  const realizedPnl  = isSale && !isNaN(salePriceNum) && !isNaN(ppcNum)
    ? (salePriceNum - ppcNum) * soldQty
    : null

  // Computed cost total (qty × ppc), overridable
  const computedCost = !isNaN(resolvedQty) && !isNaN(ppcNum) ? resolvedQty * ppcNum : null

  // When user edits cost manually → back-calculate PPC
  function handleCostChange(val: string) {
    setCostOverride(val)
    const costNum = parseFloat(val)
    if (!isNaN(costNum) && !isNaN(resolvedQty) && resolvedQty > 0) {
      setPpc((costNum / resolvedQty).toFixed(4))
    }
  }

  // Sync cost override display when qty/ppc change (only if not manually overriding)
  useEffect(() => { setCostOverride('') }, [quantity, ppc])

  const displayCost = costOverride !== '' ? costOverride : (computedCost !== null ? computedCost.toFixed(2) : '')

  function handleSubmit() {
    if (!selected) { setError('Seleccioná un ticker'); return }
    const qty = evalExpr(quantity)
    const price = parseFloat(ppc)
    if (!qty || qty <= 0 || isNaN(qty)) { setError('Ingresá cantidad válida'); return }
    if (!price || price <= 0) { setError('Ingresá PPC válido'); return }

    onSave({
      ticker: selected.ticker,
      tickerYF: selected.tickerYF,
      name: selected.name,
      sector: selected.sector,
      ratio: selected.ratio,
      quantity: qty,
      ppc: price,
      account,
      targetPct: targetPct ? parseFloat(targetPct) : undefined,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div className="w-full max-w-md rounded-2xl border border-slate-700 p-6" style={{ background: '#1e293b' }}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-slate-100">
            {initial ? 'Editar posición' : 'Agregar posición'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Ticker search */}
        <div className="mb-4">
          <label className="block text-xs text-slate-400 mb-1.5">Ticker CEDEAR</label>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              className="w-full rounded-lg pl-8 pr-3 py-2.5 text-sm bg-slate-700 border border-slate-600 text-slate-100 focus:outline-none focus:border-indigo-500"
              placeholder="Buscar por ticker o nombre..."
              value={search}
              onChange={e => { setSearch(e.target.value); setSelected(null) }}
              disabled={!!initial}
            />
          </div>
          {!selected && search && !initial && (
            <div className="mt-1 rounded-lg border border-slate-600 overflow-hidden" style={{ background: '#0f172a' }}>
              {filtered.length === 0 ? (
                <p className="px-3 py-2 text-xs text-slate-500">Sin resultados</p>
              ) : filtered.map(t => (
                <button
                  key={t.ticker}
                  onClick={() => { setSelected(t); setSearch(t.ticker) }}
                  className="w-full flex items-center justify-between px-3 py-2 hover:bg-slate-700 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-indigo-400 w-14 text-left">{t.ticker}</span>
                    <span className="text-xs text-slate-300">{t.name}</span>
                  </div>
                  <span className="text-xs text-slate-500">1:{t.ratio}</span>
                </button>
              ))}
            </div>
          )}
          {selected && (
            <div className="mt-1.5 flex items-center gap-2 text-xs text-slate-400">
              <span className="px-2 py-0.5 bg-indigo-500/15 text-indigo-400 rounded border border-indigo-500/25 font-mono">{selected.ticker}</span>
              <span>{selected.name}</span>
              <span className="text-slate-600">· Ratio 1:{selected.ratio}</span>
            </div>
          )}
        </div>

        {/* Quantity + PPC */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Cantidad (láminas)</label>
            <input
              type="text"
              inputMode="decimal"
              className="w-full rounded-lg px-3 py-2.5 text-sm bg-slate-700 border border-slate-600 text-slate-100 focus:outline-none focus:border-indigo-500"
              placeholder="ej: 1500-322"
              value={quantity}
              onChange={e => setQuantity(e.target.value)}
            />
            {qtyDisplay !== null && (
              <p className="text-xs text-indigo-400 mt-1 font-medium">= {Math.round(qtyDisplay).toLocaleString()} láminas</p>
            )}
            {isSale && (
              <p className="text-xs text-orange-400 mt-0.5">Vendés {Math.round(soldQty).toLocaleString()} láminas</p>
            )}
            {selected && quantity && !isNaN(resolvedQty) && (
              <p className="text-xs text-slate-500 mt-0.5">= {(resolvedQty / selected.ratio).toFixed(2)} ADRs</p>
            )}
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">PPC (USD por lámina)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">$</span>
              <input
                type="number"
                min="0"
                step="0.01"
                className="w-full rounded-lg pl-6 pr-3 py-2.5 text-sm bg-slate-700 border border-slate-600 text-slate-100 focus:outline-none focus:border-indigo-500"
                placeholder="0.00"
                value={ppc}
                onChange={e => { setPpc(e.target.value); setCostOverride('') }}
              />
            </div>
          </div>
        </div>

        {/* Sale price row (only when selling) */}
        {isSale && (
          <div className="mb-3 p-3 rounded-lg border border-orange-500/30 bg-orange-500/5">
            <label className="block text-xs text-orange-400 mb-1.5">Precio de venta (USD por lámina)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">$</span>
              <input
                type="number"
                min="0"
                step="0.01"
                className="w-full rounded-lg pl-6 pr-3 py-2.5 text-sm bg-slate-700 border border-orange-500/40 text-slate-100 focus:outline-none focus:border-orange-400"
                placeholder="Precio al que vendiste"
                value={salePrice}
                onChange={e => setSalePrice(e.target.value)}
              />
            </div>
            {realizedPnl !== null && (
              <p className={`text-sm font-bold mt-2 ${realizedPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                P&L realizado: {realizedPnl >= 0 ? '+' : ''}${realizedPnl.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                <span className="text-xs font-normal text-slate-400 ml-1">
                  ({((salePriceNum - ppcNum) / ppcNum * 100).toFixed(1)}% por lámina)
                </span>
              </p>
            )}
          </div>
        )}

        {/* Account + Target */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Cuenta</label>
            <div className="flex gap-1">
              {(['Lucio', 'Agro'] as const).map(a => (
                <button
                  key={a}
                  onClick={() => setAccount(a)}
                  className={`flex-1 py-2 text-xs font-medium rounded-lg border transition-colors ${account === a ? 'bg-indigo-500 border-indigo-500 text-white' : 'bg-slate-700 border-slate-600 text-slate-300'}`}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Target % (rebalanceo)</label>
            <div className="relative">
              <input
                type="number"
                min="0"
                max="100"
                step="0.5"
                className="w-full rounded-lg px-3 pr-7 py-2.5 text-sm bg-slate-700 border border-slate-600 text-slate-100 focus:outline-none focus:border-indigo-500"
                placeholder="0"
                value={targetPct}
                onChange={e => setTargetPct(e.target.value)}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">%</span>
            </div>
          </div>
        </div>

        {/* Editable cost total */}
        {selected && quantity && ppc && (
          <div className="mb-4">
            <label className="block text-xs text-slate-400 mb-1.5">Costo total invertido (USD)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">$</span>
              <input
                type="number"
                min="0"
                step="0.01"
                className="w-full rounded-lg pl-6 pr-3 py-2.5 text-sm bg-slate-700/60 border border-slate-600 text-slate-100 focus:outline-none focus:border-indigo-500"
                value={displayCost}
                onChange={e => handleCostChange(e.target.value)}
              />
            </div>
            <p className="text-xs text-slate-500 mt-1">Editalo para recalcular el PPC automáticamente</p>
          </div>
        )}

        {error && <p className="text-red-400 text-xs mb-3">{error}</p>}

        <div className="flex gap-2">
          <button
            onClick={handleSubmit}
            className="flex-1 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {initial ? 'Guardar cambios' : 'Agregar posición'}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm rounded-lg transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}
