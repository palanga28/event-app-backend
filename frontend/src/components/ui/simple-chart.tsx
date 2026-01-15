import * as React from 'react'
import { cn } from '@/lib/utils'

export interface ChartDataPoint {
  label: string
  value: number
  date?: string
}

export interface SimpleBarChartProps {
  data: ChartDataPoint[]
  height?: number
  barColor?: string
  showLabels?: boolean
  showValues?: boolean
  className?: string
}

export function SimpleBarChart({
  data,
  height = 120,
  barColor = 'from-purple-500 to-pink-500',
  showLabels = true,
  showValues = false,
  className,
}: SimpleBarChartProps) {
  const maxValue = Math.max(...data.map(d => d.value), 1)

  return (
    <div className={cn('w-full', className)}>
      <div className="flex items-end gap-1" style={{ height }}>
        {data.map((point, index) => {
          const heightPercent = (point.value / maxValue) * 100
          return (
            <div
              key={`bar-${index}-${point.label}`}
              className="flex-1 flex flex-col items-center justify-end group"
            >
              {showValues && point.value > 0 && (
                <span className="text-[10px] text-white/60 mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {point.value}
                </span>
              )}
              <div
                className={cn(
                  'w-full rounded-t-sm bg-gradient-to-t transition-all duration-300 hover:opacity-80',
                  barColor
                )}
                style={{ 
                  height: `${Math.max(heightPercent, 2)}%`,
                  minHeight: point.value > 0 ? '4px' : '2px',
                }}
                title={`${point.label}: ${point.value}`}
              />
            </div>
          )
        })}
      </div>
      {showLabels && (
        <div className="flex gap-1 mt-2">
          {data.map((point, index) => (
            <div key={`label-${index}-${point.label}`} className="flex-1 text-center">
              <span className="text-[9px] text-white/40 truncate block">
                {point.label}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export interface SimpleLineChartProps {
  data: ChartDataPoint[]
  height?: number
  lineColor?: string
  fillColor?: string
  showDots?: boolean
  showLabels?: boolean
  className?: string
}

export function SimpleLineChart({
  data,
  height = 120,
  lineColor = 'stroke-purple-400',
  fillColor = 'fill-purple-500/20',
  showDots = true,
  showLabels = true,
  className,
}: SimpleLineChartProps) {
  const maxValue = Math.max(...data.map(d => d.value), 1)
  const padding = 10

  const points = data.map((point, index) => {
    const x = padding + (index / (data.length - 1 || 1)) * (100 - padding * 2)
    const y = height - padding - ((point.value / maxValue) * (height - padding * 2))
    return { x, y, ...point }
  })

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  const areaPath = `${linePath} L ${points[points.length - 1]?.x || 0} ${height - padding} L ${padding} ${height - padding} Z`

  return (
    <div className={cn('w-full', className)}>
      <svg width="100%" height={height} viewBox={`0 0 100 ${height}`} preserveAspectRatio="none">
        <path d={areaPath} className={fillColor} />
        <path d={linePath} className={cn(lineColor, 'fill-none')} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {showDots && points.map((p, i) => (
          <circle
            key={`dot-${i}-${p.value}`}
            cx={p.x}
            cy={p.y}
            r="3"
            className="fill-purple-400 stroke-background stroke-2"
          />
        ))}
      </svg>
      {showLabels && data.length <= 10 && (
        <div className="flex justify-between mt-1 px-2">
          {data.map((point, index) => (
            <span key={`line-label-${index}-${point.label}`} className="text-[9px] text-white/40">
              {point.label}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

export interface StatCardWithChartProps {
  title: string
  value: string | number
  subtitle?: string
  data: ChartDataPoint[]
  chartType?: 'bar' | 'line'
  icon?: React.ReactNode
  gradient?: string
  className?: string
}

export function StatCardWithChart({
  title,
  value,
  subtitle,
  data,
  chartType = 'bar',
  icon,
  gradient = 'from-purple-500/20 to-pink-500/20',
  className,
}: StatCardWithChartProps) {
  return (
    <div className={cn('ampia-glass p-5 space-y-4', className)}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="text-xs font-medium text-white/60 uppercase tracking-wide">
            {title}
          </div>
          <div className="text-2xl font-bold text-white">{value}</div>
          {subtitle && (
            <div className="text-xs text-white/50">{subtitle}</div>
          )}
        </div>
        {icon && (
          <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-r backdrop-blur-sm', gradient)}>
            {icon}
          </div>
        )}
      </div>
      <div className="pt-2 border-t border-white/10">
        {chartType === 'bar' ? (
          <SimpleBarChart data={data} height={60} showLabels={false} />
        ) : (
          <SimpleLineChart data={data} height={60} showLabels={false} showDots={false} />
        )}
      </div>
    </div>
  )
}
