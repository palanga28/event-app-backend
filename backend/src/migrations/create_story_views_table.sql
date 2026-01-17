-- Table pour suivre les stories vues par chaque utilisateur
CREATE TABLE IF NOT EXISTS "StoryViews" (
    id SERIAL PRIMARY KEY,
    story_id INTEGER NOT NULL REFERENCES "Stories"(id) ON DELETE CASCADE,
    viewer_id INTEGER NOT NULL REFERENCES "Users"(id) ON DELETE CASCADE,
    viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Un utilisateur ne peut voir une story qu'une seule fois
    UNIQUE(story_id, viewer_id)
);

-- Index pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_story_views_viewer_id ON "StoryViews"(viewer_id);
CREATE INDEX IF NOT EXISTS idx_story_views_story_id ON "StoryViews"(story_id);
CREATE INDEX IF NOT EXISTS idx_story_views_composite ON "StoryViews"(viewer_id, story_id);
