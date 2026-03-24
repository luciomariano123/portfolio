'use client'
import { useState } from 'react'
import { ThemeProvider } from './ThemeProvider'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  return (
    <ThemeProvider>
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <TopBar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
      <main className="min-h-screen pt-14 md:ml-60 transition-all">
        {children}
      </main>
    </ThemeProvider>
  )
}
