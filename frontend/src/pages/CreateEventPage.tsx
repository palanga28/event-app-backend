import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { Button } from '@/components/ui/button'
import { 
  Calendar, 
  MapPin, 
  FileText, 
  Image as ImageIcon, 
  Clock, 
  Sparkles,
  X,
  Plus,
  ArrowLeft,
} from 'lucide-react'

type CreatedEvent = {
  id: number
}

type CreateEventResponse = {
  message: string
  event: CreatedEvent
}

type TagSuggestion = { id: number; name: string; slug?: string }
type UserSuggestion = { id: number; name: string; avatar_url?: string | null; bio?: string | null }

function getTriggerAtCaret(text: string, caret: number): { trigger: '#' | '@'; q: string; from: number; to: number } | null {
  const safeCaret = Math.max(0, Math.min(caret, text.length))
  let i = safeCaret - 1
  while (i >= 0) {
    const ch = text[i]
    if (ch === ' ' || ch === '\n' || ch === '\t') break
    i--
  }
  const start = i + 1
  const token = text.slice(start, safeCaret)
  if (!token || token.length < 2) return null
  const first = token[0]
  if (first !== '#' && first !== '@') return null
  const q = token.slice(1)
  if (!q.trim()) return null
  return { trigger: first, q, from: start, to: safeCaret }
}

function insertToken(text: string, from: number, to: number, insert: string): { next: string; caret: number } {
  const before = text.slice(0, from)
  const after = text.slice(to)
  const spacerBefore = before && !before.endsWith(' ') && !before.endsWith('\n') ? ' ' : ''
  const spacerAfter = after && !after.startsWith(' ') && !after.startsWith('\n') ? ' ' : ' '
  const next = `${before}${spacerBefore}${insert}${spacerAfter}${after}`
  const caret = (before + spacerBefore + insert + spacerAfter).length
  return { next, caret }
}

