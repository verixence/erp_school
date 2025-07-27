-- Migration: Online Classes Feature
-- Purpose: Add online classes scheduling and notification system

-- ============================================
-- ONLINE CLASSES TABLE
-- ============================================

-- Create online_classes table for scheduled online classes
CREATE TABLE IF NOT EXISTS public.online_classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE NOT NULL,
  teacher_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  subject TEXT,
  meeting_link TEXT NOT NULL,
  meeting_password TEXT,
  scheduled_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  status TEXT CHECK (status IN ('scheduled', 'ongoing', 'completed', 'cancelled')) DEFAULT 'scheduled',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create junction table for online_classes and sections (many-to-many)
CREATE TABLE IF NOT EXISTS public.online_class_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  online_class_id UUID REFERENCES public.online_classes(id) ON DELETE CASCADE NOT NULL,
  section_id UUID REFERENCES public.sections(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(online_class_id, section_id)
);

-- Create table for tracking which students should receive notifications
CREATE TABLE IF NOT EXISTS public.online_class_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  online_class_id UUID REFERENCES public.online_classes(id) ON DELETE CASCADE NOT NULL,
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
  parent_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ,
  attendance_status TEXT CHECK (attendance_status IN ('joined', 'absent', 'late')) DEFAULT 'absent',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(online_class_id, student_id)
);

-- Create table for online class notifications/reminders
CREATE TABLE IF NOT EXISTS public.online_class_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  online_class_id UUID REFERENCES public.online_classes(id) ON DELETE CASCADE NOT NULL,
  recipient_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  recipient_type TEXT CHECK (recipient_type IN ('teacher', 'parent')) NOT NULL,
  notification_type TEXT CHECK (notification_type IN ('scheduled', 'reminder_15min', 'reminder_5min', 'started', 'cancelled')) NOT NULL,
  message TEXT NOT NULL,
  is_sent BOOLEAN DEFAULT FALSE,
  sent_at TIMESTAMPTZ,
  scheduled_for TIMESTAMPTZ, -- When to send the notification
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_online_classes_school_id ON public.online_classes(school_id);
CREATE INDEX IF NOT EXISTS idx_online_classes_teacher_id ON public.online_classes(teacher_id);
CREATE INDEX IF NOT EXISTS idx_online_classes_date_time ON public.online_classes(scheduled_date, start_time);
CREATE INDEX IF NOT EXISTS idx_online_classes_status ON public.online_classes(status);

CREATE INDEX IF NOT EXISTS idx_online_class_sections_class_id ON public.online_class_sections(online_class_id);
CREATE INDEX IF NOT EXISTS idx_online_class_sections_section_id ON public.online_class_sections(section_id);

CREATE INDEX IF NOT EXISTS idx_online_class_participants_class_id ON public.online_class_participants(online_class_id);
CREATE INDEX IF NOT EXISTS idx_online_class_participants_student_id ON public.online_class_participants(student_id);
CREATE INDEX IF NOT EXISTS idx_online_class_participants_parent_id ON public.online_class_participants(parent_id);

CREATE INDEX IF NOT EXISTS idx_online_class_notifications_class_id ON public.online_class_notifications(online_class_id);
CREATE INDEX IF NOT EXISTS idx_online_class_notifications_recipient ON public.online_class_notifications(recipient_id, recipient_type);
CREATE INDEX IF NOT EXISTS idx_online_class_notifications_scheduled ON public.online_class_notifications(scheduled_for) WHERE is_sent = FALSE;

-- ============================================
-- RLS POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.online_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.online_class_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.online_class_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.online_class_notifications ENABLE ROW LEVEL SECURITY;

-- Policies for online_classes table
CREATE POLICY "Online classes: same school access" ON public.online_classes
  FOR ALL USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'super_admin'
    OR school_id = (SELECT school_id FROM public.users WHERE id = auth.uid())
  )
  WITH CHECK (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'super_admin'
    OR school_id = (SELECT school_id FROM public.users WHERE id = auth.uid())
  );

-- Policies for online_class_sections table
CREATE POLICY "Online class sections: same school access" ON public.online_class_sections
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.online_classes oc
      JOIN public.users u ON u.id = auth.uid()
      WHERE oc.id = online_class_sections.online_class_id
      AND (u.role = 'super_admin' OR oc.school_id = u.school_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.online_classes oc
      JOIN public.users u ON u.id = auth.uid()
      WHERE oc.id = online_class_sections.online_class_id
      AND (u.role = 'super_admin' OR oc.school_id = u.school_id)
    )
  );

-- Policies for online_class_participants table
CREATE POLICY "Online class participants: school and parents access" ON public.online_class_participants
  FOR ALL USING (
    -- Super admin can see all
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'super_admin'
    OR
    -- School staff can see their school's classes
    EXISTS (
      SELECT 1 FROM public.online_classes oc
      JOIN public.users u ON u.id = auth.uid()
      WHERE oc.id = online_class_participants.online_class_id
      AND oc.school_id = u.school_id
      AND u.role IN ('school_admin', 'teacher')
    )
    OR
    -- Parents can see their own student's classes
    (auth.uid() = parent_id)
  )
  WITH CHECK (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'super_admin'
    OR
    EXISTS (
      SELECT 1 FROM public.online_classes oc
      JOIN public.users u ON u.id = auth.uid()
      WHERE oc.id = online_class_participants.online_class_id
      AND oc.school_id = u.school_id
      AND u.role IN ('school_admin', 'teacher')
    )
    OR
    (auth.uid() = parent_id)
  );

