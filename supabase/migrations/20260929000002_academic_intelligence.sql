-- ==============================================================================
-- NEXUS Academic Intelligence Layer Schema Migration
-- ==============================================================================

-- 1. Academic Courses Table
CREATE TABLE IF NOT EXISTS academic_courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    external_course_id TEXT,
    source TEXT NOT NULL DEFAULT 'CLASSROOM_BROWSER' CHECK (source IN ('CLASSROOM_BROWSER', 'CLASSROOM_API', 'MANUAL', 'FILE_IMPORT')),
    connected_account_id UUID REFERENCES connected_accounts(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    course_code TEXT,
    section TEXT,
    teacher_name TEXT,
    drive_folder_id TEXT,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_user_course_identity UNIQUE (user_id, source, external_course_id)
);

-- 2. Academic Items Table
CREATE TABLE IF NOT EXISTS academic_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    source TEXT NOT NULL CHECK (source IN ('CLASSROOM_BROWSER', 'CLASSROOM_API', 'MANUAL', 'FILE_IMPORT', 'EMAIL', 'CALENDAR')),
    source_account_id UUID REFERENCES connected_accounts(id) ON DELETE SET NULL,
    source_external_id TEXT,
    source_url TEXT,
    type TEXT NOT NULL CHECK (type IN (
        'ASSIGNMENT', 'LECTURE_MATERIAL', 'REFERENCE_MATERIAL', 
        'ANNOUNCEMENT', 'EXAM', 'PROJECT', 'LAB', 'READING', 
        'SCHEDULE_CHANGE', 'UNKNOWN'
    )),
    course_id UUID REFERENCES academic_courses(id) ON DELETE SET NULL,
    course_name TEXT NOT NULL,
    course_code TEXT,
    course_section TEXT,
    title TEXT NOT NULL,
    description TEXT,
    instructions TEXT,
    published_at TIMESTAMPTZ,
    due_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'NEW' CHECK (status IN (
        'NEW', 'PROCESSING', 'TASK_CREATED', 'ORGANIZED', 
        'IN_WORKSPACE', 'READY_FOR_REVIEW', 'USER_APPROVED', 
        'FINALIZED', 'COMPLETED', 'ARCHIVED'
    )),
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    task_id UUID REFERENCES unified_items(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    raw_source_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    -- Enforce idempotency: prevent duplicate capture of identical external items per account
    CONSTRAINT uq_user_source_external_item UNIQUE (user_id, source, source_external_id)
);

-- 3. Academic Attachments Table
CREATE TABLE IF NOT EXISTS academic_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    academic_item_id UUID NOT NULL REFERENCES academic_items(id) ON DELETE CASCADE,
    source TEXT NOT NULL DEFAULT 'CLASSROOM_BROWSER',
    source_external_id TEXT,
    name TEXT NOT NULL,
    original_name TEXT NOT NULL,
    mime_type TEXT NOT NULL DEFAULT 'application/octet-stream',
    size BIGINT DEFAULT 0,
    source_url TEXT,
    download_status TEXT NOT NULL DEFAULT 'NOT_REQUESTED' CHECK (download_status IN (
        'NOT_REQUESTED', 'QUEUED', 'DOWNLOADING', 'DOWNLOADED', 'FAILED', 'UNAVAILABLE'
    )),
    storage_path TEXT,
    content_hash TEXT,
    drive_file_id TEXT,
    drive_folder_id TEXT,
    processing_status TEXT NOT NULL DEFAULT 'NOT_PROCESSED' CHECK (processing_status IN (
        'NOT_PROCESSED', 'PROCESSING', 'PROCESSED', 'FAILED'
    )),
    extracted_text TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Academic Requirements Table (Extracted from Assignments)
