-- Migration: Add notification tables for mobile push notifications
-- This migration adds tables to support push notifications for the mobile parent app

-- Create parent_push_tokens table to store push notification tokens
CREATE TABLE IF NOT EXISTS parent_push_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    push_token TEXT NOT NULL,
    platform TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
    device_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(parent_id, push_token)
);

-- Create parent_notifications table to store notification history
CREATE TABLE IF NOT EXISTS parent_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('announcement', 'homework', 'exam', 'attendance', 'general')),
    data JSONB,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_parent_push_tokens_parent_id ON parent_push_tokens(parent_id);
CREATE INDEX IF NOT EXISTS idx_parent_push_tokens_platform ON parent_push_tokens(platform);
CREATE INDEX IF NOT EXISTS idx_parent_notifications_parent_id ON parent_notifications(parent_id);
CREATE INDEX IF NOT EXISTS idx_parent_notifications_type ON parent_notifications(type);
CREATE INDEX IF NOT EXISTS idx_parent_notifications_read ON parent_notifications(read);
CREATE INDEX IF NOT EXISTS idx_parent_notifications_created_at ON parent_notifications(created_at);

-- Enable RLS
ALTER TABLE parent_push_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_notifications ENABLE ROW LEVEL SECURITY;

-- RLS policies for parent_push_tokens
CREATE POLICY "Parents can manage their own push tokens"
    ON parent_push_tokens FOR ALL
    TO authenticated
    USING (auth.uid() = parent_id);

-- RLS policies for parent_notifications
CREATE POLICY "Parents can view their own notifications"
    ON parent_notifications FOR SELECT
    TO authenticated
    USING (auth.uid() = parent_id);

CREATE POLICY "Parents can update their own notifications"
    ON parent_notifications FOR UPDATE
    TO authenticated
    USING (auth.uid() = parent_id);

-- Allow admins and teachers to insert notifications
CREATE POLICY "School admins can insert notifications"
    ON parent_notifications FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('school_admin', 'teacher')
        )
    );

-- Function to automatically send notifications for new announcements
CREATE OR REPLACE FUNCTION notify_parents_of_announcement()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert notification for all parents in the school
    INSERT INTO parent_notifications (parent_id, title, body, type, data)
    SELECT 
        p.id,
        'New Announcement: ' || NEW.title,
        NEW.content,
        'announcement',
        jsonb_build_object(
            'announcement_id', NEW.id,
            'school_id', NEW.school_id,
            'priority', NEW.priority
        )
    FROM auth.users p
    JOIN user_roles ur ON p.id = ur.user_id
    JOIN parent_student_links psl ON p.id = psl.parent_id
    JOIN students s ON psl.student_id = s.id
    JOIN sections sec ON s.section_id = sec.id
    WHERE ur.role = 'parent' 
    AND sec.school_id = NEW.school_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for announcement notifications
DROP TRIGGER IF EXISTS trigger_notify_parents_of_announcement ON announcements;
CREATE TRIGGER trigger_notify_parents_of_announcement
    AFTER INSERT ON announcements
    FOR EACH ROW
    EXECUTE FUNCTION notify_parents_of_announcement();

-- Function to automatically send notifications for new homework
CREATE OR REPLACE FUNCTION notify_parents_of_homework()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert notification for parents of students who have this homework
    INSERT INTO parent_notifications (parent_id, title, body, type, data)
    SELECT 
        p.id,
        'New Homework: ' || NEW.title,
        NEW.description,
        'homework',
        jsonb_build_object(
            'homework_id', NEW.id,
            'student_id', NEW.student_id,
            'due_date', NEW.due_date,
            'subject', NEW.subject
        )
    FROM auth.users p
    JOIN user_roles ur ON p.id = ur.user_id
    JOIN parent_student_links psl ON p.id = psl.parent_id
    WHERE ur.role = 'parent' 
    AND psl.student_id = NEW.student_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for homework notifications (if homework_assignments table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'homework_assignments') THEN
        DROP TRIGGER IF EXISTS trigger_notify_parents_of_homework ON homework_assignments;
        CREATE TRIGGER trigger_notify_parents_of_homework
            AFTER INSERT ON homework_assignments
            FOR EACH ROW
            EXECUTE FUNCTION notify_parents_of_homework();
    END IF;
END $$;

-- Function to automatically send notifications for exam results
CREATE OR REPLACE FUNCTION notify_parents_of_exam_result()
RETURNS TRIGGER AS $$
BEGIN
    -- Only notify if marks are being added/updated
    IF NEW.marks_obtained IS NOT NULL AND (OLD.marks_obtained IS NULL OR NEW.marks_obtained != OLD.marks_obtained) THEN
        INSERT INTO parent_notifications (parent_id, title, body, type, data)
        SELECT 
            p.id,
            'Exam Result Available',
            'Results for ' || ep.subject || ' exam are now available',
            'exam',
            jsonb_build_object(
                'exam_id', ep.id,
                'student_id', NEW.student_id,
                'subject', ep.subject,
                'marks_obtained', NEW.marks_obtained,
                'total_marks', ep.total_marks
            )
        FROM auth.users p
        JOIN user_roles ur ON p.id = ur.user_id
        JOIN parent_student_links psl ON p.id = psl.parent_id
        JOIN exam_papers ep ON NEW.exam_paper_id = ep.id
        WHERE ur.role = 'parent' 
        AND psl.student_id = NEW.student_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for exam result notifications (if student_exam_results table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'student_exam_results') THEN
        DROP TRIGGER IF EXISTS trigger_notify_parents_of_exam_result ON student_exam_results;
        CREATE TRIGGER trigger_notify_parents_of_exam_result
            AFTER INSERT OR UPDATE ON student_exam_results
            FOR EACH ROW
            EXECUTE FUNCTION notify_parents_of_exam_result();
    END IF;
END $$;

-- Function to mark notifications as read
CREATE OR REPLACE FUNCTION mark_notification_as_read(notification_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE parent_notifications 
    SET read = TRUE, updated_at = NOW()
    WHERE id = notification_id AND parent_id = auth.uid();
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark all notifications as read for a parent
CREATE OR REPLACE FUNCTION mark_all_notifications_as_read()
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE parent_notifications 
    SET read = TRUE, updated_at = NOW()
    WHERE parent_id = auth.uid() AND read = FALSE;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get notification count for a parent
CREATE OR REPLACE FUNCTION get_parent_notification_count(parent_uuid UUID DEFAULT auth.uid())
RETURNS TABLE (
    total_count BIGINT,
    unread_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_count,
        COUNT(*) FILTER (WHERE read = FALSE) as unread_count
    FROM parent_notifications
    WHERE parent_id = parent_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add updated_at trigger for parent_push_tokens
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_parent_push_tokens_updated_at
    BEFORE UPDATE ON parent_push_tokens
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_parent_notifications_updated_at
    BEFORE UPDATE ON parent_notifications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON parent_push_tokens TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON parent_notifications TO authenticated;
GRANT EXECUTE ON FUNCTION mark_notification_as_read(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_all_notifications_as_read() TO authenticated;
GRANT EXECUTE ON FUNCTION get_parent_notification_count(UUID) TO authenticated; 