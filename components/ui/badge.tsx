import * as React from "react"
import { cn } from "@/lib/utils"

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'positive' | 'negative' | 'neutral' | 'outline'
}

function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors",
        {
          default: "bg-slate-700 text-slate-300",
          positive: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20",
          negative: "bg-red-500/15 text-red-400 border border-red-500/20",
          neutral: "bg-slate-500/15 text-slate-400 border border-slate-500/20",
          outline: "border border-slate-600 text-slate-300",
        }[variant],
        className
      )}
      {...props}
    />
  )
}

export { Badge }
