# CampusHoster Mobile - Permissions Documentation

This document explains all permissions requested by the CampusHoster mobile app and their justifications for Google Play Store review.

---

## 📱 Android Permissions

### ✅ Approved Permissions (Currently Used)

#### 1. **CAMERA**
```xml
<uses-permission android:name="android.permission.CAMERA"/>
```
**Why we need it**:
- Take photos for profile pictures
- Capture images for assignment submissions
- Upload photos for school activities

**User flow**:
1. User taps on profile picture → "Change Photo" → "Take Photo"
2. User submits assignment → "Upload Photo" → "Take Photo"
3. App requests camera permission at runtime
4. User can deny and still use app (optional feature)

**Play Console Justification**:
"This app uses the camera to let teachers and students take photos for profile pictures and assignment submissions."

---

#### 2. **READ_EXTERNAL_STORAGE**
```xml
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE"/>
```
**Why we need it**:
- Access photo gallery to upload existing images
- Select documents for assignment submissions
- Access saved files for profile pictures

**User flow**:
1. User wants to upload photo → "Choose from Gallery"
2. App requests storage permission
3. User selects image from gallery
4. Image is uploaded to Supabase storage

**Play Console Justification**:
"This app needs to access your photo library to let you select and upload images for assignments and profile pictures."

**Android Version Compatibility**:
- Android 9 and below: Uses READ_EXTERNAL_STORAGE
- Android 10-12: Uses scoped storage (no permission needed for own files)
- Android 13+: Uses READ_MEDIA_IMAGES (granular permission)

---

#### 3. **READ_MEDIA_IMAGES** (Android 13+)
```xml
<uses-permission android:name="android.permission.READ_MEDIA_IMAGES"/>
```
**Why we need it**:
- Modern replacement for READ_EXTERNAL_STORAGE on Android 13+
- More privacy-focused (only accesses images, not all files)
- Required for selecting photos from gallery on newer Android versions

**Play Console Justification**:
"This app needs access to your images to let you upload photos for assignments and profile pictures on Android 13 and above."

---

#### 4. **POST_NOTIFICATIONS** (Android 13+)
```xml
<uses-permission android:name="android.permission.POST_NOTIFICATIONS"/>
```
**Why we need it**:
- **Required** for Android 13+ to send push notifications
- Notify users about school announcements
- Alert for assignment deadlines
- Attendance notifications
- Grade updates

**User flow**:
1. User logs in for first time
2. App requests notification permission (Android 13+)
3. User can allow or deny
4. User can change in Settings later

**Play Console Justification**:
"This app sends notifications to keep you updated about school announcements, assignments, grades, and important events."

**Types of Notifications**:
- 🔔 School announcements
- 📚 Assignment reminders
- ✅ Attendance alerts
- 📊 Grade updates
- 📅 Calendar events

---

#### 5. **INTERNET**
```xml
<uses-permission android:name="android.permission.INTERNET"/>
```
**Why we need it**:
- Connect to Supabase backend
- Fetch student data, grades, attendance
- Upload images and documents
- Real-time data synchronization

**Automatically granted** (no user prompt needed)

**Play Console Justification**:
"This app requires internet access to sync data with school servers and provide real-time updates."

---

#### 6. **VIBRATE**
```xml
<uses-permission android:name="android.permission.VIBRATE"/>
```
**Why we need it**:
- Haptic feedback when receiving notifications
- User experience enhancement (button presses, confirmations)

**Automatically granted** (no user prompt needed)

**Play Console Justification**:
"This app uses vibration for notification alerts and haptic feedback."

---

#### 7. **RECEIVE_BOOT_COMPLETED**
```xml
<uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED"/>
```
**Why we need it**:
- Restart notification listeners after device reboot
- Ensure users continue receiving important school notifications
- Required by expo-notifications

**Automatically granted** (no user prompt needed)

**Play Console Justification**:
"This app needs to restart notification services after device reboot to ensure you receive important school updates."

---

#### 8. **WAKE_LOCK**
```xml
<uses-permission android:name="android.permission.WAKE_LOCK"/>
```
**Why we need it**:
- Keep device awake when processing notifications
- Background sync of important data
- Required by expo-notifications and updates

**Automatically granted** (no user prompt needed)

**Play Console Justification**:
"This app uses wake locks to deliver time-sensitive notifications and sync important school data."

---

#### 9. **USE_BIOMETRIC**
```xml
<uses-permission android:name="android.permission.USE_BIOMETRIC"/>
```
**Why we need it**:
- Optional biometric authentication (fingerprint/face unlock)
- Enhanced security for accessing sensitive student data
- Quick login for returning users

**User flow**:
1. User logs in successfully
2. App offers to enable biometric login (optional)
3. User can enable/disable in Settings
4. Next login uses fingerprint/face

**Play Console Justification**:
"This app offers optional biometric authentication (fingerprint or face recognition) for secure and convenient login."

---

#### 10. **SYSTEM_ALERT_WINDOW**
```xml
<uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW"/>
```
**Why we need it**:
- Required by React Native for development overlay
- Used by expo-updates for update prompts
- **Auto-removed in production builds** by EAS

**Play Console Justification**:
"This permission is required by the app framework and is automatically removed in production builds."

---

