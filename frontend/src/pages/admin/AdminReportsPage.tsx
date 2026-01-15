import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../lib/api'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { FileText, Calendar, User, Filter, Clock, CheckCircle, XCircle, Ban, AlertTriangle, Trash2, RefreshCw } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

type UserLite = { id: number; name: string; email: string }

type Report = {
  id: number
  type: string
  target_id: number
  reason: string | null
  status: string
  reported_by: number | null
  resolved_by: number | null
  resolved_action: string | null
  resolved_reason: string | null
  resolved_at: string | null
  created_at: string
  updated_at: string
  reporter?: UserLite | null
  resolver?: UserLite | null
  target?: any
}

function getTargetSummary(r: Report): string {
  const t = r.target
  if (!t) return `${r.type} #${r.target_id}`

  if (r.type === 'event') {
    if (typeof t.title === 'string' && t.title.trim()) return `event: ${t.title}`
    return `event #${r.target_id}`
  }

  if (r.type === 'user') {
    const name = typeof t.name === 'string' ? t.name.trim() : ''
    const email = typeof t.email === 'string' ? t.email.trim() : ''
    if (name && email) return `user: ${name} (${email})`
    if (name) return `user: ${name}`
    if (email) return `user: ${email}`
    return `user #${r.target_id}`
  }

  return `${r.type} #${r.target_id}`
}

function getTargetPrettyLines(r: Report): string[] {
  const t = r.target
  if (!t) return []

  if (r.type === 'user') {
    const out: string[] = []
    if (typeof t.name === 'string' && t.name.trim()) out.push(`Nom: ${t.name}`)
    if (typeof t.email === 'string' && t.email.trim()) out.push(`Email: ${t.email}`)
    if (typeof t.role === 'string' && t.role.trim()) out.push(`Rôle: ${t.role}`)
    return out
  }

  if (r.type === 'event') {
    const out: string[] = []
    if (typeof t.title === 'string' && t.title.trim()) out.push(`Titre: ${t.title}`)
    if (typeof t.date === 'string' && t.date.trim()) out.push(`Date: ${t.date}`)
    if (typeof t.location === 'string' && t.location.trim()) out.push(`Lieu: ${t.location}`)
    return out
  }

  return []
}

