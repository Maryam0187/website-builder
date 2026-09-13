CREATE TABLE IF NOT EXISTS users (
  id                   BIGSERIAL PRIMARY KEY,
  email                TEXT UNIQUE NOT NULL,
  name                 TEXT NOT NULL,
  role                 TEXT NOT NULL CHECK (role IN ('admin', 'owner')),
  site_id              BIGINT NULL,
  password_hash        TEXT NOT NULL,
  must_change_password BOOLEAN NOT NULL DEFAULT false,
  payment_status       TEXT NOT NULL DEFAULT 'unpaid',
  payment_plan         TEXT NOT NULL DEFAULT 'Easy Website',
  payment_amount       TEXT NOT NULL DEFAULT '',
  payment_note         TEXT NOT NULL DEFAULT '',
  payment_updated_at   TIMESTAMPTZ NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'unpaid';
ALTER TABLE users ADD COLUMN IF NOT EXISTS payment_plan TEXT NOT NULL DEFAULT 'Easy Website';
ALTER TABLE users ADD COLUMN IF NOT EXISTS payment_amount TEXT NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS payment_note TEXT NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS payment_updated_at TIMESTAMPTZ NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_status TEXT NOT NULL DEFAULT 'none';
ALTER TABLE users ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS trial_used BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS plan_id TEXT NOT NULL DEFAULT 'free';
ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS site_slots INT NOT NULL DEFAULT 1;
ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_secret TEXT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_pending_secret TEXT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_ask_life TEXT NOT NULL DEFAULT 'every';

CREATE TABLE IF NOT EXISTS invoices (
  id            BIGSERIAL PRIMARY KEY,
  user_id       BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  number        TEXT UNIQUE NOT NULL,
  amount_cents  INT NOT NULL DEFAULT 2900,
  currency      TEXT NOT NULL DEFAULT 'usd',
  status        TEXT NOT NULL DEFAULT 'open',
  due_at        TIMESTAMPTZ NULL,
  paid_at       TIMESTAMPTZ NULL,
  note          TEXT NOT NULL DEFAULT '',
  plan_id       TEXT NOT NULL DEFAULT 'domain',
  stripe_session_id TEXT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS plan_id TEXT NOT NULL DEFAULT 'domain';
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS stripe_session_id TEXT NULL;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS addon_id TEXT NULL;

CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON invoices(user_id);

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
  subdomain        TEXT NULL,
  custom_domain    TEXT NULL,
  domain_status    TEXT NOT NULL DEFAULT 'none',
  domain_verified_at TIMESTAMPTZ NULL,
  content          JSONB NOT NULL DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE sites ADD COLUMN IF NOT EXISTS subdomain TEXT;
ALTER TABLE sites ADD COLUMN IF NOT EXISTS custom_domain TEXT;
ALTER TABLE sites ADD COLUMN IF NOT EXISTS domain_status TEXT NOT NULL DEFAULT 'none';
ALTER TABLE sites ADD COLUMN IF NOT EXISTS domain_verified_at TIMESTAMPTZ NULL;

CREATE TABLE IF NOT EXISTS site_versions (
  id           BIGSERIAL PRIMARY KEY,
  site_id      BIGINT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  content      JSONB NOT NULL DEFAULT '{}',
  label        TEXT NOT NULL DEFAULT '',
  created_by   BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_site_versions_site_id_created
  ON site_versions (site_id, created_at DESC);

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

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id          BIGSERIAL PRIMARY KEY,
  user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token       TEXT UNIQUE NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  used_at     TIMESTAMPTZ NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversations_access_token ON conversations(access_token);
CREATE UNIQUE INDEX IF NOT EXISTS idx_conversations_email_unique ON conversations (lower(email));
CREATE INDEX IF NOT EXISTS idx_sites_slug ON sites(slug);
CREATE UNIQUE INDEX IF NOT EXISTS idx_sites_subdomain_unique
  ON sites (lower(subdomain))
  WHERE subdomain IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
