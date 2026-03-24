'use client'

import { useState, useEffect } from 'react'
import { MessageCircle, ExternalLink, Key, Trash2, CheckCircle } from 'lucide-react'

const STORAGE_KEY = 'kapso_inbox_token'

export default function InboxPage() {
  const [token, setToken] = useState<string>('')
  const [draft, setDraft] = useState<string>('')
  const [editing, setEditing] = useState(false)
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) ?? ''
    setToken(saved)
    setDraft(saved)

    // Match app theme
    const savedTheme = localStorage.getItem('app_theme') as 'dark' | 'light' | null
    if (savedTheme) setTheme(savedTheme)
  }, [])

  function save() {
    const t = draft.trim()
    setToken(t)
    localStorage.setItem(STORAGE_KEY, t)
    setEditing(false)
  }

  function clear() {
    setToken('')
    setDraft('')
    localStorage.removeItem(STORAGE_KEY)
    setEditing(false)
  }

  const iframeSrc = token
    ? `https://inbox.kapso.ai/embed/${token}?mode=${theme}&status=all`
    : ''

  return (
    <div className="flex flex-col h-[calc(100vh-56px)]">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--app-border)] flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
            <MessageCircle size={16} className="text-white" />
          </div>
          <div>
            <h1 className="text-[var(--app-fg)] font-semibold text-base">WhatsApp Inbox</h1>
            <p className="text-slate-500 text-xs">Powered by Kapso</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {token && !editing && (
            <span className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-2.5 py-1 rounded-full">
              <CheckCircle size={11} />
              Conectado
            </span>
          )}
          <button
            onClick={() => setEditing(e => !e)}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 bg-[var(--card-bg)] border border-[var(--app-border)] px-3 py-1.5 rounded-lg transition-colors"
          >
            <Key size={12} />
            {token ? 'Cambiar token' : 'Configurar'}
          </button>
          <a
            href="https://app.kapso.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 bg-[var(--card-bg)] border border-[var(--app-border)] px-3 py-1.5 rounded-lg transition-colors"
          >
            <ExternalLink size={12} />
            Kapso
          </a>
        </div>
      </div>

      {/* Token setup panel */}
      {(editing || !token) && (
        <div className="flex-shrink-0 px-6 py-5 border-b border-[var(--app-border)] bg-[var(--card-bg)]">
          {!token && !editing ? (
            // First time setup
            <div className="max-w-xl">
              <h2 className="text-[var(--app-fg)] font-medium mb-1">Conectar tu inbox de Kapso</h2>
              <p className="text-slate-400 text-sm mb-4">
                Para ver tus conversaciones de WhatsApp, necesitás un <strong className="text-slate-300">token de acceso</strong> de tu proyecto en Kapso.
              </p>
              <ol className="text-sm text-slate-400 space-y-2 mb-5">
                <li className="flex gap-2">
                  <span className="text-indigo-400 font-bold flex-shrink-0">1.</span>
                  <span>Abrí <a href="https://app.kapso.ai" target="_blank" rel="noopener noreferrer" className="text-indigo-400 underline">app.kapso.ai</a> y entrá a tu proyecto</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-indigo-400 font-bold flex-shrink-0">2.</span>
                  <span>Andá a <strong className="text-slate-300">Inbox → Embedded → Nuevo token</strong></span>
                </li>
                <li className="flex gap-2">
                  <span className="text-indigo-400 font-bold flex-shrink-0">3.</span>
                  <span>Elegí scope <strong className="text-slate-300">project</strong> para ver todas las conversaciones</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-indigo-400 font-bold flex-shrink-0">4.</span>
                  <span>Copiá el token y pegalo acá abajo</span>
                </li>
              </ol>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Pegá tu token de Kapso..."
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && save()}
                  className="flex-1 bg-[var(--app-bg)] border border-[var(--app-border)] text-[var(--app-fg)] placeholder-slate-600 text-sm px-3 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <button
                  onClick={save}
                  disabled={!draft.trim()}
                  className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                >
                  Guardar
                </button>
              </div>
            </div>
          ) : (
            // Edit mode
            <div className="flex items-center gap-2 max-w-xl">
              <input
                type="text"
                placeholder="Nuevo token..."
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && save()}
                className="flex-1 bg-[var(--app-bg)] border border-[var(--app-border)] text-[var(--app-fg)] placeholder-slate-600 text-sm px-3 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono text-xs"
              />
              <button
                onClick={save}
                disabled={!draft.trim()}
                className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                Guardar
              </button>
              <button
                onClick={clear}
                className="flex items-center gap-1.5 text-red-400 hover:text-red-300 border border-red-400/20 bg-red-400/5 hover:bg-red-400/10 text-sm px-3 py-2 rounded-lg transition-colors"
              >
                <Trash2 size={13} />
                Quitar
              </button>
              <button
                onClick={() => { setDraft(token); setEditing(false) }}
                className="text-slate-400 hover:text-slate-200 text-sm px-3 py-2 rounded-lg transition-colors"
              >
                Cancelar
              </button>
            </div>
          )}
        </div>
      )}

      {/* Inbox iframe */}
      {token && !editing && (
        <div className="flex-1 min-h-0">
          <iframe
            src={iframeSrc}
            className="w-full h-full border-0"
            title="Kapso WhatsApp Inbox"
            allow="clipboard-read; clipboard-write"
          />
        </div>
      )}

      {/* Empty state */}
      {!token && !editing && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto mb-4">
              <MessageCircle size={28} className="text-green-400" />
            </div>
            <p className="text-slate-400 text-sm">Configurá tu token para ver el inbox</p>
          </div>
        </div>
      )}
    </div>
  )
}
