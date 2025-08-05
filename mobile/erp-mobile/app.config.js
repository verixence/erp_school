const IS_PRODUCTION = process.env.EAS_BUILD_PROFILE === 'production';
const IS_PREVIEW = process.env.EAS_BUILD_PROFILE === 'preview';

export default {
  expo: {
    name: IS_PRODUCTION ? 'ERP School' : 'ERP School (Dev)',
    slug: 'erp-school-mobile',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'automatic',
    splash: {
      image: './assets/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#8b5cf6'
    },
    assetBundlePatterns: ['**/*'],
    ios: {
      supportsTablet: true,
      bundleIdentifier: IS_PRODUCTION 
        ? 'com.erpschool.mobile' 
        : 'com.erpschool.mobile.dev',
      infoPlist: {
        NSCameraUsageDescription: 'This app uses the camera to upload profile pictures and assignment photos.',
        NSPhotoLibraryUsageDescription: 'This app needs access to photo library to upload images for assignments and profile pictures.',
        NSUserNotificationsUsageDescription: 'This app uses notifications to keep you updated about school announcements, assignments, and important events.',
        UIBackgroundModes: ['background-processing', 'background-fetch']
      }
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#8b5cf6'
      },
      package: IS_PRODUCTION 
        ? 'com.erpschool.mobile' 
        : 'com.erpschool.mobile.dev',
      versionCode: 1,
      permissions: [
        'android.permission.CAMERA',
        'android.permission.READ_EXTERNAL_STORAGE',
        'android.permission.WRITE_EXTERNAL_STORAGE',
        'android.permission.RECORD_AUDIO',
        'android.permission.VIBRATE',
        'android.permission.RECEIVE_BOOT_COMPLETED',
        'android.permission.WAKE_LOCK',
        'android.permission.USE_FINGERPRINT',
        'android.permission.USE_BIOMETRIC'
      ]
    },
    web: {
      favicon: './assets/favicon.png'
    },
    plugins: [
      [
        'expo-notifications',
        {
          icon: './assets/notification-icon.png',
          color: '#8b5cf6'
        }
      ],
      [
        'expo-image-picker',
        {
          photosPermission: 'The app accesses your photos to let you upload images for assignments and profile pictures.',
          cameraPermission: 'The app accesses your camera to let you take photos for assignments and profile pictures.'
        }
      ]
    ],
    extra: {
      eas: {
        projectId: "dbfdc387-ef4d-4388-91e1-931baa301673"
      },
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
      environment: IS_PRODUCTION ? 'production' : IS_PREVIEW ? 'preview' : 'development'
    },
    updates: {
      url: "https://u.expo.dev/dbfdc387-ef4d-4388-91e1-931baa301673"
    },
    runtimeVersion: {
      policy: 'sdkVersion'
    }
  }
};