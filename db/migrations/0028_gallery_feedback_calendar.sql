-- Migration 0028: Gallery, Anonymous Feedback Box, and Academic Calendar modules
-- Created: 2025-01-11

-- =========================================
-- 1. SCHOOL GALLERY MODULE
-- =========================================

-- Gallery Albums table
CREATE TABLE IF NOT EXISTS gallery_albums (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    event_date DATE,
    event_name VARCHAR(255),
    is_published BOOLEAN DEFAULT false,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Gallery Images table
CREATE TABLE IF NOT EXISTS gallery_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    album_id UUID NOT NULL REFERENCES gallery_albums(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    caption TEXT,
    file_name VARCHAR(255),
    file_size INTEGER,
    uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    upload_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for Gallery
CREATE INDEX IF NOT EXISTS idx_gallery_albums_school_id ON gallery_albums(school_id);
CREATE INDEX IF NOT EXISTS idx_gallery_albums_published ON gallery_albums(school_id, is_published);
CREATE INDEX IF NOT EXISTS idx_gallery_albums_event_date ON gallery_albums(school_id, event_date DESC);
CREATE INDEX IF NOT EXISTS idx_gallery_images_album_id ON gallery_images(album_id);
CREATE INDEX IF NOT EXISTS idx_gallery_images_upload_order ON gallery_images(album_id, upload_order);

-- =========================================
-- 2. ANONYMOUS FEEDBACK BOX MODULE
-- =========================================

-- Feedback submissions table
CREATE TABLE IF NOT EXISTS feedback_box (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('complaint', 'feedback', 'suggestion')),
    subject VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    submitted_by UUID REFERENCES users(id) ON DELETE SET NULL,
    submitter_name VARCHAR(255), -- For anonymous submissions
    submitter_email VARCHAR(255), -- For anonymous submissions
    is_anonymous BOOLEAN DEFAULT false,
    status VARCHAR(50) DEFAULT 'new' CHECK (status IN ('new', 'in_review', 'resolved', 'closed')),
    admin_notes TEXT,
    resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for Feedback
CREATE INDEX IF NOT EXISTS idx_feedback_box_school_id ON feedback_box(school_id);
CREATE INDEX IF NOT EXISTS idx_feedback_box_type ON feedback_box(school_id, type);
CREATE INDEX IF NOT EXISTS idx_feedback_box_status ON feedback_box(school_id, status);
CREATE INDEX IF NOT EXISTS idx_feedback_box_created_at ON feedback_box(school_id, created_at DESC);

-- =========================================
-- 3. ACADEMIC CALENDAR MODULE
-- =========================================

-- Academic Calendar Events table
CREATE TABLE IF NOT EXISTS academic_calendar_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    event_date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('holiday', 'exam', 'ptm', 'activity', 'assembly', 'sports', 'cultural', 'academic', 'other')),
    is_published BOOLEAN DEFAULT false,
    is_recurring BOOLEAN DEFAULT false,
    recurrence_pattern VARCHAR(50), -- 'weekly', 'monthly', 'yearly'
    recurrence_end_date DATE,
    color VARCHAR(7) DEFAULT '#3B82F6', -- Hex color for calendar display
    location VARCHAR(255),
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for Academic Calendar
CREATE INDEX IF NOT EXISTS idx_academic_calendar_school_id ON academic_calendar_events(school_id);
CREATE INDEX IF NOT EXISTS idx_academic_calendar_published ON academic_calendar_events(school_id, is_published);
CREATE INDEX IF NOT EXISTS idx_academic_calendar_date ON academic_calendar_events(school_id, event_date);
CREATE INDEX IF NOT EXISTS idx_academic_calendar_type ON academic_calendar_events(school_id, event_type);

-- =========================================
-- RLS POLICIES
-- =========================================

-- Enable RLS on all tables
ALTER TABLE gallery_albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE gallery_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_box ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic_calendar_events ENABLE ROW LEVEL SECURITY;

-- =========================================
-- GALLERY ALBUMS RLS POLICIES
-- =========================================

-- Super admins can view all gallery albums
CREATE POLICY "super_admins_view_all_gallery_albums" ON gallery_albums
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'super_admin'
        )
    );

