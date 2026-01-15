-- Migration pour créer la table PushTokens

-- Créer la table pour stocker les tokens push
CREATE TABLE IF NOT EXISTS "PushTokens" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER NOT NULL REFERENCES "Users"(id) ON DELETE CASCADE,
  "push_token" VARCHAR(255) NOT NULL,
  "device_id" VARCHAR(255) NOT NULL,
  "created_at" TIMESTAMPTZ DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE("user_id", "device_id")
);

-- Index pour recherches rapides
CREATE INDEX IF NOT EXISTS idx_push_tokens_user_id ON "PushTokens"(user_id);
CREATE INDEX IF NOT EXISTS idx_push_tokens_device_id ON "PushTokens"(device_id);

-- Commentaires
COMMENT ON TABLE "PushTokens" IS 'Tokens de notifications push Expo pour chaque appareil utilisateur';
COMMENT ON COLUMN "PushTokens"."user_id" IS 'ID de l''utilisateur propriétaire de l''appareil';
COMMENT ON COLUMN "PushTokens"."push_token" IS 'Token Expo push (ExponentPushToken[...])';
COMMENT ON COLUMN "PushTokens"."device_id" IS 'ID unique de l''appareil (généré par l''app)';
COMMENT ON COLUMN "PushTokens"."created_at" IS 'Date de création du token';
COMMENT ON COLUMN "PushTokens"."updated_at" IS 'Date de dernière mise à jour';
