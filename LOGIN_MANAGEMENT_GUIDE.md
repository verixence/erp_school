# User Login Management Guide

## How User Accounts Are Created

### For Teachers

#### Individual Teacher Creation
1. Navigate to **School Admin → Teachers → Add Teacher**
2. Fill in the teacher details including **email** and **password**
3. System creates:
   - ✅ Supabase Auth account (can log in)
   - ✅ Database user record
   - ✅ Teacher profile record

#### Bulk Teacher Upload
1. Navigate to **School Admin → Teachers → Bulk Upload**
2. Download the CSV template
3. Fill in teacher data (no password column needed)
4. Upload the CSV file
5. System creates:
   - ✅ Supabase Auth accounts with **temporary passwords**
   - ✅ Database user records
   - ✅ Teacher profile records
6. **Temporary passwords are displayed in the success message**

### For Parents

#### Bulk Parent Upload
1. Navigate to **School Admin → Parents → Bulk Upload**
2. Download the CSV template
3. Fill in parent data (no password column needed)
4. Upload the CSV file
5. System creates:
   - ✅ Supabase Auth accounts with **temporary passwords**
   - ✅ Database user records
   - ✅ Parent profile records

#### Individual Parent Creation
1. Navigate to **School Admin → Parents → Add Parent**
2. Fill in parent details including **email** and **password**
3. System creates:
   - ✅ Supabase Auth account (can log in)
   - ✅ Database user record

## Password Management

### Send Invite Feature (Create Login Accounts)
School admins can create login accounts for teachers or parents who exist in the database but don't have authentication credentials:

**When to Use:**
- Teacher/Parent exists in database but cannot log in
- User was manually added without creating auth account
- New staff/parents need login access