-- School admins can manage their school's gallery albums
CREATE POLICY "school_admins_manage_gallery_albums" ON gallery_albums
    FOR ALL TO authenticated
    USING (
        school_id IN (
            SELECT users.school_id FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'school_admin'
        )
    );

-- Teachers can view their school's gallery albums
CREATE POLICY "teachers_view_gallery_albums" ON gallery_albums
    FOR SELECT TO authenticated
    USING (
        school_id IN (
            SELECT users.school_id FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'teacher'
        )
    );

-- Parents can view published gallery albums from their school
CREATE POLICY "parents_view_published_gallery_albums" ON gallery_albums
    FOR SELECT TO authenticated
    USING (
        is_published = true 
        AND school_id IN (
            SELECT users.school_id FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'parent'
        )
    );

-- Students can view published gallery albums from their school
CREATE POLICY "students_view_published_gallery_albums" ON gallery_albums
    FOR SELECT TO authenticated
    USING (
        is_published = true 
        AND school_id IN (
            SELECT users.school_id FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'student'
        )
    );

-- =========================================
-- GALLERY IMAGES RLS POLICIES
-- =========================================

-- Super admins can view all gallery images
CREATE POLICY "super_admins_view_all_gallery_images" ON gallery_images
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'super_admin'
        )
    );

-- School admins can manage their school's gallery images
CREATE POLICY "school_admins_manage_gallery_images" ON gallery_images
    FOR ALL TO authenticated
    USING (
        album_id IN (
            SELECT gallery_albums.id FROM gallery_albums
            INNER JOIN users ON users.id = auth.uid()
            WHERE gallery_albums.school_id = users.school_id
            AND users.role = 'school_admin'
        )
    );

-- Teachers can view their school's gallery images
CREATE POLICY "teachers_view_gallery_images" ON gallery_images
    FOR SELECT TO authenticated
    USING (
        album_id IN (
            SELECT gallery_albums.id FROM gallery_albums
            INNER JOIN users ON users.id = auth.uid()
            WHERE gallery_albums.school_id = users.school_id
            AND users.role = 'teacher'
        )
    );

-- Parents can view images from published albums in their school
CREATE POLICY "parents_view_published_gallery_images" ON gallery_images
    FOR SELECT TO authenticated
    USING (
        album_id IN (
            SELECT gallery_albums.id FROM gallery_albums
            INNER JOIN users ON users.id = auth.uid()
            WHERE gallery_albums.school_id = users.school_id
            AND gallery_albums.is_published = true
            AND users.role = 'parent'
        )
    );

-- Students can view images from published albums in their school
CREATE POLICY "students_view_published_gallery_images" ON gallery_images
    FOR SELECT TO authenticated
    USING (
        album_id IN (
            SELECT gallery_albums.id FROM gallery_albums
            INNER JOIN users ON users.id = auth.uid()
            WHERE gallery_albums.school_id = users.school_id
            AND gallery_albums.is_published = true
            AND users.role = 'student'
        )
    );

-- =========================================
-- FEEDBACK BOX RLS POLICIES
-- =========================================

-- Super admins can view all feedback
CREATE POLICY "super_admins_view_all_feedback" ON feedback_box
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'super_admin'
        )
    );

-- School admins can manage their school's feedback
CREATE POLICY "school_admins_manage_feedback" ON feedback_box
    FOR ALL TO authenticated
    USING (
        school_id IN (
            SELECT users.school_id FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'school_admin'
        )
    );

-- Users can view their own submitted feedback
CREATE POLICY "users_view_own_feedback" ON feedback_box
    FOR SELECT TO authenticated
    USING (
        submitted_by = auth.uid()
    );

-- Anonymous users can submit feedback (for public feedback form)
CREATE POLICY "anonymous_submit_feedback" ON feedback_box
    FOR INSERT TO anon
    WITH CHECK (true);

