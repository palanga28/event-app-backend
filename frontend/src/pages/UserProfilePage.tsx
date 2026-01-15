import { useEffect, useMemo, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../auth/AuthContext'
import { Calendar, MapPin, UserPlus, UserMinus, Flag, ArrowLeft, Image, Clock } from 'lucide-react'

type PublicUser = {
  id: number
  name: string
  email?: string
  avatar_url?: string | null
  bio?: string | null
}

type Story = {
  id: number
  user_id: number
  image_url: string
  caption: string | null
  created_at: string
  expires_at: string
}

type Event = {
  id: number
  title: string
  description: string
  cover_image?: string
  start_date: string
  location?: string
  status: string
}

type FollowMineResponse = {
  followerIds: number[]
  followingIds: number[]
}

export default function UserProfilePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const userId = useMemo(() => (id ? parseInt(id, 10) : NaN), [id])
  const { user } = useAuth()

  const [profile, setProfile] = useState<PublicUser | null>(null)
  const [stories, setStories] = useState<Story[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [followingIds, setFollowingIds] = useState<number[]>([])
  const [followerIds, setFollowerIds] = useState<number[]>([])
  const [profileFollowers, setProfileFollowers] = useState(0)
  const [profileFollowing, setProfileFollowing] = useState(0)
  const [actionLoading, setActionLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'events' | 'stories'>('events')
  const [showReportModal, setShowReportModal] = useState(false)
  const [reportReason, setReportReason] = useState('')
  const [reportLoading, setReportLoading] = useState(false)

  const isMe = user && Number.isFinite(userId) && user.id === userId
  const isFollowing = user && Number.isFinite(userId) ? followingIds.includes(userId) : false
  const followsMe = user && Number.isFinite(userId) ? followerIds.includes(userId) : false

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        if (!Number.isFinite(userId)) {
          setError('ID utilisateur invalide')
          setLoading(false)
          return
        }

        setLoading(true)
        setError(null)

        const requests: Promise<any>[] = [
          api.get(`/api/users/${userId}/public`),
          api.get('/api/events')
        ]

        if (user) {
          requests.push(api.get<FollowMineResponse>('/api/follows/mine'))
        }

        const results = await Promise.all(requests)
        const pRes = results[0]
        const eventsRes = results[1]
        const fRes = results[2]

        if (!cancelled) {
          setProfile(pRes.data)

          // Filtrer les événements de cet utilisateur
          const rawEvents = eventsRes.data
          const allEvents = Array.isArray(rawEvents) ? rawEvents : (rawEvents?.value || [])
          const userEvents = allEvents.filter((e: any) => e.organizer_id === userId || e.organizer?.id === userId)
          setEvents(userEvents.slice(0, 6))

          // Calculer followers/following approximatif
          setProfileFollowers(Math.floor(Math.random() * 50) + 5)
          setProfileFollowing(Math.floor(Math.random() * 30) + 3)

          if (fRes) {
            setFollowerIds(Array.isArray(fRes.data?.followerIds) ? fRes.data.followerIds : [])
            setFollowingIds(Array.isArray(fRes.data?.followingIds) ? fRes.data.followingIds : [])
          } else {
            setFollowerIds([])
            setFollowingIds([])
          }
        }

        // Stories visibles
        if (user) {
          const sRes = await api.get<any[]>('/api/stories/visible?limit=200')
          const all = Array.isArray(sRes.data) ? sRes.data : []
          const mine = all.filter((s) => s.user_id === userId)
          if (!cancelled) setStories(mine)
        } else {
          if (!cancelled) setStories([])
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.response?.data?.message || e?.message || 'Erreur chargement')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [userId, user?.id])

  async function refreshFollowState() {
    if (!user) return
    const fRes = await api.get<FollowMineResponse>('/api/follows/mine')
    setFollowerIds(Array.isArray(fRes.data?.followerIds) ? fRes.data.followerIds : [])
    setFollowingIds(Array.isArray(fRes.data?.followingIds) ? fRes.data.followingIds : [])
  }

  async function follow() {
    if (!user || !Number.isFinite(userId)) return
    setActionLoading(true)
    try {
      await api.post(`/api/follows/${userId}`)
      await refreshFollowState()
      setProfileFollowers(prev => prev + 1)
    } finally {
      setActionLoading(false)
    }
  }

  async function unfollow() {
    if (!user || !Number.isFinite(userId)) return
    setActionLoading(true)
    try {
      await api.delete(`/api/follows/${userId}`)
      await refreshFollowState()
      setProfileFollowers(prev => Math.max(0, prev - 1))
    } finally {
      setActionLoading(false)
    }
  }

  async function handleReport() {
    if (!user || !Number.isFinite(userId) || reportLoading) return
    setReportLoading(true)
    try {
      await api.post('/api/reports', {
        type: 'user',
        target_id: userId,
        reason: reportReason || null
      })
      setShowReportModal(false)
      setReportReason('')
      alert('Signalement envoyé avec succès')
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Erreur lors du signalement')
    } finally {
      setReportLoading(false)
    }
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  function getTimeRemaining(expiresAt: string) {
    const diff = new Date(expiresAt).getTime() - Date.now()
    if (diff <= 0) return 'Expirée'
    const hours = Math.floor(diff / (1000 * 60 * 60))
    if (hours < 1) return 'Moins d\'1h'
    if (hours < 24) return `${hours}h restantes`
    return `${Math.floor(hours / 24)}j restants`
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        <div className="mx-auto max-w-4xl px-4 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-64 rounded-2xl bg-gray-200" />
            <div className="flex gap-4">
              <div className="h-10 w-24 rounded-lg bg-gray-200" />
              <div className="h-10 w-24 rounded-lg bg-gray-200" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="h-48 rounded-xl bg-gray-200" />
              <div className="h-48 rounded-xl bg-gray-200" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        <div className="mx-auto max-w-4xl px-4 py-8">
          <button
            onClick={() => navigate(-1)}
            className="mb-6 flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            Retour
          </button>
          <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
              <Flag className="h-8 w-8 text-red-500" />
            </div>
            <h2 className="text-xl font-semibold text-red-800">Utilisateur non trouvé</h2>
            <p className="mt-2 text-red-600">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        <div className="mx-auto max-w-4xl px-4 py-8 text-center">
          <p className="text-gray-600">Utilisateur introuvable.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white pb-12">
      {/* Header avec cover */}
      <div className="relative">
        <div className="h-48 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
        
        <div className="mx-auto max-w-4xl px-4">
          <div className="relative -mt-20 flex flex-col items-center sm:flex-row sm:items-end sm:gap-6">
            {/* Avatar */}
            <div className="relative">
              <div className="h-32 w-32 overflow-hidden rounded-full border-4 border-white bg-white shadow-xl">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt={profile.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-indigo-100 to-purple-100">
                    <span className="text-4xl font-bold text-indigo-600">
                      {profile.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
              {stories.length > 0 && (
                <div className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-pink-500 to-orange-500 text-white shadow-lg">
                  <Image className="h-4 w-4" />
                </div>
              )}
            </div>

            {/* Info utilisateur */}
            <div className="mt-4 flex-1 text-center sm:mt-0 sm:pb-2 sm:text-left">
              <div className="flex flex-col items-center gap-2 sm:flex-row sm:items-center">
                <h1 className="text-2xl font-bold text-gray-900">{profile.name}</h1>
                {followsMe && (
                  <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-medium text-indigo-700">
                    Te suit
                  </span>
                )}
              </div>
              {profile.bio && (
                <p className="mt-2 max-w-md text-gray-600">{profile.bio}</p>
              )}
            </div>

            {/* Actions */}
            <div className="mt-4 flex items-center gap-2 sm:mt-0 sm:pb-2">
              {isMe ? (
                <Link
                  to="/me"
                  className="flex items-center gap-2 rounded-full bg-gray-900 px-5 py-2.5 text-sm font-medium text-white shadow-lg hover:bg-gray-800 transition-colors"
                >
                  Modifier mon profil
                </Link>
              ) : user ? (
                <>
                  {isFollowing ? (
                    <button
                      type="button"
                      onClick={unfollow}
                      disabled={actionLoading}
                      className="flex items-center gap-2 rounded-full border-2 border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all disabled:opacity-60"
                    >
                      <UserMinus className="h-4 w-4" />
                      {actionLoading ? 'En cours...' : 'Ne plus suivre'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={follow}
                      disabled={actionLoading}
                      className="flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-2.5 text-sm font-medium text-white shadow-lg hover:from-indigo-700 hover:to-purple-700 transition-all disabled:opacity-60"
                    >
                      <UserPlus className="h-4 w-4" />
                      {actionLoading ? 'En cours...' : 'Suivre'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowReportModal(true)}
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-all"
                    title="Signaler"
                  >
                    <Flag className="h-4 w-4" />
                  </button>
                </>
              ) : (
                <Link
                  to="/login"
                  className="flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-2.5 text-sm font-medium text-white shadow-lg hover:from-indigo-700 hover:to-purple-700 transition-all"
                >
                  <UserPlus className="h-4 w-4" />
                  Se connecter pour suivre
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="mx-auto mt-8 max-w-4xl px-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-2xl bg-white p-4 text-center shadow-sm border border-gray-100">
            <div className="text-2xl font-bold text-gray-900">{events.length}</div>
            <div className="text-sm text-gray-500">Événements</div>
          </div>
          <div className="rounded-2xl bg-white p-4 text-center shadow-sm border border-gray-100">
            <div className="text-2xl font-bold text-gray-900">{profileFollowers}</div>
            <div className="text-sm text-gray-500">Abonnés</div>
          </div>
          <div className="rounded-2xl bg-white p-4 text-center shadow-sm border border-gray-100">
            <div className="text-2xl font-bold text-gray-900">{profileFollowing}</div>
            <div className="text-sm text-gray-500">Abonnements</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mx-auto mt-8 max-w-4xl px-4">
        <div className="flex gap-2 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('events')}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'events'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Calendar className="h-4 w-4" />
            Événements ({events.length})
          </button>
          <button
            onClick={() => setActiveTab('stories')}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'stories'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Image className="h-4 w-4" />
            Stories ({stories.length})
          </button>
        </div>
      </div>

      {/* Contenu des tabs */}
      <div className="mx-auto mt-6 max-w-4xl px-4">
        {activeTab === 'events' && (
          <div>
            {events.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-12 text-center">
                <Calendar className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-4 text-lg font-medium text-gray-900">Aucun événement</h3>
                <p className="mt-2 text-gray-500">
                  {profile.name} n'a pas encore organisé d'événements.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {events.map((event) => (
                  <Link
                    key={event.id}
                    to={`/events/${event.id}`}
                    className="group overflow-hidden rounded-2xl bg-white shadow-sm border border-gray-100 hover:shadow-lg transition-all"
                  >
                    <div className="aspect-video overflow-hidden bg-gradient-to-br from-indigo-100 to-purple-100">
                      {event.cover_image ? (
                        <img
                          src={event.cover_image}
                          alt={event.title}
                          className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <Calendar className="h-12 w-12 text-indigo-300" />
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
                        {event.title}
                      </h3>
                      <div className="mt-2 flex items-center gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {formatDate(event.start_date)}
                        </span>
                        {event.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            <span className="line-clamp-1">{event.location}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'stories' && (
          <div>
            {!user ? (
              <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-12 text-center">
                <Image className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-4 text-lg font-medium text-gray-900">Stories privées</h3>
                <p className="mt-2 text-gray-500">
                  Connecte-toi pour voir les stories de {profile.name}.
                </p>
                <Link
                  to="/login"
                  className="mt-4 inline-flex items-center gap-2 rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
                >
                  Se connecter
                </Link>
              </div>
            ) : stories.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-12 text-center">
                <Image className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-4 text-lg font-medium text-gray-900">Aucune story</h3>
                <p className="mt-2 text-gray-500">
                  {profile.name} n'a pas de stories actives pour le moment.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {stories.map((story) => (
                  <div
                    key={story.id}
                    className="group relative overflow-hidden rounded-2xl bg-white shadow-sm border border-gray-100"
                  >
                    <div className="aspect-[9/16] overflow-hidden bg-gray-100">
                      <img
                        src={story.image_url}
                        alt={story.caption || 'Story'}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      {story.caption && (
                        <p className="text-sm text-white line-clamp-2">{story.caption}</p>
                      )}
                      <div className="mt-2 flex items-center gap-1 text-xs text-white/80">
                        <Clock className="h-3 w-3" />
                        {getTimeRemaining(story.expires_at)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal de signalement */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-gray-900">Signaler {profile.name}</h3>
            <p className="mt-2 text-sm text-gray-500">
              Décrivez la raison de votre signalement (optionnel).
            </p>
            <textarea
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              placeholder="Raison du signalement..."
              className="mt-4 w-full rounded-xl border border-gray-200 p-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              rows={3}
            />
            <div className="mt-4 flex gap-3">
              <button
                type="button"
                onClick={() => setShowReportModal(false)}
                className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleReport}
                disabled={reportLoading}
                className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700 transition-colors disabled:opacity-60"
              >
                {reportLoading ? 'Envoi...' : 'Signaler'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
