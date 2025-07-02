import { createClient } from "@supabase/supabase-js";
import "dotenv/config";
import { randomUUID } from 'crypto';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function main() {
  console.log("🌱 Seeding database...");

  try {
    // Define school brand themes for demo purposes
    const schoolThemes = [
      {
        name: 'Green Valley High School',
        primary: '#059669', // emerald-600
        secondary: '#64748b', // slate-500
        accent: '#06b6d4', // cyan-500
      },
      {
        name: 'Sunrise Academy',
        primary: '#dc2626', // red-600
        secondary: '#78716c', // stone-500
        accent: '#f59e0b', // amber-500
      },
      {
        name: 'Blue Ridge Elementary',
        primary: '#2563eb', // blue-600
        secondary: '#6b7280', // gray-500
        accent: '#8b5cf6', // violet-500
      },
      {
        name: 'Crimson Heights School',
        primary: '#be123c', // rose-700
        secondary: '#57534e', // stone-600
        accent: '#ec4899', // pink-500
      },
      {
        name: 'Golden Oak Academy',
        primary: '#d97706', // amber-600
        secondary: '#71717a', // zinc-500
        accent: '#10b981', // emerald-500
      },
    ];

    // Delete existing data in correct order
    console.log('🗑️  Cleaning existing data...');
    
    await supabase.from('students').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('users').delete().eq('role', 'school_admin');
    await supabase.from('users').delete().eq('role', 'teacher');
    await supabase.from('users').delete().eq('role', 'parent');
    await supabase.from('schools').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    // Create Super Admin if not exists
    console.log('👑 Creating super admin...');
    
    const { data: existingSuperAdmin } = await supabase
      .from('users')
      .select('id')
      .eq('email', 'admin@school.edu')
      .eq('role', 'super_admin')
      .single();

    if (!existingSuperAdmin) {
      const { data: authUser } = await supabase.auth.admin.createUser({
        email: 'admin@school.edu',
        password: 'admin123',
        email_confirm: true,
        user_metadata: {
        role: 'super_admin',
        },
      });

      if (authUser.user) {
        await supabase.from('users').insert({
          id: authUser.user.id,
          email: 'admin@school.edu',
          role: 'super_admin',
          school_id: null,
        });
        console.log('✅ Super admin created');
      }
    } else {
      console.log('✅ Super admin already exists');
    }

    // Create demo schools with unique themes
    console.log('🏫 Creating demo schools with unique themes...');
    
    const schools = [];
    for (let i = 0; i < schoolThemes.length; i++) {
      const theme = schoolThemes[i];
      const schoolData = {
        name: theme.name,
        domain: theme.name.toLowerCase().replace(/\s+/g, '') + '.edu',
        logo_url: null,
        website_url: `https://${theme.name.toLowerCase().replace(/\s+/g, '')}.edu`,
        email_address: `info@${theme.name.toLowerCase().replace(/\s+/g, '')}.edu`,
        phone_number: `+1-555-${(100 + i).toString().padStart(3, '0')}-${Math.floor(Math.random() * 9000) + 1000}`,
        address: {
          street: `${100 + i * 50} Education Street`,
          city: ['Springfield', 'Riverside', 'Greenfield', 'Fairview', 'Oakwood'][i],
          state: ['CA', 'NY', 'TX', 'FL', 'WA'][i],
          country: 'United States',
          postal_code: `${90000 + i * 1000}`,
        },
        principal_name: ['Dr. Sarah Johnson', 'Prof. Michael Chen', 'Dr. Emily Rodriguez', 'Mr. David Thompson', 'Dr. Lisa Anderson'][i],
        principal_email: `principal@${theme.name.toLowerCase().replace(/\s+/g, '')}.edu`,
        principal_phone: `+1-555-${(200 + i).toString().padStart(3, '0')}-${Math.floor(Math.random() * 9000) + 1000}`,
        theme_colors: {
          primary: theme.primary,
          secondary: theme.secondary,
          accent: theme.accent,
        },
        school_type: ['public', 'private', 'charter', 'international', 'private'][i],
        board_affiliation: ['State Board', 'CBSE', 'ICSE', 'IB', 'Cambridge'][i],
        establishment_year: 1980 + i * 8,
        total_capacity: 500 + i * 200,
        description: `A prestigious educational institution committed to excellence in ${['STEM education', 'liberal arts', 'innovative learning', 'holistic development', 'academic excellence'][i]}.`,
        settings: {
          timezone: 'America/Los_Angeles',
          academic_year_start: 'September',
          working_days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        },
        enabled_features: {
          core: true,
          attend: i % 2 === 0,
          exam: i % 3 === 0,
          fee: i % 2 === 1,
          hw: true,
          announce: true,
          chat: i % 3 === 1,
          lib: i % 4 === 0,
          transport: i % 5 === 0,
        },
        status: 'active',
      };

      const { data: school, error: schoolError } = await supabase
        .from('schools')
        .insert(schoolData)
        .select()
        .single();

      if (schoolError) {
        console.error(`❌ Error creating school ${theme.name}:`, schoolError);
        continue;
      }

      schools.push(school);

      // Create school admin for each school
      const adminEmail = `admin@${theme.name.toLowerCase().replace(/\s+/g, '')}.edu`;
      const { data: authUser } = await supabase.auth.admin.createUser({
        email: adminEmail,
        password: 'admin123',
        email_confirm: true,
        user_metadata: {
          role: 'school_admin',
          school_id: school.id,
          school_name: school.name,
        },
      });

      if (authUser.user) {
        await supabase.from('users').insert({
          id: authUser.user.id,
          email: adminEmail,
          role: 'school_admin',
          school_id: school.id,
        });
        console.log(`✅ Created school: ${theme.name} with theme colors (${theme.primary}, ${theme.secondary}, ${theme.accent})`);
      }
    }

    // Create demo school admin for the first school (for easier testing)
    if (schools.length > 0) {
      const demoSchool = schools[0];
      const { data: demoAuthUser } = await supabase.auth.admin.createUser({
        email: 'school@demo.edu',
        password: 'school123',
        email_confirm: true,
        user_metadata: {
          role: 'school_admin',
          school_id: demoSchool.id,
          school_name: demoSchool.name,
        },
      });

      if (demoAuthUser.user) {
        await supabase.from('users').insert({
          id: demoAuthUser.user.id,
          email: 'school@demo.edu',
          role: 'school_admin',
          school_id: demoSchool.id,
        });
        console.log('✅ Created demo school admin: school@demo.edu');
      }
    }

    // Create sample teachers, parents, and students for each school
    console.log('👥 Creating sample users and students...');
    
    for (const school of schools) {
      // Create sample teachers
      const teachers = [
        { name: 'John Smith', email: `john.smith@${school.domain}`, subject: 'Mathematics' },
        { name: 'Sarah Wilson', email: `sarah.wilson@${school.domain}`, subject: 'English' },
        { name: 'Mike Johnson', email: `mike.johnson@${school.domain}`, subject: 'Science' },
      ];

      for (const teacher of teachers) {
        const { data: authUser } = await supabase.auth.admin.createUser({
          email: teacher.email,
          password: 'teacher123',
          email_confirm: true,
          user_metadata: {
            role: 'teacher',
            school_id: school.id,
            subject: teacher.subject,
          },
        });

        if (authUser.user) {
          await supabase.from('users').insert({
            id: authUser.user.id,
            email: teacher.email,
            role: 'teacher',
            school_id: school.id,
            first_name: teacher.name.split(' ')[0],
            last_name: teacher.name.split(' ')[1],
            subjects: [teacher.subject],
          });
        }
      }

      // Create sample parents and students
      const families = [
        { parentName: 'Robert Brown', studentName: 'Emma Brown', grade: '10', section: 'A' },
        { parentName: 'Lisa Davis', studentName: 'James Davis', grade: '9', section: 'B' },
        { parentName: 'Mark Taylor', studentName: 'Olivia Taylor', grade: '11', section: 'A' },
      ];

      for (const family of families) {
        // Create parent
        const parentEmail = `${family.parentName.toLowerCase().replace(' ', '.')}@parent.${school.domain}`;
        const { data: parentAuthUser } = await supabase.auth.admin.createUser({
          email: parentEmail,
      password: 'parent123',
      email_confirm: true,
      user_metadata: {
            role: 'parent',
            school_id: school.id,
          },
        });

        if (parentAuthUser.user) {
          const { data: parentUser } = await supabase.from('users').insert({
            id: parentAuthUser.user.id,
            email: parentEmail,
            role: 'parent',
            school_id: school.id,
            first_name: family.parentName.split(' ')[0],
            last_name: family.parentName.split(' ')[1],
          }).select().single();

          // Create student
          if (parentUser) {
            await supabase.from('students').insert({
              school_id: school.id,
              full_name: family.studentName,
              grade: family.grade,
              section: family.section,
              parent_id: parentUser.id,
              email: `${family.studentName.toLowerCase().replace(' ', '.')}@student.${school.domain}`,
              phone: `+1-555-${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`,
              date_of_birth: new Date(2005 + Math.floor(Math.random() * 5), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toISOString().split('T')[0],
            });
          }
        }
      }

      console.log(`✅ Created sample users for ${school.name}`);
    }

    console.log('🎉 CampusHoster seed completed successfully!');
    console.log('\n📋 Demo Credentials:');
    console.log('🔹 Super Admin: admin@school.edu / admin123');
    console.log('🔹 School Admin: school@demo.edu / school123');
    
    schoolThemes.forEach((theme, index) => {
      const email = `admin@${theme.name.toLowerCase().replace(/\s+/g, '')}.edu`;
      console.log(`🔹 ${theme.name}: ${email} / admin123 (Theme: ${theme.primary})`);
    });
    
    console.log('🔹 Teachers: [name]@[school].edu / teacher123');
    console.log('🔹 Parents: [name]@parent.[school].edu / parent123');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

main().catch(console.error); 