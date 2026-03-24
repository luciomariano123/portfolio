import { NextResponse } from 'next/server'
import YahooFinance from 'yahoo-finance2'

const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] })

let cache: { data: { date: string; spy: number }[]; ts: number } | null = null
const TTL = 6 * 60 * 60 * 1000  // 6h

export async function GET() {
  if (cache && Date.now() - cache.ts < TTL) {
    return NextResponse.json(cache.data)
  }
  try {
    const history = await yahooFinance.historical('SPY', {
      period1: '2024-11-01',
      period2: new Date().toISOString().slice(0, 10),
      interval: '1wk',
    })
    if (!history.length) return NextResponse.json([])

    const base = history[0].close
    const data = history.map(h => ({
      date: h.date.toISOString().slice(0, 10),
      spy: Math.round((h.close / base) * 10000) / 100,
    }))
    cache = { data, ts: Date.now() }
    return NextResponse.json(data, { headers: { 'Cache-Control': 'public, s-maxage=21600' } })
  } catch (e) {
    console.error('[benchmark]', e)
    return NextResponse.json([])
  }
}
