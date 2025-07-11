-- 🏛️ Template Catalogue Migration
-- Enables Super Admins to create public templates that School Admins can clone and customize

-- Add new columns to report_templates
ALTER TABLE public.report_templates
  ADD COLUMN is_public         BOOLEAN   DEFAULT false,
  ADD COLUMN created_by        UUID      DEFAULT auth.uid(),
  ADD COLUMN editable_by_school BOOLEAN  DEFAULT false,
  ADD COLUMN origin_template_id UUID     REFERENCES public.report_templates(id),
  ADD COLUMN preview_image_url  TEXT,
  ADD COLUMN usage_count       INTEGER   DEFAULT 0,
  ADD COLUMN last_used_at      TIMESTAMPTZ;

-- Create index for fast public template queries
CREATE INDEX IF NOT EXISTS idx_report_templates_public 
  ON public.report_templates (is_public) 
  WHERE is_public = true;

CREATE INDEX IF NOT EXISTS idx_report_templates_created_by 
  ON public.report_templates (created_by);

CREATE INDEX IF NOT EXISTS idx_report_templates_origin 
  ON public.report_templates (origin_template_id);

-- Update RLS policies
DROP POLICY IF EXISTS "Users can view templates for their school" ON public.report_templates;
DROP POLICY IF EXISTS "Users can manage templates for their school" ON public.report_templates;

-- New comprehensive RLS policy for template visibility
CREATE POLICY "Template visibility policy"
  ON public.report_templates
  FOR SELECT
  USING (
    -- Super admins can see everything
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.role = 'super_admin'
    )
    OR
    -- School admins can see public templates
    is_public = true
    OR
    -- School admins can see their own school's templates
    (
      school_id = (
        SELECT users.school_id 
        FROM public.users 
        WHERE users.id = auth.uid()
      )
    )
  );

-- Policy for creating templates
CREATE POLICY "Template creation policy"
  ON public.report_templates
  FOR INSERT
  WITH CHECK (
    -- Super admins can create any template
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.role = 'super_admin'
    )
    OR
    -- School admins can only create templates for their school (non-public)
    (
      is_public = false
      AND school_id = (
        SELECT users.school_id 
        FROM public.users 
        WHERE users.id = auth.uid()
      )
    )
  );

-- Policy for updating templates
CREATE POLICY "Template update policy"
  ON public.report_templates
  FOR UPDATE
  USING (
    -- Super admins can update any template they created
    (
      EXISTS (
        SELECT 1 FROM public.users 
        WHERE users.id = auth.uid() 
        AND users.role = 'super_admin'
      )
      AND created_by = auth.uid()
    )
    OR
    -- School admins can only update their school's templates (not public ones)
    (
      is_public = false
      AND school_id = (
        SELECT users.school_id 
        FROM public.users 
        WHERE users.id = auth.uid()
      )
      AND (editable_by_school = true OR origin_template_id IS NOT NULL)
    )
  );

-- Policy for deleting templates
CREATE POLICY "Template deletion policy"
  ON public.report_templates
  FOR DELETE
  USING (
    -- Super admins can delete templates they created
    (
      EXISTS (
        SELECT 1 FROM public.users 
        WHERE users.id = auth.uid() 
        AND users.role = 'super_admin'
      )
      AND created_by = auth.uid()
    )
    OR
    -- School admins can delete their cloned templates
    (
      school_id = (
        SELECT users.school_id 
        FROM public.users 
        WHERE users.id = auth.uid()
      )
      AND origin_template_id IS NOT NULL
    )
  );

