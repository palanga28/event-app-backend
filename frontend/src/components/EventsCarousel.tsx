import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Heart } from 'lucide-react'

import { IconButton } from '@/components/IconButton'

export type CarouselEvent = {
  id: number
  title: string
  start_date: string
  end_date: string
  location: string | null
  cover_image: string | null
  images?: string[] | null
  featured?: boolean
  organizer?: { id: number; name: string } | null
}

type Props = {
  events: CarouselEvent[]
  carouselTick: number
  isAuthenticated: boolean
  favoriteIds: Set<number>
  onToggleFavorite: (eventId: number) => void
}

export default function EventsCarousel({ events, carouselTick, isAuthenticated, favoriteIds, onToggleFavorite }: Props) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const navigate = useNavigate()

  const items = useMemo(() => {
    return events.filter((e) => !!e.featured)
  }, [events])

  useEffect(() => {
    setActiveIndex(0)
  }, [items.length])

  useEffect(() => {
    if (isPaused) return
    if (items.length <= 1) return

    const t = window.setInterval(() => {
      setActiveIndex((i) => {
        const next = (i + 1) % items.length
        return next
      })
    }, 5000)

    return () => window.clearInterval(t)
  }, [isPaused, items.length])

  if (items.length === 0) {
    return (
      <div className="ampia-glass p-8 text-center">
        <div className="text-5xl mb-4">⭐</div>
        <h3 className="text-lg font-semibold text-white mb-2">Aucun événement en vedette</h3>
        <p className="text-sm text-white/70">
          Les événements vedettes apparaîtront ici après validation par un administrateur.
        </p>
      </div>
    )
  }

  return (
    <div
      className="relative ampia-glass overflow-hidden"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocusCapture={() => setIsPaused(true)}
      onBlurCapture={() => setIsPaused(false)}
    >
      {/* Header */}
      <div className="absolute top-6 left-6 right-6 z-20 flex items-center justify-between">
        <div className="ampia-glass px-4 py-2 backdrop-blur-xl">
          <div className="flex items-center gap-2">
            <span className="text-2xl">⭐</span>
            <div>
              <div className="text-sm font-bold text-white">Événements vedettes</div>
              <div className="text-xs text-white/60">{activeIndex + 1} / {items.length}</div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <IconButton
            type="button"
            aria-label="Précédent"
            onClick={() => {
              const prev = (activeIndex - 1 + items.length) % items.length
              setActiveIndex(prev)
            }}
            disabled={items.length <= 1}
            className="ampia-glass backdrop-blur-xl"
          >
            <ChevronLeft className="h-5 w-5 text-white" />
          </IconButton>
          <IconButton
            type="button"
            aria-label="Suivant"
            onClick={() => {
              const next = (activeIndex + 1) % items.length
              setActiveIndex(next)
            }}
            disabled={items.length <= 1}
            className="ampia-glass backdrop-blur-xl"
          >
            <ChevronRight className="h-5 w-5 text-white" />
          </IconButton>
        </div>
      </div>

      {/* Carousel */}
      <div className="relative h-[500px] overflow-hidden rounded-2xl">
        <div
          className="flex h-full transition-transform duration-700 ease-in-out"
          style={{ transform: `translateX(-${activeIndex * 100}%)` }}
        >
          {items.map((ev, idx) => {
            const imgs = Array.isArray(ev.images) ? ev.images.filter(Boolean) : []
            const hero = imgs.length > 0 ? imgs[(carouselTick + idx) % imgs.length] : ev.cover_image
            const isFav = favoriteIds.has(ev.id)
            
            return (
              <Link
                key={ev.id}
                to={`/events/${ev.id}`}
                className="group relative flex h-full w-full flex-none flex-col overflow-hidden"
              >
                {/* Background Image */}
                {hero ? (
                  <div className="absolute inset-0">
                    <img
                      src={hero}
                      alt={ev.title}
                      className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/30" />
                  </div>
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-600/30 via-pink-600/30 to-blue-600/30" />
                )}

                {/* Content */}
                <div className="relative z-10 flex h-full flex-col justify-end p-8 text-white">
                  <div className="space-y-4">
                    {/* Title & Favorite */}
                    <div className="flex items-start justify-between gap-4">
                      <h3 className="text-3xl md:text-4xl font-bold leading-tight group-hover:text-purple-300 transition-colors duration-200">
                        {ev.title}
                      </h3>
                      {isAuthenticated && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            onToggleFavorite(ev.id)
                          }}
                          className={`flex-shrink-0 flex h-12 w-12 items-center justify-center rounded-full backdrop-blur-md transition-all duration-200 ${
                            isFav
                              ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-lg shadow-pink-500/50'
                              : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white border border-white/20'
                          }`}
                          aria-label={isFav ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                        >
                          <Heart className={`h-5 w-5 ${isFav ? 'fill-current' : ''}`} />
                        </button>
                      )}
                    </div>

                    {/* Location */}
                    {ev.location && (
                      <div className="flex items-center gap-2 text-lg text-white/90">
                        <span>📍</span>
                        <span>{ev.location}</span>
                      </div>
                    )}

                    {/* Date */}
                    <div className="flex items-center gap-2 text-sm text-white/80">
                      <span>📅</span>
                      <span>
                        {new Date(ev.start_date).toLocaleDateString('fr-FR', { 
                          day: 'numeric', 
                          month: 'long',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>

                    {/* Organizer */}
                    {ev.organizer && (
                      <div className="flex items-center gap-3 pt-2 border-t border-white/20">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            navigate(`/users/${ev.organizer!.id}`)
                          }}
                          className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-sm font-bold text-white shadow-lg transition-transform duration-200 hover:scale-110"
                          aria-label={`Voir le profil de ${ev.organizer.name}`}
                          title={ev.organizer.name}
                        >
                          {(ev.organizer.name || 'U').slice(0, 1).toUpperCase()}
                        </button>
                        <div>
                          <div className="font-medium text-white">{ev.organizer.name}</div>
                          <div className="text-xs text-white/60">Organisateur</div>
                        </div>
                      </div>
                    )}

                    {/* CTA */}
                    <div className="flex items-center gap-3 pt-4">
                      <span className="badge-gradient">
                        ⭐ Événement vedette
                      </span>
                      <span className="text-sm text-white/70 group-hover:text-purple-300 transition-colors">
                        En savoir plus →
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Indicators */}
      {items.length > 1 && (
        <div className="absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 gap-2">
          {items.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setActiveIndex(idx)}
              className={`h-2 rounded-full transition-all duration-300 ${
                idx === activeIndex
                  ? 'w-8 bg-gradient-to-r from-purple-500 to-pink-500'
                  : 'w-2 bg-white/30 hover:bg-white/50'
              }`}
              aria-label={`Aller à l'événement ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
