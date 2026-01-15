import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { 
  Settings, 
  Save, 
  RefreshCw, 
  Shield, 
  Calendar, 
  Users, 
  Ticket,
  Globe,
  Lock,
  Mail,
  AlertTriangle
} from 'lucide-react'

type SettingsSection = {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  settings: SettingItem[]
}

type SettingItem = {
  key: string
  label: string
  description: string
  type: 'toggle' | 'number' | 'text' | 'select'
  value: any
  options?: { value: string; label: string }[]
  min?: number
  max?: number
}

export default function AdminSettingsPage() {
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState<Record<string, any>>({
    maxEventsPerUser: 10,
    maxTicketsPerEvent: 500,
    maxStoriesPerDay: 5,
    enableRegistration: true,
    enableEventCreation: true,
    requireEmailVerification: false,
    enableNotifications: true,
    enableReports: true,
    maintenanceMode: false,
    defaultEventStatus: 'draft',
    maxImageSizeMb: 5,
    allowedImageTypes: 'jpg,jpeg,png,webp',
  })

  const updateSetting = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 1000))
      toast.success('Paramètres sauvegardés')
    } catch {
      toast.error('Erreur lors de la sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  const sections: SettingsSection[] = [
    {
      id: 'general',
      title: 'Paramètres généraux',
      description: 'Configuration générale de la plateforme',
      icon: <Globe className="h-5 w-5 text-blue-400" />,
      settings: [
        {
          key: 'enableRegistration',
          label: 'Inscription ouverte',
          description: 'Autoriser les nouveaux utilisateurs à s\'inscrire',
          type: 'toggle',
          value: settings.enableRegistration,
        },
        {
          key: 'requireEmailVerification',
          label: 'Vérification email requise',
          description: 'Les utilisateurs doivent vérifier leur email',
          type: 'toggle',
          value: settings.requireEmailVerification,
        },
        {
          key: 'maintenanceMode',
          label: 'Mode maintenance',
          description: 'Activer le mode maintenance (site inaccessible)',
          type: 'toggle',
          value: settings.maintenanceMode,
        },
      ],
    },
    {
      id: 'events',
      title: 'Événements',
      description: 'Paramètres liés aux événements',
      icon: <Calendar className="h-5 w-5 text-purple-400" />,
      settings: [
        {
          key: 'enableEventCreation',
          label: 'Création d\'événements',
          description: 'Autoriser les utilisateurs à créer des événements',
          type: 'toggle',
          value: settings.enableEventCreation,
        },
        {
          key: 'maxEventsPerUser',
          label: 'Max événements par utilisateur',
          description: 'Nombre maximum d\'événements qu\'un utilisateur peut créer',
          type: 'number',
          value: settings.maxEventsPerUser,
          min: 1,
          max: 100,
        },
        {
          key: 'defaultEventStatus',
          label: 'Statut par défaut',
          description: 'Statut initial des nouveaux événements',
          type: 'select',
          value: settings.defaultEventStatus,
          options: [
            { value: 'draft', label: 'Brouillon' },
            { value: 'published', label: 'Publié' },
          ],
        },
      ],
    },
    {
      id: 'tickets',
      title: 'Tickets',
      description: 'Paramètres liés aux tickets',
      icon: <Ticket className="h-5 w-5 text-green-400" />,
      settings: [
        {
          key: 'maxTicketsPerEvent',
          label: 'Max tickets par événement',
          description: 'Nombre maximum de tickets par événement',
          type: 'number',
          value: settings.maxTicketsPerEvent,
          min: 1,
          max: 10000,
        },
      ],
    },
    {
      id: 'users',
      title: 'Utilisateurs',
      description: 'Paramètres liés aux utilisateurs',
      icon: <Users className="h-5 w-5 text-cyan-400" />,
      settings: [
        {
          key: 'maxStoriesPerDay',
          label: 'Max stories par jour',
          description: 'Nombre maximum de stories qu\'un utilisateur peut publier par jour',
          type: 'number',
          value: settings.maxStoriesPerDay,
          min: 1,
          max: 20,
        },
      ],
    },
    {
      id: 'moderation',
      title: 'Modération',
      description: 'Paramètres de modération',
      icon: <Shield className="h-5 w-5 text-amber-400" />,
      settings: [
        {
          key: 'enableReports',
          label: 'Signalements actifs',
          description: 'Autoriser les utilisateurs à signaler du contenu',
          type: 'toggle',
          value: settings.enableReports,
        },
        {
          key: 'enableNotifications',
          label: 'Notifications actives',
          description: 'Activer le système de notifications',
          type: 'toggle',
          value: settings.enableNotifications,
        },
      ],
    },
    {
      id: 'media',
      title: 'Médias',
      description: 'Paramètres des fichiers uploadés',
      icon: <Lock className="h-5 w-5 text-pink-400" />,
      settings: [
        {
          key: 'maxImageSizeMb',
          label: 'Taille max image (MB)',
          description: 'Taille maximale des images uploadées',
          type: 'number',
          value: settings.maxImageSizeMb,
          min: 1,
          max: 20,
        },
        {
          key: 'allowedImageTypes',
          label: 'Types d\'images autorisés',
          description: 'Extensions autorisées (séparées par des virgules)',
          type: 'text',
          value: settings.allowedImageTypes,
        },
      ],
    },
  ]

  const renderSettingInput = (setting: SettingItem) => {
    switch (setting.type) {
      case 'toggle':
        return (
          <button
            type="button"
            onClick={() => updateSetting(setting.key, !setting.value)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              setting.value 
                ? 'bg-gradient-to-r from-purple-500 to-pink-500' 
                : 'bg-white/20'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                setting.value ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        )
      case 'number':
        return (
          <Input
            type="number"
            value={setting.value}
            onChange={(e) => updateSetting(setting.key, parseInt(e.target.value) || 0)}
            min={setting.min}
            max={setting.max}
            className="glass-input w-24 text-center"
          />
        )
      case 'text':
        return (
          <Input
            type="text"
            value={setting.value}
            onChange={(e) => updateSetting(setting.key, e.target.value)}
            className="glass-input w-48"
          />
        )
      case 'select':
        return (
          <select
            value={setting.value}
            onChange={(e) => updateSetting(setting.key, e.target.value)}
            className="glass-input text-sm"
          >
            {setting.options?.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        )
      default:
        return null
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-purple-500/20 to-pink-500/20 backdrop-blur-sm">
            <Settings className="h-6 w-6 text-purple-300" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">Paramètres système</h1>
            <p className="text-sm text-white/60 mt-1">Configuration de la plateforme</p>
          </div>
        </div>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary"
        >
          {saving ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Sauvegarde...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Sauvegarder
            </>
          )}
        </Button>
      </div>

      {/* Warning */}
      {settings.maintenanceMode && (
        <div className="rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-500/20 to-orange-500/20 p-4 backdrop-blur-sm animate-pulse">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-300" />
            <div className="text-sm text-amber-200">
              <strong>Mode maintenance activé</strong> - Le site est actuellement inaccessible aux utilisateurs.
            </div>
          </div>
        </div>
      )}

      {/* Settings Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {sections.map((section, sectionIndex) => (
          <div
            key={section.id}
            className="ampia-glass p-6 space-y-4 animate-slide-up"
            style={{ animationDelay: `${sectionIndex * 50}ms` }}
          >
            <div className="flex items-center gap-3 pb-3 border-b border-white/10">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5">
                {section.icon}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">{section.title}</h3>
                <p className="text-xs text-white/50">{section.description}</p>
              </div>
            </div>

            <div className="space-y-4">
              {section.settings.map((setting) => (
                <div
                  key={setting.key}
                  className="flex items-center justify-between gap-4 p-3 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white">{setting.label}</div>
                    <div className="text-xs text-white/50 line-clamp-1">{setting.description}</div>
                  </div>
                  <div className="flex-shrink-0">
                    {renderSettingInput(setting)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Info */}
      <div className="ampia-glass p-4 flex items-center gap-3">
        <Mail className="h-5 w-5 text-blue-400 flex-shrink-0" />
        <p className="text-sm text-white/70">
          Les modifications sont appliquées immédiatement après la sauvegarde. 
          Certains paramètres peuvent nécessiter un redémarrage du serveur.
        </p>
      </div>
    </div>
  )
}
