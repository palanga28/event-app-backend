import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../../lib/api'

export default function ModeratorWarnUserPage() {
  const { id } = useParams()
  const userId = Number(id)
  const navigate = useNavigate()

  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setOk(null)

    if (!userId || Number.isNaN(userId)) {
      setError('ID utilisateur invalide')
      return
    }

    setLoading(true)
    try {
      await api.put(`/api/moderator/users/${userId}/warn`, {
        message: message || null,
      })
      setOk('Avertissement envoyé')
      setMessage('')
      setTimeout(() => navigate('/moderator/users/reported'), 400)
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Erreur warn')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Warn utilisateur</h1>
        <Link to="/moderator/users/reported" className="text-sm underline">
          Retour
        </Link>
      </div>

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {ok ? (
        <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          {ok}
        </div>
      ) : null}

      <form onSubmit={onSubmit} className="rounded-lg border bg-white p-6 shadow-sm">
        <div className="text-sm text-gray-600">Utilisateur ID: {id}</div>

        <label className="mt-4 block">
          <span className="text-sm text-gray-700">Message (optionnel)</span>
          <textarea
            className="mt-1 w-full rounded-md border px-3 py-2"
            rows={4}
            maxLength={500}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Ex: Merci de respecter les règles de la plateforme..."
          />
        </label>

        <button
          type="submit"
          disabled={loading}
          className="mt-4 w-full rounded-md bg-black px-3 py-2 text-white disabled:opacity-60"
        >
          {loading ? 'Envoi...' : 'Envoyer le warn'}
        </button>
      </form>
    </div>
  )
}
