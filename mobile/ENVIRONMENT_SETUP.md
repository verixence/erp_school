# Mobile Apps Environment Setup

## Required Environment Variables

Create `.env` files in both `parent-app` and `teacher-app` directories with the following content:

### For `mobile/parent-app/.env`:
```
EXPO_PUBLIC_SUPABASE_URL=https://pyzdfteicahfzyuoxgwg.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5emRmdGVpY2FoZnp5dW94Z3dnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA3NjU1MTIsImV4cCI6MjA2NjM0MTUxMn0.LLy0stoEf3vuH33l-EMEa56Yow12bxlNzhXYejVpR4o
EXPO_PUBLIC_APP_ENV=development
```

### For `mobile/teacher-app/.env`:
```
EXPO_PUBLIC_SUPABASE_URL=https://pyzdfteicahfzyuoxgwg.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5emRmdGVpY2FoZnp5dW94Z3dnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA3NjU1MTIsImV4cCI6MjA2NjM0MTUxMn0.LLy0stoEf3vuH33l-EMEa56Yow12bxlNzhXYejVpR4o
EXPO_PUBLIC_APP_ENV=development
```

## Testing Instructions

1. Create the `.env` files with the content above
2. Run `npm install` in each app directory
3. Start the development server with `npx expo start`
4. Test authentication and data synchronization

## Test Credentials

- Parent: `parent@school.edu` 
- Password: Use the authentication system to create/reset password

## Database Status

✅ **Critical Issues Fixed:**
- RLS policies enabled on all required tables
- Security definer views fixed
- Environment variables configured
- Report template system tested and working

✅ **Sample Data Available:**
- 1 School: Campus High School
- 1 Student: Alice Smith (Grade 5A)
- 1 Parent: John Smith
- 2 Report Templates: CBSE and State Board
- Report generation functions working

## Next Steps

1. Test mobile authentication
2. Verify data synchronization
3. Test all portal features
4. Performance optimization 