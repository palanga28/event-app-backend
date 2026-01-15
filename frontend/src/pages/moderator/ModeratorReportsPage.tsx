import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../../lib/api'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Flag, Shield, CheckCircle, XCircle, Clock, User, Calendar, Filter, Check, X } from 'lucide-react'
import { toast } from 'sonner'

type Organizer = {
  id: number
  name: string
  email: string
}

type Report = {
  id: number
  type: 'event' | 'user' | string
  target_id: number
  reason: string | null
  status: 'pending' | 'resolved' | string
  reported_by: number | null
  resolved_by: number | null
  resolved_action: string | null
  resolved_reason: string | null
  resolved_at: string | null
  created_at: string
  updated_at: string
  reporter?: Organizer | null
  resolver?: Organizer | null
  target?: any
}

export default function ModeratorReportsPage() {
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [statusFilter, setStatusFilter] = useState<string>('pending')
  const [typeFilter, setTypeFilter] = useState<string>('')

  const [resolveAction, setResolveAction] = useState<'dismissed' | 'action_taken'>('dismissed')
  const [resolveReason, setResolveReason] = useState('')
  const [resolvingId, setResolvingId] = useState<number | null>(null)
  const [resolveError, setResolveError] = useState<string | null>(null)

  const query = useMemo(() => {
    const params = new URLSearchParams()
    params.set('limit', '50')
    params.set('offset', '0')
    if (statusFilter) params.set('status', statusFilter)
    if (typeFilter) params.set('type', typeFilter)
    return params.toString()
  }, [statusFilter, typeFilter])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get<Report[]>(`/api/moderator/reports?${query}`)
      setReports(res.data)
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Erreur chargement')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [query])

  const [resolveDialogOpen, setResolveDialogOpen] = useState(false)
  const [selectedReport, setSelectedReport] = useState<Report | null>(null)
  const navigate = useNavigate()

  async function resolveReport() {
    if (!selectedReport) return
    
    setResolveError(null)
    setResolvingId(selectedReport.id)
    try {
      await api.put(`/api/moderator/reports/${selectedReport.id}/resolve`, {
        action: resolveAction,
        reason: resolveReason || null,
      })
      setResolveReason('')
      setResolveDialogOpen(false)
      setSelectedReport(null)
      await load()
      toast.success('Signalement résolu avec succès')
    } catch (e: any) {
      setResolveError(e?.response?.data?.message || e?.message || 'Erreur résolution')
      toast.error('Erreur lors de la résolution du signalement')
    } finally {
      setResolvingId(null)
    }
  }

  function openResolveDialog(report: Report) {
    setSelectedReport(report)
    setResolveReason('')
    setResolveAction('dismissed')
    setResolveDialogOpen(true)
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64 bg-white/10" />
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
          <Skeleton className="h-4 w-1/3 bg-white/10" />
          <Skeleton className="mt-3 h-4 w-1/2 bg-white/10" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
              <Skeleton className="h-4 w-2/3 bg-white/10" />
              <Skeleton className="mt-2 h-3 w-1/2 bg-white/10" />
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

  const pendingCount = reports.filter((r) => r.status === 'pending').length
  const resolvedCount = reports.filter((r) => r.status === 'resolved').length

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Resolve Dialog */}
      <Dialog open={resolveDialogOpen} onOpenChange={setResolveDialogOpen}>
        <DialogContent className="ampia-glass border-white/10 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Shield className="h-5 w-5 text-amber-400" />
              Résoudre le signalement #{selectedReport?.id}
            </DialogTitle>
            <DialogDescription className="text-white/70">
              Choisissez l'action à prendre pour ce signalement et ajoutez une raison si nécessaire.
            </DialogDescription>
          </DialogHeader>

          {resolveError && (
            <div className="rounded-xl border border-red-500/30 bg-gradient-to-r from-red-500/20 to-rose-500/20 p-4 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <X className="h-5 w-5 text-red-300" />
                <div className="text-sm text-red-200">{resolveError}</div>
              </div>
            </div>
          )}

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-white/90">Action</label>
              <select
                className="glass-input w-full"
                value={resolveAction}
                onChange={(e) => setResolveAction(e.target.value as any)}
              >
                <option value="dismissed">Rejeté (signalement non fondé)</option>
                <option value="action_taken">Action prise</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-white/90">
                Raison (optionnelle)
              </label>
              <textarea
                className="glass-input w-full min-h-[100px] resize-none"
                value={resolveReason}
                onChange={(e) => setResolveReason(e.target.value)}
                placeholder="Expliquez pourquoi ce signalement a été résolu de cette manière..."
                rows={4}
                maxLength={500}
              />
              <div className="text-xs text-white/50 text-right">{resolveReason.length} / 500</div>
            </div>

            {selectedReport && (
              <div className="ampia-glass p-4 space-y-2 bg-white/5 border border-white/10">
                <div className="text-xs font-medium text-white/70 uppercase tracking-wide">Détails du signalement</div>
                <div className="text-sm text-white/90">
                  <strong>Type:</strong> {selectedReport.type === 'event' ? 'Événement' : 'Utilisateur'}
                </div>
                {selectedReport.reason && (
                  <div className="text-sm text-white/90">
                    <strong>Raison:</strong> {selectedReport.reason}
                  </div>
                )}
                <div className="text-xs text-white/60">
                  Signalé le {new Date(selectedReport.created_at).toLocaleString('fr-FR')}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setResolveDialogOpen(false)
                setSelectedReport(null)
                setResolveReason('')
              }}
              className="glass-input"
            >
              Annuler
            </Button>
            <Button
              onClick={resolveReport}
              disabled={resolvingId !== null}
              className="btn-primary"
            >
              {resolvingId !== null ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Résolution...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Résoudre
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 backdrop-blur-sm">
            <Shield className="h-6 w-6 text-amber-300" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">Signalements</h1>
            <p className="text-sm text-white/60 mt-1">
              {pendingCount} en attente · {resolvedCount} résolus
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="ampia-glass p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-white/60" />
          <h3 className="text-sm font-semibold text-white/90 uppercase tracking-wide">Filtres</h3>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <label className="block space-y-2">
            <span className="text-xs text-white/70">Statut</span>
            <select
              className="glass-input text-sm w-full md:w-48"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="pending">⏳ En attente ({pendingCount})</option>
              <option value="resolved">✅ Résolus ({resolvedCount})</option>
              <option value="">Tous ({reports.length})</option>
            </select>
          </label>

          <label className="block space-y-2">
            <span className="text-xs text-white/70">Type</span>
            <select
              className="glass-input text-sm w-full md:w-48"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="">Tous les types</option>
              <option value="event">📅 Événements</option>
              <option value="user">👤 Utilisateurs</option>
            </select>
          </label>
        </div>
      </div>

      {/* Reports List */}
      {reports.length === 0 ? (
        <div className="ampia-glass p-12 text-center">
          <div className="text-6xl mb-4">✅</div>
          <h3 className="text-xl font-semibold text-white mb-2">Aucun signalement</h3>
          <p className="text-white/70">
            {statusFilter === 'pending'
              ? 'Aucun signalement en attente pour le moment.'
              : 'Aucun signalement trouvé avec ces filtres.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map((r) => (
            <div
              key={r.id}
              className="group ampia-glass p-6 space-y-4 animate-slide-up"
              style={{ animationDelay: `${reports.indexOf(r) * 50}ms` }}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4 flex-1">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r ${
                    r.type === 'event' 
                      ? 'from-purple-500/20 to-pink-500/20' 
                      : 'from-blue-500/20 to-cyan-500/20'
                  } backdrop-blur-sm`}>
                    {r.type === 'event' ? (
                      <Calendar className="h-6 w-6 text-purple-300" />
                    ) : (
                      <User className="h-6 w-6 text-blue-300" />
                    )}
                  </div>
                  
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-white/60">#{r.id}</span>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium backdrop-blur-sm ${
                          r.status === 'pending'
                            ? 'border border-amber-500/30 bg-amber-500/20 text-amber-200'
                            : 'border border-green-500/30 bg-green-500/20 text-green-200'
                        }`}>
                          {r.status === 'pending' ? (
                            <>
                              <Clock className="h-3 w-3" />
                              En attente
                            </>
                          ) : (
                            <>
                              <CheckCircle className="h-3 w-3" />
                              Résolu
                            </>
                          )}
                        </span>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium backdrop-blur-sm ${
                          r.type === 'event'
                            ? 'border border-purple-500/30 bg-purple-500/20 text-purple-200'
                            : 'border border-blue-500/30 bg-blue-500/20 text-blue-200'
                        }`}>
                          {r.type === 'event' ? '📅 Événement' : '👤 Utilisateur'}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="text-sm font-semibold text-white">
                        Cible: {r.type === 'event' ? 'Événement' : 'Utilisateur'} #{r.target_id}
                      </div>
                      {r.reason && (
                        <div className="text-sm text-white/80 p-3 rounded-lg bg-white/5 border border-white/10">
                          {r.reason}
                        </div>
                      )}
                    </div>

                    {/* Metadata */}
                    <div className="flex flex-wrap items-center gap-4 text-xs text-white/60 pt-2 border-t border-white/10">
                      {r.reporter && (
                        <div className="flex items-center gap-2">
                          <User className="h-3 w-3" />
                          <span>Signalé par: {r.reporter.name}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Clock className="h-3 w-3" />
                        <span>{new Date(r.created_at).toLocaleString('fr-FR')}</span>
                      </div>
                      {r.resolved_at && r.resolver && (
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-3 w-3 text-green-400" />
                          <span>Résolu par {r.resolver.name} le {new Date(r.resolved_at).toLocaleDateString('fr-FR')}</span>
                        </div>
                      )}
                    </div>

                    {/* Resolution Info */}
                    {r.status === 'resolved' && r.resolved_action && (
                      <div className="p-3 rounded-lg bg-white/5 border border-white/10 space-y-1">
                        <div className="text-xs font-medium text-white/70 uppercase tracking-wide">Résolution</div>
                        <div className="text-sm text-white/90">
                          <strong>Action:</strong> {r.resolved_action === 'dismissed' ? 'Rejeté' : 'Action prise'}
                        </div>
                        {r.resolved_reason && (
                          <div className="text-sm text-white/80 mt-1">{r.resolved_reason}</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2">
                  {r.type === 'event' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/events/${r.target_id}`)}
                      className="glass-input"
                    >
                      <Calendar className="h-4 w-4 mr-2" />
                      Voir
                    </Button>
                  )}
                  {r.type === 'user' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/users/${r.target_id}`)}
                      className="glass-input"
                    >
                      <User className="h-4 w-4 mr-2" />
                      Voir
                    </Button>
                  )}
                  {r.status === 'pending' && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => openResolveDialog(r)}
                      disabled={resolvingId === r.id}
                      className="btn-primary"
                    >
                      {resolvingId === r.id ? (
                        <>
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                          Résolution...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4" />
                          Résoudre
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
