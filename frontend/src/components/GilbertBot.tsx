import { useState, useEffect } from 'react'
import { X, ChevronRight, Sparkles, Bot } from 'lucide-react'
import { Button } from '@/components/ui/button'

const ONBOARDING_STEPS = [
  {
    title: "Bienvenue sur AMPIA ! 🎉",
    message: "Salut ! Je suis Gilbert, ton guide personnel. Je vais te faire découvrir la plateforme en quelques étapes simples.",
    emoji: "👋",
  },
  {
    title: "Découvre des événements 🎭",
    message: "Explore des concerts, festivals, conférences et bien plus encore. Utilise la recherche pour trouver ce qui te passionne !",
    emoji: "🔍",
  },
  {
    title: "Achète tes billets 🎫",
    message: "Réserve tes places en quelques clics. Paiement sécurisé par Mobile Money (Airtel, Orange, M-Pesa, Afrimoney).",
    emoji: "💳",
  },
  {
    title: "Tes billets toujours accessibles 📱",
    message: "Retrouve tous tes billets dans ton profil. Présente le QR code à l'entrée, c'est tout !",
    emoji: "✨",
  },
  {
    title: "Crée tes propres événements 🚀",
    message: "Tu es organisateur ? Crée et publie tes événements, vends des billets et suis tes ventes en temps réel.",
    emoji: "📊",
  },
  {
    title: "C'est parti ! 🎊",
    message: "Tu es prêt à vivre des expériences inoubliables. Si tu as besoin d'aide, je suis toujours là. Amuse-toi bien !",
    emoji: "🎉",
  },
]

export default function GilbertBot() {
  const [visible, setVisible] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [minimized, setMinimized] = useState(false)

  useEffect(() => {
    const completed = localStorage.getItem('gilbert_onboarding_completed')
    if (!completed) {
      setTimeout(() => setVisible(true), 1500)
    }
  }, [])

  const handleNext = () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      handleComplete()
    }
  }

  const handleSkip = () => {
    handleComplete()
  }

  const handleComplete = () => {
    localStorage.setItem('gilbert_onboarding_completed', 'true')
    setVisible(false)
  }

  const handleMinimize = () => {
    setMinimized(true)
  }

  const handleReopen = () => {
    setMinimized(false)
  }

  const step = ONBOARDING_STEPS[currentStep]
  const isLastStep = currentStep === ONBOARDING_STEPS.length - 1

  if (!visible) return null

  if (minimized) {
    return (
      <button
        onClick={handleReopen}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-purple-500 to-pink-500 shadow-lg hover:scale-110 transition-transform animate-bounce"
      >
        <Bot className="h-7 w-7 text-white" />
        <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-xs font-bold text-black">
          ?
        </span>
      </button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="w-full max-w-md ampia-glass overflow-hidden animate-scale-in">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-pink-500/10 pointer-events-none" />
        
        {/* Header */}
        <div className="relative flex items-center gap-3 p-5 border-b border-white/10">
          <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-r from-purple-500/30 to-pink-500/30">
            <span className="text-2xl">🤖</span>
            <div className="absolute -top-1 -right-1 rounded-full bg-amber-400 p-1">
              <Sparkles className="h-3 w-3 text-black" />
            </div>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-white">Gilbert</h3>
            <p className="text-xs text-white/60">Ton guide AMPIA</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleMinimize}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              title="Minimiser"
            >
              <span className="text-white/60">−</span>
            </button>
            <button
              onClick={handleSkip}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            >
              <X className="h-4 w-4 text-white/60" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="relative p-6 text-center">
          <div className="text-5xl mb-4">{step.emoji}</div>
          <h4 className="text-xl font-bold text-white mb-3">{step.title}</h4>
          <p className="text-white/70 leading-relaxed">{step.message}</p>
        </div>

        {/* Progress */}
        <div className="flex justify-center gap-2 pb-4">
          {ONBOARDING_STEPS.map((_, index) => (
            <div
              key={index}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === currentStep
                  ? 'w-6 bg-purple-500'
                  : index < currentStep
                  ? 'w-2 bg-pink-500'
                  : 'w-2 bg-white/20'
              }`}
            />
          ))}
        </div>

        {/* Actions */}
        <div className="relative flex gap-3 p-5 pt-0">
          {!isLastStep && (
            <Button
              onClick={handleSkip}
              variant="outline"
              className="flex-1 glass-input"
            >
              Passer
            </Button>
          )}
          <Button
            onClick={handleNext}
            className={`bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 ${
              isLastStep ? 'flex-1' : 'flex-[2]'
            }`}
          >
            {isLastStep ? "C'est parti !" : 'Suivant'}
            {!isLastStep && <ChevronRight className="h-4 w-4 ml-1" />}
          </Button>
        </div>
      </div>
    </div>
  )
}
