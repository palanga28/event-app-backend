-- =============================================
-- Système d'audit logs et traçabilité légale
-- Conservation des actions pour conformité
-- =============================================

-- 1. Table principale des audit logs (si pas déjà créée)
CREATE TABLE IF NOT EXISTS "AuditLogs" (
    id SERIAL PRIMARY KEY,
    
    -- Qui a effectué l'action
    actor_id INTEGER REFERENCES "Users"(id) ON DELETE SET NULL,
    actor_type VARCHAR(20) DEFAULT 'user', -- user, system, webhook, admin
    
    -- Action effectuée
    action VARCHAR(50) NOT NULL,
    
    -- Entité concernée
    entity_type VARCHAR(30), -- event, ticket, payment, user, verification, etc.
    entity_id INTEGER,
    
    -- Détails de l'action
    metadata JSONB,
    
    -- Contexte de la requête
    ip VARCHAR(45),
    user_agent TEXT,
    request_id VARCHAR(64),
    
    -- Résultat
    status VARCHAR(20) DEFAULT 'success', -- success, failure, pending
    error_message TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Index pour recherches
    CONSTRAINT valid_actor_type CHECK (actor_type IN ('user', 'system', 'webhook', 'admin', 'cron')),
    CONSTRAINT valid_status CHECK (status IN ('success', 'failure', 'pending'))
);

-- Index pour recherches fréquentes
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON "AuditLogs"(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON "AuditLogs"(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON "AuditLogs"(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON "AuditLogs"(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_ip ON "AuditLogs"(ip);

-- 2. Table des sessions utilisateur (pour traçabilité connexions)
CREATE TABLE IF NOT EXISTS "UserSessions" (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES "Users"(id) ON DELETE CASCADE,
    
    -- Token info (hash uniquement, pas le token complet)
    token_hash VARCHAR(64),
    refresh_token_hash VARCHAR(64),
    
    -- Device info
    device_id VARCHAR(255),
    device_type VARCHAR(20), -- mobile, web, tablet
    device_info JSONB,
    
    -- Localisation
    ip_address VARCHAR(45),
    location JSONB, -- {country, city, region}
    
    -- Statut
    is_active BOOLEAN DEFAULT TRUE,
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Révocation
    revoked_at TIMESTAMP WITH TIME ZONE,
    revoked_reason VARCHAR(50),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON "UserSessions"(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON "UserSessions"(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON "UserSessions"(token_hash);

-- 3. Table des actions sensibles (pour conformité légale)
CREATE TABLE IF NOT EXISTS "SensitiveActions" (
    id SERIAL PRIMARY KEY,
    
    -- Référence à l'audit log
    audit_log_id INTEGER REFERENCES "AuditLogs"(id) ON DELETE SET NULL,
    
    -- Type d'action sensible
    action_type VARCHAR(30) NOT NULL, -- payment, refund, payout, ban, delete_account, etc.
    
    -- Montant si applicable
    amount DECIMAL(10,2),
    currency VARCHAR(3) DEFAULT 'XOF',
    
    -- Parties impliquées
    from_user_id INTEGER REFERENCES "Users"(id) ON DELETE SET NULL,
    to_user_id INTEGER REFERENCES "Users"(id) ON DELETE SET NULL,
    
    -- Détails pour conformité
    legal_reference TEXT, -- Référence légale si applicable
    retention_until DATE, -- Date jusqu'à laquelle conserver
    
    -- Métadonnées
    metadata JSONB,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_sensitive_action CHECK (
        action_type IN ('payment', 'refund', 'payout', 'ban', 'unban', 'delete_account', 
                       'verify_organizer', 'suspend_event', 'data_export', 'data_deletion')
    )
);

CREATE INDEX IF NOT EXISTS idx_sensitive_actions_type ON "SensitiveActions"(action_type);
CREATE INDEX IF NOT EXISTS idx_sensitive_actions_user ON "SensitiveActions"(from_user_id);
CREATE INDEX IF NOT EXISTS idx_sensitive_actions_retention ON "SensitiveActions"(retention_until);

-- 4. Table des exports de données (RGPD)
CREATE TABLE IF NOT EXISTS "DataExports" (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES "Users"(id) ON DELETE CASCADE,
    
    -- Type d'export
    export_type VARCHAR(20) NOT NULL, -- full, partial, deletion_request
    
    -- Statut
    status VARCHAR(20) DEFAULT 'pending', -- pending, processing, completed, failed
    
    -- Fichier généré
    file_url TEXT,
    file_expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Métadonnées
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    
    CONSTRAINT valid_export_type CHECK (export_type IN ('full', 'partial', 'deletion_request')),
    CONSTRAINT valid_export_status CHECK (status IN ('pending', 'processing', 'completed', 'failed'))
);

CREATE INDEX IF NOT EXISTS idx_data_exports_user ON "DataExports"(user_id);
CREATE INDEX IF NOT EXISTS idx_data_exports_status ON "DataExports"(status) WHERE status = 'pending';

-- 5. Vue pour les rapports d'activité
CREATE OR REPLACE VIEW "ActivityReport" AS
SELECT 
    DATE(created_at) as date,
    action,
    entity_type,
    COUNT(*) as count,
    COUNT(DISTINCT actor_id) as unique_actors
FROM "AuditLogs"
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at), action, entity_type
ORDER BY date DESC, count DESC;

-- 6. Fonction pour nettoyer les vieux logs (conservation 2 ans)
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM "AuditLogs"
    WHERE created_at < NOW() - INTERVAL '2 years'
    AND id NOT IN (
        SELECT audit_log_id FROM "SensitiveActions" 
        WHERE audit_log_id IS NOT NULL
    );
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;
