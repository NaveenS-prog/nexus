-- ==============================================================================
-- NEXUS Database Schema (Supabase PostgreSQL with Row Level Security)
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    timezone TEXT DEFAULT 'UTC',
    preferred_mode TEXT DEFAULT 'default' CHECK (preferred_mode IN ('default', 'exam', 'build')),
    focus_duration_minutes INT DEFAULT 25,
    work_start_hour INT DEFAULT 9,
    work_end_hour INT DEFAULT 18,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Integrations Table (stores OAuth tokens and sync states securely)
CREATE TABLE IF NOT EXISTS integrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL CHECK (provider IN ('google_tasks', 'google_classroom', 'google_calendar', 'notion', 'github')),
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at TIMESTAMPTZ,
    account_email TEXT,
    is_connected BOOLEAN DEFAULT FALSE,
    last_synced_at TIMESTAMPTZ,
    sync_status TEXT DEFAULT 'idle' CHECK (sync_status IN ('idle', 'syncing', 'success', 'error', 'needs_reconnect')),
    error_message TEXT,
    settings JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, provider)
);

-- 3. Projects Table
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('idea', 'planning', 'in_progress', 'paused', 'completed')),
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    progress INT DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    deadline TIMESTAMPTZ,
    github_repo TEXT,
    notion_url TEXT,
    color TEXT DEFAULT '#6366F1',
    nodes JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Unified Items Table (Normalized cache for Tasks, Assignments, Calendar Events)
CREATE TABLE IF NOT EXISTS unified_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    external_id TEXT,
    source TEXT NOT NULL CHECK (source IN ('google_tasks', 'google_classroom', 'google_calendar', 'notion', 'github', 'nexus')),
    title TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL CHECK (category IN ('academic', 'personal', 'project', 'calendar', 'idea')),
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
    start_at TIMESTAMPTZ,
    due_at TIMESTAMPTZ,
    estimated_minutes INT DEFAULT 30,
    url TEXT,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    course_name TEXT,
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Project Tasks (Kanban items)
CREATE TABLE IF NOT EXISTS project_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'backlog' CHECK (status IN ('backlog', 'in_progress', 'review', 'done')),
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    order_index INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Notes Table
CREATE TABLE IF NOT EXISTS notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT DEFAULT 'general',
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    is_pinned BOOLEAN DEFAULT FALSE,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Ideas Table
CREATE TABLE IF NOT EXISTS ideas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    summary TEXT,
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    status TEXT DEFAULT 'raw' CHECK (status IN ('raw', 'exploring', 'promoted_to_project', 'archived')),
    destination TEXT DEFAULT 'nexus' CHECK (destination IN ('nexus', 'notion')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Focus Sessions Table
CREATE TABLE IF NOT EXISTS focus_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    task_id UUID REFERENCES unified_items(id) ON DELETE SET NULL,
    duration_minutes INT NOT NULL,
    ambient_sound TEXT,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    completed BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('deadline_warning', 'overdue_task', 'workload_warning', 'sync_status', 'focus_completed')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    severity TEXT DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical', 'success')),
    is_read BOOLEAN DEFAULT FALSE,
    link_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Sync Logs Table
CREATE TABLE IF NOT EXISTS sync_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    items_synced INT DEFAULT 0,
    status TEXT NOT NULL CHECK (status IN ('success', 'partial', 'failed')),
    duration_ms INT,
    error_message TEXT,
    synced_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. User Preferences Table
CREATE TABLE IF NOT EXISTS preferences (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    ambient_sounds_volume INT DEFAULT 60,
    last_used_sound TEXT DEFAULT 'rain',
    auto_daily_briefing BOOLEAN DEFAULT TRUE,
    pomodoro_break_minutes INT DEFAULT 5,
    shortcuts_enabled BOOLEAN DEFAULT TRUE,
    theme TEXT DEFAULT 'dark' CHECK (theme IN ('dark', 'light', 'system')),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- INDEXES FOR MAXIMUM QUERY PERFORMANCE
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_items_user_due ON unified_items(user_id, due_at);
CREATE INDEX IF NOT EXISTS idx_items_user_status ON unified_items(user_id, status);
CREATE INDEX IF NOT EXISTS idx_items_user_source ON unified_items(user_id, source);
CREATE INDEX IF NOT EXISTS idx_items_user_category ON unified_items(user_id, category);
CREATE INDEX IF NOT EXISTS idx_items_project ON unified_items(project_id);
CREATE INDEX IF NOT EXISTS idx_projects_user_status ON projects(user_id, status);
CREATE INDEX IF NOT EXISTS idx_focus_user_started ON focus_sessions(user_id, started_at);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE unified_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE focus_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access own profile" ON profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "Users can access own integrations" ON integrations FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can access own projects" ON projects FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can access own unified items" ON unified_items FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can access own project tasks" ON project_tasks FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can access own notes" ON notes FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can access own ideas" ON ideas FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can access own focus sessions" ON focus_sessions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can access own notifications" ON notifications FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can access own sync logs" ON sync_logs FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can access own preferences" ON preferences FOR ALL USING (auth.uid() = user_id);
