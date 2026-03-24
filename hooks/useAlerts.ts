'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { loadAlerts, saveAlerts, createAlert, getLastReadTimestamp, PortfolioAlert } from '@/lib/alerts-store'

export interface PriceMap { [ticker: string]: { price: number; changePercent: number } }

export interface ToastAlert {
  id: string
  tickerDisplay: string
  name: string
  type: PortfolioAlert['type']
  value: number
  firedPrice: number
}

function checkCondition(alert: PortfolioAlert, price: number, changePercent: number): boolean {
  switch (alert.type) {
    case 'price_above':  return price >= alert.value
    case 'price_below':  return price <= alert.value
    case 'change_up':    return changePercent >= alert.value
    case 'change_down':  return changePercent <= -alert.value
  }
}

export function useAlerts(prices: PriceMap) {
  const [alerts, setAlerts] = useState<PortfolioAlert[]>([])
  const [toasts, setToasts] = useState<ToastAlert[]>([])
  const firedToday = useRef<Set<string>>(new Set())
  const initialized = useRef(false)

  useEffect(() => {
    setAlerts(loadAlerts())
    initialized.current = true
  }, [])

  // Check alerts whenever prices update
  useEffect(() => {
    if (!initialized.current || Object.keys(prices).length === 0) return

    const updated = alerts.map(a => ({ ...a }))
    const newToasts: ToastAlert[] = []
    let changed = false

    for (const alert of updated) {
      if (!alert.active || alert.firedAt) continue
      const pd = prices[alert.tickerYF]
      if (!pd) continue

      const todayKey = `${alert.id}_${new Date().toISOString().slice(0, 10)}`
      if (firedToday.current.has(todayKey)) continue

      const fired = checkCondition(alert, pd.price, pd.changePercent)
      if (fired) {
        alert.active = false
        alert.firedAt = new Date().toISOString()
        alert.firedPrice = pd.price
        firedToday.current.add(todayKey)
        newToasts.push({
          id: alert.id,
          tickerDisplay: alert.tickerDisplay,
          name: alert.name,
          type: alert.type,
          value: alert.value,
          firedPrice: pd.price,
        })
        changed = true
      }
    }

    if (changed) {
      saveAlerts(updated)
      setAlerts(updated)
      setToasts(prev => [...prev, ...newToasts])
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prices])

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const addAlert = useCallback((data: Omit<PortfolioAlert, 'id' | 'createdAt' | 'active'>) => {
    const newAlert = createAlert(data)
    setAlerts(prev => [...prev, newAlert])
    return newAlert
  }, [])

  const deleteAlert = useCallback((id: string) => {
    const updated = loadAlerts().filter(a => a.id !== id)
    saveAlerts(updated)
    setAlerts(updated)
  }, [])

  const toggleAlert = useCallback((id: string) => {
    const updated = loadAlerts().map(a =>
      a.id === id ? { ...a, active: !a.active, firedAt: a.active ? a.firedAt : undefined } : a
    )
    saveAlerts(updated)
    setAlerts(updated)
  }, [])

  return { alerts, toasts, dismissToast, addAlert, deleteAlert, toggleAlert }
}

// Hook for sidebar badge — counts unread fired alerts
export function useAlertBadge(): number {
  const [count, setCount] = useState(0)

  useEffect(() => {
    function recount() {
      const alerts = loadAlerts()
      const lastRead = getLastReadTimestamp()
      const unread = alerts.filter(
        a => a.firedAt && new Date(a.firedAt) > new Date(lastRead)
      ).length
      setCount(unread)
    }
    recount()
    // Re-check every 30s
    const interval = setInterval(recount, 30000)
    return () => clearInterval(interval)
  }, [])

  return count
}
