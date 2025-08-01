-- Migration 0029: Push Notifications Support
-- Created: 2025-08-01

-- =========================================
-- PUSH TOKENS TABLE
-- =========================================

-- Push notification tokens table
CREATE TABLE IF NOT EXISTS push_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    platform VARCHAR(20) NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
    device_name VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure one active token per user per device
    UNIQUE(user_id, token)
);

-- =========================================
-- NOTIFICATION LOGS TABLE
-- =========================================

-- Table to track sent notifications
CREATE TABLE IF NOT EXISTS notification_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    data JSONB,
    recipient_type VARCHAR(50) NOT NULL CHECK (recipient_type IN ('all', 'teachers', 'parents', 'students', 'individual')),
    recipient_ids UUID[] DEFAULT '{}', -- Array of user IDs for individual notifications
    sent_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    sent_by UUID REFERENCES users(id) ON DELETE SET NULL,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =========================================
-- NOTIFICATION PREFERENCES TABLE
-- =========================================

-- User notification preferences
CREATE TABLE IF NOT EXISTS notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    announcements BOOLEAN DEFAULT true,
    assignments BOOLEAN DEFAULT true,
    grades BOOLEAN DEFAULT true,
    attendance BOOLEAN DEFAULT true,
    events BOOLEAN DEFAULT true,
    messages BOOLEAN DEFAULT true,
    reminders BOOLEAN DEFAULT true,
    emergencies BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(user_id)
);

-- =========================================
-- INDEXES
-- =========================================

CREATE INDEX IF NOT EXISTS idx_push_tokens_user_id ON push_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_push_tokens_school_id ON push_tokens(school_id);
CREATE INDEX IF NOT EXISTS idx_push_tokens_active ON push_tokens(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_push_tokens_platform ON push_tokens(platform);

CREATE INDEX IF NOT EXISTS idx_notification_logs_school_id ON notification_logs(school_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_sent_at ON notification_logs(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_logs_recipient_type ON notification_logs(recipient_type);

CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON notification_preferences(user_id);

-- =========================================
-- RLS POLICIES
-- =========================================

-- Enable RLS
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- Push tokens policies
CREATE POLICY "Users can manage their own push tokens" ON push_tokens
    FOR ALL TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "School admins can view school push tokens" ON push_tokens
    FOR SELECT TO authenticated
    USING (
        school_id IN (
            SELECT users.school_id FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'school_admin'
        )
    );

CREATE POLICY "Super admins can view all push tokens" ON push_tokens
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'super_admin'
        )
    );

-- Notification logs policies
CREATE POLICY "School admins can manage notification logs" ON notification_logs
    FOR ALL TO authenticated
    USING (
        school_id IN (
            SELECT users.school_id FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('school_admin', 'teacher')
        )
    );

CREATE POLICY "Super admins can view all notification logs" ON notification_logs
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'super_admin'
        )
    );

-- Notification preferences policies
CREATE POLICY "Users can manage their own notification preferences" ON notification_preferences
    FOR ALL TO authenticated
    USING (user_id = auth.uid());

-- =========================================
-- FUNCTIONS
-- =========================================

-- Function to get push tokens for users
CREATE OR REPLACE FUNCTION get_push_tokens(
    p_school_id UUID,
    p_recipient_type VARCHAR DEFAULT 'all',
    p_user_ids UUID[] DEFAULT NULL
)
RETURNS TABLE(
    token TEXT,
    platform VARCHAR,
    user_id UUID
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pt.token,
        pt.platform,
        pt.user_id
    FROM push_tokens pt
    INNER JOIN users u ON pt.user_id = u.id
    WHERE pt.school_id = p_school_id 
    AND pt.is_active = true
    AND (
        p_recipient_type = 'all' 
        OR (p_recipient_type = 'teachers' AND u.role = 'teacher')
        OR (p_recipient_type = 'parents' AND u.role = 'parent') 
        OR (p_recipient_type = 'students' AND u.role = 'student')
        OR (p_recipient_type = 'individual' AND pt.user_id = ANY(p_user_ids))
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create default notification preferences for new users
CREATE OR REPLACE FUNCTION create_default_notification_preferences(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
    INSERT INTO notification_preferences (user_id)
    VALUES (p_user_id)
    ON CONFLICT (user_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log notification sending
CREATE OR REPLACE FUNCTION log_notification(
    p_school_id UUID,
    p_title VARCHAR,
    p_body TEXT,
    p_data JSONB DEFAULT NULL,
    p_recipient_type VARCHAR DEFAULT 'all',
    p_recipient_ids UUID[] DEFAULT NULL,
    p_sent_by UUID DEFAULT NULL,
    p_sent_count INTEGER DEFAULT 0,
    p_failed_count INTEGER DEFAULT 0
)
RETURNS UUID AS $$
DECLARE
    log_id UUID;
BEGIN
    INSERT INTO notification_logs (
        school_id,
        title,
        body,
        data,
        recipient_type,
        recipient_ids,
        sent_by,
        sent_count,
        failed_count
    ) VALUES (
        p_school_id,
        p_title,
        p_body,
        p_data,
        p_recipient_type,
        p_recipient_ids,
        p_sent_by,
        p_sent_count,
        p_failed_count
    ) RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =========================================
-- TRIGGERS
-- =========================================

-- Trigger to update updated_at timestamp
CREATE TRIGGER push_tokens_updated_at 
    BEFORE UPDATE ON push_tokens 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER notification_preferences_updated_at 
    BEFORE UPDATE ON notification_preferences 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Trigger to create default notification preferences for new users
CREATE OR REPLACE FUNCTION create_user_notification_preferences()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM create_default_notification_preferences(NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_create_notification_preferences
    AFTER INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION create_user_notification_preferences();

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_push_tokens(UUID, VARCHAR, UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION create_default_notification_preferences(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION log_notification(UUID, VARCHAR, TEXT, JSONB, VARCHAR, UUID[], UUID, INTEGER, INTEGER) TO authenticated;