**How to Use:**
1. **For Teachers:**
   - Navigate to **School Admin → Teachers**
   - Look for users with **"Send Invite"** button (they don't have auth accounts)
   - Click the **Actions** dropdown (⋮) for the teacher
   - Select **"Send Invite"**
   - Enter temporary password (minimum 8 characters)
   - Click "Send Invite" to create the account
   - Share email and temporary password with teacher

2. **For Parents:**
   - Navigate to **School Admin → Parents**
   - Look for users with **"Send Invite"** button (they don't have auth accounts)
   - Click the **Actions** dropdown (⋮) for the parent
   - Select **"Send Invite"**
   - Enter temporary password (minimum 8 characters)
   - Click "Send Invite" to create the account
   - Share email and temporary password with parent

**After Invite:**
- User can log in immediately with their email and temporary password
- Recommend they change password after first login
- "Send Invite" button changes to "Reset Password" for future use

### Reset Password Feature
School admins can reset passwords for any teacher or parent in their school who already have authentication accounts:

1. **For Teachers:**
   - Navigate to **School Admin → Teachers**
   - Click the **Actions** dropdown (⋮) for any teacher
   - Select **"Reset Password"**
   - Enter new password (minimum 8 characters)
   - Confirm to update

2. **For Parents:**
   - Navigate to **School Admin → Parents**
   - Click the **Actions** dropdown (⋮) for any parent
   - Select **"Reset Password"**
   - Enter new password (minimum 8 characters)
   - Confirm to update

### Security Features
- ✅ Only school admins can send invites and reset passwords
- ✅ Can only manage users in their own school
- ✅ Cannot manage other admins or super-admins
- ✅ All invites and password resets are logged in audit trail
- ✅ Minimum 8 character password requirement
- ✅ Prevents creating duplicate auth accounts
- ✅ Validates user exists in database before creating auth account

## User Status Management

### Activate/Deactivate Users
School admins can control user access by activating or deactivating accounts:

1. **For Teachers:**
   - Navigate to **School Admin → Teachers**
   - Click the **Actions** dropdown (⋮) for any teacher
   - Select **"Toggle Status"**
   - User status changes between Active ↔ Inactive

2. **For Parents:**
   - Navigate to **School Admin → Parents**
   - Click the **Actions** dropdown (⋮) for any parent
   - Select **"Toggle Status"**
   - User status changes between Active ↔ Inactive

### Status Effects
- **Active Users:** ✅ Can log in and access the system
- **Inactive Users:** ❌ Cannot log in (account disabled)

### Security Features
- ✅ Only school admins can change user status
- ✅ Can only manage users in their own school
- ✅ Cannot deactivate other admins or super-admins
- ✅ All status changes are logged in audit trail
- ✅ Status is displayed in user lists for easy identification

## Default Credentials

### For Bulk Uploads
- **Temporary passwords** are auto-generated using the format: `temp` + random string + `!`
- Example: `tempAbc12345!`, `tempXyz98765!`
- **Important:** Share these temporary passwords securely with users
- **Recommended:** Ask users to change passwords on first login

### User Roles & Access
- **Teachers:** Can access teacher dashboard, timetables, attendance, homework
- **Parents:** Can access parent dashboard, view child's progress, communicate with teachers
- **School Admin:** Full school management access + user management
- **Super Admin:** System-wide access across all schools

## Best Practices

### For School Administrators
1. **Regular Audits:** Review user accounts periodically
2. **Secure Distribution:** Share temporary passwords securely (encrypted email, SMS, etc.)
3. **Status Management:** Deactivate accounts for users who leave the school
4. **Password Policy:** Encourage strong passwords for all users
5. **Monitor Access:** Check audit logs for unusual activity

### For Password Resets
1. **Verify Identity:** Confirm user identity before resetting passwords
2. **Secure Communication:** Share new passwords through secure channels
3. **Force Change:** Require users to change password on next login
4. **Document:** Keep records of password reset requests

### For User Status
1. **Immediate Action:** Deactivate accounts immediately when staff leaves
2. **Temporary Disable:** Use for temporary suspensions or leave
3. **Reactivation:** Easily reactivate accounts when users return
4. **Monitoring:** Regular checks of inactive accounts

## Troubleshooting

### Common Issues
1. **User Can't Log In:** Check if account is active
2. **Password Reset Failed:** Verify user belongs to your school
3. **Missing Users:** Check if they have been created with correct role
4. **Duplicate Emails:** Each email can only be used once in the system

### Error Messages
- `"Unauthorized. Only school admins can reset passwords"` - Check your admin privileges
- `"Can only reset passwords for users in your school"` - User not in your school
- `"User is already active/inactive"` - Status already matches request
- `"Password must be at least 8 characters long"` - Increase password length

## Audit Trail

All user management actions are automatically logged:
- ✅ Password resets (who, when, target user)
- ✅ Status changes (activation/deactivation)
- ✅ User creation (bulk and individual)
- ✅ Admin actions with timestamps

Access audit logs through: **School Admin → Audit Logs**

## Security Best Practices

1. **Temporary Passwords**: Always communicate securely (email, secure portal)
2. **Password Requirements**: Minimum 6 characters (enforced in UI)
3. **Email Verification**: Accounts are auto-verified during creation
4. **Access Control**: Role-based permissions ensure users only see appropriate data

## Common Issues & Solutions

### "No valid data rows found" in CSV Upload
- **Issue**: CSV parsing failed due to special characters or format
- **Solution**: Use the downloaded template and avoid special characters in data

### User Can't Log In
- **Check**: Verify email and password are correct
- **Check**: Ensure account was created successfully (check in Users list)
- **Solution**: Reset password or recreate account if needed

### Missing Teacher/Parent Profile
- **Issue**: User record exists but profile record missing
- **Solution**: Check that both users and teachers/parents tables have records

## Technical Notes

- User accounts require both Supabase Auth AND database records
- All account creation is handled server-side with proper rollback on failures
- CSV uploads are processed in batches with detailed error reporting
- Audit logs track all user creation and modification activities 