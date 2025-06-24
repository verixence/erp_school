import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

const supabase = createClient(
  process.env.SUPA_URL!,
  process.env.SUPA_SERVICE_KEY!
);

async function main() {
  console.log("🌱 Seeding database...");

  // Insert demo schools
  const { data: schools, error: schoolsError } = await supabase
    .from("schools")
    .insert([
      {
        name: "Green Valley High",
        domain: "greenvalley.edu",
        enabled_features: {
          core: true,
          attend: true,
          exam: false,
          fee: false,
          hw: true,
          announce: true,
          chat: false,
          lib: false,
          transport: false
        },
        status: "active"
      },
      {
        name: "Sunrise Academy",
        domain: "sunrise.edu",
        enabled_features: {
          core: true,
          attend: true,
          exam: true,
          fee: true,
          hw: true,
          announce: true,
          chat: true,
          lib: true,
          transport: false
        },
        status: "active"
      }
    ])
    .select();

  if (schoolsError) {
    console.error("❌ Error inserting schools:", schoolsError);
    return;
  }

  // Create auth users and insert into our database
  console.log("Creating authentication users...");

  // Create Super Admin user
  const { data: superAdminAuth, error: superAdminError } = await supabase.auth.admin.createUser({
    email: "admin@school.edu",
    password: "admin123",
    email_confirm: true,
    user_metadata: {
      role: "super_admin"
    }
  });

  if (superAdminError) {
    console.error("❌ Error creating super admin auth:", superAdminError);
    return;
  }

  // Create School Admin user  
  const { data: schoolAdminAuth, error: schoolAdminError } = await supabase.auth.admin.createUser({
    email: "school@demo.edu", 
    password: "school123",
    email_confirm: true,
    user_metadata: {
      role: "school_admin"
    }
  });

  if (schoolAdminError) {
    console.error("❌ Error creating school admin auth:", schoolAdminError);
    return;
  }

  // Insert users into our database
  const { error: userError } = await supabase.from("users").insert([
    {
      id: superAdminAuth.user!.id,
      email: "admin@school.edu",
      role: "super_admin",
      school_id: null
    },
    {
      id: schoolAdminAuth.user!.id,
      email: "school@demo.edu",
      role: "school_admin",
      school_id: schools?.[0]?.id || null // Assign to first school
    }
  ]);

  if (userError) {
    console.error("❌ Error inserting users:", userError);
    return;
  }

  console.log("✅ Successfully seeded:");
  console.log(`   📚 Schools: ${schools?.map(s => s.name).join(", ")}`);
  console.log(`   👤 Super Admin: admin@school.edu (password: admin123)`);
  console.log(`   🏫 School Admin: school@demo.edu (password: school123)`);
  console.log("");
  console.log("🚀 You can now:");
  console.log("   1. Run 'pnpm dev:web' to start the web app");
  console.log("   2. Login with: admin@school.edu / admin123");
  console.log("   3. Visit /super-admin to manage schools");
}

main().catch(console.error); 