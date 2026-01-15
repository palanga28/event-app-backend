import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Calendar, Plus, Clock, MapPin, Star, CheckCircle, Loader } from 'lucide-react'

type Event = {
  id: number
  title: string
  description: string | null
  start_date: string
  end_date: string
  location: string | null
  status: string
  organizer_id: number
  featured?: boolean
  carousel_requested?: boolean
}

export default function MyEventsPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(0)
  const [requestingId, setRequestingId] = useState<number | null>(null)
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
        const res = await api.get<Event[] | { value: Event[] }>(`/api/events/mine?limit=${pageSize}&offset=${offset}`)
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
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [page])

  function nextPage() {
    if (hasNext) {
      setPage((p) => p + 1)
    }
  }

  function prevPage() {
    if (hasPrev) setPage((p) => Math.max(0, p - 1))
  }

  async function requestCarousel(ev: Event) {
    if (ev.featured) return
    if (ev.carousel_requested) return
    setRequestingId(ev.id)
    try {
      await api.post(`/api/events/${ev.id}/request-carousel`)
      setEvents((prev) => prev.map((e) => (e.id === ev.id ? { ...e, carousel_requested: true } : e)))
      toast.success('Demande envoyée')
    } catch (e: any) {
      toast.error(e?.response?.data?.message || e?.message || 'Erreur demande carrousel')
    } finally {
      setRequestingId(null)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48 bg-white/10" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
              <Skeleton className="h-4 w-3/4 bg-white/10" />
              <Skeleton className="mt-2 h-3 w-1/2 bg-white/10" />
              <Skeleton className="mt-3 h-3 w-2/3 bg-white/10" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
        {error}
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-purple-500/20 to-pink-500/20 backdrop-blur-sm">
            <Calendar className="h-6 w-6 text-purple-300" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">Mes événements</h1>
            <p className="text-sm text-white/60 mt-1">
              Gérez vos événements créés ({events.length} total)
            </p>
          </div>
        </div>
        <Link to="/events/new" className="btn-primary inline-flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Créer un événement
        </Link>
      </div>

      {/* Pagination */}
      {events.length > 0 && (
        <div className="flex items-center justify-between ampia-glass p-4">
          <div className="text-sm text-white/70">
            Page <span className="font-semibold text-white">{page + 1}</span>
            {!hasNext && <span className="ml-2">· Fin des résultats</span>}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={prevPage}
              disabled={!hasPrev || loading}
            >
              ← Précédent
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={nextPage}
              disabled={loading || !hasNext}
            >
              Suivant →
            </Button>
          </div>
        </div>
      )}

      {/* Events Grid */}
      {events.length === 0 ? (
        <div className="ampia-glass p-12 text-center">
          <div className="text-6xl mb-4">🎭</div>
          <h3 className="text-xl font-semibold text-white mb-2">Aucun événement créé</h3>
          <p className="text-white/70 mb-6">Commencez par créer votre premier événement !</p>
          <Link to="/events/new" className="btn-primary inline-flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Créer mon premier événement
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:gap-6 lg:grid-cols-3">
          {events.map((ev) => (
            <div
              key={ev.id}
              className="group event-card p-0 overflow-hidden animate-slide-up"
              style={{ animationDelay: `${events.indexOf(ev) * 50}ms` }}
            >
              {/* Status Badge */}
              <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
                {ev.featured ? (
                  <span className="badge-gradient inline-flex items-center gap-1">
                    <Star className="h-3 w-3 fill-current" />
                    <span>Carrousel</span>
                  </span>
                ) : ev.carousel_requested ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-blue-500/30 bg-blue-500/20 px-3 py-1 text-xs font-medium text-blue-200 backdrop-blur-sm">
                    <Loader className="h-3 w-3 animate-spin" />
                    <span>Demandé</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-white/70 backdrop-blur-sm">
                    <span className="capitalize">{ev.status}</span>
                  </span>
                )}
              </div>

              {/* Content */}
              <div className="p-6 space-y-4">
                <div>
                  <Link
                    to={`/events/${ev.id}`}
                    className="text-xl font-bold text-white line-clamp-2 group-hover:text-purple-300 transition-colors duration-200"
                  >
                    {ev.title}
                  </Link>
                </div>

                {ev.location && (
                  <div className="flex items-center gap-2 text-sm text-white/70">
                    <MapPin className="h-4 w-4 text-purple-400" />
                    <span className="line-clamp-1">{ev.location}</span>
                  </div>
                )}

                <div className="flex items-center gap-2 text-xs text-white/60">
                  <Clock className="h-3 w-3" />
                  <span>{new Date(ev.start_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit' })}</span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-4 border-t border-white/10">
                  <Link
                    to={`/events/${ev.id}`}
                    className="flex-1 glass-input text-center text-sm font-medium hover:bg-white/10 transition-colors"
                  >
                    Voir détails
                  </Link>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!!ev.featured || !!ev.carousel_requested || requestingId === ev.id}
                    onClick={() => requestCarousel(ev)}
                    className="flex-shrink-0"
                  >
                    {requestingId === ev.id ? (
                      <>
                        <Loader className="h-4 w-4 animate-spin" />
                        Envoi...
                      </>
                    ) : ev.featured ? (
                      <>
                        <CheckCircle className="h-4 w-4" />
                        En carrousel
                      </>
                    ) : ev.carousel_requested ? (
                      <>
                        <Loader className="h-4 w-4" />
                        Demandé
                      </>
                    ) : (
                      <>
                        <Star className="h-4 w-4" />
                        Carrousel
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
