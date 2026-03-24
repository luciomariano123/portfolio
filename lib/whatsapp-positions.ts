// Server-side positions snapshot (mirrors positions-store.ts DEFAULT_POSITIONS)
// Used by the WhatsApp report API route (can't access localStorage server-side)

export const DEFAULT_POSITIONS = [
  // ── Balanz Lucio ──────────────────────────────────────────────────────────
  { ticker: 'AMZN',  tickerYF: 'AMZND.BA',  name: 'Amazon',         quantity: 3091, ppc: 1.59,  account: 'Lucio' },
  { ticker: 'MELI',  tickerYF: 'MELID.BA',  name: 'MercadoLibre',   quantity: 553,  ppc: 17.70, account: 'Lucio' },
  { ticker: 'META',  tickerYF: 'METAD.BA',  name: 'Meta Platforms', quantity: 311,  ppc: 29.01, account: 'Lucio' },
  { ticker: 'MSFT',  tickerYF: 'MSFTD.BA',  name: 'Microsoft',      quantity: 760,  ppc: 15.24, account: 'Lucio' },
  { ticker: 'PLTR',  tickerYF: 'PLTRD.BA',  name: 'Palantir',       quantity: 78,   ppc: 50.93, account: 'Lucio' },
  { ticker: 'TSLA',  tickerYF: 'TSLAD.BA',  name: 'Tesla',          quantity: 183,  ppc: 26.77, account: 'Lucio' },
  { ticker: 'SPY',   tickerYF: 'SPYD.BA',   name: 'S&P 500 ETF',    quantity: 96,   ppc: 33.72, account: 'Lucio' },
  { ticker: 'PAMP',  tickerYF: 'PAMPD.BA',  name: 'Pampa Energía',  quantity: 5888, ppc: 3.34,  account: 'Lucio' },
  { ticker: 'TGSU2', tickerYF: 'TGSUD.BA',  name: 'TGS',            quantity: 468,  ppc: 6.32,  account: 'Lucio' },
  { ticker: 'YPF',   tickerYF: 'YPFDD.BA',  name: 'YPF S.A.',       quantity: 1264, ppc: 37.76, account: 'Lucio' },
  // ── Balanz Agropecuaria ───────────────────────────────────────────────────
  { ticker: 'KO',    tickerYF: 'KOD.BA',    name: 'Coca-Cola',      quantity: 316,  ppc: 15.13, account: 'Agro' },
  { ticker: 'MCD',   tickerYF: 'MCDD.BA',   name: "McDonald's",     quantity: 235,  ppc: 13.50, account: 'Agro' },
  { ticker: 'PEP',   tickerYF: 'PEPD.BA',   name: 'PepsiCo',        quantity: 641,  ppc: 8.53,  account: 'Agro' },
  { ticker: 'MSFT',  tickerYF: 'MSFTD.BA',  name: 'Microsoft',      quantity: 633,  ppc: 14.74, account: 'Agro' },
  { ticker: 'PLTR',  tickerYF: 'PLTRD.BA',  name: 'Palantir',       quantity: 65,   ppc: 51.29, account: 'Agro' },
  { ticker: 'PAMP',  tickerYF: 'PAMPD.BA',  name: 'Pampa Energía',  quantity: 2719, ppc: 3.53,  account: 'Agro' },
  { ticker: 'YPF',   tickerYF: 'YPFDD.BA',  name: 'YPF S.A.',       quantity: 236,  ppc: 35.77, account: 'Agro' },
] as const
