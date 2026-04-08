'use client'

// Editable positions stored in localStorage
// ppc = purchase price in USD per CEDEAR lámina
// cost_USD = quantity × ppc
// currentValue_USD = quantity × priceBYMA_USD   (ratio=1 since BYMA D tickers give per-lámina USD directly)
// CCL implícito = arsPrice / priceBYMA_USD

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

export interface ArsPrice {
  ticker: string
  priceARS: number     // Current ARS market price of the CEDEAR (for CCL calc)
  updatedAt: string
}

const POSITIONS_KEY = 'cedear_positions_v4'   // bumped to v4: updated portfolios Apr 2026
const ARS_PRICES_KEY = 'cedear_ars_prices_v2'

// Real positions — Balanz Lucio + Balanz Agropecuaria
// tickerYF uses BYMA USD D-class tickers (e.g. PAMPD.BA) — price returned IS USD per lámina
// ratio=1 for all: currentValue = quantity × priceBYMA_USD
const DEFAULT_POSITIONS: EditablePosition[] = [
  // ── Balanz Lucio ──────────────────────────────────────────────────────────
  { ticker: 'AAPL',  tickerYF: 'AAPLD.BA',  name: 'Apple',           sector: 'Tecnología', ratio: 1, quantity: 766,  ppc: 12.8520496,  account: 'Lucio' },
  { ticker: 'AMZN',  tickerYF: 'AMZND.BA',  name: 'Amazon',          sector: 'Tecnología', ratio: 1, quantity: 3091, ppc: 1.59010029,  account: 'Lucio' },
  { ticker: 'SPY',   tickerYF: 'SPYD.BA',   name: 'S&P 500 ETF',     sector: 'ETF',        ratio: 1, quantity: 673,  ppc: 34.0499406,  account: 'Lucio' },
  { ticker: 'MELI',  tickerYF: 'MELID.BA',  name: 'MercadoLibre',    sector: 'Tecnología', ratio: 1, quantity: 553,  ppc: 17.6998192,  account: 'Lucio' },
  { ticker: 'META',  tickerYF: 'METAD.BA',  name: 'Meta Platforms',  sector: 'Tecnología', ratio: 1, quantity: 510,  ppc: 27.3113529,  account: 'Lucio' },
  { ticker: 'MSFT',  tickerYF: 'MSFTD.BA',  name: 'Microsoft',       sector: 'Tecnología', ratio: 1, quantity: 1144, ppc: 14.4238986,  account: 'Lucio' },
  { ticker: 'NU',    tickerYF: 'NUD.BA',    name: 'Nu Holdings',     sector: 'Financiero', ratio: 1, quantity: 675,  ppc: 7.29820741,  account: 'Lucio' },
  { ticker: 'PAMP',  tickerYF: 'PAMPD.BA',  name: 'Pampa Energía',   sector: 'Energía',    ratio: 1, quantity: 4502, ppc: 3.27319191,  account: 'Lucio' },
  { ticker: 'PLTR',  tickerYF: 'PLTRD.BA',  name: 'Palantir',        sector: 'Tecnología', ratio: 1, quantity: 78,   ppc: 50.9270513,  account: 'Lucio' },
  { ticker: 'TSLA',  tickerYF: 'TSLAD.BA',  name: 'Tesla',           sector: 'Tecnología', ratio: 1, quantity: 760,  ppc: 19.3875526,  account: 'Lucio' },
  // ── Balanz Agropecuaria ───────────────────────────────────────────────────
  { ticker: 'GOGL',  tickerYF: 'GOGLD.BA',  name: 'Google',          sector: 'Tecnología', ratio: 1, quantity: 1386, ppc: 4.98556999,  account: 'Agro' },
  { ticker: 'KO',    tickerYF: 'KOD.BA',    name: 'Coca-Cola',       sector: 'Consumo',    ratio: 1, quantity: 316,  ppc: 15.1329114,  account: 'Agro' },
  { ticker: 'MCD',   tickerYF: 'MCDD.BA',   name: "McDonald's",      sector: 'Consumo',    ratio: 1, quantity: 235,  ppc: 13.4978723,  account: 'Agro' },
  { ticker: 'MSFT',  tickerYF: 'MSFTD.BA',  name: 'Microsoft',       sector: 'Tecnología', ratio: 1, quantity: 633,  ppc: 14.7424961,  account: 'Agro' },
  { ticker: 'NVDA',  tickerYF: 'NVDAD.BA',  name: 'NVIDIA',          sector: 'Tecnología', ratio: 1, quantity: 644,  ppc: 7.3136646,   account: 'Agro' },
  { ticker: 'PAMP',  tickerYF: 'PAMPD.BA',  name: 'Pampa Energía',   sector: 'Energía',    ratio: 1, quantity: 2719, ppc: 3.5310776,   account: 'Agro' },
  { ticker: 'PEP',   tickerYF: 'PEPD.BA',   name: 'PepsiCo',         sector: 'Consumo',    ratio: 1, quantity: 641,  ppc: 8.53198128,  account: 'Agro' },
  { ticker: 'PLTR',  tickerYF: 'PLTRD.BA',  name: 'Palantir',        sector: 'Tecnología', ratio: 1, quantity: 65,   ppc: 51.2923077,  account: 'Agro' },
]

