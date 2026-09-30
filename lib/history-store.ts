'use client'

// Daily portfolio snapshots stored in localStorage
// Seed data comes from HISTORICAL_DATA (real Excel snapshots)
// Going forward, portfolio/page.tsx auto-saves each day when prices load

import { HISTORICAL_DATA, totalPortfolioValue } from '@/lib/portfolio-data'
import { loadOnPrices } from '@/lib/on-prices'
import { todayISO } from '@/lib/utils'

export interface PortfolioSnapshot {
  date: string    // YYYY-MM-DD
  value: number   // Total portfolio USD (CEDEARs + cash USD + ONs at market)
}

// v2: v1 snapshots were saved with stale cash (USD 56k instead of 106k) and undervalue the portfolio
const HISTORY_KEY = 'portfolio_history_v2'

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

/** Compute total portfolio value (CEDEARs + cash USD + ONs at the user's saved market prices) */
export function computeTotalPortfolioValue(cedearValue: number): number {
  return totalPortfolioValue(cedearValue, loadOnPrices())
}

/** Save today's snapshot. Overwrites if already saved today (updates with latest prices). */
export function saveTodaySnapshot(totalValue: number): void {
  if (typeof window === 'undefined' || totalValue <= 0) return

  const today = todayISO()

  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    const local: PortfolioSnapshot[] = raw ? JSON.parse(raw) : []
    const filtered = local.filter(s => s.date !== today)
    filtered.push({ date: today, value: Math.round(totalValue * 100) / 100 })
    localStorage.setItem(HISTORY_KEY, JSON.stringify(filtered))
  } catch {}
}
