import * as React from 'react'

import { cn } from '@/lib/utils'

export function GlassCard({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'ampia-glass p-6',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
