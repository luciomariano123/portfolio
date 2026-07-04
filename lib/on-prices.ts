// Single source of truth for ON (Obligaciones Negociables) price defaults.
// Prices are expressed as fraction of face value (1.0 = 100%).
// User-edited prices are persisted in localStorage under ON_PRICES_KEY.

export const ON_PRICES_KEY = 'on_prices_v1'

export const DEFAULT_ON_PRICES: Record<string, number> = {
  'TTC9D.BA':  1.0595,
  'IRCOD.BA':  1.056,
  'PN36OD.BA': 1.09,
  'TLCOOD.BA': 1.0,
}

/** Load ON prices: defaults overridden by any user-saved values. */
export function loadOnPrices(): Record<string, number> {
  if (typeof window === 'undefined') return DEFAULT_ON_PRICES
  try {
    const raw = localStorage.getItem(ON_PRICES_KEY)
    return raw ? { ...DEFAULT_ON_PRICES, ...JSON.parse(raw) } : DEFAULT_ON_PRICES
  } catch {
    return DEFAULT_ON_PRICES
  }
}
