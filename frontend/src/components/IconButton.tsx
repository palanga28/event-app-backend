import * as React from 'react'

import { cn } from '@/lib/utils'
import { Button, type ButtonProps } from '@/components/ui/button'

export type IconButtonProps = ButtonProps & {
  badge?: React.ReactNode
}

export function IconButton({ className, badge, children, ...props }: IconButtonProps) {
  return (
    <Button
      size="icon"
      variant="outline"
      className={cn(
        'relative border-red-500/20 bg-black/40 text-white/90 shadow-none hover:bg-black/60 hover:text-white focus-visible:ring-ring/40',
        className
      )}
      {...props}
    >
      {children}
      {badge}
    </Button>
  )
}
