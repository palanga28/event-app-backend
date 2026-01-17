-- =============================================
-- AJOUT DES COLONNES DE COMMISSION À LA TABLE PAYMENTS
-- Exécuter ce script dans Supabase SQL Editor
-- =============================================

-- Ajouter les colonnes pour le système de commission
ALTER TABLE "Payments" 
ADD COLUMN IF NOT EXISTS subtotal DECIMAL(15, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS operator_fee DECIMAL(15, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS ampia_fee DECIMAL(15, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_fees DECIMAL(15, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS organizer_receives DECIMAL(15, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS fee_mode VARCHAR(20) DEFAULT 'buyer';

-- Ajouter des commentaires pour documentation
COMMENT ON COLUMN "Payments".subtotal IS 'Prix des billets sans frais';
COMMENT ON COLUMN "Payments".operator_fee IS 'Frais opérateur Mobile Money (2%)';
COMMENT ON COLUMN "Payments".ampia_fee IS 'Commission AMPIA (4%)';
COMMENT ON COLUMN "Payments".total_fees IS 'Total des frais (6%)';
COMMENT ON COLUMN "Payments".organizer_receives IS 'Montant que l''organisateur reçoit';
COMMENT ON COLUMN "Payments".fee_mode IS 'Mode de facturation: buyer ou organizer';

-- Index pour les statistiques
CREATE INDEX IF NOT EXISTS idx_payments_status ON "Payments" (status);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON "Payments" (created_at);

-- =============================================
-- EXEMPLE DE CALCUL (pour référence)
-- =============================================
-- Billet à 10 000 CDF, mode 'buyer':
--   subtotal = 10 000 CDF (prix du billet)
--   operator_fee = 200 CDF (2%)
--   ampia_fee = 400 CDF (4%)
--   total_fees = 600 CDF (6%)
--   amount = 10 600 CDF (ce que l'acheteur paie)
--   organizer_receives = 10 000 CDF
-- =============================================
