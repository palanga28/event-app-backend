import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import { Skeleton } from '@/components/ui/skeleton'
import { BarChart3, Users, Calendar, Ticket, TrendingUp, DollarSign } from 'lucide-react'
import { SimpleBarChart, SimpleLineChart } from '@/components/ui/simple-chart'

type Stats = {
  users: { total: number; newThisMonth: number }
  events: { total: number; published: number; draft: number }
  tickets: { total: number; sold: number; cancelled: number; revenue: number }
  ticketTypes: { total: number; active: number }
}

type TimelinePoint = {
  date: string
  label: string
  users: number
  events: number
  tickets: number
  revenue: number
}

type TimelineData = {
  timeline: TimelinePoint[]
  totals: { users: number; events: number; tickets: number; revenue: number }
  days: number
}

export default function AdminStatsPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [timeline, setTimeline] = useState<TimelineData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        setLoading(true)
        setError(null)
        const [statsRes, timelineRes] = await Promise.all([
          api.get<Stats>('/api/admin/stats'),
          api.get<TimelineData>('/api/admin/stats/timeline?days=14'),
        ])
        if (!cancelled) {
          setStats(statsRes.data)
          setTimeline(timelineRes.data)
        }
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
      <div className="space-y-6 animate-fade-in">
        <Skeleton className="h-10 w-64 bg-gradient-to-r from-white/10 to-white/5 rounded-xl" />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="ampia-glass p-6 space-y-4 animate-pulse">
              <Skeleton className="h-12 w-12 rounded-xl bg-gradient-to-r from-white/10 to-white/5" />
              <Skeleton className="h-4 w-24 bg-gradient-to-r from-white/10 to-white/5 rounded" />
              <Skeleton className="h-8 w-32 bg-gradient-to-r from-white/10 to-white/5 rounded" />
              <Skeleton className="h-3 w-full bg-gradient-to-r from-white/10 to-white/5 rounded" />
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
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500/20">
              <span className="text-lg">⚠️</span>
            </div>
            <div className="text-sm text-red-200">{error}</div>
          </div>
        </div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="ampia-glass p-12 text-center">
        <div className="text-6xl mb-4">📊</div>
        <h3 className="text-xl font-semibold text-white mb-2">Aucune donnée disponible</h3>
        <p className="text-white/70">Les statistiques ne sont pas encore disponibles.</p>
      </div>
    )
  }

  const statCards = [
    {
      icon: Users,
      title: 'Utilisateurs',
      value: stats.users.total,
      subtitle: `+${stats.users.newThisMonth} nouveaux (30j)`,
      gradient: 'from-blue-500/20 to-cyan-500/20',
      iconColor: 'text-blue-300',
      iconBg: 'from-blue-500/20 to-cyan-500/20',
    },
    {
      icon: Calendar,
      title: 'Événements',
      value: stats.events.total,
      subtitle: `${stats.events.published} publiés · ${stats.events.draft} brouillons`,
      gradient: 'from-purple-500/20 to-pink-500/20',
      iconColor: 'text-purple-300',
      iconBg: 'from-purple-500/20 to-pink-500/20',
    },
    {
      icon: Ticket,
      title: 'Tickets',
      value: stats.tickets.total,
      subtitle: `${stats.tickets.sold} vendus · ${stats.tickets.cancelled} annulés`,
      gradient: 'from-green-500/20 to-emerald-500/20',
      iconColor: 'text-green-300',
      iconBg: 'from-green-500/20 to-emerald-500/20',
    },
    {
      icon: DollarSign,
      title: 'Revenus',
      value: `${stats.tickets.revenue} FC`,
      subtitle: `${stats.ticketTypes.active} types actifs · ${stats.ticketTypes.total} total`,
      gradient: 'from-amber-500/20 to-orange-500/20',
      iconColor: 'text-amber-300',
      iconBg: 'from-amber-500/20 to-orange-500/20',
    },
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-red-500/20 to-rose-500/20 backdrop-blur-sm">
          <BarChart3 className="h-6 w-6 text-red-300" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">Statistiques Administrateur</h1>
          <p className="text-sm text-white/60 mt-1">Vue d'ensemble de la plateforme</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, index) => {
          const Icon = stat.icon
          return (
            <div
              key={stat.title}
              className="ampia-glass p-6 space-y-4 animate-slide-up group hover:border-white/20 transition-all duration-300"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex items-center justify-between">
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r ${stat.iconBg} backdrop-blur-sm`}>
                  <Icon className={`h-6 w-6 ${stat.iconColor}`} />
                </div>
                <div className={`h-3 w-3 rounded-full bg-gradient-to-r ${stat.gradient} opacity-60 group-hover:opacity-100 transition-opacity`} />
              </div>
              
              <div className="space-y-1">
                <div className="text-xs font-medium text-white/60 uppercase tracking-wide">
                  {stat.title}
                </div>
                <div className="text-3xl font-bold text-white">
                  {stat.value}
                </div>
                <div className="text-xs text-white/70 line-clamp-2">
                  {stat.subtitle}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Timeline Charts */}
      {timeline && timeline.timeline.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="ampia-glass p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-blue-400" />
                <h3 className="text-lg font-semibold text-white">Nouveaux utilisateurs</h3>
              </div>
              <span className="text-xs text-white/50">{timeline.days} derniers jours</span>
            </div>
            <div className="text-2xl font-bold text-blue-300">+{timeline.totals.users}</div>
            <SimpleBarChart
              data={timeline.timeline.map(t => ({ label: t.label, value: t.users }))}
              height={100}
              barColor="from-blue-500 to-cyan-500"
              showLabels={true}
              showValues={true}
            />
          </div>

          <div className="ampia-glass p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-purple-400" />
                <h3 className="text-lg font-semibold text-white">Nouveaux événements</h3>
              </div>
              <span className="text-xs text-white/50">{timeline.days} derniers jours</span>
            </div>
            <div className="text-2xl font-bold text-purple-300">+{timeline.totals.events}</div>
            <SimpleBarChart
              data={timeline.timeline.map(t => ({ label: t.label, value: t.events }))}
              height={100}
              barColor="from-purple-500 to-pink-500"
              showLabels={true}
              showValues={true}
            />
          </div>

          <div className="ampia-glass p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Ticket className="h-5 w-5 text-green-400" />
                <h3 className="text-lg font-semibold text-white">Tickets vendus</h3>
              </div>
              <span className="text-xs text-white/50">{timeline.days} derniers jours</span>
            </div>
            <div className="text-2xl font-bold text-green-300">+{timeline.totals.tickets}</div>
            <SimpleLineChart
              data={timeline.timeline.map(t => ({ label: t.label, value: t.tickets }))}
              height={100}
              lineColor="stroke-green-400"
              fillColor="fill-green-500/20"
              showLabels={true}
              showDots={true}
            />
          </div>

          <div className="ampia-glass p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <DollarSign className="h-5 w-5 text-amber-400" />
                <h3 className="text-lg font-semibold text-white">Revenus</h3>
              </div>
              <span className="text-xs text-white/50">{timeline.days} derniers jours</span>
            </div>
            <div className="text-2xl font-bold text-amber-300">{timeline.totals.revenue} FC</div>
            <SimpleLineChart
              data={timeline.timeline.map(t => ({ label: t.label, value: t.revenue }))}
              height={100}
              lineColor="stroke-amber-400"
              fillColor="fill-amber-500/20"
              showLabels={true}
              showDots={true}
            />
          </div>
        </div>
      )}

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="ampia-glass p-6 space-y-4">
          <div className="flex items-center gap-3">
            <TrendingUp className="h-5 w-5 text-green-400" />
            <h3 className="text-lg font-semibold text-white">Résumé des événements</h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
              <span className="text-sm text-white/70">Total</span>
              <span className="text-lg font-bold text-white">{stats.events.total}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-green-500/10 border border-green-500/20">
              <span className="text-sm text-white/70">Publiés</span>
              <span className="text-lg font-bold text-green-300">{stats.events.published}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
              <span className="text-sm text-white/70">Brouillons</span>
              <span className="text-lg font-bold text-yellow-300">{stats.events.draft}</span>
            </div>
          </div>
        </div>

        <div className="ampia-glass p-6 space-y-4">
          <div className="flex items-center gap-3">
            <Ticket className="h-5 w-5 text-blue-400" />
            <h3 className="text-lg font-semibold text-white">Résumé des tickets</h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
              <span className="text-sm text-white/70">Total</span>
              <span className="text-lg font-bold text-white">{stats.tickets.total}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-green-500/10 border border-green-500/20">
              <span className="text-sm text-white/70">Vendus</span>
              <span className="text-lg font-bold text-green-300">{stats.tickets.sold}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <span className="text-sm text-white/70">Annulés</span>
              <span className="text-lg font-bold text-red-300">{stats.tickets.cancelled}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <span className="text-sm text-white/70">Revenus total</span>
              <span className="text-lg font-bold text-gradient">{stats.tickets.revenue} FC</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
