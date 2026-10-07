// Portfolio data extracted from Portfolio Vicky.xlsx
// Balanz Lucio + Balanz Agropecuaria (consolidated)
// Single source of truth for positions, cash, ONs and history — shared by the
// client pages (via lib/positions-store.ts) and the WhatsApp API routes.
// Only nominals / PPC / cash / history come from the Excel; market prices are live.

import { DEFAULT_ON_PRICES } from '@/lib/on-prices'

export interface EditablePosition {
  ticker: string       // CEDEAR ticker (e.g. "PAMP")
  tickerYF: string     // Yahoo Finance ticker — BYMA USD market (e.g. "PAMPD.BA")
  name: string
  sector: string
  ratio: number        // kept=1 for all; BYMA D-class tickers are already USD per lámina
  quantity: number     // Total CEDEAR láminas held
  ppc: number          // Purchase price in USD per CEDEAR lámina
  account: 'Lucio' | 'Agro' | 'Consolidado'
  targetPct?: number   // Target allocation % for rebalancing
}

// Real positions — Balanz Lucio + Balanz Agropecuaria (Excel CONSOLIDADO, 07/10/2026)
// tickerYF uses BYMA USD D-class tickers (e.g. PAMPD.BA) — price returned IS USD per lámina
// ratio=1 for all: currentValue = quantity × priceBYMA_USD
export const DEFAULT_POSITIONS: EditablePosition[] = [
  // ── Balanz Lucio ──────────────────────────────────────────────────────────
  { ticker: 'SPY',   tickerYF: 'SPYD.BA',   name: 'S&P 500 ETF',     sector: 'ETF',        ratio: 1, quantity: 2019, ppc: 11.31,  account: 'Lucio' },
  { ticker: 'MELI',  tickerYF: 'MELID.BA',  name: 'MercadoLibre',    sector: 'Tecnología', ratio: 1, quantity: 553,  ppc: 17.70,  account: 'Lucio' },
  { ticker: 'NU',    tickerYF: 'NUD.BA',    name: 'Nu Holdings',     sector: 'Financiero', ratio: 1, quantity: 705,  ppc: 7.43,   account: 'Lucio' },
  // ── Balanz Agropecuaria ───────────────────────────────────────────────────
  { ticker: 'BRKB',  tickerYF: 'BRKBD.BA',  name: 'Berkshire Hathaway', sector: 'Financiero', ratio: 1, quantity: 849, ppc: 24.37, account: 'Agro' },
  { ticker: 'GOGL',  tickerYF: 'GOGLD.BA',  name: 'Google',          sector: 'Tecnología', ratio: 1, quantity: 486,  ppc: 4.98,   account: 'Agro' },
  { ticker: 'KO',    tickerYF: 'KOD.BA',    name: 'Coca-Cola',       sector: 'Consumo',    ratio: 1, quantity: 316,  ppc: 15.00,  account: 'Agro' },
  { ticker: 'MCD',   tickerYF: 'MCDD.BA',   name: "McDonald's",      sector: 'Consumo',    ratio: 1, quantity: 549,  ppc: 11.61,  account: 'Agro' },
  { ticker: 'MSFT',  tickerYF: 'MSFTD.BA',  name: 'Microsoft',       sector: 'Tecnología', ratio: 1, quantity: 183,  ppc: 14.68,  account: 'Agro' },
  { ticker: 'NU',    tickerYF: 'NUD.BA',    name: 'Nu Holdings',     sector: 'Financiero', ratio: 1, quantity: 689,  ppc: 7.17,   account: 'Agro' },
  { ticker: 'NVDA',  tickerYF: 'NVDAD.BA',  name: 'NVIDIA',          sector: 'Tecnología', ratio: 1, quantity: 344,  ppc: 7.31,   account: 'Agro' },
  { ticker: 'PEP',   tickerYF: 'PEPD.BA',   name: 'PepsiCo',         sector: 'Consumo',    ratio: 1, quantity: 1245, ppc: 7.99,   account: 'Agro' },
]

