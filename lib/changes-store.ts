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

const CHANGES_KEY = 'portfolio_changes_v2'   // bumped to v2: clears duplicates
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
function fmtUSD(n: number) { return `u$d ${n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` }
function fmtTotal(qty: number, ppc: number) {
  const total = qty * ppc
  return `≈ u$d ${total.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function describeChange(c: PortfolioChange): string {
  const acct = c.account === 'Lucio' ? 'Lucio' : 'Agro'
  const date = new Date(c.timestamp).toLocaleDateString('es-AR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
  })
  const time = new Date(c.timestamp).toLocaleTimeString('es-AR', {
    hour: '2-digit', minute: '2-digit',
  })

  if (c.type === 'add') {
    const qty = c.quantityAfter ?? 0
    const ppc = c.ppcAfter ?? 0
    return `• [${date} ${time}] ➕ Compré ${c.name} (${c.ticker}) en ${acct}: ${fmtQty(qty)} láminas a ${fmtUSD(ppc)} — ${fmtTotal(qty, ppc)}`
  }

  if (c.type === 'remove') {
    return `• [${date} ${time}] ❌ Eliminé ${c.name} (${c.ticker}) de ${acct} (tenía ${fmtQty(c.quantityBefore ?? 0)} láminas)`
  }

  // update
  const parts: string[] = []
  const qtyBefore = c.quantityBefore ?? 0
  const qtyAfter  = c.quantityAfter  ?? 0
  const ppcAfter  = c.ppcAfter       ?? 0

  if (qtyBefore !== qtyAfter) {
    const diff = qtyAfter - qtyBefore
    const verb = diff > 0 ? 'Compré más' : 'Vendí'
    const invested = Math.abs(diff) * ppcAfter
    parts.push(`${verb} ${fmtQty(Math.abs(diff))} láminas a ${fmtUSD(ppcAfter)} — ≈ u$d ${invested.toLocaleString('es-AR', { maximumFractionDigits: 0 })}`)
    parts.push(`Total: ${fmtQty(qtyAfter)} lám. · PPC prom ${fmtUSD(ppcAfter)}`)
  } else if (c.ppcBefore !== undefined && Math.abs(c.ppcBefore - ppcAfter) > 0.001) {
    parts.push(`PPC: ${fmtUSD(c.ppcBefore)} → ${fmtUSD(ppcAfter)}`)
  }

  const action = parts.length && parts[0].startsWith('Compré') ? 'Compré más' : parts[0]?.startsWith('Vendí') ? 'Vendí' : 'Modifiqué'
  return `• [${date} ${time}] ✏️ ${action} ${c.name} (${c.ticker}) en ${acct}: ${parts.join(' | ')}`
}

export function formatChangesForMessage(changes: PortfolioChange[]): string {
  if (changes.length === 0) return ''
  const lines = changes.map(describeChange)
  return `📊 *Cambios recientes en la cartera:*\n${lines.join('\n')}`
}
