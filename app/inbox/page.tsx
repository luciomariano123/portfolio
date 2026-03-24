'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { MessageCircle, RefreshCw, Send, CheckCheck, Check, Clock, Search, ChevronRight, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Types ─────────────────────────────────────────────────────────────────────

interface KapsoContact {
  id: string
  name?: string
  phone_number: string
}

interface KapsoConversation {
  id: string
  status?: 'active' | 'ended'
  contact_name?: string
  phone_number?: string
  unread_messages_count?: number
  // nested under kapso
  kapso?: {
    contact_name?: string
    messages_count?: number
    unread_messages_count?: number
    last_message_body?: string
    last_message_timestamp?: string
    status?: string
    phone_number?: string
  }
  contact?: KapsoContact
  last_message?: { body?: string; created_at: string }
  created_at: string
  updated_at?: string
}

interface KapsoMessage {
  id: string
  direction: 'inbound' | 'outbound'
  type: string
  body?: string
  status?: string
  created_at: string
  contact?: KapsoContact
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'ahora'
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
}

function convName(conv: KapsoConversation): string {
  return conv.kapso?.contact_name ?? conv.contact_name ?? conv.contact?.name ?? conv.phone_number ?? 'Desconocido'
}

function convPhone(conv: KapsoConversation): string {
  return conv.kapso?.phone_number ?? conv.phone_number ?? conv.contact?.phone_number ?? ''
}

function convPreview(conv: KapsoConversation): string {
  return conv.kapso?.last_message_body ?? conv.last_message?.body ?? ''
}

function convTime(conv: KapsoConversation): string {
  return conv.kapso?.last_message_timestamp ?? conv.last_message?.created_at ?? conv.updated_at ?? conv.created_at
}

function convUnread(conv: KapsoConversation): number {
  return conv.kapso?.unread_messages_count ?? conv.unread_messages_count ?? 0
}

function convStatus(conv: KapsoConversation): string {
  return conv.kapso?.status ?? conv.status ?? 'active'
}

function convInitials(conv: KapsoConversation): string {
  const name = convName(conv)
  return name.slice(0, 2).toUpperCase()
}

// ── Status icon ───────────────────────────────────────────────────────────────

function MsgStatus({ status }: { status?: string }) {
  if (status === 'read')      return <CheckCheck size={13} className="text-blue-400" />
  if (status === 'delivered') return <CheckCheck size={13} className="text-slate-400" />
  if (status === 'sent')      return <Check size={13} className="text-slate-400" />
  return <Clock size={13} className="text-slate-500" />
}

// ── Conversation list item ────────────────────────────────────────────────────

