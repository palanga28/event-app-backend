-- =============================================
-- Système de signature cryptographique des tickets
-- Protection contre la falsification et copies
-- =============================================

-- 1. Ajouter colonne signature HMAC aux tickets
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Tickets' AND column_name = 'signature'
    ) THEN
        ALTER TABLE "Tickets" ADD COLUMN signature VARCHAR(128);
    END IF;
END $$;

-- 2. Ajouter colonne pour le hash du contenu (détection modification)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Tickets' AND column_name = 'content_hash'
    ) THEN
        ALTER TABLE "Tickets" ADD COLUMN content_hash VARCHAR(64);
    END IF;
END $$;

-- 3. Ajouter colonne pour la version de signature (permet rotation des clés)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Tickets' AND column_name = 'signature_version'
    ) THEN
        ALTER TABLE "Tickets" ADD COLUMN signature_version INTEGER DEFAULT 1;
    END IF;
END $$;

-- 4. Ajouter colonne pour le nombre de scans (détection copies)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Tickets' AND column_name = 'scan_count'
    ) THEN
        ALTER TABLE "Tickets" ADD COLUMN scan_count INTEGER DEFAULT 0;
    END IF;
END $$;

-- 5. Ajouter colonne pour le dernier scan
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Tickets' AND column_name = 'last_scanned_at'
    ) THEN
        ALTER TABLE "Tickets" ADD COLUMN last_scanned_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- 6. Ajouter colonne pour l'ID du device du dernier scan
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Tickets' AND column_name = 'last_scan_device_id'
    ) THEN
        ALTER TABLE "Tickets" ADD COLUMN last_scan_device_id VARCHAR(255);
    END IF;
END $$;

-- 7. Table des scans de tickets (historique complet)
CREATE TABLE IF NOT EXISTS "TicketScans" (
    id SERIAL PRIMARY KEY,
    ticket_id INTEGER NOT NULL REFERENCES "Tickets"(id) ON DELETE CASCADE,
    event_id INTEGER NOT NULL REFERENCES "Events"(id) ON DELETE CASCADE,
    
    -- Qui a scanné
    scanned_by INTEGER REFERENCES "Users"(id),
    
    -- Résultat du scan
    scan_result VARCHAR(20) NOT NULL, -- valid, invalid_signature, already_used, expired, not_found, suspicious
    
    -- Détails
    device_id VARCHAR(255),
    device_info JSONB, -- {platform, model, os_version, app_version}
    ip_address VARCHAR(45),
    location JSONB, -- {lat, lng, accuracy} si disponible
    
    -- Flags de sécurité
    is_suspicious BOOLEAN DEFAULT FALSE,
    suspicious_reason TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_scan_result CHECK (
        scan_result IN ('valid', 'invalid_signature', 'already_used', 'expired', 'not_found', 'suspicious', 'duplicate_scan')
    )
);

-- Index pour recherches fréquentes
CREATE INDEX IF NOT EXISTS idx_ticket_scans_ticket_id ON "TicketScans"(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_scans_event_id ON "TicketScans"(event_id);
CREATE INDEX IF NOT EXISTS idx_ticket_scans_created ON "TicketScans"(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ticket_scans_suspicious ON "TicketScans"(is_suspicious) WHERE is_suspicious = TRUE;

-- Index sur la signature des tickets
CREATE INDEX IF NOT EXISTS idx_tickets_signature ON "Tickets"(signature);
CREATE INDEX IF NOT EXISTS idx_tickets_qr_code ON "Tickets"(qr_code);

-- 8. Table des alertes de sécurité tickets
CREATE TABLE IF NOT EXISTS "TicketSecurityAlerts" (
    id SERIAL PRIMARY KEY,
    ticket_id INTEGER REFERENCES "Tickets"(id) ON DELETE SET NULL,
    event_id INTEGER REFERENCES "Events"(id) ON DELETE SET NULL,
    
    -- Type d'alerte
    alert_type VARCHAR(30) NOT NULL, -- duplicate_scan, invalid_signature, mass_scan, suspicious_pattern
    severity VARCHAR(10) DEFAULT 'medium', -- low, medium, high, critical
    
    -- Détails
    description TEXT,
    metadata JSONB,
    
    -- Statut
    status VARCHAR(20) DEFAULT 'new', -- new, investigating, resolved, false_positive
    resolved_by INTEGER REFERENCES "Users"(id),
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolution_notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_alert_type CHECK (
        alert_type IN ('duplicate_scan', 'invalid_signature', 'mass_scan', 'suspicious_pattern', 'rapid_scans', 'location_mismatch')
    )
);

CREATE INDEX IF NOT EXISTS idx_security_alerts_status ON "TicketSecurityAlerts"(status) WHERE status = 'new';
CREATE INDEX IF NOT EXISTS idx_security_alerts_event ON "TicketSecurityAlerts"(event_id);
