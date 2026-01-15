import { Link, useNavigate } from 'react-router-dom'
import { Heart, MapPin, Calendar, Clock } from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { OptimizedImage } from '@/components/ui/optimized-image'
import { cn } from '@/lib/utils'

export interface EventCardProps {
  id: number
  title: string
  description?: string | null
  start_date: string
  end_date?: string
  location?: string | null
  cover_image?: string | null
  images?: string[] | null
  featured?: boolean
  status?: string
  organizer?: {
    id: number
    name: string
    avatar_url?: string | null
  } | null
  isFavorite?: boolean
  isAuthenticated?: boolean
  onToggleFavorite?: (eventId: number) => void
  carouselTick?: number
  className?: string
  animationDelay?: number
}

export function EventCard({
  id,
  title,
  start_date,
  location,
  cover_image,
  images,
  featured,
  organizer,
  isFavorite = false,
  isAuthenticated = false,
  onToggleFavorite,
  carouselTick = 0,
  className,
  animationDelay = 0,
}: EventCardProps) {
  const navigate = useNavigate()

  const imgs = Array.isArray(images) ? images.filter(Boolean) : []
  const heroImage = imgs.length > 0 ? imgs[carouselTick % imgs.length] : cover_image

  const formattedDate = new Date(start_date).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
  })

  const formattedTime = new Date(start_date).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <Link
      to={`/events/${id}`}
      className={cn(
        'group event-card p-0 overflow-hidden animate-slide-up block',
        className
      )}
      style={{ animationDelay: `${animationDelay}ms` }}
    >
      {/* Image Section */}
      <div className="relative overflow-hidden h-28 sm:h-36 md:h-48">
        {heroImage ? (
          <>
            <OptimizedImage
              src={heroImage}
              alt={title}
              width={400}
              height={192}
              className="transition-transform duration-700 ease-out group-hover:scale-110"
              fallback={
                <div className="h-full w-full bg-gradient-to-br from-purple-500/20 via-pink-500/20 to-blue-500/20 flex items-center justify-center">
                  <span className="text-6xl opacity-30" aria-hidden="true">🎉</span>
                </div>
              }
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
          </>
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-purple-500/20 via-pink-500/20 to-blue-500/20 flex items-center justify-center">
            <span className="text-6xl opacity-30" aria-hidden="true">🎉</span>
          </div>
        )}

        {/* Featured Badge */}
        {featured && (
          <div className="absolute top-1.5 left-1.5 sm:top-3 sm:left-3">
            <Badge variant="featured" icon="⭐" className="text-[10px] sm:text-xs px-1.5 py-0.5 sm:px-2 sm:py-1">
              <span className="hidden sm:inline">Featured</span>
              <span className="sm:hidden">⭐</span>
            </Badge>
          </div>
        )}

        {/* Favorite Button */}
        {isAuthenticated && onToggleFavorite && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onToggleFavorite(id)
            }}
            className={cn(
              'absolute top-1.5 right-1.5 sm:top-3 sm:right-3 z-10 flex h-7 w-7 sm:h-9 sm:w-9 items-center justify-center rounded-full backdrop-blur-md transition-all duration-200',
              isFavorite
                ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-lg shadow-pink-500/50'
                : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white border border-white/20'
            )}
            aria-label={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
            aria-pressed={isFavorite}
          >
            <Heart className={cn('h-3.5 w-3.5 sm:h-4 sm:w-4 transition-all duration-200', isFavorite && 'fill-current scale-110 animate-heart-beat')} />
          </button>
        )}
      </div>

      {/* Content Section */}
      <div className="p-2.5 sm:p-3 md:p-5 space-y-1.5 sm:space-y-2 md:space-y-3">
        <div className="space-y-1 sm:space-y-2">
          <h3 className="text-sm sm:text-base md:text-xl font-bold text-white line-clamp-2 group-hover:text-purple-300 transition-colors duration-200">
            {title}
          </h3>

          {location && (
            <div className="hidden sm:flex items-center gap-2 text-xs sm:text-sm text-white/70">
              <MapPin className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0 text-purple-400" aria-hidden="true" />
              <span className="line-clamp-1">{location}</span>
            </div>
          )}
        </div>

        {/* Date & Time */}
        <div className="flex items-center gap-2 sm:gap-4 text-[10px] sm:text-xs text-white/60">
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-blue-400" aria-hidden="true" />
            <span>{formattedDate}</span>
          </div>
          <div className="hidden sm:flex items-center gap-1">
            <Clock className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-green-400" aria-hidden="true" />
            <span>{formattedTime}</span>
          </div>
        </div>

        {/* Organizer - Hidden on mobile for compact view */}
        {organizer && (
          <div className="hidden sm:flex items-center justify-between pt-2 sm:pt-3 border-t border-white/10">
            <div className="flex items-center gap-2">
              <Avatar
                src={organizer.avatar_url}
                alt={organizer.name}
                fallback={organizer.name}
                size="sm"
                onClick={() => {
                  navigate(`/users/${organizer.id}`)
                }}
              />
              <div className="text-xs text-white/70">
                <div className="font-medium text-white/90">{organizer.name}</div>
                <div className="text-white/50">Organisateur</div>
              </div>
            </div>
            <span className="text-xs text-white/50 group-hover:text-purple-400 transition-colors flex items-center gap-1">
              Voir plus
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </span>
          </div>
        )}
      </div>
    </Link>
  )
}

export default EventCard
