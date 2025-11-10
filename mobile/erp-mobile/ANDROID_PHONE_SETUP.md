# 📱 How to Run CampusHoster on Your Android Phone

**Last Updated**: November 9, 2025
**Status**: ✅ Dev server is running

---

## 🎯 Quick Start (5 Minutes)

### Method 1: Using Expo Go (Easiest - Recommended)

**Step 1: Install Expo Go on Your Phone**
1. Open Google Play Store on your Android phone
2. Search for "Expo Go"
3. Install the app (it's free)
4. Open Expo Go app

**Step 2: Connect to Dev Server**

You have 3 options to connect:

#### Option A: Scan QR Code (Easiest)
1. Look at your computer terminal where you ran `npm start`
2. You should see a QR code displayed
3. Open Expo Go on your phone
4. Tap "Scan QR Code"
5. Point camera at the QR code on your computer screen
6. App will load automatically!

#### Option B: Manual URL Entry
1. Check the terminal output for the URL (looks like: `exp://192.168.x.x:8081`)
2. Open Expo Go app
3. Tap "Enter URL manually"
4. Type the URL shown in terminal
5. Tap "Connect"

#### Option C: Same WiFi Network (Automatic)
1. Make sure your phone and computer are on the **same WiFi network**
2. Open Expo Go app
3. Your project should appear automatically under "Development servers"
4. Tap on "CampusHoster" to open

---

## 🔧 Troubleshooting

### Issue 1: "Unable to connect to server"

**Cause**: Phone and computer on different networks or firewall blocking

**Fix**:
```bash
# Option 1: Use tunnel mode (slower but works anywhere)
# Press 's' in terminal, then select "Tunnel"
# Or restart with:
npx expo start --tunnel

# Option 2: Check your local IP
# On Mac:
ifconfig | grep "inet " | grep -v 127.0.0.1

# Use the IP shown (e.g., 192.168.1.5)
# Manually enter in Expo Go: exp://192.168.1.5:8081
```

### Issue 2: "Something went wrong" or blank screen

**Cause**: Build errors or cache issues

**Fix**:
```bash
# Clear all caches
rm -rf .expo node_modules/.cache
npx expo start --clear

# Wait for bundler to rebuild
# Then reload in Expo Go (shake phone, tap "Reload")
```

### Issue 3: "Network request failed" errors

**Cause**: App trying to connect to backend without internet or wrong network

**Fix**:
1. Make sure your phone has internet connection
2. Check that WiFi is enabled (not just mobile data)
3. Verify Supabase URL in `.env` file is correct
4. Try reloading the app in Expo Go

### Issue 4: App loads but shows login screen with errors

**Cause**: Environment variables not loaded

**Fix**:
```bash
# Verify .env file exists
cat .env

# Should show:
# EXPO_PUBLIC_SUPABASE_URL=https://pyzdfteicahfzyuoxgwg.supabase.co
# EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...

# If missing, restart dev server:
npm start
```

### Issue 5: "Could not find the expo-dev-client package"

**Cause**: Using development build instead of Expo Go

**Fix**:
```bash
# Use Expo Go (not development build) OR
# Build development client:
eas build --profile development --platform android
```

---

## 📋 Pre-Flight Checklist

Before trying to connect your phone, verify:

- [x] Dev server is running (you should see "Bundled" in terminal)
- [ ] Expo Go app installed on Android phone
- [ ] Phone and computer on same WiFi network
- [ ] No firewall blocking port 8081
- [ ] `.env` file exists with Supabase credentials

---

## 🚀 Step-by-Step Visual Guide

### On Your Computer:

```
Terminal Output Should Look Like:
┌─────────────────────────────────────────────┐
│                                             │
│  Metro waiting on http://localhost:8081    │
│                                             │
│  ▄▄▄▄▄▄▄  ▄▄▄▄▄  ▄   ▄▄▄▄▄▄▄               │
│  █ ▄▄▄ █  █▄ ▄▄▀ ██  █ ▄▄▄ █               │
│  █ ███ █  ▀▄▄ ▀▀  ▄  █ ███ █               │
│  █▄▄▄▄▄█  ▀ ▀ ▀ ▀ ▀  █▄▄▄▄▄█               │
│  ▄▄▄▄▄ ▄▄  ▄▀  ▀▄▄▄  ▄ ▄ ▄ ▄               │
│  (QR CODE HERE)                             │
│                                             │
│  › Press s │ switch to Expo Go              │
│  › Press a │ open Android                   │
│  › Press w │ open web                       │
│                                             │
│  › Metro waiting on exp://192.168.1.5:8081  │
│    - Scan the QR code above with Expo Go   │
│      on Android to get started.             │
└─────────────────────────────────────────────┘
```

### On Your Phone:

```
Expo Go App Screen:
┌────────────────────────────┐
│  Expo Go                   │
├────────────────────────────┤
│  Home    Projects          │
├────────────────────────────┤
│                            │
│  [📷 Scan QR Code]         │
│                            │
│  Recent                    │
│  ┌──────────────────────┐ │
│  │ CampusHoster         │ │
│  │ exp://192.168.1.5... │ │
│  │ Running...           │ │
│  └──────────────────────┘ │
│                            │
│  [Enter URL manually]      │
│                            │
└────────────────────────────┘
```

---

## 🎮 Controls While App is Running

### In Expo Go:
- **Shake phone** → Opens developer menu
- **Three-finger tap** → Opens developer menu
- **Reload** → Refresh the app
- **Debug Remote JS** → Opens Chrome debugger
- **Performance Monitor** → Shows FPS

### In Terminal:
- **r** → Reload app
- **m** → Toggle menu
- **d** → Open developer menu on device
- **shift + d** → Show debug info
- **j** → Open Chrome debugger

---

## 🔍 What You Should See

### 1. Initial Load (1-2 seconds)
```
┌────────────────────────────┐
│                            │
│                            │
│        [App Icon]          │
│                            │
│    Loading...              │
│                            │
└────────────────────────────┘
```

### 2. Login Screen
```
┌────────────────────────────┐
│      CampusHoster          │
│                            │
│  ┌──────────────────────┐ │
│  │ Username            │ │
│  └──────────────────────┘ │
│  ┌──────────────────────┐ │
│  │ Password            │ │
│  └──────────────────────┘ │
│                            │
│      [Login Button]        │
│                            │
└────────────────────────────┘
```

### 3. If Successful
- You should see the login screen
- No error messages in red
- App is interactive (can type in inputs)

---

## 🚨 Common Errors and Solutions

### Error: "Unable to resolve module"
```bash
# Solution: Clear cache and reinstall
rm -rf node_modules
npm install
npx expo start --clear
```

### Error: "Error: Couldn't start project"
```bash
# Solution: Check for port conflicts
lsof -ti:8081 | xargs kill -9
npx expo start
```

### Error: "Network request failed"
```bash
# Solution: Check internet and Supabase connection
# Test Supabase URL:
curl https://pyzdfteicahfzyuoxgwg.supabase.co

# Should return HTML (not error)
```

### Error: "Runtime not ready"
```bash
# This is the date picker error we fixed earlier
# Make sure you've:
# 1. Removed @react-native-community/datetimepicker
# 2. Removed react-native-modal-datetime-picker
# 3. Cleared cache

npm uninstall @react-native-community/datetimepicker react-native-modal-datetime-picker
rm -rf node_modules .expo
npm install
npx expo start --clear
```

---

## 🎯 Alternative: Build Standalone APK

If Expo Go doesn't work, build a standalone APK:

```bash
# Method 1: EAS Build (Cloud - Recommended)
eas build --platform android --profile preview

# Wait 10-15 minutes for build
# Download APK from dashboard
# Install on phone

# Method 2: Local Build (Faster but needs Android Studio)
npx expo run:android

# Requires:
# - Android Studio installed
# - Android SDK configured
# - Android device connected via USB or emulator running
```

---

## 📊 Current Dev Server Status

```bash
# Check if server is running:
lsof -ti:8081

# If returns a number → Server is running ✅
# If returns nothing → Server is not running ❌

# View server logs:
# Check the terminal where you ran 'npm start'
```

**Your server is currently**: ✅ RUNNING

**URL**: Check terminal for exp://... address

---

## 🔗 Quick Commands Reference

```bash
# Start dev server
npm start

# Start with clear cache
npx expo start --clear

# Start with tunnel (works on different networks)
npx expo start --tunnel

# Stop server
# Press Ctrl+C in terminal

# Kill all Expo processes
pkill -9 -f "expo|Metro|node"

# Check what's running on port 8081
lsof -ti:8081
```

---

## 📱 Phone Requirements

- **Android version**: 5.0 (Lollipop) or higher
- **Storage**: At least 100MB free space for Expo Go
- **Internet**: WiFi connection (mobile data works but slower)
- **Screen**: Any size (app is responsive)

---

## ✅ Success Checklist

When everything is working, you should:

- [x] See Expo Go app installed on phone
- [x] See QR code in terminal on computer
- [x] Scan QR code successfully
- [x] App loads on phone (shows CampusHoster logo)
- [x] See login screen
- [x] Can type in username/password fields
- [x] No error messages in Expo Go

---

## 🎓 Test Credentials

Use these to test login:

**For Development/Testing**:
- Username: `T0001` (Teacher) or `P0001` (Parent)
- Password: Check with your backend team

**Note**: If you see "Invalid credentials", verify:
1. Backend is running and accessible
2. Supabase URL is correct in `.env`
3. Users exist in database

---

## 💡 Pro Tips

1. **Keep terminal open**: Don't close the terminal while testing
2. **Shake phone**: Opens developer menu (useful for debugging)
3. **Hot reload**: Changes to code automatically reload (most of the time)
4. **Performance**: First load is slow, subsequent loads are fast
5. **Console logs**: Check terminal for `console.log` outputs

---

## 🆘 Still Not Working?

### Quick Diagnostics:

```bash
# 1. Check if dev server is actually running
curl http://localhost:8081

# Should return: "Expo server is running"

# 2. Check your local IP
ifconfig | grep "inet " | grep -v 127.0.0.1

# 3. Check if Expo Go can reach server
# Open browser on phone, go to: http://YOUR_COMPUTER_IP:8081
# Should see Expo Metro page

# 4. Check firewall
# Mac: System Preferences → Security & Privacy → Firewall
# Allow incoming connections for Node

# 5. Restart everything
pkill -9 -f "expo|Metro|node"
npm start

# Then try connecting from phone again
```

### Get Help:

1. **Check terminal output**: Look for specific error messages
2. **Check Expo Go logs**: Shake phone → "Show Developer Menu" → "Debug"
3. **Expo Forums**: https://forums.expo.dev/
4. **Stack Overflow**: Search for your specific error message

---

## 🎉 Next Steps After Successful Connection

Once app is running on your phone:

1. **Test login flow**: Try logging in with test credentials
2. **Test navigation**: Navigate through different screens
3. **Test offline mode**: Turn on airplane mode, see behavior
4. **Report issues**: Note any crashes or bugs
5. **Test on different screens**: Try different Android devices/versions

---

**Good luck!** 🚀

Your dev server is running. Follow Method 1 (Expo Go) to connect your phone now!

For questions, check the troubleshooting section above or review the full production readiness report.
