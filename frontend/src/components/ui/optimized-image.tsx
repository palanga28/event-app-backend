import * as React from 'react'
import { cn } from '@/lib/utils'

export interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string
  alt: string
  width?: number
  height?: number
  aspectRatio?: '1:1' | '4:3' | '16:9' | '3:2' | '2:3'
  fallback?: React.ReactNode
  showPlaceholder?: boolean
  onLoadComplete?: () => void
}

const aspectRatioClasses = {
  '1:1': 'aspect-square',
  '4:3': 'aspect-[4/3]',
  '16:9': 'aspect-video',
  '3:2': 'aspect-[3/2]',
  '2:3': 'aspect-[2/3]',
}

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  aspectRatio,
  fallback,
  showPlaceholder = true,
  onLoadComplete,
  className,
  ...props
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = React.useState(true)
  const [hasError, setHasError] = React.useState(false)

  const handleLoad = React.useCallback(() => {
    setIsLoading(false)
    onLoadComplete?.()
  }, [onLoadComplete])

  const handleError = React.useCallback(() => {
    setIsLoading(false)
    setHasError(true)
  }, [])

  if (hasError) {
    if (fallback) {
      return <>{fallback}</>
    }
    return (
      <div
        className={cn(
          'flex items-center justify-center bg-gradient-to-br from-purple-500/20 via-pink-500/20 to-blue-500/20',
          aspectRatio && aspectRatioClasses[aspectRatio],
          className
        )}
        style={{ width, height }}
        role="img"
        aria-label={alt}
      >
        <span className="text-4xl opacity-30" aria-hidden="true">🖼️</span>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'relative overflow-hidden',
        aspectRatio && aspectRatioClasses[aspectRatio]
      )}
      style={{ width, height }}
    >
      {/* Placeholder skeleton */}
      {isLoading && showPlaceholder && (
        <div
          className="absolute inset-0 bg-gradient-to-r from-white/5 via-white/10 to-white/5 animate-pulse"
          aria-hidden="true"
        />
      )}

      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        loading="lazy"
        decoding="async"
        onLoad={handleLoad}
        onError={handleError}
        className={cn(
          'h-full w-full object-cover transition-opacity duration-300',
          isLoading ? 'opacity-0' : 'opacity-100',
          className
        )}
        {...props}
      />
    </div>
  )
}

export default OptimizedImage
