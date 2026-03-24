'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { LayoutDashboard, Briefcase, TrendingUp, LineChart, Bell, Settings, ChevronRight, Scale, Landmark, X } from 'lucide-react'
import { useAlertBadge } from '@/hooks/useAlerts'

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/portfolio', label: 'Cartera', icon: Briefcase },
  { href: '/renta-fija', label: 'Renta Fija', icon: Landmark },
  { href: '/history', label: 'Evolución', icon: TrendingUp },
  { href: '/rebalanceo', label: 'Rebalanceo', icon: Scale },
  { href: '/analysis', label: 'Análisis', icon: LineChart },
  { href: '/alerts', label: 'Alertas', icon: Bell },
  { href: '/settings', label: 'Configuración', icon: Settings },
]

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname()
  const unreadAlerts = useAlertBadge()

  return (
    <aside className={cn(
      'fixed left-0 top-0 h-full w-60 flex flex-col z-40 transition-transform duration-200',
      'bg-[var(--sidebar-bg)] border-r border-[var(--app-border)]',
      open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
    )}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-[var(--app-border)]">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
          <span className="text-white font-bold text-sm">C</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-slate-100 font-semibold text-sm leading-none">Portfolio</p>
          <p className="text-slate-500 text-xs mt-0.5">CEDEAR Tracker</p>
        </div>
        <button onClick={onClose} className="md:hidden p-1 text-slate-500 hover:text-slate-300" aria-label="Cerrar menú">
          <X size={16} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href
          const isAlerts = href === '/alerts'
          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                isActive
                  ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              )}
            >
              <span className="relative flex-shrink-0">
                <Icon size={16} />
                {isAlerts && unreadAlerts > 0 && (
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                    {unreadAlerts > 9 ? '9+' : unreadAlerts}
                  </span>
                )}
              </span>
              <span className="flex-1">{label}</span>
              {isActive && <ChevronRight size={14} className="opacity-60" />}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-[var(--app-border)]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-orange-400 flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-xs">V</span>
          </div>
          <div>
            <p className="text-slate-200 text-sm font-medium">Vicky</p>
            <p className="text-slate-500 text-xs">Balanz</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
