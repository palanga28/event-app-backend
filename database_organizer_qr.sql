-- Migration pour ajouter les colonnes QR code organisateur à la table Events
-- À exécuter dans Supabase SQL Editor

-- Ajouter les colonnes pour le QR code de l'organisateur
ALTER TABLE "Events" 
ADD COLUMN IF NOT EXISTS "organizer_qr_code" VARCHAR(255),
ADD COLUMN IF NOT EXISTS "organizer_qr_code_image" TEXT;

-- Créer un index sur organizer_qr_code pour les recherches rapides
CREATE INDEX IF NOT EXISTS idx_events_organizer_qr_code ON "Events"(organizer_qr_code);

-- Commentaires
COMMENT ON COLUMN "Events"."organizer_qr_code" IS 'Code QR unique pour l''organisateur de l''événement';
COMMENT ON COLUMN "Events"."organizer_qr_code_image" IS 'Image du QR code en base64 pour l''organisateur';
