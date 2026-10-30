'use client'

import { TERM_DEPOSITS, termDepositDays, termDepositTermDays, termDepositValue, type TermDeposit } from '@/lib/portfolio-data'
import { formatCurrency, formatDate } from '@/lib/utils'

function TermDepositRow({ td }: { td: TermDeposit }) {
  const days = termDepositDays(td)
  const term = termDepositTermDays(td)
  const value = termDepositValue(td)
  const accrued = value - td.principal
  const atMaturity = termDepositValue(td, td.maturity)
  const totalInterest = atMaturity - td.principal
  const remaining = term - days
  const pct = term > 0 ? (days / term) * 100 : 0

  return (
    <div className="space-y-2 py-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-300">{td.name}</p>
          <p className="text-xs text-slate-500">
            {(td.rate * 100).toFixed(1)}% TNA — {term} días — Vto. {formatDate(td.maturity)} — {td.account}
          </p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-sm font-mono text-slate-100">{formatCurrency(value)}</p>
          <p className="text-xs font-mono text-emerald-400">+{formatCurrency(accrued)} devengado</p>
        </div>
      </div>
      <div className="h-1.5 rounded-full bg-slate-700 overflow-hidden">
        <div className="h-full rounded-full bg-lime-500 transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
      <div className="flex justify-between text-xs text-slate-500">
        <span>Día {days} de {term}{remaining > 0 ? ` · faltan ${remaining}` : ' · vencido'}</span>
        <span className="font-mono">Al vto. {formatCurrency(atMaturity)} (+{formatCurrency(totalInterest)})</span>
      </div>
    </div>
  )
}

export function TermDepositList({ deposits = TERM_DEPOSITS }: { deposits?: TermDeposit[] }) {
  if (deposits.length === 0) return <p className="text-sm text-slate-500">Sin plazos fijos.</p>
  return (
    <div className="divide-y divide-slate-700/40">
      {deposits.map(td => <TermDepositRow key={`${td.name}-${td.start}`} td={td} />)}
    </div>
  )
}
