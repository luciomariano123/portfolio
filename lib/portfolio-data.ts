// Portfolio data extracted from Portfolio Vicky.xlsx
// Balanz Lucio + Balanz Agropecuaria (consolidated)
// NOTE: live CEDEAR positions live in lib/positions-store.ts (client) and
// lib/whatsapp-positions.ts (server). This file holds cash, ONs and history.

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

// Cash positions
export const CASH_POSITIONS: CashPosition[] = [
  { currency: 'USD', amount: 48294, account: 'Lucio' },
  { currency: 'USD', amount: 7888,  account: 'Agro'  },
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

// Historical evolution data from "Evolucion TOTAL" sheet (real weekly snapshots)
// Values = total portfolio in USD (CEDEARs + cash + ONs at market)
// Start: Nov 9, 2024 (first consolidated snapshot) — End: Mar 21, 2026
export const HISTORICAL_DATA: HistoricalPoint[] = [
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
  { date: '2026-05-04', quotaPart: 263162.86 },
  { date: '2026-05-09', quotaPart: 264983.48 },
  { date: '2026-05-16', quotaPart: 265817.20 },
  { date: '2026-05-22', quotaPart: 266546.78 },
  { date: '2026-05-29', quotaPart: 271351.38 },
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
