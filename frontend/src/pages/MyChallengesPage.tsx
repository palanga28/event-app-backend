import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { 
  Trophy, 
  Zap, 
  Star, 
  Crown, 
  Flame,
  Target,
  Gift,
  Sparkles,
  Shield,
  Swords,
  Medal,
  Gem,
} from 'lucide-react'

type Challenge = {
  id: string
  title: string
  description: string
  reward: { type: string; amount: number; label: string }
  progress: { value: number; max: number }
  status: 'active' | 'completed' | 'claimed'
  canClaim: boolean
  claimedAt: string | null
  badge?: string | null
}

type ChallengesResponse = {
  challenges: Challenge[]
}

const CHALLENGE_ICONS = [Trophy, Zap, Star, Crown, Flame, Target, Shield, Swords, Medal, Gem]

function getChallengeIcon(index: number) {
  return CHALLENGE_ICONS[index % CHALLENGE_ICONS.length]
}

function getChallengeGradient(index: number) {
  const gradients = [
    'from-purple-600 via-violet-600 to-indigo-600',
    'from-pink-600 via-rose-600 to-red-600',
    'from-amber-500 via-orange-500 to-red-500',
    'from-emerald-500 via-teal-500 to-cyan-500',
    'from-blue-600 via-indigo-600 to-purple-600',
    'from-fuchsia-600 via-pink-600 to-rose-600',
  ]
  return gradients[index % gradients.length]
}

function getChallengeGlow(index: number) {
  const glows = [
    'shadow-purple-500/30',
    'shadow-pink-500/30',
    'shadow-amber-500/30',
    'shadow-emerald-500/30',
    'shadow-blue-500/30',
    'shadow-fuchsia-500/30',
  ]
  return glows[index % glows.length]
}

