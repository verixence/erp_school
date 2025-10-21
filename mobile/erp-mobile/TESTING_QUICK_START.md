# 📱 Quick Start - Test Mobile App in 5 Minutes

## 🚀 Steps to Test

### 1. Install & Start (2 minutes)
```bash
cd mobile/erp-mobile
npm install
npx expo start
```

### 2. Open on Phone (1 minute)
- **iOS**: Open Camera → Scan QR code
- **Android**: Open Expo Go app → Scan QR code

### 3. Login (1 minute)
Use any teacher/parent account from your database:
- Email: (your account email)
- Password: (your password)

### 4. Test Features (5+ minutes)

**✅ Working Now:**
- Teacher Dashboard - View stats and sections
- Teacher Attendance - Take/edit attendance
- Push token registration (background)

**⏳ Not Implemented Yet:**
- Teacher Homework, Marks, Timetable
- Most Parent features
- Student features

---

## 🐛 Quick Fixes

**App won't start?**
```bash
npx expo start -c
```

**Can't connect?**
- Ensure phone and computer on same WiFi
- Try tunnel mode: `npx expo start --tunnel`

**No data showing?**
- Check `.env` file exists
- Verify you're using correct credentials

---

## ✅ Success Checklist
- [ ] App opens without crashes
- [ ] Can login successfully
- [ ] Dashboard shows data
- [ ] Can take attendance
- [ ] Attendance saves to database

---

**Full guide**: See [TESTING_GUIDE.md](./TESTING_GUIDE.md) for detailed testing instructions.
