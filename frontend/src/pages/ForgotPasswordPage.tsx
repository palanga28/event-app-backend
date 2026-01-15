import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const response = await api.post('/api/auth/request-password-reset', { email })
      
      if (response.data.success) {
        setSuccess(true)
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Erreur lors de la demande')
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
              <h1 className="text-3xl font-bold text-white mb-2">Email envoyé !</h1>
              <p className="text-white/70 leading-relaxed">
                Si un compte existe avec cet email, vous recevrez un lien de réinitialisation.
              </p>
              <p className="text-white/50 text-sm mt-4">
                Vérifiez votre boîte de réception et suivez les instructions.
              </p>
            </div>
          </div>

          {/* Back Button */}
          <Link to="/login">
            <Button className="btn-primary w-full py-3 text-base">
              <ArrowLeft className="h-5 w-5" />
              Retour à la connexion
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
        <div className="space-y-4">
          <Link 
            to="/login" 
            className="inline-flex items-center gap-2 text-white/60 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm">Retour</span>
          </Link>
          
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-r from-purple-500/20 to-pink-500/20 backdrop-blur-sm border border-white/10">
              <Mail className="h-8 w-8 text-purple-300" />
            </div>
            <h1 className="text-3xl font-bold text-white mt-4 mb-2">Mot de passe oublié ?</h1>
            <p className="text-white/70">
              Entre ton email et nous t'enverrons un lien pour réinitialiser ton mot de passe
            </p>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="animate-scale-in rounded-xl border border-red-500/30 bg-gradient-to-r from-red-500/20 to-rose-500/20 p-4 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500/20">
                <span className="text-lg">⚠️</span>
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
            <span className="text-sm font-medium text-white/90">Email</span>
            <Input
              className="w-full glass-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              autoComplete="email"
              placeholder="exemple@email.com"
              required
            />
          </label>

          <Button 
            type="submit" 
            disabled={loading} 
            className="btn-primary w-full py-3 text-base"
          >
            {loading ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Envoi en cours...
              </>
            ) : (
              <>
                <Mail className="h-5 w-5" />
                Envoyer le lien
              </>
            )}
          </Button>
        </form>

        {/* Footer */}
        <div className="pt-4 border-t border-white/10">
          <div className="text-center text-sm text-white/60">
            Tu te souviens de ton mot de passe ?{' '}
            <Link 
              to="/login" 
              className="font-semibold text-gradient hover:opacity-80 transition-opacity"
            >
              Se connecter
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
