'use client'

import { useState, useRef, useEffect } from 'react'
import { X, Upload, Camera, Loader2, CheckCircle, AlertCircle, Plus, Minus } from 'lucide-react'
import { EditablePosition } from '@/lib/positions-store'
import { KNOWN_TICKERS } from '@/lib/positions-store'

interface ParsedTrade {
  tipo: 'VENTA' | 'COMPRA'
  ticker: string
  brokerTicker: string
  cantidad: number
  precio: number
}

interface Props {
  account: 'Lucio' | 'Agro'
  onApply: (trades: { trade: ParsedTrade; pos: EditablePosition }[]) => void
  onClose: () => void
}

export function ImportTradesModal({ account, onApply, onClose }: Props) {
  const [step, setStep] = useState<'upload' | 'parsing' | 'review' | 'error'>('upload')
  const [trades, setTrades] = useState<ParsedTrade[]>([])
  const [errorMsg, setErrorMsg] = useState('')
  const [preview, setPreview] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Paste support (Ctrl+V)
  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      if (step !== 'upload') return
      const item = Array.from(e.clipboardData?.items ?? []).find(i => i.type.startsWith('image/'))
      if (item) handleFile(item.getAsFile()!)
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [step])

  async function handleFile(file: File) {
    setPreview(URL.createObjectURL(file))
    setStep('parsing')

    const reader = new FileReader()
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string
      // strip "data:image/jpeg;base64,"
      const base64 = dataUrl.split(',')[1]
      const mimeType = file.type || 'image/jpeg'

      try {
        const res = await fetch('/api/import-trades', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: base64, mimeType }),
        })
        const data = await res.json() as { trades?: ParsedTrade[]; error?: string; detail?: string; raw?: string }
        if (!res.ok || !data.trades) {
          setErrorMsg(data.detail ?? data.raw ?? data.error ?? `Error ${res.status}`)
          setStep('error')
          return
        }
        setTrades(data.trades)
        setStep('review')
      } catch (e) {
        setErrorMsg(String(e))
        setStep('error')
      }
    }
    reader.readAsDataURL(file)
  }

  function buildPosition(trade: ParsedTrade): EditablePosition | null {
    const known = KNOWN_TICKERS.find(t => t.ticker === trade.ticker)
    if (!known) return null
    return {
      ticker: known.ticker,
      tickerYF: known.tickerYF,
      name: known.name,
      sector: known.sector,
      ratio: known.ratio,
      quantity: trade.cantidad,
      ppc: trade.precio,
      account,
    }
  }

  function handleApply() {
    const mapped = trades.flatMap(t => {
      const pos = buildPosition(t)
      return pos ? [{ trade: t, pos }] : []
    })
    onApply(mapped)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)' }}>
      <div className="w-full max-w-lg rounded-2xl border border-slate-700 overflow-hidden" style={{ background: '#1e293b' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
          <div>
            <h2 className="text-base font-bold text-slate-100">Importar boletos</h2>
            <p className="text-xs text-slate-400 mt-0.5">Cuenta: <span className="text-indigo-400 font-medium">{account}</span></p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="p-5">
          {step === 'upload' && (
            <div>
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]) }}
              />
              <div
                onClick={() => inputRef.current?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
                className="border-2 border-dashed border-slate-600 hover:border-indigo-500 rounded-xl p-10 flex flex-col items-center gap-3 cursor-pointer transition-colors group"
              >
                <div className="w-14 h-14 rounded-full bg-indigo-500/10 flex items-center justify-center group-hover:bg-indigo-500/20 transition-colors">
                  <Camera size={26} className="text-indigo-400" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-slate-200">Subir screenshot del broker</p>
                  <p className="text-xs text-slate-500 mt-1">Hacé clic, arrastrá, o <kbd className="px-1 py-0.5 bg-slate-700 rounded text-slate-300 font-mono">Ctrl+V</kbd> para pegar</p>
                </div>
                <div className="flex items-center gap-2 text-xs text-indigo-400 bg-indigo-500/10 px-3 py-1.5 rounded-full">
                  <Upload size={12} />
                  Seleccionar imagen
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-3 text-center">
                OCR gratuito — lee el texto del boleto y extrae Tipo / Ticker / Cantidad / Precio
              </p>
            </div>
          )}

          {step === 'parsing' && (
            <div className="flex flex-col items-center gap-4 py-10">
              {preview && <img src={preview} className="w-32 h-32 object-cover rounded-lg opacity-50" alt="preview" />}
              <Loader2 size={28} className="animate-spin text-indigo-400" />
              <p className="text-sm text-slate-300">Leyendo texto con OCR... (puede tardar ~30s la primera vez)</p>
            </div>
          )}

          {step === 'error' && (
            <div className="flex flex-col items-center gap-3 py-8">
              <AlertCircle size={32} className="text-red-400" />
              <p className="text-sm font-medium text-red-400">Error al procesar la imagen</p>
              <p className="text-xs text-slate-400 text-center max-h-32 overflow-y-auto break-all px-2">{errorMsg}</p>
              <button
                onClick={() => { setStep('upload'); setPreview(null) }}
                className="mt-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm rounded-lg transition-colors"
              >
                Intentar de nuevo
              </button>
            </div>
          )}

          {step === 'review' && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle size={16} className="text-emerald-400" />
                <p className="text-sm font-medium text-emerald-400">{trades.length} operación{trades.length !== 1 ? 'es' : ''} detectada{trades.length !== 1 ? 's' : ''}</p>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {trades.map((t, i) => {
                  const known = KNOWN_TICKERS.find(k => k.ticker === t.ticker)
                  return (
                    <div key={i} className={`flex items-center justify-between rounded-lg border px-3 py-2.5 ${
                      t.tipo === 'COMPRA'
                        ? 'border-emerald-500/25 bg-emerald-500/5'
                        : 'border-orange-500/25 bg-orange-500/5'
                    }`}>
                      <div className="flex items-center gap-2.5">
                        <div className={`w-6 h-6 rounded flex items-center justify-center flex-shrink-0 ${
                          t.tipo === 'COMPRA' ? 'bg-emerald-500/20' : 'bg-orange-500/20'
                        }`}>
                          {t.tipo === 'COMPRA'
                            ? <Plus size={12} className="text-emerald-400" />
                            : <Minus size={12} className="text-orange-400" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-bold text-slate-100">{t.ticker}</span>
                            {t.brokerTicker !== t.ticker && (
                              <span className="text-xs text-slate-500">({t.brokerTicker})</span>
                            )}
                            {!known && (
                              <span className="text-xs text-red-400 bg-red-500/10 px-1 rounded">no reconocido</span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400">{known?.name ?? '—'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-mono text-slate-200">{t.cantidad.toLocaleString()} lám.</p>
                        <p className="text-xs font-mono text-slate-400">${t.precio.toFixed(2)}/lám.</p>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="mt-4 p-3 rounded-lg bg-slate-700/40 text-xs text-slate-400">
                Las COMPRAs suman láminas a la posición existente (ppc ponderado). Las VENTAs restan láminas.
              </div>

              <div className="flex gap-2 mt-4">
                <button
                  onClick={handleApply}
                  disabled={trades.every(t => !KNOWN_TICKERS.find(k => k.ticker === t.ticker))}
                  className="flex-1 py-2.5 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-40 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Aplicar a cartera ({account})
                </button>
                <button
                  onClick={() => { setStep('upload'); setPreview(null); setTrades([]) }}
                  className="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm rounded-lg transition-colors"
                >
                  Nueva imagen
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
