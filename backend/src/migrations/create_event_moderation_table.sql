-- =============================================
-- Système de modération des événements
-- Workflow: draft → pending_review → published/rejected
-- =============================================

-- 1. Ajouter les nouveaux statuts à la table Events
-- Note: Exécuter cette partie seulement si la contrainte existe
DO $$
BEGIN
    -- Supprimer l'ancienne contrainte si elle existe
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'events_status_check' 
        AND table_name = 'Events'
    ) THEN
        ALTER TABLE "Events" DROP CONSTRAINT events_status_check;
    END IF;
    
    -- Ajouter la nouvelle contrainte avec tous les statuts
    ALTER TABLE "Events" ADD CONSTRAINT events_status_check 
        CHECK (status IN ('draft', 'pending_review', 'published', 'rejected', 'suspended', 'cancelled'));
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'Contrainte status déjà mise à jour ou erreur: %', SQLERRM;
END $$;

-- 2. Ajouter colonne pour le motif de rejet
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Events' AND column_name = 'rejection_reason'
    ) THEN
        ALTER TABLE "Events" ADD COLUMN rejection_reason TEXT;
    END IF;
END $$;

-- 3. Ajouter colonne pour les flags de modération
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Events' AND column_name = 'moderation_flags'
    ) THEN
        ALTER TABLE "Events" ADD COLUMN moderation_flags JSONB DEFAULT '[]'::jsonb;
    END IF;
END $$;

-- 4. Ajouter colonne pour la date de soumission à la modération
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Events' AND column_name = 'submitted_at'
    ) THEN
        ALTER TABLE "Events" ADD COLUMN submitted_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- 5. Ajouter colonne pour l'ID du modérateur qui a traité
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Events' AND column_name = 'reviewed_by'
    ) THEN
        ALTER TABLE "Events" ADD COLUMN reviewed_by INTEGER REFERENCES "Users"(id);
    END IF;
END $$;

-- 6. Ajouter colonne pour la date de review
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Events' AND column_name = 'reviewed_at'
    ) THEN
        ALTER TABLE "Events" ADD COLUMN reviewed_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- 7. Table des reviews d'événements (historique)
CREATE TABLE IF NOT EXISTS "EventReviews" (
    id SERIAL PRIMARY KEY,
    event_id INTEGER NOT NULL REFERENCES "Events"(id) ON DELETE CASCADE,
    reviewer_id INTEGER NOT NULL REFERENCES "Users"(id),
    
    -- Action effectuée
    action VARCHAR(20) NOT NULL, -- approved, rejected, flagged, suspended, restored
    
    -- Détails
    reason TEXT,
    flags JSONB, -- {similar_title: true, same_image: true, suspicious_organizer: true, ...}
    admin_notes TEXT,
    
    -- Ancien et nouveau statut
    previous_status VARCHAR(20),
    new_status VARCHAR(20),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_review_action CHECK (
        action IN ('approved', 'rejected', 'flagged', 'suspended', 'restored', 'request_changes')
    )
);

-- Index pour recherches fréquentes
CREATE INDEX IF NOT EXISTS idx_event_reviews_event_id ON "EventReviews"(event_id);
CREATE INDEX IF NOT EXISTS idx_event_reviews_reviewer_id ON "EventReviews"(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_event_reviews_created ON "EventReviews"(created_at DESC);

-- Index sur le statut des événements pour filtrage rapide
CREATE INDEX IF NOT EXISTS idx_events_status ON "Events"(status);
CREATE INDEX IF NOT EXISTS idx_events_pending ON "Events"(status) WHERE status = 'pending_review';

-- 8. Table pour détecter les événements similaires (optionnel)
CREATE TABLE IF NOT EXISTS "EventSimilarityFlags" (
    id SERIAL PRIMARY KEY,
    event_id INTEGER NOT NULL REFERENCES "Events"(id) ON DELETE CASCADE,
    similar_event_id INTEGER REFERENCES "Events"(id) ON DELETE SET NULL,
    
    -- Type de similarité détectée
    similarity_type VARCHAR(30) NOT NULL, -- title, image, date_location
    similarity_score DECIMAL(5,2), -- 0.00 à 1.00
    
    -- Détails
    details JSONB,
    
    -- Statut du flag
    status VARCHAR(20) DEFAULT 'pending', -- pending, reviewed, dismissed
    reviewed_by INTEGER REFERENCES "Users"(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_similarity_type CHECK (
        similarity_type IN ('title', 'image', 'date_location', 'organizer_pattern')
    )
);

CREATE INDEX IF NOT EXISTS idx_similarity_flags_event ON "EventSimilarityFlags"(event_id);
CREATE INDEX IF NOT EXISTS idx_similarity_flags_status ON "EventSimilarityFlags"(status) WHERE status = 'pending';
