'use client'

import { useState, useEffect, useCallback } from 'react'

export interface PriceData {
  price: number
  change: number
  changePercent: number
  currency: string
  name?: string
}

export function usePrices(tickers: string[], intervalMs = 60000) {
  const [prices, setPrices] = useState<Record<string, PriceData>>({})
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchPrices = useCallback(async () => {
    if (tickers.length === 0) return
    try {
      const res = await fetch(`/api/prices?tickers=${tickers.join(',')}`)
      if (!res.ok) throw new Error('Failed to fetch prices')
      const data = await res.json()
      setPrices(data)
      setLastUpdated(new Date())
      setError(null)
    } catch (err) {
      setError('Error cargando precios')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [tickers.join(',')])

  useEffect(() => {
    fetchPrices()
    const id = setInterval(fetchPrices, intervalMs)
    return () => clearInterval(id)
  }, [fetchPrices, intervalMs])

  return { prices, loading, lastUpdated, error, refresh: fetchPrices }
}

export function useDolar() {
  const [rates, setRates] = useState<Record<string, number>>({ ccl: 1430, mep: 1420, blue: 1450, oficial: 1100 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/dolar')
      .then(r => r.json())
      .then(d => { setRates(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  return { rates, loading }
}
