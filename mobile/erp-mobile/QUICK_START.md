# 🚀 Quick Start - Testing Before EAS Build

## ✅ Pre-Flight Checklist (30 seconds)

Run this simple test script before pushing to EAS:

```bash
./scripts/test-build.sh
```

This validates:
- ✅ All dependencies installed
- ✅ babel-preset-expo present
- ✅ Android namespace correct
- ✅ JVM target 17 configured
- ✅ BuildConfig imports present
- ✅ Metro bundler works

## 🎯 Three Testing Options

### Option 1: Quick Test (RECOMMENDED - 2 minutes)

```bash
# Run the validation script
./scripts/test-build.sh
```

**What it tests**: Dependencies, configuration, Metro bundler
**Time**: ~30 seconds
**Good for**: Quick validation before EAS build

---

### Option 2: Full Local Build (15-20 minutes)

**Prerequisites**: Java 17, Android SDK

```bash
# Set environment variables
export EAS_BUILD_PROFILE=production
export EXPO_PUBLIC_SUPABASE_URL="https://pyzdfteicahfzyuoxgwg.supabase.co"
export EXPO_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5emRmdGVpY2FoZnp5dW94Z3dnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA3NjU1MTIsImV4cCI6MjA2NjM0MTUxMn0.LLy0stoEf3vuH33l-EMEa56Yow12bxlNzhXYejVpR4o"
export EXPO_PUBLIC_APP_ENV=production

# Build APK
cd android
./gradlew :app:assembleRelease
```

**Output**: `android/app/build/outputs/apk/release/app-release.apk`
**What it tests**: EVERYTHING (exact build process)
**Good for**: Final validation before first EAS build

---

### Option 3: EAS Local Build (20-30 minutes)

**Prerequisites**: Docker Desktop

```bash
# Build with exact EAS environment locally
eas build --platform android --profile preview --local
```

**What it tests**: 100% identical to EAS cloud build
**Good for**: Debugging EAS-specific issues

---

## 🏃 Fastest Path to EAS Build

If you trust the configuration (recommended):

```bash
# 1. Quick validation (30 seconds)
./scripts/test-build.sh

# 2. If passed, build on EAS
cd /Users/admin/Documents/GitHub/erp_school/mobile/erp-mobile
eas build --platform android --profile preview
```

## 📝 Build Commands Reference

### Preview Build (APK for testing)
```bash
eas build --platform android --profile preview
```
- Builds: APK
- Distribution: Internal testing
- Auto-increment: No

### Production Build (for Play Store)

**IMPORTANT**: Increment version before production builds!

```bash
# 1. Bump version first
./scripts/bump-version.sh

# 2. Then build
eas build --platform android --profile production
```
- Builds: AAB (App Bundle)
- Distribution: Play Store
- Manual versioning: Required (see VERSION_MANAGEMENT.md)

## 🔧 If Build Fails

### Check the logs
```bash
# View latest build
eas build:list

# View specific build logs
eas build:view <build-id>
```

### Common fixes
```bash
# 1. Clear cache and rebuild
npm install
npx expo start --clear

# 2. Verify configuration
./scripts/test-build.sh

# 3. Check EAS configuration
cat eas.json

# 4. Reinstall dependencies
rm -rf node_modules
npm install
```

## 📚 Detailed Documentation

For comprehensive testing guide:
- See: [LOCAL_BUILD_TEST.md](./LOCAL_BUILD_TEST.md)

## ✨ Current Status

All build issues have been resolved:
- ✅ babel-preset-expo installed
- ✅ JVM 17 configured
- ✅ Package names correct (`com.campushoster.mobile`)
- ✅ BuildConfig imports added
- ✅ Node 20.19.4 in EAS
- ✅ All dependencies updated

**Ready for EAS Build!** 🎉
