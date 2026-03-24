import { NextRequest, NextResponse } from 'next/server'
import YahooFinance from 'yahoo-finance2'
import { DEFAULT_POSITIONS as _DP } from '@/lib/whatsapp-positions'
import { HISTORICAL_DATA, FIXED_INCOME, CASH_POSITIONS } from '@/lib/portfolio-data'

type WPos = { ticker: string; tickerYF: string; name: string; quantity: number; ppc: number; account: string }
const DEFAULT_POSITIONS = _DP as unknown as WPos[]

const yf = new YahooFinance({ suppressNotices: ['yahooSurvey'] })

// ── Types ─────────────────────────────────────────────────────────────────────

interface PriceRow {
  ticker: string; name: string; price: number; change: number
  changePct: number; value: number; cost: number; pnl: number; pnlPct: number
}

interface NewsItem { ticker: string; title: string; titleEs: string; link: string }

// ── Free Google Translate (no API key needed) ─────────────────────────────────

async function translateToSpanish(text: string): Promise<string> {
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=es&dt=t&q=${encodeURIComponent(text)}`
    const res  = await fetch(url, { signal: AbortSignal.timeout(3000) })
    const json = await res.json()
    // Response: [[[translated, original, ...], ...], ...]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parts = (json[0] as any[]).map((s: any) => s[0]).join('')
    return parts || text
  } catch {
    return text // fallback to original if translate fails
  }
}

// ── Fetch prices + news ───────────────────────────────────────────────────────

async function fetchMarketData() {
  const unique = new Map<string, WPos>()
  for (const p of DEFAULT_POSITIONS) {
    if (!unique.has(p.tickerYF)) unique.set(p.tickerYF, p)
  }

  const priceData: PriceRow[] = []

  await Promise.allSettled(
    Array.from(unique.values()).map(async (pos) => {
      try {
        const q         = await yf.quote(pos.tickerYF)
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

  // News for top movers — fetch title + link, then translate
  const topMovers = [...priceData].sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct)).slice(0, 4)
  const news: NewsItem[] = []

  for (const pos of topMovers) {
    try {
      const res = await yf.search(pos.ticker, { newsCount: 2, quotesCount: 0 })
      for (const n of (res.news ?? []).slice(0, 1)) {
        if (!n.title) continue
        const link    = (n as { link?: string }).link ?? ''
        const titleEs = await translateToSpanish(n.title)
        news.push({ ticker: pos.ticker, title: n.title, titleEs, link })
      }
    } catch { /* skip */ }
  }

  return { priceData, news }
}

// ── Smart summary generator (no API needed) ───────────────────────────────────

function generateSummary(priceData: PriceRow[], news: NewsItem[]): string {
  const now         = new Date()
  const dateStr     = now.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Argentina/Buenos_Aires' })
  const totalCEDEAR = priceData.reduce((s, p) => s + p.value, 0)
  const cashUSD     = CASH_POSITIONS.filter(c => c.currency === 'USD').reduce((s, c) => s + c.amount, 0)
  const onValue     = FIXED_INCOME.reduce((s, fi) => s + fi.nominal, 0)
  const total       = totalCEDEAR + cashUSD + onValue

  const dailyPnl    = priceData.reduce((s, p) => s + p.change * (p.price > 0 ? p.value / p.price : 0), 0)
  const dailyPnlPct = totalCEDEAR > 0 ? (dailyPnl / (totalCEDEAR - dailyPnl)) * 100 : 0

  const ytdBase   = HISTORICAL_DATA.filter(d => d.date <= `${now.getFullYear() - 1}-12-31`).at(-1)
  const ytdPct    = ytdBase ? ((total - ytdBase.quotaPart) / ytdBase.quotaPart) * 100 : 0
  const ytdAbs    = ytdBase ? total - ytdBase.quotaPart : 0

  const sorted    = [...priceData].sort((a, b) => b.changePct - a.changePct)
  const gainers   = sorted.filter(p => p.changePct > 0)
  const losers    = sorted.filter(p => p.changePct < 0).reverse()

  const fmt       = (n: number) => Math.abs(n).toLocaleString('en-US', { maximumFractionDigits: 0 })
  const fmtPct    = (n: number) => (n >= 0 ? '+' : '') + n.toFixed(2) + '%'
  const sign      = (n: number) => n >= 0 ? '+' : '-'

  // ── Intro con contexto del día ──
  const dayGood = dailyPnl >= 0
  const intros = dayGood
    ? [`Buen ${dateStr.split(',')[0]} para la cartera.`, `El ${dateStr.split(',')[0]} cerró en verde.`, `Jornada positiva hoy.`]
    : [`El ${dateStr.split(',')[0]} no fue el mejor.`, `Jornada complicada hoy.`, `El mercado presionó un poco hoy.`]
  const intro = intros[now.getDate() % intros.length]

  let msg = `📊 Resumen ${dateStr}\n\n`
  msg += `${intro}\n`
  msg += `Cartera total: $${fmt(total)} USD\n`
  msg += `Hoy: ${sign(dailyPnl)}$${fmt(Math.abs(dailyPnl))} (${fmtPct(dailyPnlPct)})\n`
  msg += `YTD ${now.getFullYear()}: ${sign(ytdAbs)}$${fmt(Math.abs(ytdAbs))} (${fmtPct(ytdPct)})\n`

  // ── Top gainers ──
  if (gainers.length > 0) {
    msg += `\n🚀 Subieron:\n`
    for (const p of gainers.slice(0, 3)) {
      const impact = p.change * (p.price > 0 ? p.value / p.price : 0)
      msg += `${p.ticker} ${fmtPct(p.changePct)} ($${fmt(p.price)}) → ${sign(impact)}$${fmt(Math.abs(impact))}\n`
    }
  }

  // ── Top losers ──
  if (losers.length > 0) {
    msg += `\n📉 Bajaron:\n`
    for (const p of losers.slice(0, 3)) {
      const impact = p.change * (p.price > 0 ? p.value / p.price : 0)
      msg += `${p.ticker} ${fmtPct(p.changePct)} ($${fmt(p.price)}) → ${sign(impact)}$${fmt(Math.abs(impact))}\n`
    }
  }

  // ── Observaciones automáticas ──
  const obs: string[] = []

  // Posición con mayor P&L total
  const bestTotal = [...priceData].sort((a, b) => b.pnlPct - a.pnlPct)[0]
  if (bestTotal && bestTotal.pnlPct > 20)
    obs.push(`${bestTotal.ticker} sigue siendo la estrella de la cartera con ${fmtPct(bestTotal.pnlPct)} de ganancia total.`)

  // Posición en rojo total
  const worstTotal = [...priceData].sort((a, b) => a.pnlPct - b.pnlPct)[0]
  if (worstTotal && worstTotal.pnlPct < -10)
    obs.push(`${worstTotal.ticker} sigue bajo agua (${fmtPct(worstTotal.pnlPct)} total). Punto para monitorear.`)

  // Alta volatilidad del día
  const volatile = priceData.filter(p => Math.abs(p.changePct) > 3)
  if (volatile.length > 1)
    obs.push(`Día volátil: ${volatile.map(p => p.ticker).join(', ')} con movimientos de más de 3%.`)

  // YTD strong
  if (ytdPct > 10)
    obs.push(`YTD muy sólido: ${fmtPct(ytdPct)} en lo que va del año.`)

  if (obs.length > 0) {
    msg += `\n💡 ${obs[0]}\n`
  }

  // ── Noticias en español + link ──
  if (news.length > 0) {
    msg += `\n📰 Noticias:\n`
    for (const n of news.slice(0, 4)) {
      const title = n.titleEs || n.title
      msg += `[${n.ticker}] ${title}\n`
      if (n.link) msg += `${n.link}\n`
    }
  }

  msg += `\n— Portfolio App`
  return msg
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const KAPSO_KEY   = process.env.KAPSO_API_KEY ?? ''
  const PHONE_ID    = process.env.KAPSO_PHONE_NUMBER_ID ?? ''
  const CRON_SECRET = process.env.CRON_SECRET ?? ''

  const body = await req.json().catch(() => ({})) as { secret?: string; recipients?: string[] }
  if (!CRON_SECRET || body.secret !== CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!KAPSO_KEY || !PHONE_ID) return NextResponse.json({ error: 'Kapso not configured' }, { status: 500 })

  const recipients = (
    Array.isArray(body.recipients) && body.recipients.length > 0
      ? body.recipients
      : (process.env.KAPSO_RECIPIENT_PHONES ?? '').split(',').filter(Boolean)
  ).map((r: string) => r.replace(/\D/g, ''))

  if (recipients.length === 0) return NextResponse.json({ error: 'No recipients' }, { status: 400 })

  const { priceData, news } = await fetchMarketData()
  const summary = generateSummary(priceData, news)

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

  return NextResponse.json({ ok: true, sent, failed, preview: summary.slice(0, 300) })
}
