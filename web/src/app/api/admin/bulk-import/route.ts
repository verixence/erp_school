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

    // Process in batches for better performance
    const BATCH_SIZE = 50;
    let allSuccessful: any[] = [];
    let allErrors: string[] = [];

    switch (entity) {
      case 'sections':
        results = await bulkImportSections(data, school_id);
        break;
      case 'students':
        // Process students in batches
        for (let i = 0; i < data.length; i += BATCH_SIZE) {
          const batch = data.slice(i, i + BATCH_SIZE);
          console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(data.length / BATCH_SIZE)}`);
          const batchResults = await bulkImportStudents(batch, school_id, useUsername);
          allSuccessful = allSuccessful.concat(batchResults.successful);
          allErrors = allErrors.concat(batchResults.errors);
        }
        results = { successful: allSuccessful, errors: allErrors };
        break;
      case 'teachers':
        // Process teachers in batches
        for (let i = 0; i < data.length; i += BATCH_SIZE) {
          const batch = data.slice(i, i + BATCH_SIZE);
          console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(data.length / BATCH_SIZE)}`);
          const batchResults = await bulkImportTeachers(batch, school_id, useUsername);
          allSuccessful = allSuccessful.concat(batchResults.successful);
          allErrors = allErrors.concat(batchResults.errors);
        }
        results = { successful: allSuccessful, errors: allErrors };
        break;
      case 'parents':
        // Process parents in batches
        for (let i = 0; i < data.length; i += BATCH_SIZE) {
          const batch = data.slice(i, i + BATCH_SIZE);
          console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(data.length / BATCH_SIZE)}`);
          const batchResults = await bulkImportParents(batch, school_id, useUsername);
          allSuccessful = allSuccessful.concat(batchResults.successful);
          allErrors = allErrors.concat(batchResults.errors);
        }
        results = { successful: allSuccessful, errors: allErrors };
        break;
      default:
        return NextResponse.json(
          { error: `Unsupported entity type: ${entity}` },
          { status: 400 }
        );
    }

    console.log(`Bulk import completed:`, {
      successful: results.successful.length,
      errors: results.errors.length
    });

    return NextResponse.json({
      success: true,
      imported: results.successful,
      errors: results.errors,
      summary: {
        total: data.length,
        successful: results.successful.length,
        failed: results.errors.length
      }
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
      // Handle grade - numeric grades go in 'grade' column, text grades go in 'grade_text' column
      let gradeColumn = null;
      let gradeTextColumn = null;

      if (row.grade && !isNaN(row.grade)) {
        gradeColumn = parseInt(row.grade);
      } else if (row.grade) {
        gradeTextColumn = row.grade.toString().toLowerCase();
      }

      const sectionData: any = {
        section: row.section.toString().toUpperCase(),
        capacity: parseInt(row.capacity),
        class_teacher: teacher_id,
        school_id
      };

      // Add either grade or grade_text based on the type
      if (gradeColumn !== null) {
        sectionData.grade = gradeColumn;
      } else if (gradeTextColumn !== null) {
        sectionData.grade_text = gradeTextColumn;
      }

      const { error } = await supabase
        .from('sections')
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

  // Pre-fetch all sections for this school to reduce queries
  const { data: allSections } = await supabase
    .from('sections')
    .select('id, grade, grade_text, section')
    .eq('school_id', school_id);

  const sectionMap = new Map();
  allSections?.forEach(sec => {
    const key = `${sec.grade || sec.grade_text}-${sec.section}`.toLowerCase();
    sectionMap.set(key, sec.id);
  });

  for (const row of data) {
    try {
      // Normalize grade for lookup
      let lookupGrade = row.grade;
      if (row.grade && !isNaN(row.grade)) {
        lookupGrade = parseInt(row.grade);
      } else if (row.grade) {
        lookupGrade = row.grade.toString().toUpperCase();
      }

      // Look up section from pre-fetched map
      const sectionKey = `${lookupGrade}-${row.section.toString().toUpperCase()}`.toLowerCase();
      const sectionId = sectionMap.get(sectionKey);

      if (!sectionId) {
        errors.push(`Student ${row.full_name}: Section ${row.grade}-${row.section} does not exist. Please create the section first.`);
        continue;
      }

      // Create student
      // Handle grade - keep as string for text values (NURSERY, LKG, etc.) or convert to number
      let gradeValue = row.grade;
      if (row.grade && !isNaN(row.grade)) {
        gradeValue = parseInt(row.grade);
      } else if (row.grade) {
        gradeValue = row.grade.toString().toUpperCase();
      }

      const studentData = {
        full_name: row.full_name,
        admission_no: row.admission_no,
        grade: gradeValue,
        section: row.section.toString().toUpperCase(),
        section_id: sectionId,
        date_of_birth: row.date_of_birth,
        gender: row.gender.toLowerCase(),
        student_email: row.student_email || null,
        student_phone: row.student_phone || null,
        school_id
      };

      const { data: student, error } = await supabase
        .from('students')
        .upsert(studentData, {
          onConflict: 'school_id,admission_no',
          ignoreDuplicates: false
        })
        .select()
        .single();

      if (error) {
        errors.push(`Student ${row.full_name}: ${error.message}`);
        continue;
      }

      // Create and link parents if provided
      if ((row.parent_emails || row.parent_phones || row.parent_usernames) && student) {
        const parentEmails = (row.parent_emails || '').split(';').map((email: string) => email.trim()).filter(Boolean);
        const parentUsernames = (row.parent_usernames || '').split(';').map((u: string) => u.trim()).filter(Boolean);
        const parentNames = (row.parent_names || '').split(';').map((name: string) => name.trim());
        const parentPhones = (row.parent_phones || '').split(';').map((phone: string) => phone.trim());
        const parentRelations = (row.parent_relations || '').split(';').map((relation: string) => relation.trim());
        const parentPasswords = (row.parent_passwords || '').split(';').map((pwd: string) => pwd.trim());

        const maxParents = Math.max(parentEmails.length, parentUsernames.length, parentPhones.length, parentNames.length);

        for (let i = 0; i < maxParents; i++) {
          const email = parentEmails[i] || null;
          const providedUsername = parentUsernames[i] || null;
          const phone = parentPhones[i] || null;
          const parentName = parentNames[i] || null;

          // Skip if no identifier provided
          if (!email && !providedUsername && !phone) continue;

          // Check if parent already exists by username, email, or phone
          let parent = null;

          // Try to find by username first (most reliable)
          if (providedUsername) {
            const { data } = await supabase
              .from('users')
              .select('id')
              .eq('username', providedUsername)
              .eq('school_id', school_id)
              .eq('role', 'parent')
              .single();
            parent = data;
          }

          // Fall back to email if username not found
          if (!parent && email) {
            const { data } = await supabase
              .from('users')
              .select('id')
              .eq('email', email)
              .eq('school_id', school_id)
              .eq('role', 'parent')
              .single();
            parent = data;
          }

          // Fall back to phone if still not found
          if (!parent && phone) {
            const { data } = await supabase
              .from('users')
              .select('id')
              .eq('phone', phone)
              .eq('school_id', school_id)
              .eq('role', 'parent')
              .single();
            parent = data;
          }

          // Create parent if doesn't exist
          if (!parent) {
            try {
              const fullParentName = parentName || `Parent of ${row.full_name}`;
              const [first_name, ...lastNameParts] = fullParentName.split(' ');
              const last_name = lastNameParts.join(' ') || '';

              // Use provided password or generate temporary one
              const tempPassword = parentPasswords[i] || 'temp' + Math.random().toString(36).slice(-8) + '!';

              // Use provided username or generate one
              let username = null;
              let finalEmail = email;

              if (providedUsername) {
                // Use the provided username
                username = providedUsername;
                finalEmail = email || `${username}@${school_id}.local`;
              } else if (useUsername || !email) {
                // Generate username if useUsername is true or no email provided
                username = await generateUsername('parent', school_id);
                finalEmail = email || `${username}@${school_id}.local`;
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
      // Check if teacher already exists by employee_id or email
      let existingUser = null;

      if (row.employee_id) {
        const { data } = await supabase
          .from('users')
          .select('id, email, username')
          .eq('employee_id', row.employee_id)
          .eq('school_id', school_id)
          .eq('role', 'teacher')
          .maybeSingle();
        existingUser = data;
      }

      if (!existingUser && row.email) {
        const { data } = await supabase
          .from('users')
          .select('id, email, username')
          .eq('email', row.email)
          .eq('school_id', school_id)
          .eq('role', 'teacher')
          .maybeSingle();
        existingUser = data;
      }

      if (existingUser) {
        // Update existing teacher
        const userData = {
          first_name: row.first_name,
          last_name: row.last_name,
          phone: row.phone || null,
          employee_id: row.employee_id || null,
          subjects: row.subjects ? row.subjects.split(';').map((s: string) => s.trim()) : []
        };

        await supabase
          .from('users')
          .update(userData)
          .eq('id', existingUser.id);

        const teacherData = {
          first_name: row.first_name,
          last_name: row.last_name,
          phone: row.phone || null,
          department: row.department || null,
          subjects: row.subjects ? row.subjects.split(';').map((s: string) => s.trim()) : [],
          status: 'active'
        };

        await supabase
          .from('teachers')
          .update(teacherData)
          .eq('user_id', existingUser.id);

        successful.push({
          ...teacherData,
          employee_id: row.employee_id,
          email: existingUser.email,
          username: existingUser.username,
          message: `Updated teacher ${row.first_name} ${row.last_name}`
        });
        continue;
      }

      // Create new teacher
      const tempPassword = row.password && row.password.trim()
        ? row.password.trim()
        : 'temp' + Math.random().toString(36).slice(-8) + '!';

      let username = null;
      let finalEmail = row.email || null;

      if (useUsername) {
        username = await generateUsername('teacher', school_id, row.employee_id);
        finalEmail = `${username}@${school_id}.local`;
      } else if (!finalEmail) {
        username = await generateUsername('teacher', school_id, row.employee_id);
        finalEmail = `${username}@${school_id}.local`;
      }

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
        await supabase.auth.admin.deleteUser(authUser.user.id);
        errors.push(`Teacher ${row.first_name} ${row.last_name} (${row.email}): Database user creation failed - ${userError.message}`);
        continue;
      }

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
      // Check if parent already exists by email or phone
      let existingUser = null;

      if (row.email) {
        const { data } = await supabase
          .from('users')
          .select('id, email, username')
          .eq('email', row.email)
          .eq('school_id', school_id)
          .eq('role', 'parent')
          .maybeSingle();
        existingUser = data;
      }

      if (!existingUser && row.phone) {
        const { data } = await supabase
          .from('users')
          .select('id, email, username')
          .eq('phone', row.phone)
          .eq('school_id', school_id)
          .eq('role', 'parent')
          .maybeSingle();
        existingUser = data;
      }

      if (existingUser) {
        // Update existing parent
        const userData = {
          first_name: row.first_name,
          last_name: row.last_name,
          phone: row.phone || null,
          relation: row.relation?.toLowerCase() || 'parent'
        };

        await supabase
          .from('users')
          .update(userData)
          .eq('id', existingUser.id);

        // Link children if provided
        if (row.children_admission_nos) {
          const admissionNos = row.children_admission_nos.split(';').map((no: string) => no.trim());

          for (const admissionNo of admissionNos) {
            const { data: student } = await supabase
              .from('students')
              .select('id')
              .eq('admission_no', admissionNo)
              .eq('school_id', school_id)
              .maybeSingle();

            if (student) {
              // Use upsert to avoid duplicate parent-child links
              await supabase
                .from('student_parents')
                .upsert({
                  student_id: student.id,
                  parent_id: existingUser.id
                }, {
                  onConflict: 'student_id,parent_id'
                });
            }
          }
        }

        successful.push({
          ...userData,
          email: existingUser.email,
          username: existingUser.username,
          message: `Updated parent ${row.first_name} ${row.last_name}`
        });
        continue;
      }

      // Create new parent
      const tempPassword = 'temp' + Math.random().toString(36).slice(-8) + '!';

      let username = null;
      let finalEmail = row.email;

      if (useUsername) {
        username = await generateUsername('parent', school_id);
        finalEmail = `${username}@${school_id}.local`;
      }

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
            .maybeSingle();

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