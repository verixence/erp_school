const IS_PRODUCTION = process.env.EAS_BUILD_PROFILE === 'production';
const IS_PREVIEW = process.env.EAS_BUILD_PROFILE === 'preview';

export default {
  expo: {
    owner: 'campushoster',
    name: IS_PRODUCTION ? 'CampusHoster' : 'CampusHoster (Dev)',
    slug: 'campushoster',
    version: '1.1.1',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'automatic',
    splash: {
      image: './assets/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff'
    },
    assetBundlePatterns: ['**/*'],
    ios: {
      supportsTablet: true,
      bundleIdentifier: IS_PRODUCTION
        ? 'com.campushoster.mobile'
        : 'com.campushoster.mobile.dev',
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
        backgroundColor: '#ffffff'
      },
      package: IS_PRODUCTION
        ? 'com.campushoster.mobile'
        : 'com.campushoster.mobile.dev',
      googleServicesFile: IS_PRODUCTION
        ? './google-services-prod.json'
        : './google-services-dev.json',
      versionCode: 8,
      permissions: [
        'android.permission.CAMERA',
        'android.permission.READ_EXTERNAL_STORAGE',
        'android.permission.READ_MEDIA_IMAGES',
        'android.permission.VIBRATE',
        'android.permission.RECEIVE_BOOT_COMPLETED',
        'android.permission.WAKE_LOCK',
        'android.permission.USE_BIOMETRIC',
        'android.permission.POST_NOTIFICATIONS'
      ],
      blockedPermissions: [
        'android.permission.RECORD_AUDIO',
        'android.permission.WRITE_EXTERNAL_STORAGE'
      ],
      softwareKeyboardLayoutMode: 'pan',
      statusBar: {
        backgroundColor: '#ffffff',
        barStyle: 'dark-content',
        translucent: false
      }
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
        projectId: 'cd4178e9-7c6b-454a-adc6-b965118df79d'
      },
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
      environment: IS_PRODUCTION ? 'production' : IS_PREVIEW ? 'preview' : 'development'
    },
    runtimeVersion: '1.0.0'
  }
};