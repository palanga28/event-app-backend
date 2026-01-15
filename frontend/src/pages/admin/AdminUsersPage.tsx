import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../lib/api'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { 
  Users, 
  Search, 
  Shield, 
  ShieldCheck, 
  ShieldAlert, 
  Key, 
  Trash2, 
  MoreVertical,
  Mail,
  Calendar,
  Filter,
  RefreshCw,
  ChevronDown
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

type User = {
  id: number
  name: string
  email: string
  role: 'user' | 'moderator' | 'admin'
  avatar_url?: string | null
  bio?: string | null
  banned?: boolean
  banned_at?: string | null
  banned_reason?: string | null
  created_at: string
  updated_at?: string
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [actionLoading, setActionLoading] = useState<number | null>(null)

  async function loadUsers() {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get<User[]>('/api/admin/users')
      setUsers(res.data)
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || 'Erreur chargement'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [])

  async function changeRole(userId: number, newRole: string) {
    setActionLoading(userId)
    try {
      await api.put(`/api/admin/users/${userId}/role`, { role: newRole })
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole as User['role'] } : u))
      toast.success(`Rôle mis à jour: ${newRole}`)
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Erreur modification rôle')
    } finally {
      setActionLoading(null)
    }
  }

  async function banUser(userId: number, userName: string) {
    const reason = prompt(`Raison du bannissement de "${userName}" (optionnel):`)
    if (reason === null) return // Annulé
    
    setActionLoading(userId)
    try {
      await api.put(`/api/admin/users/${userId}/ban`, { reason: reason || undefined })
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, banned: true, banned_reason: reason || 'Banni par un administrateur' } : u))
      toast.success(`${userName} a été banni`)
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Erreur bannissement')
    } finally {
      setActionLoading(null)
    }
  }

  async function unbanUser(userId: number, userName: string) {
    if (!confirm(`Êtes-vous sûr de vouloir débannir "${userName}" ?`)) return
    
    setActionLoading(userId)
    try {
      await api.put(`/api/admin/users/${userId}/unban`)
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, banned: false, banned_at: null, banned_reason: null } : u))
      toast.success(`${userName} a été débanni`)
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Erreur débannissement')
    } finally {
      setActionLoading(null)
    }
  }

  async function resetPassword(userId: number, userName: string) {
    const newPassword = prompt(`Nouveau mot de passe pour "${userName}" (min 6 caractères):`)
    if (!newPassword) return
    
    if (newPassword.length < 6) {
      toast.error('Le mot de passe doit contenir au moins 6 caractères')
      return
    }
    
    setActionLoading(userId)
    try {
      await api.put(`/api/admin/users/${userId}/reset-password`, { newPassword })
      toast.success(`Mot de passe réinitialisé pour ${userName}`)
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Erreur réinitialisation')
    } finally {
      setActionLoading(null)
    }
  }

  async function deleteUser(userId: number, userName: string) {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer l'utilisateur "${userName}" ? Cette action est irréversible.`)) {
      return
    }
    setActionLoading(userId)
    try {
      await api.delete(`/api/admin/users/${userId}`)
      setUsers(prev => prev.filter(u => u.id !== userId))
      toast.success('Utilisateur supprimé')
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Erreur suppression')
    } finally {
      setActionLoading(null)
    }
  }

  const filteredUsers = users.filter(user => {
    const matchesSearch = searchQuery === '' || 
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesRole = roleFilter === 'all' || 
      (roleFilter === 'banned' ? user.banned : user.role === roleFilter)
    return matchesSearch && matchesRole
  })

  const roleStats = {
    total: users.length,
    admin: users.filter(u => u.role === 'admin').length,
    moderator: users.filter(u => u.role === 'moderator').length,
    user: users.filter(u => u.role === 'user').length,
    banned: users.filter(u => u.banned).length,
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return (
          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium border border-red-500/30 bg-red-500/20 text-red-200">
            <ShieldAlert className="h-3 w-3" />
            Admin
          </span>
        )
      case 'moderator':
        return (
          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium border border-amber-500/30 bg-amber-500/20 text-amber-200">
            <ShieldCheck className="h-3 w-3" />
            Modérateur
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium border border-blue-500/30 bg-blue-500/20 text-blue-200">
            <Shield className="h-3 w-3" />
            Utilisateur
          </span>
        )
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Skeleton className="h-10 w-64 bg-gradient-to-r from-white/10 to-white/5 rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 bg-gradient-to-r from-white/10 to-white/5 rounded-xl" />
          ))}
        </div>
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 bg-gradient-to-r from-white/10 to-white/5 rounded-xl" />
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
            <Button onClick={loadUsers} variant="outline" size="sm" className="ml-auto">
              <RefreshCw className="h-4 w-4 mr-2" />
              Réessayer
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-blue-500/20 to-cyan-500/20 backdrop-blur-sm">
            <Users className="h-6 w-6 text-blue-300" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">Gestion des utilisateurs</h1>
            <p className="text-sm text-white/60 mt-1">
              {roleStats.total} utilisateur{roleStats.total > 1 ? 's' : ''} au total
            </p>
          </div>
        </div>
        <Button onClick={loadUsers} variant="outline" className="glass-input">
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualiser
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="ampia-glass p-4 space-y-2">
          <div className="flex items-center gap-2 text-white/60 text-xs uppercase tracking-wide">
            <Users className="h-4 w-4" />
            Total
          </div>
          <div className="text-2xl font-bold text-white">{roleStats.total}</div>
        </div>
        <div className="ampia-glass p-4 space-y-2 border-red-500/20">
          <div className="flex items-center gap-2 text-red-300/80 text-xs uppercase tracking-wide">
            <ShieldAlert className="h-4 w-4" />
            Admins
          </div>
          <div className="text-2xl font-bold text-red-300">{roleStats.admin}</div>
        </div>
        <div className="ampia-glass p-4 space-y-2 border-amber-500/20">
          <div className="flex items-center gap-2 text-amber-300/80 text-xs uppercase tracking-wide">
            <ShieldCheck className="h-4 w-4" />
            Modérateurs
          </div>
          <div className="text-2xl font-bold text-amber-300">{roleStats.moderator}</div>
        </div>
        <div className="ampia-glass p-4 space-y-2 border-blue-500/20">
          <div className="flex items-center gap-2 text-blue-300/80 text-xs uppercase tracking-wide">
            <Shield className="h-4 w-4" />
            Utilisateurs
          </div>
          <div className="text-2xl font-bold text-blue-300">{roleStats.user}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher par nom ou email..."
            className="glass-input pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-white/60" />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="glass-input text-sm min-w-[150px]"
          >
            <option value="all">Tous les rôles</option>
            <option value="admin">Admins</option>
            <option value="moderator">Modérateurs</option>
            <option value="user">Utilisateurs</option>
            <option value="banned">🚫 Bannis ({roleStats.banned})</option>
          </select>
        </div>
      </div>

      {/* Users List */}
      {filteredUsers.length === 0 ? (
        <div className="ampia-glass p-12 text-center">
          <div className="text-6xl mb-4">👤</div>
          <h3 className="text-xl font-semibold text-white mb-2">Aucun utilisateur trouvé</h3>
          <p className="text-white/70">Modifiez vos critères de recherche.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredUsers.map((user, index) => (
            <div
              key={user.id}
              className="group ampia-glass p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4 animate-slide-up hover:border-white/20 transition-all duration-300"
              style={{ animationDelay: `${index * 30}ms` }}
            >
              {/* Avatar & Info */}
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-lg font-bold text-white flex-shrink-0">
                  {(user.name || 'U').slice(0, 1).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link 
                      to={`/users/${user.id}`}
                      className={`font-semibold transition-colors truncate ${user.banned ? 'text-red-300 line-through' : 'text-white hover:text-purple-300'}`}
                    >
                      {user.name}
                    </Link>
                    {getRoleBadge(user.role)}
                    {user.banned && (
                      <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium border border-red-500/50 bg-red-500/30 text-red-200">
                        🚫 Banni
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-white/60 mt-1">
                    <span className="flex items-center gap-1 truncate">
                      <Mail className="h-3 w-3" />
                      {user.email}
                    </span>
                    <span className="flex items-center gap-1 hidden sm:flex">
                      <Calendar className="h-3 w-3" />
                      {new Date(user.created_at).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                {/* Role Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="glass-input flex-1 sm:flex-none"
                      disabled={actionLoading === user.id}
                    >
                      {actionLoading === user.id ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          Rôle
                          <ChevronDown className="h-4 w-4 ml-1" />
                        </>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="ampia-glass border-white/10">
                    <DropdownMenuLabel className="text-white/70">Changer le rôle</DropdownMenuLabel>
                    <DropdownMenuSeparator className="bg-white/10" />
                    <DropdownMenuItem 
                      onClick={() => changeRole(user.id, 'user')}
                      className={`gap-2 cursor-pointer ${user.role === 'user' ? 'bg-blue-500/20 text-blue-200' : 'text-white hover:bg-white/10'}`}
                    >
                      <Shield className="h-4 w-4" />
                      Utilisateur
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => changeRole(user.id, 'moderator')}
                      className={`gap-2 cursor-pointer ${user.role === 'moderator' ? 'bg-amber-500/20 text-amber-200' : 'text-white hover:bg-white/10'}`}
                    >
                      <ShieldCheck className="h-4 w-4" />
                      Modérateur
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => changeRole(user.id, 'admin')}
                      className={`gap-2 cursor-pointer ${user.role === 'admin' ? 'bg-red-500/20 text-red-200' : 'text-white hover:bg-white/10'}`}
                    >
                      <ShieldAlert className="h-4 w-4" />
                      Admin
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* More Actions */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="glass-input px-2"
                      disabled={actionLoading === user.id}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="ampia-glass border-white/10">
                    <DropdownMenuLabel className="text-white/70">Actions</DropdownMenuLabel>
                    <DropdownMenuSeparator className="bg-white/10" />
                    <DropdownMenuItem 
                      onClick={() => resetPassword(user.id, user.name)}
                      className="gap-2 text-blue-300 hover:bg-blue-500/20 cursor-pointer"
                    >
                      <Key className="h-4 w-4" />
                      Réinitialiser mot de passe
                    </DropdownMenuItem>
                    {user.role !== 'admin' && !user.banned && (
                      <DropdownMenuItem 
                        onClick={() => banUser(user.id, user.name)}
                        className="gap-2 text-amber-300 hover:bg-amber-500/20 cursor-pointer"
                      >
                        <Key className="h-4 w-4" />
                        Bannir l'utilisateur
                      </DropdownMenuItem>
                    )}
                    {user.banned && (
                      <DropdownMenuItem 
                        onClick={() => unbanUser(user.id, user.name)}
                        className="gap-2 text-green-300 hover:bg-green-500/20 cursor-pointer"
                      >
                        <Key className="h-4 w-4" />
                        Débannir l'utilisateur
                      </DropdownMenuItem>
                    )}
                    {user.role !== 'admin' && (
                      <DropdownMenuItem 
                        onClick={() => deleteUser(user.id, user.name)}
                        className="gap-2 text-red-300 hover:bg-red-500/20 cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                        Supprimer
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