-- Policies for online_class_notifications table
CREATE POLICY "Online class notifications: recipient access" ON public.online_class_notifications
  FOR ALL USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'super_admin'
    OR auth.uid() = recipient_id
    OR EXISTS (
      SELECT 1 FROM public.online_classes oc
      JOIN public.users u ON u.id = auth.uid()
      WHERE oc.id = online_class_notifications.online_class_id
      AND oc.school_id = u.school_id
      AND u.role IN ('school_admin', 'teacher')
    )
  )
  WITH CHECK (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'super_admin'
    OR auth.uid() = recipient_id
    OR EXISTS (
      SELECT 1 FROM public.online_classes oc
      JOIN public.users u ON u.id = auth.uid()
      WHERE oc.id = online_class_notifications.online_class_id
      AND oc.school_id = u.school_id
      AND u.role IN ('school_admin', 'teacher')
    )
  );

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to automatically create participants when sections are added to online class
CREATE OR REPLACE FUNCTION create_online_class_participants()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert participants (students and their parents) from the selected section
  INSERT INTO public.online_class_participants (online_class_id, student_id, parent_id)
  SELECT 
    NEW.online_class_id,
    s.id as student_id,
    sp.parent_id
  FROM public.students s
  LEFT JOIN public.student_parents sp ON s.id = sp.student_id
  JOIN public.sections sec ON sec.id = NEW.section_id
  WHERE s.grade::text = sec.grade::text 
  AND s.section = sec.section
  AND s.school_id = (SELECT school_id FROM public.online_classes WHERE id = NEW.online_class_id)
  ON CONFLICT (online_class_id, student_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create participants when sections are added
CREATE TRIGGER trigger_create_online_class_participants
  AFTER INSERT ON public.online_class_sections
  FOR EACH ROW
  EXECUTE FUNCTION create_online_class_participants();

-- Function to schedule notifications when online class is created
CREATE OR REPLACE FUNCTION schedule_online_class_notifications()
RETURNS TRIGGER AS $$
DECLARE
  class_datetime TIMESTAMPTZ;
  reminder_15min TIMESTAMPTZ;
BEGIN
  -- Calculate the class datetime and reminder times
  class_datetime := (NEW.scheduled_date + NEW.start_time)::TIMESTAMPTZ;
  reminder_15min := class_datetime - INTERVAL '15 minutes';
  
  -- Schedule 15-minute reminder for teacher
  INSERT INTO public.online_class_notifications (
    online_class_id, recipient_id, recipient_type, notification_type, 
    message, scheduled_for
  ) VALUES (
    NEW.id, NEW.teacher_id, 'teacher', 'reminder_15min',
    'Your online class "' || NEW.title || '" starts in 15 minutes. Meeting link: ' || NEW.meeting_link,
    reminder_15min
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to schedule notifications when online class is created
CREATE TRIGGER trigger_schedule_online_class_notifications
  AFTER INSERT ON public.online_classes
  FOR EACH ROW
  EXECUTE FUNCTION schedule_online_class_notifications();

-- Function to schedule parent notifications when participants are added
CREATE OR REPLACE FUNCTION schedule_parent_notifications()
RETURNS TRIGGER AS $$
DECLARE
  class_info RECORD;
  class_datetime TIMESTAMPTZ;
  reminder_15min TIMESTAMPTZ;
BEGIN
  -- Get class information
  SELECT oc.*, s.full_name as student_name 
  INTO class_info 
  FROM public.online_classes oc
  JOIN public.students s ON s.id = NEW.student_id
  WHERE oc.id = NEW.online_class_id;
  
  -- Only schedule notifications if parent exists
  IF NEW.parent_id IS NOT NULL THEN
    class_datetime := (class_info.scheduled_date + class_info.start_time)::TIMESTAMPTZ;
    reminder_15min := class_datetime - INTERVAL '15 minutes';
    
    -- Schedule 15-minute reminder for parent
    INSERT INTO public.online_class_notifications (
      online_class_id, recipient_id, recipient_type, notification_type, 
      message, scheduled_for
    ) VALUES (
      NEW.online_class_id, NEW.parent_id, 'parent', 'reminder_15min',
      'Online class "' || class_info.title || '" for ' || class_info.student_name || ' starts in 15 minutes. Meeting link: ' || class_info.meeting_link,
      reminder_15min
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to schedule parent notifications when participants are added
CREATE TRIGGER trigger_schedule_parent_notifications
  AFTER INSERT ON public.online_class_participants
  FOR EACH ROW
  EXECUTE FUNCTION schedule_parent_notifications(); 