import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { 
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  Search,
  User,
  Calendar,
  AlertCircle,
  Ban,
  TrendingDown
} from 'lucide-react'

type Refund = {
  id: number
  ticket_id: number
  payment_id: number
  user_id: number
  event_id: number
  amount: number
  original_amount: number
  currency: string
  reason: string
  status: 'pending' | 'approved' | 'rejected' | 'cancelled'
  mobile_number: string
  refund_transaction_ref?: string
  approved_by?: number
  approved_at?: string
  rejected_by?: number
  rejected_at?: string
  rejection_reason?: string
  created_at: string
  user?: { id: number; name: string; email: string }
  event?: { id: number; title: string }
  ticket?: { id: number; status: string }
}

type RefundStats = {
  total: number
  pending: number
  approved: number
  rejected: number
  cancelled: number
  totalAmountRefunded: number
  byCurrency: Record<string, { count: number; amount: number }>
}

export default function AdminRefundsPage() {
  const [refunds, setRefunds] = useState<Refund[]>([])
  const [stats, setStats] = useState<RefundStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('pending')
  const [processingId, setProcessingId] = useState<number | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [showRejectModal, setShowRejectModal] = useState<number | null>(null)

  async function loadData() {
    setLoading(true)
    setError(null)
    try {
      const [refundsRes, statsRes] = await Promise.all([
        api.get<Refund[]>('/api/refunds/pending'),
        api.get<RefundStats>('/api/refunds/stats').catch(() => ({ data: null }))
      ])
      setRefunds(refundsRes.data || [])
      setStats(statsRes.data)
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
    }).format(amount) + ' ' + currency
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  async function handleApprove(refundId: number) {
    if (!confirm('Confirmer l\'approbation de ce remboursement ?')) return
    
    setProcessingId(refundId)
    try {
      await api.post(`/api/refunds/${refundId}/approve`)
      toast.success('Remboursement approuvé')
      loadData()
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Erreur approbation')
    } finally {
      setProcessingId(null)
    }
  }

  async function handleReject(refundId: number) {
    setProcessingId(refundId)
    try {
      await api.post(`/api/refunds/${refundId}/reject`, {
        rejectionReason: rejectionReason || 'Demande non conforme'
      })
      toast.success('Remboursement rejeté')
      setShowRejectModal(null)
      setRejectionReason('')
      loadData()
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Erreur rejet')
    } finally {
      setProcessingId(null)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-400"><Clock size={12} /> En attente</span>
      case 'approved':
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400"><CheckCircle size={12} /> Approuvé</span>
      case 'rejected':
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-400"><XCircle size={12} /> Rejeté</span>
      case 'cancelled':
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-500/20 text-gray-400"><Ban size={12} /> Annulé</span>
      default:
        return <span className="px-2 py-1 rounded-full text-xs bg-gray-500/20 text-gray-400">{status}</span>
    }
  }

  const filteredRefunds = refunds.filter(r => {
    const matchesSearch = searchQuery === '' || 
      r.user?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.user?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.event?.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.reason?.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400 flex items-center gap-2">
          <AlertCircle size={20} />
          {error}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <TrendingDown className="text-orange-400" />
            Gestion des remboursements
          </h1>
          <p className="text-gray-400 mt-1">Traiter les demandes de remboursement</p>
        </div>
        <Button onClick={loadData} variant="outline" size="sm">
          <RefreshCw size={16} className="mr-2" />
          Actualiser
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-500/20 rounded-lg">
                <Clock className="text-yellow-400" size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.pending}</p>
                <p className="text-sm text-gray-400">En attente</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <CheckCircle className="text-green-400" size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.approved}</p>
                <p className="text-sm text-gray-400">Approuvés</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/20 rounded-lg">
                <XCircle className="text-red-400" size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.rejected}</p>
                <p className="text-sm text-gray-400">Rejetés</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-500/20 rounded-lg">
                <Ban className="text-gray-400" size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.cancelled}</p>
                <p className="text-sm text-gray-400">Annulés</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <DollarSign className="text-purple-400" size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">
                  {Object.entries(stats.byCurrency).map(([currency, data]) => (
                    <span key={currency}>{formatCurrency(data.amount, currency)}</span>
                  ))}
                  {Object.keys(stats.byCurrency).length === 0 && '0'}
                </p>
                <p className="text-sm text-gray-400">Total remboursé</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <Input
            placeholder="Rechercher par utilisateur, événement, raison..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-gray-800 border-gray-700"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
        >
          <option value="pending">En attente</option>
          <option value="all">Tous les statuts</option>
          <option value="approved">Approuvés</option>
          <option value="rejected">Rejetés</option>
          <option value="cancelled">Annulés</option>
        </select>
      </div>

      {/* Refunds Table */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-900/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Utilisateur</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Événement</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Montant</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Raison</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Statut</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {filteredRefunds.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                    Aucune demande de remboursement
                  </td>
                </tr>
              ) : (
                filteredRefunds.map((refund) => (
                  <tr key={refund.id} className="hover:bg-gray-700/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center">
                          <User size={14} className="text-purple-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{refund.user?.name || 'Inconnu'}</p>
                          <p className="text-xs text-gray-400">{refund.user?.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-white">{refund.event?.title || 'Événement supprimé'}</p>
                      <p className="text-xs text-gray-400">Ticket #{refund.ticket_id}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-green-400">{formatCurrency(refund.amount, refund.currency)}</p>
                      <p className="text-xs text-gray-400">sur {formatCurrency(refund.original_amount, refund.currency)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-gray-300 max-w-xs truncate">{refund.reason || '-'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-sm text-gray-400">
                        <Calendar size={14} />
                        {formatDate(refund.created_at)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {getStatusBadge(refund.status)}
                    </td>
                    <td className="px-4 py-3">
                      {refund.status === 'pending' && (
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="bg-green-500/10 border-green-500/30 text-green-400 hover:bg-green-500/20"
                            onClick={() => handleApprove(refund.id)}
                            disabled={processingId === refund.id}
                          >
                            {processingId === refund.id ? (
                              <RefreshCw size={14} className="animate-spin" />
                            ) : (
                              <CheckCircle size={14} />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20"
                            onClick={() => setShowRejectModal(refund.id)}
                            disabled={processingId === refund.id}
                          >
                            <XCircle size={14} />
                          </Button>
                        </div>
                      )}
                      {refund.status === 'rejected' && refund.rejection_reason && (
                        <p className="text-xs text-red-400">{refund.rejection_reason}</p>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-white mb-4">Rejeter le remboursement</h3>
            <Input
              placeholder="Raison du rejet..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="bg-gray-900 border-gray-700 mb-4"
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowRejectModal(null)
                  setRejectionReason('')
                }}
              >
                Annuler
              </Button>
              <Button
                className="bg-red-600 hover:bg-red-700"
                onClick={() => handleReject(showRejectModal)}
                disabled={processingId === showRejectModal}
              >
                {processingId === showRejectModal ? (
                  <RefreshCw size={14} className="animate-spin mr-2" />
                ) : null}
                Rejeter
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