export interface CashPosition {
  currency: 'ARS' | 'USD'
  amount: number
  account: 'Lucio' | 'Agro'
}

export interface FixedIncomePosition {
  name: string
  onTicker: string     // ON identifier in Balanz
  nominal: number      // Face value in USD
  rate: number         // Annual coupon rate (%)
  account: 'Lucio' | 'Agro'
  maturity: string     // YYYY-MM-DD
}

export interface CouponPayment {
  date: string         // YYYY-MM-DD
  amount: number       // USD
  onName: string
  onTicker: string
  paid: boolean        // whether the date has already passed
}

export interface HistoricalPoint {
  date: string
  quotaPart: number
  variacion?: number
}

// Cash positions (Excel CONSOLIDADO "Liquidez", 07/10/2026)
export const CASH_POSITIONS: CashPosition[] = [
  { currency: 'USD', amount: 106871, account: 'Lucio' },
  { currency: 'USD', amount: 7688,  account: 'Agro'  },
]

// Fixed Income — Obligaciones Negociables (todas en Agro)
export const FIXED_INCOME: FixedIncomePosition[] = [
  { name: 'ON IRSA C23', onTicker: 'IRCOD.BA',  nominal: 6661,  rate: 7.25, account: 'Agro', maturity: '2029-10-23' },
  { name: 'ON TEC 9',    onTicker: 'TTC9D.BA',  nominal: 30000, rate: 6.80, account: 'Agro', maturity: '2029-10-24' },
  { name: 'ON PAE 36',   onTicker: 'PN36OD.BA', nominal: 20000, rate: 7.25, account: 'Agro', maturity: '2031-11-13' },
  { name: 'ON TECO 23',  onTicker: 'TLCOOD.BA', nominal: 9900,  rate: 7.00, account: 'Agro', maturity: '2028-11-28' },
]

