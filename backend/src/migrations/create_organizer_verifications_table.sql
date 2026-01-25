-- =============================================
-- Table de vérification des organisateurs
-- =============================================

-- Table principale des demandes de vérification
CREATE TABLE IF NOT EXISTS "OrganizerVerifications" (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE NOT NULL REFERENCES "Users"(id) ON DELETE CASCADE,
    
    -- Informations personnelles/entreprise
    full_name VARCHAR(255),
    phone_number VARCHAR(20),
    business_name VARCHAR(255),
    business_type VARCHAR(50), -- individual, company, association, other
    
    -- Documents de vérification
    id_document_url TEXT,           -- Pièce d'identité (recto)
    id_document_back_url TEXT,      -- Pièce d'identité (verso)
    business_document_url TEXT,     -- Document entreprise (RCCM, etc.)
    selfie_url TEXT,                -- Selfie avec pièce d'identité
    
    -- Réseaux sociaux / présence en ligne
    facebook_url TEXT,
    instagram_url TEXT,
    twitter_url TEXT,
    website_url TEXT,
    
    -- Statut de vérification
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    -- pending: en attente de review
    -- under_review: en cours d'examen
    -- approved: approuvé
    -- rejected: rejeté
    -- suspended: suspendu (après approbation)
    
    -- Informations de traitement
    reviewed_by INTEGER REFERENCES "Users"(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    admin_notes TEXT,
    
    -- Métadonnées
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_verification_status CHECK (
        status IN ('pending', 'under_review', 'approved', 'rejected', 'suspended')
    ),
    CONSTRAINT valid_business_type CHECK (
        business_type IS NULL OR business_type IN ('individual', 'company', 'association', 'other')
    )
);

-- Index pour recherches fréquentes
CREATE INDEX IF NOT EXISTS idx_org_verif_user_id ON "OrganizerVerifications"(user_id);
CREATE INDEX IF NOT EXISTS idx_org_verif_status ON "OrganizerVerifications"(status);
CREATE INDEX IF NOT EXISTS idx_org_verif_created ON "OrganizerVerifications"(created_at DESC);

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_org_verif_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_org_verif_updated_at ON "OrganizerVerifications";
CREATE TRIGGER trigger_org_verif_updated_at
    BEFORE UPDATE ON "OrganizerVerifications"
    FOR EACH ROW
    EXECUTE FUNCTION update_org_verif_updated_at();

-- =============================================
-- Ajouter colonnes à la table Users
-- =============================================

-- Colonne pour indiquer si l'organisateur est vérifié
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Users' AND column_name = 'is_verified_organizer'
    ) THEN
        ALTER TABLE "Users" ADD COLUMN is_verified_organizer BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Colonne pour indiquer si l'utilisateur peut vendre des billets
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Users' AND column_name = 'can_sell_tickets'
    ) THEN
        ALTER TABLE "Users" ADD COLUMN can_sell_tickets BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Colonne pour la date de vérification
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Users' AND column_name = 'verified_at'
    ) THEN
        ALTER TABLE "Users" ADD COLUMN verified_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- Index sur is_verified_organizer pour filtrage rapide
CREATE INDEX IF NOT EXISTS idx_users_verified_organizer ON "Users"(is_verified_organizer) WHERE is_verified_organizer = TRUE;
