// Portfolio data extracted from Portfolio Vicky.xlsx
// Balanz Lucio + Balanz Agropecuaria (consolidated)

export interface Position {
  ticker: string
  tickerYF: string // Yahoo Finance ticker
  name: string
  sector: string
  // Balanz Lucio
  quantityLucio: number
  ppcLucio: number // PPC en USD
  // Balanz Agro
  quantityAgro: number
  ppcAgro: number // PPC en USD
  // CEDEAR ratio
  ratio: number
}

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

// CEDEAR Positions — Balanz Lucio
export const BALANZ_LUCIO: Omit<Position, 'quantityAgro' | 'ppcAgro'>[] = [
  { ticker: 'YPF', tickerYF: 'YPF', name: 'YPF S.A.', sector: 'Energía', quantityLucio: 1264, ppcLucio: 18.5, ratio: 1 },
  { ticker: 'PAMP', tickerYF: 'PAM', name: 'Pampa Energía', sector: 'Energía', quantityLucio: 5888, ppcLucio: 24.5, ratio: 25 },
  { ticker: 'MSFT', tickerYF: 'MSFT', name: 'Microsoft', sector: 'Tecnología', quantityLucio: 760, ppcLucio: 370.0, ratio: 1 },
  { ticker: 'MELI', tickerYF: 'MELI', name: 'MercadoLibre', sector: 'Tecnología', quantityLucio: 553, ppcLucio: 1680.0, ratio: 20 },
  { ticker: 'META', tickerYF: 'META', name: 'Meta Platforms', sector: 'Tecnología', quantityLucio: 311, ppcLucio: 480.0, ratio: 1 },
  { ticker: 'SPY', tickerYF: 'SPY', name: 'S&P 500 ETF', sector: 'ETF', quantityLucio: 96, ppcLucio: 490.0, ratio: 1 },
  { ticker: 'NVDA', tickerYF: 'NVDA', name: 'NVIDIA', sector: 'Tecnología', quantityLucio: 120, ppcLucio: 120.0, ratio: 1 },
  { ticker: 'GGAL', tickerYF: 'GGAL', name: 'Grupo Galicia', sector: 'Financiero', quantityLucio: 200, ppcLucio: 35.0, ratio: 10 },
  { ticker: 'BABA', tickerYF: 'BABA', name: 'Alibaba', sector: 'Tecnología', quantityLucio: 150, ppcLucio: 85.0, ratio: 10 },
]

// CEDEAR Positions — Balanz Agropecuaria
export const BALANZ_AGRO: Omit<Position, 'quantityLucio' | 'ppcLucio'>[] = [
  { ticker: 'PAMP', tickerYF: 'PAM', name: 'Pampa Energía', sector: 'Energía', quantityAgro: 2719, ppcAgro: 22.0, ratio: 25 },
  { ticker: 'YPF', tickerYF: 'YPF', name: 'YPF S.A.', sector: 'Energía', quantityAgro: 236, ppcAgro: 16.0, ratio: 1 },
  { ticker: 'MSFT', tickerYF: 'MSFT', name: 'Microsoft', sector: 'Tecnología', quantityAgro: 120, ppcAgro: 380.0, ratio: 1 },
  { ticker: 'PLTR', tickerYF: 'PLTR', name: 'Palantir', sector: 'Tecnología', quantityAgro: 250, ppcAgro: 22.0, ratio: 1 },
  { ticker: 'MCD', tickerYF: 'MCD', name: "McDonald's", sector: 'Consumo', quantityAgro: 80, ppcAgro: 280.0, ratio: 1 },
  { ticker: 'KO', tickerYF: 'KO', name: 'Coca-Cola', sector: 'Consumo', quantityAgro: 300, ppcAgro: 60.0, ratio: 1 },
  { ticker: 'PEP', tickerYF: 'PEP', name: 'PepsiCo', sector: 'Consumo', quantityAgro: 120, ppcAgro: 165.0, ratio: 1 },
]

// Consolidated positions (merge Lucio + Agro)
export function getConsolidatedPositions(): Position[] {
  const allTickers = new Set([
    ...BALANZ_LUCIO.map(p => p.ticker),
    ...BALANZ_AGRO.map(p => p.ticker),
  ])

  const result: Position[] = []
  for (const ticker of allTickers) {
    const lucio = BALANZ_LUCIO.find(p => p.ticker === ticker)
    const agro = BALANZ_AGRO.find(p => p.ticker === ticker)
    const base = lucio || agro!

    result.push({
      ticker: base.ticker,
      tickerYF: base.tickerYF,
      name: base.name,
      sector: base.sector,
      ratio: base.ratio,
      quantityLucio: lucio?.quantityLucio ?? 0,
      ppcLucio: lucio?.ppcLucio ?? 0,
      quantityAgro: agro?.quantityAgro ?? 0,
      ppcAgro: agro?.ppcAgro ?? 0,
    })
  }
  return result
}

