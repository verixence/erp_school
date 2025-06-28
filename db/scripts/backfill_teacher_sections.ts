#!/usr/bin/env ts-node

const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: '../web/.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function backfillTeacherSections() {
  console.log('🔄 Starting teacher-section relationship backfill...');

  try {
    // Step 1: Ensure timetables data is properly linked to sections
    console.log('1. Updating section class_teacher from timetables...');
    
    // Get all timetable entries grouped by section
    const { data: timetableData, error: timetableError } = await supabase
      .from('timetables')
      .select('section, teacher_id, school_id')
      .order('section', { ascending: true });

    if (timetableError) {
      throw timetableError;
    }

    // Group by section and count teachers
    const sectionTeachers = new Map<string, { teachers: string[], school_id: string }>();
    
    for (const row of timetableData || []) {
      const key = `${row.school_id}:${row.section}`;
      if (!sectionTeachers.has(key)) {
        sectionTeachers.set(key, { teachers: [], school_id: row.school_id });
      }
      const existing = sectionTeachers.get(key)!;
      if (!existing.teachers.includes(row.teacher_id)) {
        existing.teachers.push(row.teacher_id);
      }
    }

    console.log(`Found ${sectionTeachers.size} unique sections with teachers`);

    // Step 2: Update sections table with primary class teacher
    for (const [sectionKey, data] of sectionTeachers) {
      const [school_id, sectionName] = sectionKey.split(':');
      const [gradeStr, sectionLetter] = sectionName.replace('Grade ', '').split(' ');
      const grade = parseInt(gradeStr);

      // Find the section record
      const { data: sectionRecord, error: sectionError } = await supabase
        .from('sections')
        .select('id, class_teacher')
        .eq('school_id', school_id)
        .eq('grade', grade)
        .eq('section', sectionLetter)
        .single();

      if (sectionError || !sectionRecord) {
        console.warn(`⚠️  Section not found: ${sectionName} in school ${school_id}`);
        continue;
      }

      // If no class teacher assigned, assign the first teacher
      if (!sectionRecord.class_teacher && data.teachers.length > 0) {
        console.log(`📝 Assigning ${data.teachers[0]} as class teacher for ${sectionName}`);
        
        const { error: updateError } = await supabase
          .from('sections')
          .update({ class_teacher: data.teachers[0] })
          .eq('id', sectionRecord.id);

        if (updateError) {
          console.error(`❌ Failed to update section ${sectionName}:`, updateError);
        }
      }
    }

    // Step 3: Ensure all section_teachers relationships exist
    console.log('2. Backfilling section_teachers junction table...');

    // Get all teacher-section relationships from periods table
    const { data: periodsData, error: periodsError } = await supabase
      .from('periods')
      .select('section_id, teacher_id')
      .not('teacher_id', 'is', null);

    if (periodsError) {
      throw periodsError;
    }

    // Insert unique relationships
    const uniqueRelationships = new Set<string>();
    const relationshipsToInsert = [];

    for (const period of periodsData || []) {
      const key = `${period.section_id}:${period.teacher_id}`;
      if (!uniqueRelationships.has(key)) {
        uniqueRelationships.add(key);
        relationshipsToInsert.push({
          section_id: period.section_id,
          teacher_id: period.teacher_id
        });
      }
    }

    if (relationshipsToInsert.length > 0) {
      console.log(`📝 Inserting ${relationshipsToInsert.length} section-teacher relationships...`);
      
      const { error: insertError } = await supabase
        .from('section_teachers')
        .upsert(relationshipsToInsert, {
          onConflict: 'section_id,teacher_id',
          ignoreDuplicates: true
        });

      if (insertError) {
        throw insertError;
      }
    }

    // Step 4: Add relationships from timetables table
    console.log('3. Adding relationships from timetables table...');

    for (const [sectionKey, data] of sectionTeachers) {
      const [school_id, sectionName] = sectionKey.split(':');
      const [gradeStr, sectionLetter] = sectionName.replace('Grade ', '').split(' ');
      const grade = parseInt(gradeStr);

      // Find the section record
      const { data: sectionRecord } = await supabase
        .from('sections')
        .select('id')
        .eq('school_id', school_id)
        .eq('grade', grade)
        .eq('section', sectionLetter)
        .single();

      if (sectionRecord) {
        const relationshipsForSection = data.teachers.map(teacher_id => ({
          section_id: sectionRecord.id,
          teacher_id
        }));

        const { error: insertError } = await supabase
          .from('section_teachers')
          .upsert(relationshipsForSection, {
            onConflict: 'section_id,teacher_id',
            ignoreDuplicates: true
          });

        if (insertError) {
          console.error(`❌ Failed to insert relationships for ${sectionName}:`, insertError);
        }
      }
    }

    // Step 5: Verification
    console.log('4. Verification...');

    const { data: verificationData, error: verifyError } = await supabase
      .from('section_teachers')
      .select(`
        section_id,
        teacher_id,
        sections!inner(grade, section, school_id),
        users!inner(first_name, last_name, email)
      `);

    if (verifyError) {
      throw verifyError;
    }

    console.log(`✅ Successfully created ${verificationData?.length || 0} section-teacher relationships`);

    // Group by teacher for summary
    const teacherSections = new Map<string, string[]>();
    for (const rel of verificationData || []) {
      const user = (rel as any).users;
      const section = (rel as any).sections;
      const teacherKey = `${user.first_name} ${user.last_name} (${user.email})`;
      if (!teacherSections.has(teacherKey)) {
        teacherSections.set(teacherKey, []);
      }
      teacherSections.get(teacherKey)!.push(`Grade ${section.grade} ${section.section}`);
    }

    console.log('\n📊 Teacher Assignment Summary:');
    for (const [teacher, sections] of teacherSections) {
      console.log(`  ${teacher}: ${sections.join(', ')}`);
    }

    console.log('\n🎉 Backfill completed successfully!');

  } catch (error) {
    console.error('❌ Backfill failed:', error);
    process.exit(1);
  }
}

// Run the backfill
backfillTeacherSections(); 