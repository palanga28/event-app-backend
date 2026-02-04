import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { api } from '../lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Lock, CheckCircle, AlertCircle } from 'lucide-react'

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) {
      setError('Token de réinitialisation manquant')
    }
  }, [token])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    // Validation mot de passe renforcée
    if (newPassword.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères')
      return
    }
    if (!/[A-Z]/.test(newPassword)) {
      setError('Le mot de passe doit contenir au moins une majuscule')
      return
    }
    if (!/[a-z]/.test(newPassword)) {
      setError('Le mot de passe doit contenir au moins une minuscule')
      return
    }
    if (!/[0-9]/.test(newPassword)) {
      setError('Le mot de passe doit contenir au moins un chiffre')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas')
      return
    }

    if (!token) {
      setError('Token de réinitialisation manquant')
      return
    }

    setLoading(true)

    try {
      const response = await api.post('/api/auth/reset-password', {
        token,
        newPassword
      })
      
      if (response.data.success) {
        setSuccess(true)
        setTimeout(() => {
          navigate('/login')
        }, 3000)
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Erreur lors de la réinitialisation')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="mx-auto max-w-md animate-fade-in">
        <div className="ampia-glass p-8 md:p-10 space-y-8">
          {/* Success Icon */}
          <div className="text-center space-y-4">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-r from-green-500/20 to-emerald-500/20 backdrop-blur-sm border border-green-500/30">
              <CheckCircle className="h-10 w-10 text-green-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Mot de passe modifié !</h1>
              <p className="text-white/70 leading-relaxed">
                Votre mot de passe a été réinitialisé avec succès.
              </p>
              <p className="text-white/50 text-sm mt-4">
                Redirection vers la page de connexion...
              </p>
            </div>
          </div>

          {/* Manual Redirect */}
          <Link to="/login">
            <Button className="btn-primary w-full py-3 text-base">
              Se connecter maintenant
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-md animate-fade-in">
      <div className="ampia-glass p-8 md:p-10 space-y-8">
        {/* Header */}
        <div className="space-y-4 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-r from-purple-500/20 to-pink-500/20 backdrop-blur-sm border border-white/10">
            <Lock className="h-8 w-8 text-purple-300" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Nouveau mot de passe</h1>
            <p className="text-white/70">
              Choisis un nouveau mot de passe sécurisé pour ton compte
            </p>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="animate-scale-in rounded-xl border border-red-500/30 bg-gradient-to-r from-red-500/20 to-rose-500/20 p-4 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500/20">
                <AlertCircle className="h-5 w-5 text-red-300" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-red-200">Erreur</div>
                <div className="text-sm text-red-300/80">{error}</div>
              </div>
            </div>
          </div>
        )}

        {/* Form */}
        <form className="space-y-5" onSubmit={handleSubmit}>
          <label className="block space-y-2">
            <span className="text-sm font-medium text-white/90">Nouveau mot de passe</span>
            <Input
              className="w-full glass-input"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              required
              minLength={6}
            />
            <p className="text-xs text-white/50">Minimum 6 caractères</p>
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-white/90">Confirmer le mot de passe</span>
            <Input
              className="w-full glass-input"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              required
              minLength={6}
            />
          </label>

          <Button 
            type="submit" 
            disabled={loading || !token} 
            className="btn-primary w-full py-3 text-base"
          >
            {loading ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Réinitialisation...
              </>
            ) : (
              <>
                <Lock className="h-5 w-5" />
                Réinitialiser le mot de passe
              </>
            )}
          </Button>
        </form>

        {/* Footer */}
        <div className="pt-4 border-t border-white/10">
          <div className="text-center text-sm text-white/60">
            <Link 
              to="/login" 
              className="font-semibold text-gradient hover:opacity-80 transition-opacity"
            >
              Retour à la connexion
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
