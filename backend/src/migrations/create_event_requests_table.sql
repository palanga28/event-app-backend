-- =============================================
-- TABLE: EventRequests
-- Gère les demandes de report et d'annulation d'événements
-- =============================================

CREATE TABLE IF NOT EXISTS "EventRequests" (
    id SERIAL PRIMARY KEY,
    event_id INTEGER NOT NULL REFERENCES "Events"(id) ON DELETE CASCADE,
    organizer_id INTEGER NOT NULL REFERENCES "Users"(id) ON DELETE CASCADE,
    
    -- Type de demande: 'postpone' (report) ou 'cancel' (annulation)
    request_type VARCHAR(20) NOT NULL CHECK (request_type IN ('postpone', 'cancel')),
    
    -- Raison de la demande
    reason TEXT NOT NULL,
    
    -- Pour les reports: nouvelle date proposée
    new_start_date TIMESTAMPTZ,
    new_end_date TIMESTAMPTZ,
    
    -- Statut de la demande
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    
    -- Modérateur qui a traité la demande
    reviewed_by INTEGER REFERENCES "Users"(id),
    reviewed_at TIMESTAMPTZ,
    review_comment TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index pour les recherches fréquentes
CREATE INDEX IF NOT EXISTS idx_event_requests_event_id ON "EventRequests"(event_id);
CREATE INDEX IF NOT EXISTS idx_event_requests_organizer_id ON "EventRequests"(organizer_id);
CREATE INDEX IF NOT EXISTS idx_event_requests_status ON "EventRequests"(status);
CREATE INDEX IF NOT EXISTS idx_event_requests_type ON "EventRequests"(request_type);

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_event_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_event_requests_updated_at ON "EventRequests";
CREATE TRIGGER trigger_event_requests_updated_at
    BEFORE UPDATE ON "EventRequests"
    FOR EACH ROW
    EXECUTE FUNCTION update_event_requests_updated_at();

-- Ajouter colonne status à Events si elle n'existe pas
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Events' AND column_name = 'event_status'
    ) THEN
        ALTER TABLE "Events" ADD COLUMN event_status VARCHAR(20) DEFAULT 'active' 
            CHECK (event_status IN ('active', 'postponed', 'cancelled', 'completed'));
    END IF;
END $$;

-- Ajouter colonne cancelled_at à Events
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Events' AND column_name = 'cancelled_at'
    ) THEN
        ALTER TABLE "Events" ADD COLUMN cancelled_at TIMESTAMPTZ;
    END IF;
END $$;

-- Ajouter colonne postponed_from à Events (ancienne date avant report)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Events' AND column_name = 'postponed_from'
    ) THEN
        ALTER TABLE "Events" ADD COLUMN postponed_from TIMESTAMPTZ;
    END IF;
END $$;

-- RLS Policies
-- Note: Comme l'API backend utilise une service_role key, 
-- les policies RLS ne s'appliquent pas aux requêtes backend.
-- Ces policies sont pour un accès direct à Supabase (si nécessaire).

ALTER TABLE "EventRequests" ENABLE ROW LEVEL SECURITY;

-- Policy permissive pour le service role (backend)
CREATE POLICY "Service role full access" ON "EventRequests"
    FOR ALL USING (true) WITH CHECK (true);

-- Alternative: Désactiver RLS si vous n'utilisez que le backend
-- ALTER TABLE "EventRequests" DISABLE ROW LEVEL SECURITY;