// Coupon payment schedule
// IRSA C23:  $6,661  × 7.25% / 2 = $241.46  — Jan 23 + Jul 23
// TEC 9:     $30,000 × 6.80% / 2 = $1,020   — Apr 24 + Oct 24
// PAE 36:    $20,000 × 7.25% / 2 = $725     — May 13 + Nov 13
// TECO 23:   $9,900  × 7.00% / 2 = $346.50  — May 28 + Nov 28
export const COUPON_SCHEDULE: CouponPayment[] = [
  // ── ON IRSA C23 ────────────────────────────────────────────────────────────
  { date: '2026-07-23', amount: 241.46,  onName: 'ON IRSA C23', onTicker: 'IRCOD.BA',  paid: false },
  { date: '2027-01-23', amount: 241.46,  onName: 'ON IRSA C23', onTicker: 'IRCOD.BA',  paid: false },
  { date: '2027-07-23', amount: 241.46,  onName: 'ON IRSA C23', onTicker: 'IRCOD.BA',  paid: false },
  { date: '2028-01-23', amount: 241.46,  onName: 'ON IRSA C23', onTicker: 'IRCOD.BA',  paid: false },
  { date: '2028-07-23', amount: 241.46,  onName: 'ON IRSA C23', onTicker: 'IRCOD.BA',  paid: false },
  { date: '2029-01-23', amount: 241.46,  onName: 'ON IRSA C23', onTicker: 'IRCOD.BA',  paid: false },
  { date: '2029-07-23', amount: 241.46,  onName: 'ON IRSA C23', onTicker: 'IRCOD.BA',  paid: false },
  // ── ON TEC 9 ───────────────────────────────────────────────────────────────
  { date: '2026-04-24', amount: 1020.00, onName: 'ON TEC 9',    onTicker: 'TTC9D.BA',  paid: false },
  { date: '2026-10-24', amount: 1020.00, onName: 'ON TEC 9',    onTicker: 'TTC9D.BA',  paid: false },
  { date: '2027-04-24', amount: 1020.00, onName: 'ON TEC 9',    onTicker: 'TTC9D.BA',  paid: false },
  { date: '2027-10-24', amount: 1020.00, onName: 'ON TEC 9',    onTicker: 'TTC9D.BA',  paid: false },
  { date: '2028-04-24', amount: 1020.00, onName: 'ON TEC 9',    onTicker: 'TTC9D.BA',  paid: false },
  { date: '2028-10-24', amount: 1020.00, onName: 'ON TEC 9',    onTicker: 'TTC9D.BA',  paid: false },
  { date: '2029-04-24', amount: 1020.00, onName: 'ON TEC 9',    onTicker: 'TTC9D.BA',  paid: false },
  // ── ON PAE 36 ──────────────────────────────────────────────────────────────
  { date: '2026-05-13', amount: 725.00,  onName: 'ON PAE 36',   onTicker: 'PN36OD.BA', paid: false },
  { date: '2026-11-13', amount: 725.00,  onName: 'ON PAE 36',   onTicker: 'PN36OD.BA', paid: false },
  { date: '2027-05-13', amount: 725.00,  onName: 'ON PAE 36',   onTicker: 'PN36OD.BA', paid: false },
  { date: '2027-11-13', amount: 725.00,  onName: 'ON PAE 36',   onTicker: 'PN36OD.BA', paid: false },
  { date: '2028-05-13', amount: 725.00,  onName: 'ON PAE 36',   onTicker: 'PN36OD.BA', paid: false },
  { date: '2028-11-13', amount: 725.00,  onName: 'ON PAE 36',   onTicker: 'PN36OD.BA', paid: false },
  { date: '2029-05-13', amount: 725.00,  onName: 'ON PAE 36',   onTicker: 'PN36OD.BA', paid: false },
  { date: '2029-11-13', amount: 725.00,  onName: 'ON PAE 36',   onTicker: 'PN36OD.BA', paid: false },
  { date: '2030-05-13', amount: 725.00,  onName: 'ON PAE 36',   onTicker: 'PN36OD.BA', paid: false },
  { date: '2030-11-13', amount: 725.00,  onName: 'ON PAE 36',   onTicker: 'PN36OD.BA', paid: false },
  { date: '2031-05-13', amount: 725.00,  onName: 'ON PAE 36',   onTicker: 'PN36OD.BA', paid: false },
  // ── ON TECO 23 ─────────────────────────────────────────────────────────────
  { date: '2026-05-28', amount: 346.50,  onName: 'ON TECO 23',  onTicker: 'TLCOOD.BA', paid: false },
  { date: '2026-11-28', amount: 346.50,  onName: 'ON TECO 23',  onTicker: 'TLCOOD.BA', paid: false },
  { date: '2027-05-28', amount: 346.50,  onName: 'ON TECO 23',  onTicker: 'TLCOOD.BA', paid: false },
  { date: '2027-11-28', amount: 346.50,  onName: 'ON TECO 23',  onTicker: 'TLCOOD.BA', paid: false },
  { date: '2028-05-28', amount: 346.50,  onName: 'ON TECO 23',  onTicker: 'TLCOOD.BA', paid: false },
]

