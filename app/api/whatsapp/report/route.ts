import { NextRequest, NextResponse } from 'next/server'
import YahooFinance from 'yahoo-finance2'
import { DEFAULT_POSITIONS as _DP } from '@/lib/whatsapp-positions'

type WaPosition = { ticker: string; tickerYF: string; name: string; quantity: number; ppc: number; account: string }
const DEFAULT_POSITIONS = _DP as unknown as WaPosition[]
import { HISTORICAL_DATA, FIXED_INCOME, CASH_POSITIONS } from '@/lib/portfolio-data'

const yf = new YahooFinance({ suppressNotices: ['yahooSurvey'] })

const KAPSO_API_KEY    = process.env.KAPSO_API_KEY ?? ''
const PHONE_NUMBER_ID  = process.env.KAPSO_PHONE_NUMBER_ID ?? ''
const CRON_SECRET      = process.env.CRON_SECRET ?? ''
const DEFAULT_RECIPIENTS = (process.env.KAPSO_RECIPIENT_PHONES ?? '').split(',').map(s => s.trim()).filter(Boolean)

// ── Price fetching ──────────────────────────────────────────────────────────

interface PriceInfo {
  ticker: string
  name: string
  price: number
  change: number
  changePct: number
  value: number
}

async function fetchPrices(): Promise<PriceInfo[]> {
  // Deduplicate tickers
  const unique = new Map<string, typeof DEFAULT_POSITIONS[0]>()
  for (const p of DEFAULT_POSITIONS) {
    if (!unique.has(p.tickerYF)) unique.set(p.tickerYF, p)
  }

  const results: PriceInfo[] = []

  await Promise.allSettled(
    Array.from(unique.values()).map(async (pos) => {
      try {
        const q = await yf.quote(pos.tickerYF)
        const price  = q.regularMarketPrice ?? 0
        const change = q.regularMarketChange ?? 0
        const changePct = q.regularMarketChangePercent ?? 0

        // Sum quantity across all accounts for this ticker
        const totalQty = DEFAULT_POSITIONS
          .filter(p => p.tickerYF === pos.tickerYF)
          .reduce((s, p) => s + p.quantity, 0)

        results.push({
          ticker: pos.ticker,
          name: pos.name,
          price,
          change,
          changePct,
          value: totalQty * price,
        })
      } catch {
        // skip failed
      }
    })
  )

  return results
}

// ── News fetching ────────────────────────────────────────────────────────────

async function fetchNews(tickers: string[]): Promise<string[]> {
  const headlines: string[] = []
  // Sample a few key tickers to avoid rate limits
  const sample = tickers.slice(0, 5)
  for (const t of sample) {
    try {
      const res = await yf.search(t, { newsCount: 2, quotesCount: 0 })
      for (const n of (res.news ?? []).slice(0, 1)) {
        if (n.title) headlines.push(`• ${n.title}`)
      }
    } catch {
      // skip
    }
  }
  return headlines.slice(0, 5)
}

// ── Message formatter ────────────────────────────────────────────────────────

function formatReport(prices: PriceInfo[]): string {
  const total = prices.reduce((s, p) => s + p.value, 0)

  // Cash USD
  const cashUSD = CASH_POSITIONS.filter(c => c.currency === 'USD').reduce((s, c) => s + c.amount, 0)

  // ONs at nominal (server can't read localStorage prices, use nominal as floor)
  const onValue = FIXED_INCOME.reduce((s, fi) => s + fi.nominal, 0)

  const totalComplete = total + cashUSD + onValue

  // YTD: last Dec 31 of previous year
  const now = new Date()
  const ytdBase = HISTORICAL_DATA
    .filter(d => d.date <= `${now.getFullYear() - 1}-12-31`)
    .at(-1)

  const ytdPct = ytdBase ? ((totalComplete - ytdBase.quotaPart) / ytdBase.quotaPart) * 100 : 0
  const ytdAbs = ytdBase ? totalComplete - ytdBase.quotaPart : 0

  // vs last snapshot (prev week)
  const prevSnapshot = HISTORICAL_DATA.at(-1)
  const prevPct = prevSnapshot ? ((totalComplete - prevSnapshot.quotaPart) / prevSnapshot.quotaPart) * 100 : 0
  const prevAbs = prevSnapshot ? totalComplete - prevSnapshot.quotaPart : 0

  // Sort by daily change
  const sorted = [...prices].sort((a, b) => b.changePct - a.changePct)
  const top3up   = sorted.filter(p => p.changePct > 0).slice(0, 3)
  const top3down = sorted.filter(p => p.changePct < 0).slice(-3).reverse()

  const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
  const fmtPct = (n: number) => (n >= 0 ? '+' : '') + n.toFixed(2) + '%'
  const fmtSign = (n: number) => (n >= 0 ? '+$' : '-$') + fmt(Math.abs(n))

  const dateStr = now.toLocaleDateString('es-AR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Argentina/Buenos_Aires'
  })

  let msg = `📊 *Reporte de Cartera*\n`
  msg += `📅 ${dateStr.charAt(0).toUpperCase() + dateStr.slice(1)}\n\n`

  msg += `💼 *Valor Total: $${fmt(totalComplete)}*\n`
  msg += `  ├ CEDEARs:  $${fmt(total)}\n`
  msg += `  ├ Cash USD:  $${fmt(cashUSD)}\n`
  msg += `  └ ONs (VN):  $${fmt(onValue)}\n\n`

  if (prevSnapshot) {
    msg += `📈 *vs último snapshot* (${prevSnapshot.date})\n`
    msg += `  ${prevAbs >= 0 ? '🟢' : '🔴'} ${fmtSign(prevAbs)} (${fmtPct(prevPct)})\n\n`
  }

  msg += `📆 *YTD ${now.getFullYear()}*: ${fmtSign(ytdAbs)} (${fmtPct(ytdPct)})\n\n`

  if (top3up.length) {
    msg += `🚀 *Mejores hoy*\n`
    for (const p of top3up) msg += `  🟢 ${p.ticker} ${fmtPct(p.changePct)}\n`
    msg += '\n'
  }

  if (top3down.length) {
    msg += `📉 *Peores hoy*\n`
    for (const p of top3down) msg += `  🔴 ${p.ticker} ${fmtPct(p.changePct)}\n`
    msg += '\n'
  }

  msg += `_Enviado automáticamente · Portfolio App_`
  return msg
}

