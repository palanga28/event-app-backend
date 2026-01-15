import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../../lib/api'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { Calendar, Star, Eye, User, Clock, CheckCircle, XCircle, Filter, Trash2, RefreshCw, Search, MoreVertical, FileX } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

type Organizer = { id: number; name: string; email: string } | null

type Event = {
  id: number
  title: string
  start_date: string
  end_date: string
  status: string
  featured?: boolean
  organizer?: Organizer
}

type FeatureResponse = {
  message: string
  event: {
    id: number
    featured: boolean
  }
}

export default function AdminEventsPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get<Event[] | { value: Event[] }>('/api/admin/events')
      const data = Array.isArray(res.data) ? res.data : (res.data?.value || [])
      setEvents(data)
    } catch (e: any) {
      const status = e?.response?.status
      const msg = e?.response?.data?.message || e?.message || 'Erreur chargement'
      setError(status ? `${msg} (HTTP ${status})` : msg)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function changeStatus(eventId: number, newStatus: string) {
    setTogglingId(eventId)
    try {
      await api.put(`/api/admin/events/${eventId}/status`, { status: newStatus })
      setEvents(prev => prev.map(e => e.id === eventId ? { ...e, status: newStatus } : e))
      toast.success(`Statut mis à jour: ${newStatus}`)
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Erreur modification statut')
    } finally {
      setTogglingId(null)
    }
  }

  async function deleteEvent(eventId: number, eventTitle: string) {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer l'événement "${eventTitle}" ? Cette action est irréversible.`)) {
      return
    }
    setTogglingId(eventId)
    try {
      await api.delete(`/api/admin/events/${eventId}`)
      setEvents(prev => prev.filter(e => e.id !== eventId))
      toast.success('Événement supprimé')
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Erreur suppression')
    } finally {
      setTogglingId(null)
    }
  }

  async function toggleFeatured(event: Event) {
    setActionError(null)
    setTogglingId(event.id)
    const current = !!event.featured
    const optimistic = !current

    setEvents((prev) => prev.map((e) => (e.id === event.id ? { ...e, featured: optimistic } : e)))
    try {
      const res = await api.put<FeatureResponse>(`/api/admin/events/${event.id}/feature`, {
        featured: !current,
      })

      const nextFeatured = res.data?.event?.featured
      if (typeof nextFeatured === 'boolean') {
        setEvents((prev) =>
          prev.map((e) => (e.id === event.id ? { ...e, featured: nextFeatured } : e))
        )

        toast.success(nextFeatured ? 'Événement mis en avant' : 'Événement retiré du carrousel')
        await load()
      } else {
        setEvents((prev) => prev.map((e) => (e.id === event.id ? { ...e, featured: optimistic } : e)))

        toast.error('Réponse serveur invalide: champ featured manquant')
      }
    } catch (e: any) {
      setEvents((prev) => prev.map((e2) => (e2.id === event.id ? { ...e2, featured: current } : e2)))
      const status = e?.response?.status
      const msg = e?.response?.data?.message || e?.message || 'Erreur update'
      const full = status ? `${msg} (HTTP ${status})` : msg
      setActionError(full)
      toast.error(full)
    } finally {
      setTogglingId(null)
    }
  }

  const navigate = useNavigate()
  const featuredCount = events.filter((e) => e.featured).length
  const publishedCount = events.filter((e) => e.status === 'published').length

  const filteredEvents = events.filter(event => {
    const matchesSearch = searchQuery === '' || 
      event.title.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || event.status === statusFilter
    return matchesSearch && matchesStatus
  })

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Skeleton className="h-10 w-64 bg-gradient-to-r from-white/10 to-white/5 rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="ampia-glass p-6 space-y-4 animate-pulse">
              <Skeleton className="h-6 w-3/4 bg-gradient-to-r from-white/10 to-white/5 rounded" />
              <Skeleton className="h-4 w-1/2 bg-gradient-to-r from-white/10 to-white/5 rounded" />
              <Skeleton className="h-4 w-2/3 bg-gradient-to-r from-white/10 to-white/5 rounded" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="ampia-glass p-6 animate-fade-in">
        <div className="rounded-xl border border-red-500/30 bg-gradient-to-r from-red-500/20 to-rose-500/20 p-4 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500/20">
              <span className="text-lg">⚠️</span>
            </div>
            <div className="text-sm text-red-200">{error}</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-red-500/20 to-rose-500/20 backdrop-blur-sm">
            <Calendar className="h-6 w-6 text-red-300" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">Gestion des événements</h1>
            <p className="text-sm text-white/60 mt-1">
              {events.length} événement{events.length > 1 ? 's' : ''} · {featuredCount} en vedette · {publishedCount} publiés
            </p>
          </div>
        </div>
      </div>

      {actionError && (
        <div className="animate-scale-in rounded-xl border border-red-500/30 bg-gradient-to-r from-red-500/20 to-rose-500/20 p-4 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <XCircle className="h-5 w-5 text-red-300" />
            <div className="text-sm text-red-200">{actionError}</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher par titre..."
            className="glass-input pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-white/60" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="glass-input text-sm min-w-[150px]"
          >
            <option value="all">Tous les statuts</option>
            <option value="published">Publiés</option>
            <option value="draft">Brouillons</option>
            <option value="cancelled">Annulés</option>
          </select>
        </div>
        <Button onClick={load} variant="outline" className="glass-input">
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualiser
        </Button>
      </div>

      {/* Events Grid */}
      {filteredEvents.length === 0 ? (
        <div className="ampia-glass p-12 text-center">
          <div className="text-6xl mb-4">📅</div>
          <h3 className="text-xl font-semibold text-white mb-2">Aucun événement</h3>
          <p className="text-white/70">Aucun événement n'a été créé sur la plateforme.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEvents.map((e, index) => (
            <div
              key={e.id}
              className="group ampia-glass p-6 space-y-4 animate-slide-up hover:border-white/20 transition-all duration-300"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <Link
                    to={`/events/${e.id}`}
                    className="text-lg font-bold text-white line-clamp-2 group-hover:text-purple-300 transition-colors duration-200"
                  >
                    {e.title}
                  </Link>
                </div>
                {e.featured && (
                  <div className="flex-shrink-0">
                    <span className="badge-gradient inline-flex items-center gap-1">
                      <Star className="h-3 w-3 fill-current" />
                      <span>Vedette</span>
                    </span>
                  </div>
                )}
              </div>

              {/* Status Badge */}
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium backdrop-blur-sm ${
                  e.status === 'published'
                    ? 'border border-green-500/30 bg-green-500/20 text-green-200'
                    : e.status === 'draft'
                    ? 'border border-yellow-500/30 bg-yellow-500/20 text-yellow-200'
                    : 'border border-gray-500/30 bg-gray-500/20 text-gray-200'
                }`}>
                  {e.status === 'published' ? (
                    <>
                      <CheckCircle className="h-3 w-3" />
                      Publié
                    </>
                  ) : (
                    <span className="capitalize">{e.status}</span>
                  )}
                </span>
              </div>

              {/* Details */}
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-white/70">
                  <Clock className="h-4 w-4 text-purple-400" />
                  <span className="line-clamp-1">
                    {new Date(e.start_date).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                    })}
                  </span>
                </div>
                {e.organizer && (
                  <div className="flex items-center gap-2 text-white/70">
                    <User className="h-4 w-4 text-blue-400" />
                    <button
                      type="button"
                      onClick={() => navigate(`/users/${e.organizer!.id}`)}
                      className="hover:text-blue-300 transition-colors underline decoration-white/20 hover:decoration-blue-400"
                    >
                      {e.organizer.name}
                    </button>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-4 border-t border-white/10">
                <Link
                  to={`/events/${e.id}`}
                  className="glass-input text-center text-sm font-medium hover:bg-white/10 transition-colors px-3 py-2"
                >
                  <Eye className="h-4 w-4 inline mr-1" />
                  Voir
                </Link>
                <Button
                  type="button"
                  variant={e.featured ? 'default' : 'outline'}
                  size="sm"
                  disabled={togglingId === e.id}
                  onClick={() => toggleFeatured(e)}
                  className={e.featured ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400' : ''}
                >
                  {togglingId === e.id ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Star className={`h-4 w-4 ${e.featured ? 'fill-current' : ''}`} />
                  )}
                </Button>

                {/* More Actions Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="glass-input px-2" disabled={togglingId === e.id}>
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="ampia-glass border-white/10 w-48">
                    <DropdownMenuLabel className="text-white/70">Changer le statut</DropdownMenuLabel>
                    <DropdownMenuSeparator className="bg-white/10" />
                    <DropdownMenuItem
                      onClick={() => changeStatus(e.id, 'published')}
                      className={`gap-2 cursor-pointer ${e.status === 'published' ? 'bg-green-500/20 text-green-200' : 'text-white hover:bg-white/10'}`}
                    >
                      <CheckCircle className="h-4 w-4" />
                      Publier
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => changeStatus(e.id, 'draft')}
                      className={`gap-2 cursor-pointer ${e.status === 'draft' ? 'bg-yellow-500/20 text-yellow-200' : 'text-white hover:bg-white/10'}`}
                    >
                      <FileX className="h-4 w-4" />
                      Brouillon
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => changeStatus(e.id, 'cancelled')}
                      className={`gap-2 cursor-pointer ${e.status === 'cancelled' ? 'bg-gray-500/20 text-gray-200' : 'text-white hover:bg-white/10'}`}
                    >
                      <XCircle className="h-4 w-4" />
                      Annuler
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-white/10" />
                    <DropdownMenuItem
                      onClick={() => deleteEvent(e.id, e.title)}
                      className="gap-2 text-red-300 hover:bg-red-500/20 cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                      Supprimer
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
