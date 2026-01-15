import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../lib/api'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Activity, Calendar, MessageSquare, Shield, Clock, Eye, CheckCircle, XCircle } from 'lucide-react'

type ActivityItem = {
  id: string
  action: string | null
  type: string
  targetId: number
  moderatorId: number | null
  moderator: { id: number; name: string; email: string } | null
  timestamp: string | null
  category?: 'moderation' | 'publication'
  metadata?: any
}

export default function ModeratorActivityPage() {
  const [items, setItems] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        setLoading(true)
        setError(null)
        const res = await api.get<ActivityItem[]>('/api/moderator/activity')
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
        <Skeleton className="h-8 w-56" />
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="ampia-glass p-4">
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="mt-2 h-3 w-1/3" />
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
      <h1 className="text-2xl font-semibold tracking-tight">Modération - Activité</h1>

      {items.length === 0 ? (
        <div className="text-sm text-white/70">Aucune activité.</div>
      ) : (
        <div className="space-y-3">
          {items.map((it) => (
            <div
              key={it.id}
              className={`ampia-glass p-4 text-white ${
                it.category === 'publication' ? 'border-l-4 border-l-green-500' : ''
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1">
                  {it.category === 'publication' ? (
                    // Affichage pour les publications
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="inline-block w-2 h-2 bg-green-500 rounded-full"></span>
                        <span className="text-xs font-semibold text-green-400 uppercase">Publication</span>
                        {it.type === 'story' && (
                          <span className="text-xs text-purple-400">• Story</span>
                        )}
                        {it.type === 'event' && (
                          <span className="text-xs text-blue-400">• Événement</span>
                        )}
                      </div>
                      <div className="font-medium">
                        {it.moderator ? it.moderator.name : 'Utilisateur'} a publié{' '}
                        {it.type === 'story' ? 'une story' : 'un événement'}
                      </div>
                      {it.metadata?.title && it.type === 'event' && (
                        <div className="text-sm text-white/70 mt-1">
                          « {it.metadata.title} »
                          {it.metadata.location && ` • ${it.metadata.location}`}
                        </div>
                      )}
                      {it.metadata?.caption && it.type === 'story' && (
                        <div className="text-sm text-white/70 mt-1 italic">
                          "{it.metadata.caption}"
                        </div>
                      )}
                    </div>
                  ) : (
                    // Affichage pour les activités de modération
                    <div className="font-medium">
                      {it.moderator ? it.moderator.name : 'Modérateur'} → {it.action || 'Action'} sur {it.type} #{it.targetId}
                    </div>
                  )}
                </div>
                {it.timestamp ? (
                  <div className="text-xs text-white/60 whitespace-nowrap">
                    {new Date(it.timestamp).toLocaleString()}
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
