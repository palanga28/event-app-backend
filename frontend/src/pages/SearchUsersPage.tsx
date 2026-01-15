import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../lib/api'
import { Skeleton } from '@/components/ui/skeleton'

type UserResult = {
  id: number
  name: string
  avatar_url?: string | null
  bio?: string | null
}

export default function SearchUsersPage() {
  const [params] = useSearchParams()
  const q = useMemo(() => (params.get('q') || '').trim(), [params])

  const [results, setResults] = useState<UserResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        setError(null)

        if (!q) {
          setResults([])
          return
        }

        setLoading(true)
        const res = await api.get<UserResult[]>(`/api/users/search?q=${encodeURIComponent(q)}&limit=50`)
        if (!cancelled) setResults(Array.isArray(res.data) ? res.data : [])
      } catch (e: any) {
        if (!cancelled) setError(e?.response?.data?.message || e?.message || 'Erreur recherche')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [q])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Recherche utilisateurs</h1>
        <div className="text-xs text-white/60">Nom seulement</div>
      </div>

      <div className="text-sm text-white/70">
        Requête: {q ? <span className="font-medium text-white">{q}</span> : '—'}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-[0_0_0_1px_rgba(0,255,234,0.06)] backdrop-blur"
            >
              <div className="flex items-start gap-3">
                <Skeleton className="h-12 w-12 rounded-full bg-white/10" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/2 bg-white/10" />
                  <Skeleton className="h-3 w-5/6 bg-white/10" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>
      ) : null}

      {!loading && !error ? (
        results.length === 0 ? (
          <div className="text-sm text-white/70">Aucun utilisateur trouvé.</div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {results.map((u) => (
              <Link
                key={u.id}
                to={`/users/${u.id}`}
                className="group rounded-2xl border border-white/10 bg-white/5 p-4 shadow-[0_0_0_1px_rgba(0,255,234,0.06)] backdrop-blur transition hover:border-cyan-300/30 hover:shadow-[0_0_0_1px_rgba(0,255,234,0.18),0_0_60px_rgba(168,85,247,0.10)]"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-white/5">
                    {u.avatar_url ? (
                      <img src={u.avatar_url} alt={u.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="text-[10px] text-white/60">No avatar</div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium tracking-tight text-white">{u.name}</div>
                    {u.bio ? <div className="mt-1 line-clamp-2 text-xs text-white/70">{u.bio}</div> : null}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )
      ) : null}
    </div>
  )
}
