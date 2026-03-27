'use client'

import { useState, useRef, useEffect } from 'react'
import { X, Camera, Loader2, CheckCircle, AlertCircle, Plus, Minus, Upload } from 'lucide-react'
import { EditablePosition, KNOWN_TICKERS } from '@/lib/positions-store'

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

// Broker ticker → system ticker mapping
const TICKER_MAP: Record<string, string> = {
  YPFD: 'YPF', YPFDD: 'YPF',
  PAMPD: 'PAMP', AMZND: 'AMZN', MELID: 'MELI', METAD: 'META',
  MSFTD: 'MSFT', PLTRD: 'PLTR', TSLAD: 'TSLA', SPYD: 'SPY',
  TGSUD: 'TGSU2', TGSU2D: 'TGSU2', NVDAD: 'NVDA', AAPLD: 'AAPL',
  GOOGLD: 'GOOGL', KOD: 'KO', MCDD: 'MCD', PEPD: 'PEP',
  GGALD: 'GGAL', BMAD: 'BMA', BBARD: 'BBAR', QQQD: 'QQQ',
  EWZD: 'EWZ', ARKKD: 'ARKK', BABAD: 'BABA', VISTD: 'VIST', CEPUD: 'CEPU',
}
const KNOWN_SET = new Set(KNOWN_TICKERS.map(t => t.ticker))

function mapTicker(raw: string): string {
  const up = raw.toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (TICKER_MAP[up]) return TICKER_MAP[up]
  if (KNOWN_SET.has(up)) return up
  const stripped = up.replace(/D$/, '')
  if (KNOWN_SET.has(stripped)) return stripped
  return up
}

function parseTrades(text: string): ParsedTrade[] {
  const trades: ParsedTrade[] = []
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)

  for (const line of lines) {
    const tipoMatch = line.match(/\b(COMPRA|VENTA|COMPRAS|VENTAS)\b/i)
    if (!tipoMatch) continue
    const tipo = tipoMatch[1].toUpperCase().replace(/S$/, '') as 'COMPRA' | 'VENTA'

    const nums = [...line.matchAll(/\b(\d[\d.,]*)\b/g)]
      .map(m => parseFloat(m[1].replace(/\./g, '').replace(',', '.')))
      .filter(n => !isNaN(n) && n > 0 && n < 9_000_000 && ![2024, 2025, 2026, 2027].includes(n))

    if (nums.length < 2) continue

    const skipWords = new Set(['COMPRA','VENTA','USD','ARS','THE','AND','CON','POR','DEL','LAS','LOS'])
    const tickerMatch = [...line.matchAll(/\b([A-Z]{2,6}(?:\d{1,2})?D?)\b/g)]
      .map(m => m[1])
      .find(t => !skipWords.has(t))

    if (!tickerMatch) continue

    // largest = cantidad (shares), smallest reasonable = precio
    const sorted = [...nums].sort((a, b) => b - a)
    const cantidad = Math.round(sorted[0])
    const priceCandidates = nums.filter(n => Math.round(n) !== cantidad && n < 50000)
    const precio = priceCandidates.length > 0
      ? priceCandidates[priceCandidates.length - 1]
      : sorted[sorted.length - 1]

    if (cantidad <= 0 || precio <= 0) continue

    trades.push({ tipo, brokerTicker: tickerMatch, ticker: mapTicker(tickerMatch), cantidad, precio })
  }
  return trades
}

