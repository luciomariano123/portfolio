import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import YahooFinance from 'yahoo-finance2'
import { DEFAULT_POSITIONS as _DP } from '@/lib/whatsapp-positions'
type WPos = { ticker: string; tickerYF: string; name: string; quantity: number; ppc: number; account: string }
const DEFAULT_POSITIONS = _DP as unknown as WPos[]
import { HISTORICAL_DATA, FIXED_INCOME, CASH_POSITIONS } from '@/lib/portfolio-data'

const yf = new YahooFinance({ suppressNotices: ['yahooSurvey'] })

// ── Fetch prices + news ───────────────────────────────────────────────────────

interface PriceRow { ticker: string; name: string; price: number; change: number; changePct: number; value: number; cost: number; pnl: number; pnlPct: number }

async function fetchMarketData() {
  const unique = new Map<string, WPos>()
  for (const p of DEFAULT_POSITIONS) {
    if (!unique.has(p.tickerYF)) unique.set(p.tickerYF, p)
  }

  const priceData: PriceRow[] = []

  await Promise.allSettled(
    Array.from(unique.values()).map(async (pos) => {
      try {
        const q = await yf.quote(pos.tickerYF)
        const price     = q.regularMarketPrice ?? 0
        const change    = q.regularMarketChange ?? 0
        const changePct = q.regularMarketChangePercent ?? 0
        const same      = DEFAULT_POSITIONS.filter(p => p.tickerYF === pos.tickerYF)
        const totalQty  = same.reduce((s, p) => s + p.quantity, 0)
        const avgPpc    = same.reduce((s, p) => s + p.quantity * p.ppc, 0) / totalQty
        const value     = totalQty * price
        const cost      = totalQty * avgPpc
        const pnl       = value - cost
        const pnlPct    = cost > 0 ? (pnl / cost) * 100 : 0
        priceData.push({ ticker: pos.ticker, name: pos.name, price, change, changePct, value, cost, pnl, pnlPct })
      } catch { /* skip */ }
    })
  )

  // Fetch news for top 5 movers
  const topMovers = [...priceData].sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct)).slice(0, 5)
  const news: { ticker: string; title: string; publisher: string }[] = []
  for (const pos of topMovers) {
    try {
      const res = await yf.search(pos.ticker, { newsCount: 2, quotesCount: 0 })
      for (const n of (res.news ?? []).slice(0, 2)) {
        if (n.title) news.push({ ticker: pos.ticker, title: n.title, publisher: (n as { publisher?: string }).publisher ?? '' })
      }
    } catch { /* skip */ }
  }

  return { priceData, news }
}

// ── Build AI prompt ───────────────────────────────────────────────────────────

