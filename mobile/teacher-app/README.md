# Teacher Mobile App

## Current State

This Expo React Native app is functionally complete but has TypeScript compilation issues that need to be resolved.

## Setup

1. Install Expo CLI globally:
```bash
npm install -g @expo/cli
```

2. Install dependencies:
```bash
cd mobile/teacher-app
npm install
```

## TypeScript Issues

The app currently has TypeScript errors due to:

1. **Missing React Native Types**: Install React Native types:
```bash
npm install --save-dev @types/react-native
```

2. **Missing Expo Types**: Install Expo types:
```bash
npx expo install --save-dev @expo/metro-config
```

3. **Type Conflicts**: The common package exports need to be aligned.

## Features Implemented

- ✅ Authentication (login/logout)
- ✅ Dashboard with KPI cards
- ✅ Attendance marking
- ✅ Homework management
- ✅ Timetable view
- ✅ Settings/Profile

## Running the App

```bash
# Start Metro bundler
npx expo start

# Run on iOS simulator
npx expo start --ios

# Run on Android emulator
npx expo start --android
```

## Architecture

- **Navigation**: Expo Router with tab navigation
- **Styling**: NativeWind (Tailwind for React Native)
- **State Management**: React Query (from @erp/common)
- **API**: Shared Supabase client (from @erp/common)

## Next Steps

1. Resolve TypeScript compilation issues
2. Test on physical devices
3. Add error boundaries
4. Implement offline support
5. Add push notifications 