export default function AdminReportsPage() {
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [resolvingId, setResolvingId] = useState<number | null>(null)

  const [status, setStatus] = useState('')
  const [type, setType] = useState('')

  async function resolveReport(reportId: number, action: string, reason?: string) {
    setResolvingId(reportId)
    try {
      await api.put(`/api/admin/reports/${reportId}/resolve`, { action, reason })
      setReports(prev => prev.map(r => 
        r.id === reportId 
          ? { ...r, status: 'resolved', resolved_action: action, resolved_reason: reason || null }
          : r
      ))
      toast.success(`Signalement ${action === 'dismissed' ? 'rejeté' : 'résolu'}`)
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Erreur résolution')
    } finally {
      setResolvingId(null)
    }
  }

  const query = useMemo(() => {
    const params = new URLSearchParams()
    params.set('limit', '50')
    params.set('offset', '0')
    if (status) params.set('status', status)
    if (type) params.set('type', type)
    return params.toString()
  }, [status, type])

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        setLoading(true)
        setError(null)
        const res = await api.get<Report[]>(`/api/admin/reports?${query}`)
        if (!cancelled) setReports(res.data)
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
  }, [query])

  const navigate = useNavigate()
  const pendingCount = reports.filter((r) => r.status === 'pending').length
  const resolvedCount = reports.filter((r) => r.status === 'resolved').length

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Skeleton className="h-10 w-64 bg-gradient-to-r from-white/10 to-white/5 rounded-xl" />
        <div className="ampia-glass p-6 space-y-4 animate-pulse">
          <Skeleton className="h-4 w-1/3 bg-gradient-to-r from-white/10 to-white/5 rounded" />
          <Skeleton className="h-4 w-1/2 bg-gradient-to-r from-white/10 to-white/5 rounded" />
        </div>
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="ampia-glass p-6 space-y-3 animate-pulse">
              <Skeleton className="h-5 w-2/3 bg-gradient-to-r from-white/10 to-white/5 rounded" />
              <Skeleton className="h-4 w-1/2 bg-gradient-to-r from-white/10 to-white/5 rounded" />
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
            <XCircle className="h-5 w-5 text-red-300" />
            <div className="text-sm text-red-200">{error}</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-red-500/20 to-rose-500/20 backdrop-blur-sm">
          <FileText className="h-6 w-6 text-red-300" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">Signalements Admin</h1>
          <p className="text-sm text-white/60 mt-1">
            Vue complète de tous les signalements · {pendingCount} en attente · {resolvedCount} résolus
          </p>
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
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="">Tous ({reports.length})</option>
              <option value="pending">⏳ En attente ({pendingCount})</option>
              <option value="resolved">✅ Résolus ({resolvedCount})</option>
            </select>
          </label>

          <label className="block space-y-2">
            <span className="text-xs text-white/70">Type</span>
            <select
              className="glass-input text-sm w-full md:w-48"
              value={type}
              onChange={(e) => setType(e.target.value)}
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
          <div className="text-6xl mb-4">📋</div>
          <h3 className="text-xl font-semibold text-white mb-2">Aucun signalement</h3>
          <p className="text-white/70">
            {status || type
              ? 'Aucun signalement trouvé avec ces filtres.'
              : 'Aucun signalement n\'a été soumis sur la plateforme.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map((r) => {
            const summary = getTargetSummary(r)
            const prettyLines = getTargetPrettyLines(r)
            
            return (
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
                    
                    <div className="flex-1 space-y-3 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-xs font-medium text-white/60">#{r.id}</span>
                        <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium backdrop-blur-sm ${
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
                        <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium backdrop-blur-sm ${
                          r.type === 'event'
                            ? 'border border-purple-500/30 bg-purple-500/20 text-purple-200'
                            : 'border border-blue-500/30 bg-blue-500/20 text-blue-200'
                        }`}>
                          {r.type === 'event' ? '📅 Événement' : '👤 Utilisateur'}
                        </span>
                      </div>

                      <div className="space-y-2">
                        <div className="text-base font-semibold text-white">
                          {summary}
                        </div>
                        
                        {prettyLines.length > 0 && (
                          <div className="ampia-glass p-3 space-y-1 bg-white/5 border border-white/10">
                            {prettyLines.map((line, idx) => (
                              <div key={idx} className="text-sm text-white/80">{line}</div>
                            ))}
                          </div>
                        )}

                        {r.reason && (
                          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                            <div className="text-xs font-medium text-red-300 mb-1 uppercase tracking-wide">Raison du signalement</div>
                            <div className="text-sm text-white/90">{r.reason}</div>
                          </div>
                        )}
                      </div>

                      {/* Metadata */}
                      <div className="flex flex-wrap items-center gap-4 text-xs text-white/60 pt-3 border-t border-white/10">
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

                      {/* Resolution Details */}
                      {r.status === 'resolved' && (r.resolved_action || r.resolved_reason) && (
                        <div className="ampia-glass p-4 space-y-2 bg-green-500/10 border border-green-500/20">
                          <div className="text-xs font-medium text-green-300 uppercase tracking-wide">Détails de la résolution</div>
                          {r.resolved_action && (
                            <div className="text-sm text-white/90">
                              <strong>Action:</strong> {r.resolved_action === 'dismissed' ? 'Rejeté' : 'Action prise'}
                            </div>
                          )}
                          {r.resolved_reason && (
                            <div className="text-sm text-white/80 mt-1">{r.resolved_reason}</div>
                          )}
                        </div>
                      )}

                      {/* Target JSON (Collapsible) */}
                      {r.target && (
                        <details className="ampia-glass p-3 bg-white/5 border border-white/10 rounded-lg">
                          <summary className="cursor-pointer select-none text-sm font-medium text-white/70 hover:text-white transition-colors flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            Voir les détails JSON
                          </summary>
                          <pre className="mt-3 max-h-64 overflow-auto rounded-lg border border-white/10 bg-black/20 p-3 text-xs text-white/70 font-mono">
                            {JSON.stringify(r.target, null, 2)}
                          </pre>
                        </details>
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
                        className="glass-input whitespace-nowrap"
                      >
                        <Calendar className="h-4 w-4 mr-2" />
                        Voir événement
                      </Button>
                    )}
                    {r.type === 'user' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/users/${r.target_id}`)}
                        className="glass-input whitespace-nowrap"
                      >
                        <User className="h-4 w-4 mr-2" />
                        Voir utilisateur
                      </Button>
                    )}
                    
                    {r.status === 'pending' && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="glass-input whitespace-nowrap border-green-500/30 bg-green-500/10 text-green-200 hover:bg-green-500/20"
                            disabled={resolvingId === r.id}
                          >
                            {resolvingId === r.id ? (
                              <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Résoudre
                              </>
                            )}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="ampia-glass border-white/10 w-56">
                          <DropdownMenuLabel className="text-white/70">Action à prendre</DropdownMenuLabel>
                          <DropdownMenuSeparator className="bg-white/10" />
                          <DropdownMenuItem
                            onClick={() => resolveReport(r.id, 'dismissed')}
                            className="gap-2 text-white/80 hover:bg-white/10 cursor-pointer"
                          >
                            <XCircle className="h-4 w-4 text-gray-400" />
                            Rejeter (non fondé)
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => resolveReport(r.id, 'warning_sent')}
                            className="gap-2 text-amber-300 hover:bg-amber-500/20 cursor-pointer"
                          >
                            <AlertTriangle className="h-4 w-4" />
                            Avertissement envoyé
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => resolveReport(r.id, 'content_removed')}
                            className="gap-2 text-orange-300 hover:bg-orange-500/20 cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4" />
                            Contenu supprimé
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => resolveReport(r.id, 'user_banned')}
                            className="gap-2 text-red-300 hover:bg-red-500/20 cursor-pointer"
                          >
                            <Ban className="h-4 w-4" />
                            Utilisateur banni
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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
