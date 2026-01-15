import { useEffect, useMemo, useState } from 'react'
import { api } from '../../lib/api'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

type Target = {
  id?: number
  min_level: number | null
  required_badge: string | null
}

type Challenge = {
  id: string
  title: string
  description: string | null
  type: 'manual' | 'automatic' | string
  status: 'draft' | 'published' | 'archived' | string
  reward_type: 'points' | 'badge' | 'boost_score' | string
  reward_payload: any
  rule_type: string | null
  rule_payload: any
  created_at: string
  targets?: Target[]
}

function normalizeTargets(raw: any): Target[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((t) => ({
      id: typeof t?.id === 'number' ? t.id : undefined,
      min_level: t?.min_level === null || t?.min_level === undefined ? null : Number(t.min_level),
      required_badge: typeof t?.required_badge === 'string' && t.required_badge ? t.required_badge : null,
    }))
    .slice(0, 10)
}

export default function ModeratorChallengesPage() {
  const [items, setItems] = useState<Challenge[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [selectedId, setSelectedId] = useState<string>('')
  const selected = useMemo(() => items.find((c) => c.id === selectedId) || null, [items, selectedId])

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState<'manual' | 'automatic'>('manual')
  const [rewardType, setRewardType] = useState<'points' | 'badge' | 'boost_score'>('points')
  const [rewardLabel, setRewardLabel] = useState('')
  const [rewardAmount, setRewardAmount] = useState<number>(0)
  const [rewardBadge, setRewardBadge] = useState('')
  const [rewardEventId, setRewardEventId] = useState('')

  const [ruleType, setRuleType] = useState('')
  const [ruleTarget, setRuleTarget] = useState('')

  const [targetMinLevel, setTargetMinLevel] = useState('')
  const [targetBadge, setTargetBadge] = useState('')

  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get<Challenge[]>('/api/moderator/challenges')
      setItems(Array.isArray(res.data) ? res.data : [])
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Erreur chargement')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  useEffect(() => {
    if (!selected) return

    setTitle(selected.title || '')
    setDescription(selected.description || '')
    setType((selected.type as any) === 'automatic' ? 'automatic' : 'manual')
    setRewardType((selected.reward_type as any) === 'badge' ? 'badge' : (selected.reward_type as any) === 'boost_score' ? 'boost_score' : 'points')

    const rp = selected.reward_payload && typeof selected.reward_payload === 'object' ? selected.reward_payload : {}
    setRewardLabel(typeof rp.label === 'string' ? rp.label : '')
    setRewardAmount(Number(rp.points || rp.amount || rp.boost_score || 0) || 0)
    setRewardBadge(typeof rp.badge === 'string' ? rp.badge : '')
    setRewardEventId(rp.event_id ? String(rp.event_id) : '')

    setRuleType(typeof selected.rule_type === 'string' ? selected.rule_type : '')
    const ruleP = selected.rule_payload && typeof selected.rule_payload === 'object' ? selected.rule_payload : {}
    setRuleTarget(ruleP.target !== undefined && ruleP.target !== null ? String(ruleP.target) : '')

    const targets = normalizeTargets(selected.targets)
    const t0 = targets[0]
    setTargetMinLevel(t0?.min_level !== null && t0?.min_level !== undefined ? String(t0.min_level) : '')
    setTargetBadge(t0?.required_badge || '')
  }, [selected?.id])

  function resetForm() {
    setSelectedId('')
    setTitle('')
    setDescription('')
    setType('manual')
    setRewardType('points')
    setRewardLabel('')
    setRewardAmount(0)
    setRewardBadge('')
    setRewardEventId('')
    setRuleType('')
    setRuleTarget('')
    setTargetMinLevel('')
    setTargetBadge('')
  }

  function buildTargets(): Target[] {
    const minLevel = targetMinLevel.trim() ? parseInt(targetMinLevel.trim()) : null
    const badge = targetBadge.trim() ? targetBadge.trim() : null
    if (minLevel === null && badge === null) return []
    return [{ min_level: Number.isFinite(minLevel as any) ? minLevel : null, required_badge: badge }]
  }

  function buildRewardPayload() {
    const payload: any = {}
    if (rewardLabel.trim()) payload.label = rewardLabel.trim()

    if (rewardType === 'points') {
      payload.points = Number(rewardAmount || 0)
    }

    if (rewardType === 'badge') {
      payload.badge = rewardBadge.trim()
      payload.amount = 0
    }

    if (rewardType === 'boost_score') {
      payload.boost_score = Number(rewardAmount || 0)
      if (rewardEventId.trim()) payload.event_id = parseInt(rewardEventId.trim())
    }

    return payload
  }

  function buildRule() {
    if (type !== 'automatic') return { rule_type: null, rule_payload: {} }
    const rt = ruleType.trim()
    const target = ruleTarget.trim() ? parseInt(ruleTarget.trim()) : 0
    return { rule_type: rt || null, rule_payload: rt ? { target: Number.isFinite(target) ? target : 0 } : {} }
  }

  async function save() {
    if (title.trim().length < 3) {
      toast.error('Titre invalide (min 3 caractères)')
      return
    }

    setSaving(true)
    try {
      const body: any = {
        title: title.trim(),
        description: description.trim() ? description.trim() : null,
        type,
        reward_type: rewardType,
        reward_payload: buildRewardPayload(),
        targets: buildTargets(),
      }

      const rule = buildRule()
      body.rule_type = rule.rule_type
      body.rule_payload = rule.rule_payload

      if (selectedId) {
        await api.put(`/api/moderator/challenges/${encodeURIComponent(selectedId)}`, body)
        toast.success('Défi mis à jour')
      } else {
        await api.post('/api/moderator/challenges', body)
        toast.success('Défi créé')
      }

      await load()
      resetForm()
    } catch (e: any) {
      toast.error(e?.response?.data?.message || e?.message || 'Erreur sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  async function publishSelected() {
    if (!selectedId) return
    setPublishing(true)
    try {
      await api.post(`/api/moderator/challenges/${encodeURIComponent(selectedId)}/publish`)
      toast.success('Défi publié')
      await load()
    } catch (e: any) {
      toast.error(e?.response?.data?.message || e?.message || 'Erreur publish')
    } finally {
      setPublishing(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64 bg-white/10" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
            <Skeleton className="h-4 w-1/3 bg-white/10" />
            <Skeleton className="mt-3 h-4 w-2/3 bg-white/10" />
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
            <Skeleton className="h-4 w-1/3 bg-white/10" />
            <Skeleton className="mt-3 h-4 w-2/3 bg-white/10" />
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return <div className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Modération - Défis</h1>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={resetForm}>
            Nouveau
          </Button>
          <Button type="button" variant="outline" onClick={load}>
            Rafraîchir
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-white backdrop-blur">
          <div className="text-sm font-medium">Liste</div>
          <div className="mt-3 space-y-2">
            {items.length === 0 ? <div className="text-sm text-white/70">Aucun défi.</div> : null}
            {items.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedId(c.id)}
                className={
                  'w-full rounded-xl border border-white/10 bg-white/5 p-3 text-left hover:bg-white/10 ' +
                  (selectedId === c.id ? 'ring-2 ring-white/20' : '')
                }
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="font-medium">{c.title}</div>
                  <div className="text-xs text-white/60">{c.status}</div>
                </div>
                <div className="mt-1 text-xs text-white/60">type: {c.type} | reward: {c.reward_type}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-white backdrop-blur">
          <div className="text-sm font-medium">{selected ? 'Éditer' : 'Créer'} un défi</div>

          <div className="mt-3 space-y-3">
            <div>
              <div className="mb-1 text-xs text-white/60">Titre</div>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titre du défi" />
            </div>

            <div>
              <div className="mb-1 text-xs text-white/60">Description</div>
              <textarea
                className="min-h-24 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description (optionnel)"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="text-sm">
                <div className="mb-1 text-xs text-white/60">Type</div>
                <select
                  className="w-full rounded-md border border-white/10 bg-white/5 px-2 py-2 text-sm text-white"
                  value={type}
                  onChange={(e) => setType(e.target.value as any)}
                >
                  <option value="manual">manual</option>
                  <option value="automatic">automatic</option>
                </select>
              </label>

              <label className="text-sm">
                <div className="mb-1 text-xs text-white/60">Reward type</div>
                <select
                  className="w-full rounded-md border border-white/10 bg-white/5 px-2 py-2 text-sm text-white"
                  value={rewardType}
                  onChange={(e) => setRewardType(e.target.value as any)}
                >
                  <option value="points">points</option>
                  <option value="badge">badge</option>
                  <option value="boost_score">boost_score</option>
                </select>
              </label>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <div className="mb-1 text-xs text-white/60">Reward label</div>
                <Input value={rewardLabel} onChange={(e) => setRewardLabel(e.target.value)} placeholder="ex: +50 points" />
              </div>
              <div>
                <div className="mb-1 text-xs text-white/60">Reward amount</div>
                <Input
                  value={String(rewardAmount)}
                  onChange={(e) => setRewardAmount(parseInt(e.target.value || '0'))}
                  placeholder="0"
                />
              </div>
            </div>

            {rewardType === 'badge' ? (
              <div>
                <div className="mb-1 text-xs text-white/60">Badge</div>
                <Input value={rewardBadge} onChange={(e) => setRewardBadge(e.target.value)} placeholder="ex: Gold" />
              </div>
            ) : null}

            {rewardType === 'boost_score' ? (
              <div>
                <div className="mb-1 text-xs text-white/60">Event ID (optionnel, sinon boost dernier event)</div>
                <Input value={rewardEventId} onChange={(e) => setRewardEventId(e.target.value)} placeholder="ex: 12" />
              </div>
            ) : null}

            {type === 'automatic' ? (
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="text-sm font-medium">Règle automatique</div>
                <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="text-sm">
                    <div className="mb-1 text-xs text-white/60">rule_type</div>
                    <select
                      className="w-full rounded-md border border-white/10 bg-white/5 px-2 py-2 text-sm text-white"
                      value={ruleType}
                      onChange={(e) => setRuleType(e.target.value)}
                    >
                      <option value="">(choisir)</option>
                      <option value="count_favorites">count_favorites</option>
                      <option value="count_tickets">count_tickets</option>
                      <option value="count_events_created">count_events_created</option>
                      <option value="count_followers">count_followers</option>
                    </select>
                  </label>
                  <div>
                    <div className="mb-1 text-xs text-white/60">target</div>
                    <Input value={ruleTarget} onChange={(e) => setRuleTarget(e.target.value)} placeholder="ex: 3" />
                  </div>
                </div>
              </div>
            ) : null}

            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="text-sm font-medium">Ciblage (1 règle)</div>
              <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <div className="mb-1 text-xs text-white/60">Niveau minimum (optionnel)</div>
                  <Input value={targetMinLevel} onChange={(e) => setTargetMinLevel(e.target.value)} placeholder="ex: 3" />
                </div>
                <div>
                  <div className="mb-1 text-xs text-white/60">Badge requis (optionnel)</div>
                  <Input value={targetBadge} onChange={(e) => setTargetBadge(e.target.value)} placeholder="ex: Createur" />
                </div>
              </div>
              <div className="mt-2 text-xs text-white/60">Si aucun champ n'est rempli, le défi est visible pour tous.</div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={save} disabled={saving}>
                {saving ? 'Sauvegarde...' : selected ? 'Mettre à jour' : 'Créer'}
              </Button>
              <Button type="button" variant="outline" onClick={resetForm}>
                Annuler
              </Button>
              {selected && selected.status !== 'published' ? (
                <Button type="button" variant="outline" onClick={publishSelected} disabled={publishing}>
                  {publishing ? 'Publication...' : 'Publier'}
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
