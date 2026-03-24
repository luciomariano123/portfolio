'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { User, Bell, DollarSign, Phone, Clock, CheckCircle } from 'lucide-react'

export default function SettingsPage() {
  const [saved, setSaved] = useState(false)
  const [settings, setSettings] = useState({
    name: 'Vicky',
    email: 'vicky@ejemplo.com',
    whatsapp: '+54 9 11 XXXX-XXXX',
    currency: 'USD',
    fxType: 'CCL',
    summaryTime: '17:30',
    notifyPrice: true,
    notifyRSI: true,
    notifyNews: false,
    notifyDailySummary: true,
    darkMode: true,
  })

  function save() {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function set(key: keyof typeof settings, val: string | boolean) {
    setSettings(p => ({ ...p, [key]: val }))
  }

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Configuración</h1>
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
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Nombre</label>
              <input
                type="text"
                className="w-full rounded-lg px-3 py-2 text-sm bg-slate-700 border border-slate-600 text-slate-100 focus:outline-none focus:border-indigo-500"
                value={settings.name}
                onChange={e => set('name', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Email</label>
              <input
                type="email"
                className="w-full rounded-lg px-3 py-2 text-sm bg-slate-700 border border-slate-600 text-slate-100 focus:outline-none focus:border-indigo-500"
                value={settings.email}
                onChange={e => set('email', e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* WhatsApp */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Phone size={16} className="text-emerald-400" />
            <CardTitle className="text-base">WhatsApp Business</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Número de WhatsApp</label>
            <input
              type="text"
              className="w-full rounded-lg px-3 py-2 text-sm bg-slate-700 border border-slate-600 text-slate-100 focus:outline-none focus:border-indigo-500"
              value={settings.whatsapp}
              onChange={e => set('whatsapp', e.target.value)}
              placeholder="+54 9 11 XXXX-XXXX"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Hora del resumen diario</label>
            <input
              type="time"
              className="w-40 rounded-lg px-3 py-2 text-sm bg-slate-700 border border-slate-600 text-slate-100 focus:outline-none focus:border-indigo-500"
              value={settings.summaryTime}
              onChange={e => set('summaryTime', e.target.value)}
            />
            <p className="text-xs text-slate-500 mt-1">Horario de Argentina (GMT-3)</p>
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
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Moneda principal</label>
              <div className="flex gap-2">
                {['USD', 'ARS'].map(c => (
                  <button
                    key={c}
                    onClick={() => set('currency', c)}
                    className={`flex-1 py-2 text-sm font-medium rounded-lg border transition-colors ${settings.currency === c ? 'bg-indigo-500 border-indigo-500 text-white' : 'bg-slate-700 border-slate-600 text-slate-300'}`}
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
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${settings.fxType === fx ? 'bg-indigo-500 border-indigo-500 text-white' : 'bg-slate-700 border-slate-600 text-slate-300'}`}
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
            <div key={item.key} className="flex items-center justify-between py-2 border-b border-slate-700/40 last:border-0">
              <div>
                <p className="text-sm font-medium text-slate-200">{item.label}</p>
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
          onClick={save}
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
