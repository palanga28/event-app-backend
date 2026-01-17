import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../lib/api'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { 
  CreditCard,
  Search,
  Filter,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  TrendingUp,
  Calendar,
  User,
  Ticket,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  Percent
} from 'lucide-react'

type Payment = {
  id: number
  user_id: number
  event_id: number
  ticket_type_id: number
  quantity: number
  amount: number
  subtotal?: number
  operator_fee?: number
  ampia_fee?: number
  total_fees?: number
  organizer_receives?: number
  fee_mode?: string
  currency: string
  status: 'pending' | 'completed' | 'failed' | 'cancelled'
  provider: string
  transaction_ref: string
  mobile_number?: string
  created_at: string
  user?: { id: number; name: string; email: string }
  event?: { id: number; title: string }
  ticket_type?: { id: number; name: string; price: number }
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

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [commissionStats, setCommissionStats] = useState<CommissionStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  async function loadData() {
    setLoading(true)
    setError(null)
    try {
      const [paymentsRes, statsRes] = await Promise.all([
        api.get<Payment[]>('/api/admin/payments'),
        api.get<CommissionStats>('/api/payments/commission-stats').catch(() => ({ data: null }))
      ])
      setPayments(paymentsRes.data || [])
      setCommissionStats(statsRes.data)
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium border border-green-500/30 bg-green-500/20 text-green-200">
            <CheckCircle className="h-3 w-3" />
            Complété
          </span>
        )
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium border border-amber-500/30 bg-amber-500/20 text-amber-200">
            <Clock className="h-3 w-3" />
            En attente
          </span>
        )
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium border border-red-500/30 bg-red-500/20 text-red-200">
            <XCircle className="h-3 w-3" />
            Échoué
          </span>
        )
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium border border-gray-500/30 bg-gray-500/20 text-gray-200">
            <XCircle className="h-3 w-3" />
            Annulé
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium border border-white/30 bg-white/20 text-white">
            {status}
          </span>
        )
    }
  }

  const filteredPayments = payments.filter(payment => {
    const matchesSearch = searchQuery === '' || 
      payment.transaction_ref?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payment.user?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payment.event?.title?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || payment.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const paymentStats = {
    total: payments.length,
    completed: payments.filter(p => p.status === 'completed').length,
    pending: payments.filter(p => p.status === 'pending').length,
    failed: payments.filter(p => p.status === 'failed').length,
    totalAmount: payments.filter(p => p.status === 'completed').reduce((sum, p) => sum + (p.amount || 0), 0)
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Skeleton className="h-10 w-64 bg-white/10 rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 bg-white/10 rounded-xl" />
          ))}
        </div>
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 bg-white/10 rounded-xl" />
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
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-green-500/20 to-emerald-500/20 backdrop-blur-sm">
            <CreditCard className="h-6 w-6 text-green-300" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">Gestion des paiements</h1>
            <p className="text-sm text-white/60 mt-1">
              {paymentStats.total} paiement{paymentStats.total > 1 ? 's' : ''} au total
            </p>
          </div>
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

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="ampia-glass p-4 space-y-2">
          <div className="flex items-center gap-2 text-white/60 text-xs uppercase tracking-wide">
            <CreditCard className="h-4 w-4" />
            Total
          </div>
          <div className="text-2xl font-bold text-white">{paymentStats.total}</div>
        </div>
        <div className="ampia-glass p-4 space-y-2 border-green-500/20">
          <div className="flex items-center gap-2 text-green-300/80 text-xs uppercase tracking-wide">
            <CheckCircle className="h-4 w-4" />
            Complétés
          </div>
          <div className="text-2xl font-bold text-green-300">{paymentStats.completed}</div>
        </div>
        <div className="ampia-glass p-4 space-y-2 border-amber-500/20">
          <div className="flex items-center gap-2 text-amber-300/80 text-xs uppercase tracking-wide">
            <Clock className="h-4 w-4" />
            En attente
          </div>
          <div className="text-2xl font-bold text-amber-300">{paymentStats.pending}</div>
        </div>
        <div className="ampia-glass p-4 space-y-2 border-purple-500/20">
          <div className="flex items-center gap-2 text-purple-300/80 text-xs uppercase tracking-wide">
            <DollarSign className="h-4 w-4" />
            Revenus
          </div>
          <div className="text-2xl font-bold text-purple-300">{formatCurrency(paymentStats.totalAmount)}</div>
        </div>
      </div>

      {/* Commission Stats */}
      {commissionStats && commissionStats.totalTransactions > 0 && (
        <div className="ampia-glass p-6">
          <div className="flex items-center gap-3 mb-4">
            <PieChart className="h-5 w-5 text-green-400" />
            <h2 className="text-lg font-bold text-white">Répartition des commissions (6%)</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <ArrowUpRight className="h-4 w-4 text-blue-400" />
                <p className="text-xs text-white/60">Opérateur (2%)</p>
              </div>
              <p className="text-xl font-bold text-blue-400">
                {formatCurrency(commissionStats.totalOperatorFees)}
              </p>
            </div>
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <ArrowUpRight className="h-4 w-4 text-purple-400" />
                <p className="text-xs text-white/60">AMPIA (4%)</p>
              </div>
              <p className="text-xl font-bold text-purple-400">
                {formatCurrency(commissionStats.totalAmpiaFees)}
              </p>
            </div>
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <Percent className="h-4 w-4 text-green-400" />
                <p className="text-xs text-white/60">Total Frais</p>
              </div>
              <p className="text-xl font-bold text-green-400">
                {formatCurrency(commissionStats.totalFees)}
              </p>
            </div>
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <ArrowDownRight className="h-4 w-4 text-amber-400" />
                <p className="text-xs text-white/60">Organisateurs</p>
              </div>
              <p className="text-xl font-bold text-amber-400">
                {formatCurrency(commissionStats.totalOrganizerReceives)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher par référence, utilisateur ou événement..."
            className="glass-input pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-white/60" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="glass-input text-sm min-w-[150px]"
          >
            <option value="all">Tous les statuts</option>
            <option value="completed">Complétés</option>
            <option value="pending">En attente</option>
            <option value="failed">Échoués</option>
            <option value="cancelled">Annulés</option>
          </select>
        </div>
      </div>

      {/* Payments List */}
      {filteredPayments.length === 0 ? (
        <div className="ampia-glass p-12 text-center">
          <div className="text-6xl mb-4">💳</div>
          <h3 className="text-xl font-semibold text-white mb-2">Aucun paiement trouvé</h3>
          <p className="text-white/70">Modifiez vos critères de recherche.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredPayments.map((payment, index) => (
            <div
              key={payment.id}
              className="ampia-glass p-4 animate-slide-up hover:border-white/20 transition-all duration-300"
              style={{ animationDelay: `${index * 30}ms` }}
            >
              <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                {/* Payment Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-mono text-sm text-white/80 bg-white/10 px-2 py-1 rounded">
                      {payment.transaction_ref}
                    </span>
                    {getStatusBadge(payment.status)}
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-white/60">
                    {payment.user && (
                      <Link to={`/users/${payment.user.id}`} className="flex items-center gap-1 hover:text-white transition-colors">
                        <User className="h-3 w-3" />
                        {payment.user.name}
                      </Link>
                    )}
                    {payment.event && (
                      <Link to={`/events/${payment.event.id}`} className="flex items-center gap-1 hover:text-white transition-colors">
                        <Ticket className="h-3 w-3" />
                        {payment.event.title}
                      </Link>
                    )}
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(payment.created_at).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                </div>

                {/* Amount Details */}
                <div className="flex flex-col items-end gap-1">
                  <div className="text-xl font-bold text-white">
                    {formatCurrency(payment.amount, payment.currency)}
                  </div>
                  {payment.total_fees && payment.total_fees > 0 && (
                    <div className="text-xs text-white/60">
                      Frais: {formatCurrency(payment.total_fees, payment.currency)}
                    </div>
                  )}
                  {payment.organizer_receives && (
                    <div className="text-xs text-green-400">
                      Organisateur: {formatCurrency(payment.organizer_receives, payment.currency)}
                    </div>
                  )}
                </div>
              </div>

              {/* Fee Breakdown (if available) */}
              {payment.status === 'completed' && payment.operator_fee && (
                <div className="mt-3 pt-3 border-t border-white/10 flex flex-wrap gap-4 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-white/40">Sous-total:</span>
                    <span className="text-white">{formatCurrency(payment.subtotal || 0, payment.currency)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-white/40">Opérateur (2%):</span>
                    <span className="text-blue-400">{formatCurrency(payment.operator_fee, payment.currency)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-white/40">AMPIA (4%):</span>
                    <span className="text-purple-400">{formatCurrency(payment.ampia_fee || 0, payment.currency)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-white/40">Quantité:</span>
                    <span className="text-white">{payment.quantity} ticket(s)</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
