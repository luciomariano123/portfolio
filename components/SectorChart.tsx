'use client'

import { useMemo } from 'react'
import { PieChart, Pie, Cell, Tooltip } from 'recharts'
import { SECTOR_COLORS } from '@/lib/portfolio-data'
import { EditablePosition } from '@/lib/positions-store'
import { PriceData } from '@/hooks/usePrices'
import { formatCurrency } from '@/lib/utils'

interface SectorChartProps {
  prices: Record<string, PriceData>
  positions: EditablePosition[]
}

export function SectorChart({ prices, positions }: SectorChartProps) {
  const sectorData = useMemo(() => {
    const sectorMap: Record<string, number> = {}

    for (const pos of positions) {
      const priceData = prices[pos.tickerYF]
      if (!priceData) continue

      const adrEquiv = pos.quantity / pos.ratio
      const value = adrEquiv * priceData.price

      sectorMap[pos.sector] = (sectorMap[pos.sector] ?? 0) + value
    }

    const total = Object.values(sectorMap).reduce((a, b) => a + b, 0)
    return Object.entries(sectorMap)
      .map(([sector, value]) => ({
        sector,
        value,
        pct: total > 0 ? (value / total) * 100 : 0,
        color: SECTOR_COLORS[sector] ?? '#64748b',
      }))
      .sort((a, b) => b.value - a.value)
  }, [positions, prices])

  const total = sectorData.reduce((s, d) => s + d.value, 0)

  if (sectorData.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-500 text-sm">
        Cargando datos...
      </div>
    )
  }

  return (
    <div className="flex flex-col sm:flex-row gap-4 items-center">
      <div className="flex-shrink-0">
        <PieChart width={192} height={192}>
          <Pie
            data={sectorData}
            cx={96}
            cy={96}
            innerRadius={55}
            outerRadius={80}
            paddingAngle={2}
            dataKey="value"
          >
            {sectorData.map((entry) => (
              <Cell key={entry.sector} fill={entry.color} stroke="transparent" />
            ))}
          </Pie>
          <Tooltip
            formatter={(val) => formatCurrency(Number(val))}
            contentStyle={{ background: '#1e293b', border: '1px solid #475569', borderRadius: 8 }}
            labelStyle={{ color: '#94a3b8' }}
            itemStyle={{ color: '#e2e8f0' }}
          />
        </PieChart>
      </div>

      <div className="flex-1 space-y-2 w-full">
        {sectorData.map((d) => (
          <div key={d.sector} className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.color }} />
            <span className="text-sm text-slate-300 flex-1">{d.sector}</span>
            <span className="text-xs text-slate-400 font-mono w-16 text-right">
              {d.pct.toFixed(1)}%
            </span>
            <div className="w-24 h-1.5 bg-slate-700 rounded-full">
              <div
                className="h-full rounded-full"
                style={{ width: `${d.pct}%`, background: d.color }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
