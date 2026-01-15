import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { 
  CreditCard, 
  Smartphone, 
  Loader2, 
  CheckCircle, 
  XCircle, 
  Clock,
  Ticket,
  RefreshCw,
} from 'lucide-react'
import { toast } from 'sonner'

type TicketType = {
  id: number
  name: string
  description: string | null
  price: number
  available_quantity: number
}

type Event = {
  id: number
  title: string
}

type PaymentModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  ticketType: TicketType | null
  event: Event | null
  onSuccess?: () => void
}

type PaymentStatus = 'idle' | 'initiating' | 'processing' | 'completed' | 'failed'

export function PaymentModal({ open, onOpenChange, ticketType, event, onSuccess }: PaymentModalProps) {
  const [quantity, setQuantity] = useState(1)
  const [mobileNumber, setMobileNumber] = useState('')
  const [currency, setCurrency] = useState<'CDF' | 'USD'>('CDF')
  const [status, setStatus] = useState<PaymentStatus>('idle')
  const [transactionRef, setTransactionRef] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pollingCount, setPollingCount] = useState(0)

  const totalAmount = ticketType ? ticketType.price * quantity : 0

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setQuantity(1)
      setMobileNumber('')
      setCurrency('CDF')
      setStatus('idle')
      setTransactionRef(null)
      setError(null)
      setPollingCount(0)
    }
  }, [open])

  // Polling pour vérifier le statut du paiement
  useEffect(() => {
    if (status !== 'processing' || !transactionRef) return

    const pollInterval = setInterval(async () => {
      try {
        const res = await api.get(`/api/payments/status/${transactionRef}`)
        const paymentStatus = res.data.status

        if (paymentStatus === 'completed') {
          setStatus('completed')
          toast.success('Paiement réussi ! Votre ticket a été créé.')
          clearInterval(pollInterval)
          onSuccess?.()
        } else if (paymentStatus === 'failed') {
          setStatus('failed')
          setError('Le paiement a échoué. Veuillez réessayer.')
          clearInterval(pollInterval)
        }

        setPollingCount(prev => prev + 1)

        // Arrêter après 60 tentatives (5 minutes)
        if (pollingCount >= 60) {
          clearInterval(pollInterval)
          setError('Délai d\'attente dépassé. Vérifiez votre historique de paiements.')
        }
      } catch (err) {
        console.error('Erreur polling:', err)
      }
    }, 5000) // Vérifier toutes les 5 secondes

    return () => clearInterval(pollInterval)
  }, [status, transactionRef, pollingCount, onSuccess])

  async function initiatePayment() {
    if (!ticketType || !event) return

    // Validation
    if (!mobileNumber || !/^0[0-9]{9}$/.test(mobileNumber)) {
      setError('Numéro Mobile Money invalide (format: 0XXXXXXXXX)')
      return
    }

    setError(null)
    setStatus('initiating')

    try {
      const res = await api.post('/api/payments/initiate', {
        ticketTypeId: ticketType.id,
        quantity,
        mobileNumber,
        currency,
      })

      setTransactionRef(res.data.payment.transactionRef)
      setStatus('processing')
      toast.info('Paiement initié ! Confirmez sur votre téléphone.')
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Erreur lors de l\'initiation du paiement')
      setStatus('failed')
    }
  }

  function handleClose() {
    if (status === 'processing') {
      if (!confirm('Un paiement est en cours. Êtes-vous sûr de vouloir fermer ?')) {
        return
      }
    }
    onOpenChange(false)
  }

  if (!ticketType || !event) return null

  return (
    <Dialog open={open} onOpenChange={handleClose} modal={true}>
      <DialogContent 
        className="max-w-md"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-green-400" />
            Paiement Mobile Money
          </DialogTitle>
          <DialogDescription className="text-white/70">
            Achetez vos tickets via Mobile Money (Orange, Airtel, M-Pesa, etc.)
          </DialogDescription>
        </DialogHeader>

        {/* Status: Idle - Formulaire */}
        {status === 'idle' && (
          <div className="space-y-4 py-4">
            {/* Résumé */}
            <div className="ampia-glass p-4 space-y-2 bg-white/5 border border-white/10">
              <div className="flex items-center gap-2 text-white/70 text-xs uppercase tracking-wide">
                <Ticket className="h-4 w-4" />
                Résumé de la commande
              </div>
              <div className="text-lg font-semibold text-white">{ticketType.name}</div>
              <div className="text-sm text-white/60">{event.title}</div>
              <div className="flex items-center justify-between pt-2 border-t border-white/10">
                <span className="text-sm text-white/70">Prix unitaire</span>
                <span className="text-white">{ticketType.price} {currency}</span>
              </div>
            </div>

            {/* Quantité */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-white/90">Quantité</label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                  className="glass-input"
                >
                  -
                </Button>
                <span className="w-12 text-center text-lg font-bold text-white">{quantity}</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setQuantity(Math.min(10, quantity + 1))}
                  disabled={quantity >= 10 || quantity >= ticketType.available_quantity}
                  className="glass-input"
                >
                  +
                </Button>
                <span className="text-xs text-white/50 ml-2">
                  ({ticketType.available_quantity} disponibles)
                </span>
              </div>
            </div>

            {/* Numéro Mobile Money */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-white/90 flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-green-400" />
                Numéro Mobile Money
              </label>
              <Input
                className="glass-input"
                value={mobileNumber}
                onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="0810022154"
                maxLength={10}
              />
              <p className="text-xs text-white/50">Format: 0XXXXXXXXX (10 chiffres)</p>
            </div>

            {/* Devise */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-white/90">Devise</label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrency('CDF')}
                  className={`flex-1 ${currency === 'CDF' ? 'bg-green-500/20 border-green-500/50 text-green-300' : 'glass-input'}`}
                >
                  CDF (Franc Congolais)
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrency('USD')}
                  className={`flex-1 ${currency === 'USD' ? 'bg-green-500/20 border-green-500/50 text-green-300' : 'glass-input'}`}
                >
                  USD (Dollar)
                </Button>
              </div>
            </div>

            {/* Total */}
            <div className="ampia-glass p-4 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20">
              <div className="flex items-center justify-between">
                <span className="text-white/70">Total à payer</span>
                <span className="text-2xl font-bold text-green-300">{totalAmount} {currency}</span>
              </div>
            </div>

            {/* Erreur */}
            {error && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200 flex items-center gap-2">
                <XCircle className="h-4 w-4" />
                {error}
              </div>
            )}
          </div>
        )}

        {/* Status: Initiating */}
        {status === 'initiating' && (
          <div className="py-12 text-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-green-400 mx-auto" />
            <div className="text-lg font-semibold text-white">Initiation du paiement...</div>
            <p className="text-sm text-white/60">Veuillez patienter</p>
          </div>
        )}

        {/* Status: Processing */}
        {status === 'processing' && (
          <div className="py-8 text-center space-y-4">
            <div className="relative mx-auto w-20 h-20">
              <div className="absolute inset-0 rounded-full border-4 border-amber-500/30 animate-ping" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Smartphone className="h-10 w-10 text-amber-400" />
              </div>
            </div>
            <div className="text-lg font-semibold text-white">En attente de confirmation</div>
            <p className="text-sm text-white/60">
              Veuillez confirmer le paiement sur votre téléphone
            </p>
            <div className="flex items-center justify-center gap-2 text-xs text-white/50">
              <Clock className="h-3 w-3" />
              <span>Vérification en cours... ({pollingCount})</span>
            </div>
            <div className="ampia-glass p-3 bg-white/5 border border-white/10 text-xs text-white/70">
              <strong>Référence:</strong> {transactionRef}
            </div>
          </div>
        )}

        {/* Status: Completed */}
        {status === 'completed' && (
          <div className="py-8 text-center space-y-4">
            <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-r from-green-500/20 to-emerald-500/20 flex items-center justify-center">
              <CheckCircle className="h-12 w-12 text-green-400" />
            </div>
            <div className="text-lg font-semibold text-white">Paiement réussi !</div>
            <p className="text-sm text-white/60">
              Votre ticket a été créé avec succès
            </p>
            <div className="ampia-glass p-3 bg-green-500/10 border border-green-500/20 text-sm text-green-200">
              Retrouvez votre ticket dans "Mes Tickets"
            </div>
          </div>
        )}

        {/* Status: Failed */}
        {status === 'failed' && (
          <div className="py-8 text-center space-y-4">
            <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-r from-red-500/20 to-rose-500/20 flex items-center justify-center">
              <XCircle className="h-12 w-12 text-red-400" />
            </div>
            <div className="text-lg font-semibold text-white">Paiement échoué</div>
            <p className="text-sm text-white/60">{error || 'Une erreur est survenue'}</p>
          </div>
        )}

        <DialogFooter>
          {status === 'idle' && (
            <>
              <Button variant="outline" onClick={handleClose} className="glass-input">
                Annuler
              </Button>
              <Button
                onClick={initiatePayment}
                disabled={!mobileNumber || mobileNumber.length !== 10}
                className="btn-primary bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500"
              >
                <CreditCard className="h-4 w-4 mr-2" />
                Payer {totalAmount} {currency}
              </Button>
            </>
          )}

          {status === 'processing' && (
            <Button variant="outline" onClick={handleClose} className="glass-input">
              Fermer (le paiement continue)
            </Button>
          )}

          {status === 'completed' && (
            <Button onClick={handleClose} className="btn-primary w-full">
              <Ticket className="h-4 w-4 mr-2" />
              Voir mes tickets
            </Button>
          )}

          {status === 'failed' && (
            <>
              <Button variant="outline" onClick={handleClose} className="glass-input">
                Fermer
              </Button>
              <Button onClick={() => setStatus('idle')} className="btn-primary">
                <RefreshCw className="h-4 w-4 mr-2" />
                Réessayer
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
