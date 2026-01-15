-- Table des paiements WonyaSoft
CREATE TABLE IF NOT EXISTS "Payments" (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES "Users"(id) ON DELETE CASCADE,
    event_id INTEGER NOT NULL REFERENCES "Events"(id) ON DELETE CASCADE,
    ticket_type_id INTEGER NOT NULL REFERENCES "TicketTypes"(id) ON DELETE CASCADE,
    ticket_id INTEGER REFERENCES "Tickets"(id) ON DELETE SET NULL,
    
    -- Montant et devise
    quantity INTEGER NOT NULL DEFAULT 1,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'CDF',
    
    -- Infos Mobile Money
    mobile_number VARCHAR(20) NOT NULL,
    
    -- Références transaction
    transaction_ref VARCHAR(50) UNIQUE NOT NULL,
    provider_transaction_id VARCHAR(100),
    provider VARCHAR(20) NOT NULL DEFAULT 'wonyasoft',
    
    -- Statut: pending, processing, completed, failed, refunded
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    webhook_received_at TIMESTAMP WITH TIME ZONE,
    
    -- Index pour recherche rapide
    CONSTRAINT valid_status CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'refunded'))
);

-- Index pour les recherches fréquentes
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON "Payments"(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_transaction_ref ON "Payments"(transaction_ref);
CREATE INDEX IF NOT EXISTS idx_payments_status ON "Payments"(status);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON "Payments"(created_at DESC);

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_payments_updated_at ON "Payments";
CREATE TRIGGER trigger_payments_updated_at
    BEFORE UPDATE ON "Payments"
    FOR EACH ROW
    EXECUTE FUNCTION update_payments_updated_at();

-- Ajouter colonne payment_id à Tickets si elle n'existe pas
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Tickets' AND column_name = 'payment_id'
    ) THEN
        ALTER TABLE "Tickets" ADD COLUMN payment_id INTEGER REFERENCES "Payments"(id) ON DELETE SET NULL;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Tickets' AND column_name = 'quantity'
    ) THEN
        ALTER TABLE "Tickets" ADD COLUMN quantity INTEGER NOT NULL DEFAULT 1;
    END IF;
END $$;
