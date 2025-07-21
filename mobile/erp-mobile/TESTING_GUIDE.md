# 🧪 Mobile App Testing Guide

## ✅ Current Status: READY FOR TESTING

The mobile app is now successfully running with:
- ✅ Expo development server working
- ✅ iOS simulator opened automatically
- ✅ Dependencies resolved and compatible
- ✅ Environment variables configured
- ✅ Supabase backend connected

## 🚀 How to Start Testing

### 1. Start the Development Server
```bash
cd mobile/erp-mobile
npx expo start --localhost
```

### 2. Testing Options
- **iOS Simulator**: Automatically opened (iPhone 16 Pro)
- **Physical Device**: Scan QR code with Expo Go app
- **Web Browser**: Press `w` in terminal or visit http://localhost:8081

### 3. Login Credentials
From `mobile/ENVIRONMENT_SETUP.md`:
- **Parent Account**: `parent@school.edu`
- **Teacher Account**: Available in your system
- **Password**: Use authentication system to create/reset

## 📱 What You Can Test Now

### ✅ Teacher Features (FULLY IMPLEMENTED)

#### Teacher Dashboard
- **Location**: Login → Teacher Role → Dashboard
- **Features to Test**:
  - Real-time statistics (students, sections, exams)
  - Quick action buttons with badges
  - Section management cards
  - Pull-to-refresh functionality
  - Role detection (Class Teacher vs Subject Teacher)

#### Teacher Attendance
- **Location**: Teacher Dashboard → "Attendance" button
- **Features to Test**:
  - Section selection dropdown
  - Attendance mode toggle (Daily/Period)
  - Period selection (for period-based attendance)
  - Student list loading
  - Attendance marking (Present/Absent/Late/Excused)
  - Save functionality with success notifications
  - Existing attendance loading and editing

### ⏳ Features Not Yet Implemented
- Teacher Homework management
- Teacher Marks entry
- Teacher Timetable viewing
- All Parent features
- All Student features

## 🔍 Testing Scenarios

### Scenario 1: Teacher Dashboard Testing
1. Login with teacher credentials
2. Verify statistics display correctly:
   - Total students count
   - Assigned sections count
   - Completed exams count
3. Check section cards show proper data
4. Test pull-to-refresh by pulling down
5. Tap quick action buttons to navigate

### Scenario 2: Teacher Attendance Testing
1. From teacher dashboard, tap "Attendance"
2. Select a section from dropdown
3. Choose attendance mode:
   - **Daily**: Mark full-day attendance
   - **Period**: Select specific period first
4. Mark attendance for students using status buttons
5. Tap "Save Attendance" button
6. Verify success message appears
7. Go back and return to test existing attendance loading

### Scenario 3: Navigation Testing
1. Test bottom tab navigation
2. Test drawer navigation (if available)
3. Test back button functionality
4. Test logout functionality

## 🐛 Known Issues & Workarounds

### Issue: `getenv` Module Error
- **What**: Error appears in terminal logs
- **Impact**: Does not affect app functionality
- **Cause**: Parent directory pnpm setup conflict
- **Workaround**: Ignore the error - app works normally

### Issue: Expo Go Version Warning
- **What**: "Expo Go 2.32.18 is recommended for SDK 52.0.0"
- **Impact**: Minor compatibility issues possible
- **Solution**: Update Expo Go app when prompted

## 📊 Database Sample Data

The system includes:
- ✅ 1 School: Campus High School
- ✅ 1 Student: Alice Smith (Grade 5A)
- ✅ 1 Parent: John Smith
- ✅ Teacher sections and assignments
- ✅ Attendance records structure

## 🔧 Troubleshooting

### App Won't Load
1. Check if Metro bundler is running (look for QR code in terminal)
2. Ensure device/simulator is connected to same network
3. Try restarting with `npx expo start --clear`

### Authentication Issues
1. Verify .env file exists with correct credentials
2. Check network connectivity
3. Try creating new account through the app

### Data Not Loading
1. Check terminal for API errors
2. Verify Supabase connection
3. Test with different teacher account

## 🎯 Next Steps After Testing

Once you've tested the current implementation:

1. **Provide Feedback**: Report any issues or suggestions
2. **Verify Functionality**: Confirm teacher features work as expected
3. **Plan Next Features**: Choose which features to implement next:
   - Teacher Homework
   - Teacher Marks
   - Teacher Timetable
   - Parent Dashboard
   - Parent Attendance

## 📞 Support

If you encounter any issues:
1. Check the terminal logs for error messages
2. Verify environment variables are set correctly
3. Ensure all dependencies are installed
4. Try clearing cache: `npx expo start --clear`

The app is now ready for comprehensive testing of the implemented teacher features! 