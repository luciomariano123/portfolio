'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  EditablePosition,
  loadPositions,
  savePositions,
  loadArsPrices,
  saveArsPrices,
  mergeAccounts,
} from '@/lib/positions-store'
import { recordChange } from '@/lib/changes-store'

export function usePositions() {
  const [positions, setPositions] = useState<EditablePosition[]>([])
  const [arsPrices, setArsPrices] = useState<Record<string, number>>({})
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // Migration v3 → v4: seed changes store with boleto purchases (08/04/2026)
    if (typeof window !== 'undefined') {
      const hadV3 = !!localStorage.getItem('cedear_positions_v3')
      const hasV4 = !!localStorage.getItem('cedear_positions_v4')
      if (hadV3 && !hasV4) {
        recordChange({ type: 'add',    ticker: 'AAPL', name: 'Apple',        account: 'Lucio', quantityAfter: 766,  ppcAfter: 12.82 })
        recordChange({ type: 'update', ticker: 'SPY',  name: 'S&P 500 ETF',  account: 'Lucio', quantityBefore: 96,  quantityAfter: 673,  ppcBefore: 33.72, ppcAfter: 34.02 })
        recordChange({ type: 'add',    ticker: 'NU',   name: 'Nu Holdings',  account: 'Lucio', quantityAfter: 675,  ppcAfter: 7.28 })
        recordChange({ type: 'update', ticker: 'MSFT', name: 'Microsoft',    account: 'Lucio', quantityBefore: 760, quantityAfter: 1144, ppcBefore: 15.24, ppcAfter: 12.77 })
        recordChange({ type: 'update', ticker: 'META', name: 'Meta Platforms',account: 'Lucio', quantityBefore: 311, quantityAfter: 510,  ppcBefore: 29.01, ppcAfter: 24.60 })
        recordChange({ type: 'update', ticker: 'TSLA', name: 'Tesla',        account: 'Lucio', quantityBefore: 183, quantityAfter: 760,  ppcBefore: 26.77, ppcAfter: 23.53 })
      }
    }
    setPositions(loadPositions())
    setArsPrices(loadArsPrices())
    setMounted(true)
  }, [])

  const updatePosition = useCallback((ticker: string, account: string, updates: Partial<EditablePosition>) => {
    setPositions(prev => {
      const existing = prev.find(p => p.ticker === ticker && p.account === account)
      if (existing) {
        recordChange({
          type: 'update',
          ticker: existing.ticker,
          name: existing.name,
          account: existing.account as 'Lucio' | 'Agro',
          quantityBefore: existing.quantity,
          quantityAfter: updates.quantity ?? existing.quantity,
          ppcBefore: existing.ppc,
          ppcAfter: updates.ppc ?? existing.ppc,
        })
      }
      const next = prev.map(p =>
        p.ticker === ticker && p.account === account ? { ...p, ...updates } : p
      )
      savePositions(next)
      return next
    })
  }, [])

  const addPosition = useCallback((pos: EditablePosition) => {
    setPositions(prev => {
      // Check for existing same ticker+account
      const idx = prev.findIndex(p => p.ticker === pos.ticker && p.account === pos.account)
      let next: EditablePosition[]
      if (idx >= 0) {
        // Merge: weighted average PPC
        const existing = prev[idx]
        const totalQty = existing.quantity + pos.quantity
        const existingCost = (existing.quantity / existing.ratio) * existing.ppc
        const newCost = (pos.quantity / pos.ratio) * pos.ppc
        const newPpc = totalQty > 0 ? ((existingCost + newCost) / (totalQty / existing.ratio)) : existing.ppc
        recordChange({
          type: 'update',
          ticker: existing.ticker,
          name: existing.name,
          account: existing.account as 'Lucio' | 'Agro',
          quantityBefore: existing.quantity,
          quantityAfter: totalQty,
          ppcBefore: existing.ppc,
          ppcAfter: newPpc,
        })
        next = prev.map((p, i) => i === idx ? {
          ...existing,
          quantity: totalQty,
          ppc: newPpc,
        } : p)
      } else {
        recordChange({
          type: 'add',
          ticker: pos.ticker,
          name: pos.name,
          account: pos.account as 'Lucio' | 'Agro',
          quantityAfter: pos.quantity,
          ppcAfter: pos.ppc,
        })
        next = [...prev, pos]
      }
      savePositions(next)
      return next
    })
  }, [])

  const removePosition = useCallback((ticker: string, account: string) => {
    setPositions(prev => {
      const target = prev.find(p => p.ticker === ticker && p.account === account)
      if (target) {
        recordChange({
          type: 'remove',
          ticker: target.ticker,
          name: target.name,
          account: target.account as 'Lucio' | 'Agro',
          quantityBefore: target.quantity,
          ppcBefore: target.ppc,
        })
      }
      const next = prev.filter(p => !(p.ticker === ticker && p.account === account))
      savePositions(next)
      return next
    })
  }, [])

  const updateArsPrice = useCallback((ticker: string, price: number) => {
    setArsPrices(prev => {
      const next = { ...prev, [ticker]: price }
      saveArsPrices(next)
      return next
    })
  }, [])

  const resetToDefaults = useCallback(() => {
    const defaults = loadPositions()
    // Force reload defaults by clearing storage
    if (typeof window !== 'undefined') localStorage.removeItem('cedear_positions_v1')
    const fresh = loadPositions()
    setPositions(fresh)
    savePositions(fresh)
  }, [])

  // Consolidated view (merge Lucio+Agro for same ticker)
  const consolidated = mergeAccounts(positions)

  return {
    positions,        // All positions (Lucio + Agro separate)
    consolidated,     // Merged by ticker
    arsPrices,
    mounted,
    addPosition,
    updatePosition,
    removePosition,
    updateArsPrice,
    resetToDefaults,
  }
}
