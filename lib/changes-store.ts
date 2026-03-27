'use client'

// Tracks portfolio position changes so they can be referenced in messages

export interface PortfolioChange {
  id: string
  timestamp: string
  type: 'add' | 'update' | 'remove'
  ticker: string
  name: string
  account: 'Lucio' | 'Agro'
  quantityBefore?: number
  quantityAfter?: number
  ppcBefore?: number
  ppcAfter?: number
}

const CHANGES_KEY = 'portfolio_changes_v1'
const MAX_STORED = 50
const RETENTION_DAYS = 7

export function recordChange(change: Omit<PortfolioChange, 'id' | 'timestamp'>): void {
  if (typeof window === 'undefined') return
  const existing = loadAllChanges()
  const entry: PortfolioChange = {
    ...change,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
  }
  const next = [entry, ...existing].slice(0, MAX_STORED)
  localStorage.setItem(CHANGES_KEY, JSON.stringify(next))
}

function loadAllChanges(): PortfolioChange[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(CHANGES_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function loadRecentChanges(days = RETENTION_DAYS): PortfolioChange[] {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000
  return loadAllChanges().filter(c => new Date(c.timestamp).getTime() > cutoff)
}

export function clearChanges(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(CHANGES_KEY)
}

function fmtQty(n: number) { return n.toLocaleString('es-AR') }
function fmtUSD(n: number) { return `$${n.toFixed(2)}` }

function describeChange(c: PortfolioChange): string {
  const acct = c.account === 'Lucio' ? 'Lucio' : 'Agro'
  const date = new Date(c.timestamp).toLocaleDateString('es-AR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
  })
  const time = new Date(c.timestamp).toLocaleTimeString('es-AR', {
    hour: '2-digit', minute: '2-digit',
  })

  if (c.type === 'add') {
    return `• [${date} ${time}] ➕ Agregué ${c.name} (${c.ticker}) en ${acct}: ${fmtQty(c.quantityAfter ?? 0)} láminas a ${fmtUSD(c.ppcAfter ?? 0)}`
  }
  if (c.type === 'remove') {
    return `• [${date} ${time}] ❌ Eliminé ${c.name} (${c.ticker}) de ${acct} (tenía ${fmtQty(c.quantityBefore ?? 0)} láminas)`
  }
  // update
  const parts: string[] = []
  if (c.quantityBefore !== c.quantityAfter && c.quantityBefore !== undefined && c.quantityAfter !== undefined) {
    const diff = c.quantityAfter - c.quantityBefore
    parts.push(`cantidad: ${fmtQty(c.quantityBefore)} → ${fmtQty(c.quantityAfter)} (${diff > 0 ? '+' : ''}${fmtQty(diff)})`)
  }
  if (c.ppcBefore !== undefined && c.ppcAfter !== undefined && Math.abs(c.ppcBefore - c.ppcAfter) > 0.001) {
    parts.push(`PPC: ${fmtUSD(c.ppcBefore)} → ${fmtUSD(c.ppcAfter)}`)
  }
  return `• [${date} ${time}] ✏️ Modifiqué ${c.name} (${c.ticker}) en ${acct}${parts.length ? ': ' + parts.join(', ') : ''}`
}

export function formatChangesForMessage(changes: PortfolioChange[]): string {
  if (changes.length === 0) return ''
  const lines = changes.map(describeChange)
  return `📊 *Cambios recientes en la cartera:*\n${lines.join('\n')}`
}
