-- Migration: Leave Requests System
-- Description: Creates leave requests table with RLS policies and notification system

-- Create leave_requests table
CREATE TABLE IF NOT EXISTS leave_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    leave_type VARCHAR(50) NOT NULL CHECK (leave_type IN ('sick', 'casual', 'emergency', 'maternity', 'personal', 'other')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_days INTEGER GENERATED ALWAYS AS (end_date - start_date + 1) STORED,
    reason TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    admin_response TEXT,
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_date_range CHECK (end_date >= start_date),
    CONSTRAINT valid_leave_duration CHECK (end_date - start_date + 1 <= 365) -- Max 1 year leave
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_leave_requests_teacher_id ON leave_requests(teacher_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_school_id ON leave_requests(school_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON leave_requests(status);
CREATE INDEX IF NOT EXISTS idx_leave_requests_dates ON leave_requests(start_date, end_date);

-- Enable RLS
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Teachers can view their own leave requests
CREATE POLICY "teachers_can_view_own_leaves" ON leave_requests
    FOR SELECT
    USING (
        auth.uid() = teacher_id
    );

-- Teachers can create their own leave requests
CREATE POLICY "teachers_can_create_own_leaves" ON leave_requests
    FOR INSERT
    WITH CHECK (
        auth.uid() = teacher_id AND
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role = 'teacher'
        )
    );

-- Teachers can update their own pending leave requests
CREATE POLICY "teachers_can_update_own_pending_leaves" ON leave_requests
    FOR UPDATE
    USING (
        auth.uid() = teacher_id AND
        status = 'pending'
    )
    WITH CHECK (
        auth.uid() = teacher_id AND
        status = 'pending' -- Ensure they can't change status
    );

-- School admins can view all leave requests in their school
CREATE POLICY "school_admins_can_view_school_leaves" ON leave_requests
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid()
            AND u.role = 'school_admin'
            AND u.school_id = leave_requests.school_id
        )
    );

-- School admins can update leave requests in their school
CREATE POLICY "school_admins_can_update_school_leaves" ON leave_requests
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid()
            AND u.role = 'school_admin'
            AND u.school_id = leave_requests.school_id
        )
    );

-- Super admins can view all leave requests
CREATE POLICY "super_admins_can_view_all_leaves" ON leave_requests
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid()
            AND role = 'super_admin'
        )
    );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_leave_request_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    
    -- Set review details when status changes from pending
    IF OLD.status = 'pending' AND NEW.status != 'pending' THEN
        NEW.reviewed_by = auth.uid();
        NEW.reviewed_at = NOW();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
CREATE TRIGGER update_leave_request_updated_at_trigger
    BEFORE UPDATE ON leave_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_leave_request_updated_at();

-- Function to schedule leave request notifications
CREATE OR REPLACE FUNCTION schedule_leave_request_notifications()
RETURNS TRIGGER AS $$
BEGIN
    -- When a new leave request is created, notify school admin
    IF TG_OP = 'INSERT' THEN
        -- Get school admin for the school
        INSERT INTO notifications (
            user_id,
            title,
            message,
            type,
            reference_id,
            reference_type,
            scheduled_for,
            school_id
        )
        SELECT 
            u.id,
            'New Leave Request',
            'A new leave request has been submitted by ' || tu.name || ' for ' || NEW.total_days || ' day(s) from ' || 
            TO_CHAR(NEW.start_date, 'DD Mon YYYY') || ' to ' || TO_CHAR(NEW.end_date, 'DD Mon YYYY'),
            'leave_request',
            NEW.id,
            'leave_request',
            NOW(),
            NEW.school_id
        FROM users u
        CROSS JOIN users tu
        WHERE u.school_id = NEW.school_id 
        AND u.role = 'school_admin'
        AND tu.id = NEW.teacher_id;
        
        RETURN NEW;
    END IF;
    
    -- When leave request status is updated, notify the teacher
    IF TG_OP = 'UPDATE' AND OLD.status != NEW.status AND NEW.status != 'pending' THEN
        INSERT INTO notifications (
            user_id,
            title,
            message,
            type,
            reference_id,
            reference_type,
            scheduled_for,
            school_id
        )
        VALUES (
            NEW.teacher_id,
            'Leave Request ' || UPPER(LEFT(NEW.status, 1)) || SUBSTRING(NEW.status, 2),
            'Your leave request for ' || NEW.total_days || ' day(s) from ' || 
            TO_CHAR(NEW.start_date, 'DD Mon YYYY') || ' to ' || TO_CHAR(NEW.end_date, 'DD Mon YYYY') || 
            ' has been ' || NEW.status || 
            CASE 
                WHEN NEW.admin_response IS NOT NULL THEN '. Admin note: ' || NEW.admin_response
                ELSE ''
            END,
            'leave_request',
            NEW.id,
            'leave_request',
            NOW(),
            NEW.school_id
        );
        
        RETURN NEW;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger for leave request notifications
CREATE TRIGGER schedule_leave_request_notifications_trigger
    AFTER INSERT OR UPDATE ON leave_requests
    FOR EACH ROW
    EXECUTE FUNCTION schedule_leave_request_notifications();

-- Function to get leave request statistics
CREATE OR REPLACE FUNCTION get_leave_statistics(school_id_param UUID, year_param INTEGER DEFAULT NULL)
RETURNS TABLE (
    total_requests BIGINT,
    pending_requests BIGINT,
    approved_requests BIGINT,
    rejected_requests BIGINT,
    total_days_requested BIGINT,
    total_days_approved BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_requests,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_requests,
        COUNT(*) FILTER (WHERE status = 'approved') as approved_requests,
        COUNT(*) FILTER (WHERE status = 'rejected') as rejected_requests,
        COALESCE(SUM(total_days), 0) as total_days_requested,
        COALESCE(SUM(total_days) FILTER (WHERE status = 'approved'), 0) as total_days_approved
    FROM leave_requests lr
    WHERE lr.school_id = school_id_param
    AND (year_param IS NULL OR EXTRACT(YEAR FROM lr.created_at) = year_param);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 