### ❌ Removed/Blocked Permissions

#### RECORD_AUDIO ❌
**Why removed**: Not used in the app. Could trigger rejection if listed without justification.

#### WRITE_EXTERNAL_STORAGE ❌
**Why removed**:
- Deprecated for Android 10+ (scoped storage)
- Not needed with modern Android storage access
- Google recommends removing

#### USE_FINGERPRINT ❌
**Why removed**:
- Deprecated since Android 9
- Replaced by USE_BIOMETRIC
- Google Play warns about deprecated permissions

---

## 🍎 iOS Permissions (Info.plist)

### NSCameraUsageDescription
**Value**: "This app uses the camera to upload profile pictures and assignment photos."

**When prompted**: User taps camera button to take photo

---

### NSPhotoLibraryUsageDescription
**Value**: "This app needs access to photo library to upload images for assignments and profile pictures."

**When prompted**: User selects "Choose from Library"

---

### NSUserNotificationsUsageDescription
**Value**: "This app uses notifications to keep you updated about school announcements, assignments, and important events."

**When prompted**: First app launch or when requesting notification permission

---

## 📋 Google Play Console - Permission Declaration Form

When submitting to Google Play, you'll need to fill out the **Permission Declaration Form**. Here's how to answer:

### Camera Permission
- **Is this permission necessary?** Yes
- **Primary use case**: Profile pictures and assignment submissions
- **Alternative if denied**: Users can skip photo upload (app still works)

### Storage/Photos Permission
- **Is this permission necessary?** Yes
- **Primary use case**: Upload images from gallery for assignments and profiles
- **Alternative if denied**: Users can only take new photos with camera
- **Data retained?** Images are stored on secure Supabase servers, not on device

### Notifications Permission
- **Is this permission necessary?** Yes
- **Primary use case**: Important school updates, assignments, grades
- **User control**: Users can disable notifications in app settings or system settings
- **Types of notifications**: School announcements, assignment reminders, attendance alerts, grade updates

### Biometric Permission (Optional)
- **Is this permission necessary?** No (optional)
- **Primary use case**: Quick and secure login
- **Alternative if denied**: Standard email/password login

---

## 🔐 Privacy & Security Best Practices

### Data Handling
- ✅ All uploaded images stored securely on Supabase Storage
- ✅ Images only accessible by authorized users (RLS policies)
- ✅ No data shared with third parties
- ✅ Users can delete their data anytime

### Permission Requests
- ✅ Permissions requested at runtime (not on app install)
- ✅ Clear context provided before requesting
- ✅ App works with denied permissions (graceful degradation)
- ✅ Users can change permissions in Settings

### Notification Privacy
- ✅ Users can opt-out of notifications
- ✅ No tracking or analytics in notifications
- ✅ Only school-related content
- ✅ No third-party notification services (using Expo Push only)

---

## 🎯 Play Store Review Tips

### Common Rejection Reasons (And How We Avoid Them)

❌ **Requesting unnecessary permissions**
✅ We only request permissions actually used in the app

❌ **Missing permission descriptions**
✅ All permissions have clear descriptions in app.config.js

❌ **Using deprecated permissions**
✅ We removed USE_FINGERPRINT and WRITE_EXTERNAL_STORAGE

❌ **Not justifying dangerous permissions**
✅ This document provides clear justification for all permissions

❌ **Permissions not matching functionality**
✅ Camera/Storage used for images, Notifications for alerts - all match app purpose

---

## 📝 Submission Checklist

When submitting to Google Play, ensure:

- [ ] All permission descriptions are filled in app.config.js
- [ ] Privacy Policy explains what data each permission accesses
- [ ] App demonstrates use of each permission during review
- [ ] Permissions are requested at runtime (not all at once)
- [ ] App works gracefully if user denies permissions
- [ ] No deprecated permissions in manifest
- [ ] Dangerous permissions are justified in Play Console form

---

## 🔄 Testing Permission Flows

Before submission, test these scenarios:

### Camera Permission
1. ✅ Request camera → Allow → Take photo → Upload works
2. ✅ Request camera → Deny → Show error → Offer gallery instead
3. ✅ Denied → Go to Settings → Enable → Retry works

### Storage Permission
1. ✅ Request storage → Allow → Select photo → Upload works
2. ✅ Request storage → Deny → Show error → Offer camera instead

### Notifications Permission (Android 13+)
1. ✅ App requests on first launch or when user enables notifications
2. ✅ Deny → No notifications → App still works
3. ✅ Allow → Receive test notification

### Biometric Permission
1. ✅ Offered after first login
2. ✅ Deny → Standard login still works
3. ✅ Allow → Fingerprint login works

---

## Summary

**Total Permissions**: 10 (8 Android + 3 iOS descriptions)
**Dangerous Permissions** (require user approval): 5
- CAMERA
- READ_EXTERNAL_STORAGE
- READ_MEDIA_IMAGES (Android 13+)
- POST_NOTIFICATIONS (Android 13+)
- USE_BIOMETRIC

**Normal Permissions** (auto-granted): 5
- INTERNET
- VIBRATE
- RECEIVE_BOOT_COMPLETED
- WAKE_LOCK
- SYSTEM_ALERT_WINDOW

All permissions are properly justified and documented for Google Play Store approval.
