import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../auth/AuthContext'
import { PaymentModal } from '../components/PaymentModal'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar } from '@/components/ui/avatar'
import {
  Heart,
  MapPin,
  Calendar,
  Clock,
  User,
  Share2,
  Ticket,
  ChevronLeft,
  ChevronRight,
  Star,
} from 'lucide-react'

type Organizer = {
  id: number
  name: string
  email: string
}

type Tag = {
  id: number
  name: string
  slug: string
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

type Event = {
  id: number
  title: string
  description: string | null
  start_date: string
  end_date: string
  location: string | null
  cover_image: string | null
  images?: string[] | null
  status: string
  organizer_id: number
  featured?: boolean
  organizer?: Organizer | null
  tags?: Tag[]
}

type TicketType = {
  id: number
  name: string
  description: string | null
  price: number
  quantity: number
  available_quantity: number
  event_id: number
  status: string
}

type CommentUser = {
  id: number
  name: string
  avatar_url?: string | null
}

type Comment = {
  id: number
  event_id: number
  user_id: number
  content: string
  created_at: string
  updated_at: string
  deleted_at?: string | null
  user?: CommentUser | null
}

export default function EventDetailPage() {
  const { id } = useParams()
  const eventId = Number(id)

  const { user } = useAuth()

  const [event, setEvent] = useState<Event | null>(null)
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [isFavorite, setIsFavorite] = useState(false)
  const [favoriteLoading, setFavoriteLoading] = useState(false)

  const [activeImageIndex, setActiveImageIndex] = useState(0)

  const [purchaseOk, setPurchaseOk] = useState<string | null>(null)

  // Payment Modal state
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const [selectedTicketType, setSelectedTicketType] = useState<TicketType | null>(null)

  const [ttName, setTtName] = useState('')
  const [ttDescription, setTtDescription] = useState('')
  const [ttPrice, setTtPrice] = useState('')
  const [ttQuantity, setTtQuantity] = useState('')
  const [createTtLoading, setCreateTtLoading] = useState(false)
  const [createTtError, setCreateTtError] = useState<string | null>(null)
  const [createTtOk, setCreateTtOk] = useState<string | null>(null)

  const [reportReason, setReportReason] = useState('')
  const [reportLoading, setReportLoading] = useState(false)
  const [reportError, setReportError] = useState<string | null>(null)
  const [reportOk, setReportOk] = useState<string | null>(null)

  const [tagsInput, setTagsInput] = useState('')
  const [tagsSaving, setTagsSaving] = useState(false)
  const [tagsError, setTagsError] = useState<string | null>(null)
  const [tagsOk, setTagsOk] = useState<string | null>(null)

  const [comments, setComments] = useState<Comment[]>([])
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [commentsError, setCommentsError] = useState<string | null>(null)
  const [newComment, setNewComment] = useState('')
  const [commentActionLoadingId, setCommentActionLoadingId] = useState<number | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingValue, setEditingValue] = useState('')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null)

  const newCommentRef = useRef<HTMLTextAreaElement | null>(null)
  const [commentSuggestOpen, setCommentSuggestOpen] = useState(false)
  const [commentSuggestMode, setCommentSuggestMode] = useState<'tag' | 'mention' | null>(null)
  const [commentSuggestQuery, setCommentSuggestQuery] = useState('')
  const [commentSuggestRange, setCommentSuggestRange] = useState<{ from: number; to: number } | null>(null)
  const [commentTagSuggestions, setCommentTagSuggestions] = useState<TagSuggestion[]>([])
  const [commentUserSuggestions, setCommentUserSuggestions] = useState<UserSuggestion[]>([])
  const [commentSuggestActiveIndex, setCommentSuggestActiveIndex] = useState(0)

  const commentActiveList = useMemo(() => {
    return commentSuggestMode === 'tag'
      ? commentTagSuggestions
      : commentSuggestMode === 'mention'
        ? commentUserSuggestions
        : []
  }, [commentSuggestMode, commentTagSuggestions, commentUserSuggestions])

  useEffect(() => {
    if (!commentSuggestOpen || !commentSuggestMode || !commentSuggestQuery) return

    let cancelled = false
    const timer = setTimeout(async () => {
      try {
        if (commentSuggestMode === 'tag') {
          const res = await api.get<TagSuggestion[]>(`/api/tags?q=${encodeURIComponent(commentSuggestQuery)}&limit=8`)
          if (!cancelled) setCommentTagSuggestions(Array.isArray(res.data) ? res.data : [])
        } else {
          const res = await api.get<UserSuggestion[]>(
            `/api/users/search?q=${encodeURIComponent(commentSuggestQuery)}&limit=8`
          )
          if (!cancelled) setCommentUserSuggestions(Array.isArray(res.data) ? res.data : [])
        }
      } catch {
        if (!cancelled) {
          if (commentSuggestMode === 'tag') setCommentTagSuggestions([])
          else setCommentUserSuggestions([])
        }
      }
    }, 180)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [commentSuggestOpen, commentSuggestMode, commentSuggestQuery])

  async function report(type: 'event' | 'user', targetId: number) {
    setReportError(null)
    setReportOk(null)
    setReportLoading(true)
    try {
      await api.post('/api/reports', {
        type,
        targetId,
        reason: reportReason || null,
      })
      setReportOk('Signalement envoyé')
      setReportReason('')
    } catch (e: any) {
      setReportError(e?.response?.data?.message || e?.message || 'Erreur signalement')
    } finally {
      setReportLoading(false)
    }
  }

  function onNewCommentChange(next: string) {
    setNewComment(next)
    const el = newCommentRef.current
    if (!el) {
      setCommentSuggestOpen(false)
      return
    }
    const caret = el.selectionStart ?? next.length
    const t = getTriggerAtCaret(next, caret)
    if (!t) {
      setCommentSuggestOpen(false)
      setCommentSuggestMode(null)
      setCommentSuggestQuery('')
      setCommentSuggestRange(null)
      return
    }
    setCommentSuggestOpen(true)
    setCommentSuggestMode(t.trigger === '#' ? 'tag' : 'mention')
    setCommentSuggestQuery(t.q)
    setCommentSuggestRange({ from: t.from, to: t.to })
    setCommentSuggestActiveIndex(0)
  }

  function applyCommentSuggestion(item: TagSuggestion | UserSuggestion) {
    if (!commentSuggestRange || !commentSuggestMode) return
    const token = commentSuggestMode === 'tag' ? `#${(item as TagSuggestion).name}` : `@${(item as UserSuggestion).name}`
    const { next, caret } = insertToken(newComment, commentSuggestRange.from, commentSuggestRange.to, token)
    setNewComment(next)
    setCommentSuggestOpen(false)
    setCommentSuggestMode(null)
    setCommentSuggestQuery('')
    setCommentSuggestRange(null)
    setCommentTagSuggestions([])
    setCommentUserSuggestions([])
    requestAnimationFrame(() => {
      const el = newCommentRef.current
      if (!el) return
      el.focus()
      el.setSelectionRange(caret, caret)
    })
  }

  function onNewCommentKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (!commentSuggestOpen || !commentSuggestMode) return
    if (e.key === 'Escape') {
      e.preventDefault()
      setCommentSuggestOpen(false)
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setCommentSuggestActiveIndex((i) => Math.min(i + 1, Math.max(0, commentActiveList.length - 1)))
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setCommentSuggestActiveIndex((i) => Math.max(i - 1, 0))
      return
    }
    if (e.key === 'Enter') {
      const item = commentActiveList[commentSuggestActiveIndex]
      if (item) {
        e.preventDefault()
        applyCommentSuggestion(item as any)
      }
    }
  }

  async function createTicketType() {
    setCreateTtError(null)
    setCreateTtOk(null)
    setCreateTtLoading(true)
    try {
      const price = parseFloat(ttPrice)
      const quantity = parseInt(ttQuantity)

      if (!ttName.trim()) throw new Error('Nom requis')
      if (!Number.isFinite(price) || price < 0) throw new Error('Prix invalide')
      if (!Number.isFinite(quantity) || quantity <= 0) throw new Error('Quantité invalide')

      await api.post('/api/ticket-types', {
        name: ttName.trim(),
        description: ttDescription.trim() || null,
        price,
        quantity,
        eventId,
      })

      setCreateTtOk('Ticket créé')
      setTtName('')
      setTtDescription('')
      setTtPrice('')
      setTtQuantity('')

      const ttRes = await api.get<TicketType[]>(`/api/ticket-types/event/${eventId}`)
      setTicketTypes(ttRes.data)
    } catch (e: any) {
      setCreateTtError(e?.response?.data?.message || e?.message || 'Erreur création ticket')
    } finally {
      setCreateTtLoading(false)
    }
  }

  function quickCreate(type: 'standard' | 'vip' | 'double-vip') {
    const defaults = {
      standard: { name: 'Standard', price: '10' },
      vip: { name: 'VIP', price: '25' },
      'double-vip': { name: 'Double VIP', price: '80' },
    }
    const { name, price } = defaults[type]
    setTtName(name)
    setTtPrice(price)
    setTtDescription('')
    setTtQuantity('50')
  }

  function openPaymentModal(ticketType: TicketType) {
    setSelectedTicketType(ticketType)
    setPaymentModalOpen(true)
  }

  async function handlePaymentSuccess() {
    setPurchaseOk('Paiement réussi ! Votre ticket a été créé.')
    // Rafraîchir les types de tickets
    try {
      const ttRes = await api.get<TicketType[]>(`/api/ticket-types/event/${eventId}`)
      setTicketTypes(ttRes.data)
    } catch (e) {
      console.error('Erreur rafraîchissement tickets:', e)
    }
  }

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        setLoading(true)
        setError(null)

        if (!eventId || Number.isNaN(eventId)) {
          throw new Error('ID événement invalide')
        }

        const [evRes, ttRes] = await Promise.all([
          api.get<Event>(`/api/events/${eventId}`),
          api.get<TicketType[]>(`/api/ticket-types/event/${eventId}`),
        ])

        if (!cancelled) {
          setEvent(evRes.data)
          setTicketTypes(ttRes.data)
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
  }, [eventId])

  useEffect(() => {
    let cancelled = false

    async function loadFavorite() {
      try {
        if (!user || !eventId) {
          setIsFavorite(false)
          return
        }
        const res = await api.get<{ id: number }[]>('/api/favorites')
        const ids = new Set((Array.isArray(res.data) ? res.data : []).map((e) => e.id))
        if (!cancelled) setIsFavorite(ids.has(eventId))
      } catch {
        if (!cancelled) setIsFavorite(false)
      }
    }

    loadFavorite()

    return () => {
      cancelled = true
    }
  }, [user?.id, eventId])

  async function toggleFavorite() {
    if (!user) return
    const current = isFavorite
    setIsFavorite(!current)
    setFavoriteLoading(true)
    try {
      if (current) await api.delete(`/api/events/${eventId}/favorite`)
      else await api.post(`/api/events/${eventId}/favorite`)
      toast.success(current ? 'Retiré des favoris' : 'Ajouté aux favoris')
    } catch {
      setIsFavorite(current)
      toast.error('Erreur favoris')
    } finally {
      setFavoriteLoading(false)
    }
  }

  useEffect(() => {
    if (!event) return
    const images = Array.isArray(event.images) ? event.images.filter(Boolean) : []
    if (images.length < 2) return

    setActiveImageIndex(0)
    const timer = setInterval(() => {
      setActiveImageIndex((i) => (i + 1) % images.length)
    }, 3000)

    return () => clearInterval(timer)
  }, [event?.id])

  useEffect(() => {
    if (!event) return
    const names = Array.isArray(event.tags) ? event.tags.map((t) => t.name).filter(Boolean) : []
    setTagsInput(names.join(', '))
  }, [event?.id])

  async function saveTags() {
    if (!user) return
    setTagsError(null)
    setTagsOk(null)
    setTagsSaving(true)
    try {
      const names = tagsInput
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)

      const res = await api.put<{ message: string; tags: Tag[] }>(`/api/events/${eventId}/tags`, { names })

      const nextTags = Array.isArray(res.data?.tags) ? res.data.tags : []
      setEvent((prev) => (prev ? { ...prev, tags: nextTags } : prev))
      setTagsInput(nextTags.map((t) => t.name).join(', '))
      setTagsOk('Tags sauvegardés')
      toast.success('Tags sauvegardés')
    } catch (e: any) {
      setTagsError(e?.response?.data?.message || e?.message || 'Erreur sauvegarde tags')
      toast.error('Erreur sauvegarde tags')
    } finally {
      setTagsSaving(false)
    }
  }

  useEffect(() => {
    let cancelled = false

    async function loadComments() {
      try {
        setCommentsError(null)
        setCommentsLoading(true)
        const res = await api.get<Comment[]>(`/api/events/${eventId}/comments`)
        if (!cancelled) setComments(Array.isArray(res.data) ? res.data : [])
      } catch (e: any) {
        if (!cancelled) setCommentsError(e?.response?.data?.message || e?.message || 'Erreur chargement commentaires')
      } finally {
        if (!cancelled) setCommentsLoading(false)
      }
    }

    if (eventId && !Number.isNaN(eventId)) {
      loadComments()
    }

    return () => {
      cancelled = true
    }
  }, [eventId])

  async function addComment() {
    if (!user) return
    const content = newComment.trim()
    if (!content) return
    setCommentsError(null)
    setCommentActionLoadingId(-1)
    try {
      await api.post(`/api/events/${eventId}/comments`, { content })
      setNewComment('')
      const res = await api.get<Comment[]>(`/api/events/${eventId}/comments`)
      setComments(Array.isArray(res.data) ? res.data : [])
      toast.success('Commentaire publié')
    } catch (e: any) {
      setCommentsError(e?.response?.data?.message || e?.message || 'Erreur ajout commentaire')
      toast.error('Erreur ajout commentaire')
    } finally {
      setCommentActionLoadingId(null)
    }
  }

  function startEdit(c: Comment) {
    setEditingId(c.id)
    setEditingValue(c.content)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditingValue('')
  }

  async function saveEdit(commentId: number) {
    if (!user) return
    const content = editingValue.trim()
    if (!content) return
    setCommentsError(null)
    setCommentActionLoadingId(commentId)
    try {
      await api.put(`/api/comments/${commentId}`, { content })
      const res = await api.get<Comment[]>(`/api/events/${eventId}/comments`)
      setComments(Array.isArray(res.data) ? res.data : [])
      cancelEdit()
      toast.success('Commentaire modifié')
    } catch (e: any) {
      setCommentsError(e?.response?.data?.message || e?.message || 'Erreur modification commentaire')
      toast.error('Erreur modification commentaire')
    } finally {
      setCommentActionLoadingId(null)
    }
  }

  async function deleteComment(commentId: number) {
    if (!user) return
    setCommentsError(null)
    setCommentActionLoadingId(commentId)
    try {
      await api.delete(`/api/comments/${commentId}`)
      setComments((prev) => prev.filter((c) => c.id !== commentId))
      if (editingId === commentId) cancelEdit()
      toast.success('Commentaire supprimé')
    } catch (e: any) {
      setCommentsError(e?.response?.data?.message || e?.message || 'Erreur suppression commentaire')
      toast.error('Erreur suppression commentaire')
    } finally {
      setCommentActionLoadingId(null)
    }
  }

  function requestDelete(commentId: number) {
    setPendingDeleteId(commentId)
    setDeleteDialogOpen(true)
  }

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-1/2 bg-white/10" />
        <Skeleton className="h-64 w-full bg-white/10" />
        <Skeleton className="h-24 w-full bg-white/10" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-3">
        <div className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
          {error}
        </div>
        <Link to="/" className="text-sm text-white underline decoration-white/20">
          Retour
        </Link>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="space-y-3">
        <div className="text-sm text-white/70">Événement introuvable.</div>
        <Link to="/" className="text-sm text-white underline decoration-white/20">
          Retour
        </Link>
      </div>
    )
  }

  const organizerId = event.organizer?.id
  const canManageTickets = !!user && (user.role === 'admin' || user.id === event.organizer_id)
  const canManageTags = !!user && (user.role === 'admin' || user.id === event.organizer_id)
  const images = Array.isArray(event.images) ? event.images.filter(Boolean) : []
  const heroImage = images.length > 0 ? images[activeImageIndex % images.length] : event.cover_image

  const formattedStartDate = new Date(event.start_date).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const formattedStartTime = new Date(event.start_date).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  })

  const formattedEndTime = new Date(event.end_date).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div className="space-y-6 pb-8">
      <AlertDialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          setDeleteDialogOpen(open)
          if (!open) setPendingDeleteId(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce commentaire ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le commentaire sera supprimé définitivement.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingDeleteId != null) {
                  void deleteComment(pendingDeleteId)
                }
              }}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Hero Section */}
      <div className="relative">
        {/* Image Gallery */}
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5">
          <div className="aspect-[16/9] sm:aspect-[21/9] w-full">
            {heroImage ? (
              <img
                src={heroImage}
                alt={event.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="h-full w-full bg-gradient-to-br from-purple-500/20 via-pink-500/20 to-blue-500/20 flex items-center justify-center">
                <span className="text-8xl opacity-30">🎉</span>
              </div>
            )}
            
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          </div>

          {/* Image Navigation */}
          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={() => setActiveImageIndex((i) => (i - 1 + images.length) % images.length)}
                className="absolute left-3 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm hover:bg-black/70 transition-all"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => setActiveImageIndex((i) => (i + 1) % images.length)}
                className="absolute right-3 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm hover:bg-black/70 transition-all"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
              
              {/* Dots */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                {images.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveImageIndex(idx)}
                    className={`h-2 w-2 rounded-full transition-all ${
                      idx === activeImageIndex ? 'bg-white w-6' : 'bg-white/50 hover:bg-white/70'
                    }`}
                  />
                ))}
              </div>
            </>
          )}

          {/* Featured Badge */}
          {event.featured && (
            <div className="absolute top-4 left-4">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-3 py-1.5 text-sm font-semibold text-white shadow-lg">
                <Star className="h-4 w-4 fill-current" />
                En vedette
              </span>
            </div>
          )}

          {/* Actions */}
          <div className="absolute top-4 right-4 flex gap-2">
            {user && (
              <button
                type="button"
                onClick={toggleFavorite}
                disabled={favoriteLoading}
                className={`flex h-10 w-10 items-center justify-center rounded-full backdrop-blur-md transition-all ${
                  isFavorite
                    ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-lg shadow-pink-500/50'
                    : 'bg-black/50 text-white hover:bg-black/70'
                }`}
              >
                <Heart className={`h-5 w-5 ${isFavorite ? 'fill-current' : ''}`} />
              </button>
            )}
            <button
              type="button"
              onClick={() => navigator.share?.({ title: event.title, url: window.location.href })}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-md hover:bg-black/70 transition-all"
            >
              <Share2 className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Thumbnail Gallery */}
        {images.length > 1 && (
          <div className="mt-3 flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {images.map((img, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setActiveImageIndex(idx)}
                className={`flex-shrink-0 overflow-hidden rounded-lg border-2 transition-all ${
                  idx === activeImageIndex ? 'border-purple-500 ring-2 ring-purple-500/50' : 'border-transparent opacity-60 hover:opacity-100'
                }`}
              >
                <img src={img} alt="" className="h-16 w-24 object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Event Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Title & Basic Info */}
          <div className="ampia-glass p-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-4">{event.title}</h1>
            
            <div className="flex flex-wrap gap-4 text-sm">
              {event.location && (
                <div className="flex items-center gap-2 text-white/80">
                  <MapPin className="h-5 w-5 text-purple-400" />
                  <span>{event.location}</span>
                </div>
              )}
              
              <div className="flex items-center gap-2 text-white/80">
                <Calendar className="h-5 w-5 text-blue-400" />
                <span>{formattedStartDate}</span>
              </div>
              
              <div className="flex items-center gap-2 text-white/80">
                <Clock className="h-5 w-5 text-green-400" />
                <span>{formattedStartTime} - {formattedEndTime}</span>
              </div>
            </div>

            {/* Organizer */}
            {event.organizer && (
              <Link
                to={`/users/${event.organizer.id}`}
                className="mt-6 flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all group"
              >
                <Avatar
                  fallback={event.organizer.name}
                  size="md"
                />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-white group-hover:text-purple-300 transition-colors">
                    {event.organizer.name}
                  </div>
                  <div className="text-xs text-white/60">Organisateur</div>
                </div>
                <User className="h-5 w-5 text-white/40 group-hover:text-purple-400 transition-colors" />
              </Link>
            )}

            {/* Description */}
            {event.description && (
              <div className="mt-6 pt-6 border-t border-white/10">
                <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-3">À propos</h3>
                <p className="text-white/80 whitespace-pre-wrap leading-relaxed">{event.description}</p>
              </div>
            )}

            {/* Tags Section */}
            <div className="mt-6 pt-6 border-t border-white/10">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold tracking-wide">Tags</h2>
            {canManageTags ? (
              <button
                type="button"
                onClick={saveTags}
                disabled={tagsSaving}
                className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white hover:bg-white/10 disabled:opacity-60"
              >
                {tagsSaving ? 'Sauvegarde...' : 'Sauvegarder'}
              </button>
            ) : null}
          </div>

          {tagsError ? (
            <div className="mt-3 rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{tagsError}</div>
          ) : null}

          {tagsOk ? (
            <div className="mt-3 rounded-md border border-emerald-400/30 bg-emerald-400/10 p-3 text-sm text-emerald-200">{tagsOk}</div>
          ) : null}

          <div className="mt-3 flex flex-wrap gap-2">
            {(event.tags || []).length === 0 ? (
              <div className="text-sm text-white/70">Aucun tag.</div>
            ) : (
              (event.tags || []).map((t) => (
                <span
                  key={t.id}
                  className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-2 py-0.5 text-xs text-cyan-100"
                >
                  {t.name}
                </span>
              ))
            )}
          </div>

          {canManageTags ? (
            <div className="mt-3">
              <input
                className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="Ex: music, paris, nightlife"
              />
              <div className="mt-2 text-xs text-white/60">Sépare les tags par des virgules.</div>
            </div>
          ) : null}
        </div>

        <div className="mt-6 border-t border-white/10 pt-4">
          <h2 className="text-sm font-semibold tracking-wide">Commentaires</h2>

          {commentsError ? (
            <div className="mt-3 rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
              {commentsError}
            </div>
          ) : null}

          {commentsLoading ? <div className="mt-3 text-sm text-white/70">Chargement...</div> : null}

          {!commentsLoading ? (
            comments.length === 0 ? (
              <div className="mt-3 text-sm text-white/70">Aucun commentaire.</div>
            ) : (
              <div className="mt-3 space-y-3">
                {comments.map((c) => {
                  const canEdit = !!user && (user.role === 'admin' || user.id === c.user_id)
                  const isEditing = editingId === c.id
                  return (
                    <div key={c.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="text-xs text-white/60">
                            <Link
                              to={`/users/${c.user?.id || c.user_id}`}
                              className="underline decoration-white/20 hover:decoration-white/40"
                            >
                              {c.user?.name || `User #${c.user_id}`}
                            </Link>{' '}
                            · {new Date(c.created_at).toLocaleString()}
                          </div>

                          {isEditing ? (
                            <textarea
                              className="mt-2 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
                              rows={3}
                              value={editingValue}
                              onChange={(e) => setEditingValue(e.target.value)}
                            />
                          ) : (
                            <div className="mt-2 whitespace-pre-wrap text-sm text-white/85">{c.content}</div>
                          )}
                        </div>

                        {canEdit ? (
                          <div className="flex shrink-0 flex-col gap-2">
                            {isEditing ? (
                              <>
                                <button
                                  type="button"
                                  disabled={commentActionLoadingId === c.id}
                                  onClick={() => saveEdit(c.id)}
                                  className="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white hover:bg-white/10 disabled:opacity-60"
                                >
                                  {commentActionLoadingId === c.id ? '...' : 'Enregistrer'}
                                </button>
                                <button
                                  type="button"
                                  onClick={cancelEdit}
                                  className="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white hover:bg-white/10"
                                >
                                  Annuler
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => startEdit(c)}
                                  className="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white hover:bg-white/10"
                                >
                                  Éditer
                                </button>
                                <button
                                  type="button"
                                  disabled={commentActionLoadingId === c.id}
                                  onClick={() => requestDelete(c.id)}
                                  className="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white hover:bg-white/10 disabled:opacity-60"
                                >
                                  {commentActionLoadingId === c.id ? '...' : 'Supprimer'}
                                </button>
                              </>
                            )}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          ) : null}

          {user ? (
            <div className="mt-4">
              <div className="relative">
                <textarea
                  ref={newCommentRef}
                  className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40"
                  rows={3}
                  placeholder="Ajouter un commentaire..."
                  value={newComment}
                  onChange={(e) => onNewCommentChange(e.target.value)}
                  onKeyDown={onNewCommentKeyDown}
                />

                {commentSuggestOpen ? (
                  <div className="ampia-glass absolute left-0 right-0 top-full z-20 mt-2 overflow-hidden text-white">
                    <div className="flex items-center justify-between border-b border-white/10 px-3 py-2 text-xs text-white/70">
                      <div>{commentSuggestMode === 'tag' ? 'Tags (#)' : 'Mentions (@)'}</div>
                      <div className="truncate">{commentSuggestQuery}</div>
                    </div>

                    <div className="max-h-56 overflow-auto p-1">
                      {commentActiveList.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-white/60">Aucune suggestion.</div>
                      ) : (
                        commentActiveList.map((it: any, idx: number) => (
                          <button
                            key={`${commentSuggestMode}-${it.id}`}
                            type="button"
                            onClick={() => applyCommentSuggestion(it)}
                            className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-sm hover:bg-white/10 ${
                              idx === commentSuggestActiveIndex ? 'bg-black/60' : ''
                            }`}
                          >
                            <div className="truncate">
                              <span className="text-white/70">{commentSuggestMode === 'tag' ? '#' : '@'}</span>
                              {it.name}
                            </div>
                            <div className="text-xs text-white/50">Enter</div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
              <button
                type="button"
                disabled={commentActionLoadingId === -1}
                onClick={addComment}
                className="mt-2 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white hover:bg-white/10 disabled:opacity-60"
              >
                {commentActionLoadingId === -1 ? 'Envoi...' : 'Publier'}
              </button>
            </div>
          ) : (
            <div className="mt-3 text-sm text-white/70">Connecte-toi pour commenter.</div>
          )}
        </div>

        {user ? (
          <div className="mt-6 border-t border-white/10 pt-4">
            <h2 className="text-sm font-semibold tracking-wide">Signaler</h2>

            {reportError ? (
              <div className="mt-3 rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
                {reportError}
              </div>
            ) : null}

            {reportOk ? (
              <div className="mt-3 rounded-md border border-emerald-400/30 bg-emerald-400/10 p-3 text-sm text-emerald-200">
                {reportOk}
              </div>
            ) : null}

            <label className="mt-3 block">
              <span className="text-sm text-white/80">Raison (optionnel)</span>
              <textarea
                className="mt-1 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-white placeholder:text-white/40"
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                rows={3}
                maxLength={1000}
              />
            </label>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={reportLoading}
                onClick={() => report('event', event.id)}
                className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white hover:bg-white/10 disabled:opacity-60"
              >
                {reportLoading ? 'Envoi...' : 'Signaler cet événement'}
              </button>

              {event.organizer ? (
                <button
                  type="button"
                  disabled={reportLoading}
                  onClick={() => {
                    if (organizerId) report('user', organizerId)
                  }}
                  className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white hover:bg-white/10 disabled:opacity-60"
                >
                  {reportLoading ? 'Envoi...' : "Signaler l'organisateur"}
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
          </div>
        </div>

        {/* Right Column - Tickets */}
        <div className="lg:col-span-1">
          <div className="ampia-glass p-6 text-white sticky top-24">
            <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2">
              <Ticket className="h-5 w-5 text-green-400" />
              Tickets
            </h2>

        {canManageTickets ? (
          <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="text-sm font-semibold">Créer un type de ticket</div>

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => quickCreate('standard')}
                className="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white hover:bg-white/10"
              >
                Standard
              </button>
              <button
                type="button"
                onClick={() => quickCreate('vip')}
                className="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white hover:bg-white/10"
              >
                VIP
              </button>
              <button
                type="button"
                onClick={() => quickCreate('double-vip')}
                className="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white hover:bg-white/10"
              >
                Double VIP
              </button>
            </div>

            {createTtError ? (
              <div className="mt-3 rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
                {createTtError}
              </div>
            ) : null}

            {createTtOk ? (
              <div className="mt-3 rounded-md border border-emerald-400/30 bg-emerald-400/10 p-3 text-sm text-emerald-200">
                {createTtOk}
              </div>
            ) : null}

            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
              <label className="block">
                <span className="text-sm text-white/80">Nom</span>
                <input
                  className="mt-1 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-white placeholder:text-white/40"
                  value={ttName}
                  onChange={(e) => setTtName(e.target.value)}
                  placeholder="Ex: VIP"
                />
              </label>

              <label className="block">
                <span className="text-sm text-white/80">Prix (FC)</span>
                <input
                  className="mt-1 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-white placeholder:text-white/40"
                  value={ttPrice}
                  onChange={(e) => setTtPrice(e.target.value)}
                  placeholder="10"
                  inputMode="decimal"
                />
              </label>

              <label className="block md:col-span-2">
                <span className="text-sm text-white/80">Description (optionnel)</span>
                <input
                  className="mt-1 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-white placeholder:text-white/40"
                  value={ttDescription}
                  onChange={(e) => setTtDescription(e.target.value)}
                  placeholder="Accès VIP + goodies"
                />
              </label>

              <label className="block">
                <span className="text-sm text-white/80">Quantité</span>
                <input
                  className="mt-1 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-white placeholder:text-white/40"
                  value={ttQuantity}
                  onChange={(e) => setTtQuantity(e.target.value)}
                  placeholder="50"
                  inputMode="numeric"
                />
              </label>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={createTicketType}
                  disabled={createTtLoading}
                  className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white hover:bg-white/10 disabled:opacity-60"
                >
                  {createTtLoading ? 'Création...' : 'Créer'}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {purchaseOk ? (
          <div className="mt-3 rounded-md border border-emerald-400/30 bg-emerald-400/10 p-3 text-sm text-emerald-200">
            {purchaseOk}
          </div>
        ) : null}

        {ticketTypes.length === 0 ? (
          <div className="mt-2 text-sm text-white/70">Aucun ticket pour cet événement.</div>
        ) : (
          <div className="mt-3 space-y-3">
            {ticketTypes.map((tt) => (
              <div key={tt.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-medium">{tt.name}</div>
                    {tt.description ? (
                      <div className="text-sm text-white/70">{tt.description}</div>
                    ) : null}
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">{tt.price} FC</div>
                    <div className="text-xs text-white/60">Dispo: {tt.available_quantity}</div>
                  </div>
                </div>

                {user ? (
                  <div className="mt-3 flex items-center justify-end">
                    <button
                      type="button"
                      disabled={tt.available_quantity <= 0}
                      onClick={() => openPaymentModal(tt)}
                      className="btn-primary px-4 py-2 text-sm"
                    >
                      {tt.available_quantity <= 0 ? 'Épuisé' : 'Acheter'}
                    </button>
                  </div>
                ) : (
                  <div className="mt-3 text-sm text-white/70">
                    Connecte-toi pour acheter.
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      <PaymentModal
        open={paymentModalOpen}
        onOpenChange={setPaymentModalOpen}
        ticketType={selectedTicketType}
        event={event ? { id: event.id, title: event.title } : null}
        onSuccess={handlePaymentSuccess}
      />
    </div>
  )
}
