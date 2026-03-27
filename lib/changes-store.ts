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
function fmtUSD(n: number) {
  const abs = Math.abs(n)
  const formatted = abs >= 1000
    ? abs.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
    : abs.toFixed(2)
  return `${n < 0 ? '-' : ''}$${formatted}`
}
function fmtPct(n: number) { return `${n >= 0 ? '+' : ''}${n.toFixed(1)}%` }
function fmtSign(n: number) { return `${n >= 0 ? '+' : ''}${fmtUSD(n)}` }

function describeChange(c: PortfolioChange): string {
  const acct = c.account === 'Lucio' ? 'Lucio' : 'Agro'
  const date = new Date(c.timestamp).toLocaleDateString('es-AR', {
    day: '2-digit', month: '2-digit',
  })
  const time = new Date(c.timestamp).toLocaleTimeString('es-AR', {
    hour: '2-digit', minute: '2-digit',
  })

  if (c.type === 'add') {
    const qty = c.quantityAfter ?? 0
    const ppc = c.ppcAfter ?? 0
    const totalInvested = qty * ppc
    return [
      `➕ *${c.ticker}* — ${c.name} (${acct}) · ${date} ${time}`,
      `   Compra: ${fmtQty(qty)} láminas a ${fmtUSD(ppc)}/lám`,
      `   💵 Invertido: ${fmtUSD(totalInvested)}`,
    ].join('\n')
  }

  if (c.type === 'remove') {
    const qty = c.quantityBefore ?? 0
    const ppc = c.ppcBefore ?? 0
    return [
      `❌ *${c.ticker}* — ${c.name} (${acct}) · ${date} ${time}`,
      `   Posición eliminada: ${fmtQty(qty)} láminas (costo ${fmtUSD(qty * ppc)})`,
    ].join('\n')
  }

  // update
  const qB = c.quantityBefore ?? 0
  const qA = c.quantityAfter ?? 0
  const pB = c.ppcBefore ?? 0
  const pA = c.ppcAfter ?? 0
  const lines: string[] = []

  const qDiff = qA - qB
  const isBuy = qDiff > 0

  if (qDiff !== 0) {
    const pctOfPos = qB > 0 ? (Math.abs(qDiff) / qB) * 100 : 0
    const valueOfOp = Math.abs(qDiff) * (isBuy ? pA : pB)
    const remainingCost = qA * pA
    // P&L implícito: diferencia de costo base antes vs después
    const costBefore = qB * pB
    const costAfter  = qA * pA
    const pnlDelta   = costAfter - costBefore  // cuánto aumentó/disminuyó el costo total

    lines.push(
      `${isBuy ? '🟢' : '🔴'} *${c.ticker}* — ${c.name} (${acct}) · ${date} ${time}`,
      `   ${isBuy ? 'Compra' : 'Venta'}: ${fmtQty(qB)} → ${fmtQty(qA)} lám (${isBuy ? '+' : '-'}${Math.abs(qDiff).toLocaleString('es-AR')} · ${fmtPct(isBuy ? pctOfPos : -pctOfPos)} de la posición)`,
      `   💵 ${isBuy ? 'Invertido' : 'Realizado'}: ${fmtUSD(valueOfOp)}`,
      `   📦 Tenencia restante: ${fmtQty(qA)} lám = ${fmtUSD(remainingCost)} (PPC ${fmtUSD(pA)})`,
      `   📊 Costo total ${isBuy ? 'aumentó' : 'bajó'}: ${fmtSign(pnlDelta)}`,
    )
  } else if (Math.abs(pB - pA) > 0.001) {
    // solo PPC cambió
    const pnlDiff = (pA - pB) * qA
    lines.push(
      `✏️ *${c.ticker}* — ${c.name} (${acct}) · ${date} ${time}`,
      `   PPC: ${fmtUSD(pB)} → ${fmtUSD(pA)} | ${fmtQty(qA)} láminas`,
      `   📊 Impacto en costo base: ${fmtSign(pnlDiff)}`,
    )
  }

  return lines.join('\n')
}

export function formatChangesForMessage(changes: PortfolioChange[]): string {
  if (changes.length === 0) return ''
  const blocks = changes.map(describeChange)
  return `📊 *Cambios recientes en la cartera:*\n\n${blocks.join('\n\n')}`
}