-- Authenticated users can submit feedback to their school
CREATE POLICY "users_submit_feedback" ON feedback_box
    FOR INSERT TO authenticated
    WITH CHECK (
        school_id IN (
            SELECT users.school_id FROM users 
            WHERE users.id = auth.uid()
        )
    );

-- =========================================
-- ACADEMIC CALENDAR RLS POLICIES
-- =========================================

-- Super admins can view all calendar events
CREATE POLICY "super_admins_view_all_calendar_events" ON academic_calendar_events
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'super_admin'
        )
    );

-- School admins can manage their school's calendar events
CREATE POLICY "school_admins_manage_calendar_events" ON academic_calendar_events
    FOR ALL TO authenticated
    USING (
        school_id IN (
            SELECT users.school_id FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'school_admin'
        )
    );

-- Teachers can view their school's calendar events
CREATE POLICY "teachers_view_calendar_events" ON academic_calendar_events
    FOR SELECT TO authenticated
    USING (
        school_id IN (
            SELECT users.school_id FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'teacher'
        )
    );

-- Parents can view published calendar events from their school
CREATE POLICY "parents_view_published_calendar_events" ON academic_calendar_events
    FOR SELECT TO authenticated
    USING (
        is_published = true 
        AND school_id IN (
            SELECT users.school_id FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'parent'
        )
    );

-- Students can view published calendar events from their school
CREATE POLICY "students_view_published_calendar_events" ON academic_calendar_events
    FOR SELECT TO authenticated
    USING (
        is_published = true 
        AND school_id IN (
            SELECT users.school_id FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'student'
        )
    );

-- =========================================
-- UPDATE TRIGGERS
-- =========================================

-- Update timestamp triggers
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to tables with updated_at columns
CREATE TRIGGER gallery_albums_updated_at 
    BEFORE UPDATE ON gallery_albums 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER feedback_box_updated_at 
    BEFORE UPDATE ON feedback_box 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER academic_calendar_events_updated_at 
    BEFORE UPDATE ON academic_calendar_events 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =========================================
-- HELPER FUNCTIONS
-- =========================================

-- Function to get gallery statistics for a school
CREATE OR REPLACE FUNCTION get_gallery_stats(p_school_id UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total_albums', COUNT(DISTINCT ga.id),
        'published_albums', COUNT(DISTINCT CASE WHEN ga.is_published THEN ga.id END),
        'total_images', COUNT(gi.id),
        'latest_album_date', MAX(ga.event_date)
    ) INTO result
    FROM gallery_albums ga
    LEFT JOIN gallery_images gi ON ga.id = gi.album_id
    WHERE ga.school_id = p_school_id;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get feedback statistics for a school
CREATE OR REPLACE FUNCTION get_feedback_stats(p_school_id UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total_feedback', COUNT(*),
        'new_feedback', COUNT(CASE WHEN status = 'new' THEN 1 END),
        'in_review', COUNT(CASE WHEN status = 'in_review' THEN 1 END),
        'resolved', COUNT(CASE WHEN status = 'resolved' THEN 1 END),
        'complaints', COUNT(CASE WHEN type = 'complaint' THEN 1 END),
        'suggestions', COUNT(CASE WHEN type = 'feedback' THEN 1 END)
    ) INTO result
    FROM feedback_box
    WHERE school_id = p_school_id;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get upcoming events for a school
CREATE OR REPLACE FUNCTION get_upcoming_events(p_school_id UUID, p_days_ahead INTEGER DEFAULT 30)
RETURNS TABLE(
    id UUID,
    title VARCHAR(255),
    event_date DATE,
    event_type VARCHAR(50),
    description TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ace.id,
        ace.title,
        ace.event_date,
        ace.event_type,
        ace.description
    FROM academic_calendar_events ace
    WHERE ace.school_id = p_school_id
    AND ace.is_published = true
    AND ace.event_date BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '1 day' * p_days_ahead)
    ORDER BY ace.event_date ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions to functions
GRANT EXECUTE ON FUNCTION get_gallery_stats(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_feedback_stats(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_upcoming_events(UUID, INTEGER) TO authenticated, anon; 