# CampusHoster Mobile - Google Play Store Deployment Guide

This guide will walk you through deploying the CampusHoster mobile app to Google Play Store using EAS (Expo Application Services).

## ✅ What's Already Configured

The following production configurations have been completed:

### Build Configuration
- ✅ **Package Name**: `com.campushoster.mobile` (production) / `com.campushoster.mobile.dev` (dev)
- ✅ **App Name**: CampusHoster
- ✅ **Version**: 1.0.0 (versionCode: 1)
- ✅ **Build Optimization**: Code minification and resource shrinking enabled
- ✅ **Hermes Engine**: Enabled for better performance

### Credentials & Environment
- ✅ **EAS Credentials**: Configured to auto-manage keystores
- ✅ **Production Environment Variables**: Supabase URL and anon key configured
- ✅ **Build Profiles**: Development, Preview, and Production configured

### App Assets
- ✅ **App Icon**: CampusHoster logo configured
- ✅ **Splash Screen**: Configured with brand colors
- ✅ **Adaptive Icons**: Android adaptive icons configured

---

## Prerequisites

✅ **Completed:**
- [x] Expo Developer Account (expo.dev)
- [x] EAS CLI installed globally (`npm install -g eas-cli`)
- [x] App configuration updated for production
- [x] Environment variables configured

## 🚀 Step-by-Step Deployment Process

### Step 1: Set Up Your EAS Project

1. **Login to EAS** (if not already logged in):
```bash
eas login
```

2. **Initialize your EAS project**:
```bash
eas project:init
```
- When prompted, create a new project
- This will generate a unique project ID and update your `app.config.js`

3. **Link your local project to EAS**:
```bash
eas project:info
```

### Step 2: Configure Environment Variables

Set up your environment variables for different build profiles:

```bash
# Production environment variables
eas secret:create --scope project --name SUPABASE_URL --value "https://pyzdfteicahfzyuoxgwg.supabase.co"
eas secret:create --scope project --name SUPABASE_ANON_KEY --value "your-supabase-anon-key"
eas secret:create --scope project --name EXPO_PROJECT_ID --value "your-expo-project-id"
```

### Step 3: Update EAS Configuration

Your `eas.json` has been configured with three build profiles:

- **development**: For testing with Expo Go
- **preview**: Internal testing builds (APK for Android)
- **production**: App store ready builds (AAB for Android, IPA for iOS)

### Step 4: Build for Android

#### Preview Build (APK for testing):
```bash
eas build --platform android --profile preview
```

#### Production Build (AAB for Google Play Store):
```bash
eas build --platform android --profile production
```

### Step 5: Build for iOS

#### Production Build (IPA for App Store):
```bash
eas build --platform ios --profile production
```

**Note**: For iOS builds, you'll need:
- Apple Developer Account ($99/year)
- App Store Connect access
- Proper certificates and provisioning profiles (EAS handles this automatically)

### Step 6: Test Your Builds

1. **Download the build** from the EAS dashboard or use:
```bash
eas build:list
```

2. **Install and test** the preview build on physical devices

3. **Verify all features work** including:
   - User authentication
   - Push notifications
   - Camera/photo uploads
   - All navigation flows
   - Offline functionality

### Step 7: Submit to App Stores

#### Android (Google Play Store):
```bash
eas submit --platform android --profile production
```

#### iOS (App Store):
```bash
eas submit --platform ios --profile production
```

## 📱 App Store Requirements

### Google Play Store Requirements
- **App Bundle**: ✅ Configured to build AAB
- **Target API Level**: 34 (Android 14)
- **Permissions**: ✅ All required permissions configured
- **App Signing**: Let Google Play manage (recommended)
- **Package Name**: `com.campushoster.mobile`

### Required Before Submission
- [ ] **Feature Graphic**: Create 1024x500px graphic
- [ ] **Screenshots**: Capture 2-8 screenshots from app
- [ ] **Privacy Policy**: Create and host publicly
- [ ] **App Description**: Write short (80 chars) and full description
- [ ] **Content Rating**: Complete questionnaire in Play Console
- [ ] **Google Play Developer Account**: $25 one-time fee

## 🔐 Security Checklist

- [x] Environment variables configured
- [x] Hardcoded credentials removed
- [x] Proper bundle identifiers set
- [x] Permissions properly configured
- [x] API keys secured

## 📋 Pre-Submission Checklist

### Functionality
- [ ] All screens load properly
- [ ] User authentication works
- [ ] Push notifications deliver
- [ ] Camera and photo picker work
- [ ] Data syncs with Supabase
- [ ] Offline functionality works
- [ ] App doesn't crash on common actions

### App Store Requirements
- [ ] App icons (all required sizes)
- [ ] Splash screen displays correctly
- [ ] Privacy policy URL
- [ ] App description and keywords
- [ ] Screenshots for all device sizes
- [ ] Age rating classification

### Android Specific
- [ ] Adaptive icon displays correctly
- [ ] All Android permissions justified
- [ ] App bundle size < 150MB
- [ ] Tested on different Android versions

### iOS Specific
- [ ] iPhone and iPad compatibility
- [ ] All iOS permissions justified
- [ ] App Store Connect metadata
- [ ] TestFlight testing completed

## 🚨 Common Issues & Solutions

### Build Failures
- **Metro bundler errors**: Clear cache with `npx expo start --clear`
- **Native dependencies**: Ensure all packages are compatible
- **Environment variables**: Verify all secrets are set correctly

### Push Notifications
- **iOS**: Ensure you have Apple Push Notification service certificate
- **Android**: Configure Firebase Cloud Messaging (if needed)
- **Testing**: Use Expo push notification tool for testing

### App Store Rejections
- **Privacy**: Ensure privacy policy covers all data collection
- **Permissions**: Justify all requested permissions
- **Functionality**: App must work as described

## 📞 Support Resources

- **EAS Documentation**: https://docs.expo.dev/eas/
- **Expo Forums**: https://forums.expo.dev/
- **App Store Guidelines**: 
  - [Apple](https://developer.apple.com/app-store/review/guidelines/)
  - [Google Play](https://developer.android.com/distribute/best-practices/develop/guidelines)

## 🔄 Update Process (After Initial Release)

1. **Increment version** in `app.config.js`:
   ```javascript
   version: '1.0.1', // Increment version
   versionCode: 2,   // Increment for Android
   ```

2. **Build new version**:
   ```bash
   eas build --platform all --profile production
   ```

3. **Submit update**:
   ```bash
   eas submit --platform all --profile production
   ```

## 📊 Monitoring & Analytics

Consider adding:
- **Crashlytics**: For crash reporting
- **Analytics**: Track user behavior
- **Performance Monitoring**: Monitor app performance
- **User Feedback**: In-app feedback system

---

**Ready to deploy?** Start with Step 1 and follow the process step by step. Each build will be available in your EAS dashboard at https://expo.dev/