function ConvItem({ conv, active, onClick }: {
  conv: KapsoConversation
  active: boolean
  onClick: () => void
}) {
  const unread = convUnread(conv)
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left px-4 py-3 flex gap-3 items-start hover:bg-slate-700/40 transition-colors border-b border-[var(--app-border)] last:border-0',
        active && 'bg-indigo-500/10 border-l-2 border-l-indigo-500'
      )}
    >
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0 text-white text-xs font-bold">
        {convInitials(conv)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium text-[var(--app-fg)] truncate">{convName(conv)}</span>
          <span className="text-xs text-slate-500 flex-shrink-0">{timeAgo(convTime(conv))}</span>
        </div>
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <span className="text-xs text-slate-400 truncate">{convPreview(conv) || 'Sin mensajes'}</span>
          {unread > 0 && (
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-500 text-white text-[10px] font-bold flex items-center justify-center">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </div>
      </div>
    </button>
  )
}

// ── Message bubble ────────────────────────────────────────────────────────────

function Bubble({ msg }: { msg: KapsoMessage }) {
  const out = msg.direction === 'outbound'
  return (
    <div className={cn('flex', out ? 'justify-end' : 'justify-start')}>
      <div className={cn(
        'max-w-[75%] rounded-2xl px-3.5 py-2 text-sm',
        out
          ? 'bg-emerald-600 text-white rounded-br-sm'
          : 'bg-[var(--card-bg)] text-[var(--app-fg)] border border-[var(--app-border)] rounded-bl-sm'
      )}>
        <p className="whitespace-pre-wrap break-words">{msg.body ?? '📎 Archivo adjunto'}</p>
        <div className={cn('flex items-center gap-1 mt-1', out ? 'justify-end' : 'justify-start')}>
          <span className={cn('text-[10px]', out ? 'text-emerald-200' : 'text-slate-500')}>
            {formatTime(msg.created_at)}
          </span>
          {out && <MsgStatus status={msg.status} />}
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function InboxPage() {
  const [conversations, setConversations]   = useState<KapsoConversation[]>([])
  const [messages, setMessages]             = useState<KapsoMessage[]>([])
  const [selected, setSelected]             = useState<KapsoConversation | null>(null)
  const [loading, setLoading]               = useState(true)
  const [loadingMsgs, setLoadingMsgs]       = useState(false)
  const [filter, setFilter]                 = useState<'all' | 'active' | 'ended'>('all')
  const [search, setSearch]                 = useState('')
  const [reply, setReply]                   = useState('')
  const [sending, setSending]               = useState(false)
  const [configured, setConfigured]         = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // ── Fetch conversations ──────────────────────────────────────────────────

  const fetchConversations = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/kapso/conversations?status=${filter}&per_page=50`)
      const data = await res.json()
      if (res.status === 500) { setConfigured(false); return }
      if (!res.ok) {
        console.error('[inbox] Kapso error:', data)
        setConversations([])
        setConfigured(true) // configured, but Kapso returned an error
        return
      }
      setConfigured(true)
      setConversations(data.conversations ?? [])
    } catch {
      setConfigured(false)
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => { fetchConversations() }, [fetchConversations])

  // ── Fetch messages ───────────────────────────────────────────────────────

  const fetchMessages = useCallback(async (conv: KapsoConversation) => {
    setLoadingMsgs(true)
    setMessages([])
    try {
      const res = await fetch(`/api/kapso/messages?conversation_id=${conv.id}`)
      const data = await res.json()
      const msgs: KapsoMessage[] = data.messages ?? []
      setMessages(msgs.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()))
    } finally {
      setLoadingMsgs(false)
    }
  }, [])

  useEffect(() => {
    if (selected) fetchMessages(selected)
  }, [selected, fetchMessages])

  // ── Scroll to bottom ─────────────────────────────────────────────────────

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ── Send reply ───────────────────────────────────────────────────────────

  async function sendReply() {
    if (!reply.trim() || !selected || sending) return
    const text = reply.trim()
    setReply('')
    setSending(true)

    // Optimistic
    const optimistic: KapsoMessage = {
      id: `opt-${Date.now()}`,
      direction: 'outbound',
      type: 'text',
      body: text,
      status: 'sending',
      created_at: new Date().toISOString(),
    }
    setMessages(prev => [...prev, optimistic])

    try {
      await fetch('/api/kapso/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: convPhone(selected), text }),
      })
      // Refresh messages
      await fetchMessages(selected)
    } catch {
      setMessages(prev => prev.filter(m => m.id !== optimistic.id))
    } finally {
      setSending(false)
    }
  }

  // ── Filtered conversations ────────────────────────────────────────────────

  const filtered = conversations.filter(c => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      convName(c).toLowerCase().includes(q) ||
      convPhone(c).includes(q)
    )
  })

  // ── Not configured ────────────────────────────────────────────────────────

  if (!configured) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-56px)]">
        <div className="text-center max-w-sm">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-4">
            <MessageCircle size={24} className="text-amber-400" />
          </div>
          <h2 className="text-[var(--app-fg)] font-semibold mb-2">Kapso no configurado</h2>
          <p className="text-slate-400 text-sm">Agregá <span className="font-mono text-slate-300">KAPSO_API_KEY</span> y <span className="font-mono text-slate-300">KAPSO_PHONE_NUMBER_ID</span> en las variables de entorno de Railway.</p>
        </div>
      </div>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-[calc(100vh-56px)] overflow-hidden">

      {/* ── Sidebar: conversation list ───────────────────────────────────── */}
      <div className={cn(
        'flex flex-col border-r border-[var(--app-border)] bg-[var(--sidebar-bg)]',
        selected ? 'hidden md:flex md:w-72 lg:w-80 flex-shrink-0' : 'w-full md:w-72 lg:w-80 flex-shrink-0'
      )}>
        {/* Header */}
        <div className="px-4 py-3 border-b border-[var(--app-border)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageCircle size={16} className="text-emerald-400" />
            <span className="font-semibold text-[var(--app-fg)] text-sm">WhatsApp</span>
            {conversations.filter(c => convUnread(c) > 0).length > 0 && (
              <span className="w-5 h-5 rounded-full bg-emerald-500 text-white text-[10px] font-bold flex items-center justify-center">
                {conversations.filter(c => convUnread(c) > 0).length}
              </span>
            )}
          </div>
          <button onClick={fetchConversations} className="p-1.5 text-slate-400 hover:text-slate-200 transition-colors rounded-lg hover:bg-slate-700/40">
            <RefreshCw size={13} />
          </button>
        </div>

        {/* Search */}
        <div className="px-3 py-2 border-b border-[var(--app-border)]">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar contacto..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-7 pr-3 py-1.5 text-xs bg-[var(--app-bg)] border border-[var(--app-border)] rounded-lg text-[var(--app-fg)] placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex border-b border-[var(--app-border)]">
          {(['all', 'active', 'ended'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'flex-1 py-2 text-xs font-medium transition-colors',
                filter === f
                  ? 'text-emerald-400 border-b-2 border-emerald-400'
                  : 'text-slate-400 hover:text-slate-200'
              )}
            >
              {f === 'all' ? 'Todas' : f === 'active' ? 'Activas' : 'Cerradas'}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={20} className="animate-spin text-slate-500" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500">Sin conversaciones</div>
          ) : (
            filtered.map(conv => (
              <ConvItem
                key={conv.id}
                conv={conv}
                active={selected?.id === conv.id}
                onClick={() => setSelected(conv)}
              />
            ))
          )}
        </div>
      </div>

      {/* ── Main: messages ───────────────────────────────────────────────── */}
      {selected ? (
        <div className="flex-1 flex flex-col min-w-0">
          {/* Chat header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--app-border)] bg-[var(--sidebar-bg)] flex-shrink-0">
            <button
              onClick={() => setSelected(null)}
              className="md:hidden p-1.5 text-slate-400 hover:text-slate-200 -ml-1"
            >
              <ChevronRight size={16} className="rotate-180" />
            </button>
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {convInitials(selected)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[var(--app-fg)] truncate">{convName(selected)}</p>
              {convPhone(selected) && <p className="text-xs text-slate-500">+{convPhone(selected)}</p>}
            </div>
            <span className={cn(
              'text-xs px-2 py-0.5 rounded-full border',
              convStatus(selected) === 'active'
                ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20'
                : 'text-slate-400 bg-slate-400/10 border-slate-400/20'
            )}>
              {convStatus(selected) === 'active' ? 'Activa' : 'Cerrada'}
            </span>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2 bg-[var(--app-bg)]">
            {loadingMsgs ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={20} className="animate-spin text-slate-500" />
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-12 text-sm text-slate-500">Sin mensajes</div>
            ) : (
              messages.map(msg => <Bubble key={msg.id} msg={msg} />)
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Reply box */}
          <div className="flex items-end gap-2 px-4 py-3 border-t border-[var(--app-border)] bg-[var(--sidebar-bg)] flex-shrink-0">
            <textarea
              rows={1}
              placeholder="Escribir mensaje..."
              value={reply}
              onChange={e => setReply(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply() }
              }}
              className="flex-1 resize-none rounded-xl px-3 py-2 text-sm bg-[var(--app-bg)] border border-[var(--app-border)] text-[var(--app-fg)] placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 max-h-32"
              style={{ minHeight: 38 }}
            />
            <button
              onClick={sendReply}
              disabled={!reply.trim() || sending}
              className="w-9 h-9 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 flex items-center justify-center flex-shrink-0 transition-colors"
            >
              {sending ? <Loader2 size={15} className="animate-spin text-white" /> : <Send size={15} className="text-white" />}
            </button>
          </div>
        </div>
      ) : (
        /* Empty state (desktop) */
        <div className="hidden md:flex flex-1 items-center justify-center bg-[var(--app-bg)]">
          <div className="text-center">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-3">
              <MessageCircle size={24} className="text-emerald-400" />
            </div>
            <p className="text-slate-400 text-sm">Seleccioná una conversación</p>
          </div>
        </div>
      )}
    </div>
  )
}
