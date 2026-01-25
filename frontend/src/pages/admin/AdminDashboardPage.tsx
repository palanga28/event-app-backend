import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { api } from '../../lib/api'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { 
  LayoutDashboard,
  Users,
  Calendar,
  Ticket,
  CreditCard,
  Flag,
  FileText,
  Settings,
  Trophy,
  TrendingUp,
  TrendingDown,
  DollarSign,
  UserPlus,
  CalendarPlus,
  TicketCheck,
  RefreshCw,
  ChevronRight,
  Activity,
  PieChart,
  BarChart3,
  ShieldCheck,
  BadgeCheck
} from 'lucide-react'

type Stats = {
  users: { total: number; newThisMonth: number }
  events: { total: number; published: number; draft: number }
  tickets: { total: number; sold: number; cancelled: number; revenue: number }
  ticketTypes: { total: number; active: number }
}

type CommissionStats = {
  totalTransactions: number
  totalAmount: number
  totalOperatorFees: number
  totalAmpiaFees: number
  totalFees: number
  totalOrganizerReceives: number
  byCurrency: Record<string, {
    transactions: number
    amount: number
    operatorFees: number
    ampiaFees: number
    fees: number
    organizerReceives: number
  }>
}

const navItems = [
  { path: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/admin/stats', label: 'Statistiques', icon: BarChart3 },
  { path: '/admin/moderation', label: 'Modération', icon: ShieldCheck },
  { path: '/admin/verifications', label: 'Vérifications', icon: BadgeCheck },
  { path: '/admin/users', label: 'Utilisateurs', icon: Users },
  { path: '/admin/events', label: 'Événements', icon: Calendar },
  { path: '/admin/payments', label: 'Paiements', icon: CreditCard },
  { path: '/admin/tickets', label: 'Tickets', icon: Ticket },
  { path: '/admin/reports', label: 'Signalements', icon: Flag },
  { path: '/admin/challenges', label: 'Défis', icon: Trophy },
  { path: '/admin/logs', label: 'Logs', icon: FileText },
  { path: '/admin/settings', label: 'Paramètres', icon: Settings },
]

export default function AdminDashboardPage() {
  const location = useLocation()
  const [stats, setStats] = useState<Stats | null>(null)
  const [commissionStats, setCommissionStats] = useState<CommissionStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function loadData() {
    setLoading(true)
    setError(null)
    try {
      const [statsRes, commissionRes] = await Promise.all([
        api.get<Stats>('/api/admin/stats'),
        api.get<CommissionStats>('/api/payments/commission-stats').catch(() => ({ data: null }))
      ])
      setStats(statsRes.data)
      setCommissionStats(commissionRes.data)
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Erreur chargement')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const formatCurrency = (amount: number, currency: string = 'CDF') => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount) + ' ' + currency
  }

  if (loading) {
    return (
      <div className="flex gap-6">
        {/* Sidebar Skeleton */}
        <div className="hidden lg:block w-64 flex-shrink-0">
          <div className="ampia-glass p-4 space-y-2">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="h-10 bg-white/10 rounded-lg" />
            ))}
          </div>
        </div>
        
        {/* Content Skeleton */}
        <div className="flex-1 space-y-6">
          <Skeleton className="h-10 w-64 bg-white/10 rounded-xl" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-32 bg-white/10 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex gap-6 animate-fade-in">
      {/* Sidebar Navigation */}
      <aside className="hidden lg:block w-64 flex-shrink-0">
        <div className="ampia-glass p-4 sticky top-24">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/10">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-r from-purple-500 to-pink-500">
              <LayoutDashboard className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-white">Admin Panel</h2>
              <p className="text-xs text-white/60">Gestion AMPIA</p>
            </div>
          </div>
          
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.path
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                    isActive 
                      ? 'bg-gradient-to-r from-purple-500/30 to-pink-500/30 text-white border border-purple-500/30' 
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-sm font-medium">{item.label}</span>
                  {isActive && <ChevronRight className="h-4 w-4 ml-auto" />}
                </Link>
              )
            })}
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">Dashboard Administrateur</h1>
            <p className="text-white/60 mt-1">Vue d'ensemble de la plateforme AMPIA</p>
          </div>
          <Button onClick={loadData} variant="outline" className="glass-input">
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualiser
          </Button>
        </div>

        {error && (
          <div className="ampia-glass border-red-500/30 p-4">
            <p className="text-red-300">{error}</p>
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link to="/admin/users" className="ampia-glass p-4 hover:border-blue-500/30 transition-all group">
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/20">
                <Users className="h-5 w-5 text-blue-400" />
              </div>
              <TrendingUp className="h-4 w-4 text-green-400" />
            </div>
            <div className="mt-3">
              <p className="text-2xl font-bold text-white">{stats?.users.total || 0}</p>
              <p className="text-xs text-white/60">Utilisateurs</p>
            </div>
            <div className="mt-2 flex items-center gap-1 text-xs text-green-400">
              <UserPlus className="h-3 w-3" />
              +{stats?.users.newThisMonth || 0} ce mois
            </div>
          </Link>

          <Link to="/admin/events" className="ampia-glass p-4 hover:border-purple-500/30 transition-all group">
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/20">
                <Calendar className="h-5 w-5 text-purple-400" />
              </div>
              <Activity className="h-4 w-4 text-purple-400" />
            </div>
            <div className="mt-3">
              <p className="text-2xl font-bold text-white">{stats?.events.total || 0}</p>
              <p className="text-xs text-white/60">Événements</p>
            </div>
            <div className="mt-2 flex items-center gap-1 text-xs text-purple-400">
              <CalendarPlus className="h-3 w-3" />
              {stats?.events.published || 0} publiés
            </div>
          </Link>

          <Link to="/admin/tickets" className="ampia-glass p-4 hover:border-amber-500/30 transition-all group">
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/20">
                <Ticket className="h-5 w-5 text-amber-400" />
              </div>
              <TicketCheck className="h-4 w-4 text-amber-400" />
            </div>
            <div className="mt-3">
              <p className="text-2xl font-bold text-white">{stats?.tickets.sold || 0}</p>
              <p className="text-xs text-white/60">Tickets vendus</p>
            </div>
            <div className="mt-2 flex items-center gap-1 text-xs text-amber-400">
              <Ticket className="h-3 w-3" />
              {stats?.tickets.total || 0} total
            </div>
          </Link>

          <Link to="/admin/payments" className="ampia-glass p-4 hover:border-green-500/30 transition-all group">
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/20">
                <DollarSign className="h-5 w-5 text-green-400" />
              </div>
              <TrendingUp className="h-4 w-4 text-green-400" />
            </div>
            <div className="mt-3">
              <p className="text-2xl font-bold text-white">{formatCurrency(stats?.tickets.revenue || 0)}</p>
              <p className="text-xs text-white/60">Revenus</p>
            </div>
          </Link>
        </div>

        {/* Commission Stats */}
        {commissionStats && (
          <div className="ampia-glass p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-r from-green-500/20 to-emerald-500/20">
                <PieChart className="h-5 w-5 text-green-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Commissions</h2>
                <p className="text-xs text-white/60">Répartition des frais (6% total)</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <p className="text-xs text-white/60 uppercase tracking-wide">Frais Opérateur (2%)</p>
                <p className="text-xl font-bold text-blue-400 mt-1">
                  {formatCurrency(commissionStats.totalOperatorFees)}
                </p>
              </div>
              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <p className="text-xs text-white/60 uppercase tracking-wide">Commission AMPIA (4%)</p>
                <p className="text-xl font-bold text-purple-400 mt-1">
                  {formatCurrency(commissionStats.totalAmpiaFees)}
                </p>
              </div>
              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <p className="text-xs text-white/60 uppercase tracking-wide">Total Commissions</p>
                <p className="text-xl font-bold text-green-400 mt-1">
                  {formatCurrency(commissionStats.totalFees)}
                </p>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-white/10">
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/60">Transactions complétées</span>
                <span className="text-white font-medium">{commissionStats.totalTransactions}</span>
              </div>
              <div className="flex items-center justify-between text-sm mt-2">
                <span className="text-white/60">Montant total traité</span>
                <span className="text-white font-medium">{formatCurrency(commissionStats.totalAmount)}</span>
              </div>
              <div className="flex items-center justify-between text-sm mt-2">
                <span className="text-white/60">Reversé aux organisateurs</span>
                <span className="text-green-400 font-medium">{formatCurrency(commissionStats.totalOrganizerReceives)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link to="/admin/users" className="ampia-glass p-4 hover:border-white/20 transition-all group">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-blue-400" />
              <span className="font-medium text-white">Gérer les utilisateurs</span>
              <ChevronRight className="h-4 w-4 text-white/40 ml-auto group-hover:text-white/80 transition-colors" />
            </div>
          </Link>
          
          <Link to="/admin/events" className="ampia-glass p-4 hover:border-white/20 transition-all group">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-purple-400" />
              <span className="font-medium text-white">Gérer les événements</span>
              <ChevronRight className="h-4 w-4 text-white/40 ml-auto group-hover:text-white/80 transition-colors" />
            </div>
          </Link>
          
          <Link to="/admin/reports" className="ampia-glass p-4 hover:border-white/20 transition-all group">
            <div className="flex items-center gap-3">
              <Flag className="h-5 w-5 text-red-400" />
              <span className="font-medium text-white">Voir les signalements</span>
              <ChevronRight className="h-4 w-4 text-white/40 ml-auto group-hover:text-white/80 transition-colors" />
            </div>
          </Link>
        </div>

        {/* Mobile Navigation */}
        <div className="lg:hidden ampia-glass p-4">
          <h3 className="text-sm font-medium text-white/60 mb-3">Navigation rapide</h3>
          <div className="grid grid-cols-2 gap-2">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <Icon className="h-4 w-4 text-white/60" />
                  <span className="text-sm text-white">{item.label}</span>
                </Link>
              )
            })}
          </div>
        </div>
      </main>
    </div>
  )
}