// ── Send WhatsApp message ────────────────────────────────────────────────────

async function sendWhatsApp(to: string, text: string): Promise<boolean> {
  const res = await fetch(
    `https://api.kapso.ai/meta/whatsapp/v24.0/${PHONE_NUMBER_ID}/messages`,
    {
      method: 'POST',
      headers: {
        'X-API-Key': KAPSO_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'text',
        text: { preview_url: false, body: text },
      }),
    }
  )
  const body = await res.text()
  console.log(`[whatsapp] to=${to} status=${res.status} body=${body.slice(0, 300)}`)
  return res.ok
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // Auth: cron uses ?secret=..., manual calls pass it in body
  const { secret, recipients: bodyRecipients } = await req.json().catch(() => ({} as Record<string, unknown>))

  if (!CRON_SECRET || secret !== CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!KAPSO_API_KEY || !PHONE_NUMBER_ID) {
    return NextResponse.json({ error: 'Kapso not configured' }, { status: 500 })
  }

  // Determine recipients
  const recipients: string[] = (
    Array.isArray(bodyRecipients) && bodyRecipients.length > 0
      ? bodyRecipients
      : DEFAULT_RECIPIENTS
  ).map((r: string) => r.replace(/\D/g, '')) // strip non-digits

  if (recipients.length === 0) {
    return NextResponse.json({ error: 'No recipients configured' }, { status: 400 })
  }

  // Generate report
  const prices = await fetchPrices()
  const news   = await fetchNews(prices.map(p => p.ticker))

  let message = formatReport(prices)
  if (news.length > 0) {
    message += `\n\n📰 *Noticias*\n${news.join('\n')}`
  }

  // Send to all recipients
  const results = await Promise.allSettled(
    recipients.map(phone => sendWhatsApp(phone, message))
  )

  const sent     = results.filter(r => r.status === 'fulfilled' && r.value).length
  const failed   = results.length - sent

  return NextResponse.json({
    ok: true,
    sent,
    failed,
    recipients: recipients.length,
    preview: message.slice(0, 300) + '...',
  })
}

// GET: cron-job.org sends GET requests — support both
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret')
  if (!CRON_SECRET || secret !== CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!KAPSO_API_KEY || !PHONE_NUMBER_ID) {
    return NextResponse.json({ error: 'Kapso not configured' }, { status: 500 })
  }

  const recipients = DEFAULT_RECIPIENTS.map(r => r.replace(/\D/g, '')).filter(Boolean)
  if (recipients.length === 0) {
    return NextResponse.json({ error: 'No recipients configured. Set KAPSO_RECIPIENT_PHONES env var.' }, { status: 400 })
  }

  const prices = await fetchPrices()
  const news   = await fetchNews(prices.map(p => p.ticker))

  let message = formatReport(prices)
  if (news.length > 0) {
    message += `\n\n📰 *Noticias*\n${news.join('\n')}`
  }

  const results = await Promise.allSettled(
    recipients.map(phone => sendWhatsApp(phone, message))
  )

  const sent  = results.filter(r => r.status === 'fulfilled' && r.value).length
  const failed = results.length - sent

  return NextResponse.json({ ok: true, sent, failed })
}
