'use client'

export type AlertType = 'price_above' | 'price_below' | 'change_up' | 'change_down'

export interface PortfolioAlert {
  id: string
  tickerYF: string       // BYMA D-class ticker (e.g., PAMPD.BA)
  tickerDisplay: string  // e.g., PAMP
  name: string
  type: AlertType
  value: number          // threshold
  active: boolean
  createdAt: string      // ISO date
  firedAt?: string       // ISO timestamp when fired
  firedPrice?: number
}

const ALERTS_KEY = 'portfolio_alerts_v1'
const ALERTS_READ_KEY = 'portfolio_alerts_read_v1'

export function loadAlerts(): PortfolioAlert[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(ALERTS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

export function saveAlerts(alerts: PortfolioAlert[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(ALERTS_KEY, JSON.stringify(alerts))
}

export function createAlert(data: Omit<PortfolioAlert, 'id' | 'createdAt' | 'active'>): PortfolioAlert {
  const alert: PortfolioAlert = {
    ...data,
    id: `alert_${Date.now()}`,
    active: true,
    createdAt: new Date().toISOString().slice(0, 10),
  }
  const existing = loadAlerts()
  saveAlerts([...existing, alert])
  return alert
}

export function getLastReadTimestamp(): string {
  if (typeof window === 'undefined') return new Date().toISOString()
  return localStorage.getItem(ALERTS_READ_KEY) ?? '1970-01-01T00:00:00.000Z'
}

export function markAlertsRead(): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(ALERTS_READ_KEY, new Date().toISOString())
}
