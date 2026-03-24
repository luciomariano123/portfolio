'use client'
import { Menu, Sun, Moon } from 'lucide-react'
import { useTheme } from './ThemeProvider'

export function TopBar({ onMenuClick }: { onMenuClick: () => void }) {
  const { theme, toggle } = useTheme()
  return (
    <header className="fixed top-0 left-0 right-0 md:left-60 h-14 z-30 flex items-center px-4 gap-3 border-b border-[var(--app-border)] bg-[var(--app-bg)]/90 backdrop-blur-md transition-colors">
      <button
        onClick={onMenuClick}
        className="md:hidden p-2 rounded-lg hover:bg-slate-700/40 text-slate-400 hover:text-slate-200 transition-colors"
        aria-label="Abrir menú"
      >
        <Menu size={20} />
      </button>
      <div className="flex-1" />
      <button
        onClick={toggle}
        className="p-2 rounded-lg hover:bg-slate-700/40 text-slate-400 hover:text-slate-200 transition-colors"
        aria-label="Cambiar tema"
      >
        {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
      </button>
    </header>
  )
}
