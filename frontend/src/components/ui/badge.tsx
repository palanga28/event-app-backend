import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all duration-200',
  {
    variants: {
      variant: {
        default:
          'border border-white/20 bg-white/10 text-white/90 backdrop-blur-sm',
        gradient:
          'border border-purple-500/30 bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-200 backdrop-blur-sm',
        success:
          'border border-green-500/30 bg-green-500/20 text-green-200',
        warning:
          'border border-amber-500/30 bg-amber-500/20 text-amber-200',
        danger:
          'border border-red-500/30 bg-red-500/20 text-red-200',
        info:
          'border border-blue-500/30 bg-blue-500/20 text-blue-200',
        featured:
          'border border-yellow-500/30 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 text-yellow-200',
        outline:
          'border border-white/30 bg-transparent text-white/80 hover:bg-white/10',
      },
      size: {
        sm: 'px-2 py-0.5 text-[10px]',
        md: 'px-3 py-1 text-xs',
        lg: 'px-4 py-1.5 text-sm',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  icon?: React.ReactNode
  removable?: boolean
  onRemove?: () => void
}

export function Badge({
  className,
  variant,
  size,
  icon,
  removable,
  onRemove,
  children,
  ...props
}: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant, size }), className)} {...props}>
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {children}
      {removable && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onRemove?.()
          }}
          className="ml-1 flex h-4 w-4 items-center justify-center rounded-full hover:bg-white/20 transition-colors"
          aria-label="Retirer"
        >
          <svg
            className="h-3 w-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </span>
  )
}

export { badgeVariants }
