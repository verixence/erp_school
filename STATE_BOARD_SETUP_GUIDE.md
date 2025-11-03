# State Board Reports Setup Guide

## Problem
When you try to access the SSC Reports page (`/school-admin/ssc-reports`), you see:
> **State Board Not Enabled**
>
> This school is not configured for State Board assessments.

## Root Cause
The SSC Reports page checks if your school has State Board enabled by looking for these fields in the `schools` table:
- `state_board_type` = 'Telangana'
- `assessment_pattern` = 'State_FA_SA'
- `board_type` = 'State Board'
- `board_affiliation` = 'State Board'

If **none** of these are set, the page shows the error message.

## Solution: Enable State Board for Your School

### **Step 1: Login as Super Admin**
1. Open your browser and go to: `http://localhost:3000`
2. Login with your Super Admin credentials
3. Navigate to: **Super Admin** → **Schools Management**
   - URL: `http://localhost:3000/super-admin/schools`

### **Step 2: Edit Your School**
1. Find your school (ZTest) in the schools list
2. Click the **Edit** button (pencil icon) next to your school
3. The school edit form will open

### **Step 3: Configure State Board Settings**
In the **Basic Information** tab, you'll see three new dropdown fields:

#### **Field 1: Board Type**
- Select: **State Board**

#### **Field 2: State Board Type** (enabled after selecting "State Board")
- Select: **Telangana State Board**
- (Or select your specific state board)

#### **Field 3: Assessment Pattern**
- Select: **State Board FA/SA (Telangana/AP Style)**

### **Step 4: Save Changes**
1. Click **Next** to go through all the steps
2. On the final **Review & Create** step, click **Update School**
3. Wait for the success message

### **Step 5: Verify State Board is Enabled**
1. Go back to: **School Admin** → **Reports** → **SSC Reports**
   - URL: `http://localhost:3000/school-admin/ssc-reports`
2. You should now see the SSC Reports page instead of the error message!

## Quick Verification (for Developers)

If you want to check the current state, open your browser console on the SSC Reports page and look for:

```
SSC Reports - School board detection: {
  school_name: "ZTest",
  state_board_type: "Telangana",
  assessment_pattern: "State_FA_SA",
  board_type: "State Board",
  board_affiliation: "State Board",
  isStateBoardSchool: true  ← This should be true
}
```

## Alternative: Direct Database Update (If UI doesn't work)

If the UI method doesn't work, you can update directly via SQL:

```sql
UPDATE schools
SET
  board_type = 'State Board',
  state_board_type = 'Telangana',
  assessment_pattern = 'State_FA_SA'
WHERE name = 'ZTest';  -- Replace with your school name
```

Run this in your Supabase SQL Editor:
1. Go to: https://supabase.com/dashboard
2. Open your project
3. Go to **SQL Editor**
4. Paste the SQL above
5. Click **Run**

## What These Fields Mean

| Field | Values | Purpose |
|-------|--------|---------|
| `board_type` | CBSE, ICSE, State Board, IB, IGCSE | Main educational board |
| `state_board_type` | Telangana, Andhra Pradesh, Karnataka, etc. | Which state board (only for State Board) |
| `assessment_pattern` | State_FA_SA, CBSE_Grading, Continuous, Traditional | How exams/grades are structured |

## Why State Board FA/SA Pattern?

When you select `assessment_pattern = 'State_FA_SA'`:
- FA (Formative Assessment): 4 assessments per year, each out of 20 marks
- SA (Summative Assessment): 3 assessments per year, each out of 100 marks
- Grading: Uses O-A-B-C-D grading scale specific to Telangana/AP boards
- Reports: Generates monthly attendance-based report cards

## Troubleshooting

### Issue: Fields not showing in the form
**Solution**: The form has been updated. Restart your dev server:
```bash
cd web
npm run dev
```

### Issue: Still seeing "State Board Not Enabled" after saving
**Solution**:
1. Check browser console for the detection log
2. Verify one of these is set:
   - `board_type = 'State Board'`, OR
   - `state_board_type = 'Telangana'`, OR
   - `assessment_pattern = 'State_FA_SA'`
3. Hard refresh the page (Ctrl+Shift+R or Cmd+Shift+R)

### Issue: Can't access Super Admin page
**Solution**: Make sure your user has `role = 'super_admin'` in the `users` table

## Next Steps After Enabling State Board

Once State Board is enabled, you can:

1. **Create FA/SA Exam Groups**
   - Go to: **School Admin** → **Exams**
   - Create exam groups with type: `state_fa_1`, `state_fa_2`, `state_sa_1`, etc.

2. **Enter Marks**
   - Teachers can enter marks from: **Teacher Portal** → **Marks Entry**
   - System will automatically apply FA/SA grading

3. **Generate Reports**
   - Go to: **School Admin** → **SSC Reports**
   - Select FA/SA and assessment number
   - Generate reports for students

## Need Help?

If you're still facing issues:
1. Check the browser console for error messages
2. Check the State Board detection log
3. Verify your database schema has the new columns
4. Contact the development team with screenshots