// Historical evolution from the "Evolucion GRAFICO" sheet (weekly snapshots)
// Values = total portfolio in USD (CEDEARs + cash USD + ONs)
// Start: Oct 1, 2024 (initial capital 200,500) — End: Sep 18, 2026
export const HISTORICAL_DATA: HistoricalPoint[] = [
  { date: '2024-10-01', quotaPart: 200500.00 },
  { date: '2024-10-13', quotaPart: 201958.13 },
  { date: '2024-10-21', quotaPart: 202148.12 },
  { date: '2024-10-27', quotaPart: 203267.10 },
  { date: '2024-11-01', quotaPart: 202454.18 },
  { date: '2024-11-09', quotaPart: 204161.13 },
  { date: '2024-11-30', quotaPart: 212499.37 },
  { date: '2024-12-07', quotaPart: 212358.84 },
  { date: '2024-12-14', quotaPart: 212827.78 },
  { date: '2024-12-21', quotaPart: 212084.15 },
  { date: '2025-01-18', quotaPart: 215912.79 },
  { date: '2025-01-25', quotaPart: 216426.73 },
  { date: '2025-01-31', quotaPart: 218866.27 },
  { date: '2025-02-08', quotaPart: 214621.68 },
  { date: '2025-02-22', quotaPart: 214853.16 },
  { date: '2025-03-12', quotaPart: 201370.70 },
  { date: '2025-03-14', quotaPart: 208654.12 },
  { date: '2025-03-22', quotaPart: 209189.85 },
  { date: '2025-04-01', quotaPart: 202985.71 },
  { date: '2025-04-13', quotaPart: 191470.75 },
  { date: '2025-04-14', quotaPart: 199994.88 },
  { date: '2025-04-21', quotaPart: 199121.00 },
  { date: '2025-05-04', quotaPart: 197198.60 },
  { date: '2025-05-11', quotaPart: 205542.28 },
  { date: '2025-05-18', quotaPart: 216846.10 },
  { date: '2025-05-24', quotaPart: 217152.68 },
  { date: '2025-05-31', quotaPart: 213433.65 },
  { date: '2025-06-07', quotaPart: 209828.66 },
  { date: '2025-06-14', quotaPart: 212567.15 },
  { date: '2025-06-23', quotaPart: 206596.15 },
  { date: '2025-06-29', quotaPart: 206330.48 },
  { date: '2025-07-12', quotaPart: 201413.25 },
  { date: '2025-07-20', quotaPart: 201878.32 },
  { date: '2025-07-26', quotaPart: 207392.46 },
  { date: '2025-08-02', quotaPart: 206712.66 },
  { date: '2025-08-10', quotaPart: 208721.75 },
  { date: '2025-08-17', quotaPart: 205901.90 },
  { date: '2025-09-03', quotaPart: 194610.99 },
  { date: '2025-09-05', quotaPart: 196995.56 },
  { date: '2025-09-08', quotaPart: 183179.23 },
  { date: '2025-09-20', quotaPart: 178090.56 },
  { date: '2025-10-10', quotaPart: 191483.60 },
  { date: '2025-10-24', quotaPart: 192457.16 },
  { date: '2025-10-27', quotaPart: 220296.61 },
  { date: '2025-11-03', quotaPart: 233363.21 },
  { date: '2025-11-08', quotaPart: 228796.33 },
  { date: '2025-11-15', quotaPart: 234864.79 },
  { date: '2025-11-21', quotaPart: 234453.23 },
  { date: '2025-12-07', quotaPart: 234623.58 },
  { date: '2025-12-25', quotaPart: 233047.31 },
  { date: '2025-12-28', quotaPart: 232276.06 },
  { date: '2025-12-31', quotaPart: 232599.67 },
  { date: '2026-01-24', quotaPart: 236259.21 },
  { date: '2026-01-31', quotaPart: 244509.96 },
  { date: '2026-02-07', quotaPart: 240922.41 },
  { date: '2026-02-17', quotaPart: 237509.06 },
  { date: '2026-02-22', quotaPart: 241184.90 },
  { date: '2026-03-08', quotaPart: 237894.85 },
  { date: '2026-03-21', quotaPart: 242531.17 },
  { date: '2026-03-29', quotaPart: 245216.45 },
  { date: '2026-03-31', quotaPart: 250320.99 },
  { date: '2026-04-09', quotaPart: 259612.90 },
  { date: '2026-04-17', quotaPart: 262501.18 },
  { date: '2026-04-26', quotaPart: 262409.87 },
  { date: '2026-05-04', quotaPart: 263162.86 },
  { date: '2026-05-09', quotaPart: 264983.47 },
  { date: '2026-05-16', quotaPart: 265817.20 },
  { date: '2026-05-22', quotaPart: 271351.38 },
  { date: '2026-06-13', quotaPart: 260389.36 },
  { date: '2026-06-19', quotaPart: 260750.23 },
  { date: '2026-06-27', quotaPart: 252875.31 },
  { date: '2026-07-11', quotaPart: 263632.90 },
  { date: '2026-07-19', quotaPart: 263052.47 },
  { date: '2026-07-25', quotaPart: 258192.47 },
  { date: '2026-07-31', quotaPart: 261693.18 },
  { date: '2026-08-07', quotaPart: 270198.42 },
  { date: '2026-08-14', quotaPart: 271501.16 },
  { date: '2026-08-22', quotaPart: 270522.55 },
  { date: '2026-08-29', quotaPart: 272464.41 },
  { date: '2026-09-05', quotaPart: 274984.76 },
  { date: '2026-09-12', quotaPart: 275979.96 },
  { date: '2026-09-18', quotaPart: 275369.75 },
]

