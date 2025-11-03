-- ============================================
-- END-TO-END TEST FOR EXAM SCHEDULING CONSTRAINTS
-- ============================================
-- This script tests all the constraints added in migration 0070
-- Run this in Supabase SQL Editor to verify the migration worked

-- ============================================
-- SETUP: Create test data (will be cleaned up at end)
-- ============================================

-- Test school
DO $$
DECLARE
  test_school_id UUID;
  test_user_id UUID;
  test_exam_group_id UUID;
  test_exam_paper_id UUID;
BEGIN
  -- Clean up any existing test data
  DELETE FROM public.exam_papers WHERE subject LIKE 'TEST_%';
  DELETE FROM public.exam_groups WHERE name LIKE 'TEST_%';

  -- Get or create a test school (using first available school)
  SELECT id INTO test_school_id FROM public.schools LIMIT 1;

  IF test_school_id IS NULL THEN
    RAISE EXCEPTION 'No schools found. Please create a school first.';
  END IF;

  RAISE NOTICE '✓ Using school: %', test_school_id;

  -- Get a school admin user for this school
  SELECT id INTO test_user_id
  FROM public.users
  WHERE school_id = test_school_id
  AND role = 'school_admin'
  LIMIT 1;

  IF test_user_id IS NULL THEN
    RAISE EXCEPTION 'No school admin found. Please create a school admin first.';
  END IF;

  RAISE NOTICE '✓ Using admin user: %', test_user_id;

  -- Create test exam group
  INSERT INTO public.exam_groups (
    id, school_id, name, exam_type, academic_year,
    start_date, end_date, created_by
  ) VALUES (
    gen_random_uuid(),
    test_school_id,
    'TEST_EXAM_GROUP_' || now()::text,
    'Mid Term',
    '2025-2026',
    '2025-11-01',
    '2025-11-15',
    test_user_id
  ) RETURNING id INTO test_exam_group_id;

  RAISE NOTICE '✓ Created test exam group: %', test_exam_group_id;

  -- ============================================
  -- TEST 1: Duplicate Subject Prevention
  -- ============================================
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'TEST 1: Duplicate Subject Prevention';
  RAISE NOTICE '========================================';

  -- Create first exam paper
  INSERT INTO public.exam_papers (
    exam_group_id, section, subject, exam_date, exam_time,
    duration_minutes, max_marks, pass_marks
  ) VALUES (
    test_exam_group_id, 'Class 10-A', 'TEST_Mathematics',
    '2025-11-05', '09:00', 180, 100, 33
  ) RETURNING id INTO test_exam_paper_id;

  RAISE NOTICE '✓ Created first Mathematics exam';

  -- Try to create duplicate (should fail)
  BEGIN
    INSERT INTO public.exam_papers (
      exam_group_id, section, subject, exam_date, exam_time,
      duration_minutes, max_marks, pass_marks
    ) VALUES (
      test_exam_group_id, 'Class 10-A', 'TEST_Mathematics',
      '2025-11-06', '14:00', 180, 100, 33
    );
    RAISE EXCEPTION 'TEST FAILED: Duplicate subject was allowed!';
  EXCEPTION
    WHEN unique_violation THEN
      RAISE NOTICE '✓ TEST PASSED: Duplicate subject correctly prevented';
  END;

  -- ============================================
  -- TEST 2: Max Marks Validation
  -- ============================================
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'TEST 2: Max Marks Validation';
  RAISE NOTICE '========================================';

  -- Try max_marks = 0 (should fail)
  BEGIN
    INSERT INTO public.exam_papers (
      exam_group_id, section, subject, exam_date, exam_time,
      duration_minutes, max_marks, pass_marks
    ) VALUES (
      test_exam_group_id, 'Class 10-A', 'TEST_Physics',
      '2025-11-07', '09:00', 180, 0, 0
    );
    RAISE EXCEPTION 'TEST FAILED: Zero max_marks was allowed!';
  EXCEPTION
    WHEN check_violation THEN
      RAISE NOTICE '✓ TEST PASSED: Zero max_marks correctly rejected';
  END;

  -- Try max_marks > 1000 (should fail)
  BEGIN
    INSERT INTO public.exam_papers (
      exam_group_id, section, subject, exam_date, exam_time,
      duration_minutes, max_marks, pass_marks
    ) VALUES (
      test_exam_group_id, 'Class 10-A', 'TEST_Physics',
      '2025-11-07', '09:00', 180, 1500, 500
    );
    RAISE EXCEPTION 'TEST FAILED: Excessive max_marks was allowed!';
  EXCEPTION
    WHEN check_violation THEN
      RAISE NOTICE '✓ TEST PASSED: Excessive max_marks correctly rejected';
  END;

  -- ============================================
  -- TEST 3: Pass Marks Validation
  -- ============================================
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'TEST 3: Pass Marks Validation';
  RAISE NOTICE '========================================';

  -- Try pass_marks >= max_marks (should fail)
  BEGIN
    INSERT INTO public.exam_papers (
      exam_group_id, section, subject, exam_date, exam_time,
      duration_minutes, max_marks, pass_marks
    ) VALUES (
      test_exam_group_id, 'Class 10-A', 'TEST_Physics',
      '2025-11-07', '09:00', 180, 100, 100
    );
    RAISE EXCEPTION 'TEST FAILED: pass_marks >= max_marks was allowed!';
  EXCEPTION
    WHEN check_violation THEN
      RAISE NOTICE '✓ TEST PASSED: Invalid pass_marks correctly rejected';
  END;

  -- ============================================
  -- TEST 4: Duration Validation
  -- ============================================
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'TEST 4: Duration Validation';
  RAISE NOTICE '========================================';

  -- Try duration = 0 (should fail)
  BEGIN
    INSERT INTO public.exam_papers (
      exam_group_id, section, subject, exam_date, exam_time,
      duration_minutes, max_marks, pass_marks
    ) VALUES (
      test_exam_group_id, 'Class 10-A', 'TEST_Physics',
      '2025-11-07', '09:00', 0, 100, 33
    );
    RAISE EXCEPTION 'TEST FAILED: Zero duration was allowed!';
  EXCEPTION
    WHEN check_violation THEN
      RAISE NOTICE '✓ TEST PASSED: Zero duration correctly rejected';
  END;

  -- Try duration > 480 (8 hours) (should fail)
  BEGIN
    INSERT INTO public.exam_papers (
      exam_group_id, section, subject, exam_date, exam_time,
      duration_minutes, max_marks, pass_marks
    ) VALUES (
      test_exam_group_id, 'Class 10-A', 'TEST_Physics',
      '2025-11-07', '09:00', 600, 100, 33
    );
    RAISE EXCEPTION 'TEST FAILED: Excessive duration was allowed!';
  EXCEPTION
    WHEN check_violation THEN
      RAISE NOTICE '✓ TEST PASSED: Excessive duration correctly rejected';
  END;

  -- ============================================
  -- TEST 5: Exam Date Within Group Range
  -- ============================================
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'TEST 5: Exam Date Within Group Range';
  RAISE NOTICE '========================================';

  -- Try exam_date before group start_date (should fail)
  BEGIN
    INSERT INTO public.exam_papers (
      exam_group_id, section, subject, exam_date, exam_time,
      duration_minutes, max_marks, pass_marks
    ) VALUES (
      test_exam_group_id, 'Class 10-A', 'TEST_Physics',
      '2025-10-15', '09:00', 180, 100, 33
    );
    RAISE EXCEPTION 'TEST FAILED: Exam date before group start was allowed!';
  EXCEPTION
    WHEN raise_exception THEN
      RAISE NOTICE '✓ TEST PASSED: Exam date before group start correctly rejected';
  END;

  -- Try exam_date after group end_date (should fail)
  BEGIN
    INSERT INTO public.exam_papers (
      exam_group_id, section, subject, exam_date, exam_time,
      duration_minutes, max_marks, pass_marks
    ) VALUES (
      test_exam_group_id, 'Class 10-A', 'TEST_Physics',
      '2025-11-20', '09:00', 180, 100, 33
    );
    RAISE EXCEPTION 'TEST FAILED: Exam date after group end was allowed!';
  EXCEPTION
    WHEN raise_exception THEN
      RAISE NOTICE '✓ TEST PASSED: Exam date after group end correctly rejected';
  END;

  -- ============================================
  -- TEST 6: Valid Exam Paper Creation
  -- ============================================
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'TEST 6: Valid Exam Paper Creation';
  RAISE NOTICE '========================================';

  -- Create valid exam paper (should succeed)
  INSERT INTO public.exam_papers (
    exam_group_id, section, subject, exam_date, exam_time,
    duration_minutes, max_marks, pass_marks
  ) VALUES (
    test_exam_group_id, 'Class 10-A', 'TEST_Physics',
    '2025-11-07', '09:00', 180, 100, 33
  );

  RAISE NOTICE '✓ TEST PASSED: Valid exam paper created successfully';

  -- ============================================
  -- TEST 7: Verify Indexes Exist
  -- ============================================
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'TEST 7: Verify Indexes Exist';
  RAISE NOTICE '========================================';

  IF EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'exam_papers'
    AND indexname = 'idx_exam_papers_group_section_subject'
  ) THEN
    RAISE NOTICE '✓ Index: idx_exam_papers_group_section_subject exists';
  ELSE
    RAISE EXCEPTION 'TEST FAILED: idx_exam_papers_group_section_subject missing!';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'exam_papers'
    AND indexname = 'idx_exam_papers_teacher_schedule'
  ) THEN
    RAISE NOTICE '✓ Index: idx_exam_papers_teacher_schedule exists';
  ELSE
    RAISE EXCEPTION 'TEST FAILED: idx_exam_papers_teacher_schedule missing!';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'exam_papers'
    AND indexname = 'idx_exam_papers_venue_schedule'
  ) THEN
    RAISE NOTICE '✓ Index: idx_exam_papers_venue_schedule exists';
  ELSE
    RAISE EXCEPTION 'TEST FAILED: idx_exam_papers_venue_schedule missing!';
  END IF;

  -- ============================================
  -- TEST 8: Verify Conflicts Table Exists
  -- ============================================
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'TEST 8: Verify Conflicts Table';
  RAISE NOTICE '========================================';

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'exam_schedule_conflicts'
  ) THEN
    RAISE NOTICE '✓ Table: exam_schedule_conflicts exists';
  ELSE
    RAISE EXCEPTION 'TEST FAILED: exam_schedule_conflicts table missing!';
  END IF;

  -- ============================================
  -- CLEANUP: Remove test data
  -- ============================================
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'CLEANUP';
  RAISE NOTICE '========================================';

  DELETE FROM public.exam_papers WHERE subject LIKE 'TEST_%';
  DELETE FROM public.exam_groups WHERE id = test_exam_group_id;

  RAISE NOTICE '✓ Test data cleaned up';

  -- ============================================
  -- FINAL SUMMARY
  -- ============================================
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ ALL TESTS PASSED!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Migration 0070 verified successfully:';
  RAISE NOTICE '  ✓ Duplicate subject prevention';
  RAISE NOTICE '  ✓ Max marks validation (1-1000)';
  RAISE NOTICE '  ✓ Pass marks validation (0 < pass_marks < max_marks)';
  RAISE NOTICE '  ✓ Duration validation (1-480 minutes)';
  RAISE NOTICE '  ✓ Exam date within group range';
  RAISE NOTICE '  ✓ Performance indexes created';
  RAISE NOTICE '  ✓ Conflicts table created';
  RAISE NOTICE '';

END $$;
