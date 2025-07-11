-- Migration 0026: Enhanced Report Templates System
-- Adds board-aware, fully customizable report card engine

-- Enhanced Report Templates table (modify existing)
-- Add new columns to existing report_templates table
ALTER TABLE public.report_templates 
  ADD COLUMN IF NOT EXISTS board TEXT CHECK (board IN ('CBSE', 'ICSE', 'State', 'IB', 'IGCSE')) DEFAULT 'CBSE',
  ADD COLUMN IF NOT EXISTS grade_rules JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS i18n_bundle JSONB DEFAULT '{"en": {}}',
  ADD COLUMN IF NOT EXISTS template_html TEXT,
  ADD COLUMN IF NOT EXISTS template_css TEXT,
  ADD COLUMN IF NOT EXISTS meta JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS class_range TEXT DEFAULT '1-12';

-- Update existing templates with enhanced structure
UPDATE public.report_templates 
SET 
  grade_rules = jsonb_build_object(
    'gradeBands', jsonb_build_array(
      jsonb_build_object('min', 90, 'max', 100, 'grade', 'A+', 'gpa', 4.0, 'color', '#22c55e'),
      jsonb_build_object('min', 80, 'max', 89, 'grade', 'A', 'gpa', 3.7, 'color', '#3b82f6'),
      jsonb_build_object('min', 70, 'max', 79, 'grade', 'B+', 'gpa', 3.3, 'color', '#8b5cf6'),
      jsonb_build_object('min', 60, 'max', 69, 'grade', 'B', 'gpa', 3.0, 'color', '#f59e0b'),
      jsonb_build_object('min', 50, 'max', 59, 'grade', 'C', 'gpa', 2.0, 'color', '#ef4444'),
      jsonb_build_object('min', 0, 'max', 49, 'grade', 'F', 'gpa', 0.0, 'color', '#dc2626')
    ),
    'calculationType', 'percentage',
    'weights', jsonb_build_object(),
    'passMarks', 35
  ),
  i18n_bundle = jsonb_build_object(
    'en', jsonb_build_object(
      'reportTitle', 'Academic Report Card',
      'studentName', 'Student Name',
      'grade', 'Grade',
      'section', 'Section',
      'rollNo', 'Roll Number',
      'totalMarks', 'Total Marks',
      'obtainedMarks', 'Obtained Marks',
      'percentage', 'Percentage',
      'rank', 'Rank',
      'remarks', 'Remarks',
      'principalSignature', 'Principal',
      'classTeacherSignature', 'Class Teacher',
      'parentSignature', 'Parent/Guardian'
    ),
    'hi', jsonb_build_object(
      'reportTitle', 'शैक्षणिक रिपोर्ट कार्ड',
      'studentName', 'छात्र का नाम',
      'grade', 'कक्षा',
      'section', 'शाखा',
      'rollNo', 'रोल नंबर',
      'totalMarks', 'कुल अंक',
      'obtainedMarks', 'प्राप्त अंक',
      'percentage', 'प्रतिशत',
      'rank', 'रैंक',
      'remarks', 'टिप्पणी',
      'principalSignature', 'प्राचार्य',
      'classTeacherSignature', 'कक्षा शिक्षक',
      'parentSignature', 'अभिभावक'
    )
  ),
  meta = jsonb_build_object(
    'paperSize', 'A4',
    'orientation', 'portrait',
    'margins', jsonb_build_object('top', 20, 'right', 20, 'bottom', 20, 'left', 20),
    'showWatermark', true,
    'showSchoolLogo', true,
    'version', '1.0'
  ),
  template_html = '<!DOCTYPE html>
<html lang="{{lang}}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{i18n.reportTitle}} - {{student.name}}</title>
  <style>{{{css}}}</style>
