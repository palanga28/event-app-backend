-- ========================================
-- CRÉATION DES TABLES POUR L'APPLICATION EVENT
-- ========================================

-- Table Users
CREATE TABLE IF NOT EXISTS public."Users" (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    bio TEXT,
    points INTEGER DEFAULT 0,
    badges JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public."Users"
  ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 0;

ALTER TABLE public."Users"
  ADD COLUMN IF NOT EXISTS badges JSONB DEFAULT '[]'::jsonb;

ALTER TABLE public."Users"
  ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'user';

ALTER TABLE public."Users"
  ADD COLUMN IF NOT EXISTS banned BOOLEAN DEFAULT FALSE;

ALTER TABLE public."Users"
  ADD COLUMN IF NOT EXISTS banned_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE public."Users"
  ADD COLUMN IF NOT EXISTS banned_reason TEXT;

-- Table Events
CREATE TABLE IF NOT EXISTS public."Events" (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    location VARCHAR(255),
    cover_image VARCHAR(255),
    images JSONB,
    featured BOOLEAN DEFAULT FALSE,
    carousel_requested BOOLEAN DEFAULT FALSE,
    boost_score INTEGER DEFAULT 0,
    capacity INTEGER,
    status VARCHAR(50) DEFAULT 'draft',
    organizer_id INTEGER NOT NULL REFERENCES public."Users"(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public."Events"
  ADD COLUMN IF NOT EXISTS carousel_requested BOOLEAN DEFAULT FALSE;

ALTER TABLE public."Events"
  ADD COLUMN IF NOT EXISTS boost_score INTEGER DEFAULT 0;

ALTER TABLE public."Events"
  ADD COLUMN IF NOT EXISTS capacity INTEGER;

-- Table TicketTypes
CREATE TABLE IF NOT EXISTS public."TicketTypes" (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) DEFAULT 0.00,
    currency VARCHAR(3) DEFAULT 'CDF',
    quantity INTEGER DEFAULT 0,
    available_quantity INTEGER DEFAULT 0,
    event_id INTEGER NOT NULL REFERENCES public."Events"(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ajouter la colonne currency si elle n'existe pas déjà
ALTER TABLE public."TicketTypes"
  ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'CDF';

-- Table Tickets
CREATE TABLE IF NOT EXISTS public."Tickets" (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES public."Users"(id) ON DELETE CASCADE,
    event_id INTEGER NOT NULL REFERENCES public."Events"(id) ON DELETE CASCADE,
    ticket_type_id INTEGER NOT NULL REFERENCES public."TicketTypes"(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'active',
    purchase_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    price_paid DECIMAL(10, 2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table RefreshTokens
CREATE TABLE IF NOT EXISTS public."RefreshTokens" (
    id SERIAL PRIMARY KEY,
    token VARCHAR(500) UNIQUE NOT NULL,
    user_id INTEGER NOT NULL REFERENCES public."Users"(id) ON DELETE CASCADE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    revoked BOOLEAN DEFAULT FALSE,
    revoked_at TIMESTAMP WITH TIME ZONE,
    created_by_ip VARCHAR(255),
    replaced_by_token VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS public."Reports" (
    id SERIAL PRIMARY KEY,
    type VARCHAR(50) NOT NULL,
    target_id INTEGER NOT NULL,
    reason TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    reported_by INTEGER REFERENCES public."Users"(id) ON DELETE SET NULL,
    resolved_by INTEGER REFERENCES public."Users"(id) ON DELETE SET NULL,
    resolved_action VARCHAR(50),
    resolved_reason TEXT,
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public."AuditLogs" (
    id SERIAL PRIMARY KEY,
    actor_id INTEGER REFERENCES public."Users"(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id INTEGER,
    metadata JSONB,
    ip VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public."Stories" (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES public."Users"(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    caption TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE TABLE IF NOT EXISTS public."Follows" (
    id SERIAL PRIMARY KEY,
    follower_id INTEGER NOT NULL REFERENCES public."Users"(id) ON DELETE CASCADE,
    following_id INTEGER NOT NULL REFERENCES public."Users"(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT follows_unique_pair UNIQUE (follower_id, following_id)
);

CREATE TABLE IF NOT EXISTS public."Tags" (
    id SERIAL PRIMARY KEY,
    name VARCHAR(80) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public."EventTags" (
    id SERIAL PRIMARY KEY,
    event_id INTEGER NOT NULL REFERENCES public."Events"(id) ON DELETE CASCADE,
    tag_id INTEGER NOT NULL REFERENCES public."Tags"(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT eventtags_unique_pair UNIQUE (event_id, tag_id)
);

CREATE TABLE IF NOT EXISTS public."Favorites" (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES public."Users"(id) ON DELETE CASCADE,
    event_id INTEGER NOT NULL REFERENCES public."Events"(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT favorites_unique_pair UNIQUE (user_id, event_id)
);

CREATE TABLE IF NOT EXISTS public."Challenges" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(20) NOT NULL DEFAULT 'manual',
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    reward_type VARCHAR(30) NOT NULL DEFAULT 'points',
    reward_payload JSONB DEFAULT '{}'::jsonb,
    rule_type VARCHAR(50),
    rule_payload JSONB DEFAULT '{}'::jsonb,
    created_by INTEGER REFERENCES public."Users"(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public."ChallengeTargets" (
    id SERIAL PRIMARY KEY,
    challenge_id UUID NOT NULL REFERENCES public."Challenges"(id) ON DELETE CASCADE,
    min_level INTEGER,
    required_badge VARCHAR(80),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public."UserChallenges" (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES public."Users"(id) ON DELETE CASCADE,
    challenge_id VARCHAR(80) NOT NULL,
    claimed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reward JSONB,
    CONSTRAINT userchallenges_unique_pair UNIQUE (user_id, challenge_id)
);

CREATE TABLE IF NOT EXISTS public."Comments" (
    id SERIAL PRIMARY KEY,
    event_id INTEGER NOT NULL REFERENCES public."Events"(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES public."Users"(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS public."Mentions" (
    id SERIAL PRIMARY KEY,
    source_type VARCHAR(20) NOT NULL,
    source_id INTEGER NOT NULL,
    mentioned_user_id INTEGER NOT NULL REFERENCES public."Users"(id) ON DELETE CASCADE,
    created_by INTEGER REFERENCES public."Users"(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT mentions_unique_triple UNIQUE (source_type, source_id, mentioned_user_id)
);

CREATE TABLE IF NOT EXISTS public."Notifications" (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES public."Users"(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255),
    message TEXT,
    data JSONB,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour optimiser les performances
CREATE INDEX IF NOT EXISTS "idx_events_organizer_id" ON public."Events"(organizer_id);
CREATE INDEX IF NOT EXISTS "idx_events_boost_score" ON public."Events"(boost_score);
CREATE INDEX IF NOT EXISTS "idx_tickettypes_event_id" ON public."TicketTypes"(event_id);
CREATE INDEX IF NOT EXISTS "idx_tickets_user_id" ON public."Tickets"(user_id);
CREATE INDEX IF NOT EXISTS "idx_tickets_event_id" ON public."Tickets"(event_id);
CREATE INDEX IF NOT EXISTS "idx_tickets_ticket_type_id" ON public."Tickets"(ticket_type_id);
CREATE INDEX IF NOT EXISTS "idx_refreshtokens_token" ON public."RefreshTokens"(token);
CREATE INDEX IF NOT EXISTS "idx_refreshtokens_user_id" ON public."RefreshTokens"(user_id);
CREATE INDEX IF NOT EXISTS "idx_refreshtokens_expires_at" ON public."RefreshTokens"(expires_at);
CREATE INDEX IF NOT EXISTS "idx_reports_status" ON public."Reports"(status);
CREATE INDEX IF NOT EXISTS "idx_reports_type" ON public."Reports"(type);
CREATE INDEX IF NOT EXISTS "idx_reports_target_id" ON public."Reports"(target_id);
CREATE INDEX IF NOT EXISTS "idx_reports_reported_by" ON public."Reports"(reported_by);
CREATE INDEX IF NOT EXISTS "idx_auditlogs_actor_id" ON public."AuditLogs"(actor_id);
CREATE INDEX IF NOT EXISTS "idx_auditlogs_action" ON public."AuditLogs"(action);
CREATE INDEX IF NOT EXISTS "idx_auditlogs_entity" ON public."AuditLogs"(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS "idx_auditlogs_created_at" ON public."AuditLogs"(created_at);

CREATE INDEX IF NOT EXISTS "idx_stories_user_id" ON public."Stories"(user_id);
CREATE INDEX IF NOT EXISTS "idx_stories_expires_at" ON public."Stories"(expires_at);
CREATE INDEX IF NOT EXISTS "idx_stories_created_at" ON public."Stories"(created_at);

CREATE INDEX IF NOT EXISTS "idx_follows_follower_id" ON public."Follows"(follower_id);
CREATE INDEX IF NOT EXISTS "idx_follows_following_id" ON public."Follows"(following_id);

CREATE INDEX IF NOT EXISTS "idx_tags_slug" ON public."Tags"(slug);
CREATE INDEX IF NOT EXISTS "idx_tags_name" ON public."Tags"(name);

CREATE INDEX IF NOT EXISTS "idx_eventtags_event_id" ON public."EventTags"(event_id);
CREATE INDEX IF NOT EXISTS "idx_eventtags_tag_id" ON public."EventTags"(tag_id);

CREATE INDEX IF NOT EXISTS "idx_favorites_user_id" ON public."Favorites"(user_id);
CREATE INDEX IF NOT EXISTS "idx_favorites_event_id" ON public."Favorites"(event_id);

CREATE INDEX IF NOT EXISTS "idx_challenges_status" ON public."Challenges"(status);
CREATE INDEX IF NOT EXISTS "idx_challenges_type" ON public."Challenges"(type);
CREATE INDEX IF NOT EXISTS "idx_challengetargets_challenge_id" ON public."ChallengeTargets"(challenge_id);

CREATE INDEX IF NOT EXISTS "idx_userchallenges_user_id" ON public."UserChallenges"(user_id);
CREATE INDEX IF NOT EXISTS "idx_userchallenges_challenge_id" ON public."UserChallenges"(challenge_id);

CREATE INDEX IF NOT EXISTS "idx_comments_event_id" ON public."Comments"(event_id);
CREATE INDEX IF NOT EXISTS "idx_comments_user_id" ON public."Comments"(user_id);
CREATE INDEX IF NOT EXISTS "idx_comments_created_at" ON public."Comments"(created_at);

CREATE INDEX IF NOT EXISTS "idx_mentions_source" ON public."Mentions"(source_type, source_id);
CREATE INDEX IF NOT EXISTS "idx_mentions_mentioned_user_id" ON public."Mentions"(mentioned_user_id);
CREATE INDEX IF NOT EXISTS "idx_notifications_user_id" ON public."Notifications"(user_id);
CREATE INDEX IF NOT EXISTS "idx_notifications_created_at" ON public."Notifications"(created_at);

-- Activer RLS (Row Level Security) pour la sécurité
ALTER TABLE public."Users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."TicketTypes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Tickets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."RefreshTokens" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Reports" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."AuditLogs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Stories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Follows" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Tags" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."EventTags" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Favorites" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Challenges" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ChallengeTargets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."UserChallenges" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Comments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Mentions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Notifications" ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour permettre les accès nécessaires
-- Users (accès via API REST, pas auth.uid())
CREATE POLICY "Enable all operations for Users table" ON public."Users"
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Enable all operations for Mentions table" ON public."Mentions"
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Enable all operations for Notifications table" ON public."Notifications"
    FOR ALL USING (true) WITH CHECK (true);

-- Events (lecture publique, écriture gérée par l'API)
CREATE POLICY "Enable read for Events table" ON public."Events"
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable all operations for Events table" ON public."Events";

CREATE POLICY "Enable all operations for Events table" ON public."Events"
    FOR ALL USING (true) WITH CHECK (true);

-- TicketTypes (lecture publique, écriture gérée par l'API)
CREATE POLICY "Enable read for TicketTypes table" ON public."TicketTypes"
    FOR SELECT USING (true);

CREATE POLICY "Enable all operations for TicketTypes table" ON public."TicketTypes"
    FOR ALL WITH CHECK (true);

-- Tickets (lecture et écriture gérées par l'API)
CREATE POLICY "Enable all operations for Tickets table" ON public."Tickets"
    FOR ALL USING (true) WITH CHECK (true);

-- RefreshTokens (accès géré par l'API)
CREATE POLICY "Enable all operations for RefreshTokens table" ON public."RefreshTokens"
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Enable all operations for Reports table" ON public."Reports"
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Enable all operations for AuditLogs table" ON public."AuditLogs"
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Enable all operations for Stories table" ON public."Stories"
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Enable all operations for Follows table" ON public."Follows"
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Enable all operations for Tags table" ON public."Tags"
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Enable all operations for EventTags table" ON public."EventTags"
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Enable all operations for Favorites table" ON public."Favorites"
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Enable all operations for Challenges table" ON public."Challenges"
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Enable all operations for ChallengeTargets table" ON public."ChallengeTargets"
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Enable all operations for UserChallenges table" ON public."UserChallenges"
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Enable all operations for Comments table" ON public."Comments"
    FOR ALL USING (true) WITH CHECK (true);
