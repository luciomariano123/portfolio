// Server-side positions snapshot (mirrors positions-store.ts DEFAULT_POSITIONS)
// Used by the WhatsApp report API route (can't access localStorage server-side)

export const DEFAULT_POSITIONS = [
  // ── Balanz Lucio ──────────────────────────────────────────────────────────
  { ticker: 'AAPL',  tickerYF: 'AAPLD.BA',  name: 'Apple',          quantity: 766,  ppc: 12.8520496, account: 'Lucio' },
  { ticker: 'AMZN',  tickerYF: 'AMZND.BA',  name: 'Amazon',         quantity: 3091, ppc: 1.59010029, account: 'Lucio' },
  { ticker: 'SPY',   tickerYF: 'SPYD.BA',   name: 'S&P 500 ETF',    quantity: 673,  ppc: 34.0499406, account: 'Lucio' },
  { ticker: 'MELI',  tickerYF: 'MELID.BA',  name: 'MercadoLibre',   quantity: 553,  ppc: 17.6998192, account: 'Lucio' },
  { ticker: 'META',  tickerYF: 'METAD.BA',  name: 'Meta Platforms', quantity: 510,  ppc: 27.3113529, account: 'Lucio' },
  { ticker: 'MSFT',  tickerYF: 'MSFTD.BA',  name: 'Microsoft',      quantity: 1144, ppc: 14.4238986, account: 'Lucio' },
  { ticker: 'NU',    tickerYF: 'NUD.BA',    name: 'Nu Holdings',    quantity: 675,  ppc: 7.29820741, account: 'Lucio' },
  { ticker: 'PAMP',  tickerYF: 'PAMPD.BA',  name: 'Pampa Energía',  quantity: 4502, ppc: 3.27319191, account: 'Lucio' },
  { ticker: 'PLTR',  tickerYF: 'PLTRD.BA',  name: 'Palantir',       quantity: 78,   ppc: 50.9270513, account: 'Lucio' },
  { ticker: 'TSLA',  tickerYF: 'TSLAD.BA',  name: 'Tesla',          quantity: 760,  ppc: 19.3875526, account: 'Lucio' },
  // ── Balanz Agropecuaria ───────────────────────────────────────────────────
  { ticker: 'GOGL',  tickerYF: 'GOGLD.BA',  name: 'Google',         quantity: 1386, ppc: 4.98556999, account: 'Agro' },
  { ticker: 'KO',    tickerYF: 'KOD.BA',    name: 'Coca-Cola',      quantity: 316,  ppc: 15.1329114, account: 'Agro' },
  { ticker: 'MCD',   tickerYF: 'MCDD.BA',   name: "McDonald's",     quantity: 235,  ppc: 13.4978723, account: 'Agro' },
  { ticker: 'MSFT',  tickerYF: 'MSFTD.BA',  name: 'Microsoft',      quantity: 633,  ppc: 14.7424961, account: 'Agro' },
  { ticker: 'NVDA',  tickerYF: 'NVDAD.BA',  name: 'NVIDIA',         quantity: 644,  ppc: 7.3136646,  account: 'Agro' },
  { ticker: 'PAMP',  tickerYF: 'PAMPD.BA',  name: 'Pampa Energía',  quantity: 2719, ppc: 3.5310776,  account: 'Agro' },
  { ticker: 'PEP',   tickerYF: 'PEPD.BA',   name: 'PepsiCo',        quantity: 641,  ppc: 8.53198128, account: 'Agro' },
  { ticker: 'PLTR',  tickerYF: 'PLTRD.BA',  name: 'Palantir',       quantity: 65,   ppc: 51.2923077, account: 'Agro' },
] as const
