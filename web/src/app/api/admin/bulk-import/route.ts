import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// Check for required environment variables
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing required Supabase environment variables');
}

// Initialize Supabase client with service role for admin operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Helper function to generate username by role
async function generateUsername(role: string, schoolId: string, employeeId?: string): Promise<string> {
  let prefix = '';
  switch (role) {
    case 'school_admin':
      prefix = 'admin';
      break;
    case 'teacher':
      // Use employee_id if available
      if (employeeId) {
        const { data: existing } = await supabase
          .from('users')
          .select('username')
          .eq('username', employeeId)
          .eq('school_id', schoolId)
          .single();
        
        if (!existing) {
          return employeeId;
        }
      }
      prefix = 'T';
      break;
    case 'parent':
      prefix = 'P';
      break;
    case 'student':
      prefix = 'S';
      break;
    default:
      prefix = 'U';
  }

  // Find next available number for this school and prefix
  const { data: users } = await supabase
    .from('users')
    .select('username')
    .eq('school_id', schoolId)
    .like('username', `${prefix}%`);

  let maxNumber = 0;
  if (users) {
    users.forEach(user => {
      if (user.username) {
        const match = user.username.match(new RegExp(`^${prefix}(\\d+)$`));
        if (match) {
          const num = parseInt(match[1]);
          if (num > maxNumber) {
            maxNumber = num;
          }
        }
      }
    });
  }

  const nextNumber = maxNumber + 1;
  return `${prefix}${nextNumber.toString().padStart(4, '0')}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { entity, data, school_id, useUsername = true } = body;

    if (!entity || !data || !Array.isArray(data) || !school_id) {
      return NextResponse.json(
        { error: 'Missing required fields: entity, data, school_id' },
        { status: 400 }
      );
    }

    console.log(`Starting bulk import for ${entity}:`, { count: data.length, school_id, useUsername });

    let results;
    const errors = [];

    switch (entity) {
      case 'sections':
        results = await bulkImportSections(data, school_id);
        break;
      case 'students':
        results = await bulkImportStudents(data, school_id, useUsername);
        break;
      case 'teachers':
        results = await bulkImportTeachers(data, school_id, useUsername);
        break;
      case 'parents':
        results = await bulkImportParents(data, school_id, useUsername);
        break;
      default:
        return NextResponse.json(
          { error: `Unsupported entity type: ${entity}` },
          { status: 400 }
        );
    }

    console.log(`Bulk import completed:`, results);

    return NextResponse.json({
      success: true,
      imported: results.successful,
      errors: results.errors
    });

  } catch (error: any) {
    console.error('Bulk import error:', error);
    return NextResponse.json(
      { error: `Bulk import failed: ${error.message}` },
      { status: 500 }
    );
  }
}

async function bulkImportSections(data: any[], school_id: string) {
  const successful = [];
  const errors = [];

  for (const row of data) {
    try {
      // Check if teacher exists if provided (try employee_id first, then email)
      let teacher_id = null;

      if (row.teacher_employee_id) {
        const { data: teacher } = await supabase
          .from('users')
          .select('id')
          .eq('employee_id', row.teacher_employee_id)
          .eq('school_id', school_id)
          .eq('role', 'teacher')
          .single();

        if (!teacher) {
          errors.push(`Teacher with employee ID ${row.teacher_employee_id} not found`);
          continue;
        }
        teacher_id = teacher.id;
      } else if (row.teacher_email) {
        const { data: teacher } = await supabase
          .from('users')
          .select('id')
          .eq('email', row.teacher_email)
          .eq('school_id', school_id)
          .eq('role', 'teacher')
          .single();

        if (!teacher) {
          errors.push(`Teacher with email ${row.teacher_email} not found`);
          continue;
        }
        teacher_id = teacher.id;
      }

      // Create section
      const sectionData = {
        class_name: `Grade ${row.grade} - ${row.section}`,
        grade: row.grade,
        section: row.section,
        capacity: parseInt(row.capacity),
        teacher_id,
        school_id
      };

      const { error } = await supabase
        .from('classes')
        .insert(sectionData);

      if (error) {
        errors.push(`Section ${row.grade}-${row.section}: ${error.message}`);
      } else {
        successful.push(sectionData);
      }
    } catch (error: any) {
      errors.push(`Section ${row.grade}-${row.section}: ${error.message}`);
    }
  }

  return { successful, errors };
}

async function bulkImportStudents(data: any[], school_id: string, useUsername: boolean = true) {
  const successful = [];
  const errors = [];

  for (const row of data) {
    try {
      // Check if section exists
      const { data: section } = await supabase
        .from('classes')
        .select('id')
        .eq('grade', row.grade)
        .eq('section', row.section)
        .eq('school_id', school_id)
        .single();

      if (!section) {
        errors.push(`Student ${row.full_name}: Section ${row.grade}-${row.section} does not exist. Please create the section first.`);
        continue;
      }

      // Create student
      const studentData = {
        full_name: row.full_name,
        admission_no: row.admission_no,
        grade: row.grade,
        section: row.section,
        date_of_birth: row.date_of_birth,
        gender: row.gender.toLowerCase(),
        student_email: row.student_email || null,
        student_phone: row.student_phone || null,
        school_id
      };

      const { data: student, error } = await supabase
        .from('students')
        .insert(studentData)
        .select()
        .single();

      if (error) {
        errors.push(`Student ${row.full_name}: ${error.message}`);
        continue;
      }

      // Create and link parents if provided
      if (row.parent_emails && student) {
        const parentEmails = row.parent_emails.split(';').map((email: string) => email.trim());
        const parentNames = (row.parent_names || '').split(';').map((name: string) => name.trim());
        const parentPhones = (row.parent_phones || '').split(';').map((phone: string) => phone.trim());
        const parentRelations = (row.parent_relations || '').split(';').map((relation: string) => relation.trim());
        
        for (let i = 0; i < parentEmails.length; i++) {
          const email = parentEmails[i];
          if (!email) continue;
          
          // Check if parent already exists
          let { data: parent } = await supabase
            .from('users')
            .select('id')
            .eq('email', email)
            .eq('school_id', school_id)
            .eq('role', 'parent')
            .single();

          // Create parent if doesn't exist
          if (!parent) {
            try {
              const parentName = parentNames[i] || `Parent of ${row.full_name}`;
              const [first_name, ...lastNameParts] = parentName.split(' ');
              const last_name = lastNameParts.join(' ') || '';
              
              // Generate temporary password
              const tempPassword = 'temp' + Math.random().toString(36).slice(-8) + '!';
              
              // Generate username if useUsername is enabled
              let username = null;
              let finalEmail = email;
              
              if (useUsername) {
                username = await generateUsername('parent', school_id);
                finalEmail = `${username}@${school_id}.local`;
              }

              // Create auth user
              const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
                email: finalEmail,
                password: tempPassword,
                email_confirm: true,
                user_metadata: {
                  role: 'parent',
                  school_id,
                  first_name,
                  last_name,
                  username
                }
              });

              if (authError) {
                errors.push(`Parent ${parentName} (${email}): Auth creation failed - ${authError.message}`);
                continue;
              }

              // Create user record
              const userData = {
                id: authUser.user.id,
                email: finalEmail,
                username,
                role: 'parent',
                school_id,
                first_name,
                last_name,
                phone: parentPhones[i] || null,
                relation: (parentRelations[i] || 'parent').toLowerCase()
              };

              const { error: userError } = await supabase
                .from('users')
                .insert(userData);

              if (userError) {
                // Cleanup auth user if user record creation fails
                await supabase.auth.admin.deleteUser(authUser.user.id);
                errors.push(`Parent ${parentName} (${email}): Database user creation failed - ${userError.message}`);
                continue;
              }

              parent = { id: authUser.user.id };
              
              // Log successful parent creation
              successful.push({
                type: 'parent',
                email: finalEmail,
                username,
                name: parentName,
                temp_password: tempPassword,
                message: username 
                  ? `Created parent account for ${parentName} with username: ${username} | Password: ${tempPassword}`
                  : `Created parent account for ${parentName} with email: ${finalEmail} | Password: ${tempPassword}`
              });
              
            } catch (error: any) {
              errors.push(`Parent creation for ${email}: ${error.message}`);
              continue;
            }
          }

          // Link parent to student
          if (parent) {
            await supabase
              .from('student_parents')
              .insert({
                student_id: student.id,
                parent_id: parent.id
              });
          }
        }
      }

      successful.push({
        type: 'student',
        ...studentData,
        message: `Created student ${row.full_name} in ${row.grade}-${row.section}`
      });
    } catch (error: any) {
      errors.push(`Student ${row.full_name}: ${error.message}`);
    }
  }

  return { successful, errors };
}

async function bulkImportTeachers(data: any[], school_id: string, useUsername: boolean = true) {
  const successful = [];
  const errors = [];

  for (const row of data) {
    try {
      // Use provided password or generate a temporary one
      const tempPassword = row.password && row.password.trim()
        ? row.password.trim()
        : 'temp' + Math.random().toString(36).slice(-8) + '!';

      // Generate username if useUsername is enabled
      let username = null;
      let finalEmail = row.email || null;

      if (useUsername) {
        username = await generateUsername('teacher', school_id, row.employee_id);
        finalEmail = `${username}@${school_id}.local`;
      } else if (!finalEmail) {
        // If not using username and no email provided, generate dummy email
        username = await generateUsername('teacher', school_id, row.employee_id);
        finalEmail = `${username}@${school_id}.local`;
      }

      // Create auth user first
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: finalEmail,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          role: 'teacher',
          school_id,
          first_name: row.first_name,
          last_name: row.last_name,
          username
        }
      });

      if (authError) {
        errors.push(`Teacher ${row.first_name} ${row.last_name} (${row.email}): Auth creation failed - ${authError.message}`);
        continue;
      }

      // Create user record in database
      const userData = {
        id: authUser.user.id,
        email: finalEmail,
        username,
        role: 'teacher',
        school_id,
        first_name: row.first_name,
        last_name: row.last_name,
        phone: row.phone || null,
        employee_id: row.employee_id || null,
        subjects: row.subjects ? row.subjects.split(';').map((s: string) => s.trim()) : []
      };

      const { error: userError } = await supabase
        .from('users')
        .insert(userData);

      if (userError) {
        // Cleanup auth user if user record creation fails
        await supabase.auth.admin.deleteUser(authUser.user.id);
        errors.push(`Teacher ${row.first_name} ${row.last_name} (${row.email}): Database user creation failed - ${userError.message}`);
        continue;
      }

      // Create teacher record
      const teacherData = {
        user_id: authUser.user.id,
        school_id,
        employee_id: row.employee_id || `EMP${Date.now()}${Math.random().toString(36).slice(-3).toUpperCase()}`,
        first_name: row.first_name,
        last_name: row.last_name,
        email: finalEmail,
        phone: row.phone || null,
        department: row.department || null,
        subjects: row.subjects ? row.subjects.split(';').map((s: string) => s.trim()) : [],
        status: 'active'
      };

      const { error: teacherError } = await supabase
        .from('teachers')
        .insert(teacherData);

      if (teacherError) {
        // Cleanup both auth user and database user if teacher record creation fails
        await supabase.auth.admin.deleteUser(authUser.user.id);
        await supabase.from('users').delete().eq('id', authUser.user.id);
        errors.push(`Teacher ${row.first_name} ${row.last_name} (${row.email}): Teacher record creation failed - ${teacherError.message}`);
        continue;
      }

      successful.push({ 
        ...teacherData, 
        username,
        temp_password: tempPassword,
        message: username 
          ? `Created teacher account for ${row.first_name} ${row.last_name} with username: ${username} | Password: ${tempPassword}`
          : `Created teacher account for ${row.first_name} ${row.last_name} with email: ${finalEmail} | Password: ${tempPassword}`
      });

    } catch (error: any) {
      errors.push(`Teacher ${row.first_name} ${row.last_name} (${row.email}): Unexpected error - ${error.message}`);
    }
  }

  return { successful, errors };
}

async function bulkImportParents(data: any[], school_id: string, useUsername: boolean = true) {
  const successful = [];
  const errors = [];

  for (const row of data) {
    try {
      // Generate a temporary password
      const tempPassword = 'temp' + Math.random().toString(36).slice(-8) + '!';
      
      // Generate username if useUsername is enabled
      let username = null;
      let finalEmail = row.email;
      
      if (useUsername) {
        username = await generateUsername('parent', school_id);
        finalEmail = `${username}@${school_id}.local`;
      }

      // Create auth user first
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: finalEmail,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          role: 'parent',
          school_id,
          first_name: row.first_name,
          last_name: row.last_name,
          username
        }
      });

      if (authError) {
        errors.push(`Parent ${row.first_name} ${row.last_name} (${row.email}): Auth creation failed - ${authError.message}`);
        continue;
      }

      // Create user record
      const userData = {
        id: authUser.user.id,
        email: finalEmail,
        username,
        role: 'parent',
        school_id,
        first_name: row.first_name,
        last_name: row.last_name,
        phone: row.phone || null,
        relation: row.relation?.toLowerCase() || 'parent'
      };

      const { error: userError } = await supabase
        .from('users')
        .insert(userData);

      if (userError) {
        // Cleanup auth user if user record creation fails
        await supabase.auth.admin.deleteUser(authUser.user.id);
        errors.push(`Parent ${row.first_name} ${row.last_name} (${row.email}): Database user creation failed - ${userError.message}`);
        continue;
      }

      // Link children if provided
      if (row.children_admission_nos) {
        const admissionNos = row.children_admission_nos.split(';').map((no: string) => no.trim());
        
        for (const admissionNo of admissionNos) {
          const { data: student } = await supabase
            .from('students')
            .select('id')
            .eq('admission_no', admissionNo)
            .eq('school_id', school_id)
            .single();

          if (student) {
            await supabase
              .from('student_parents')
              .insert({
                student_id: student.id,
                parent_id: authUser.user.id
              });
          }
        }
      }

      successful.push({ 
        ...userData, 
        temp_password: tempPassword,
        message: username 
          ? `Created parent account for ${row.first_name} ${row.last_name} with username: ${username} | Password: ${tempPassword}`
          : `Created parent account for ${row.first_name} ${row.last_name} with email: ${finalEmail} | Password: ${tempPassword}`
      });

    } catch (error: any) {
      errors.push(`Parent ${row.first_name} ${row.last_name} (${row.email}): Unexpected error - ${error.message}`);
    }
  }

  return { successful, errors };
} 