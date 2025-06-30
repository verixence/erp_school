import { createClient } from "@supabase/supabase-js";
import "dotenv/config";
import { randomUUID } from 'crypto';

const supabase = createClient(
  process.env.SUPA_URL!,
  process.env.SUPA_SERVICE_KEY!
);

async function main() {
  console.log("🌱 Seeding database...");

  try {
    // Create a demo school
    const schoolId = randomUUID();
    console.log('📚 Creating demo school...');
    const { error: schoolError } = await supabase
      .from('schools')
      .insert({
        id: schoolId,
        name: 'Sunrise International School',
        address: '123 Education Street, Knowledge City',
        phone: '+1-555-0123',
        email: 'admin@sunriseschool.edu',
        subscription_plan: 'premium',
        status: 'active'
      });

    if (schoolError) throw schoolError;
    console.log('✅ Demo school created');

    // Create users
    console.log('\n👥 Creating demo users...');
    
    // Super Admin
    const superAdminId = randomUUID();
    const { error: superAdminError } = await supabase
      .from('users')
      .insert({
        id: superAdminId,
        email: 'superadmin@erp.com',
        role: 'super_admin',
        first_name: 'Super',
        last_name: 'Admin',
        status: 'active'
      });

    if (superAdminError) throw superAdminError;
    console.log('✅ Super Admin created');

    // School Admin
    const schoolAdminId = randomUUID();
    const { error: adminError } = await supabase
      .from('users')
      .insert({
        id: schoolAdminId,
        email: 'admin@sunriseschool.edu',
        school_id: schoolId,
        role: 'school_admin',
        first_name: 'John',
        last_name: 'Smith',
        status: 'active'
      });

    if (adminError) throw adminError;
    console.log('✅ School Admin created');

    // Teachers
    const teachers = [
      { id: randomUUID(), email: 'math.teacher@sunriseschool.edu', firstName: 'Sarah', lastName: 'Johnson', subject: 'Mathematics' },
      { id: randomUUID(), email: 'english.teacher@sunriseschool.edu', firstName: 'Michael', lastName: 'Brown', subject: 'English' },
      { id: randomUUID(), email: 'science.teacher@sunriseschool.edu', firstName: 'Emily', lastName: 'Davis', subject: 'Science' },
      { id: randomUUID(), email: 'social.teacher@sunriseschool.edu', firstName: 'Robert', lastName: 'Wilson', subject: 'Social Studies' }
    ];

    for (const teacher of teachers) {
      const { error } = await supabase
        .from('users')
        .insert({
          id: teacher.id,
          email: teacher.email,
          school_id: schoolId,
          role: 'teacher',
          first_name: teacher.firstName,
          last_name: teacher.lastName,
          status: 'active'
        });

      if (error) throw error;
    }
    console.log('✅ Teachers created');

    // Create sections
    console.log('\n📋 Creating demo sections...');
    const sections = [
      { id: randomUUID(), grade: 6, section: 'A', class_teacher: teachers[0].id },
      { id: randomUUID(), grade: 6, section: 'B', class_teacher: teachers[1].id },
      { id: randomUUID(), grade: 7, section: 'A', class_teacher: teachers[2].id },
      { id: randomUUID(), grade: 7, section: 'B', class_teacher: teachers[3].id }
    ];

    for (const section of sections) {
      const { error } = await supabase
        .from('sections')
        .insert({
          id: section.id,
          school_id: schoolId,
          grade: section.grade,
          section: section.section,
          class_teacher: section.class_teacher,
          capacity: 40
        });

      if (error) throw error;
    }
    console.log('✅ Sections created');

    // Create sample timetable for Grade 6 Section A
    console.log('\n📅 Creating sample timetable...');
    const samplePeriods = [
      // Monday
      { section_id: sections[0].id, weekday: 1, period_no: 1, subject: 'Mathematics', teacher_id: teachers[0].id },
      { section_id: sections[0].id, weekday: 1, period_no: 2, subject: 'English', teacher_id: teachers[1].id },
      { section_id: sections[0].id, weekday: 1, period_no: 3, subject: 'Science', teacher_id: teachers[2].id },
      { section_id: sections[0].id, weekday: 1, period_no: 4, subject: 'Social Studies', teacher_id: teachers[3].id },
      
      // Tuesday
      { section_id: sections[0].id, weekday: 2, period_no: 1, subject: 'English', teacher_id: teachers[1].id },
      { section_id: sections[0].id, weekday: 2, period_no: 2, subject: 'Mathematics', teacher_id: teachers[0].id },
      { section_id: sections[0].id, weekday: 2, period_no: 3, subject: 'Physical Education', teacher_id: null },
      { section_id: sections[0].id, weekday: 2, period_no: 4, subject: 'Art', teacher_id: null },
      
      // Wednesday
      { section_id: sections[0].id, weekday: 3, period_no: 1, subject: 'Science', teacher_id: teachers[2].id },
      { section_id: sections[0].id, weekday: 3, period_no: 2, subject: 'Social Studies', teacher_id: teachers[3].id },
      { section_id: sections[0].id, weekday: 3, period_no: 3, subject: 'Mathematics', teacher_id: teachers[0].id },
      { section_id: sections[0].id, weekday: 3, period_no: 4, subject: 'English', teacher_id: teachers[1].id },
      
      // Thursday
      { section_id: sections[0].id, weekday: 4, period_no: 1, subject: 'Mathematics', teacher_id: teachers[0].id },
      { section_id: sections[0].id, weekday: 4, period_no: 2, subject: 'Science', teacher_id: teachers[2].id },
      { section_id: sections[0].id, weekday: 4, period_no: 3, subject: 'Computer Science', teacher_id: null },
      { section_id: sections[0].id, weekday: 4, period_no: 4, subject: 'Library', teacher_id: null },
      
      // Friday
      { section_id: sections[0].id, weekday: 5, period_no: 1, subject: 'English', teacher_id: teachers[1].id },
      { section_id: sections[0].id, weekday: 5, period_no: 2, subject: 'Social Studies', teacher_id: teachers[3].id },
      { section_id: sections[0].id, weekday: 5, period_no: 3, subject: 'Mathematics', teacher_id: teachers[0].id },
      { section_id: sections[0].id, weekday: 5, period_no: 4, subject: 'Science', teacher_id: teachers[2].id }
    ];

    for (const period of samplePeriods) {
      const { error } = await supabase
        .from('periods')
        .insert(period);

      if (error) throw error;
    }
    console.log('✅ Sample timetable created');

    // Create section_teachers relationships
    console.log('\n🔗 Creating section-teacher relationships...');
    const sectionTeacherRelationships: { section_id: string; teacher_id: string }[] = [];
    
    // Add all teachers who teach in each section based on the timetable
    for (const period of samplePeriods) {
      if (period.teacher_id) {
        const relationship = {
          section_id: period.section_id,
          teacher_id: period.teacher_id
        };
        
        // Check if this relationship already exists in our array
        const exists = sectionTeacherRelationships.some(r => 
          r.section_id === relationship.section_id && r.teacher_id === relationship.teacher_id
        );
        
        if (!exists) {
          sectionTeacherRelationships.push(relationship);
        }
      }
    }
    
    // Also ensure class teachers are in the relationships
    for (const section of sections) {
      const relationship = {
        section_id: section.id,
        teacher_id: section.class_teacher
      };
      
      const exists = sectionTeacherRelationships.some(r => 
        r.section_id === relationship.section_id && r.teacher_id === relationship.teacher_id
      );
      
      if (!exists) {
        sectionTeacherRelationships.push(relationship);
      }
    }

    // Insert the relationships
    for (const relationship of sectionTeacherRelationships) {
      const { error } = await supabase
        .from('section_teachers')
        .insert(relationship);

      if (error) throw error;
    }
    console.log(`✅ Created ${sectionTeacherRelationships.length} section-teacher relationships`);

    // Create some sample students
    console.log('\n👨‍🎓 Creating demo students...');
    const sampleStudents = [
      { id: randomUUID(), name: 'Alice Johnson', email: 'alice.johnson@student.sunriseschool.edu', grade: 6, section_id: sections[0].id },
      { id: randomUUID(), name: 'Bob Smith', email: 'bob.smith@student.sunriseschool.edu', grade: 6, section_id: sections[0].id },
      { id: randomUUID(), name: 'Charlie Brown', email: 'charlie.brown@student.sunriseschool.edu', grade: 6, section_id: sections[1].id },
      { id: randomUUID(), name: 'Diana Wilson', email: 'diana.wilson@student.sunriseschool.edu', grade: 7, section_id: sections[2].id }
    ];

    for (const student of sampleStudents) {
      const { error } = await supabase
        .from('students')
        .insert({
          id: student.id,
          school_id: schoolId,
          first_name: student.name.split(' ')[0],
          last_name: student.name.split(' ')[1],
          email: student.email,
          grade: student.grade,
          section_id: student.section_id,
          status: 'active'
        });

      if (error) throw error;
    }
    console.log('✅ Demo students created');

    // Create some sample parents (with auth)
    console.log('\n👨‍👩‍👧‍👦 Creating demo parents...');
    const parentId = randomUUID();
    
    // First create auth user
    const { data: authParent, error: authParentError } = await supabase.auth.admin.createUser({
      email: 'parent@sunriseschool.edu',
      password: 'parent123',
      email_confirm: true,
      user_metadata: {
        role: 'parent'
      }
    });

    if (authParentError) {
      console.warn('Auth parent creation warning:', authParentError.message);
      // Continue with existing user if already exists
    }

    // Then create user record
    const { error: parentError } = await supabase
      .from('users')
      .insert({
        id: authParent?.user?.id || parentId,
        email: 'parent@sunriseschool.edu',
        school_id: schoolId,
        role: 'parent',
        first_name: 'Jane',
        last_name: 'Johnson',
        status: 'active'
      });

    if (parentError) throw parentError;
    console.log('✅ Demo parent created with auth');

    // Link parent to first student (Alice Johnson)
    console.log('\n🔗 Creating parent-student relationships...');
    const { error: parentStudentError } = await supabase
      .from('student_parents')
      .insert({
        parent_id: authParent?.user?.id || parentId,
        student_id: sampleStudents[0].id
      });

    if (parentStudentError) throw parentStudentError;
    console.log('✅ Parent-student relationship created');

    console.log('\n🎉 Database seeding completed successfully!');
    console.log('\n📋 Login Credentials:');
    console.log('Super Admin: superadmin@erp.com');
    console.log('School Admin: admin@sunriseschool.edu');
    console.log('Teacher: math.teacher@sunriseschool.edu');
    console.log('Parent: parent@sunriseschool.edu');
    console.log('\nNote: You may need to set passwords in Supabase Auth dashboard or use the reset password flow.');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

main().catch(console.error); 