function buildPrompt(priceData: PriceRow[], news: { ticker: string; title: string; publisher: string }[]) {
  const totalValue = priceData.reduce((s, p) => s + p.value, 0)
  const cashUSD    = CASH_POSITIONS.filter(c => c.currency === 'USD').reduce((s, c) => s + c.amount, 0)
  const onValue    = FIXED_INCOME.reduce((s, fi) => s + fi.nominal, 0)
  const totalComplete = totalValue + cashUSD + onValue

  const now = new Date()
  const ytdBase = HISTORICAL_DATA.filter(d => d.date <= `${now.getFullYear() - 1}-12-31`).at(-1)
  const ytdPct  = ytdBase ? ((totalComplete - ytdBase.quotaPart) / ytdBase.quotaPart) * 100 : 0

  const sorted      = [...priceData].sort((a, b) => b.changePct - a.changePct)
  const gainers     = sorted.filter(p => p.changePct > 0)
  const losers      = sorted.filter(p => p.changePct < 0).reverse()
  const dailyPnlUSD = priceData.reduce((s, p) => s + (p.change * (p.value / (p.price || 1))), 0)

  const posTable = sorted.map(p =>
    `${p.ticker} (${p.name}): precio $${p.price.toFixed(2)}, día ${p.changePct >= 0 ? '+' : ''}${p.changePct.toFixed(2)}%, valor $${Math.round(p.value).toLocaleString()}, P&L total ${p.pnl >= 0 ? '+' : ''}$${Math.round(p.pnl).toLocaleString()} (${p.pnlPct >= 0 ? '+' : ''}${p.pnlPct.toFixed(1)}%)`
  ).join('\n')

  const newsText = news.map(n => `[${n.ticker}] ${n.title}`).join('\n')

  return `Sos un analista financiero personal. Redactá un resumen diario de cartera en español rioplatense (tuteo),
informal pero profesional. Máximo 800 caracteres para WhatsApp. Usá emojis con moderación.

DATOS DE HOY (${now.toLocaleDateString('es-AR')}):
Valor total cartera: $${Math.round(totalComplete).toLocaleString()} USD
  - CEDEARs: $${Math.round(totalValue).toLocaleString()}
  - Cash USD: $${Math.round(cashUSD).toLocaleString()}
  - ONs (VN): $${Math.round(onValue).toLocaleString()}
P&L del día (CEDEARs): ${dailyPnlUSD >= 0 ? '+' : ''}$${Math.round(dailyPnlUSD).toLocaleString()} USD
YTD ${now.getFullYear()}: ${ytdPct >= 0 ? '+' : ''}${ytdPct.toFixed(2)}%

POSICIONES:
${posTable}

NOTICIAS (en inglés, traducilas y resumilas):
${newsText || 'Sin noticias disponibles'}

INSTRUCCIONES:
- Mencioná el valor total y el P&L del día
- Destacá los 2-3 mejores y peores movers con contexto
- Traducí y resumí las noticias más relevantes al español
- Si algún activo está muy sobrecomprado o sobrevendido, mencionalo
- Agregá una observación sobre el contexto macro si corresponde
- Cerrá con una frase corta de perspectiva
- NO uses markdown ni asteriscos, texto plano para WhatsApp`
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY ?? ''
  const KAPSO_KEY     = process.env.KAPSO_API_KEY ?? ''
  const PHONE_ID      = process.env.KAPSO_PHONE_NUMBER_ID ?? ''
  const CRON_SECRET   = process.env.CRON_SECRET ?? ''

  const body = await req.json().catch(() => ({})) as { secret?: string; recipients?: string[] }
  if (!CRON_SECRET || body.secret !== CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!ANTHROPIC_KEY) return NextResponse.json({ error: 'ANTHROPIC_API_KEY not set' }, { status: 500 })
  if (!KAPSO_KEY || !PHONE_ID) return NextResponse.json({ error: 'Kapso not configured' }, { status: 500 })

  const recipients = (
    Array.isArray(body.recipients) && body.recipients.length > 0
      ? body.recipients
      : (process.env.KAPSO_RECIPIENT_PHONES ?? '').split(',').filter(Boolean)
  ).map((r: string) => r.replace(/\D/g, ''))

  if (recipients.length === 0) return NextResponse.json({ error: 'No recipients' }, { status: 400 })

  // Fetch market data
  const { priceData, news } = await fetchMarketData()

  // Generate AI summary
  const anthropic = new Anthropic({ apiKey: ANTHROPIC_KEY })
  const prompt = buildPrompt(priceData, news)

  const aiRes = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 600,
    messages: [{ role: 'user', content: prompt }],
  })

  const summary = aiRes.content[0].type === 'text' ? aiRes.content[0].text : ''

  // Send via Kapso
  const results = await Promise.allSettled(
    recipients.map(phone =>
      fetch(`https://api.kapso.ai/meta/whatsapp/v24.0/${PHONE_ID}/messages`, {
        method: 'POST',
        headers: { 'X-API-Key': KAPSO_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: phone,
          type: 'text',
          text: { preview_url: false, body: summary },
        }),
      })
    )
  )

  const sent   = results.filter(r => r.status === 'fulfilled').length
  const failed = results.length - sent

  return NextResponse.json({ ok: true, sent, failed, preview: summary.slice(0, 200) })
}
