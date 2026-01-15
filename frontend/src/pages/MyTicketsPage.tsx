import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
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
import { Ticket, Calendar, MapPin, DollarSign, X, CheckCircle, ExternalLink, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

type TicketType = {
  id: number
  name: string
  description: string | null
  price: number
  event_id: number
}

type Event = {
  id: number
  title: string
  start_date: string
  end_date: string
  location: string | null
}

type Ticket = {
  id: number
  user_id: number
  event_id: number
  ticket_type_id: number
  status: 'active' | 'cancelled' | string
  purchase_date: string
  price_paid: number
  event: Event | null
  ticketType: TicketType | null
}

export default function MyTicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [cancellingId, setCancellingId] = useState<number | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get<Ticket[]>('/api/tickets/user')
      setTickets(res.data)
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Erreur chargement')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [pendingCancelId, setPendingCancelId] = useState<number | null>(null)

  async function cancelTicket(ticketId: number) {
    setActionError(null)
    setCancellingId(ticketId)
    try {
      await api.put(`/api/tickets/${ticketId}/cancel`)
      await load()
      toast.success('Ticket annulé avec succès')
      setCancelDialogOpen(false)
    } catch (e: any) {
      setActionError(e?.response?.data?.message || e?.message || 'Erreur annulation')
      toast.error('Erreur lors de l\'annulation du ticket')
    } finally {
      setCancellingId(null)
      setPendingCancelId(null)
    }
  }

  function requestCancel(ticketId: number) {
    setPendingCancelId(ticketId)
    setCancelDialogOpen(true)
  }

  const navigate = useNavigate()

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-40 bg-white/10" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
              <Skeleton className="h-4 w-2/3 bg-white/10" />
              <Skeleton className="mt-2 h-3 w-1/2 bg-white/10" />
              <Skeleton className="mt-3 h-3 w-3/4 bg-white/10" />
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
      <AlertDialog
        open={cancelDialogOpen}
        onOpenChange={(open) => {
          setCancelDialogOpen(open)
          if (!open) setPendingCancelId(null)
        }}
      >
        <AlertDialogContent className="ampia-glass border-white/10 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Annuler ce ticket ?</AlertDialogTitle>
            <AlertDialogDescription className="text-white/70">
              Cette action est irréversible. Le ticket sera annulé et retiré de votre liste.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="glass-input">Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingCancelId != null) {
                  void cancelTicket(pendingCancelId)
                }
              }}
              className="btn-primary bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500"
            >
              Confirmer l'annulation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-blue-500/20 to-cyan-500/20 backdrop-blur-sm">
            <Ticket className="h-6 w-6 text-blue-300" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">Mes tickets</h1>
            <p className="text-sm text-white/60 mt-1">
              {tickets.length} ticket{tickets.length > 1 ? 's' : ''} en votre possession
            </p>
          </div>
        </div>
        <Link to="/" className="glass-input inline-flex items-center gap-2 px-4 py-2 hover:bg-white/10 transition-colors">
          <ExternalLink className="h-4 w-4" />
          <span className="hidden sm:inline">Explorer les événements</span>
        </Link>
      </div>

      {actionError && (
        <div className="animate-scale-in rounded-xl border border-red-500/30 bg-gradient-to-r from-red-500/20 to-rose-500/20 p-4 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <X className="h-5 w-5 text-red-300" />
            <div className="text-sm text-red-200">{actionError}</div>
          </div>
        </div>
      )}

      {/* Tickets List */}
      {tickets.length === 0 ? (
        <div className="ampia-glass p-12 text-center">
          <div className="text-6xl mb-4">🎫</div>
          <h3 className="text-xl font-semibold text-white mb-2">Aucun ticket</h3>
          <p className="text-white/70 mb-6">Vous n'avez pas encore acheté de tickets.</p>
          <Link to="/" className="btn-primary inline-flex items-center gap-2">
            <ExternalLink className="h-5 w-5" />
            Explorer les événements
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:gap-6">
          {tickets.map((t) => (
            <div
              key={t.id}
              className="group ampia-glass p-6 space-y-4 animate-slide-up"
              style={{ animationDelay: `${tickets.indexOf(t) * 50}ms` }}
            >
              {/* Status Badge */}
              <div className="flex items-center justify-between">
                {t.status === 'active' ? (
                  <span className="badge-gradient inline-flex items-center gap-1">
                    <CheckCircle className="h-3 w-3 fill-current" />
                    <span>Actif</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full border border-red-500/30 bg-red-500/20 px-3 py-1 text-xs font-medium text-red-200 backdrop-blur-sm">
                    <X className="h-3 w-3" />
                    <span className="capitalize">Annulé</span>
                  </span>
                )}
                <div className="text-xs text-white/60">#{t.id}</div>
              </div>

              {/* Event Info */}
              <div>
                <h3 className="text-lg font-bold text-white mb-2 line-clamp-2 group-hover:text-purple-300 transition-colors">
                  {t.event ? (
                    <Link
                      to={`/events/${t.event.id}`}
                      className="hover:underline decoration-white/30 hover:decoration-purple-400"
                    >
                      {t.event.title}
                    </Link>
                  ) : (
                    'Événement'
                  )}
                </h3>
                
                {t.event?.location && (
                  <div className="flex items-center gap-2 text-sm text-white/70 mt-2">
                    <MapPin className="h-4 w-4 text-purple-400" />
                    <span className="line-clamp-1">{t.event.location}</span>
                  </div>
                )}

                {t.event && (
                  <div className="flex items-center gap-2 text-xs text-white/60 mt-2">
                    <Calendar className="h-3 w-3" />
                    <span>
                      {new Date(t.event.start_date).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                      })}
                    </span>
                  </div>
                )}
              </div>

              {/* Ticket Details */}
              <div className="ampia-glass p-4 space-y-2 bg-white/5 border border-white/10">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/70">Type de ticket</span>
                  <span className="text-sm font-semibold text-white">
                    {t.ticketType?.name || `Ticket #${t.ticket_type_id}`}
                  </span>
                </div>
                {t.ticketType?.description && (
                  <div className="text-xs text-white/60 mt-1">{t.ticketType.description}</div>
                )}
                <div className="flex items-center justify-between pt-2 border-t border-white/10">
                  <span className="text-sm text-white/70 flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Prix payé
                  </span>
                  <span className="text-lg font-bold text-gradient">{t.price_paid} FC</span>
                </div>
                <div className="text-xs text-white/50 mt-2">
                  Acheté le {new Date(t.purchase_date).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-4 border-t border-white/10">
                {t.event && (
                  <Link
                    to={`/events/${t.event.id}`}
                    className="flex-1 glass-input text-center text-sm font-medium hover:bg-white/10 transition-colors"
                  >
                    Voir l'événement
                  </Link>
                )}
                {t.status === 'active' && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => requestCancel(t.id)}
                    disabled={cancellingId === t.id}
                    className="flex-shrink-0 glass-input hover:bg-red-500/20 hover:border-red-500/50 hover:text-red-300"
                  >
                    {cancellingId === t.id ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        Annulation...
                      </>
                    ) : (
                      <>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Annuler
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
