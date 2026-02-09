import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../auth/AuthContext'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import EventsCarousel from '@/components/EventsCarousel'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { CalendarDays, Search } from 'lucide-react'
import { EventCard } from '@/components/EventCard'
import GilbertBot from '@/components/GilbertBot'

type Organizer = {
  id: number
  name: string
  email: string
}

type StoryUser = {
  id: number
  name: string
  email: string
  avatar_url?: string | null
  bio?: string | null
}

type Story = {
  id: number
  user_id: number
  image_url: string
  caption: string | null
  created_at: string
  expires_at: string
  user?: StoryUser | null
}

type Event = {
  id: number
  title: string
  description: string | null
  start_date: string
  end_date: string
  location: string | null
  cover_image: string | null
  images?: string[] | null
  status: string
  organizer_id: number
  featured?: boolean
  organizer?: Organizer | null
}

export default function HomePage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [events, setEvents] = useState<Event[]>([])
  const [stories, setStories] = useState<Story[]>([])
  const [storiesLoading, setStoriesLoading] = useState(false)
  const [favoriteIds, setFavoriteIds] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQ, setSearchQ] = useState('')
  const [searchType, setSearchType] = useState<'events' | 'users'>('events')
  const [page, setPage] = useState(0)
  const [carouselTick, setCarouselTick] = useState(0)
  const [activeStoryIndex, setActiveStoryIndex] = useState<number | null>(null)
  const pageSize = 12

  const hasPrev = page > 0
  const hasNext = events.length === pageSize

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        setLoading(true)
        setError(null)
        const offset = page * pageSize
        const res = await api.get<Event[] | { value: Event[] }>(`/api/events?limit=${pageSize}&offset=${offset}`)
        if (!cancelled) {
          const data = Array.isArray(res.data) ? res.data : (res.data?.value || [])
          setEvents(data)
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.response?.data?.message || e?.message || 'Erreur chargement')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [page])

  useEffect(() => {
    let cancelled = false

    async function loadFavorites() {
      try {
        if (!user) {
          setFavoriteIds(new Set())
          return
        }
        const res = await api.get<{ id: number }[]>('/api/favorites')
        const ids = new Set((Array.isArray(res.data) ? res.data : []).map((e) => e.id))
        if (!cancelled) setFavoriteIds(ids)
      } catch {
        if (!cancelled) setFavoriteIds(new Set())
      }
    }

    loadFavorites()

    return () => {
      cancelled = true
    }
  }, [user?.id])

  async function toggleFavorite(eventId: number) {
    if (!user) return
    const isFav = favoriteIds.has(eventId)
    setFavoriteIds((prev) => {
      const next = new Set(prev)
      if (isFav) next.delete(eventId)
      else next.add(eventId)
      return next
    })
    try {
      if (isFav) await api.delete(`/api/events/${eventId}/favorite`)
      else await api.post(`/api/events/${eventId}/favorite`)
      toast.success(isFav ? 'Retiré des favoris' : 'Ajouté aux favoris')
    } catch {
      // rollback
      setFavoriteIds((prev) => {
        const next = new Set(prev)
        if (isFav) next.add(eventId)
        else next.delete(eventId)
        return next
      })
      toast.error('Erreur favoris')
    }
  }

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [page])

  useEffect(() => {
    const timer = setInterval(() => {
      setCarouselTick((t) => t + 1)
    }, 3000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    let cancelled = false

    async function loadStories() {
      try {
        setStoriesLoading(true)
        const res = await api.get<Story[]>('/api/stories/visible?limit=30')
        if (!cancelled) setStories(Array.isArray(res.data) ? res.data : [])
      } catch {
        if (!cancelled) setStories([])
      } finally {
        if (!cancelled) setStoriesLoading(false)
      }
    }

    loadStories()
    return () => {
      cancelled = true
    }
  }, [])

  function nextPage() {
    // On avance seulement si on a potentiellement une page suivante
    if (hasNext) {
      setPage((p) => p + 1)
    }
  }

  function prevPage() {
    if (hasPrev) setPage((p) => Math.max(0, p - 1))
  }

  function submitSearch(e: React.FormEvent) {
    e.preventDefault()
    const q = searchQ.trim()
    if (!q) return
    if (searchType === 'users') {
      navigate(`/search/users?q=${encodeURIComponent(q)}`)
    } else {
      navigate(`/search/events?q=${encodeURIComponent(q)}`)
    }
  }

  if (loading) {
    return (
      <div className="space-y-8 animate-fade-in">
        <div className="space-y-4">
          <Skeleton className="h-8 w-48 bg-gradient-to-r from-white/10 to-white/5 rounded-xl" />
          <div className="flex gap-3 overflow-hidden">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex-shrink-0 w-20 space-y-2">
                <Skeleton className="h-20 w-20 rounded-full bg-gradient-to-r from-white/10 to-white/5" />
                <Skeleton className="h-3 w-full bg-gradient-to-r from-white/10 to-white/5 rounded" />
              </div>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="ampia-glass p-5 space-y-4 animate-pulse">
              <Skeleton className="h-48 w-full bg-gradient-to-r from-white/10 to-white/5 rounded-xl" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-3/4 bg-gradient-to-r from-white/10 to-white/5 rounded" />
                <Skeleton className="h-4 w-1/2 bg-gradient-to-r from-white/10 to-white/5 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="ampia-glass p-6 animate-fade-in">
        <div className="flex items-center gap-3 rounded-xl border border-red-500/30 bg-gradient-to-r from-red-500/20 to-rose-500/10 p-4 text-red-200 backdrop-blur-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/20">
            <span className="text-xl">⚠️</span>
          </div>
          <div className="flex-1">
            <div className="font-semibold">Erreur de chargement</div>
            <div className="text-sm text-red-300/80">{error}</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Bot Gilbert pour l'onboarding */}
      <GilbertBot />
      
      {/* Stories Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="section-title text-gradient mb-0 flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-purple-500/20 to-pink-500/20 backdrop-blur-sm">
              📸
            </span>
            Stories
          </h2>
          {storiesLoading && (
            <div className="flex items-center gap-2 text-sm text-white/60">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-purple-500" />
              Chargement...
            </div>
          )}
        </div>

        {stories.length === 0 ? (
          <div className="ampia-glass p-6 text-center">
            <div className="text-white/70">Aucune story active pour le moment.</div>
            <div className="mt-2 text-sm text-white/50">Les stories apparaîtront ici lorsqu'elles seront disponibles.</div>
          </div>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
            {stories.map((s, idx) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setActiveStoryIndex(idx)}
                className="group flex w-24 flex-shrink-0 flex-col items-center gap-2 transition-transform duration-200 hover:scale-105"
              >
                <div className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-2 border-transparent bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 p-0.5 transition-all duration-300 group-hover:border-white/50 group-hover:shadow-lg group-hover:shadow-purple-500/50">
                  <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-black/40 backdrop-blur-sm">
                    {s.user?.avatar_url ? (
                      <img 
                        src={s.user.avatar_url} 
                        alt={s.user.name} 
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110" 
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-purple-500/20 to-pink-500/20 text-xs font-bold text-white">
                        {s.user?.name?.slice(0, 1).toUpperCase() || 'S'}
                      </div>
                    )}
                  </div>
                </div>
                <div className="w-full truncate text-xs font-medium text-white/90 transition-colors group-hover:text-white">
                  {s.user?.name || 'User'}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-purple-600/20 via-pink-600/20 to-blue-600/20 p-8 md:p-12 backdrop-blur-xl border border-white/10">
        <div className="relative z-10 space-y-6">
          <div className="space-y-2">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight">
              Découvrez les{' '}
              <span className="text-gradient">meilleurs événements</span>
            </h1>
            <p className="text-lg md:text-xl text-white/80 max-w-2xl">
              Explorez une collection unique d'événements passionnants et connectez-vous avec votre communauté
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-4">
            {user ? (
              <Link
                to="/events/new"
                className="btn-primary inline-flex items-center gap-2 px-6 py-3 text-base"
              >
                <CalendarDays className="h-5 w-5" />
                Créer un événement
              </Link>
            ) : (
              <Link
                to="/register"
                className="btn-primary inline-flex items-center gap-2 px-6 py-3 text-base"
              >
                Rejoindre maintenant
              </Link>
            )}
            <Link
              to="/search/events"
              className="glass-input inline-flex items-center gap-2 px-6 py-3 text-base font-medium hover:bg-white/10"
            >
              <Search className="h-5 w-5" />
              Explorer
            </Link>
          </div>
        </div>
        
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 right-0 h-96 w-96 rounded-full bg-purple-500 blur-3xl" />
          <div className="absolute bottom-0 left-0 h-96 w-96 rounded-full bg-pink-500 blur-3xl" />
        </div>
      </div>

      {/* Featured Events Carousel */}
      {events.length > 0 ? (
        <div className="space-y-6">
          <EventsCarousel
            events={events}
            carouselTick={carouselTick}
            isAuthenticated={!!user}
            favoriteIds={favoriteIds}
            onToggleFavorite={toggleFavorite}
          />

          {/* Search Section */}
          <div className="ampia-glass p-6">
            <h3 className="section-title text-gradient mb-4 flex items-center gap-2">
              <Search className="h-5 w-5" />
              Recherche avancée
            </h3>
            <form onSubmit={submitSearch} className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
              <select
                value={searchType}
                onChange={(e) => setSearchType(e.target.value as any)}
                className="glass-input rounded-l-xl rounded-r-none text-sm flex-shrink-0 w-40"
              >
                <option value="events">Événements</option>
                <option value="users">Utilisateurs</option>
              </select>
              <Input
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                placeholder={searchType === 'users' ? 'Rechercher un utilisateur...' : 'Rechercher un événement...'}
                className="glass-input rounded-none border-l-0 border-r-0 flex-1 focus:z-10"
              />
              <Button type="submit" className="btn-primary rounded-l-none rounded-r-xl sm:w-auto">
                <Search className="h-4 w-4 mr-2" />
                Rechercher
              </Button>
            </form>
          </div>

          {/* Events Grid Section */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="section-title text-gradient mb-0 flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-blue-500/20 to-cyan-500/20 backdrop-blur-sm">
                  🎉
                </span>
                Événements populaires
              </h2>
              
              <div className="flex items-center gap-3">
                <div className="text-sm text-white/60">
                  Page <span className="font-semibold text-white">{page + 1}</span>
                  {!hasNext && <span className="ml-2">· Fin des résultats</span>}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={prevPage}
                    disabled={!hasPrev || loading}
                    className="rounded-xl"
                  >
                    ←
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={nextPage}
                    disabled={loading || !hasNext}
                    className="rounded-xl"
                  >
                    →
                  </Button>
                </div>
              </div>
            </div>

            {/* Events Grid */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:gap-6 md:grid-cols-2 lg:grid-cols-3">
              {events.map((ev, index) => (
                <EventCard
                  key={ev.id}
                  id={ev.id}
                  title={ev.title}
                  description={ev.description}
                  start_date={ev.start_date}
                  end_date={ev.end_date}
                  location={ev.location}
                  cover_image={ev.cover_image}
                  images={ev.images}
                  featured={ev.featured}
                  status={ev.status}
                  organizer={ev.organizer}
                  isFavorite={favoriteIds.has(ev.id)}
                  isAuthenticated={!!user}
                  onToggleFavorite={toggleFavorite}
                  carouselTick={carouselTick}
                  animationDelay={index * 50}
                />
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="ampia-glass p-12 text-center">
          <div className="text-6xl mb-4">🎭</div>
          <h3 className="text-2xl font-bold text-white mb-2">Aucun événement pour le moment</h3>
          <p className="text-white/70 mb-6">Soyez le premier à créer un événement excitant !</p>
          {user && (
            <Link
              to="/events/new"
              className="btn-primary inline-flex items-center gap-2 px-6 py-3"
            >
              <CalendarDays className="h-5 w-5" />
              Créer un événement
            </Link>
          )}
        </div>
      )}

      {/* Story Modal */}
      {activeStoryIndex !== null && stories[activeStoryIndex] ? (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in"
          onClick={() => setActiveStoryIndex(null)}
        >
          <div 
            className="ampia-glass w-full max-w-2xl p-6 text-white animate-scale-in relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
              <button
                type="button"
                onClick={() => {
                  const s = stories[activeStoryIndex]
                  const id = s?.user?.id || s?.user_id
                  if (!id) return
                  setActiveStoryIndex(null)
                  navigate(`/users/${id}`)
                }}
                className="flex items-center gap-3 group hover:opacity-80 transition-opacity"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-sm font-bold text-white shadow-lg">
                  {(stories[activeStoryIndex].user?.name || 'S').slice(0, 1).toUpperCase()}
                </div>
                <div>
                  <div className="font-semibold text-white group-hover:text-purple-300 transition-colors">
                    {stories[activeStoryIndex].user?.name || 'Story'}
                  </div>
                  <div className="text-xs text-white/60">
                    Voir le profil →
                  </div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setActiveStoryIndex(null)}
                className="icon-btn rounded-full"
                aria-label="Fermer"
              >
                ✕
              </button>
            </div>

            {/* Image */}
            <div className="relative flex min-h-[400px] max-h-[600px] items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-white/10">
              <img
                src={stories[activeStoryIndex].image_url}
                alt={stories[activeStoryIndex].caption || 'Story'}
                className="max-h-full w-full object-contain p-4"
              />
            </div>

            {/* Caption */}
            {stories[activeStoryIndex].caption && (
              <div className="mt-6 p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
                <p className="text-sm leading-relaxed text-white/90">
                  {stories[activeStoryIndex].caption}
                </p>
              </div>
            )}

            {/* Navigation */}
            <div className="mt-6 flex items-center justify-between gap-3">
              <Button
                variant="outline"
                onClick={() =>
                  setActiveStoryIndex((i) => {
                    if (i === null) return null
                    return (i - 1 + stories.length) % stories.length
                  })
                }
                className="flex-1"
              >
                ← Précédent
              </Button>
              <div className="flex gap-1">
                {stories.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveStoryIndex(idx)}
                    className={`h-2 rounded-full transition-all duration-200 ${
                      idx === activeStoryIndex
                        ? 'w-8 bg-gradient-to-r from-purple-500 to-pink-500'
                        : 'w-2 bg-white/30 hover:bg-white/50'
                    }`}
                    aria-label={`Story ${idx + 1}`}
                  />
                ))}
              </div>
              <Button
                variant="outline"
                onClick={() =>
                  setActiveStoryIndex((i) => {
                    if (i === null) return null
                    return (i + 1) % stories.length
                  })
                }
                className="flex-1"
              >
                Suivant →
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
