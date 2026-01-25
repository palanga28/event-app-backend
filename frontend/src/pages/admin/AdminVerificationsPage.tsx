import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { CheckCircle, XCircle, Eye, Clock, User, Building, Phone, Globe, FileText, BadgeCheck, AlertTriangle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
// import { Badge } from '@/components/ui/badge'

type Verification = {
  id: number
  user_id: number
  full_name: string
  phone_number?: string
  business_name?: string
  business_type?: string
  id_document_url?: string
  id_document_back_url?: string
  business_document_url?: string
  selfie_url?: string
  facebook_url?: string
  instagram_url?: string
  website_url?: string
  status: string
  created_at: string
  user?: {
    id: number
    name: string
    email: string
  }
}

type Stats = {
  pending: number
  approved: number
  rejected: number
}

export default function AdminVerificationsPage() {
  const [verifications, setVerifications] = useState<Verification[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<Stats>({ pending: 0, approved: 0, rejected: 0 })
  const [selectedVerif, setSelectedVerif] = useState<Verification | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  async function loadVerifications() {
    setLoading(true)
    try {
      const res = await api.get<Verification[]>('/api/verification/pending')
      setVerifications(Array.isArray(res.data) ? res.data : [])
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Erreur chargement')
    } finally {
      setLoading(false)
    }
  }

  async function loadStats() {
    try {
      const res = await api.get<Stats>('/api/verification/stats')
      setStats(res.data)
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    loadVerifications()
    loadStats()
  }, [])

  async function approveVerification(id: number) {
    setActionLoading(true)
    try {
      await api.post(`/api/verification/${id}/approve`)
      setVerifications(prev => prev.filter(v => v.id !== id))
      setStats(prev => ({ ...prev, pending: prev.pending - 1, approved: prev.approved + 1 }))
      toast.success('Organisateur vérifié avec succès')
      setDetailOpen(false)
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Erreur approbation')
    } finally {
      setActionLoading(false)
    }
  }

  async function rejectVerification() {
    if (!selectedVerif) return
    setActionLoading(true)
    try {
      await api.post(`/api/verification/${selectedVerif.id}/reject`, { reason: rejectReason })
      setVerifications(prev => prev.filter(v => v.id !== selectedVerif.id))
      setStats(prev => ({ ...prev, pending: prev.pending - 1, rejected: prev.rejected + 1 }))
      toast.success('Demande rejetée')
      setRejectDialogOpen(false)
      setDetailOpen(false)
      setRejectReason('')
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Erreur rejet')
    } finally {
      setActionLoading(false)
    }
  }

  function openDetail(verif: Verification) {
    setSelectedVerif(verif)
    setDetailOpen(true)
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <BadgeCheck className="h-8 w-8 text-blue-500" />
        <div>
          <h1 className="text-2xl font-bold text-white">Vérification des organisateurs</h1>
          <p className="text-gray-400">Valider les demandes de vérification d'identité</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <Clock className="h-6 w-6 text-yellow-500" />
            <div>
              <p className="text-2xl font-bold text-yellow-500">{stats.pending}</p>
              <p className="text-sm text-gray-400">En attente</p>
            </div>
          </div>
        </div>
        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-6 w-6 text-green-500" />
            <div>
              <p className="text-2xl font-bold text-green-500">{stats.approved}</p>
              <p className="text-sm text-gray-400">Approuvés</p>
            </div>
          </div>
        </div>
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <XCircle className="h-6 w-6 text-red-500" />
            <div>
              <p className="text-2xl font-bold text-red-500">{stats.rejected}</p>
              <p className="text-sm text-gray-400">Rejetés</p>
            </div>
          </div>
        </div>
      </div>

      {/* Verifications List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : verifications.length === 0 ? (
        <div className="text-center py-16 bg-gray-800/50 rounded-xl border border-gray-700">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">Aucune demande en attente</h3>
          <p className="text-gray-400">Toutes les demandes ont été traitées</p>
        </div>
      ) : (
        <div className="space-y-4">
          {verifications.map(verif => (
            <div key={verif.id} className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <User className="h-6 w-6 text-blue-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">{verif.full_name}</h3>
                    <div className="flex items-center gap-4 text-sm text-gray-400">
                      {verif.business_name && (
                        <span className="flex items-center gap-1">
                          <Building className="h-4 w-4" />
                          {verif.business_name}
                        </span>
                      )}
                      {verif.phone_number && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-4 w-4" />
                          {verif.phone_number}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {formatDate(verif.created_at)}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openDetail(verif)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Examiner
                  </Button>
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => approveVerification(verif.id)}
                    disabled={actionLoading}
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Approuver
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="bg-gray-900 border-gray-700 max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <User className="h-5 w-5 text-blue-500" />
              Demande de vérification
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              {selectedVerif?.full_name}
            </DialogDescription>
          </DialogHeader>
          
          {selectedVerif && (
            <div className="space-y-4 py-4">
              {/* Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Nom complet</p>
                  <p className="text-white">{selectedVerif.full_name}</p>
                </div>
                {selectedVerif.phone_number && (
                  <div>
                    <p className="text-sm text-gray-500">Téléphone</p>
                    <p className="text-white">{selectedVerif.phone_number}</p>
                  </div>
                )}
                {selectedVerif.business_name && (
                  <div>
                    <p className="text-sm text-gray-500">Entreprise</p>
                    <p className="text-white">{selectedVerif.business_name}</p>
                  </div>
                )}
                {selectedVerif.business_type && (
                  <div>
                    <p className="text-sm text-gray-500">Type</p>
                    <p className="text-white">{selectedVerif.business_type}</p>
                  </div>
                )}
              </div>

              {/* Documents */}
              <div className="border-t border-gray-700 pt-4">
                <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Documents fournis
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  {selectedVerif.id_document_url && (
                    <a href={selectedVerif.id_document_url} target="_blank" rel="noopener noreferrer" className="block">
                      <img src={selectedVerif.id_document_url} alt="ID Recto" className="rounded-lg border border-gray-700 w-full h-32 object-cover" />
                      <p className="text-xs text-gray-400 mt-1">Pièce d'identité (recto)</p>
                    </a>
                  )}
                  {selectedVerif.id_document_back_url && (
                    <a href={selectedVerif.id_document_back_url} target="_blank" rel="noopener noreferrer" className="block">
                      <img src={selectedVerif.id_document_back_url} alt="ID Verso" className="rounded-lg border border-gray-700 w-full h-32 object-cover" />
                      <p className="text-xs text-gray-400 mt-1">Pièce d'identité (verso)</p>
                    </a>
                  )}
                  {selectedVerif.selfie_url && (
                    <a href={selectedVerif.selfie_url} target="_blank" rel="noopener noreferrer" className="block">
                      <img src={selectedVerif.selfie_url} alt="Selfie" className="rounded-lg border border-gray-700 w-full h-32 object-cover" />
                      <p className="text-xs text-gray-400 mt-1">Selfie</p>
                    </a>
                  )}
                  {selectedVerif.business_document_url && (
                    <a href={selectedVerif.business_document_url} target="_blank" rel="noopener noreferrer" className="block">
                      <img src={selectedVerif.business_document_url} alt="Document entreprise" className="rounded-lg border border-gray-700 w-full h-32 object-cover" />
                      <p className="text-xs text-gray-400 mt-1">Document entreprise</p>
                    </a>
                  )}
                </div>
              </div>

              {/* Social Links */}
              {(selectedVerif.facebook_url || selectedVerif.instagram_url || selectedVerif.website_url) && (
                <div className="border-t border-gray-700 pt-4">
                  <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    Liens
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedVerif.facebook_url && (
                      <a href={selectedVerif.facebook_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline text-sm">
                        Facebook
                      </a>
                    )}
                    {selectedVerif.instagram_url && (
                      <a href={selectedVerif.instagram_url} target="_blank" rel="noopener noreferrer" className="text-pink-400 hover:underline text-sm">
                        Instagram
                      </a>
                    )}
                    {selectedVerif.website_url && (
                      <a href={selectedVerif.website_url} target="_blank" rel="noopener noreferrer" className="text-green-400 hover:underline text-sm">
                        Site web
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
          
          <DialogFooter className="flex gap-2">
            <Button
              variant="destructive"
              onClick={() => {
                setRejectDialogOpen(true)
              }}
              disabled={actionLoading}
            >
              <XCircle className="h-4 w-4 mr-1" />
              Rejeter
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={() => selectedVerif && approveVerification(selectedVerif.id)}
              disabled={actionLoading}
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              Approuver
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="bg-gray-900 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Rejeter la demande
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <label className="text-sm text-gray-400 mb-2 block">
              Raison du rejet
            </label>
            <textarea
              value={rejectReason}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setRejectReason(e.target.value)}
              placeholder="Ex: Documents illisibles, informations incohérentes..."
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-md p-3 min-h-[100px]"
            />
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRejectDialogOpen(false)}
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={rejectVerification}
              disabled={actionLoading || !rejectReason.trim()}
            >
              Confirmer le rejet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
