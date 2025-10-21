# Local Build Testing Guide

Test your Android build locally before pushing to EAS Build.

## Prerequisites

### Required Tools
- **Node.js**: 20.19.4+ (already configured in EAS)
- **Java JDK**: 17 (matches our Kotlin/Java target)
- **Android Studio** OR **Android SDK Command Line Tools**

### Installation (macOS)

#### 1. Install Homebrew (if not installed)
```bash
# Install Homebrew
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Follow the on-screen instructions to add Homebrew to PATH
# Usually:
echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
eval "$(/opt/homebrew/bin/brew shellenv)"
```

#### 2. Install Java 17
```bash
# Using Homebrew
brew install openjdk@17

# Add to PATH
echo 'export PATH="/opt/homebrew/opt/openjdk@17/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc

# Verify
java -version  # Should show version 17
```

#### 3. Install Android SDK (Choose one)

**Option A: Android Studio (Recommended)**
- Download from: https://developer.android.com/studio
- Install and open Android Studio
- Go to: Settings → Appearance & Behavior → System Settings → Android SDK
- Install:
  - Android SDK Platform 36
  - Android SDK Build-Tools 36.0.0
  - Android SDK Command-line Tools

**Option B: Command Line Tools Only**
```bash
# Download SDK command line tools
cd ~/
mkdir android-sdk
cd android-sdk
# Download from: https://developer.android.com/studio#command-tools

# Set environment variables
export ANDROID_HOME=$HOME/android-sdk
export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

## Testing Methods

### Method 1: Quick Validation (5 minutes)

Test Metro bundler and basic compilation without full build:

```bash
cd /Users/admin/Documents/GitHub/erp_school/mobile/erp-mobile

# Clean cache
rm -rf node_modules/.cache
npx expo start --clear

# In another terminal, validate Android setup
npx expo run:android --variant release --no-build-cache
```

**What this tests:**
✅ Metro bundler (catches babel-preset-expo issues)
✅ JavaScript compilation
✅ TypeScript type checking
✅ Asset bundling

### Method 2: Local Gradle Build (15-20 minutes)

Simulate the exact EAS build process:

```bash
cd /Users/admin/Documents/GitHub/erp_school/mobile/erp-mobile

# Set environment variables (same as EAS production)
export EAS_BUILD_PROFILE=production
export EXPO_PUBLIC_SUPABASE_URL="https://pyzdfteicahfzyuoxgwg.supabase.co"
export EXPO_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5emRmdGVpY2FoZnp5dW94Z3dnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA3NjU1MTIsImV4cCI6MjA2NjM0MTUxMn0.LLy0stoEf3vuH33l-EMEa56Yow12bxlNzhXYejVpR4o"
export EXPO_PUBLIC_APP_ENV=production

# Clean build
cd android
./gradlew clean

# Build release APK (matches preview profile)
./gradlew :app:assembleRelease

# OR build release AAB (matches production profile)
./gradlew :app:bundleRelease
```

**What this tests:**
✅ All Kotlin compilation
✅ Java/Kotlin JVM compatibility
✅ R and BuildConfig generation
✅ Package naming
✅ All Gradle configurations
✅ Full asset bundling
✅ ProGuard/R8 optimization

**Output locations:**
- APK: `android/app/build/outputs/apk/release/app-release.apk`
- AAB: `android/app/build/outputs/bundle/release/app-release.aab`

### Method 3: EAS Local Build (Most Accurate)

Run the exact EAS build environment locally using Docker:

```bash
cd /Users/admin/Documents/GitHub/erp_school/mobile/erp-mobile

# Build locally with EAS (requires Docker)
eas build --platform android --profile preview --local

# For production bundle
eas build --platform android --profile production --local
```

**What this tests:**
✅ Everything (100% matches EAS cloud build)
✅ Same Node version (20.19.4)
✅ Same build environment
✅ Same Gradle commands

**Note**: Requires Docker Desktop and can take 20-30 minutes.

## Quick Pre-Flight Checks

Run these before any build:

```bash
cd /Users/admin/Documents/GitHub/erp_school/mobile/erp-mobile

# 1. Check dependencies
npx expo-doctor

# 2. Verify package.json versions
cat package.json | grep -E "(expo|react-native|babel-preset-expo)"

# 3. Check TypeScript errors
npx tsc --noEmit

# 4. Validate Android configuration
cat android/app/build.gradle | grep -E "(namespace|applicationId|jvmTarget)"
```

## Common Issues & Solutions

### Issue: "Cannot find module 'babel-preset-expo'"
**Solution:**
```bash
npm install --save-dev babel-preset-expo
```

### Issue: "Unresolved reference 'BuildConfig'"
**Solution:** Already fixed in the codebase
- Check `MainActivity.kt` has: `import com.campushoster.mobile.BuildConfig`
- Check `MainApplication.kt` has: `import com.campushoster.mobile.BuildConfig`

### Issue: JVM target compatibility
**Solution:** Already fixed in the codebase
- Check `android/build.gradle` has global JVM 17 config
- Check `android/app/build.gradle` has `jvmTarget = '17'`

### Issue: Build fails with "Task failed with an exception"
**Solution:**
```bash
# Clean everything
cd android
./gradlew clean
rm -rf build
rm -rf app/build
cd ..
rm -rf node_modules
npm install
```

## Recommended Testing Flow

**Before first EAS build:**

1. ✅ Run `npx expo-doctor` (5 seconds)
2. ✅ Run `npx expo start --clear` (2 minutes)
3. ✅ Run `./gradlew :app:assembleRelease` (15 minutes)
4. ✅ Test the APK on a real device or emulator

**Before subsequent EAS builds:**

1. ✅ Run `npx expo-doctor` (5 seconds)
2. ✅ Quick Metro check: `npx expo start --clear` (2 minutes)

## Testing the Built APK

### Install on Physical Device (via ADB)
```bash
# Connect device via USB (enable USB debugging)
adb devices  # Verify device is connected

# Install the APK
adb install android/app/build/outputs/apk/release/app-release.apk

# View logs while running
adb logcat | grep ReactNative
```

### Test on Android Emulator
```bash
# List available emulators
emulator -list-avds

# Start emulator
emulator -avd <device_name>

# Install APK
adb install android/app/build/outputs/apk/release/app-release.apk
```

## Current Build Status

All configurations have been fixed:
- ✅ `babel-preset-expo` installed
- ✅ JVM 17 configured globally
- ✅ Package names: `com.campushoster.mobile`
- ✅ BuildConfig imports added
- ✅ Node 20.19.4 in EAS config
- ✅ All SDK versions updated
- ✅ **New Architecture enabled** (required by react-native-reanimated)

**Ready for EAS Build!** 🚀

---

## Quick Start (No Java/Android Setup Required)

If you just want to validate without installing Java/Android SDK locally:

1. **Push the changes** (newArchEnabled=true is now set)
2. **Use EAS Build** which has all tools pre-installed
3. **Monitor the build logs** on expo.dev

The `newArchEnabled=true` fix should resolve the Reanimated error.
