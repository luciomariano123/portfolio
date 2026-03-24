import { NextResponse } from 'next/server'

let cachedRates: Record<string, number> | null = null
let cacheTime = 0
const CACHE_TTL = 5 * 60 * 1000 // 5 min

export async function GET() {
  const now = Date.now()
  if (cachedRates && now - cacheTime < CACHE_TTL) {
    return NextResponse.json(cachedRates)
  }

  try {
    // Use dolarapi.com - free, no auth
    const res = await fetch('https://dolarapi.com/v1/dolares', {
      signal: AbortSignal.timeout(5000),
    })
    const data = await res.json()

    const rates: Record<string, number> = {}
    for (const item of data) {
      const key = item.casa?.toLowerCase()
      if (key === 'blue') rates.blue = item.venta
      else if (key === 'bolsa') rates.mep = item.venta
      else if (key === 'contadoconliqui') rates.ccl = item.venta
      else if (key === 'oficial') rates.oficial = item.venta
    }

    // Fallback defaults if API fails
    if (!rates.ccl) rates.ccl = 1430
    if (!rates.mep) rates.mep = 1420
    if (!rates.blue) rates.blue = 1450
    if (!rates.oficial) rates.oficial = 1100

    cachedRates = rates
    cacheTime = now
    return NextResponse.json(rates)
  } catch {
    // Fallback rates
    const fallback = { ccl: 1430, mep: 1420, blue: 1450, oficial: 1100 }
    return NextResponse.json(fallback)
  }
}