export function loadPositions(): EditablePosition[] {
  if (typeof window === 'undefined') return DEFAULT_POSITIONS
  try {
    const raw = localStorage.getItem(POSITIONS_KEY)
    if (!raw) return DEFAULT_POSITIONS
    const parsed = JSON.parse(raw)
    return parsed.length ? parsed : DEFAULT_POSITIONS
  } catch {
    return DEFAULT_POSITIONS
  }
}

export function savePositions(positions: EditablePosition[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(POSITIONS_KEY, JSON.stringify(positions))
}

export function loadArsPrices(): Record<string, number> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(ARS_PRICES_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

export function saveArsPrices(prices: Record<string, number>): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(ARS_PRICES_KEY, JSON.stringify(prices))
}

// Merge positions with same ticker + account into one row
export function consolidatePositions(positions: EditablePosition[]): EditablePosition[] {
  const map = new Map<string, EditablePosition>()
  for (const p of positions) {
    const key = `${p.ticker}_${p.account}`
    if (map.has(key)) {
      const existing = map.get(key)!
      const totalQty = existing.quantity + p.quantity
      const totalCost = existing.quantity * existing.ppc + p.quantity * p.ppc
      existing.ppc = totalQty > 0 ? totalCost / totalQty : existing.ppc
      existing.quantity = totalQty
    } else {
      map.set(key, { ...p })
    }
  }
  return Array.from(map.values())
}

// Merge Lucio + Agro for same ticker (for Consolidado view)
export function mergeAccounts(positions: EditablePosition[]): EditablePosition[] {
  const map = new Map<string, EditablePosition>()
  for (const p of positions) {
    const key = p.ticker
    if (map.has(key)) {
      const existing = map.get(key)!
      const totalQty = existing.quantity + p.quantity
      const totalCost = existing.quantity * existing.ppc + p.quantity * p.ppc
      existing.ppc = totalQty > 0 ? totalCost / totalQty : existing.ppc
      existing.quantity = totalQty
      existing.account = 'Consolidado'
    } else {
      map.set(key, { ...p })
    }
  }
  return Array.from(map.values())
}

// Known tickers for the "Add position" autocomplete — BYMA USD D-class tickers
export const KNOWN_TICKERS: Pick<EditablePosition, 'ticker' | 'tickerYF' | 'name' | 'sector' | 'ratio'>[] = [
  // Energía Argentina
  { ticker: 'YPF',   tickerYF: 'YPFDD.BA',  name: 'YPF S.A.',        sector: 'Energía',    ratio: 1 },
  { ticker: 'PAMP',  tickerYF: 'PAMPD.BA',  name: 'Pampa Energía',   sector: 'Energía',    ratio: 1 },
  { ticker: 'VIST',  tickerYF: 'VISTD.BA',  name: 'Vista Energy',    sector: 'Energía',    ratio: 1 },
  { ticker: 'CEPU',  tickerYF: 'CEPUD.BA',  name: 'Central Puerto',  sector: 'Energía',    ratio: 1 },
  { ticker: 'TGSU2', tickerYF: 'TGSUD.BA',  name: 'TGS',             sector: 'Energía',    ratio: 1 },
  // Tecnología
  { ticker: 'MSFT',  tickerYF: 'MSFTD.BA',  name: 'Microsoft',       sector: 'Tecnología', ratio: 1 },
  { ticker: 'AAPL',  tickerYF: 'AAPLD.BA',  name: 'Apple',           sector: 'Tecnología', ratio: 1 },
  { ticker: 'NVDA',  tickerYF: 'NVDAD.BA',  name: 'NVIDIA',          sector: 'Tecnología', ratio: 1 },
  { ticker: 'GOGL',  tickerYF: 'GOGLD.BA',  name: 'Google',          sector: 'Tecnología', ratio: 1 },
  { ticker: 'META',  tickerYF: 'METAD.BA',  name: 'Meta Platforms',  sector: 'Tecnología', ratio: 1 },
  { ticker: 'AMZN',  tickerYF: 'AMZND.BA',  name: 'Amazon',          sector: 'Tecnología', ratio: 1 },
  { ticker: 'MELI',  tickerYF: 'MELID.BA',  name: 'MercadoLibre',    sector: 'Tecnología', ratio: 1 },
  { ticker: 'BABA',  tickerYF: 'BABAD.BA',  name: 'Alibaba',         sector: 'Tecnología', ratio: 1 },
  { ticker: 'PLTR',  tickerYF: 'PLTRD.BA',  name: 'Palantir',        sector: 'Tecnología', ratio: 1 },
  { ticker: 'TSLA',  tickerYF: 'TSLAD.BA',  name: 'Tesla',           sector: 'Tecnología', ratio: 1 },
  // ETFs
  { ticker: 'SPY',   tickerYF: 'SPYD.BA',   name: 'S&P 500 ETF',     sector: 'ETF',        ratio: 1 },
  { ticker: 'QQQ',   tickerYF: 'QQQD.BA',   name: 'Nasdaq 100 ETF',  sector: 'ETF',        ratio: 1 },
  { ticker: 'EWZ',   tickerYF: 'EWZD.BA',   name: 'Brazil ETF',      sector: 'ETF',        ratio: 1 },
  { ticker: 'ARKK',  tickerYF: 'ARKKD.BA',  name: 'ARK Innovation',  sector: 'ETF',        ratio: 1 },
  // Financiero
  { ticker: 'NU',    tickerYF: 'NUD.BA',    name: 'Nu Holdings',     sector: 'Financiero', ratio: 1 },
  { ticker: 'GGAL',  tickerYF: 'GGALD.BA',  name: 'Grupo Galicia',   sector: 'Financiero', ratio: 1 },
  { ticker: 'BMA',   tickerYF: 'BMAD.BA',   name: 'Banco Macro',     sector: 'Financiero', ratio: 1 },
  { ticker: 'BBAR',  tickerYF: 'BBARD.BA',  name: 'Banco Francés',   sector: 'Financiero', ratio: 1 },
  // Consumo
  { ticker: 'KO',    tickerYF: 'KOD.BA',    name: 'Coca-Cola',       sector: 'Consumo',    ratio: 1 },
  { ticker: 'PEP',   tickerYF: 'PEPD.BA',   name: 'PepsiCo',         sector: 'Consumo',    ratio: 1 },
  { ticker: 'MCD',   tickerYF: 'MCDD.BA',   name: "McDonald's",      sector: 'Consumo',    ratio: 1 },
]