-- Function to clone a template for a school
CREATE OR REPLACE FUNCTION clone_template_for_school(
  template_id UUID,
  target_school_id UUID
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_template_id UUID;
  source_template RECORD;
BEGIN
  -- Check if user has permission to clone
  IF NOT EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND (
      role = 'super_admin' 
      OR school_id = target_school_id
    )
  ) THEN
    RAISE EXCEPTION 'Insufficient permissions to clone template';
  END IF;

  -- Get source template
  SELECT * INTO source_template
  FROM public.report_templates
  WHERE id = template_id
  AND (is_public = true OR school_id = target_school_id);

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Template not found or not accessible';
  END IF;

  -- Create cloned template
  INSERT INTO public.report_templates (
    school_id,
    name,
    board,
    class_range,
    grade_rules,
    i18n_bundle,
    template_html,
    template_css,
    meta,
    is_default,
    is_public,
    created_by,
    editable_by_school,
    origin_template_id
  ) VALUES (
    target_school_id,
    source_template.name || ' (Copy)',
    source_template.board,
    source_template.class_range,
    source_template.grade_rules,
    source_template.i18n_bundle,
    source_template.template_html,
    source_template.template_css,
    COALESCE(source_template.meta, '{}'::jsonb) || jsonb_build_object(
      'cloned_from', template_id,
      'cloned_at', NOW()
    ),
    false, -- Not default by default
    false, -- Not public
    auth.uid(),
    true,  -- Editable by school
    template_id
  ) RETURNING id INTO new_template_id;

  -- Update usage count
  UPDATE public.report_templates
  SET 
    usage_count = COALESCE(usage_count, 0) + 1,
    last_used_at = NOW()
  WHERE id = template_id;

  RETURN new_template_id;
END;
$$;

-- Function to check if migrations are applied
CREATE OR REPLACE FUNCTION check_migrations()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if the new columns exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'report_templates' 
    AND column_name = 'is_public'
  ) THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$;

