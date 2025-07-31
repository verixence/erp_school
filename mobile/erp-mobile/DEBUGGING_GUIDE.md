# 🐛 **Mobile App Debugging Guide**

## 📱 **How to View Console Logs in React Native**

### **Method 1: Metro Bundler (Recommended)**
```bash
# When running the app, check the Metro bundler terminal
npm start
# or
npx expo start
```
- All `console.log()`, `console.error()`, and `console.warn()` output appears in the Metro terminal
- Look for our debugging emojis: 🔍, 📊, ✅, ❌

### **Method 2: React Native Debugger**
```bash
# Install React Native Debugger
npm install -g react-native-debugger

# Open debugger
react-native-debugger
```

### **Method 3: Flipper (Advanced)**
```bash
# Install Flipper
# Download from: https://fbflipper.com/
```

### **Method 4: Device Logs**
```bash
# For iOS Simulator
xcrun simctl spawn booted log stream --predicate 'process == "Expo"'

# For Android
adb logcat
```

## 🔍 **Current Debugging Implemented**

### **1. Available Exams Query**
```javascript
// Look for these logs:
🔍 TeacherMarksEntry: Fetching available exams for teacher: [user_id]
📊 TeacherMarksEntry: Available exams query result: { data, error }
✅ TeacherMarksEntry: Mapped available exams: [array]
❌ TeacherMarksEntry: Available exams query error: [error]
```

### **2. Marks Query**
```javascript
// Look for these logs:
🔍 TeacherMarksEntry: Fetching marks for exam: [exam_id]
📊 TeacherMarksEntry: Marks query result: { examId, data, error }
✅ TeacherMarksEntry: Mapped marks data: [array]
❌ TeacherMarksEntry: Marks query error: [error]
```

### **3. Dashboard Exam Papers**
```javascript
// Look for these logs:
🔍 Dashboard: Fetching exam papers for teacher: [user_id]
📊 Dashboard: Exam papers query result: { data, error }
✅ Dashboard: Fetched exam papers: [count] papers
📊 Dashboard: Pending marks calculation: { totalExamPapers, completedExams, pendingMarksPapers }
```

### **4. Navigation**
```javascript
// Look for these logs:
🔍 Dashboard: Navigate to Enter Marks for exam: [exam_id]
```

## 🚨 **Common Issues & Solutions**

### **Issue 1: "No exams available"**
**Check logs for:**
```javascript
❌ TeacherMarksEntry: Available exams query error: [error]
```
**Common causes:**
- Wrong teacher ID in database
- Missing relationship in `teachers` table
- Wrong school ID

### **Issue 2: "Enter Marks" button not working**
**Check logs for:**
```javascript
🔍 Dashboard: Navigate to Enter Marks for exam: [exam_id]
```
**If log appears:** Navigation is working, check destination screen
**If log missing:** Button press not registering

### **Issue 3: Empty dashboard pending marks**
**Check logs for:**
```javascript
📊 Dashboard: Pending marks calculation: { 
  totalExamPapers: 0,  // ← Should be > 0
  pendingMarksPapers: 0 
}
```

## 🔧 **API Testing Commands**

### **Test Supabase Connection**
```javascript
// Add this to any screen temporarily:
const testConnection = async () => {
  const { data, error } = await supabase.auth.getUser();
  console.log('🔍 Supabase Auth Test:', { data, error });
};

// Call in useEffect
useEffect(() => {
  testConnection();
}, []);
```

### **Test Database Query**
```javascript
// Add this to test specific queries:
const testQuery = async () => {
  const { data, error } = await supabase
    .from('exam_papers')
    .select('id, subject')
    .limit(5);
  console.log('🔍 Database Test:', { data, error });
};
```

## 📊 **Expected Log Flow**

### **Successful Marks Entry Access:**
```
🔍 Dashboard: Fetching exam papers for teacher: abc123
📊 Dashboard: Exam papers query result: { data: [5 items], error: null }
✅ Dashboard: Fetched exam papers: 5 papers
📊 Dashboard: Pending marks calculation: { totalExamPapers: 5, pendingMarksPapers: 3 }
🔍 Dashboard: Navigate to Enter Marks for exam: exam_123
🔍 TeacherMarksEntry: Fetching marks for exam: exam_123
📊 TeacherMarksEntry: Marks query result: { data: [25 items], error: null }
✅ TeacherMarksEntry: Mapped marks data: [25 students]
```

### **Failed Query Example:**
```
🔍 Dashboard: Fetching exam papers for teacher: abc123
❌ Dashboard: Exam papers query error: { code: "42501", message: "permission denied" }
```

## 🛠️ **Quick Debugging Steps**

1. **Open Metro bundler terminal**
2. **Navigate to problematic screen**
3. **Look for our emoji logs** (🔍📊✅❌)
4. **Check for error messages**
5. **Verify data structures**
6. **Test with different user accounts**

## 🆘 **Emergency Debugging**

If nothing works, add this temporary debugging component:

```javascript
// Add to any screen
const DebugInfo = () => {
  const { user } = useAuth();
  return (
    <View style={{ padding: 20, backgroundColor: 'yellow' }}>
      <Text>User ID: {user?.id}</Text>
      <Text>School ID: {user?.school_id}</Text>
      <Text>Role: {user?.role}</Text>
    </View>
  );
};
``` 