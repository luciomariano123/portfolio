import { NextRequest, NextResponse } from 'next/server'

export interface ParsedTrade {
  tipo: 'VENTA' | 'COMPRA'
  ticker: string          // matched to our system ticker
  brokerTicker: string    // as it appeared in the ticket
  cantidad: number
  precio: number
}

const KNOWN_TICKERS = ['AAPL','AMZN','ARKK','BABA','BBAR','BMA','CEPU','EWZ','GGAL','GOOGL','KO','MCD','MELI','META','MSFT','NVDA','PAMP','PEP','PLTR','QQQ','SPY','TGSU2','TSLA','VIST','YPF']

export async function POST(req: NextRequest) {
  const GEMINI_KEY = process.env.GEMINI_API_KEY ?? ''
  if (!GEMINI_KEY) return NextResponse.json({ error: 'GEMINI_API_KEY not set' }, { status: 500 })

  const { imageBase64, mimeType = 'image/jpeg' } = await req.json() as { imageBase64: string; mimeType?: string }
  if (!imageBase64) return NextResponse.json({ error: 'No image provided' }, { status: 400 })

  const prompt = `Analizá esta imagen de boletos de operaciones bursátiles argentinas.
Extraé TODAS las filas de operaciones y devolvé un JSON array con este formato:
[
  {
    "tipo": "VENTA" o "COMPRA",
    "brokerTicker": "ticker exacto como aparece en la columna Ticker",
    "ticker": "ticker de nuestra lista más cercano (considerando también la Descripción)",
    "cantidad": número de láminas/acciones (columna Cant.),
    "precio": precio unitario en USD (columna Precio, solo el número)
  }
]

Lista de tickers válidos en nuestro sistema: ${KNOWN_TICKERS.join(', ')}

Reglas de mapeo importantes:
- YPFD → YPF (YPF en nuestro sistema)
- TGSU2 → TGSU2
- PAMP → PAMP
- Si el ticker del broker no está en la lista, usá la Descripción para encontrar el más parecido
- Precio: solo el número sin "usd" ni "$", si tiene coma decimal usá punto

Respondé SOLO con el JSON array, sin texto adicional ni markdown.`

  const geminiRes = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            { inline_data: { mime_type: mimeType, data: imageBase64 } }
          ]
        }],
        generationConfig: { temperature: 0, maxOutputTokens: 1024 }
      })
    }
  )

  if (!geminiRes.ok) {
    const err = await geminiRes.text()
    return NextResponse.json({ error: 'Gemini error', detail: err }, { status: 500 })
  }

  const geminiData = await geminiRes.json() as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
  }

  const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? ''

  // Extract JSON from response (remove markdown code blocks if present)
  const jsonMatch = text.match(/\[[\s\S]*\]/)
  if (!jsonMatch) return NextResponse.json({ error: 'Could not parse Gemini response', raw: text }, { status: 500 })

  const trades = JSON.parse(jsonMatch[0]) as ParsedTrade[]
  return NextResponse.json({ trades })
}
