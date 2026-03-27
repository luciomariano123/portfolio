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

const TICKER_MAP: Record<string, string> = {
  YPFD: 'YPF', YPFDD: 'YPF', PAMPD: 'PAMP', AMZND: 'AMZN', MELID: 'MELI',
  METAD: 'META', MSFTD: 'MSFT', PLTRD: 'PLTR', TSLAD: 'TSLA', SPYD: 'SPY',
  TGSUD: 'TGSU2', TGSU2D: 'TGSU2', NVDAD: 'NVDA', AAPLD: 'AAPL', GOOGLD: 'GOOGL',
  KOD: 'KO', MCDD: 'MCD', PEPD: 'PEP', GGALD: 'GGAL', BMAD: 'BMA', BBARD: 'BBAR',
  QQQD: 'QQQ', EWZD: 'EWZ', ARKKD: 'ARKK', BABAD: 'BABA', VISTD: 'VIST', CEPUD: 'CEPU',
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

/** Parse Argentine-formatted number: periods = thousands sep, comma = decimal */
function parseArgNum(s: string): number {
  // e.g. "14.712,18" → 14712.18 ; "3,545" → 3.545 ; "4560" → 4560
  const hasPeriodAndComma = s.includes('.') && s.includes(',')
  const hasOnlyComma = !s.includes('.') && s.includes(',')
  if (hasPeriodAndComma) return parseFloat(s.replace(/\./g, '').replace(',', '.'))
  if (hasOnlyComma) return parseFloat(s.replace(',', '.'))
  return parseFloat(s.replace(/\./g, ''))  // remove thousand-separating periods
}

function parseTrades(text: string): ParsedTrade[] {
  const trades: ParsedTrade[] = []
  const skipWords = new Set(['COMPRA','VENTA','USD','ARS','MEP','THE','AND','CON','POR','DEL','LAS','LOS','VOTO','ESC','ESCRIT','ENERGIA'])

  // Process each line
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const tipoMatch = line.match(/\b(COMPRA|VENTA)\b/i)
    if (!tipoMatch) continue
    const tipo = tipoMatch[1].toUpperCase() as 'COMPRA' | 'VENTA'

    // Combine with next line in case it wraps
    const combined = line + ' ' + (lines[i + 1] ?? '')

    // Find ticker: uppercase word not in skipWords
    const tickerCandidates = [...combined.matchAll(/\b([A-Z]{2,6}(?:\d{1,2})?D?)\b/g)]
      .map(m => m[1])
      .filter(t => !skipWords.has(t) && !['COMPRA','VENTA'].includes(t))
    const brokerTicker = tickerCandidates[0] ?? ''
    if (!brokerTicker) continue

    // Extract all numeric tokens from the combined lines
    // Keep original strings to parse Argentine format
    const numTokens = [...combined.matchAll(/\b(\d[\d.,]*)\b/g)].map(m => m[1])
    const nums = numTokens.map(parseArgNum).filter(n => !isNaN(n) && n > 0)

    // Skip boleto numbers (very large, > 500_000)
    const useful = nums.filter(n => n < 500_000)

    if (useful.length < 2) continue

    // First useful integer-ish number = cantidad
    const cantIdx = useful.findIndex(n => Number.isInteger(n) || Math.abs(n - Math.round(n)) < 0.01)
    if (cantIdx === -1) continue
    const cantidad = Math.round(useful[cantIdx])

    // Remaining numbers after cantidad
    const rest = useful.slice(cantIdx + 1)

    // Find precio: try each candidate, verify with bruto (cant × price ≈ some other number)
    let precio = 0
    for (const raw of rest) {
      // Try raw as-is, /10, /100, /1000
      for (const divisor of [1, 10, 100, 1000]) {
        const candidate = raw / divisor
        if (candidate <= 0 || candidate > 10000) continue
        // Check if candidate × cantidad ≈ any number in the rest (bruto)
        const bruto = candidate * cantidad
        const verified = rest.some(n => Math.abs(n - bruto) / bruto < 0.02)
        if (verified) { precio = candidate; break }
      }
      if (precio > 0) break
    }

    // Fallback: use first small number in rest as price
    if (precio === 0 && rest.length > 0) {
      precio = rest.find(n => n < 10000 && n > 0) ?? 0
    }

    if (cantidad <= 0 || precio <= 0) continue

    trades.push({ tipo, brokerTicker, ticker: mapTicker(brokerTicker), cantidad, precio })
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
      const { createWorker } = await import('tesseract.js')
      const worker = await createWorker('spa+eng', 1, {
        logger: (m: { status: string; progress: number }) => {
          if (m.status === 'loading tesseract core') setProgress('Cargando motor OCR...')
          else if (m.status === 'loading language traineddata') setProgress('Descargando idioma (1° vez)...')
          else if (m.status === 'recognizing text') setProgress(`Reconociendo... ${Math.round((m.progress ?? 0) * 100)}%`)
        },
      })
      const { data } = await worker.recognize(file)
      await worker.terminate()
      const text = data.text
      setRawText(text)
      if (!text.trim()) { setErrorMsg('No se pudo leer texto.'); setStep('error'); return }
      const parsed = parseTrades(text)
      if (parsed.length === 0) {
        setErrorMsg('No se detectaron operaciones COMPRA/VENTA.')
        setStep('error'); return
      }
      setTrades(parsed)
      setStep('review')
    } catch (e) { setErrorMsg(String(e)); setStep('error') }
  }

  function updateTrade(i: number, field: 'cantidad' | 'precio', val: string) {
    setTrades(prev => prev.map((t, idx) => idx === i ? { ...t, [field]: parseFloat(val) || t[field] } : t))
  }

  function buildPosition(trade: ParsedTrade): EditablePosition | null {
    const known = KNOWN_TICKERS.find(t => t.ticker === trade.ticker)
    if (!known) return null
    return { ...known, quantity: trade.cantidad, ppc: trade.precio, account }
  }

  function handleApply() {
    onApply(trades.flatMap(t => { const pos = buildPosition(t); return pos ? [{ trade: t, pos }] : [] }))
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
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400"><X size={16} /></button>
        </div>

        <div className="p-5">
          {step === 'upload' && (
            <div>
              <input ref={inputRef} type="file" accept="image/*" className="hidden"
                onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]) }} />
              <div onClick={() => inputRef.current?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
                className="border-2 border-dashed border-slate-600 hover:border-indigo-500 rounded-xl p-10 flex flex-col items-center gap-3 cursor-pointer transition-colors group">
                <div className="w-14 h-14 rounded-full bg-indigo-500/10 flex items-center justify-center group-hover:bg-indigo-500/20">
                  <Camera size={26} className="text-indigo-400" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-slate-200">Subir screenshot del broker</p>
                  <p className="text-xs text-slate-500 mt-1">Hacé clic, arrastrá, o <kbd className="px-1 py-0.5 bg-slate-700 rounded text-slate-300 font-mono">Ctrl+V</kbd></p>
                </div>
                <div className="flex items-center gap-2 text-xs text-indigo-400 bg-indigo-500/10 px-3 py-1.5 rounded-full">
                  <Upload size={12} />Seleccionar imagen
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-3 text-center">OCR gratis en el navegador · podés editar los valores antes de aplicar</p>
            </div>
          )}

          {step === 'parsing' && (
            <div className="flex flex-col items-center gap-4 py-10">
              {preview && <img src={preview} className="w-32 h-32 object-cover rounded-lg opacity-50" alt="preview" />}
              <Loader2 size={28} className="animate-spin text-indigo-400" />
              <p className="text-sm text-slate-300">{progress || 'Iniciando...'}</p>
              <p className="text-xs text-slate-500">Primera vez ~30s (descarga idioma y se cachea)</p>
            </div>
          )}

          {step === 'error' && (
            <div className="flex flex-col items-center gap-3 py-8">
              <AlertCircle size={32} className="text-red-400" />
              <p className="text-sm font-medium text-red-400">No se detectaron operaciones</p>
              <p className="text-xs text-slate-400 text-center max-h-24 overflow-y-auto px-2">{errorMsg}</p>
              {rawText && (
                <details className="w-full mt-1">
                  <summary className="text-xs text-slate-500 cursor-pointer">Ver texto OCR</summary>
                  <pre className="text-xs text-slate-400 mt-1 p-2 bg-slate-800 rounded max-h-40 overflow-y-auto whitespace-pre-wrap">{rawText}</pre>
                </details>
              )}
              <button onClick={reset} className="mt-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm rounded-lg">Intentar de nuevo</button>
            </div>
          )}

          {step === 'review' && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle size={16} className="text-emerald-400" />
                <p className="text-sm font-medium text-emerald-400">{trades.length} operación{trades.length !== 1 ? 'es' : ''} — editá antes de aplicar</p>
              </div>

              {/* Editable table */}
              <div className="rounded-lg border border-slate-700 overflow-hidden mb-3">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-700 bg-slate-800">
                      <th className="text-left px-3 py-2 text-slate-400 font-medium">Tipo</th>
                      <th className="text-left px-3 py-2 text-slate-400 font-medium">Ticker</th>
                      <th className="text-right px-3 py-2 text-slate-400 font-medium">Cant.</th>
                      <th className="text-right px-3 py-2 text-slate-400 font-medium">Precio USD</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {trades.map((t, i) => {
                      const known = KNOWN_TICKERS.find(k => k.ticker === t.ticker)
                      return (
                        <tr key={i} className="hover:bg-slate-700/20">
                          <td className="px-3 py-2">
                            <span className={`font-medium ${t.tipo === 'COMPRA' ? 'text-emerald-400' : 'text-orange-400'}`}>
                              {t.tipo === 'COMPRA' ? <Plus size={10} className="inline mr-1" /> : <Minus size={10} className="inline mr-1" />}
                              {t.tipo}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            <p className="font-bold text-slate-100">{t.ticker}</p>
                            {!known && <p className="text-red-400">no reconocido</p>}
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number" min="1"
                              value={t.cantidad}
                              onChange={e => updateTrade(i, 'cantidad', e.target.value)}
                              className="w-20 text-right bg-slate-700 border border-slate-600 rounded px-2 py-1 text-slate-100 focus:outline-none focus:border-indigo-500"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex items-center justify-end gap-1">
                              <span className="text-slate-500">$</span>
                              <input
                                type="number" min="0" step="0.01"
                                value={t.precio}
                                onChange={e => updateTrade(i, 'precio', e.target.value)}
                                className="w-20 text-right bg-slate-700 border border-slate-600 rounded px-2 py-1 text-slate-100 focus:outline-none focus:border-indigo-500"
                              />
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {rawText && (
                <details className="mb-3">
                  <summary className="text-xs text-slate-500 cursor-pointer">Ver texto OCR detectado</summary>
                  <pre className="text-xs text-slate-400 mt-1 p-2 bg-slate-800 rounded max-h-32 overflow-y-auto whitespace-pre-wrap">{rawText}</pre>
                </details>
              )}

              <p className="text-xs text-slate-500 mb-3">COMPRAs suman láminas (ppc ponderado) · VENTAs restan láminas</p>

              <div className="flex gap-2">
                <button onClick={handleApply}
                  disabled={trades.every(t => !KNOWN_TICKERS.find(k => k.ticker === t.ticker))}
                  className="flex-1 py-2.5 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-40 text-white text-sm font-medium rounded-lg">
                  Aplicar a cartera ({account})
                </button>
                <button onClick={reset} className="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm rounded-lg">
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
