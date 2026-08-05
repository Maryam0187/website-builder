CREATE TABLE IF NOT EXISTS users (
  id                   BIGSERIAL PRIMARY KEY,
  email                TEXT UNIQUE NOT NULL,
  name                 TEXT NOT NULL,
  role                 TEXT NOT NULL CHECK (role IN ('admin', 'owner')),
  site_id              BIGINT NULL,
  password_hash        TEXT NOT NULL,
  must_change_password BOOLEAN NOT NULL DEFAULT false,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sessions (
  id          BIGSERIAL PRIMARY KEY,
  user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token       TEXT UNIQUE NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS conversations (
  id                 BIGSERIAL PRIMARY KEY,
  name               TEXT NOT NULL,
  email              TEXT NOT NULL,
  website_name       TEXT NOT NULL DEFAULT '',
  phone              TEXT NOT NULL DEFAULT '',
  business_type      TEXT NOT NULL DEFAULT '',
  access_token       TEXT UNIQUE NOT NULL,
  email_verified     BOOLEAN NOT NULL DEFAULT false,
  email_verified_at  TIMESTAMPTZ NULL,
  site_id            BIGINT NULL,
  bot_onboarded      BOOLEAN NOT NULL DEFAULT false,
  bot_step           TEXT NOT NULL DEFAULT 'none',
  bot_answers        JSONB NOT NULL DEFAULT '{}',
  status             TEXT NOT NULL DEFAULT 'open',
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS messages (
  id               BIGSERIAL PRIMARY KEY,
  conversation_id  BIGINT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender           TEXT NOT NULL CHECK (sender IN ('guest', 'owner', 'admin', 'bot')),
  body             TEXT NOT NULL,
  images           JSONB NOT NULL DEFAULT '[]',
  system           BOOLEAN NOT NULL DEFAULT false,
  read_by_admin    BOOLEAN NOT NULL DEFAULT false,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Existing databases created before bot support
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS bot_onboarded BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS bot_step TEXT NOT NULL DEFAULT 'none';
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS bot_answers JSONB NOT NULL DEFAULT '{}';

DO $$
BEGIN
  ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_sender_check;
  ALTER TABLE messages
    ADD CONSTRAINT messages_sender_check
    CHECK (sender IN ('guest', 'owner', 'admin', 'bot'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS sites (
  id               BIGSERIAL PRIMARY KEY,
  slug             TEXT UNIQUE NOT NULL,
  conversation_id  BIGINT NULL REFERENCES conversations(id) ON DELETE SET NULL,
  owner_id         BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,
  status           TEXT NOT NULL DEFAULT 'draft',
  content          JSONB NOT NULL DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_site_id_fkey'
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT users_site_id_fkey
      FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'conversations_site_id_fkey'
  ) THEN
    ALTER TABLE conversations
      ADD CONSTRAINT conversations_site_id_fkey
      FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversations_access_token ON conversations(access_token);
CREATE UNIQUE INDEX IF NOT EXISTS idx_conversations_email_unique ON conversations (lower(email));
CREATE INDEX IF NOT EXISTS idx_sites_slug ON sites(slug);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
