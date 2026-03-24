'use client'
import { useEffect } from 'react'
import { Bell, TrendingUp, TrendingDown, X } from 'lucide-react'
import { ToastAlert } from '@/hooks/useAlerts'
import { formatCurrency } from '@/lib/utils'

const TYPE_LABELS: Record<string, string> = {
  price_above: 'superó',
  price_below: 'bajó de',
  change_up: 'subió',
  change_down: 'cayó',
}

export function AlertToast({ toast, onDismiss }: { toast: ToastAlert; onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 6000)
    return () => clearTimeout(t)
  }, [onDismiss])

  const isUp = toast.type === 'price_above' || toast.type === 'change_up'

  return (
    <div className="flex items-start gap-3 bg-slate-800 border border-slate-600 rounded-xl shadow-xl px-4 py-3 min-w-[280px] max-w-xs animate-in slide-in-from-right-5 duration-300">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${isUp ? 'bg-emerald-500/15' : 'bg-red-500/15'}`}>
        {isUp ? <TrendingUp size={15} className="text-emerald-400" /> : <TrendingDown size={15} className="text-red-400" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <Bell size={11} className="text-amber-400" />
          <span className="text-xs font-bold text-amber-400 uppercase tracking-wide">Alerta</span>
        </div>
        <p className="text-sm font-semibold text-slate-100 mt-0.5">
          {toast.tickerDisplay} {TYPE_LABELS[toast.type]} {toast.type.startsWith('change') ? `${toast.value}%` : formatCurrency(toast.value)}
        </p>
        <p className="text-xs text-slate-400">Precio actual: {formatCurrency(toast.firedPrice)}</p>
      </div>
      <button onClick={onDismiss} className="text-slate-500 hover:text-slate-300 p-0.5 flex-shrink-0">
        <X size={14} />
      </button>
    </div>
  )
}
