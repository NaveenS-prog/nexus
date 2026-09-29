-- ==============================================================================
-- NEXUS Multi-Account Google Integration Schema Migration
-- ==============================================================================

-- 1. Connected Accounts Table
CREATE TABLE IF NOT EXISTS connected_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL DEFAULT 'google',
    provider_account_id TEXT,
    email TEXT NOT NULL,
    display_name TEXT,
    avatar_url TEXT,
    account_type TEXT NOT NULL DEFAULT 'personal' CHECK (account_type IN ('personal', 'university', 'work', 'other')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'reauth_required', 'error', 'disconnected')),
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    connected_at TIMESTAMPTZ DEFAULT NOW(),
    last_used_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb,
    CONSTRAINT uq_user_provider_account UNIQUE (user_id, provider, provider_account_id)
);

-- 2. Modify Integrations Table to Support Multiple Accounts & Services
-- Allow connected_account_id linkage and drop legacy single-provider uniqueness
DO $$
BEGIN
    -- Add connected_account_id column if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'integrations' AND column_name = 'connected_account_id'
    ) THEN
        ALTER TABLE integrations ADD COLUMN connected_account_id UUID REFERENCES connected_accounts(id) ON DELETE CASCADE;
    END IF;

    -- Add service column if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'integrations' AND column_name = 'service'
    ) THEN
        ALTER TABLE integrations ADD COLUMN service TEXT DEFAULT 'calendar';
    END IF;

    -- Add scopes column if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'integrations' AND column_name = 'scopes'
    ) THEN
        ALTER TABLE integrations ADD COLUMN scopes TEXT[] DEFAULT ARRAY[]::TEXT[];
    END IF;

    -- Add last_success_at column if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'integrations' AND column_name = 'last_success_at'
    ) THEN
        ALTER TABLE integrations ADD COLUMN last_success_at TIMESTAMPTZ;
    END IF;

    -- Add last_error_at column if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'integrations' AND column_name = 'last_error_at'
    ) THEN
        ALTER TABLE integrations ADD COLUMN last_error_at TIMESTAMPTZ;
    END IF;

    -- Add last_error_message column if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'integrations' AND column_name = 'last_error_message'
    ) THEN
        ALTER TABLE integrations ADD COLUMN last_error_message TEXT;
    END IF;
END $$;

-- Drop legacy unique constraint (user_id, provider) if exists so user can connect multiple Google accounts
ALTER TABLE integrations DROP CONSTRAINT IF EXISTS integrations_user_id_provider_key;
ALTER TABLE integrations DROP CONSTRAINT IF EXISTS uq_integrations_user_provider;

-- Add new constraint: each service under a connected account is unique
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_account_service'
    ) THEN
        ALTER TABLE integrations ADD CONSTRAINT uq_account_service UNIQUE (connected_account_id, service);
    END IF;
EXCEPTION
    WHEN duplicate_table THEN NULL;
    WHEN duplicate_object THEN NULL;
END $$;

-- 3. Extend Unified Items with Account Association
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'unified_items' AND column_name = 'connected_account_id'
    ) THEN
        ALTER TABLE unified_items ADD COLUMN connected_account_id UUID REFERENCES connected_accounts(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'unified_items' AND column_name = 'account_type'
    ) THEN
        ALTER TABLE unified_items ADD COLUMN account_type TEXT DEFAULT 'personal';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'unified_items' AND column_name = 'account_email'
    ) THEN
        ALTER TABLE unified_items ADD COLUMN account_email TEXT;
    END IF;
END $$;

-- 4. Indexes for Maximum Multi-Account Query Performance
CREATE INDEX IF NOT EXISTS idx_connected_accounts_user ON connected_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_connected_accounts_email ON connected_accounts(email);
CREATE INDEX IF NOT EXISTS idx_connected_accounts_type ON connected_accounts(user_id, account_type);
CREATE INDEX IF NOT EXISTS idx_integrations_account ON integrations(connected_account_id);
CREATE INDEX IF NOT EXISTS idx_items_connected_account ON unified_items(user_id, connected_account_id);
CREATE INDEX IF NOT EXISTS idx_items_account_type ON unified_items(user_id, account_type);

-- 5. Row Level Security for Connected Accounts
ALTER TABLE connected_accounts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Users can access own connected accounts' AND tablename = 'connected_accounts'
    ) THEN
        CREATE POLICY "Users can access own connected accounts" ON connected_accounts FOR ALL USING (auth.uid() = user_id);
    END IF;
END $$;
