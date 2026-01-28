import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../lib/api'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Calendar, Star, Eye, User, CheckCircle, XCircle, RefreshCw, Image } from 'lucide-react'

type Event = {
  id: number
  title: string
  start_date: string
  cover_image: string
  carousel_requested: boolean
  in_carousel: boolean
  organizer?: {
    id: number
    name: string
    email: string
  } | null
}

export default function AdminCarouselPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [processingId, setProcessingId] = useState<number | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get('/api/admin/carousel-requests')
      setEvents(Array.isArray(res.data) ? res.data : [])
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Erreur chargement')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function approveCarousel(eventId: number) {
    setProcessingId(eventId)
    try {
      await api.post(`/api/admin/events/${eventId}/carousel`, { inCarousel: true })
      setEvents(prev => prev.map(e => 
        e.id === eventId ? { ...e, in_carousel: true, carousel_requested: false } : e
      ))
      toast.success('Événement ajouté au carrousel')
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Erreur')
    } finally {
      setProcessingId(null)
    }
  }

  async function rejectCarousel(eventId: number) {
    setProcessingId(eventId)
    try {
      await api.post(`/api/admin/events/${eventId}/carousel`, { inCarousel: false })
      setEvents(prev => prev.filter(e => e.id !== eventId))
      toast.success('Demande refusée')
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Erreur')
    } finally {
      setProcessingId(null)
    }
  }

  async function removeFromCarousel(eventId: number) {
    setProcessingId(eventId)
    try {
      await api.post(`/api/admin/events/${eventId}/carousel`, { inCarousel: false })
      setEvents(prev => prev.map(e => 
        e.id === eventId ? { ...e, in_carousel: false } : e
      ))
      toast.success('Événement retiré du carrousel')
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Erreur')
    } finally {
      setProcessingId(null)
    }
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  const pendingRequests = events.filter(e => e.carousel_requested && !e.in_carousel)
  const inCarousel = events.filter(e => e.in_carousel)

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <h1 className="text-2xl font-bold text-white mb-6">Gestion du Carrousel</h1>
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-24 w-full bg-gray-800" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-white mb-6">Gestion du Carrousel</h1>
        <div className="bg-red-500/10 border border-red-500 rounded-lg p-4 text-red-400">
          {error}
        </div>
        <Button onClick={load} className="mt-4" variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" /> Réessayer
        </Button>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Star className="w-6 h-6 text-yellow-500" />
          Gestion du Carrousel
        </h1>
        <Button onClick={load} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" /> Actualiser
        </Button>
      </div>

      {/* Demandes en attente */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <span className="bg-yellow-500 text-black px-2 py-0.5 rounded text-sm">
            {pendingRequests.length}
          </span>
          Demandes en attente
        </h2>

        {pendingRequests.length === 0 ? (
          <div className="bg-gray-800/50 rounded-lg p-8 text-center text-gray-400">
            Aucune demande en attente
          </div>
        ) : (
          <div className="grid gap-4">
            {pendingRequests.map(event => (
              <div
                key={event.id}
                className="bg-gray-800 rounded-lg p-4 flex items-center gap-4"
              >
                {event.cover_image ? (
                  <img
                    src={event.cover_image}
                    alt={event.title}
                    className="w-20 h-20 object-cover rounded-lg"
                  />
                ) : (
                  <div className="w-20 h-20 bg-gray-700 rounded-lg flex items-center justify-center">
                    <Image className="w-8 h-8 text-gray-500" />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <Link
                    to={`/events/${event.id}`}
                    className="text-white font-medium hover:text-purple-400 truncate block"
                  >
                    {event.title}
                  </Link>
                  <div className="flex items-center gap-4 text-sm text-gray-400 mt-1">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {formatDate(event.start_date)}
                    </span>
                    {event.organizer && (
                      <span className="flex items-center gap-1">
                        <User className="w-4 h-4" />
                        {event.organizer.name}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(`/events/${event.id}`, '_blank')}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => rejectCarousel(event.id)}
                    disabled={processingId === event.id}
                  >
                    <XCircle className="w-4 h-4 mr-1" />
                    Refuser
                  </Button>
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => approveCarousel(event.id)}
                    disabled={processingId === event.id}
                  >
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Approuver
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Événements dans le carrousel */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <span className="bg-purple-500 text-white px-2 py-0.5 rounded text-sm">
            {inCarousel.length}
          </span>
          Actuellement dans le carrousel
        </h2>

        {inCarousel.length === 0 ? (
          <div className="bg-gray-800/50 rounded-lg p-8 text-center text-gray-400">
            Aucun événement dans le carrousel
          </div>
        ) : (
          <div className="grid gap-4">
            {inCarousel.map(event => (
              <div
                key={event.id}
                className="bg-gray-800 rounded-lg p-4 flex items-center gap-4 border border-purple-500/30"
              >
                {event.cover_image ? (
                  <img
                    src={event.cover_image}
                    alt={event.title}
                    className="w-20 h-20 object-cover rounded-lg"
                  />
                ) : (
                  <div className="w-20 h-20 bg-gray-700 rounded-lg flex items-center justify-center">
                    <Image className="w-8 h-8 text-gray-500" />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/events/${event.id}`}
                      className="text-white font-medium hover:text-purple-400 truncate"
                    >
                      {event.title}
                    </Link>
                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-400 mt-1">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {formatDate(event.start_date)}
                    </span>
                    {event.organizer && (
                      <span className="flex items-center gap-1">
                        <User className="w-4 h-4" />
                        {event.organizer.name}
                      </span>
                    )}
                  </div>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  className="text-red-400 border-red-400 hover:bg-red-400/10"
                  onClick={() => removeFromCarousel(event.id)}
                  disabled={processingId === event.id}
                >
                  <XCircle className="w-4 h-4 mr-1" />
                  Retirer
                </Button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
