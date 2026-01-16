-- Table pour les tokens de réinitialisation de mot de passe
CREATE TABLE IF NOT EXISTS "PasswordResetTokens" (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES "Users"(id) ON DELETE CASCADE,
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Index pour améliorer les performances
    CONSTRAINT password_reset_tokens_token_unique UNIQUE (token)
);

-- Index pour rechercher rapidement les tokens valides
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON "PasswordResetTokens"(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON "PasswordResetTokens"(token) WHERE used = FALSE;
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at ON "PasswordResetTokens"(expires_at);

-- Commentaires
COMMENT ON TABLE "PasswordResetTokens" IS 'Tokens de réinitialisation de mot de passe avec expiration';
COMMENT ON COLUMN "PasswordResetTokens".token IS 'Token unique généré pour la réinitialisation';
COMMENT ON COLUMN "PasswordResetTokens".expires_at IS 'Date d''expiration du token (généralement 1 heure)';
COMMENT ON COLUMN "PasswordResetTokens".used IS 'Indique si le token a déjà été utilisé';
