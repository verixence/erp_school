import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Helper function to generate username by role and school
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

async function updateExistingUsers() {
  console.log('🔧 Adding usernames to existing users...');

  try {
    // Get all users without usernames
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, role, school_id, employee_id')
      .is('username', null);

    if (usersError) {
      console.error('Error fetching users:', usersError);
      return;
    }

    if (!users || users.length === 0) {
      console.log('✅ All users already have usernames');
      return;
    }

    console.log(`Found ${users.length} users without usernames`);

    // Group users by school to generate sequential usernames
    const usersBySchool = users.reduce((acc, user) => {
      const schoolId = user.school_id || 'no-school';
      if (!acc[schoolId]) {
        acc[schoolId] = [];
      }
      acc[schoolId].push(user);
      return acc;
    }, {} as Record<string, typeof users>);

    let updatedCount = 0;
    let errorCount = 0;

    for (const [schoolId, schoolUsers] of Object.entries(usersBySchool)) {
      console.log(`\n📚 Processing ${schoolUsers.length} users for school: ${schoolId}`);

      for (const user of schoolUsers) {
        try {
          // Generate username
          const username = await generateUsername(user.role, user.school_id, user.employee_id);
          
          // Generate dummy email
          const dummyEmail = `${username}@${user.school_id || 'school'}.local`;

          // Update user record
          const { error: updateError } = await supabase
            .from('users')
            .update({ 
              username: username,
              email: dummyEmail // Update to dummy email for username-based auth
            })
            .eq('id', user.id);

          if (updateError) {
            console.error(`❌ Failed to update user ${user.email}:`, updateError);
            errorCount++;
          } else {
            console.log(`✅ Updated ${user.email} → ${username} (${dummyEmail})`);
            updatedCount++;

            // Update auth user metadata
            try {
              await supabase.auth.admin.updateUserById(user.id, {
                email: dummyEmail,
                user_metadata: {
                  username: username,
                  original_email: user.email
                }
              });
            } catch (authError) {
              console.warn(`⚠️  Failed to update auth metadata for ${username}:`, authError);
            }
          }

          // Small delay to avoid rate limits
          await new Promise(resolve => setTimeout(resolve, 100));

        } catch (error) {
          console.error(`❌ Error processing user ${user.email}:`, error);
          errorCount++;
        }
      }
    }

    console.log(`\n🎉 Migration complete!`);
    console.log(`✅ Successfully updated: ${updatedCount} users`);
    console.log(`❌ Errors: ${errorCount} users`);

    if (updatedCount > 0) {
      console.log(`\n📋 Next steps:`);
      console.log(`1. Users can now login with their usernames`);
      console.log(`2. Old email logins will still work through email lookup`);
      console.log(`3. Consider notifying users of their new usernames`);
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

// Run the migration
updateExistingUsers();