export default function CreateEventPage() {
  const navigate = useNavigate()

  const descriptionRef = useRef<HTMLTextAreaElement | null>(null)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const [photos, setPhotos] = useState<File[]>([])

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [suggestOpen, setSuggestOpen] = useState(false)
  const [suggestMode, setSuggestMode] = useState<'tag' | 'mention' | null>(null)
  const [suggestQuery, setSuggestQuery] = useState('')
  const [suggestRange, setSuggestRange] = useState<{ from: number; to: number } | null>(null)
  const [tagSuggestions, setTagSuggestions] = useState<TagSuggestion[]>([])
  const [userSuggestions, setUserSuggestions] = useState<UserSuggestion[]>([])
  const [suggestActiveIndex, setSuggestActiveIndex] = useState(0)

  const activeList = useMemo(() => {
    return suggestMode === 'tag' ? tagSuggestions : suggestMode === 'mention' ? userSuggestions : []
  }, [suggestMode, tagSuggestions, userSuggestions])

  useEffect(() => {
    if (!suggestOpen || !suggestMode || !suggestQuery) return

    let cancelled = false
    const timer = setTimeout(async () => {
      try {
        if (suggestMode === 'tag') {
          const res = await api.get<TagSuggestion[]>(`/api/tags?q=${encodeURIComponent(suggestQuery)}&limit=8`)
          if (!cancelled) setTagSuggestions(Array.isArray(res.data) ? res.data : [])
        } else {
          const res = await api.get<UserSuggestion[]>(
            `/api/users/search?q=${encodeURIComponent(suggestQuery)}&limit=8`
          )
          if (!cancelled) setUserSuggestions(Array.isArray(res.data) ? res.data : [])
        }
      } catch {
        if (!cancelled) {
          if (suggestMode === 'tag') setTagSuggestions([])
          else setUserSuggestions([])
        }
      }
    }, 180)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [suggestOpen, suggestMode, suggestQuery])

  function onDescriptionChange(next: string) {
    setDescription(next)
    const el = descriptionRef.current
    if (!el) {
      setSuggestOpen(false)
      return
    }
    const caret = el.selectionStart ?? next.length
    const t = getTriggerAtCaret(next, caret)
    if (!t) {
      setSuggestOpen(false)
      setSuggestMode(null)
      setSuggestQuery('')
      setSuggestRange(null)
      return
    }
    setSuggestOpen(true)
    setSuggestMode(t.trigger === '#' ? 'tag' : 'mention')
    setSuggestQuery(t.q)
    setSuggestRange({ from: t.from, to: t.to })
    setSuggestActiveIndex(0)
  }

  function applySuggestion(item: TagSuggestion | UserSuggestion) {
    if (!suggestRange || !suggestMode) return
    const token = suggestMode === 'tag' ? `#${(item as TagSuggestion).name}` : `@${(item as UserSuggestion).name}`
    const { next, caret } = insertToken(description, suggestRange.from, suggestRange.to, token)
    setDescription(next)
    setSuggestOpen(false)
    setSuggestMode(null)
    setSuggestQuery('')
    setSuggestRange(null)
    setTagSuggestions([])
    setUserSuggestions([])
    requestAnimationFrame(() => {
      const el = descriptionRef.current
      if (!el) return
      el.focus()
      el.setSelectionRange(caret, caret)
    })
  }

  function onDescriptionKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (!suggestOpen || !suggestMode) return
    if (e.key === 'Escape') {
      e.preventDefault()
      setSuggestOpen(false)
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSuggestActiveIndex((i) => Math.min(i + 1, Math.max(0, activeList.length - 1)))
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSuggestActiveIndex((i) => Math.max(i - 1, 0))
      return
    }
    if (e.key === 'Enter') {
      const item = activeList[suggestActiveIndex]
      if (item) {
        e.preventDefault()
        applySuggestion(item as any)
      }
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      if (!Array.isArray(photos) || photos.length < 2) {
        throw new Error('Veuillez sélectionner au moins 2 photos')
      }

      const formData = new FormData()
      for (const f of photos) {
        formData.append('files', f)
      }

      const uploadRes = await api.post<{ urls: string[] }>('/api/uploads/event-images', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      const urls = uploadRes.data?.urls || []
      if (urls.length < 2) {
        throw new Error("Upload OK mais URLs manquantes")
      }

      const res = await api.post<CreateEventResponse>('/api/events', {
        title,
        description: description || null,
        location: location || null,
        startDate,
        endDate,
        coverImage: urls[0],
        images: urls,
      })

      const id = res.data?.event?.id
      if (!id) throw new Error('Événement créé mais ID manquant')

      navigate(`/events/${id}`)
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Erreur création')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in pb-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 hover:text-white transition-all"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-purple-500/20 to-pink-500/20 backdrop-blur-sm">
            <Sparkles className="h-6 w-6 text-purple-300" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">Créer un événement</h1>
            <p className="text-sm text-white/60 mt-1">Partagez votre événement avec la communauté</p>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="animate-scale-in rounded-xl border border-red-500/30 bg-gradient-to-r from-red-500/20 to-rose-500/20 p-4 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <X className="h-5 w-5 text-red-300" />
            <div className="text-sm text-red-200">{error}</div>
          </div>
        </div>
      )}

      <form className="space-y-6" onSubmit={onSubmit}>
        {/* Basic Info Card */}
        <div className="ampia-glass p-6 space-y-5">
          <div className="flex items-center gap-2 text-white/80">
            <FileText className="h-5 w-5 text-purple-400" />
            <h2 className="text-lg font-semibold">Informations de base</h2>
          </div>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-white/90">Titre de l'événement *</span>
            <input
              className="glass-input w-full"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Soirée électro au Warehouse"
              required
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-white/90">Description</span>
            <p className="text-xs text-white/50">Utilisez # pour les tags et @ pour mentionner des utilisateurs</p>
            <div className="relative">
              <textarea
                ref={descriptionRef}
                className="glass-input w-full min-h-[120px] resize-none"
                value={description}
                onChange={(e) => onDescriptionChange(e.target.value)}
                onKeyDown={onDescriptionKeyDown}
                placeholder="Décrivez votre événement... Ajoutez des #tags et @mentions"
                rows={5}
              />

              {suggestOpen && (
                <div className="absolute left-0 right-0 top-full z-20 mt-2 overflow-hidden ampia-glass">
                  <div className="flex items-center justify-between border-b border-white/10 px-3 py-2 text-xs text-white/70">
                    <div>{suggestMode === 'tag' ? 'Tags (#)' : 'Mentions (@)'}</div>
                    <div className="truncate">{suggestQuery}</div>
                  </div>

                  <div className="max-h-56 overflow-auto p-1">
                    {activeList.length === 0 ? (
                      <div className="px-3 py-2 text-sm text-white/60">Aucune suggestion.</div>
                    ) : (
                      activeList.map((it: any, idx: number) => (
                        <button
                          key={`${suggestMode}-${it.id}`}
                          type="button"
                          onClick={() => applySuggestion(it)}
                          className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-sm hover:bg-white/10 ${
                            idx === suggestActiveIndex ? 'bg-white/10' : ''
                          }`}
                        >
                          <div className="truncate">
                            <span className="text-white/70">{suggestMode === 'tag' ? '#' : '@'}</span>
                            {it.name}
                          </div>
                          <div className="text-xs text-white/50">Enter</div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-white/90 flex items-center gap-2">
              <MapPin className="h-4 w-4 text-purple-400" />
              Lieu
            </span>
            <input
              className="glass-input w-full"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Ex: Paris, France"
            />
          </label>
        </div>

        {/* Date & Time Card */}
        <div className="ampia-glass p-6 space-y-5">
          <div className="flex items-center gap-2 text-white/80">
            <Calendar className="h-5 w-5 text-blue-400" />
            <h2 className="text-lg font-semibold">Date et heure</h2>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="block space-y-2">
              <span className="text-sm font-medium text-white/90 flex items-center gap-2">
                <Clock className="h-4 w-4 text-green-400" />
                Début *
              </span>
              <input
                className="glass-input w-full"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                type="datetime-local"
                required
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-white/90 flex items-center gap-2">
                <Clock className="h-4 w-4 text-red-400" />
                Fin *
              </span>
              <input
                className="glass-input w-full"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                type="datetime-local"
                required
              />
            </label>
          </div>
        </div>

        {/* Photos Card */}
        <div className="ampia-glass p-6 space-y-5">
          <div className="flex items-center gap-2 text-white/80">
            <ImageIcon className="h-5 w-5 text-pink-400" />
            <h2 className="text-lg font-semibold">Photos</h2>
            <span className="text-xs text-white/50">(minimum 2 requises)</span>
          </div>

          <label className="block">
            <div className="glass-input flex cursor-pointer flex-col items-center justify-center gap-3 py-8 text-center hover:bg-white/10 transition-colors">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-pink-500/20 to-purple-500/20">
                <Plus className="h-7 w-7 text-pink-300" />
              </div>
              <div>
                <span className="text-sm font-medium text-white">Cliquez pour ajouter des images</span>
                <p className="text-xs text-white/50 mt-1">PNG, JPG, WEBP jusqu'à 10MB</p>
              </div>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => {
                  const files = Array.from(e.target.files || [])
                  setPhotos(files)
                }}
                className="hidden"
              />
            </div>
          </label>

          {photos.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-white/70">{photos.length} image{photos.length > 1 ? 's' : ''} sélectionnée{photos.length > 1 ? 's' : ''}</span>
                <button
                  type="button"
                  onClick={() => setPhotos([])}
                  className="text-xs text-red-300 hover:text-red-200 transition-colors"
                >
                  Tout supprimer
                </button>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                {photos.map((file, idx) => (
                  <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-white/10 bg-white/5">
                    <img
                      src={URL.createObjectURL(file)}
                      alt={`Preview ${idx + 1}`}
                      className="h-full w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setPhotos(photos.filter((_, i) => i !== idx))}
                      className="absolute top-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white hover:bg-red-500 transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {photos.length > 0 && photos.length < 2 && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
              ⚠️ Veuillez ajouter au moins 2 photos
            </div>
          )}
        </div>

        {/* Submit */}
        <Button
          type="submit"
          disabled={loading || photos.length < 2}
          className="btn-primary w-full py-4 text-base"
        >
          {loading ? (
            <>
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              Création en cours...
            </>
          ) : (
            <>
              <Sparkles className="h-5 w-5" />
              Créer l'événement
            </>
          )}
        </Button>

        <p className="text-center text-xs text-white/50">
          En créant cet événement, vous acceptez nos conditions d'utilisation.
        </p>
      </form>
    </div>
  )
}
