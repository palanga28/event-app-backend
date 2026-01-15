import { useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { api } from '../lib/api'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { User, Camera, Image as ImageIcon, Save, Check, X, Calendar, Clock } from 'lucide-react'
import { toast } from 'sonner'

export default function MePage() {
  const { user } = useAuth()

  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [bio, setBio] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarUploading, setAvatarUploading] = useState(false)

  const [storyFile, setStoryFile] = useState<File | null>(null)
  const [storyCaption, setStoryCaption] = useState('')
  const [storyLoading, setStoryLoading] = useState(false)
  const [storyOk, setStoryOk] = useState<string | null>(null)
  const [storyError, setStoryError] = useState<string | null>(null)
  const [myStories, setMyStories] = useState<any[]>([])

  useEffect(() => {
    if (!user) return
    let cancelled = false

    async function load() {
      try {
        setLoading(true)
        setError(null)
        const [pRes, sRes] = await Promise.all([
          api.get('/api/users/profile'),
          api.get('/api/stories/mine'),
        ])
        if (!cancelled) {
          setProfile(pRes.data)
          setBio(pRes.data?.bio || '')
          setMyStories(Array.isArray(sRes.data) ? sRes.data : [])
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
  }, [user?.id])

  async function saveBio() {
    setSavingProfile(true)
    setError(null)
    try {
      const res = await api.put('/api/users/profile', { bio })
      setProfile(res.data?.user || profile)
      toast.success('Profil mis à jour avec succès')
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Erreur mise à jour profil')
      toast.error('Erreur lors de la mise à jour du profil')
    } finally {
      setSavingProfile(false)
    }
  }

  async function uploadAvatar() {
    if (!avatarFile) return
    setAvatarUploading(true)
    setError(null)
    try {
      const fd = new FormData()
      fd.append('file', avatarFile)
      const uploadRes = await api.post('/api/uploads/profile-avatar', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      const url = uploadRes.data?.url
      if (!url) throw new Error('URL avatar manquante')
      const res = await api.put('/api/users/profile', { avatarUrl: url })
      setProfile(res.data?.user || profile)
      setAvatarFile(null)
      toast.success('Avatar mis à jour avec succès')
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Erreur upload avatar')
      toast.error('Erreur lors de l\'upload de l\'avatar')
    } finally {
      setAvatarUploading(false)
    }
  }

  async function createStory() {
    if (!storyFile) {
      setStoryError('Veuillez sélectionner une image')
      return
    }
    setStoryError(null)
    setStoryOk(null)
    setStoryLoading(true)
    try {
      const fd = new FormData()
      fd.append('file', storyFile)
      const uploadRes = await api.post('/api/uploads/story-image', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      const url = uploadRes.data?.url
      if (!url) throw new Error('URL story manquante')

      await api.post('/api/stories', { imageUrl: url, caption: storyCaption || null })
      const sRes = await api.get('/api/stories/mine')
      setMyStories(Array.isArray(sRes.data) ? sRes.data : [])
      setStoryOk('Story créée')
      setStoryCaption('')
      setStoryFile(null)
      toast.success('Story créée avec succès')
    } catch (e: any) {
      setStoryError(e?.response?.data?.message || e?.message || 'Erreur création story')
      toast.error('Erreur lors de la création de la story')
    } finally {
      setStoryLoading(false)
    }
  }

  if (!user) return null

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Skeleton className="h-10 w-64 bg-gradient-to-r from-white/10 to-white/5 rounded-xl" />
        <div className="ampia-glass p-6 space-y-4">
          <div className="flex items-center gap-6">
            <Skeleton className="h-32 w-32 rounded-full bg-gradient-to-r from-white/10 to-white/5" />
            <div className="flex-1 space-y-3">
              <Skeleton className="h-6 w-48 bg-gradient-to-r from-white/10 to-white/5 rounded" />
              <Skeleton className="h-4 w-64 bg-gradient-to-r from-white/10 to-white/5 rounded" />
              <Skeleton className="h-4 w-40 bg-gradient-to-r from-white/10 to-white/5 rounded" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Profile Section */}
      <div className="ampia-glass p-6 md:p-8 space-y-6">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-purple-500/20 to-pink-500/20 backdrop-blur-sm">
            <User className="h-6 w-6 text-purple-300" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">Mon profil</h1>
            <p className="text-sm text-white/60 mt-1">Gérez vos informations personnelles</p>
          </div>
        </div>

        {error && (
          <div className="animate-scale-in rounded-xl border border-red-500/30 bg-gradient-to-r from-red-500/20 to-rose-500/20 p-4 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500/20">
                <X className="h-4 w-4 text-red-300" />
              </div>
              <div className="text-sm text-red-200">{error}</div>
            </div>
          </div>
        )}

        <div className="flex flex-col md:flex-row items-start gap-6">
          {/* Avatar Section */}
          <div className="flex-shrink-0 space-y-4">
            <div className="relative group">
              <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-2xl border-2 border-white/20 bg-gradient-to-br from-purple-500/20 to-pink-500/20 shadow-lg backdrop-blur-sm">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt={user.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center justify-center text-white/60">
                    <User className="h-12 w-12 mb-2" />
                    <div className="text-xs">Pas d'avatar</div>
                  </div>
                )}
              </div>
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl">
                <Camera className="h-6 w-6 text-white" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer glass-input px-4 py-2 text-sm font-medium hover:bg-white/10 transition-colors">
                <Camera className="h-4 w-4" />
                <span>Choisir une image</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setAvatarFile((e.target.files && e.target.files[0]) || null)}
                  className="hidden"
                />
              </label>
              {avatarFile && (
                <Button
                  type="button"
                  onClick={uploadAvatar}
                  disabled={avatarUploading}
                  className="btn-primary w-full text-sm"
                >
                  {avatarUploading ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Upload en cours...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      Uploader
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>

          {/* Info Section */}
          <div className="flex-1 space-y-6 w-full">
            {/* User Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="ampia-glass p-4 space-y-2">
                <div className="text-xs text-white/60 font-medium">Nom complet</div>
                <div className="text-lg font-semibold text-white">{user.name}</div>
              </div>
              <div className="ampia-glass p-4 space-y-2">
                <div className="text-xs text-white/60 font-medium">Email</div>
                <div className="text-lg font-semibold text-white">{user.email}</div>
              </div>
              <div className="ampia-glass p-4 space-y-2">
                <div className="text-xs text-white/60 font-medium">Rôle</div>
                <div className="inline-flex items-center gap-2">
                  <span className="badge-gradient">{user.role || 'user'}</span>
                </div>
              </div>
              <div className="ampia-glass p-4 space-y-2">
                <div className="text-xs text-white/60 font-medium">Membre depuis</div>
                <div className="text-lg font-semibold text-white">
                  {user.created_at ? new Date(user.created_at).toLocaleDateString('fr-FR') : 'N/A'}
                </div>
              </div>
            </div>

            {/* Bio Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-white/90">Biographie</label>
                <span className="text-xs text-white/50">{bio.length} / 500</span>
              </div>
              <textarea
                className="glass-input w-full min-h-[120px] resize-none"
                value={bio}
                onChange={(e) => setBio(e.target.value.slice(0, 500))}
                placeholder="Parlez-nous de vous... Partagez vos passions, vos centres d'intérêt, ou simplement quelques mots pour que les autres vous connaissent mieux."
                rows={5}
              />
              <Button
                type="button"
                onClick={saveBio}
                disabled={savingProfile}
                className="btn-primary"
              >
                {savingProfile ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Sauvegarde...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Sauvegarder la bio
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Create Story Section */}
      <div className="ampia-glass p-6 md:p-8 space-y-6">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-pink-500/20 to-rose-500/20 backdrop-blur-sm">
            <ImageIcon className="h-6 w-6 text-pink-300" />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-white">Créer une story</h2>
            <p className="text-sm text-white/60 mt-1">Partagez un moment avec la communauté</p>
          </div>
        </div>

        {storyError && (
          <div className="animate-scale-in rounded-xl border border-red-500/30 bg-gradient-to-r from-red-500/20 to-rose-500/20 p-4 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <X className="h-5 w-5 text-red-300" />
              <div className="text-sm text-red-200">{storyError}</div>
            </div>
          </div>
        )}
        {storyOk && (
          <div className="animate-scale-in rounded-xl border border-emerald-400/30 bg-gradient-to-r from-emerald-400/20 to-green-400/20 p-4 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <Check className="h-5 w-5 text-emerald-300" />
              <div className="text-sm text-emerald-200">{storyOk}</div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-white/90 flex items-center gap-2">
              <ImageIcon className="h-4 w-4" />
              Image de la story
            </span>
            {storyFile ? (
              <div className="space-y-2">
                <div className="relative h-48 overflow-hidden rounded-xl border border-white/10 bg-white/5">
                  <img
                    src={URL.createObjectURL(storyFile)}
                    alt="Preview"
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setStoryFile(null)}
                    className="absolute top-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="text-xs text-white/60">{storyFile.name}</div>
              </div>
            ) : (
              <label className="glass-input flex cursor-pointer flex-col items-center justify-center gap-3 py-8 text-center hover:bg-white/10 transition-colors">
                <Camera className="h-8 w-8 text-white/60" />
                <span className="text-sm text-white/70">Cliquez pour sélectionner une image</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setStoryFile((e.target.files && e.target.files[0]) || null)}
                  className="hidden"
                />
              </label>
            )}
          </label>

          <div className="space-y-2">
            <label className="text-sm font-medium text-white/90 flex items-center gap-2">
              <span>💬</span>
              Description (optionnelle)
            </label>
            <textarea
              className="glass-input w-full min-h-[120px] resize-none"
              value={storyCaption}
              onChange={(e) => setStoryCaption(e.target.value)}
              placeholder="Ajoutez une légende à votre story..."
              rows={5}
              maxLength={500}
            />
            <div className="text-xs text-white/50 text-right">{storyCaption.length} / 500</div>
          </div>
        </div>

        <Button
          type="button"
          onClick={createStory}
          disabled={storyLoading || !storyFile}
          className="btn-primary w-full md:w-auto"
        >
          {storyLoading ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              Publication en cours...
            </>
          ) : (
            <>
              <ImageIcon className="h-4 w-4" />
              Publier la story
            </>
          )}
        </Button>
      </div>

      {/* My Stories Section */}
      <div className="ampia-glass p-6 md:p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-blue-500/20 to-cyan-500/20 backdrop-blur-sm">
              <ImageIcon className="h-6 w-6 text-blue-300" />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-white">Mes stories</h2>
              <p className="text-sm text-white/60 mt-1">{myStories.length} story{myStories.length > 1 ? 'ies' : ''} active{myStories.length > 1 ? 's' : ''}</p>
            </div>
          </div>
        </div>

        {myStories.length === 0 ? (
          <div className="ampia-glass p-12 text-center">
            <div className="text-6xl mb-4">📸</div>
            <h3 className="text-xl font-semibold text-white mb-2">Aucune story active</h3>
            <p className="text-white/70">Créez votre première story pour partager un moment avec la communauté !</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {myStories.map((s) => (
              <div
                key={s.id}
                className="group ampia-glass overflow-hidden p-0 transition-all duration-300 hover:scale-105"
              >
                <div className="relative aspect-[9/16] overflow-hidden bg-gradient-to-br from-purple-500/20 to-pink-500/20">
                  <img
                    src={s.image_url}
                    alt={s.caption || 'Story'}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                {s.caption && (
                  <div className="p-3 border-t border-white/10">
                    <p className="text-xs text-white/80 line-clamp-2">{s.caption}</p>
                  </div>
                )}
                <div className="p-3 border-t border-white/10 bg-white/5">
                  <div className="flex items-center gap-2 text-xs text-white/60">
                    <Clock className="h-3 w-3" />
                    <span>Expire: {new Date(s.expires_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit' })}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
