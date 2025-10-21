# 🚀 Quick Setup Guide - Premium Theme

## 1. Install Dependencies

```bash
cd mobile/erp-mobile
npm install
```

This installs:
- `@expo-google-fonts/inter` - Professional Inter font
- `expo-font` - Font loading utilities
- `expo-splash-screen` - Proper splash screen handling

## 2. Clear All Caches

```bash
# Clear Metro bundler cache
npx expo start -c

# If issues persist, also clear node_modules
rm -rf node_modules
npm install
```

## 3. Run the App

```bash
# Start development server
npx expo start

# Then choose:
# - Press 'i' for iOS simulator
# - Press 'a' for Android emulator
# - Scan QR code for Expo Go on device
```

## 4. For Native Builds

```bash
# iOS (requires Xcode)
npx expo run:ios

# Android (requires Android Studio)
npx expo run:android
```

## ✅ Verify It Works

You should see:
- ✅ Pure white background (not cream)
- ✅ Professional indigo/violet colors (not bright yellow/purple)
- ✅ Inter font (crisper, more refined than system font)
- ✅ Subtle gradients (not bright/obvious)
- ✅ All text is readable with high contrast

## ❌ Troubleshooting

### Fonts not loading?
```bash
# Check App.tsx has font loading code
# Restart with cache clear
npx expo start -c
```

### Old colors still showing?
```bash
# Clear all caches
watchman watch-del-all
rm -rf node_modules
npm install
npx expo start -c
```

### App crashes on startup?
```bash
# Check console for errors
# Verify all dependencies installed
npm install
```

## 📱 Test On

- iOS Simulator
- Android Emulator
- Real iOS device (via Expo Go or TestFlight)
- Real Android device (via Expo Go or APK)

## 🎯 What to Look For

**Good Signs:**
- Indigo header for teachers
- Violet header for parents
- White background everywhere
- Inter font (looks crisper)
- Subtle shadows (barely visible)

**Bad Signs:**
- Yellow/cream colors anywhere
- Bright, obvious gradients
- System font (looks chunky)
- Strong shadows

---

**Need Help?** Check `PREMIUM_THEME_UPDATE.md` for full documentation.
