-- Table pour les likes de commentaires
CREATE TABLE IF NOT EXISTS "CommentLikes" (
  id SERIAL PRIMARY KEY,
  comment_id INTEGER NOT NULL REFERENCES "Comments"(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES "Users"(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(comment_id, user_id)
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_comment_likes_comment_id ON "CommentLikes"(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_likes_user_id ON "CommentLikes"(user_id);