</head>
<body>
  <div class="report-card">
    <!-- Header -->
    <div class="header">
      {{#if school.logo_url}}
        <img src="{{school.logo_url}}" alt="School Logo" class="school-logo">
      {{/if}}
      <div class="school-info">
        <h1 class="school-name">{{school.name}}</h1>
        <p class="school-address">{{school.address}}</p>
        <h2 class="report-title">{{i18n.reportTitle}}</h2>
      </div>
    </div>

    <!-- Student Information -->
    <div class="student-info">
      <div class="info-grid">
        <div class="info-item">
          <label>{{i18n.studentName}}:</label>
          <span>{{student.name}}</span>
        </div>
        <div class="info-item">
          <label>{{i18n.grade}}:</label>
          <span>{{student.grade}}</span>
        </div>
        <div class="info-item">
          <label>{{i18n.section}}:</label>
          <span>{{student.section}}</span>
        </div>
        <div class="info-item">
          <label>{{i18n.rollNo}}:</label>
          <span>{{student.rollNo}}</span>
        </div>
      </div>
    </div>

    <!-- Marks Table -->
    <div class="marks-section">
      <table class="marks-table">
        <thead>
          <tr>
            <th>Subject</th>
            <th>Max Marks</th>
            <th>Obtained</th>
            <th>Grade</th>
          </tr>
        </thead>
        <tbody>
          {{#each subjects}}
          <tr>
            <td>{{this.name}}</td>
            <td>{{this.maxMarks}}</td>
            <td>{{this.obtained}}</td>
            <td class="grade-{{this.gradeClass}}">{{this.grade}}</td>
          </tr>
          {{/each}}
        </tbody>
      </table>
    </div>

    <!-- Summary -->
    <div class="summary">
      <div class="summary-grid">
        <div class="summary-item">
          <label>{{i18n.totalMarks}}:</label>
          <span>{{summary.totalMarks}}</span>
        </div>
        <div class="summary-item">
          <label>{{i18n.obtainedMarks}}:</label>
          <span>{{summary.obtainedMarks}}</span>
        </div>
        <div class="summary-item">
          <label>{{i18n.percentage}}:</label>
          <span>{{summary.percentage}}%</span>
        </div>
        <div class="summary-item">
          <label>{{i18n.rank}}:</label>
          <span>{{summary.rank}}</span>
        </div>
      </div>
      <div class="overall-grade">
        <span class="grade-label">Overall Grade:</span>
        <span class="grade-value grade-{{summary.gradeClass}}">{{summary.grade}}</span>
      </div>
    </div>

    <!-- Signatures -->
    <div class="signatures">
      <div class="signature">
        <div class="signature-line"></div>
        <label>{{i18n.classTeacherSignature}}</label>
      </div>
      <div class="signature">
        <div class="signature-line"></div>
        <label>{{i18n.principalSignature}}</label>
      </div>
      <div class="signature">
        <div class="signature-line"></div>
        <label>{{i18n.parentSignature}}</label>
      </div>
    </div>
  </div>
</body>
</html>',
  template_css = '@page {
  size: A4;
  margin: 20mm;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: "Arial", sans-serif;
  line-height: 1.4;
  color: #333;
  background: white;
}

.report-card {
  max-width: 210mm;
  margin: 0 auto;
  background: white;
  padding: 20px;
}

/* Header */
.header {
  display: flex;
  align-items: center;
  margin-bottom: 30px;
  border-bottom: 3px solid #1f2937;
  padding-bottom: 20px;
}

.school-logo {
  width: 80px;
  height: 80px;
  object-fit: contain;
  margin-right: 20px;
}

.school-info {
  flex: 1;
  text-align: center;
}

.school-name {
  font-size: 28px;
  font-weight: bold;
  color: #1f2937;
  margin-bottom: 5px;
}

.school-address {
  font-size: 14px;
  color: #6b7280;
  margin-bottom: 15px;
}

.report-title {
  font-size: 20px;
  color: #374151;
  font-weight: 600;
}

/* Student Information */
.student-info {
  background: #f8fafc;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 25px;
}

.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
}

.info-item {
  display: flex;
  align-items: center;
}

.info-item label {
  font-weight: 600;
  color: #374151;
  margin-right: 10px;
  min-width: 100px;
}

.info-item span {
  color: #1f2937;
}

/* Marks Table */
.marks-section {
  margin-bottom: 25px;
}

.marks-table {
  width: 100%;
  border-collapse: collapse;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.marks-table th,
.marks-table td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid #e5e7eb;
}

.marks-table th {
  background: #1f2937;
  color: white;
  font-weight: 600;
}

.marks-table tbody tr:hover {
  background: #f9fafb;
}

/* Grade Colors */
.grade-A\\+ , .grade-A {
  background: #dcfce7;
  color: #166534;
  padding: 4px 8px;
  border-radius: 4px;
  font-weight: 600;
}

.grade-B\\+ , .grade-B {
  background: #dbeafe;
  color: #1d4ed8;
  padding: 4px 8px;
  border-radius: 4px;
  font-weight: 600;
}

.grade-C {
  background: #fef3c7;
  color: #d97706;
  padding: 4px 8px;
  border-radius: 4px;
  font-weight: 600;
}

.grade-F {
  background: #fecaca;
  color: #dc2626;
  padding: 4px 8px;
  border-radius: 4px;
  font-weight: 600;
}

/* Summary */
.summary {
  background: #f1f5f9;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 30px;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 15px;
  margin-bottom: 20px;
}

.summary-item {
  text-align: center;
  padding: 10px;
  background: white;
  border-radius: 6px;
}

.summary-item label {
  display: block;
  font-size: 12px;
  color: #6b7280;
  margin-bottom: 5px;
}

.summary-item span {
  font-size: 18px;
  font-weight: 700;
  color: #1f2937;
}

.overall-grade {
  text-align: center;
  padding: 15px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 8px;
}

.grade-label {
  font-size: 16px;
  margin-right: 10px;
}

.grade-value {
  font-size: 32px;
  font-weight: bold;
}

/* Signatures */
.signatures {
  display: flex;
  justify-content: space-around;
  margin-top: 40px;
  padding-top: 20px;
}

.signature {
  text-align: center;
  width: 150px;
}

.signature-line {
  height: 1px;
  background: #374151;
  margin-bottom: 40px;
}

.signature label {
  font-size: 12px;
  color: #6b7280;
}

/* Print Styles */
@media print {
  body {
    margin: 0;
    padding: 0;
  }
  
  .report-card {
    box-shadow: none;
    margin: 0;
    max-width: none;
  }
}'
WHERE name = 'Standard Report Card';

-- Create template categories lookup table
CREATE TABLE IF NOT EXISTS public.template_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  board TEXT CHECK (board IN ('CBSE', 'ICSE', 'State', 'IB', 'IGCSE')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default template categories
INSERT INTO public.template_categories (name, description, board) VALUES
  ('CBSE Primary', 'CBSE format for classes 1-5', 'CBSE'),
  ('CBSE Secondary', 'CBSE format for classes 6-10', 'CBSE'),
  ('CBSE Senior Secondary', 'CBSE format for classes 11-12', 'CBSE'),
  ('ICSE Primary', 'ICSE format for classes 1-5', 'ICSE'),
  ('ICSE Secondary', 'ICSE format for classes 6-10', 'ICSE'),
  ('State Board Primary', 'State board format for classes 1-5', 'State'),
  ('State Board Secondary', 'State board format for classes 6-10', 'State'),
  ('Kindergarten', 'Special format for KG classes', 'CBSE')
ON CONFLICT DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_report_templates_board ON public.report_templates(board);
CREATE INDEX IF NOT EXISTS idx_report_templates_class_range ON public.report_templates(class_range);
CREATE INDEX IF NOT EXISTS idx_template_categories_board ON public.template_categories(board);

-- Enhanced report_cards table (add computed fields)
ALTER TABLE public.report_cards 
  ADD COLUMN IF NOT EXISTS marks JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS computed JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en';

-- Function to calculate grades based on template rules
CREATE OR REPLACE FUNCTION calculate_grade_from_percentage(
  percentage NUMERIC,
  grade_rules JSONB
) RETURNS JSONB
LANGUAGE plpgsql IMMUTABLE
AS $$
DECLARE
  grade_bands JSONB;
  band JSONB;
  result JSONB;
BEGIN
  grade_bands := grade_rules->'gradeBands';
  
  -- Default grade
  result := jsonb_build_object(
    'grade', 'F',
    'gpa', 0.0,
    'color', '#dc2626'
  );
  
  -- Find appropriate grade band
  FOR band IN SELECT jsonb_array_elements(grade_bands)
  LOOP
    IF percentage >= (band->>'min')::numeric AND percentage <= (band->>'max')::numeric THEN
      result := jsonb_build_object(
        'grade', band->>'grade',
        'gpa', (band->>'gpa')::numeric,
        'color', band->>'color'
      );
      EXIT;
    END IF;
  END LOOP;
  
  RETURN result;
END;
$$;

-- Function to generate report card with calculations
CREATE OR REPLACE FUNCTION generate_report_card_data(
  p_report_card_id UUID
) RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  report_record RECORD;
  template_record RECORD;
  marks_data JSONB;
  computed_data JSONB;
  total_marks NUMERIC := 0;
  obtained_marks NUMERIC := 0;
  percentage NUMERIC;
  grade_result JSONB;
BEGIN
  -- Get report card and template
  SELECT rc.*, rt.grade_rules, rt.i18n_bundle
  INTO report_record
  FROM public.report_cards rc
  LEFT JOIN public.report_templates rt ON rc.template_id = rt.id
  WHERE rc.id = p_report_card_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Report card not found';
  END IF;
  
  -- Get marks for this student and exam group
  SELECT jsonb_agg(
    jsonb_build_object(
      'subject', ep.subject,
      'maxMarks', ep.max_marks,
      'obtained', COALESCE(m.marks_obtained, 0),
      'isAbsent', COALESCE(m.is_absent, false)
    )
  ) INTO marks_data
  FROM public.exam_papers ep
  LEFT JOIN public.marks m ON ep.id = m.exam_paper_id AND m.student_id = report_record.student_id
  WHERE ep.exam_group_id = report_record.exam_group_id;
  
  -- Calculate totals
  SELECT 
    SUM((mark_obj->>'maxMarks')::numeric),
    SUM((mark_obj->>'obtained')::numeric)
  INTO total_marks, obtained_marks
  FROM jsonb_array_elements(marks_data) AS mark_obj;
  
  -- Calculate percentage
  percentage := CASE 
    WHEN total_marks > 0 THEN ROUND((obtained_marks / total_marks * 100)::numeric, 2)
    ELSE 0
  END;
  
  -- Get grade based on percentage
  grade_result := calculate_grade_from_percentage(percentage, report_record.grade_rules);
  
  -- Build computed data
  computed_data := jsonb_build_object(
    'totalMarks', total_marks,
    'obtainedMarks', obtained_marks,
    'percentage', percentage,
    'grade', grade_result->>'grade',
    'gpa', (grade_result->>'gpa')::numeric,
    'gradeColor', grade_result->>'color',
    'calculatedAt', NOW()
  );
  
  -- Update report card
  UPDATE public.report_cards 
  SET 
    marks = marks_data,
    computed = computed_data,
    updated_at = NOW()
  WHERE id = p_report_card_id;
END;
$$;

-- Update existing report cards with computed data
DO $$
DECLARE
  report_id UUID;
BEGIN
  FOR report_id IN 
    SELECT id FROM public.report_cards WHERE computed = '{}'::jsonb OR computed IS NULL
  LOOP
    PERFORM generate_report_card_data(report_id);
  END LOOP;
END;
$$; 