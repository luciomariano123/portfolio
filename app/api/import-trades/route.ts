import { NextRequest, NextResponse } from 'next/server'
import { createWorker } from 'tesseract.js'
import { writeFile, unlink } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { randomUUID } from 'crypto'

export interface ParsedTrade {
  tipo: 'VENTA' | 'COMPRA'
  ticker: string          // matched to our system ticker
  brokerTicker: string    // as it appeared in the ticket
  cantidad: number
  precio: number
}

// Broker ticker → system ticker mapping
const TICKER_MAP: Record<string, string> = {
  YPFD: 'YPF', YPFDD: 'YPF',
  PAMPD: 'PAMP',
  AMZND: 'AMZN',
  MELID: 'MELI',
  METAD: 'META',
  MSFTD: 'MSFT',
  PLTRD: 'PLTR',
  TSLAD: 'TSLA',
  SPYD: 'SPY',
  TGSUD: 'TGSU2', TGSU2D: 'TGSU2',
  NVDAD: 'NVDA',
  AAPLD: 'AAPL',
  GOOGLD: 'GOOGL',
  KOD: 'KO',
  MCDD: 'MCD',
  PEPD: 'PEP',
  GGALD: 'GGAL',
  BMAD: 'BMA',
  BBARD: 'BBAR',
  QQQD: 'QQQ',
  EWZD: 'EWZ',
  ARKKD: 'ARKK',
  BABOD: 'BABA', BABAD: 'BABA',
  VISTD: 'VIST',
  CEPUD: 'CEPU',
}

const KNOWN_TICKERS = new Set([
  'AAPL','AMZN','ARKK','BABA','BBAR','BMA','CEPU','EWZ','GGAL','GOOGL',
  'KO','MCD','MELI','META','MSFT','NVDA','PAMP','PEP','PLTR','QQQ',
  'SPY','TGSU2','TSLA','VIST','YPF'
])

function mapTicker(raw: string): string {
  const up = raw.toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (TICKER_MAP[up]) return TICKER_MAP[up]
  if (KNOWN_TICKERS.has(up)) return up
  // Try stripping trailing D
  const stripped = up.replace(/D$/, '')
  if (KNOWN_TICKERS.has(stripped)) return stripped
  return up
}

function parseTrades(text: string): ParsedTrade[] {
  const trades: ParsedTrade[] = []
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)

  for (const line of lines) {
    // Look for COMPRA or VENTA keyword
    const tipoMatch = line.match(/\b(COMPRA|VENTA|COMPRAS|VENTAS)\b/i)
    if (!tipoMatch) continue
    const tipo = tipoMatch[1].toUpperCase().replace(/S$/, '') as 'COMPRA' | 'VENTA'

    // Extract numbers from the line (ignore year-like numbers 2024/2025/2026)
    const nums = [...line.matchAll(/\b(\d[\d.,]*)\b/g)]
      .map(m => parseFloat(m[1].replace(/,/g, '.')))
      .filter(n => !isNaN(n) && n !== 2024 && n !== 2025 && n !== 2026)

    if (nums.length < 2) continue

    // Extract ticker-like tokens: 2-6 uppercase chars, optionally followed by digits
    const tickerMatch = line.match(/\b([A-Z]{2,6}(?:\d{1,2})?(?:D)?)\b(?!\s*\.)/g)
    const brokerTicker = tickerMatch
      ? tickerMatch.find(t => !['COMPRA','VENTA','USD','ARS','THE','AND'].includes(t)) ?? ''
      : ''

    if (!brokerTicker) continue

    // Heuristic: largest number = cantidad (láminas), smallest float-like = precio
    // Usually: cantidad is integer-ish and larger, precio is smaller decimal
    const sorted = [...nums].sort((a, b) => b - a)
    const cantidad = Math.round(sorted[0])
    // precio: smallest number that looks like a price (< 10000, has decimals or is small)
    const priceCandidates = nums.filter(n => n < 10000 && n !== cantidad)
    const precio = priceCandidates.length > 0
      ? priceCandidates.reduce((a, b) => Math.abs(a - 50) < Math.abs(b - 50) ? a : b)
      : sorted[sorted.length - 1]

    if (cantidad <= 0 || precio <= 0) continue

    trades.push({
      tipo,
      brokerTicker,
      ticker: mapTicker(brokerTicker),
      cantidad,
      precio,
    })
  }

  return trades
}

export async function POST(req: NextRequest) {
  const { imageBase64, mimeType = 'image/jpeg' } = await req.json() as { imageBase64: string; mimeType?: string }
  if (!imageBase64) return NextResponse.json({ error: 'No image provided' }, { status: 400 })

  // Write image to temp file
  const ext = mimeType.includes('png') ? 'png' : 'jpg'
  const tmpPath = join(tmpdir(), `import_${randomUUID()}.${ext}`)
  const buf = Buffer.from(imageBase64, 'base64')
  await writeFile(tmpPath, buf)

  let rawText = ''
  try {
    const worker = await createWorker('spa+eng')
    const { data } = await worker.recognize(tmpPath)
    rawText = data.text
    await worker.terminate()
  } finally {
    await unlink(tmpPath).catch(() => {})
  }

  if (!rawText.trim()) {
    return NextResponse.json({ error: 'No se pudo leer texto de la imagen', raw: rawText }, { status: 500 })
  }

  const trades = parseTrades(rawText)

  if (trades.length === 0) {
    return NextResponse.json({ error: 'No se detectaron operaciones. Revisá que la imagen muestre claramente COMPRA/VENTA, ticker, cantidad y precio.', raw: rawText }, { status: 422 })
  }

  return NextResponse.json({ trades, raw: rawText })
}