// Cash positions (actualizado 31-mar-2026)
export const CASH_POSITIONS: CashPosition[] = [
  { currency: 'USD', amount: 71414, account: 'Lucio' },
  { currency: 'USD', amount: 6638,  account: 'Agro'  },
]

// Fixed Income — Obligaciones Negociables
// nominal = face value in USD; coupon = nominal × rate/2 per semi-annual payment
// onTicker = BYMA USD ticker (D-class, e.g. TTC9D.BA) for live price fetching
export const FIXED_INCOME: FixedIncomePosition[] = [
  { name: 'ON TEC C9',   onTicker: 'TTC9D.BA', nominal: 7100,  rate: 6.80, account: 'Agro',  maturity: '2029-10-24' },
  { name: 'ON PAE C36',  onTicker: 'PN36D.BA',  nominal: 30000, rate: 6.80, account: 'Agro',  maturity: '2026-11-13' },
  { name: 'ON IRSA C23', onTicker: 'IRCOD.BA',  nominal: 29565, rate: 7.25, account: 'Agro',  maturity: '2029-10-23' },
]

// Coupon payment schedule (2026–2027)
// TEC C9:  $7,100  × 6.80% / 2 = $241.40  — Jan + Jul
// PAE C36: $30,000 × 6.80% / 2 = $1,020   — Apr + Oct
// IRSA:    $29,565 × 7.25% / 2 = $1,071.73 ≈ $1,071.50 — May + Nov
export const COUPON_SCHEDULE: CouponPayment[] = [
  { date: '2026-01-15', amount: 241.46,  onName: 'ON TEC C9',   onTicker: 'TTC9D.BA', paid: true  },
  { date: '2026-04-15', amount: 1020.00, onName: 'ON PAE C36',  onTicker: 'PN36D.BA',  paid: false },
  { date: '2026-05-15', amount: 1071.50, onName: 'ON IRSA C23', onTicker: 'IRCOD.BA',  paid: false },
  { date: '2026-07-15', amount: 241.46,  onName: 'ON TEC C9',   onTicker: 'TTC9D.BA', paid: false },
  { date: '2026-10-15', amount: 1020.00, onName: 'ON PAE C36',  onTicker: 'PN36D.BA',  paid: false },
  { date: '2026-11-15', amount: 1071.50, onName: 'ON IRSA C23', onTicker: 'IRCOD.BA',  paid: false },
  { date: '2027-01-15', amount: 241.46,  onName: 'ON TEC C9',   onTicker: 'TTC9D.BA', paid: false },
  { date: '2027-04-15', amount: 1020.00, onName: 'ON PAE C36',  onTicker: 'PN36D.BA',  paid: false },
  { date: '2027-05-15', amount: 1071.50, onName: 'ON IRSA C23', onTicker: 'IRCOD.BA',  paid: false },
  { date: '2027-07-15', amount: 241.46,  onName: 'ON TEC C9',   onTicker: 'TTC9D.BA', paid: false },
  { date: '2027-10-15', amount: 1020.00, onName: 'ON PAE C36',  onTicker: 'PN36D.BA',  paid: false },
  { date: '2027-11-15', amount: 1071.50, onName: 'ON IRSA C23', onTicker: 'IRCOD.BA',  paid: false },
]

// Capital inicial de la cartera (Oct 2024)
export const INITIAL_CAPITAL = 200000

// Historical evolution data from "Evolucion TOTAL" sheet (real weekly snapshots)
// Values = total portfolio in USD (CEDEARs + cash + ONs at market)
// Start: Oct 1, 2024 — End: Mar 21, 2026
export const HISTORICAL_DATA: HistoricalPoint[] = [
  { date: '2024-10-01', quotaPart: 200500.00 },
  { date: '2024-10-16', quotaPart: 202958.10 },
  { date: '2024-10-21', quotaPart: 202148.10 },
  { date: '2024-10-27', quotaPart: 203267.10 },
  { date: '2024-11-01', quotaPart: 202454.20 },
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
  { date: '2026-03-31', quotaPart: 250321.00 },
]

// CEDEAR ratios — láminas per 1 ADR
// Back-calculated from real ppc data and historical purchase prices
export const CEDEAR_RATIOS: Record<string, number> = {
  AMZN:  90,
  BABA:  10,
  BBAR:  3,
  BMA:   10,
  CEPU:  10,
  EWZ:   2,
  GGAL:  10,
  KO:    4,
  MCD:   20,
  MELI:  100,
  META:  20,
  MSFT:  30,
  NVDA:  1,
  PAMP:  25,
  PEP:   20,
  PLTR:  1,
  SPY:   15,
  TGSU2: 10,
  TSLA:  10,
  VIST:  1,
  YPF:   1,
}

export const SECTOR_COLORS: Record<string, string> = {
  'Tecnología': '#6366f1',
  'Energía': '#f59e0b',
  'Financiero': '#10b981',
  'Consumo': '#ec4899',
  'ETF': '#8b5cf6',
  'Renta Fija': '#06b6d4',
  'Efectivo': '#64748b',
}
