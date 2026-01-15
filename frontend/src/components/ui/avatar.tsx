import * as React from 'react'
import { cn } from '@/lib/utils'

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string | null
  alt?: string
  fallback?: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  gradient?: boolean
  ring?: boolean
  onClick?: () => void
}

const sizeClasses = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-16 w-16 text-lg',
}

export function Avatar({
  src,
  alt = 'Avatar',
  fallback,
  size = 'md',
  gradient = true,
  ring = false,
  onClick,
  className,
}: AvatarProps) {
  const [imageError, setImageError] = React.useState(false)
  const showImage = src && !imageError

  const initials = React.useMemo(() => {
    if (fallback) return fallback.slice(0, 2).toUpperCase()
    if (alt) return alt.slice(0, 1).toUpperCase()
    return 'U'
  }, [fallback, alt])

  const baseClasses = cn(
    'relative inline-flex items-center justify-center rounded-full overflow-hidden font-bold text-white transition-all duration-200',
    sizeClasses[size],
    gradient && !showImage && 'bg-gradient-to-r from-purple-500 to-pink-500',
    !gradient && !showImage && 'bg-white/20',
    ring && 'ring-2 ring-purple-500/50 ring-offset-2 ring-offset-background',
    onClick && 'cursor-pointer hover:scale-110 hover:shadow-lg hover:shadow-purple-500/30 focus:outline-none focus:ring-2 focus:ring-purple-500/50',
    className
  )

  const content = showImage ? (
    <img
      src={src}
      alt={alt}
      className="h-full w-full object-cover"
      onError={() => setImageError(true)}
      loading="lazy"
    />
  ) : (
    <span aria-hidden="true">{initials}</span>
  )

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={baseClasses}
        aria-label={`Voir le profil de ${alt}`}
        title={alt}
      >
        {content}
      </button>
    )
  }

  return (
    <div className={baseClasses} title={alt}>
      {content}
    </div>
  )
}

export interface AvatarGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  max?: number
  size?: 'xs' | 'sm' | 'md' | 'lg'
  children: React.ReactNode
}

export function AvatarGroup({
  max = 4,
  size = 'sm',
  children,
  className,
  ...props
}: AvatarGroupProps) {
  const childArray = React.Children.toArray(children)
  const visibleChildren = childArray.slice(0, max)
  const remainingCount = childArray.length - max

  return (
    <div
      className={cn('flex -space-x-2', className)}
      {...props}
    >
      {visibleChildren.map((child, index) => (
        <div key={index} className="relative" style={{ zIndex: max - index }}>
          {React.isValidElement(child)
            ? React.cloneElement(child as React.ReactElement<AvatarProps>, {
                size,
                className: cn(
                  'ring-2 ring-background',
                  (child as React.ReactElement<AvatarProps>).props.className
                ),
              })
            : child}
        </div>
      ))}
      {remainingCount > 0 && (
        <div
          className={cn(
            'relative inline-flex items-center justify-center rounded-full bg-white/20 text-white font-medium ring-2 ring-background',
            sizeClasses[size]
          )}
          style={{ zIndex: 0 }}
        >
          +{remainingCount}
        </div>
      )}
    </div>
  )
}