export function ImportTradesModal({ account, onApply, onClose }: Props) {
  const [step, setStep] = useState<'upload' | 'parsing' | 'review' | 'error'>('upload')
  const [trades, setTrades] = useState<ParsedTrade[]>([])
  const [errorMsg, setErrorMsg] = useState('')
  const [rawText, setRawText] = useState('')
  const [preview, setPreview] = useState<string | null>(null)
  const [progress, setProgress] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

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
    setProgress('Cargando OCR...')

    try {
      // Dynamic import so tesseract only loads when needed
      const { createWorker } = await import('tesseract.js')
      const worker = await createWorker('spa+eng', 1, {
        logger: (m: { status: string; progress: number }) => {
          if (m.status === 'loading tesseract core') setProgress('Cargando motor OCR...')
          else if (m.status === 'loading language traineddata') setProgress('Descargando idioma...')
          else if (m.status === 'recognizing text') setProgress(`Reconociendo texto... ${Math.round((m.progress ?? 0) * 100)}%`)
        },
      })
      const { data } = await worker.recognize(file)
      await worker.terminate()

      const text = data.text
      setRawText(text)

      if (!text.trim()) {
        setErrorMsg('No se pudo leer texto de la imagen.')
        setStep('error')
        return
      }

      const parsed = parseTrades(text)
      if (parsed.length === 0) {
        setErrorMsg('No se detectaron operaciones COMPRA/VENTA. Asegurate que la imagen muestre las columnas claramente.')
        setStep('error')
        return
      }
      setTrades(parsed)
      setStep('review')
    } catch (e) {
      setErrorMsg(String(e))
      setStep('error')
    }
  }

  function buildPosition(trade: ParsedTrade): EditablePosition | null {
    const known = KNOWN_TICKERS.find(t => t.ticker === trade.ticker)
    if (!known) return null
    return { ...known, quantity: trade.cantidad, ppc: trade.precio, account }
  }

  function handleApply() {
    const mapped = trades.flatMap(t => {
      const pos = buildPosition(t)
      return pos ? [{ trade: t, pos }] : []
    })
    onApply(mapped)
    onClose()
  }

  function reset() { setStep('upload'); setPreview(null); setTrades([]); setRawText('') }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)' }}>
      <div className="w-full max-w-lg rounded-2xl border border-slate-700 overflow-hidden" style={{ background: '#1e293b' }}>
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
              <input ref={inputRef} type="file" accept="image/*" className="hidden"
                onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]) }} />
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
                  <Upload size={12} />Seleccionar imagen
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-3 text-center">
                OCR gratuito en el navegador — lee texto directamente de la imagen
              </p>
            </div>
          )}

          {step === 'parsing' && (
            <div className="flex flex-col items-center gap-4 py-10">
              {preview && <img src={preview} className="w-32 h-32 object-cover rounded-lg opacity-50" alt="preview" />}
              <Loader2 size={28} className="animate-spin text-indigo-400" />
              <p className="text-sm text-slate-300">{progress || 'Iniciando...'}</p>
              <p className="text-xs text-slate-500">Primera vez puede tardar ~30s (descarga idioma)</p>
            </div>
          )}

          {step === 'error' && (
            <div className="flex flex-col items-center gap-3 py-8">
              <AlertCircle size={32} className="text-red-400" />
              <p className="text-sm font-medium text-red-400">No se pudieron detectar operaciones</p>
              <p className="text-xs text-slate-400 text-center max-h-32 overflow-y-auto px-2">{errorMsg}</p>
              {rawText && (
                <details className="w-full mt-2">
                  <summary className="text-xs text-slate-500 cursor-pointer">Ver texto detectado</summary>
                  <pre className="text-xs text-slate-400 mt-1 p-2 bg-slate-800 rounded max-h-40 overflow-y-auto whitespace-pre-wrap">{rawText}</pre>
                </details>
              )}
              <button onClick={reset} className="mt-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm rounded-lg transition-colors">
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
                      t.tipo === 'COMPRA' ? 'border-emerald-500/25 bg-emerald-500/5' : 'border-orange-500/25 bg-orange-500/5'
                    }`}>
                      <div className="flex items-center gap-2.5">
                        <div className={`w-6 h-6 rounded flex items-center justify-center flex-shrink-0 ${t.tipo === 'COMPRA' ? 'bg-emerald-500/20' : 'bg-orange-500/20'}`}>
                          {t.tipo === 'COMPRA' ? <Plus size={12} className="text-emerald-400" /> : <Minus size={12} className="text-orange-400" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-bold text-slate-100">{t.ticker}</span>
                            {t.brokerTicker !== t.ticker && <span className="text-xs text-slate-500">({t.brokerTicker})</span>}
                            {!known && <span className="text-xs text-red-400 bg-red-500/10 px-1 rounded">no reconocido</span>}
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
              {rawText && (
                <details className="mt-3">
                  <summary className="text-xs text-slate-500 cursor-pointer">Ver texto OCR detectado</summary>
                  <pre className="text-xs text-slate-400 mt-1 p-2 bg-slate-800 rounded max-h-40 overflow-y-auto whitespace-pre-wrap">{rawText}</pre>
                </details>
              )}
              <div className="mt-4 p-3 rounded-lg bg-slate-700/40 text-xs text-slate-400">
                Las COMPRAs suman láminas (ppc ponderado). Las VENTAs restan láminas.
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={handleApply}
                  disabled={trades.every(t => !KNOWN_TICKERS.find(k => k.ticker === t.ticker))}
                  className="flex-1 py-2.5 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-40 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Aplicar a cartera ({account})
                </button>
                <button onClick={reset} className="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm rounded-lg transition-colors">
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
