import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Bell, RefreshCw, Check, CheckCheck, Clock, ExternalLink, Calendar, MessageSquare } from 'lucide-react'
import { toast } from 'sonner'

type NotificationRow = {
  id: number
  user_id: number
  type: string
  title: string | null
  message: string | null
  data: any
  read_at: string | null
  created_at: string
}

function getTargetHref(n: NotificationRow): string | null {
  const st = n?.data?.source_type
  const sid = n?.data?.source_id
  if (st === 'event' && Number.isFinite(sid)) return `/events/${sid}`
  if (st === 'comment') return null
  return null
}

export default function MeNotificationsPage() {
  const [items, setItems] = useState<NotificationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  async function load() {
    try {
      setLoading(true)
      setError(null)
      const res = await api.get<NotificationRow[]>('/api/notifications?limit=50&offset=0')
      setItems(Array.isArray(res.data) ? res.data : [])
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Erreur chargement')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function markRead(id: number) {
    setActionLoading(true)
    try {
      await api.post(`/api/notifications/${id}/read`)
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read_at: n.read_at || new Date().toISOString() } : n)))
      toast.success('Notification marquée comme lue')
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Erreur')
      toast.error('Erreur lors de la mise à jour')
    } finally {
      setActionLoading(false)
    }
  }

  async function markAllRead() {
    setActionLoading(true)
    try {
      await api.post('/api/notifications/read-all')
      setItems((prev) => prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() })))
      toast.success('Toutes les notifications ont été marquées comme lues')
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Erreur')
      toast.error('Erreur lors de la mise à jour')
    } finally {
      setActionLoading(false)
    }
  }

  const unreadCount = items.filter((n) => !n.read_at).length
  const readCount = items.filter((n) => n.read_at).length

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Skeleton className="h-10 w-64 bg-gradient-to-r from-white/10 to-white/5 rounded-xl" />
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="ampia-glass p-6 space-y-3 animate-pulse">
              <Skeleton className="h-5 w-3/4 bg-gradient-to-r from-white/10 to-white/5 rounded" />
              <Skeleton className="h-4 w-1/2 bg-gradient-to-r from-white/10 to-white/5 rounded" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-yellow-500/20 to-orange-500/20 backdrop-blur-sm">
            <Bell className="h-6 w-6 text-yellow-300" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">Notifications</h1>
            <p className="text-sm text-white/60 mt-1">
              {unreadCount} non lue{unreadCount > 1 ? 's' : ''} · {readCount} lue{readCount > 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={load}
            disabled={actionLoading}
            className="glass-input"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${actionLoading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
          {unreadCount > 0 && (
            <Button
              variant="default"
              size="sm"
              onClick={markAllRead}
              disabled={actionLoading}
              className="btn-primary"
            >
              <CheckCheck className="h-4 w-4 mr-2" />
              Tout marquer comme lu
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="animate-scale-in rounded-xl border border-red-500/30 bg-gradient-to-r from-red-500/20 to-rose-500/20 p-4 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <span className="text-lg">⚠️</span>
            <div className="text-sm text-red-200">{error}</div>
          </div>
        </div>
      )}

      {/* Notifications List */}
      {items.length === 0 ? (
        <div className="ampia-glass p-12 text-center">
          <div className="text-6xl mb-4">🔔</div>
          <h3 className="text-xl font-semibold text-white mb-2">Aucune notification</h3>
          <p className="text-white/70">Vous serez notifié ici des activités importantes concernant vos événements et interactions.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((n) => {
            const href = getTargetHref(n)
            const unread = !n.read_at
            
            return (
              <div
                key={n.id}
                className={`group ampia-glass p-6 space-y-3 animate-slide-up transition-all duration-300 ${
                  unread 
                    ? 'border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-orange-500/10 ring-1 ring-amber-500/20' 
                    : 'opacity-80 hover:opacity-100'
                }`}
                style={{ animationDelay: `${items.indexOf(n) * 50}ms` }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <div className={`flex-shrink-0 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r backdrop-blur-sm ${
                      n.type.includes('event') 
                        ? 'from-purple-500/20 to-pink-500/20'
                        : n.type.includes('comment')
                        ? 'from-blue-500/20 to-cyan-500/20'
                        : 'from-green-500/20 to-emerald-500/20'
                    }`}>
                      {n.type.includes('event') ? (
                        <Calendar className="h-6 w-6 text-purple-300" />
                      ) : n.type.includes('comment') ? (
                        <MessageSquare className="h-6 w-6 text-blue-300" />
                      ) : (
                        <Bell className="h-6 w-6 text-green-300" />
                      )}
                    </div>
                    
                    <div className="flex-1 space-y-2 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className={`text-base font-bold ${unread ? 'text-white' : 'text-white/80'}`}>
                          {n.title || n.type}
                        </h3>
                        {unread && (
                          <span className="inline-flex h-2 w-2 rounded-full bg-gradient-to-r from-amber-400 to-orange-400 animate-pulse" />
                        )}
                      </div>
                      
                      {n.message && (
                        <p className={`text-sm leading-relaxed ${unread ? 'text-white/90' : 'text-white/70'}`}>
                          {n.message}
                        </p>
                      )}
                      
                      <div className="flex items-center gap-3 text-xs text-white/60 pt-2 border-t border-white/10">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{new Date(n.created_at).toLocaleString('fr-FR', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}</span>
                        </div>
                        {href && (
                          <Link
                            to={href}
                            className="flex items-center gap-1 text-purple-300 hover:text-purple-200 transition-colors"
                          >
                            <ExternalLink className="h-3 w-3" />
                            <span>Voir</span>
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Action */}
                  <div className="flex-shrink-0">
                    {unread ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={actionLoading}
                        onClick={() => markRead(n.id)}
                        className="glass-input hover:bg-white/10"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    ) : (
                      <div className="flex h-9 w-9 items-center justify-center rounded-full border border-green-500/30 bg-green-500/20 text-green-300">
                        <Check className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
