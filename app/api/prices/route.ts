import { NextResponse } from 'next/server'
import YahooFinance from 'yahoo-finance2'

// Singleton instance — suppress survey notice
const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] })

// Cache prices for 60 seconds
const priceCache = new Map<string, {
  price: number
  change: number
  changePercent: number
  currency: string
  name?: string
  timestamp: number
}>()
const CACHE_TTL = 60 * 1000 // 60 seconds

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const tickers = searchParams.get('tickers')?.split(',').filter(Boolean) ?? []

  if (tickers.length === 0) {
    return NextResponse.json({ error: 'No tickers provided' }, { status: 400 })
  }

  const results: Record<string, {
    price: number
    change: number
    changePercent: number
    currency: string
    name?: string
  }> = {}
  const now = Date.now()

  // Serve from cache where fresh
  const tickersToFetch = tickers.filter(t => {
    const cached = priceCache.get(t)
    if (cached && now - cached.timestamp < CACHE_TTL) {
      const { timestamp: _ts, ...rest } = cached
      results[t] = rest
      return false
    }
    return true
  })

  if (tickersToFetch.length > 0) {
    await Promise.allSettled(
      tickersToFetch.map(async (ticker) => {
        try {
          const quote = await yahooFinance.quote(ticker)

          const price = quote.regularMarketPrice ?? 0
          const change = quote.regularMarketChange ?? 0
          const changePercent = quote.regularMarketChangePercent ?? 0
          const currency = quote.currency ?? 'USD'
          const name = quote.longName ?? quote.shortName ?? undefined

          // Warn if price is not in USD (Argentine BYMA tickers like "PAM.BA" return ARS)
          if (currency !== 'USD') {
            console.warn(`[prices] ${ticker} returned currency=${currency} — expected USD. Use NYSE ticker instead.`)
          }

          const entry = { price, change, changePercent, currency, name, timestamp: now }
          priceCache.set(ticker, entry)
          const { timestamp: _ts, ...rest } = entry
          results[ticker] = rest
        } catch (err) {
          console.error(`[prices] Failed to fetch ${ticker}:`, err)
          // Fall back to stale cache if available
          const cached = priceCache.get(ticker)
          if (cached) {
            const { timestamp: _ts, ...rest } = cached
            results[ticker] = rest
          }
        }
      })
    )
  }

  return NextResponse.json(results, {
    headers: {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30',
    },
  })
}
