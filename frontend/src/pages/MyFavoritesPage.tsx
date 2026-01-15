import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Heart, MapPin, Calendar, Clock, Trash2, ExternalLink } from 'lucide-react'

type Event = {
  id: number
  title: string
  start_date: string
  end_date: string
  location: string | null
  cover_image: string | null
  images?: string[] | null
  featured?: boolean
}

export default function MyFavoritesPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [removeDialogOpen, setRemoveDialogOpen] = useState(false)
  const [pendingRemoveId, setPendingRemoveId] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        setLoading(true)
        setError(null)
        const res = await api.get<Event[] | { value: Event[] }>('/api/favorites')
        if (!cancelled) {
          const data = Array.isArray(res.data) ? res.data : (res.data?.value || [])
          setEvents(data)
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.response?.data?.message || e?.message || 'Erreur chargement')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [])

  async function removeFavorite(eventId: number) {
    try {
      await api.delete(`/api/events/${eventId}/favorite`)
      setEvents((prev) => prev.filter((e) => e.id !== eventId))
      toast.success('Retiré des favoris')
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Erreur suppression favori')
      toast.error('Erreur suppression favori')
    }
  }

  function requestRemove(eventId: number) {
    setPendingRemoveId(eventId)
    setRemoveDialogOpen(true)
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-40 bg-white/10" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-[0_0_0_1px_rgba(0,255,234,0.06)] backdrop-blur"
            >
              <Skeleton className="h-40 w-full bg-white/10" />
              <div className="mt-3 space-y-2">
                <Skeleton className="h-4 w-3/4 bg-white/10" />
                <Skeleton className="h-3 w-1/2 bg-white/10" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return <div className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <AlertDialog
        open={removeDialogOpen}
        onOpenChange={(open) => {
          setRemoveDialogOpen(open)
          if (!open) setPendingRemoveId(null)
        }}
      >
        <AlertDialogContent className="ampia-glass border-white/10 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Retirer ce favori ?</AlertDialogTitle>
            <AlertDialogDescription className="text-white/70">
              L'événement sera retiré de votre liste de favoris. Vous pourrez toujours le retrouver dans la liste des événements.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="glass-input">Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingRemoveId != null) {
                  void removeFavorite(pendingRemoveId)
                }
              }}
              className="btn-primary bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500"
            >
              Retirer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-pink-500/20 to-rose-500/20 backdrop-blur-sm">
          <Heart className="h-6 w-6 text-pink-300 fill-current" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">Mes favoris</h1>
          <p className="text-sm text-white/60 mt-1">
            {events.length} événement{events.length > 1 ? 's' : ''} sauvegardé{events.length > 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Events Grid */}
      {events.length === 0 ? (
        <div className="ampia-glass p-12 text-center">
          <div className="text-6xl mb-4">💔</div>
          <h3 className="text-xl font-semibold text-white mb-2">Aucun favori</h3>
          <p className="text-white/70 mb-6">Commencez à ajouter des événements à vos favoris !</p>
          <Link to="/" className="btn-primary inline-flex items-center gap-2">
            <ExternalLink className="h-5 w-5" />
            Explorer les événements
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:gap-6 lg:grid-cols-3">
          {events.map((ev) => {
            const imgs = Array.isArray(ev.images) ? ev.images.filter(Boolean) : []
            const hero = imgs.length > 0 ? imgs[0] : ev.cover_image
            
            return (
              <Link
                key={ev.id}
                to={`/events/${ev.id}`}
                className="group event-card p-0 overflow-hidden animate-slide-up"
                style={{ animationDelay: `${events.indexOf(ev) * 50}ms` }}
              >
                {/* Image */}
                {hero ? (
                  <div className="relative h-48 overflow-hidden bg-gradient-to-br from-purple-500/20 to-pink-500/20">
                    <img
                      src={hero}
                      alt={ev.title}
                      className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    
                    {/* Favorite Badge */}
                    <div className="absolute top-3 right-3 z-10">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-lg shadow-pink-500/50">
                        <Heart className="h-5 w-5 fill-current" />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="relative h-48 bg-gradient-to-br from-purple-500/20 via-pink-500/20 to-blue-500/20 flex items-center justify-center">
                    <div className="text-6xl opacity-30">🎉</div>
                    <div className="absolute top-3 right-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-lg">
                        <Heart className="h-5 w-5 fill-current" />
                      </div>
                    </div>
                  </div>
                )}

                {/* Content */}
                <div className="p-5 space-y-3">
                  <h3 className="text-lg font-bold text-white line-clamp-2 group-hover:text-pink-300 transition-colors duration-200">
                    {ev.title}
                  </h3>

                  {ev.location && (
                    <div className="flex items-center gap-2 text-sm text-white/70">
                      <MapPin className="h-4 w-4 text-purple-400" />
                      <span className="line-clamp-1">{ev.location}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-xs text-white/60">
                    <Clock className="h-3 w-3" />
                    <span>
                      {new Date(ev.start_date).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                      })}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-3 border-t border-white/10">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        requestRemove(ev.id)
                      }}
                      className="flex-1 glass-input hover:bg-red-500/20 hover:border-red-500/50 hover:text-red-300"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Retirer
                    </Button>
                    <div className="text-xs text-white/50 group-hover:text-pink-400 transition-colors">
                      Voir →
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
