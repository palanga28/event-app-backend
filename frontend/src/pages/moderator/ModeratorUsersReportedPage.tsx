import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../lib/api'
import { Skeleton } from '@/components/ui/skeleton'

type ReportedUser = {
  id: number
  name: string
  email: string
  role?: string
  reportsCount?: number
  lastReport?: string | null
}

export default function ModeratorUsersReportedPage() {
  const [items, setItems] = useState<ReportedUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        setLoading(true)
        setError(null)
        const res = await api.get<ReportedUser[]>('/api/moderator/users/reported')
        if (!cancelled) setItems(res.data)
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
  }, [])

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-72 bg-white/10" />
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
              <Skeleton className="h-4 w-1/2 bg-white/10" />
              <Skeleton className="mt-2 h-3 w-2/3 bg-white/10" />
              <Skeleton className="mt-3 h-3 w-1/3 bg-white/10" />
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
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Modération - Utilisateurs signalés</h1>

      {items.length === 0 ? (
        <div className="text-sm text-white/70">Aucun utilisateur signalé.</div>
      ) : (
        <div className="space-y-3">
          {items.map((it) => (
            <div
              key={it.id}
              className="rounded-2xl border border-white/10 bg-white/5 p-4 text-white shadow-[0_0_0_1px_rgba(0,255,234,0.06)] backdrop-blur"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="font-medium">{it.name || '(sans nom)'}</div>
                  <div className="text-sm text-white/70">{it.email}</div>
                  <div className="mt-1 text-xs text-white/60">
                    Signalements: {it.reportsCount ?? 0}
                    {it.lastReport ? ` | Dernier: ${new Date(it.lastReport).toLocaleString()}` : ''}
                  </div>
                </div>

                <Link
                  className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white hover:bg-white/10"
                  to={`/moderator/users/${it.id}/warn`}
                >
                  Warn
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
