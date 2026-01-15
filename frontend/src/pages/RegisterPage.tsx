import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { GlassCard } from '@/components/GlassCard'
import { UserPlus } from 'lucide-react'

export default function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [bio, setBio] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await register(name, email, password, bio)
      navigate('/')
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Erreur register')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-md animate-fade-in">
      <div className="ampia-glass p-8 md:p-10 space-y-8">
        {/* Header */}
        <div className="space-y-4 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-r from-purple-500/20 to-pink-500/20 backdrop-blur-sm border border-white/10">
            <UserPlus className="h-8 w-8 text-purple-300" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Rejoignez-nous !</h1>
            <p className="text-white/70">
              Créez votre compte et commencez à découvrir des événements extraordinaires
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
                <div className="font-semibold text-red-200">Erreur d'inscription</div>
                <div className="text-sm text-red-300/80">{error}</div>
              </div>
            </div>
          </div>
        )}

        {/* Form */}
        <form className="space-y-5" onSubmit={onSubmit}>
          <label className="block space-y-2">
            <span className="text-sm font-medium text-white/90">Nom complet</span>
            <Input
              className="w-full glass-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jean Dupont"
              required
            />
          </label>

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

          <label className="block space-y-2">
            <span className="text-sm font-medium text-white/90">Mot de passe</span>
            <Input
              className="w-full glass-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              required
              minLength={6}
            />
            <div className="text-xs text-white/50">Minimum 6 caractères</div>
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-white/90">
              Biographie <span className="text-white/50">(optionnelle)</span>
            </span>
            <textarea
              className="glass-input w-full min-h-[100px] resize-none"
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, 500))}
              rows={4}
              placeholder="Parlez-nous de vous en quelques mots..."
              maxLength={500}
            />
            <div className="text-xs text-white/50 text-right">{bio.length} / 500</div>
          </label>

          <Button type="submit" disabled={loading} className="btn-primary w-full py-3 text-base">
            {loading ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Création du compte...
              </>
            ) : (
              <>
                <UserPlus className="h-5 w-5" />
                Créer mon compte
              </>
            )}
          </Button>
        </form>

        {/* Footer */}
        <div className="space-y-4 pt-4 border-t border-white/10">
          <div className="text-center text-sm text-white/60">
            Vous avez déjà un compte ?{' '}
            <Link 
              to="/login" 
              className="font-semibold text-gradient hover:opacity-80 transition-opacity"
            >
              Se connecter
            </Link>
          </div>
          
          <div className="text-center text-xs text-white/50 leading-relaxed">
            En créant un compte, vous acceptez nos conditions d'utilisation et notre politique de confidentialité.
          </div>
        </div>
      </div>
    </div>
  )
}