export const SECTOR_COLORS: Record<string, string> = {
  'Tecnología': '#6366f1',
  'Energía': '#f59e0b',
  'Financiero': '#10b981',
  'Consumo': '#ec4899',
  'ETF': '#8b5cf6',
  'Renta Fija': '#06b6d4',
  'Efectivo': '#64748b',
}

// ── Portfolio-level metrics (shared by dashboard, cartera, análisis, WhatsApp) ──

// Initial capital — "Arranque con" in the Excel. Total P&L is measured against this.
export const PORTFOLIO_START = { date: '2024-10-01', value: 200500 }

// Annual return targets ("Objetivo" in the Excel). Target values compound on the
// previous year's target: 200,500 × 1.025 × 1.15 × 1.15 = 271,790 for 2026.
export const ANNUAL_TARGET_RATES: Record<number, number> = {
  2024: 0.025,
  2025: 0.15,
  2026: 0.15,
}
const DEFAULT_TARGET_RATE = 0.15

type AccountFilter = 'Lucio' | 'Agro' | 'all'

export function cashUSD(account: AccountFilter = 'all'): number {
  return CASH_POSITIONS
    .filter(c => c.currency === 'USD' && (account === 'all' || c.account === account))
    .reduce((s, c) => s + c.amount, 0)
}

/** ONs at market: nominal × price (fraction of face value). Server-side falls back to defaults. */
export function fixedIncomeValue(
  onPrices: Record<string, number> = DEFAULT_ON_PRICES,
  account: AccountFilter = 'all',
): number {
  return FIXED_INCOME
    .filter(fi => account === 'all' || fi.account === account)
    .reduce((s, fi) => s + fi.nominal * (onPrices[fi.onTicker] ?? 1), 0)
}

/** Whole portfolio in USD: CEDEARs at live prices + cash USD + ONs at market. */
export function totalPortfolioValue(cedearValue: number, onPrices?: Record<string, number>): number {
  return cedearValue + cashUSD() + fixedIncomeValue(onPrices)
}

/** Last snapshot on or before Dec 31 of the previous year — the YTD baseline. */
export function yearStartValue(year = new Date().getFullYear()): number | undefined {
  return HISTORICAL_DATA.filter(d => d.date <= `${year - 1}-12-31`).at(-1)?.quotaPart
}

export interface AnnualTarget {
  year: number
  rate: number
  base: number      // value at the start of the year
  target: number    // value the portfolio should reach by Dec 31
  progress: number  // share of the year's target gain achieved (1 = 100%)
}

export function annualTarget(currentValue: number, year = new Date().getFullYear()): AnnualTarget | undefined {
  const base = yearStartValue(year)
  if (base === undefined) return undefined
  const startYear = Number(PORTFOLIO_START.date.slice(0, 4))
  let target = PORTFOLIO_START.value
  for (let y = startYear; y <= year; y++) target *= 1 + (ANNUAL_TARGET_RATES[y] ?? DEFAULT_TARGET_RATE)
  const rate = ANNUAL_TARGET_RATES[year] ?? DEFAULT_TARGET_RATE
  const progress = target > base ? (currentValue - base) / (target - base) : 0
  return { year, rate, base, target, progress }
}