-- Insert some default public templates for demonstration
INSERT INTO public.report_templates (
  school_id,
  name,
  board,
  class_range,
  grade_rules,
  i18n_bundle,
  template_html,
  template_css,
  meta,
  is_public,
  created_by,
  editable_by_school
) VALUES 
(
  NULL, -- Public template
  'CBSE Standard Report Card',
  'CBSE',
  '1-12',
  '[
    {"grade": "A+", "min": 91, "max": 100, "color": "#22c55e"},
    {"grade": "A", "min": 81, "max": 90, "color": "#3b82f6"},
    {"grade": "B+", "min": 71, "max": 80, "color": "#8b5cf6"},
    {"grade": "B", "min": 61, "max": 70, "color": "#f59e0b"},
    {"grade": "C", "min": 51, "max": 60, "color": "#ef4444"},
    {"grade": "F", "min": 0, "max": 50, "color": "#dc2626"}
  ]'::jsonb,
  '{
    "en": {"student_name": "Student Name", "marks": "Marks", "grade": "Grade"},
    "hi": {"student_name": "छात्र का नाम", "marks": "अंक", "grade": "श्रेणी"}
  }'::jsonb,
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>CBSE Report Card</title>
</head>
<body class="font-sans bg-white">
  <div class="max-w-4xl mx-auto p-8">
    <!-- Header -->
    <div class="text-center border-b-2 border-blue-600 pb-6 mb-6">
      <div class="flex items-center justify-center space-x-4 mb-4">
        {{#if school.logo_url}}
        <img src="{{school.logo_url}}" alt="School Logo" class="w-16 h-16 object-contain">
        {{/if}}
        <div>
          <h1 class="text-2xl font-bold text-blue-800">{{school.name}}</h1>
          <p class="text-gray-600">{{school.address}}</p>
        </div>
      </div>
      <h2 class="text-xl font-semibold text-gray-800">Academic Report Card</h2>
      <p class="text-gray-600">Academic Year: {{exam.academic_year}}</p>
    </div>

    <!-- Student Info -->
    <div class="grid grid-cols-2 gap-6 mb-6">
      <div>
        <h3 class="text-lg font-semibold mb-3 text-gray-800">Student Information</h3>
        <div class="space-y-2">
          <p><span class="font-medium">Name:</span> {{student.full_name}}</p>
          <p><span class="font-medium">Admission No:</span> {{student.admission_no}}</p>
          <p><span class="font-medium">Class & Section:</span> {{student.section}}</p>
          <p><span class="font-medium">Roll No:</span> {{student.roll_no}}</p>
        </div>
      </div>
      <div class="text-right">
        {{#if student.photo_url}}
        <img src="{{student.photo_url}}" alt="Student Photo" class="w-24 h-24 object-cover border-2 border-gray-300 rounded ml-auto">
        {{/if}}
      </div>
    </div>

    <!-- Marks Table -->
    <div class="mb-6">
      <h3 class="text-lg font-semibold mb-3 text-gray-800">Academic Performance</h3>
      <table class="w-full border-collapse border border-gray-300">
        <thead>
          <tr class="bg-blue-600 text-white">
            <th class="border border-gray-300 px-4 py-2 text-left">Subject</th>
            <th class="border border-gray-300 px-4 py-2 text-center">Maximum Marks</th>
            <th class="border border-gray-300 px-4 py-2 text-center">Marks Obtained</th>
            <th class="border border-gray-300 px-4 py-2 text-center">Grade</th>
          </tr>
        </thead>
        <tbody>
          {{#each subjects}}
          <tr>
            <td class="border border-gray-300 px-4 py-2 font-medium">{{this.name}}</td>
            <td class="border border-gray-300 px-4 py-2 text-center">{{this.max_marks}}</td>
            <td class="border border-gray-300 px-4 py-2 text-center">{{this.obtained_marks}}</td>
            <td class="border border-gray-300 px-4 py-2 text-center">
              <span class="px-2 py-1 rounded text-white text-sm font-medium" style="background-color: {{getGradeColor this.grade}}">
                {{this.grade}}
              </span>
            </td>
          </tr>
          {{/each}}
        </tbody>
      </table>
    </div>

    <!-- Overall Performance -->
    <div class="grid grid-cols-3 gap-6 mb-6">
      <div class="bg-blue-50 p-4 rounded-lg text-center">
        <h4 class="font-semibold text-blue-800">Total Marks</h4>
        <p class="text-2xl font-bold text-blue-600">{{overall.total_obtained}}/{{overall.total_maximum}}</p>
      </div>
      <div class="bg-green-50 p-4 rounded-lg text-center">
        <h4 class="font-semibold text-green-800">Percentage</h4>
        <p class="text-2xl font-bold text-green-600">{{overall.percentage}}%</p>
      </div>
      <div class="bg-purple-50 p-4 rounded-lg text-center">
        <h4 class="font-semibold text-purple-800">Overall Grade</h4>
        <p class="text-2xl font-bold text-purple-600">{{overall.grade}}</p>
      </div>
    </div>

    <!-- Signatures -->
    <div class="grid grid-cols-3 gap-8 mt-12 pt-8 border-t border-gray-200">
      <div class="text-center">
        <div class="border-t border-gray-400 pt-2 mt-12">
          <p class="text-sm font-medium">Class Teacher</p>
        </div>
      </div>
      <div class="text-center">
        <div class="border-t border-gray-400 pt-2 mt-12">
          <p class="text-sm font-medium">Principal</p>
        </div>
      </div>
      <div class="text-center">
        <div class="border-t border-gray-400 pt-2 mt-12">
          <p class="text-sm font-medium">Parent Signature</p>
        </div>
      </div>
    </div>
  </div>
</body>
</html>',
  '.font-sans { font-family: Arial, sans-serif; }
.bg-white { background-color: white; }
.max-w-4xl { max-width: 56rem; }
.mx-auto { margin-left: auto; margin-right: auto; }
.p-8 { padding: 2rem; }
.text-center { text-align: center; }
.border-b-2 { border-bottom-width: 2px; }
.border-blue-600 { border-color: #2563eb; }
.pb-6 { padding-bottom: 1.5rem; }
.mb-6 { margin-bottom: 1.5rem; }
.mb-4 { margin-bottom: 1rem; }
.flex { display: flex; }
.items-center { align-items: center; }
.justify-center { justify-content: center; }
.space-x-4 > * + * { margin-left: 1rem; }
.w-16 { width: 4rem; }
.h-16 { height: 4rem; }
.object-contain { object-fit: contain; }
.text-2xl { font-size: 1.5rem; }
.font-bold { font-weight: 700; }
.text-blue-800 { color: #1e40af; }
.text-gray-600 { color: #4b5563; }
.text-xl { font-size: 1.25rem; }
.font-semibold { font-weight: 600; }
.text-gray-800 { color: #1f2937; }
.grid { display: grid; }
.grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.gap-6 { gap: 1.5rem; }
.gap-8 { gap: 2rem; }
.text-lg { font-size: 1.125rem; }
.mb-3 { margin-bottom: 0.75rem; }
.space-y-2 > * + * { margin-top: 0.5rem; }
.font-medium { font-weight: 500; }
.text-right { text-align: right; }
.w-24 { width: 6rem; }
.h-24 { height: 6rem; }
.object-cover { object-fit: cover; }
.border-2 { border-width: 2px; }
.border-gray-300 { border-color: #d1d5db; }
.rounded { border-radius: 0.25rem; }
.ml-auto { margin-left: auto; }
.w-full { width: 100%; }
.border-collapse { border-collapse: collapse; }
.border { border-width: 1px; }
.bg-blue-600 { background-color: #2563eb; }
.text-white { color: white; }
.px-4 { padding-left: 1rem; padding-right: 1rem; }
.py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
.text-left { text-align: left; }
.bg-blue-50 { background-color: #eff6ff; }
.bg-green-50 { background-color: #f0fdf4; }
.bg-purple-50 { background-color: #faf5ff; }
.p-4 { padding: 1rem; }
.rounded-lg { border-radius: 0.5rem; }
.text-blue-600 { color: #2563eb; }
.text-green-600 { color: #16a34a; }
.text-green-800 { color: #166534; }
.text-purple-600 { color: #9333ea; }
.text-purple-800 { color: #6b21a8; }
.px-2 { padding-left: 0.5rem; padding-right: 0.5rem; }
.py-1 { padding-top: 0.25rem; padding-bottom: 0.25rem; }
.text-sm { font-size: 0.875rem; }
.mt-12 { margin-top: 3rem; }
.pt-8 { padding-top: 2rem; }
.border-t { border-top-width: 1px; }
.border-gray-200 { border-color: #e5e7eb; }
.border-gray-400 { border-color: #9ca3af; }
.pt-2 { padding-top: 0.5rem; }',
  '{
    "theme": "cbse-classic",
    "paperSize": "A4",
    "orientation": "portrait",
    "showSchoolLogo": true,
    "showWatermark": false,
    "builder": "code",
    "version": "1.0",
    "customizable": ["colors", "logo", "grade_rules"]
  }'::jsonb,
  true,  -- is_public
  NULL,  -- created_by (will be set by default)
  true   -- editable_by_school
),
(
  NULL, -- Public template
  'SSC Progress Report',
  'State',
  '1-10',
  '[
    {"grade": "Outstanding", "min": 91, "max": 100, "color": "#059669"},
    {"grade": "Excellent", "min": 81, "max": 90, "color": "#0891b2"},
    {"grade": "Very Good", "min": 71, "max": 80, "color": "#7c3aed"},
    {"grade": "Good", "min": 61, "max": 70, "color": "#ea580c"},
    {"grade": "Satisfactory", "min": 35, "max": 60, "color": "#dc2626"},
    {"grade": "Needs Improvement", "min": 0, "max": 34, "color": "#991b1b"}
  ]'::jsonb,
  '{
    "en": {"student_name": "Student Name", "marks": "Marks", "grade": "Grade"},
    "mr": {"student_name": "विद्यार्थ्याचे नाव", "marks": "गुण", "grade": "श्रेणी"}
  }'::jsonb,
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>SSC Progress Report</title>
</head>
<body class="font-sans bg-gray-50">
  <div class="max-w-4xl mx-auto p-6 bg-white shadow-lg">
    <!-- Header with Bold Design -->
    <div class="bg-red-600 text-white p-6 rounded-t-lg">
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-4">
          {{#if school.logo_url}}
          <img src="{{school.logo_url}}" alt="School Logo" class="w-20 h-20 object-contain bg-white rounded-full p-2">
          {{/if}}
          <div>
            <h1 class="text-3xl font-bold">{{school.name}}</h1>
            <p class="text-red-100">{{school.address}}</p>
          </div>
        </div>
        <div class="text-right">
          <h2 class="text-2xl font-bold">PROGRESS REPORT</h2>
          <p class="text-red-100">Academic Year: {{exam.academic_year}}</p>
        </div>
      </div>
    </div>

    <!-- Student Details in Cards -->
    <div class="grid grid-cols-2 gap-6 p-6 bg-gray-50">
      <div class="bg-white p-4 rounded-lg shadow">
        <h3 class="text-lg font-bold text-red-700 mb-3 border-b border-red-200 pb-2">Student Details</h3>
        <div class="space-y-2 text-sm">
          <p><span class="font-semibold text-gray-700">Name:</span> <span class="text-gray-900">{{student.full_name}}</span></p>
          <p><span class="font-semibold text-gray-700">Admission No:</span> <span class="text-gray-900">{{student.admission_no}}</span></p>
          <p><span class="font-semibold text-gray-700">Class & Div:</span> <span class="text-gray-900">{{student.section}}</span></p>
          <p><span class="font-semibold text-gray-700">Roll No:</span> <span class="text-gray-900">{{student.roll_no}}</span></p>
          <p><span class="font-semibold text-gray-700">Date of Birth:</span> <span class="text-gray-900">{{formatDate student.date_of_birth}}</span></p>
        </div>
      </div>
      <div class="bg-white p-4 rounded-lg shadow text-center">
        {{#if student.photo_url}}
        <img src="{{student.photo_url}}" alt="Student Photo" class="w-32 h-32 object-cover border-4 border-red-600 rounded-lg mx-auto mb-2">
        {{else}}
        <div class="w-32 h-32 bg-gray-200 border-4 border-red-600 rounded-lg mx-auto mb-2 flex items-center justify-center">
          <span class="text-gray-500 text-sm">Photo</span>
        </div>
        {{/if}}
      </div>
    </div>

    <!-- Marks Table with Bold Styling -->
    <div class="p-6">
      <h3 class="text-xl font-bold text-red-700 mb-4">Academic Performance</h3>
      <table class="w-full border-2 border-red-600">
        <thead>
          <tr class="bg-red-600 text-white">
            <th class="border border-red-400 px-4 py-3 text-left font-bold">SUBJECT</th>
            <th class="border border-red-400 px-4 py-3 text-center font-bold">MAX. MARKS</th>
            <th class="border border-red-400 px-4 py-3 text-center font-bold">MARKS OBTAINED</th>
            <th class="border border-red-400 px-4 py-3 text-center font-bold">GRADE</th>
          </tr>
        </thead>
        <tbody>
          {{#each subjects}}
          <tr class="{{#if @even}}bg-red-50{{else}}bg-white{{/if}}">
            <td class="border border-red-300 px-4 py-3 font-semibold text-gray-800">{{this.name}}</td>
            <td class="border border-red-300 px-4 py-3 text-center font-medium">{{this.max_marks}}</td>
            <td class="border border-red-300 px-4 py-3 text-center font-medium">{{this.obtained_marks}}</td>
            <td class="border border-red-300 px-4 py-3 text-center">
              <span class="px-3 py-1 rounded-full text-white text-sm font-bold" style="background-color: {{getGradeColor this.grade}}">
                {{this.grade}}
              </span>
            </td>
          </tr>
          {{/each}}
        </tbody>
      </table>
    </div>

    <!-- Performance Summary -->
    <div class="grid grid-cols-4 gap-4 p-6 bg-gray-100">
      <div class="bg-white p-4 rounded-lg shadow text-center border-l-4 border-red-600">
        <h4 class="font-bold text-red-700 text-sm">TOTAL MARKS</h4>
        <p class="text-xl font-bold text-gray-800">{{overall.total_obtained}}</p>
        <p class="text-sm text-gray-600">out of {{overall.total_maximum}}</p>
      </div>
      <div class="bg-white p-4 rounded-lg shadow text-center border-l-4 border-green-600">
        <h4 class="font-bold text-green-700 text-sm">PERCENTAGE</h4>
        <p class="text-2xl font-bold text-green-600">{{overall.percentage}}%</p>
      </div>
      <div class="bg-white p-4 rounded-lg shadow text-center border-l-4 border-blue-600">
        <h4 class="font-bold text-blue-700 text-sm">OVERALL GRADE</h4>
        <p class="text-xl font-bold text-blue-600">{{overall.grade}}</p>
      </div>
      <div class="bg-white p-4 rounded-lg shadow text-center border-l-4 border-purple-600">
        <h4 class="font-bold text-purple-700 text-sm">RANK</h4>
        <p class="text-xl font-bold text-purple-600">{{#if overall.rank}}{{overall.rank}}{{else}}--{{/if}}</p>
      </div>
    </div>

    <!-- Signature Section -->
    <div class="grid grid-cols-3 gap-8 p-6 mt-6">
      <div class="text-center">
        <div class="h-16 border-b-2 border-gray-400 mb-2"></div>
        <p class="text-sm font-bold text-gray-700">CLASS TEACHER</p>
        <p class="text-xs text-gray-500">Date: ____________</p>
      </div>
      <div class="text-center">
        <div class="h-16 border-b-2 border-gray-400 mb-2"></div>
        <p class="text-sm font-bold text-gray-700">PRINCIPAL</p>
        <p class="text-xs text-gray-500">Date: ____________</p>
      </div>
      <div class="text-center">
        <div class="h-16 border-b-2 border-gray-400 mb-2"></div>
        <p class="text-sm font-bold text-gray-700">PARENT/GUARDIAN</p>
        <p class="text-xs text-gray-500">Date: ____________</p>
      </div>
    </div>
  </div>
</body>
</html>',
  '/* SSC Bold Theme Styles */
.font-sans { font-family: Arial, sans-serif; }
.bg-gray-50 { background-color: #f9fafb; }
.max-w-4xl { max-width: 56rem; }
.mx-auto { margin: 0 auto; }
.p-6 { padding: 1.5rem; }
.bg-white { background-color: white; }
.shadow-lg { box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); }
.bg-red-600 { background-color: #dc2626; }
.text-white { color: white; }
.rounded-t-lg { border-radius: 0.5rem 0.5rem 0 0; }
.flex { display: flex; }
.items-center { align-items: center; }
.justify-between { justify-content: space-between; }
.space-x-4 > * + * { margin-left: 1rem; }
.w-20 { width: 5rem; }
.h-20 { height: 5rem; }
.object-contain { object-fit: contain; }
.rounded-full { border-radius: 9999px; }
.p-2 { padding: 0.5rem; }
.text-3xl { font-size: 1.875rem; }
.font-bold { font-weight: 700; }
.text-red-100 { color: #fecaca; }
.text-right { text-align: right; }
.text-2xl { font-size: 1.5rem; }
.grid { display: grid; }
.grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.grid-cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
.gap-6 { gap: 1.5rem; }
.gap-4 { gap: 1rem; }
.gap-8 { gap: 2rem; }
.bg-gray-50 { background-color: #f9fafb; }
.p-4 { padding: 1rem; }
.rounded-lg { border-radius: 0.5rem; }
.shadow { box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1); }
.text-lg { font-size: 1.125rem; }
.text-red-700 { color: #b91c1c; }
.mb-3 { margin-bottom: 0.75rem; }
.border-b { border-bottom-width: 1px; }
.border-red-200 { border-color: #fecaca; }
.pb-2 { padding-bottom: 0.5rem; }
.space-y-2 > * + * { margin-top: 0.5rem; }
.text-sm { font-size: 0.875rem; }
.font-semibold { font-weight: 600; }
.text-gray-700 { color: #374151; }
.text-gray-900 { color: #111827; }
.text-center { text-align: center; }
.w-32 { width: 8rem; }
.h-32 { height: 8rem; }
.object-cover { object-fit: cover; }
.border-4 { border-width: 4px; }
.border-red-600 { border-color: #dc2626; }
.mb-2 { margin-bottom: 0.5rem; }
.bg-gray-200 { background-color: #e5e7eb; }
.text-gray-500 { color: #6b7280; }
.text-xl { font-size: 1.25rem; }
.mb-4 { margin-bottom: 1rem; }
.w-full { width: 100%; }
.border-2 { border-width: 2px; }
.border-red-400 { border-color: #f87171; }
.px-4 { padding-left: 1rem; padding-right: 1rem; }
.py-3 { padding-top: 0.75rem; padding-bottom: 0.75rem; }
.text-left { text-align: left; }
.border { border-width: 1px; }
.bg-red-50 { background-color: #fef2f2; }
.border-red-300 { border-color: #fca5a5; }
.text-gray-800 { color: #1f2937; }
.font-medium { font-weight: 500; }
.px-3 { padding-left: 0.75rem; padding-right: 0.75rem; }
.py-1 { padding-top: 0.25rem; padding-bottom: 0.25rem; }
.rounded-full { border-radius: 9999px; }
.bg-gray-100 { background-color: #f3f4f6; }
.border-l-4 { border-left-width: 4px; }
.border-green-600 { border-color: #16a34a; }
.text-green-700 { color: #15803d; }
.text-green-600 { color: #16a34a; }
.border-blue-600 { border-color: #2563eb; }
.text-blue-700 { color: #1d4ed8; }
.text-blue-600 { color: #2563eb; }
.border-purple-600 { border-color: #9333ea; }
.text-purple-700 { color: #7c2d12; }
.text-purple-600 { color: #9333ea; }
.text-gray-600 { color: #4b5563; }
.mt-6 { margin-top: 1.5rem; }
.h-16 { height: 4rem; }
.border-b-2 { border-bottom-width: 2px; }
.border-gray-400 { border-color: #9ca3af; }
.text-xs { font-size: 0.75rem; }',
  '{
    "theme": "ssc-bold",
    "paperSize": "A4",
    "orientation": "portrait",
    "showSchoolLogo": true,
    "showWatermark": false,
    "builder": "code",
    "version": "1.0",
    "customizable": ["colors", "logo", "grade_rules"]
  }'::jsonb,
  true,  -- is_public
  NULL,  -- created_by
  true   -- editable_by_school
);

-- Comments for clarity
COMMENT ON COLUMN public.report_templates.is_public IS 'Whether this template is visible to all schools in the catalogue';
COMMENT ON COLUMN public.report_templates.created_by IS 'User ID of the creator (typically super admin for public templates)';
COMMENT ON COLUMN public.report_templates.editable_by_school IS 'Whether schools can customize colors, logo, and basic settings';
COMMENT ON COLUMN public.report_templates.origin_template_id IS 'References the original template if this is a cloned copy';
COMMENT ON COLUMN public.report_templates.preview_image_url IS 'URL to preview thumbnail image for catalogue display';
COMMENT ON COLUMN public.report_templates.usage_count IS 'Number of times this template has been cloned or used';
COMMENT ON COLUMN public.report_templates.last_used_at IS 'Timestamp of last usage for analytics';

COMMENT ON FUNCTION clone_template_for_school(UUID, UUID) IS 'Clones a public template for a specific school with proper permissions';
COMMENT ON FUNCTION check_migrations() IS 'Verifies if the template catalogue migration has been applied'; 