-- Migration pour ajouter les colonnes QR code à la table Tickets

-- Ajouter les colonnes pour les QR codes
ALTER TABLE "Tickets" 
ADD COLUMN IF NOT EXISTS "qr_code" VARCHAR(32),
ADD COLUMN IF NOT EXISTS "qr_code_image" TEXT,
ADD COLUMN IF NOT EXISTS "validated_at" TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS "validated_by" INTEGER REFERENCES "Users"(id);

-- Créer un index sur qr_code pour des recherches rapides
CREATE INDEX IF NOT EXISTS idx_tickets_qr_code ON "Tickets"(qr_code);

-- Créer un index sur validated_at pour les statistiques
CREATE INDEX IF NOT EXISTS idx_tickets_validated_at ON "Tickets"(validated_at);

-- Commentaires
COMMENT ON COLUMN "Tickets"."qr_code" IS 'Code unique du QR code (32 caractères hex)';
COMMENT ON COLUMN "Tickets"."qr_code_image" IS 'Image du QR code en base64 (data:image/png;base64,...)';
COMMENT ON COLUMN "Tickets"."validated_at" IS 'Date et heure de validation du ticket';
COMMENT ON COLUMN "Tickets"."validated_by" IS 'ID de l''utilisateur qui a validé le ticket (organisateur)';
