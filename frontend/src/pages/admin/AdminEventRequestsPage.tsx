import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Calendar, Clock, AlertTriangle, Check, X, User, Ticket, CalendarX, CalendarClock } from 'lucide-react'
import { toast } from 'sonner'

interface EventRequest {
  id: number
  event_id: number
  organizer_id: number
  request_type: 'postpone' | 'cancel'
  reason: string
  new_start_date?: string
  new_end_date?: string
  status: string
  created_at: string
  event?: {
    id: number
    title: string
    start_date: string
    location: string
  }
  organizer?: {
    id: number
    name: string
    email: string
  }
  tickets_sold?: number
}

export default function AdminEventRequestsPage() {
  const [requests, setRequests] = useState<EventRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<number | null>(null)
  const [rejectComment, setRejectComment] = useState('')
  const [showRejectModal, setShowRejectModal] = useState<number | null>(null)

  useEffect(() => {
    loadRequests()
  }, [])

  async function loadRequests() {
    try {
      setLoading(true)
      const res = await api.get('/api/event-requests/pending')
      setRequests(Array.isArray(res.data) ? res.data : [])
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erreur chargement')
    } finally {
      setLoading(false)
    }
  }

  async function handleApprove(requestId: number) {
    setProcessing(requestId)
    try {
      await api.post(`/api/event-requests/${requestId}/approve`)
      toast.success('Demande approuvée')
      loadRequests()
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erreur approbation')
    } finally {
      setProcessing(null)
    }
  }

  async function handleReject(requestId: number) {
    if (!rejectComment.trim()) {
      toast.error('Veuillez fournir une raison de rejet')
      return
    }
    setProcessing(requestId)
    try {
      await api.post(`/api/event-requests/${requestId}/reject`, { comment: rejectComment })
      toast.success('Demande rejetée')
      setShowRejectModal(null)
      setRejectComment('')
      loadRequests()
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erreur rejet')
    } finally {
      setProcessing(null)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Skeleton className="h-10 w-64 bg-gradient-to-r from-white/10 to-white/5 rounded-xl" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48 w-full bg-gradient-to-r from-white/10 to-white/5 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-orange-500/20 to-amber-500/20 backdrop-blur-sm">
          <CalendarClock className="h-6 w-6 text-orange-300" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">Demandes d'événements</h1>
          <p className="text-sm text-white/60 mt-1">Reports et annulations en attente d'approbation</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="ampia-glass p-4">
          <div className="text-2xl font-bold text-white">{requests.length}</div>
          <div className="text-sm text-white/60">En attente</div>
        </div>
        <div className="ampia-glass p-4">
          <div className="text-2xl font-bold text-orange-400">
            {requests.filter(r => r.request_type === 'postpone').length}
          </div>
          <div className="text-sm text-white/60">Reports</div>
        </div>
        <div className="ampia-glass p-4">
          <div className="text-2xl font-bold text-red-400">
            {requests.filter(r => r.request_type === 'cancel').length}
          </div>
          <div className="text-sm text-white/60">Annulations</div>
        </div>
        <div className="ampia-glass p-4">
          <div className="text-2xl font-bold text-blue-400">
            {requests.reduce((sum, r) => sum + (r.tickets_sold || 0), 0)}
          </div>
          <div className="text-sm text-white/60">Tickets concernés</div>
        </div>
      </div>

      {/* Requests List */}
      {requests.length === 0 ? (
        <div className="ampia-glass p-12 text-center">
          <div className="text-6xl mb-4">✅</div>
          <h3 className="text-xl font-semibold text-white mb-2">Aucune demande en attente</h3>
          <p className="text-white/70">Toutes les demandes ont été traitées</p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => (
            <div key={request.id} className="ampia-glass p-6 space-y-4">
              {/* Request Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                    request.request_type === 'cancel' 
                      ? 'bg-red-500/20' 
                      : 'bg-orange-500/20'
                  }`}>
                    {request.request_type === 'cancel' ? (
                      <CalendarX className="h-5 w-5 text-red-400" />
                    ) : (
                      <CalendarClock className="h-5 w-5 text-orange-400" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        request.request_type === 'cancel'
                          ? 'bg-red-500/20 text-red-300'
                          : 'bg-orange-500/20 text-orange-300'
                      }`}>
                        {request.request_type === 'cancel' ? 'Annulation' : 'Report'}
                      </span>
                      <span className="text-xs text-white/50">
                        {new Date(request.created_at).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold text-white mt-1">
                      {request.event?.title || `Événement #${request.event_id}`}
                    </h3>
                  </div>
                </div>
                {request.tickets_sold && request.tickets_sold > 0 && (
                  <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20">
                    <Ticket className="h-4 w-4 text-blue-400" />
                    <span className="text-sm text-blue-300">{request.tickets_sold} tickets</span>
                  </div>
                )}
              </div>

              {/* Event Info */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl bg-white/5">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-white/60" />
                  <span className="text-sm text-white/80">
                    {request.event?.start_date 
                      ? new Date(request.event.start_date).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        })
                      : 'Date inconnue'
                    }
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-white/60" />
                  <span className="text-sm text-white/80">
                    {request.organizer?.name || 'Organisateur inconnu'}
                  </span>
                </div>
                {request.request_type === 'postpone' && request.new_start_date && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-orange-400" />
                    <span className="text-sm text-orange-300">
                      Nouvelle date: {new Date(request.new_start_date).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </span>
                  </div>
                )}
              </div>

              {/* Reason */}
              <div className="p-4 rounded-xl bg-white/5 border-l-4 border-white/20">
                <div className="text-xs text-white/50 mb-1">Raison de la demande</div>
                <p className="text-white/90">{request.reason}</p>
              </div>

              {/* Warning for cancellation */}
              {request.request_type === 'cancel' && request.tickets_sold && request.tickets_sold > 0 && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
                  <AlertTriangle className="h-5 w-5 text-amber-400 flex-shrink-0" />
                  <p className="text-sm text-amber-200">
                    L'approbation de cette annulation créera automatiquement des demandes de remboursement 
                    pour les {request.tickets_sold} tickets vendus.
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-3 pt-2">
                <Button
                  onClick={() => handleApprove(request.id)}
                  disabled={processing === request.id}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  {processing === request.id ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Approuver
                    </>
                  )}
                </Button>
                <Button
                  onClick={() => setShowRejectModal(request.id)}
                  disabled={processing === request.id}
                  variant="outline"
                  className="flex-1 border-red-500/30 text-red-400 hover:bg-red-500/10"
                >
                  <X className="h-4 w-4 mr-2" />
                  Rejeter
                </Button>
              </div>

              {/* Reject Modal */}
              {showRejectModal === request.id && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 space-y-3">
                  <div className="text-sm text-red-300 font-medium">Raison du rejet</div>
                  <textarea
                    value={rejectComment}
                    onChange={(e) => setRejectComment(e.target.value)}
                    placeholder="Expliquez pourquoi cette demande est rejetée..."
                    className="w-full glass-input min-h-[80px] resize-none"
                  />
                  <div className="flex gap-2">
                    <Button
                      onClick={() => {
                        setShowRejectModal(null)
                        setRejectComment('')
                      }}
                      variant="outline"
                      className="flex-1"
                    >
                      Annuler
                    </Button>
                    <Button
                      onClick={() => handleReject(request.id)}
                      disabled={processing === request.id || !rejectComment.trim()}
                      className="flex-1 bg-red-600 hover:bg-red-700"
                    >
                      Confirmer le rejet
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
