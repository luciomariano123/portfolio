'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { User, Bell, DollarSign, Phone, CheckCircle, Plus, Trash2, Send, Loader2, MessageCircle } from 'lucide-react'

const SETTINGS_KEY   = 'app_settings_v1'
const RECIPIENTS_KEY = 'whatsapp_recipients_v1'

interface AppSettings {
  name: string
  currency: string
  fxType: string
  summaryTime: string
  notifyPrice: boolean
  notifyRSI: boolean
  notifyNews: boolean
  notifyDailySummary: boolean
}

const DEFAULT_SETTINGS: AppSettings = {
  name: 'Vicky',
  currency: 'USD',
  fxType: 'CCL',
  summaryTime: '17:30',
  notifyPrice: true,
  notifyRSI: true,
  notifyNews: false,
  notifyDailySummary: true,
}

export default function SettingsPage() {
  const [saved, setSaved]           = useState(false)
  const [settings, setSettings]     = useState<AppSettings>(DEFAULT_SETTINGS)
  const [recipients, setRecipients] = useState<string[]>([])
  const [newPhone, setNewPhone]     = useState('')
  const [sending, setSending]       = useState(false)
  const [sendResult, setSendResult] = useState<{ ok: boolean; msg: string } | null>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY)
      if (raw) setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(raw) })
    } catch {}
    try {
      const raw = localStorage.getItem(RECIPIENTS_KEY)
      if (raw) setRecipients(JSON.parse(raw))
    } catch {}
  }, [])

  function saveSettings() {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function set(key: keyof AppSettings, val: string | boolean) {
    setSettings(p => ({ ...p, [key]: val }))
  }

  function addRecipient() {
    const phone = newPhone.replace(/\D/g, '').trim()
    if (!phone || recipients.includes(phone)) return
    const updated = [...recipients, phone]
    setRecipients(updated)
    localStorage.setItem(RECIPIENTS_KEY, JSON.stringify(updated))
    setNewPhone('')
  }

  function removeRecipient(phone: string) {
    const updated = recipients.filter(p => p !== phone)
    setRecipients(updated)
    localStorage.setItem(RECIPIENTS_KEY, JSON.stringify(updated))
  }

  async function sendTestReport() {
    if (recipients.length === 0) {
      setSendResult({ ok: false, msg: 'Agregá al menos un número de WhatsApp' })
      setTimeout(() => setSendResult(null), 3000)
      return
    }
    setSending(true)
    setSendResult(null)
    try {
      const res = await fetch('/api/whatsapp/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secret: 'portfolio_cron_2026',
          recipients,
        }),
      })
      const data = await res.json()
      if (res.ok && data.ok) {
        setSendResult({ ok: true, msg: `✅ Enviado a ${data.sent} contacto${data.sent !== 1 ? 's' : ''}` })
      } else {
        setSendResult({ ok: false, msg: data.error ?? 'Error al enviar' })
      }
    } catch {
      setSendResult({ ok: false, msg: 'Error de red' })
    } finally {
      setSending(false)
      setTimeout(() => setSendResult(null), 5000)
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-[var(--app-fg)]">Configuración</h1>
        <p className="text-slate-400 text-sm mt-0.5">Preferencias de cuenta y notificaciones</p>
      </div>

      {/* Profile */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <User size={16} className="text-indigo-400" />
            <CardTitle className="text-base">Perfil</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Nombre</label>
            <input
              type="text"
              className="w-full max-w-xs rounded-lg px-3 py-2 text-sm bg-[var(--app-bg)] border border-[var(--app-border)] text-[var(--app-fg)] focus:outline-none focus:ring-1 focus:ring-indigo-500"
              value={settings.name}
              onChange={e => set('name', e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* WhatsApp Recipients */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <MessageCircle size={16} className="text-emerald-400" />
            <CardTitle className="text-base">Destinatarios WhatsApp</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-slate-400">
            Números que reciben el reporte diario. Formato internacional sin espacios, ej: <span className="text-slate-300 font-mono">5491112345678</span>
          </p>

          {/* List */}
          {recipients.length > 0 && (
            <div className="space-y-2">
              {recipients.map(phone => (
                <div key={phone} className="flex items-center justify-between bg-[var(--app-bg)] border border-[var(--app-border)] rounded-lg px-3 py-2">
                  <span className="font-mono text-sm text-slate-300">+{phone}</span>
                  <button onClick={() => removeRecipient(phone)} className="text-slate-500 hover:text-red-400 transition-colors p-1">
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add */}
          <div className="flex gap-2">
            <input
              type="tel"
              placeholder="5491112345678"
              value={newPhone}
              onChange={e => setNewPhone(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addRecipient()}
              className="flex-1 rounded-lg px-3 py-2 text-sm font-mono bg-[var(--app-bg)] border border-[var(--app-border)] text-[var(--app-fg)] placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <button
              onClick={addRecipient}
              disabled={!newPhone.trim()}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-sm px-3 py-2 rounded-lg transition-colors"
            >
              <Plus size={14} />
              Agregar
            </button>
          </div>

          {/* Test button */}
          <div className="flex items-center gap-3 pt-1 border-t border-[var(--app-border)]">
            <button
              onClick={sendTestReport}
              disabled={sending || recipients.length === 0}
              className="flex items-center gap-2 bg-[var(--card-bg)] border border-[var(--app-border)] hover:border-emerald-500/40 text-[var(--app-fg)] text-sm px-4 py-2 rounded-lg transition-all disabled:opacity-40"
            >
              {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              Enviar reporte ahora
            </button>
            {sendResult && (
              <span className={`text-sm ${sendResult.ok ? 'text-emerald-400' : 'text-red-400'}`}>
                {sendResult.msg}
              </span>
            )}
          </div>

          <div className="bg-slate-800/40 rounded-lg p-3 text-xs text-slate-400 space-y-1">
            <p className="font-medium text-slate-300">⏰ Reporte automático diario</p>
            <p>El reporte se envía automáticamente al cierre del mercado (17:30 ARG) vía cron.</p>
            <p>URL del cron: <span className="font-mono text-slate-300">/api/whatsapp/report?secret=portfolio_cron_2026</span></p>
            <p className="text-slate-500">Configurá esa URL en cron-job.org o Railway con schedule <span className="font-mono">30 20 * * 1-5</span> (UTC = 17:30 ARG)</p>
          </div>
        </CardContent>
      </Card>

      {/* Currency & FX */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <DollarSign size={16} className="text-amber-400" />
            <CardTitle className="text-base">Moneda y Tipo de Cambio</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Moneda principal</label>
              <div className="flex gap-2">
                {['USD', 'ARS'].map(c => (
                  <button
                    key={c}
                    onClick={() => set('currency', c)}
                    className={`flex-1 py-2 text-sm font-medium rounded-lg border transition-colors ${settings.currency === c ? 'bg-indigo-500 border-indigo-500 text-white' : 'bg-[var(--app-bg)] border-[var(--app-border)] text-slate-300'}`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Tipo de cambio</label>
              <div className="flex gap-1 flex-wrap">
                {['CCL', 'MEP', 'Blue', 'Oficial'].map(fx => (
                  <button
                    key={fx}
                    onClick={() => set('fxType', fx)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${settings.fxType === fx ? 'bg-indigo-500 border-indigo-500 text-white' : 'bg-[var(--app-bg)] border-[var(--app-border)] text-slate-300'}`}
                  >
                    {fx}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Bell size={16} className="text-purple-400" />
            <CardTitle className="text-base">Notificaciones</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            { key: 'notifyDailySummary' as const, label: 'Resumen diario por WhatsApp', desc: 'Recibir el resumen al cierre del mercado' },
            { key: 'notifyPrice' as const, label: 'Alertas de precio', desc: 'Notificar cuando se alcancen precios objetivo' },
            { key: 'notifyRSI' as const, label: 'Señales RSI', desc: 'Notificar sobrecompra/sobreventa' },
            { key: 'notifyNews' as const, label: 'Noticias relevantes', desc: 'Notificar noticias de tickers en cartera' },
          ].map(item => (
            <div key={item.key} className="flex items-center justify-between py-2 border-b border-[var(--app-border)] last:border-0">
              <div>
                <p className="text-sm font-medium text-[var(--app-fg)]">{item.label}</p>
                <p className="text-xs text-slate-500">{item.desc}</p>
              </div>
              <button
                onClick={() => set(item.key, !settings[item.key])}
                className={`w-11 h-6 rounded-full relative flex-shrink-0 cursor-pointer transition-colors ${settings[item.key] ? 'bg-indigo-500' : 'bg-slate-600'}`}
              >
                <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${settings[item.key] ? 'right-0.5' : 'left-0.5'}`} />
              </button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Save button */}
      <div className="flex items-center gap-3">
        <button
          onClick={saveSettings}
          className="px-6 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-medium text-sm transition-colors"
        >
          Guardar cambios
        </button>
        {saved && (
          <div className="flex items-center gap-1.5 text-emerald-400 text-sm">
            <CheckCircle size={15} />
            Guardado
          </div>
        )}
      </div>
    </div>
  )
}
