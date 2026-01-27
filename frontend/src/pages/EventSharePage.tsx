import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Calendar, MapPin, Clock, User, Download, ExternalLink } from 'lucide-react'
import { api } from '../lib/api'

type Event = {
  id: number
  title: string
  description: string
  location: string
  start_date: string
  end_date: string
  cover_image: string
  images?: string[]
  organizer?: {
    id: number
    name: string
    avatar_url?: string
  }
}

export default function EventSharePage() {
  const { id } = useParams<{ id: string }>()
  const [event, setEvent] = useState<Event | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadEvent()
  }, [id])

  async function loadEvent() {
    try {
      const response = await api.get(`/api/events/${id}`)
      setEvent(response.data)
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Événement non trouvé')
    } finally {
      setLoading(false)
    }
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString)
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  function formatTime(dateString: string) {
    const date = new Date(dateString)
    return date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  function openInApp() {
    // Essayer d'ouvrir l'app avec le deep link
    const deepLink = `ampia://event/${id}`
    
    // Essayer d'ouvrir l'app via un iframe invisible (meilleure compatibilité)
    const iframe = document.createElement('iframe')
    iframe.style.display = 'none'
    iframe.src = deepLink
    document.body.appendChild(iframe)
    
    // Fallback: essayer aussi via window.location
    setTimeout(() => {
      window.location.href = deepLink
    }, 100)
    
    // Si l'app n'est pas installée, rediriger vers le store après un délai
    setTimeout(() => {
      // Vérifier si on est toujours sur la page (l'app n'a pas ouvert)
      // Rediriger vers le Play Store ou App Store
      const isAndroid = /android/i.test(navigator.userAgent)
      const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent)
      
      if (isAndroid) {
        window.location.href = 'https://play.google.com/store/apps/details?id=com.ampia.events'
      } else if (isIOS) {
        window.location.href = 'https://apps.apple.com/app/ampia-events/id123456789'
      }
    }, 2500)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    )
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black flex flex-col items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Événement non trouvé</h1>
          <p className="text-gray-400 mb-6">{error || "Cet événement n'existe pas ou a été supprimé."}</p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg transition-colors"
          >
            Voir tous les événements
          </Link>
        </div>
      </div>
    )
  }

  const coverImage = event.cover_image || event.images?.[0] || '/placeholder-event.jpg'

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black">
      {/* Hero Image */}
      <div className="relative h-64 md:h-96">
        <img
          src={coverImage}
          alt={event.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/50 to-transparent" />
        
        {/* Logo AMPIA */}
        <div className="absolute top-4 left-4">
          <div className="bg-purple-600 text-white px-3 py-1 rounded-full text-sm font-bold">
            AMPIA
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 -mt-20 relative z-10 pb-32">
        <div className="bg-gray-800/80 backdrop-blur-lg rounded-2xl p-6 shadow-xl border border-gray-700">
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-4">
            {event.title}
          </h1>

          {/* Date & Time */}
          <div className="flex items-center gap-3 text-gray-300 mb-3">
            <Calendar className="w-5 h-5 text-purple-400" />
            <span>{formatDate(event.start_date)}</span>
          </div>

          <div className="flex items-center gap-3 text-gray-300 mb-3">
            <Clock className="w-5 h-5 text-purple-400" />
            <span>{formatTime(event.start_date)} - {formatTime(event.end_date)}</span>
          </div>

          {/* Location */}
          {event.location && (
            <div className="flex items-center gap-3 text-gray-300 mb-4">
              <MapPin className="w-5 h-5 text-purple-400" />
              <span>{event.location}</span>
            </div>
          )}

          {/* Organizer */}
          {event.organizer && (
            <div className="flex items-center gap-3 text-gray-300 mb-6 pb-6 border-b border-gray-700">
              <User className="w-5 h-5 text-purple-400" />
              <span>Organisé par <strong className="text-white">{event.organizer.name}</strong></span>
            </div>
          )}

          {/* Description */}
          {event.description && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-white mb-2">À propos</h2>
              <p className="text-gray-300 whitespace-pre-line line-clamp-4">
                {event.description}
              </p>
            </div>
          )}

          {/* CTA Buttons */}
          <div className="space-y-3">
            <button
              onClick={openInApp}
              className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white py-4 rounded-xl font-semibold transition-colors"
            >
              <ExternalLink className="w-5 h-5" />
              Ouvrir dans l'app AMPIA
            </button>

            <Link
              to={`/events/${id}`}
              className="w-full flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 text-white py-4 rounded-xl font-semibold transition-colors"
            >
              Voir sur le site web
            </Link>
          </div>
        </div>

        {/* Download App Banner */}
        <div className="mt-6 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl p-6 text-center">
          <h3 className="text-xl font-bold text-white mb-2">
            Télécharge l'app AMPIA
          </h3>
          <p className="text-white/80 mb-4">
            Découvre les meilleurs événements près de chez toi
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="https://play.google.com/store/apps/details?id=com.ampia.events"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-black/30 hover:bg-black/50 text-white px-6 py-3 rounded-lg transition-colors"
            >
              <Download className="w-5 h-5" />
              Google Play
            </a>
            <a
              href="https://apps.apple.com/app/ampia-events/id123456789"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-black/30 hover:bg-black/50 text-white px-6 py-3 rounded-lg transition-colors"
            >
              <Download className="w-5 h-5" />
              App Store
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
