import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { api } from '../lib/api'
import { IconButton } from '@/components/IconButton'
import AmpiaLogo from '@/components/AmpiaLogo'
import {
  CalendarDays,
  Search,
  User,
  Ticket,
  Heart,
  Bell,
  Shield,
  Activity,
  Flag,
  BarChart3,
  ClipboardList,
  FileText,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Plus,
  RotateCcw,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export default function Navbar() {
  const { user, logout, isLoading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [searchType, setSearchType] = useState<'events' | 'users'>('events')
  const [q, setQ] = useState('')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (!user) {
      setUnreadCount(0)
      return
    }

    let cancelled = false

    async function loadUnread() {
      try {
        const res = await api.get<{ unread: number }>('/api/notifications/unread-count')
        const n = res.data?.unread
        if (!cancelled) setUnreadCount(Number.isFinite(n) ? n : 0)
      } catch {
        if (!cancelled) setUnreadCount(0)
      }
    }

    loadUnread()
    const t = setInterval(loadUnread, 30000)

    return () => {
      cancelled = true
      clearInterval(t)
    }
  }, [user?.id])

  async function handleLogout() {
    await logout()
    navigate('/')
  }

  function submitSearch(e: React.FormEvent) {
    e.preventDefault()
    const query = q.trim()
    if (!query) return
    if (searchType === 'users') {
      navigate(`/search/users?q=${encodeURIComponent(query)}`)
    } else {
      navigate(`/search/events?q=${encodeURIComponent(query)}`)
    }
  }

  const isModerator = !!user && (user.role === 'moderator' || user.role === 'admin')
  const isAdmin = !!user && user.role === 'admin'

  // Fermer le menu mobile lors de la navigation
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [location.pathname])

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-gradient-to-b from-white/[0.08] to-white/[0.02] backdrop-blur-xl shadow-lg">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 lg:px-6">
        <div className="flex items-center gap-6">
          <Link 
            to="/" 
            className="flex items-center gap-2 transition-transform duration-200 hover:scale-105"
          >
            <AmpiaLogo size="md" showText={true} />
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            <NavLink 
              to="/" 
              className={({ isActive }) => 
                `relative inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 ${
                  isActive 
                    ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-white shadow-lg shadow-purple-500/20' 
                    : 'text-white/70 hover:text-white hover:bg-white/5'
                }`
              }
            >
              <CalendarDays className={`h-4 w-4 ${location.pathname === '/' ? 'text-purple-300' : 'text-white/60'}`} />
              <span>Événements</span>
            </NavLink>

            <NavLink
              to="/search/events"
              className={({ isActive }) =>
                `relative inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-white shadow-lg shadow-purple-500/20'
                    : 'text-white/70 hover:text-white hover:bg-white/5'
                }`
              }
            >
              <Search className={`h-4 w-4 ${location.pathname.startsWith('/search') ? 'text-purple-300' : 'text-white/60'}`} />
              <span>Rechercher</span>
            </NavLink>
          </nav>
        </div>

        {location.pathname !== '/' ? (
          <form onSubmit={submitSearch} className="hidden flex-1 items-center justify-center gap-2 md:flex max-w-2xl mx-auto">
            <select
              value={searchType}
              onChange={(e) => setSearchType(e.target.value as any)}
              className="glass-input rounded-l-xl rounded-r-none text-sm focus:z-10"
            >
              <option value="events">Événements</option>
              <option value="users">Utilisateurs</option>
            </select>
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="glass-input rounded-none border-l-0 border-r-0 w-full max-w-md focus:z-10"
              placeholder={searchType === 'users' ? 'Rechercher un utilisateur...' : 'Rechercher un événement...'}
            />
            <Button 
              type="submit" 
              className="btn-primary rounded-l-none rounded-r-xl"
            >
              <Search className="h-4 w-4 mr-2" />
              Rechercher
            </Button>
          </form>
        ) : (
          <div className="hidden flex-1 md:block" />
        )}

        <div className="flex items-center gap-3">
          {/* Mobile Menu Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="icon-btn md:hidden"
            aria-label={mobileMenuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5 text-white" />
            ) : (
              <Menu className="h-5 w-5 text-white" />
            )}
          </button>

          {isLoading ? (
            <div className="h-9 w-20 animate-pulse rounded-lg bg-white/5" />
          ) : user ? (
            <>
              <IconButton
                type="button"
                onClick={() => navigate('/me/notifications')}
                aria-label="Notifications"
                className="relative"
                badge={
                  unreadCount > 0 ? (
                    <span className="absolute -right-1 -top-1 inline-flex min-w-[20px] items-center justify-center rounded-full border-2 border-background bg-gradient-to-r from-pink-500 to-rose-500 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-lg shadow-pink-500/50">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  ) : null
                }
              >
                <Bell className="h-5 w-5 text-white" />
              </IconButton>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="glass-input border-white/10 bg-white/5 text-white hover:bg-white/10 hover:border-white/20 hidden sm:inline-flex"
                  >
                    <User className="h-4 w-4 mr-2" />
                    Mon espace
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent 
                  align="end" 
                  className="w-64 ampia-glass border-white/10 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl"
                >
                  <DropdownMenuItem 
                    onSelect={() => navigate('/me')} 
                    className="gap-3 text-white hover:bg-white/10 cursor-pointer"
                  >
                    <User className="h-4 w-4 text-purple-400" />
                    Mon profil
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onSelect={() => navigate('/me/events')} 
                    className="gap-3 text-white hover:bg-white/10 cursor-pointer"
                  >
                    <CalendarDays className="h-4 w-4 text-purple-400" />
                    Mes événements
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onSelect={() => navigate('/me/tickets')} 
                    className="gap-3 text-white hover:bg-white/10 cursor-pointer"
                  >
                    <Ticket className="h-4 w-4 text-purple-400" />
                    Mes tickets
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onSelect={() => navigate('/me/favorites')} 
                    className="gap-3 text-white hover:bg-white/10 cursor-pointer"
                  >
                    <Heart className="h-4 w-4 text-pink-400" />
                    Mes favoris
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onSelect={() => navigate('/me/challenges')} 
                    className="gap-3 text-white hover:bg-white/10 cursor-pointer"
                  >
                    <ClipboardList className="h-4 w-4 text-blue-400" />
                    Mes défis
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-white/10" />
                  <DropdownMenuItem 
                    onSelect={() => navigate('/me/notifications')} 
                    className="gap-3 text-white hover:bg-white/10 cursor-pointer"
                  >
                    <Bell className="h-4 w-4 text-yellow-400" />
                    Notifications
                    {unreadCount > 0 && (
                      <span className="ml-auto rounded-full bg-pink-500 px-2 py-0.5 text-xs font-bold text-white">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {isModerator && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="outline" 
                      className="glass-input border-amber-500/30 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20 hover:border-amber-500/50 hidden lg:inline-flex"
                    >
                      <Shield className="h-4 w-4 mr-2" />
                      Modération
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent 
                    align="end" 
                    className="w-56 ampia-glass border-white/10 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl"
                  >
                    <DropdownMenuLabel className="text-amber-300">Modération</DropdownMenuLabel>
                    <DropdownMenuSeparator className="bg-white/10" />
                    <DropdownMenuItem 
                      onSelect={() => navigate('/moderator/reports')} 
                      className="gap-3 text-white hover:bg-white/10 cursor-pointer"
                    >
                      <Flag className="h-4 w-4 text-red-400" />
                      Signalements
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onSelect={() => navigate('/moderator/activity')} 
                      className="gap-3 text-white hover:bg-white/10 cursor-pointer"
                    >
                      <Activity className="h-4 w-4 text-blue-400" />
                      Activité
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onSelect={() => navigate('/moderator/users/reported')} 
                      className="gap-3 text-white hover:bg-white/10 cursor-pointer"
                    >
                      <Shield className="h-4 w-4 text-amber-400" />
                      Utilisateurs signalés
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onSelect={() => navigate('/moderator/challenges')} 
                      className="gap-3 text-white hover:bg-white/10 cursor-pointer"
                    >
                      <ClipboardList className="h-4 w-4 text-purple-400" />
                      Défis
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {isAdmin && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="outline" 
                      className="glass-input border-red-500/30 bg-red-500/10 text-red-200 hover:bg-red-500/20 hover:border-red-500/50 hidden lg:inline-flex"
                    >
                      <BarChart3 className="h-4 w-4 mr-2" />
                      Admin
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent 
                    align="end" 
                    className="w-56 ampia-glass border-white/10 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl"
                  >
                    <DropdownMenuLabel className="text-red-300">Administration</DropdownMenuLabel>
                    <DropdownMenuSeparator className="bg-white/10" />
                    <DropdownMenuItem 
                      onSelect={() => navigate('/admin/dashboard')} 
                      className="gap-3 text-white hover:bg-white/10 cursor-pointer"
                    >
                      <BarChart3 className="h-4 w-4 text-purple-400" />
                      Tableau de bord
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onSelect={() => navigate('/admin/stats')} 
                      className="gap-3 text-white hover:bg-white/10 cursor-pointer"
                    >
                      <BarChart3 className="h-4 w-4 text-blue-400" />
                      Statistiques
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onSelect={() => navigate('/admin/events')} 
                      className="gap-3 text-white hover:bg-white/10 cursor-pointer"
                    >
                      <CalendarDays className="h-4 w-4 text-purple-400" />
                      Événements
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onSelect={() => navigate('/admin/reports')} 
                      className="gap-3 text-white hover:bg-white/10 cursor-pointer"
                    >
                      <FileText className="h-4 w-4 text-yellow-400" />
                      Signalements
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onSelect={() => navigate('/admin/logs')} 
                      className="gap-3 text-white hover:bg-white/10 cursor-pointer"
                    >
                      <Activity className="h-4 w-4 text-green-400" />
                      Logs
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onSelect={() => navigate('/admin/challenges')} 
                      className="gap-3 text-white hover:bg-white/10 cursor-pointer"
                    >
                      <ClipboardList className="h-4 w-4 text-pink-400" />
                      Défis
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onSelect={() => navigate('/admin/users')} 
                      className="gap-3 text-white hover:bg-white/10 cursor-pointer"
                    >
                      <User className="h-4 w-4 text-cyan-400" />
                      Utilisateurs
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onSelect={() => navigate('/admin/refunds')} 
                      className="gap-3 text-white hover:bg-white/10 cursor-pointer"
                    >
                      <RotateCcw className="h-4 w-4 text-orange-400" />
                      Remboursements
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-white/10" />
                    <DropdownMenuItem 
                      onSelect={() => navigate('/admin/settings')} 
                      className="gap-3 text-white hover:bg-white/10 cursor-pointer"
                    >
                      <Settings className="h-4 w-4 text-gray-400" />
                      Paramètres
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="glass-input border-white/10 bg-white/5 text-white hover:bg-white/10 hover:border-white/20"
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-xs font-bold text-white">
                        {(user.name || 'U').slice(0, 1).toUpperCase()}
                      </div>
                      <span className="hidden md:inline">{user.name}</span>
                      <span className="hidden lg:inline text-xs text-white/60">({user.role || 'user'})</span>
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent 
                  align="end" 
                  className="w-64 ampia-glass border-white/10 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl"
                >
                  <DropdownMenuLabel className="text-white/90">{user.name}</DropdownMenuLabel>
                  <div className="px-2 py-1.5 text-xs text-white/60">{user.email}</div>
                  <DropdownMenuSeparator className="bg-white/10" />
                  <DropdownMenuItem 
                    onSelect={() => navigate('/me')} 
                    className="gap-3 text-white hover:bg-white/10 cursor-pointer"
                  >
                    <User className="h-4 w-4 text-purple-400" />
                    Mon profil
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onSelect={() => navigate('/me')} 
                    className="gap-3 text-white hover:bg-white/10 cursor-pointer"
                  >
                    <Settings className="h-4 w-4 text-blue-400" />
                    Paramètres
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-white/10" />
                  <DropdownMenuItem
                    onSelect={async () => {
                      await handleLogout()
                    }}
                    className="gap-3 text-red-300 hover:bg-red-500/20 cursor-pointer focus:text-red-200"
                  >
                    <LogOut className="h-4 w-4" />
                    Déconnexion
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <div className="flex items-center gap-3">
              <NavLink 
                to="/login" 
                className={({ isActive }) =>
                  `rounded-xl px-4 py-2 text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-white/10 text-white'
                      : 'text-white/70 hover:text-white hover:bg-white/5'
                  }`
                }
              >
                Connexion
              </NavLink>
              <NavLink 
                to="/register" 
                className="btn-primary rounded-xl px-6 py-2 text-sm font-semibold"
              >
                S'inscrire
              </NavLink>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Menu Drawer - Rendered via Portal */}
      {mobileMenuOpen && createPortal(
        <div className="fixed inset-0 md:hidden" style={{ zIndex: 9999 }}>
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
          
          {/* Drawer */}
          <nav 
            className="absolute right-0 top-0 h-full w-80 max-w-[85vw] bg-gradient-to-b from-[#1a0f1f] to-[#0a0a0f] border-l border-white/10 shadow-2xl overflow-y-auto animate-slide-in-right"
            aria-label="Menu mobile"
            style={{ zIndex: 10000 }}
          >
            {/* Header */}
            <div className="sticky top-0 flex items-center justify-between p-4 border-b border-white/10 bg-gradient-to-r from-purple-500/10 to-pink-500/10 backdrop-blur-xl">
              <span className="text-lg font-semibold text-white">Menu</span>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="icon-btn"
                aria-label="Fermer le menu"
              >
                <X className="h-5 w-5 text-white" />
              </button>
            </div>

            <div className="p-4 space-y-6">
              {/* Search Form Mobile */}
              <form onSubmit={(e) => { submitSearch(e); setMobileMenuOpen(false); }} className="space-y-3">
                <div className="text-xs font-medium text-white/60 uppercase tracking-wider">Recherche</div>
                <select
                  value={searchType}
                  onChange={(e) => setSearchType(e.target.value as 'events' | 'users')}
                  className="glass-input w-full text-sm"
                >
                  <option value="events">Événements</option>
                  <option value="users">Utilisateurs</option>
                </select>
                <div className="flex gap-2">
                  <Input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder={searchType === 'users' ? 'Rechercher...' : 'Rechercher...'}
                    className="glass-input flex-1 text-sm"
                  />
                  <Button type="submit" className="btn-primary px-3">
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
              </form>

              {/* Navigation Links */}
              <div className="space-y-1">
                <div className="text-xs font-medium text-white/60 uppercase tracking-wider mb-2">Navigation</div>
                <NavLink
                  to="/"
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 ${isActive
                      ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-white'
                      : 'text-white/70 hover:text-white hover:bg-white/5'
                    }`
                  }
                >
                  <CalendarDays className="h-5 w-5 text-purple-400" />
                  Événements
                  <ChevronRight className="h-4 w-4 ml-auto text-white/40" />
                </NavLink>
                <NavLink
                  to="/search/events"
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 ${isActive
                      ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-white'
                      : 'text-white/70 hover:text-white hover:bg-white/5'
                    }`
                  }
                >
                  <Search className="h-5 w-5 text-blue-400" />
                  Rechercher
                  <ChevronRight className="h-4 w-4 ml-auto text-white/40" />
                </NavLink>
              </div>

              {/* User Section */}
              {user ? (
                <>
                  <div className="space-y-1">
                    <div className="text-xs font-medium text-white/60 uppercase tracking-wider mb-2">Mon espace</div>
                    <NavLink
                      to="/events/new"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium bg-gradient-to-r from-purple-600/30 to-pink-600/30 text-white border border-purple-500/30 hover:from-purple-600/40 hover:to-pink-600/40 transition-all duration-200"
                    >
                      <Plus className="h-5 w-5" />
                      Créer un événement
                    </NavLink>
                    <NavLink
                      to="/me"
                      onClick={() => setMobileMenuOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 ${isActive
                          ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-white'
                          : 'text-white/70 hover:text-white hover:bg-white/5'
                        }`
                      }
                    >
                      <User className="h-5 w-5 text-purple-400" />
                      Mon profil
                      <ChevronRight className="h-4 w-4 ml-auto text-white/40" />
                    </NavLink>
                    <NavLink
                      to="/me/events"
                      onClick={() => setMobileMenuOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 ${isActive
                          ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-white'
                          : 'text-white/70 hover:text-white hover:bg-white/5'
                        }`
                      }
                    >
                      <CalendarDays className="h-5 w-5 text-purple-400" />
                      Mes événements
                      <ChevronRight className="h-4 w-4 ml-auto text-white/40" />
                    </NavLink>
                    <NavLink
                      to="/me/tickets"
                      onClick={() => setMobileMenuOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 ${isActive
                          ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-white'
                          : 'text-white/70 hover:text-white hover:bg-white/5'
                        }`
                      }
                    >
                      <Ticket className="h-5 w-5 text-green-400" />
                      Mes tickets
                      <ChevronRight className="h-4 w-4 ml-auto text-white/40" />
                    </NavLink>
                    <NavLink
                      to="/me/favorites"
                      onClick={() => setMobileMenuOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 ${isActive
                          ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-white'
                          : 'text-white/70 hover:text-white hover:bg-white/5'
                        }`
                      }
                    >
                      <Heart className="h-5 w-5 text-pink-400" />
                      Mes favoris
                      <ChevronRight className="h-4 w-4 ml-auto text-white/40" />
                    </NavLink>
                    <NavLink
                      to="/me/challenges"
                      onClick={() => setMobileMenuOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 ${isActive
                          ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-white'
                          : 'text-white/70 hover:text-white hover:bg-white/5'
                        }`
                      }
                    >
                      <ClipboardList className="h-5 w-5 text-blue-400" />
                      Mes défis
                      <ChevronRight className="h-4 w-4 ml-auto text-white/40" />
                    </NavLink>
                    <NavLink
                      to="/me/notifications"
                      onClick={() => setMobileMenuOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 ${isActive
                          ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-white'
                          : 'text-white/70 hover:text-white hover:bg-white/5'
                        }`
                      }
                    >
                      <Bell className="h-5 w-5 text-yellow-400" />
                      Notifications
                      {unreadCount > 0 && (
                        <span className="ml-auto rounded-full bg-gradient-to-r from-pink-500 to-rose-500 px-2 py-0.5 text-xs font-bold text-white">
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                      )}
                    </NavLink>
                  </div>

                  {/* Moderator Section */}
                  {isModerator && (
                    <div className="space-y-1">
                      <div className="text-xs font-medium text-amber-400/80 uppercase tracking-wider mb-2">Modération</div>
                      <NavLink
                        to="/moderator/reports"
                        onClick={() => setMobileMenuOpen(false)}
                        className={({ isActive }) =>
                          `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 ${isActive
                            ? 'bg-amber-500/20 text-amber-200'
                            : 'text-white/70 hover:text-white hover:bg-amber-500/10'
                          }`
                        }
                      >
                        <Flag className="h-5 w-5 text-red-400" />
                        Signalements
                        <ChevronRight className="h-4 w-4 ml-auto text-white/40" />
                      </NavLink>
                      <NavLink
                        to="/moderator/activity"
                        onClick={() => setMobileMenuOpen(false)}
                        className={({ isActive }) =>
                          `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 ${isActive
                            ? 'bg-amber-500/20 text-amber-200'
                            : 'text-white/70 hover:text-white hover:bg-amber-500/10'
                          }`
                        }
                      >
                        <Activity className="h-5 w-5 text-blue-400" />
                        Activité
                        <ChevronRight className="h-4 w-4 ml-auto text-white/40" />
                      </NavLink>
                      <NavLink
                        to="/moderator/users/reported"
                        onClick={() => setMobileMenuOpen(false)}
                        className={({ isActive }) =>
                          `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 ${isActive
                            ? 'bg-amber-500/20 text-amber-200'
                            : 'text-white/70 hover:text-white hover:bg-amber-500/10'
                          }`
                        }
                      >
                        <Shield className="h-5 w-5 text-amber-400" />
                        Utilisateurs signalés
                        <ChevronRight className="h-4 w-4 ml-auto text-white/40" />
                      </NavLink>
                      <NavLink
                        to="/moderator/challenges"
                        onClick={() => setMobileMenuOpen(false)}
                        className={({ isActive }) =>
                          `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 ${isActive
                            ? 'bg-amber-500/20 text-amber-200'
                            : 'text-white/70 hover:text-white hover:bg-amber-500/10'
                          }`
                        }
                      >
                        <ClipboardList className="h-5 w-5 text-purple-400" />
                        Défis
                        <ChevronRight className="h-4 w-4 ml-auto text-white/40" />
                      </NavLink>
                    </div>
                  )}

                  {/* Admin Section */}
                  {isAdmin && (
                    <div className="space-y-1">
                      <div className="text-xs font-medium text-red-400/80 uppercase tracking-wider mb-2">Administration</div>
                      <NavLink
                        to="/admin/dashboard"
                        onClick={() => setMobileMenuOpen(false)}
                        className={({ isActive }) =>
                          `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 ${isActive
                            ? 'bg-red-500/20 text-red-200'
                            : 'text-white/70 hover:text-white hover:bg-red-500/10'
                          }`
                        }
                      >
                        <BarChart3 className="h-5 w-5 text-purple-400" />
                        Tableau de bord
                        <ChevronRight className="h-4 w-4 ml-auto text-white/40" />
                      </NavLink>
                      <NavLink
                        to="/admin/stats"
                        onClick={() => setMobileMenuOpen(false)}
                        className={({ isActive }) =>
                          `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 ${isActive
                            ? 'bg-red-500/20 text-red-200'
                            : 'text-white/70 hover:text-white hover:bg-red-500/10'
                          }`
                        }
                      >
                        <BarChart3 className="h-5 w-5 text-blue-400" />
                        Statistiques
                        <ChevronRight className="h-4 w-4 ml-auto text-white/40" />
                      </NavLink>
                      <NavLink
                        to="/admin/events"
                        onClick={() => setMobileMenuOpen(false)}
                        className={({ isActive }) =>
                          `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 ${isActive
                            ? 'bg-red-500/20 text-red-200'
                            : 'text-white/70 hover:text-white hover:bg-red-500/10'
                          }`
                        }
                      >
                        <CalendarDays className="h-5 w-5 text-purple-400" />
                        Événements
                        <ChevronRight className="h-4 w-4 ml-auto text-white/40" />
                      </NavLink>
                      <NavLink
                        to="/admin/reports"
                        onClick={() => setMobileMenuOpen(false)}
                        className={({ isActive }) =>
                          `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 ${isActive
                            ? 'bg-red-500/20 text-red-200'
                            : 'text-white/70 hover:text-white hover:bg-red-500/10'
                          }`
                        }
                      >
                        <FileText className="h-5 w-5 text-yellow-400" />
                        Signalements
                        <ChevronRight className="h-4 w-4 ml-auto text-white/40" />
                      </NavLink>
                      <NavLink
                        to="/admin/logs"
                        onClick={() => setMobileMenuOpen(false)}
                        className={({ isActive }) =>
                          `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 ${isActive
                            ? 'bg-red-500/20 text-red-200'
                            : 'text-white/70 hover:text-white hover:bg-red-500/10'
                          }`
                        }
                      >
                        <Activity className="h-5 w-5 text-green-400" />
                        Logs
                        <ChevronRight className="h-4 w-4 ml-auto text-white/40" />
                      </NavLink>
                      <NavLink
                        to="/admin/challenges"
                        onClick={() => setMobileMenuOpen(false)}
                        className={({ isActive }) =>
                          `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 ${isActive
                            ? 'bg-red-500/20 text-red-200'
                            : 'text-white/70 hover:text-white hover:bg-red-500/10'
                          }`
                        }
                      >
                        <ClipboardList className="h-5 w-5 text-pink-400" />
                        Défis
                        <ChevronRight className="h-4 w-4 ml-auto text-white/40" />
                      </NavLink>
                      <NavLink
                        to="/admin/users"
                        onClick={() => setMobileMenuOpen(false)}
                        className={({ isActive }) =>
                          `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 ${isActive
                            ? 'bg-red-500/20 text-red-200'
                            : 'text-white/70 hover:text-white hover:bg-red-500/10'
                          }`
                        }
                      >
                        <User className="h-5 w-5 text-cyan-400" />
                        Utilisateurs
                        <ChevronRight className="h-4 w-4 ml-auto text-white/40" />
                      </NavLink>
                      <NavLink
                        to="/admin/refunds"
                        onClick={() => setMobileMenuOpen(false)}
                        className={({ isActive }) =>
                          `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 ${isActive
                            ? 'bg-red-500/20 text-red-200'
                            : 'text-white/70 hover:text-white hover:bg-red-500/10'
                          }`
                        }
                      >
                        <RotateCcw className="h-5 w-5 text-orange-400" />
                        Remboursements
                        <ChevronRight className="h-4 w-4 ml-auto text-white/40" />
                      </NavLink>
                      <NavLink
                        to="/admin/settings"
                        onClick={() => setMobileMenuOpen(false)}
                        className={({ isActive }) =>
                          `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 ${isActive
                            ? 'bg-red-500/20 text-red-200'
                            : 'text-white/70 hover:text-white hover:bg-red-500/10'
                          }`
                        }
                      >
                        <Settings className="h-5 w-5 text-gray-400" />
                        Paramètres
                        <ChevronRight className="h-4 w-4 ml-auto text-white/40" />
                      </NavLink>
                    </div>
                  )}

                  {/* User Info & Logout */}
                  <div className="pt-4 border-t border-white/10 space-y-3">
                    <div className="flex items-center gap-3 px-4 py-2">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-sm font-bold text-white">
                        {(user.name || 'U').slice(0, 1).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-white truncate">{user.name}</div>
                        <div className="text-xs text-white/60 truncate">{user.email}</div>
                      </div>
                      <span className="text-xs px-2 py-1 rounded-full bg-white/10 text-white/70">
                        {user.role || 'user'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        await handleLogout()
                        setMobileMenuOpen(false)
                      }}
                      className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-red-300 hover:bg-red-500/20 transition-all duration-200"
                    >
                      <LogOut className="h-5 w-5" />
                      Déconnexion
                    </button>
                  </div>
                </>
              ) : (
                /* Guest Links */
                <div className="space-y-3 pt-4 border-t border-white/10">
                  <NavLink
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium text-white/90 bg-white/5 hover:bg-white/10 border border-white/10 transition-all duration-200"
                  >
                    Connexion
                  </NavLink>
                  <NavLink
                    to="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="btn-primary flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold"
                  >
                    S'inscrire
                  </NavLink>
                </div>
              )}
            </div>
          </nav>
        </div>,
        document.body
      )}
    </header>
  )
}
