-- Migration: Créer la table PushTokens pour les notifications push
-- Date: 2026-01-27

CREATE TABLE IF NOT EXISTS "PushTokens" (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES "Users"(id) ON DELETE CASCADE,
    push_token VARCHAR(255) NOT NULL,
    device_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, device_id)
);

CREATE INDEX IF NOT EXISTS idx_push_tokens_user_id ON "PushTokens"(user_id);
CREATE INDEX IF NOT EXISTS idx_push_tokens_device_id ON "PushTokens"(device_id);

COMMENT ON TABLE "PushTokens" IS 'Tokens de notification push Expo pour chaque appareil utilisateur';
