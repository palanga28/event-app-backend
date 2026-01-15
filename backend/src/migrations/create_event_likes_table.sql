-- Table pour les likes d'événements
CREATE TABLE IF NOT EXISTS "EventLikes" (
  id SERIAL PRIMARY KEY,
  event_id INTEGER NOT NULL REFERENCES "Events"(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES "Users"(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_event_likes_event_id ON "EventLikes"(event_id);
CREATE INDEX IF NOT EXISTS idx_event_likes_user_id ON "EventLikes"(user_id);