CREATE TABLE IF NOT EXISTS academic_requirements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    academic_item_id UUID NOT NULL REFERENCES academic_items(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'DELIVERABLE' CHECK (type IN (
        'DELIVERABLE', 'FORMAT', 'WORD_COUNT', 'CODE', 'REFERENCE', 'SUBMISSION', 'RUBRIC', 'OTHER'
    )),
    mandatory BOOLEAN NOT NULL DEFAULT TRUE,
    status TEXT NOT NULL DEFAULT 'NOT_STARTED' CHECK (status IN (
        'NOT_STARTED', 'IN_PROGRESS', 'SATISFIED', 'WARNING', 'FAILED'
    )),
    source_reference TEXT,
    evidence TEXT,
    order_index INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Academic Assignment Workspaces Table
CREATE TABLE IF NOT EXISTS academic_workspaces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    academic_item_id UUID NOT NULL REFERENCES academic_items(id) ON DELETE CASCADE,
    state TEXT NOT NULL DEFAULT 'DETECTED' CHECK (state IN (
        'DETECTED', 'ANALYZING', 'COLLECTING_MATERIALS', 'PLANNING', 
        'GENERATING', 'VALIDATING', 'READY_FOR_REVIEW', 'USER_APPROVED', 
        'FINALIZED', 'READY_FOR_SUBMISSION', 'FAILED', 'REQUIRES_USER_INPUT'
    )),
    deliverable_type TEXT NOT NULL DEFAULT 'MARKDOWN' CHECK (deliverable_type IN (
        'PDF', 'DOCX', 'PPTX', 'CODE', 'MARKDOWN', 'CSV', 'XLSX', 'OTHER'
    )),
    active_version INT NOT NULL DEFAULT 1,
    generated_files JSONB DEFAULT '[]'::jsonb,
    review_results JSONB DEFAULT '{}'::jsonb,
    user_approved BOOLEAN NOT NULL DEFAULT FALSE,
    approved_at TIMESTAMPTZ,
    final_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_workspace_item UNIQUE (academic_item_id)
);

-- 6. Extension Pairings Table (Secure Scoped Authentication)
CREATE TABLE IF NOT EXISTS extension_pairings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    pairing_code TEXT NOT NULL,
    auth_token TEXT NOT NULL UNIQUE,
    device_name TEXT DEFAULT 'Chrome Browser Extension',
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACTIVE', 'REVOKED', 'EXPIRED')),
    expires_at TIMESTAMPTZ NOT NULL,
    last_used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create Performance Indexes
CREATE INDEX IF NOT EXISTS idx_academic_items_user_status ON academic_items(user_id, status);
CREATE INDEX IF NOT EXISTS idx_academic_items_course ON academic_items(course_id);
CREATE INDEX IF NOT EXISTS idx_academic_items_due ON academic_items(due_at);
CREATE INDEX IF NOT EXISTS idx_academic_attachments_item ON academic_attachments(academic_item_id);
CREATE INDEX IF NOT EXISTS idx_academic_requirements_item ON academic_requirements(academic_item_id);
CREATE INDEX IF NOT EXISTS idx_academic_workspaces_item ON academic_workspaces(academic_item_id);
CREATE INDEX IF NOT EXISTS idx_extension_pairings_token ON extension_pairings(auth_token);

-- Row Level Security (RLS)
ALTER TABLE academic_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic_workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE extension_pairings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can manage own academic courses" ON academic_courses;
    CREATE POLICY "Users can manage own academic courses" ON academic_courses
        FOR ALL USING (auth.uid() = user_id);

    DROP POLICY IF EXISTS "Users can manage own academic items" ON academic_items;
    CREATE POLICY "Users can manage own academic items" ON academic_items
        FOR ALL USING (auth.uid() = user_id);

    DROP POLICY IF EXISTS "Users can manage own academic attachments" ON academic_attachments;
    CREATE POLICY "Users can manage own academic attachments" ON academic_attachments
        FOR ALL USING (auth.uid() = user_id);

    DROP POLICY IF EXISTS "Users can manage own academic requirements" ON academic_requirements;
    CREATE POLICY "Users can manage own academic requirements" ON academic_requirements
        FOR ALL USING (auth.uid() = user_id);

    DROP POLICY IF EXISTS "Users can manage own academic workspaces" ON academic_workspaces;
    CREATE POLICY "Users can manage own academic workspaces" ON academic_workspaces
        FOR ALL USING (auth.uid() = user_id);

    DROP POLICY IF EXISTS "Users can manage own extension pairings" ON extension_pairings;
    CREATE POLICY "Users can manage own extension pairings" ON extension_pairings
        FOR ALL USING (auth.uid() = user_id);
END $$;
