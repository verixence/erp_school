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

// Test the username authentication flow
async function testUsernameLogin() {
  console.log('🧪 Testing Username Authentication Flow...\n');

  // Test cases with different roles
  const testUsers = [
    { username: 'admin0001', expectedRole: 'school_admin' },
    { username: 'TCHR1000', expectedRole: 'teacher' },
    { username: 'P0001', expectedRole: 'parent' }
  ];

  for (const testUser of testUsers) {
    console.log(`Testing login for username: ${testUser.username}`);
    
    try {
      // Step 1: Find user by username (simulating signInWithUsername function)
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, username, email, first_name, last_name, role, school_id')
        .eq('username', testUser.username)
        .single();

      if (userError || !userData) {
        console.log(`❌ User lookup failed for ${testUser.username}: ${userError?.message}`);
        continue;
      }

      // Step 2: Verify user data
      console.log(`✅ User found: ${userData.first_name} ${userData.last_name} (${userData.role})`);
      console.log(`   Email: ${userData.email}`);
      console.log(`   School ID: ${userData.school_id}`);

      // Step 3: Test that username is unique
      const { data: duplicates, error: dupError } = await supabase
        .from('users')
        .select('id')
        .eq('username', testUser.username);

      if (duplicates && duplicates.length > 1) {
        console.log(`❌ Duplicate username found! ${duplicates.length} users have username: ${testUser.username}`);
      } else {
        console.log(`✅ Username is unique`);
      }

      // Step 4: Verify role matches expected
      if (userData.role === testUser.expectedRole) {
        console.log(`✅ Role matches expected: ${userData.role}`);
      } else {
        console.log(`❌ Role mismatch. Expected: ${testUser.expectedRole}, Got: ${userData.role}`);
      }

      console.log(`   🔐 Login flow would work: Username "${testUser.username}" → Email "${userData.email}" → Supabase Auth\n`);

    } catch (error) {
      console.log(`❌ Error testing ${testUser.username}:`, error);
    }
  }

  // Additional tests
  console.log('🔍 Additional Tests:\n');

  // Test username uniqueness across the system
  const { data: allUsernames } = await supabase
    .from('users')
    .select('username, school_id')
    .not('username', 'is', null);

  const usernameMap = new Map();
  let duplicateCount = 0;

  allUsernames?.forEach(user => {
    const key = `${user.username}`;
    if (usernameMap.has(key)) {
      console.log(`❌ Duplicate username found: ${user.username} in schools ${usernameMap.get(key)} and ${user.school_id}`);
      duplicateCount++;
    } else {
      usernameMap.set(key, user.school_id);
    }
  });

  if (duplicateCount === 0) {
    console.log(`✅ All usernames are unique globally`);
  }

  // Test username patterns
  const patterns = {
    'school_admin': /^(admin|superadmin)\d{4}$/,
    'teacher': /^(TCHR\d+|T\d{4}|[A-Z]{3}\d+)$/,
    'parent': /^P\d{4}$/
  };

  for (const [role, pattern] of Object.entries(patterns)) {
    const { data: roleUsers } = await supabase
      .from('users')
      .select('username')
      .eq('role', role)
      .not('username', 'is', null);

    const invalidUsernames = roleUsers?.filter(user => !pattern.test(user.username || ''));
    
    if (invalidUsernames && invalidUsernames.length > 0) {
      console.log(`❌ Invalid username patterns for ${role}:`, invalidUsernames.map(u => u.username));
    } else {
      console.log(`✅ All ${role} usernames follow correct pattern`);
    }
  }

  console.log('\n🎉 Username authentication testing complete!');
}

// Run the test
testUsernameLogin().catch(console.error);