export default function MyChallengesPage() {
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [claimingId, setClaimingId] = useState<string | null>(null)

  const hasClaimable = useMemo(() => challenges.some((c) => c.canClaim), [challenges])
  const completedCount = useMemo(() => challenges.filter((c) => c.status === 'claimed').length, [challenges])
  const activeCount = useMemo(() => challenges.filter((c) => c.status === 'active').length, [challenges])
  const totalXP = useMemo(() => challenges.filter((c) => c.status === 'claimed').reduce((acc, c) => acc + (c.reward?.amount || 0), 0), [challenges])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get<ChallengesResponse>('/api/me/challenges')
      setChallenges(Array.isArray(res.data?.challenges) ? res.data.challenges : [])
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Erreur chargement')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function claimReward(challengeId: string) {
    setClaimingId(challengeId)
    try {
      await api.post(`/api/me/challenges/${encodeURIComponent(challengeId)}/claim`)
      toast.success('Récompense réclamée')
      await load()
    } catch (e: any) {
      toast.error(e?.response?.data?.message || e?.message || 'Erreur claim')
    } finally {
      setClaimingId(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen">
        {/* Hero Skeleton */}
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-purple-900/50 via-violet-900/30 to-indigo-900/50 p-8 mb-8">
          <Skeleton className="h-12 w-64 bg-white/10 mb-4" />
          <Skeleton className="h-6 w-96 bg-white/10" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
              <Skeleton className="h-16 w-16 rounded-2xl bg-white/10 mb-4" />
              <Skeleton className="h-5 w-2/3 bg-white/10" />
              <Skeleton className="mt-2 h-4 w-full bg-white/10" />
              <Skeleton className="mt-4 h-3 w-full bg-white/10" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="ampia-glass p-8 text-center max-w-md">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-white mb-2">Erreur de chargement</h2>
          <p className="text-white/70 mb-4">{error}</p>
          <Button onClick={() => load()} className="btn-primary">
            Réessayer
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-12">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 left-10 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/5 rounded-full blur-3xl" />
      </div>

      {/* Hero Section - Challenge Arena */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-purple-900/50 via-violet-900/30 to-indigo-900/50 p-8 md:p-12 mb-8 backdrop-blur-xl">
        {/* Decorative Elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-amber-500/20 to-orange-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-cyan-500/20 to-blue-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
        
        {/* Floating Icons */}
        <div className="absolute top-8 right-8 opacity-20 animate-float">
          <Trophy className="h-16 w-16 text-amber-400" />
        </div>
        <div className="absolute bottom-8 right-24 opacity-10 animate-float" style={{ animationDelay: '0.5s' }}>
          <Swords className="h-12 w-12 text-purple-400" />
        </div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/30">
              <Trophy className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
                Salle des Défis
              </h1>
              <p className="text-white/60 text-sm md:text-base">
                Bienvenue dans l'arène, champion !
              </p>
            </div>
          </div>
          
          <p className="text-white/80 text-lg max-w-2xl mb-8">
            Relève des défis épiques, accumule des récompenses légendaires et deviens le maître de l'arène.
          </p>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-4 text-center">
              <div className="flex items-center justify-center gap-2 text-amber-400 mb-1">
                <Trophy className="h-5 w-5" />
                <span className="text-2xl font-bold">{completedCount}</span>
              </div>
              <div className="text-xs text-white/60">Défis conquis</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-4 text-center">
              <div className="flex items-center justify-center gap-2 text-cyan-400 mb-1">
                <Target className="h-5 w-5" />
                <span className="text-2xl font-bold">{activeCount}</span>
              </div>
              <div className="text-xs text-white/60">En cours</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-4 text-center">
              <div className="flex items-center justify-center gap-2 text-purple-400 mb-1">
                <Zap className="h-5 w-5" />
                <span className="text-2xl font-bold">{totalXP}</span>
              </div>
              <div className="text-xs text-white/60">XP gagnés</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-4 text-center">
              <div className="flex items-center justify-center gap-2 text-pink-400 mb-1">
                <Gift className="h-5 w-5" />
                <span className="text-2xl font-bold">{challenges.filter(c => c.canClaim).length}</span>
              </div>
              <div className="text-xs text-white/60">À réclamer</div>
            </div>
          </div>
        </div>
      </div>

      {/* Claimable Alert */}
      {hasClaimable && (
        <div className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/20 via-orange-500/10 to-amber-500/20 p-4 mb-8 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20">
              <Sparkles className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <div className="font-semibold text-amber-200">Récompenses disponibles !</div>
              <div className="text-sm text-amber-200/70">Tu as des trésors qui t'attendent, champion.</div>
            </div>
          </div>
        </div>
      )}

      {/* Challenges Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {challenges.map((c, index) => {
          const pct = c.progress.max > 0 ? Math.min(100, Math.round((c.progress.value / c.progress.max) * 100)) : 0
          const isClaimed = c.status === 'claimed'
          const isCompleted = c.status === 'completed'
          const Icon = getChallengeIcon(index)
          const gradient = getChallengeGradient(index)
          const glow = getChallengeGlow(index)

          return (
            <div
              key={c.id}
              className={`group relative overflow-hidden rounded-2xl border transition-all duration-500 hover:-translate-y-1 ${
                isClaimed 
                  ? 'border-violet-500/30 bg-gradient-to-br from-violet-900/30 to-purple-900/20' 
                  : isCompleted
                    ? 'border-emerald-500/30 bg-gradient-to-br from-emerald-900/30 to-teal-900/20'
                    : 'border-white/10 bg-white/5 hover:border-white/20'
              } backdrop-blur-sm`}
            >
              {/* Glow Effect on Hover */}
              <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br ${gradient} blur-xl -z-10`} />
              
              <div className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${gradient} shadow-lg ${glow} transition-transform duration-300 group-hover:scale-110`}>
                    <Icon className="h-7 w-7 text-white" />
                  </div>
                  
                  <div className="text-right">
                    {isClaimed ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/20 border border-violet-500/30 px-3 py-1 text-xs font-semibold text-violet-300">
                        <Medal className="h-3 w-3" />
                        Conquis
                      </span>
                    ) : isCompleted ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 px-3 py-1 text-xs font-semibold text-emerald-300 animate-pulse">
                        <Gift className="h-3 w-3" />
                        Récompense !
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 border border-amber-500/30 px-3 py-1 text-xs font-semibold text-amber-300">
                        <Flame className="h-3 w-3" />
                        En cours
                      </span>
                    )}
                  </div>
                </div>

                {/* Title & Description */}
                <h3 className="text-lg font-bold text-white mb-2 group-hover:text-purple-300 transition-colors">
                  {c.title}
                </h3>
                <p className="text-sm text-white/60 mb-4 line-clamp-2">
                  {c.description}
                </p>

                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="text-white/60">Progression</span>
                    <span className="font-semibold text-white">{c.progress.value}/{c.progress.max}</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-black/30 border border-white/10">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${gradient} transition-all duration-700 ease-out relative overflow-hidden`}
                      style={{ width: `${pct}%` }}
                    >
                      {/* Shimmer Effect */}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full animate-shimmer" />
                    </div>
                  </div>
                  <div className="text-right mt-1">
                    <span className="text-xs font-bold text-white/80">{pct}%</span>
                  </div>
                </div>

                {/* Reward */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-black/20 border border-white/5 mb-4">
                  <div className="flex items-center gap-2">
                    <Gem className="h-4 w-4 text-cyan-400" />
                    <span className="text-xs text-white/60">Récompense</span>
                  </div>
                  <span className="text-sm font-bold text-white">{c.reward?.label || 'Récompense'}</span>
                </div>

                {/* Badge */}
                {c.badge && (
                  <div className="flex items-center gap-2 text-xs text-white/50 mb-4">
                    <Crown className="h-4 w-4 text-amber-400" />
                    <span>Badge: {c.badge}</span>
                  </div>
                )}

                {/* Claim Button */}
                {c.canClaim && (
                  <Button
                    type="button"
                    onClick={() => claimReward(c.id)}
                    disabled={claimingId === c.id}
                    className="w-full btn-primary relative overflow-hidden group/btn"
                  >
                    <span className="relative z-10 flex items-center justify-center gap-2">
                      {claimingId === c.id ? (
                        <>
                          <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Réclamation...
                        </>
                      ) : (
                        <>
                          <Gift className="h-4 w-4" />
                          Réclamer le trésor
                        </>
                      )}
                    </span>
                  </Button>
                )}

                {/* Claimed Date */}
                {c.claimedAt && (
                  <div className="text-center text-[11px] text-white/40 mt-3">
                    Conquis le {new Date(c.claimedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Empty State */}
      {challenges.length === 0 && (
        <div className="text-center py-16">
          <div className="inline-flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 mb-6">
            <Swords className="h-12 w-12 text-purple-400" />
          </div>
          <h3 className="text-2xl font-bold text-white mb-2">L'arène t'attend</h3>
          <p className="text-white/60 max-w-md mx-auto mb-6">
            Aucun défi disponible pour le moment. Reviens bientôt pour de nouvelles quêtes épiques !
          </p>
          <Link to="/" className="btn-primary inline-flex items-center gap-2 px-6 py-3">
            Explorer les événements
          </Link>
        </div>
      )}

      {/* Footer Link */}
      <div className="text-center mt-12">
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors"
        >
          ← Retour aux événements
        </Link>
      </div>
    </div>
  )
}
