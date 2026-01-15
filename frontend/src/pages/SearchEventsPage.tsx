import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../lib/api'
import { Skeleton } from '@/components/ui/skeleton'

type Tag = {
  id: number
  name: string
  slug: string
}

type EventResult = {
  id: number
  title: string
  description: string | null
  start_date: string
  end_date: string
  location: string | null
  cover_image: string | null
  images?: string[] | null
  featured?: boolean
  tags?: Tag[]
}

export default function SearchEventsPage() {
  const [params] = useSearchParams()
  const q = useMemo(() => (params.get('q') || '').trim(), [params])
  const tagSlugsRaw = useMemo(() => (params.get('tags') || '').trim(), [params])
  const tagSlugs = useMemo(
    () =>
      tagSlugsRaw
        ? tagSlugsRaw
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : [],
    [tagSlugsRaw]
  )

  const [results, setResults] = useState<EventResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        setError(null)

        if (!q && tagSlugs.length === 0) {
          setResults([])
          return
        }

        setLoading(true)
        const qs = new URLSearchParams()
        if (q) qs.set('q', q)
        if (tagSlugs.length) qs.set('tagSlugs', tagSlugs.join(','))
        qs.set('limit', '60')

        const res = await api.get<EventResult[] | { value: EventResult[] }>(`/api/events/search?${qs.toString()}`)
        if (!cancelled) {
          const data = Array.isArray(res.data) ? res.data : (res.data?.value || [])
          setResults(data)
        }
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
  }, [q, tagSlugsRaw])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Recherche événements</h1>
        <div className="text-xs text-white/60">q + tags</div>
      </div>

      <div className="text-sm text-white/70">
        Requête: {q ? <span className="font-medium text-white">{q}</span> : '—'}
        {tagSlugs.length ? <span> · Tags: {tagSlugs.join(', ')}</span> : null}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-[0_0_0_1px_rgba(0,255,234,0.06)] backdrop-blur"
            >
              <Skeleton className="h-40 w-full bg-white/10" />
              <div className="mt-3 space-y-2">
                <Skeleton className="h-4 w-3/4 bg-white/10" />
                <Skeleton className="h-3 w-1/2 bg-white/10" />
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
          <div className="text-sm text-white/70">Aucun événement trouvé.</div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {results.map((ev) => (
              <Link
                key={ev.id}
                to={`/events/${ev.id}`}
                className="group rounded-2xl border border-white/10 bg-white/5 p-4 shadow-[0_0_0_1px_rgba(0,255,234,0.06)] backdrop-blur transition-all duration-300 ease-out motion-safe:hover:-translate-y-0.5 hover:border-cyan-300/30 hover:shadow-[0_0_0_1px_rgba(0,255,234,0.18),0_0_60px_rgba(168,85,247,0.10)]"
              >
                {(() => {
                  const imgs = Array.isArray(ev.images) ? ev.images.filter(Boolean) : []
                  const hero = imgs.length > 0 ? imgs[0] : ev.cover_image
                  return hero ? (
                    <div className="mb-3 overflow-hidden rounded-xl border border-white/10 bg-white/5">
                      <div className="aspect-video w-full bg-black/20">
                        <img
                          src={hero}
                          alt={ev.title}
                          className="h-full w-full object-cover transition-transform duration-500 ease-out motion-safe:group-hover:scale-[1.03]"
                          loading="lazy"
                        />
                      </div>
                    </div>
                  ) : null
                })()}

                <div className="mb-1 flex items-center justify-between gap-2">
                  <div className="text-lg font-medium tracking-tight text-white">{ev.title}</div>
                  {ev.featured ? (
                    <span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-2 py-0.5 text-xs font-medium text-amber-200">
                      Featured
                    </span>
                  ) : null}
                </div>

                {ev.location ? <div className="text-sm text-white/70">{ev.location}</div> : null}

                <div className="mt-2 text-xs text-white/60">
                  {new Date(ev.start_date).toLocaleString()} → {new Date(ev.end_date).toLocaleString()}
                </div>
              </Link>
            ))}
          </div>
        )
      ) : null}
    </div>
  )
}
