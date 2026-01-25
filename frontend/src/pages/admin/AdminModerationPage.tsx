import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Calendar, MapPin, User, CheckCircle, XCircle, Eye, Clock, AlertTriangle, Shield } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'

type Organizer = { 
  id: number
  name: string
  email: string
  is_verified_organizer?: boolean
}

type Event = {
  id: number
  title: string
  description?: string
  start_date: string
  end_date: string
  location?: string
  cover_image?: string
  status: string
  submitted_at?: string
  organizer?: Organizer
}

type ModerationStats = {
  pending: number
  approved_today: number
  rejected_today: number
}

export default function AdminModerationPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<ModerationStats>({ pending: 0, approved_today: 0, rejected_today: 0 })
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  async function loadPendingEvents() {
    setLoading(true)
    try {
      const res = await api.get<Event[]>('/api/moderation/pending')
      setEvents(Array.isArray(res.data) ? res.data : [])
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Erreur chargement événements')
    } finally {
      setLoading(false)
    }
  }

  async function loadStats() {
    try {
      const res = await api.get<ModerationStats>('/api/moderation/stats')
      setStats(res.data)
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    loadPendingEvents()
    loadStats()
  }, [])

  async function approveEvent(eventId: number) {
    setActionLoading(true)
    try {
      await api.post(`/api/moderation/events/${eventId}/approve`)
      setEvents(prev => prev.filter(e => e.id !== eventId))
      setStats(prev => ({ ...prev, pending: prev.pending - 1, approved_today: prev.approved_today + 1 }))
      toast.success('Événement approuvé et publié')
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Erreur approbation')
    } finally {
      setActionLoading(false)
    }
  }

  async function rejectEvent() {
    if (!selectedEvent) return
    setActionLoading(true)
    try {
      await api.post(`/api/moderation/events/${selectedEvent.id}/reject`, { reason: rejectReason })
      setEvents(prev => prev.filter(e => e.id !== selectedEvent.id))
      setStats(prev => ({ ...prev, pending: prev.pending - 1, rejected_today: prev.rejected_today + 1 }))
      toast.success('Événement rejeté')
      setRejectDialogOpen(false)
      setRejectReason('')
      setSelectedEvent(null)
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Erreur rejet')
    } finally {
      setActionLoading(false)
    }
  }

  function openRejectDialog(event: Event) {
    setSelectedEvent(event)
    setRejectDialogOpen(true)
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  function timeSinceSubmission(dateStr?: string) {
    if (!dateStr) return 'N/A'
    const diff = Date.now() - new Date(dateStr).getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    if (hours < 1) return 'Il y a moins d\'1h'
    if (hours < 24) return `Il y a ${hours}h`
    const days = Math.floor(hours / 24)
    return `Il y a ${days}j`
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Shield className="h-8 w-8 text-orange-500" />
        <div>
          <h1 className="text-2xl font-bold text-white">Modération des événements</h1>
          <p className="text-gray-400">Approuver ou rejeter les événements en attente de validation</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <Clock className="h-6 w-6 text-yellow-500" />
            <div>
              <p className="text-2xl font-bold text-yellow-500">{stats.pending}</p>
              <p className="text-sm text-gray-400">En attente</p>
            </div>
          </div>
        </div>
        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-6 w-6 text-green-500" />
            <div>
              <p className="text-2xl font-bold text-green-500">{stats.approved_today}</p>
              <p className="text-sm text-gray-400">Approuvés aujourd'hui</p>
            </div>
          </div>
        </div>
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <XCircle className="h-6 w-6 text-red-500" />
            <div>
              <p className="text-2xl font-bold text-red-500">{stats.rejected_today}</p>
              <p className="text-sm text-gray-400">Rejetés aujourd'hui</p>
            </div>
          </div>
        </div>
      </div>

      {/* Events List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-40 w-full rounded-xl" />
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-16 bg-gray-800/50 rounded-xl border border-gray-700">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">Aucun événement en attente</h3>
          <p className="text-gray-400">Tous les événements ont été traités</p>
        </div>
      ) : (
        <div className="space-y-4">
          {events.map(event => (
            <div key={event.id} className="bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden">
              <div className="flex flex-col md:flex-row">
                {/* Cover Image */}
                {event.cover_image && (
                  <div className="md:w-48 h-32 md:h-auto flex-shrink-0">
                    <img 
                      src={event.cover_image} 
                      alt={event.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                
                {/* Content */}
                <div className="flex-1 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-semibold text-white">{event.title}</h3>
                        <Badge variant="outline" className="text-yellow-500 border-yellow-500">
                          En attente
                        </Badge>
                      </div>
                      
                      {event.description && (
                        <p className="text-gray-400 text-sm mb-3 line-clamp-2">{event.description}</p>
                      )}
                      
                      <div className="flex flex-wrap gap-4 text-sm text-gray-400">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>{formatDate(event.start_date)}</span>
                        </div>
                        {event.location && (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            <span>{event.location}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          <span>{timeSinceSubmission(event.submitted_at)}</span>
                        </div>
                      </div>
                      
                      {/* Organizer */}
                      {event.organizer && (
                        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-700">
                          <User className="h-4 w-4 text-gray-500" />
                          <span className="text-sm text-gray-400">
                            {event.organizer.name}
                            {event.organizer.is_verified_organizer && (
                              <Badge className="ml-2 bg-blue-500 text-white text-xs">Vérifié</Badge>
                            )}
                          </span>
                          <span className="text-xs text-gray-500">({event.organizer.email})</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Actions */}
                    <div className="flex flex-col gap-2">
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => approveEvent(event.id)}
                        disabled={actionLoading}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Approuver
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => openRejectDialog(event)}
                        disabled={actionLoading}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Rejeter
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-gray-400"
                        onClick={() => window.open(`/events/${event.id}`, '_blank')}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Voir
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="bg-gray-900 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Rejeter l'événement
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              {selectedEvent?.title}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <label className="text-sm text-gray-400 mb-2 block">
              Raison du rejet (sera envoyée à l'organisateur)
            </label>
            <textarea
              value={rejectReason}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setRejectReason(e.target.value)}
              placeholder="Ex: Contenu inapproprié, informations manquantes, doublon..."
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-md p-3 min-h-[100px]"
            />
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRejectDialogOpen(false)}
              className="text-gray-400"
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={rejectEvent}
              disabled={actionLoading || !rejectReason.trim()}
            >
              Confirmer le rejet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
