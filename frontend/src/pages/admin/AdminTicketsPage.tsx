import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../lib/api'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Ticket,
  Search,
  Filter,
  RefreshCw,
  CheckCircle,
  XCircle,
  QrCode,
  Calendar,
  User,
  MapPin,
  Clock,
  TicketCheck,
  Ban
} from 'lucide-react'

type TicketItem = {
  id: number
  user_id: number
  event_id: number
  ticket_type_id: number
  qr_code: string
  status: 'active' | 'used' | 'cancelled' | 'expired'
  price_paid: number
  currency: string
  used_at?: string
  created_at: string
  user?: { id: number; name: string; email: string }
  event?: { id: number; title: string; date: string; location: string }
  ticket_type?: { id: number; name: string; price: number }
}

export default function AdminTicketsPage() {
  const [tickets, setTickets] = useState<TicketItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  async function loadTickets() {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get<TicketItem[]>('/api/admin/tickets')
      setTickets(res.data || [])
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Erreur chargement')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTickets()
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
      case 'active':
        return (
          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium border border-green-500/30 bg-green-500/20 text-green-200">
            <CheckCircle className="h-3 w-3" />
            Actif
          </span>
        )
      case 'used':
        return (
          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium border border-blue-500/30 bg-blue-500/20 text-blue-200">
            <TicketCheck className="h-3 w-3" />
            Utilisé
          </span>
        )
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium border border-red-500/30 bg-red-500/20 text-red-200">
            <XCircle className="h-3 w-3" />
            Annulé
          </span>
        )
      case 'expired':
        return (
          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium border border-gray-500/30 bg-gray-500/20 text-gray-200">
            <Ban className="h-3 w-3" />
            Expiré
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

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = searchQuery === '' || 
      ticket.qr_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.user?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.event?.title?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const ticketStats = {
    total: tickets.length,
    active: tickets.filter(t => t.status === 'active').length,
    used: tickets.filter(t => t.status === 'used').length,
    cancelled: tickets.filter(t => t.status === 'cancelled').length,
    totalRevenue: tickets.filter(t => t.status !== 'cancelled').reduce((sum, t) => sum + (t.price_paid || 0), 0)
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
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 backdrop-blur-sm">
            <Ticket className="h-6 w-6 text-amber-300" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">Gestion des tickets</h1>
            <p className="text-sm text-white/60 mt-1">
              {ticketStats.total} ticket{ticketStats.total > 1 ? 's' : ''} au total
            </p>
          </div>
        </div>
        <Button onClick={loadTickets} variant="outline" className="glass-input">
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
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="ampia-glass p-4 space-y-2">
          <div className="flex items-center gap-2 text-white/60 text-xs uppercase tracking-wide">
            <Ticket className="h-4 w-4" />
            Total
          </div>
          <div className="text-2xl font-bold text-white">{ticketStats.total}</div>
        </div>
        <div className="ampia-glass p-4 space-y-2 border-green-500/20">
          <div className="flex items-center gap-2 text-green-300/80 text-xs uppercase tracking-wide">
            <CheckCircle className="h-4 w-4" />
            Actifs
          </div>
          <div className="text-2xl font-bold text-green-300">{ticketStats.active}</div>
        </div>
        <div className="ampia-glass p-4 space-y-2 border-blue-500/20">
          <div className="flex items-center gap-2 text-blue-300/80 text-xs uppercase tracking-wide">
            <TicketCheck className="h-4 w-4" />
            Utilisés
          </div>
          <div className="text-2xl font-bold text-blue-300">{ticketStats.used}</div>
        </div>
        <div className="ampia-glass p-4 space-y-2 border-red-500/20">
          <div className="flex items-center gap-2 text-red-300/80 text-xs uppercase tracking-wide">
            <XCircle className="h-4 w-4" />
            Annulés
          </div>
          <div className="text-2xl font-bold text-red-300">{ticketStats.cancelled}</div>
        </div>
        <div className="ampia-glass p-4 space-y-2 border-purple-500/20">
          <div className="flex items-center gap-2 text-purple-300/80 text-xs uppercase tracking-wide">
            <Ticket className="h-4 w-4" />
            Revenus
          </div>
          <div className="text-xl font-bold text-purple-300">{formatCurrency(ticketStats.totalRevenue)}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher par QR code, utilisateur ou événement..."
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
            <option value="active">Actifs</option>
            <option value="used">Utilisés</option>
            <option value="cancelled">Annulés</option>
            <option value="expired">Expirés</option>
          </select>
        </div>
      </div>

      {/* Tickets List */}
      {filteredTickets.length === 0 ? (
        <div className="ampia-glass p-12 text-center">
          <div className="text-6xl mb-4">🎫</div>
          <h3 className="text-xl font-semibold text-white mb-2">Aucun ticket trouvé</h3>
          <p className="text-white/70">Modifiez vos critères de recherche.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTickets.map((ticket, index) => (
            <div
              key={ticket.id}
              className="ampia-glass p-4 animate-slide-up hover:border-white/20 transition-all duration-300"
              style={{ animationDelay: `${index * 30}ms` }}
            >
              <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                {/* Ticket Info */}
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-r from-purple-500/20 to-pink-500/20 flex-shrink-0">
                    <QrCode className="h-6 w-6 text-purple-300" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-sm text-white/80 bg-white/10 px-2 py-1 rounded truncate max-w-[200px]">
                        {ticket.qr_code}
                      </span>
                      {getStatusBadge(ticket.status)}
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-white/60">
                      {ticket.user && (
                        <Link to={`/users/${ticket.user.id}`} className="flex items-center gap-1 hover:text-white transition-colors">
                          <User className="h-3 w-3" />
                          {ticket.user.name}
                        </Link>
                      )}
                      {ticket.event && (
                        <Link to={`/events/${ticket.event.id}`} className="flex items-center gap-1 hover:text-white transition-colors">
                          <Calendar className="h-3 w-3" />
                          {ticket.event.title}
                        </Link>
                      )}
                      {ticket.ticket_type && (
                        <span className="flex items-center gap-1">
                          <Ticket className="h-3 w-3" />
                          {ticket.ticket_type.name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Price & Date */}
                <div className="flex flex-col items-end gap-1">
                  <div className="text-xl font-bold text-white">
                    {formatCurrency(ticket.price_paid, ticket.currency)}
                  </div>
                  <div className="text-xs text-white/60 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(ticket.created_at).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </div>
                  {ticket.used_at && (
                    <div className="text-xs text-blue-400 flex items-center gap-1">
                      <TicketCheck className="h-3 w-3" />
                      Utilisé le {new Date(ticket.used_at).toLocaleDateString('fr-FR')}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
