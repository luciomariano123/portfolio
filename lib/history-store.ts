'use client'

// Daily portfolio snapshots stored in localStorage
// Seed data comes from HISTORICAL_DATA (real Excel snapshots)
// Going forward, portfolio/page.tsx auto-saves each day when prices load

import { HISTORICAL_DATA, FIXED_INCOME, CASH_POSITIONS } from '@/lib/portfolio-data'

export interface PortfolioSnapshot {
  date: string    // YYYY-MM-DD
  value: number   // Total portfolio USD (CEDEARs + cash USD + ONs at market)
}

const HISTORY_KEY = 'portfolio_history_v1'

// Default ON prices (kept in sync with renta-fija page)
const DEFAULT_ON_PRICES: Record<string, number> = {
  'TTC9D.BA':  1.0595,
  'IRCOD.BA':  1.056,
  'PN36OD.BA': 1.09,
  'TLCOOD.BA': 1.0,
}

export function loadHistory(): PortfolioSnapshot[] {
  // Seed from HISTORICAL_DATA
  const seed = HISTORICAL_DATA.map(d => ({ date: d.date, value: d.quotaPart }))

  if (typeof window === 'undefined') return seed

  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    const local: PortfolioSnapshot[] = raw ? JSON.parse(raw) : []

    // Merge: seed first, then local (local overrides seed for same date)
    const map = new Map<string, number>()
    for (const s of seed)  map.set(s.date, s.value)
    for (const s of local) map.set(s.date, s.value)

    return [...map.entries()]
      .map(([date, value]) => ({ date, value }))
      .sort((a, b) => a.date.localeCompare(b.date))
  } catch {
    return seed
  }
}

/** Compute total portfolio value (CEDEARs + cash USD + ONs at market) */
export function computeTotalPortfolioValue(cedearValue: number): number {
  // Cash USD (fixed until user updates positions)
  const cashUSD = CASH_POSITIONS
    .filter(c => c.currency === 'USD')
    .reduce((s, c) => s + c.amount, 0)

  // ONs market value (reads saved prices from localStorage)
  let onPrices = DEFAULT_ON_PRICES
  try {
    const raw = localStorage.getItem('on_prices_v1')
    if (raw) onPrices = { ...DEFAULT_ON_PRICES, ...JSON.parse(raw) }
  } catch {}

  const onMktValue = FIXED_INCOME.reduce(
    (s, fi) => s + fi.nominal * (onPrices[fi.onTicker] ?? 1),
    0
  )

  return cedearValue + cashUSD + onMktValue
}

/** Save today's snapshot. Overwrites if already saved today (updates with latest prices). */
export function saveTodaySnapshot(totalValue: number): void {
  if (typeof window === 'undefined' || totalValue <= 0) return

  const today = new Date().toISOString().slice(0, 10)

  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    const local: PortfolioSnapshot[] = raw ? JSON.parse(raw) : []
    const filtered = local.filter(s => s.date !== today)
    filtered.push({ date: today, value: Math.round(totalValue * 100) / 100 })
    localStorage.setItem(HISTORY_KEY, JSON.stringify(filtered))
  } catch {}
}
