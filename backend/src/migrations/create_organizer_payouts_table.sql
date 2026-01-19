-- Migration: Créer la table OrganizerPayouts pour gérer les retraits des organisateurs
-- Date: 2026-01-19

-- Table pour stocker les demandes de retrait des organisateurs
CREATE TABLE IF NOT EXISTS "OrganizerPayouts" (
    id SERIAL PRIMARY KEY,
    
    -- Organisateur qui demande le retrait
    organizer_id INTEGER NOT NULL REFERENCES "Users"(id) ON DELETE CASCADE,
    
    -- Montant demandé
    amount DECIMAL(12, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'CDF',
    
    -- Statut de la demande: pending, processing, completed, rejected
    status VARCHAR(20) DEFAULT 'pending',
    
    -- Méthode de paiement choisie par l'organisateur
    payout_method VARCHAR(50), -- 'mobile_money', 'bank_transfer', 'cash'
    
    -- Détails du compte de paiement
    payout_details JSONB, -- { "phone": "0991234567", "network": "vodacom" } ou { "bank": "...", "account": "..." }
    
    -- Référence de la transaction de paiement (une fois effectué)
    transaction_ref VARCHAR(100),
    
    -- Admin qui a traité la demande
    processed_by INTEGER REFERENCES "Users"(id),
    processed_at TIMESTAMP WITH TIME ZONE,
    
    -- Notes (raison de rejet, commentaires admin)
    admin_notes TEXT,
    
    -- Dates
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour les recherches fréquentes
CREATE INDEX IF NOT EXISTS idx_organizer_payouts_organizer ON "OrganizerPayouts"(organizer_id);
CREATE INDEX IF NOT EXISTS idx_organizer_payouts_status ON "OrganizerPayouts"(status);
CREATE INDEX IF NOT EXISTS idx_organizer_payouts_created ON "OrganizerPayouts"(created_at DESC);

-- Table pour stocker les informations de paiement des organisateurs
CREATE TABLE IF NOT EXISTS "OrganizerPaymentInfo" (
    id SERIAL PRIMARY KEY,
    
    user_id INTEGER NOT NULL UNIQUE REFERENCES "Users"(id) ON DELETE CASCADE,
    
    -- Méthode de paiement préférée
    preferred_method VARCHAR(50) DEFAULT 'mobile_money',
    
    -- Mobile Money
    mobile_money_phone VARCHAR(20),
    mobile_money_network VARCHAR(50), -- 'vodacom', 'airtel', 'orange', 'africell'
    mobile_money_name VARCHAR(100), -- Nom du titulaire
    
    -- Virement bancaire
    bank_name VARCHAR(100),
    bank_account_number VARCHAR(50),
    bank_account_name VARCHAR(100),
    
    -- Dates
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_organizer_payment_info_user ON "OrganizerPaymentInfo"(user_id);

-- Commentaires
COMMENT ON TABLE "OrganizerPayouts" IS 'Demandes de retrait des gains par les organisateurs';
COMMENT ON TABLE "OrganizerPaymentInfo" IS 'Informations de paiement des organisateurs (Mobile Money, banque)';
