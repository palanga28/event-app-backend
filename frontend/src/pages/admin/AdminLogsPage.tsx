import { useEffect, useMemo, useState } from 'react'
import { api } from '../../lib/api'
import { Skeleton } from '@/components/ui/skeleton'

type Actor = { id: number; name: string; email: string }

type AuditLog = {
  id: number
  actor_id: number | null
  action: string
  entity_type: string | null
  entity_id: number | null
  metadata: any
  ip: string | null
  created_at: string
  actor?: Actor | null
}

function getMetadataSummary(log: AuditLog): string {
  if (log.action === 'event_featured') {
    const prev = log?.metadata?.previous?.featured
    const next = log?.metadata?.next?.featured
    if (typeof prev === 'boolean' && typeof next === 'boolean') return `featured: ${prev} → ${next}`
  }

  if (log?.metadata == null) return '-'

  try {
    if (typeof log.metadata === 'string') return log.metadata
    return Object.keys(log.metadata).slice(0, 6).join(', ') || '-'
  } catch {
    return '-'
  }
}

function getActionLabel(log: AuditLog): string {
  if (log.action === 'event_featured') {
    const prev = log?.metadata?.previous?.featured
    const next = log?.metadata?.next?.featured
    if (prev === false && next === true) return 'Feature'
    if (prev === true && next === false) return 'Unfeature'
    return 'Feature toggle'
  }

  return log.action
}

function formatMetadataValue(v: unknown): string {
  if (v == null) return '-'
  if (typeof v === 'string') return v
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  try {
    return JSON.stringify(v)
  } catch {
    return String(v)
  }
}

function getMetadataPairs(log: AuditLog): Array<{ k: string; v: string }> {
  if (!log?.metadata) return []

  if (typeof log.metadata === 'string') {
    return [{ k: 'metadata', v: log.metadata }]
  }

  if (typeof log.metadata !== 'object') {
    return [{ k: 'metadata', v: formatMetadataValue(log.metadata) }]
  }

  try {
    return Object.entries(log.metadata as Record<string, unknown>)
      .slice(0, 8)
      .map(([k, v]) => ({ k, v: formatMetadataValue(v) }))
  } catch {
    return []
  }
}

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [action, setAction] = useState('')

  const query = useMemo(() => {
    const params = new URLSearchParams()
    params.set('limit', '100')
    params.set('offset', '0')
    if (action) params.set('action', action)
    return params.toString()
  }, [action])

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        setLoading(true)
        setError(null)
        const res = await api.get<AuditLog[]>(`/api/admin/logs?${query}`)
        if (!cancelled) setLogs(res.data)
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

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-40 bg-white/10" />
        <Skeleton className="h-10 w-72 bg-white/10" />
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
              <Skeleton className="h-4 w-2/3 bg-white/10" />
              <Skeleton className="mt-2 h-3 w-1/3 bg-white/10" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Admin - Logs</h1>
        <input
          className="w-72 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40"
          value={action}
          onChange={(e) => setAction(e.target.value)}
          placeholder="Filtrer action (ex: event_featured)"
        />
      </div>

      {logs.length === 0 ? (
        <div className="text-sm text-white/70">Aucun log.</div>
      ) : (
        <div className="space-y-3">
          {logs.map((l) => (
            <div
              key={l.id}
              className="rounded-2xl border border-white/10 bg-white/5 p-4 text-white shadow-[0_0_0_1px_rgba(168,85,247,0.10)] backdrop-blur"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-sm text-white/60">#{l.id}</div>
                  <div className="font-medium">{getActionLabel(l)}</div>
                  <div className="text-xs text-white/60">{l.action}</div>
                  <div className="mt-1 text-sm text-white/70">
                    {l.entity_type || '-'} {l.entity_id ?? ''}
                  </div>
                  <div className="mt-2 text-xs text-white/60">Metadata: {getMetadataSummary(l)}</div>
                  <div className="mt-2 text-xs text-white/60">
                    {new Date(l.created_at).toLocaleString()} | {l.ip || 'no-ip'}
                  </div>
                  {l.actor ? (
                    <div className="mt-1 text-xs text-white/60">Actor: {l.actor.name}</div>
                  ) : null}
                </div>

                <details className="max-w-full">
                  <summary className="cursor-pointer select-none text-sm text-white/80">Détails</summary>
                  <div className="mt-2 w-full max-w-2xl rounded-2xl border border-white/10 bg-white/5 p-4 text-white shadow-[0_0_0_1px_rgba(0,255,234,0.05)] backdrop-blur">
                    {l.action === 'event_featured' ? (
                      <div className="space-y-3">
                        <div className="text-xs text-white/60">Changement</div>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                            <div className="text-xs text-white/60">Avant</div>
                            <div className="mt-1 inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2 py-1 text-xs">
                              featured: {formatMetadataValue(l?.metadata?.previous?.featured)}
                            </div>
                          </div>
                          <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                            <div className="text-xs text-white/60">Après</div>
                            <div className="mt-1 inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2 py-1 text-xs">
                              featured: {formatMetadataValue(l?.metadata?.next?.featured)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : getMetadataPairs(l).length ? (
                      <div className="space-y-3">
                        <div className="text-xs text-white/60">Metadata</div>
                        <div className="grid grid-cols-1 gap-2">
                          {getMetadataPairs(l).map((p) => (
                            <div
                              key={p.k}
                              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2"
                            >
                              <div className="text-xs text-white/70">{p.k}</div>
                              <div className="max-w-full truncate text-xs text-white/90">{p.v}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-white/70">Aucune metadata.</div>
                    )}

                    <details className="mt-3">
                      <summary className="cursor-pointer select-none text-xs text-white/60">JSON brut</summary>
                      <pre className="mt-2 max-w-full overflow-auto rounded-md border border-white/10 bg-black/30 p-3 text-xs text-white/80">
{JSON.stringify(l.metadata, null, 2)}
                      </pre>
                    </details>
                  </div>
                </details>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
