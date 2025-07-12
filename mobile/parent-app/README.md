# Parent App - React Native Mobile Application

## Environment Setup

### Required Environment Variables

Create a `.env` file in the root of this project with the following variables:

```env
# Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# App Configuration
EXPO_PUBLIC_APP_ENV=development
```

### Development Setup

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npx expo start
```

3. Run on devices:
- **iOS**: Press `i` to open iOS Simulator
- **Android**: Press `a` to open Android Emulator
- **Web**: Press `w` to open in web browser
- **Physical Device**: Install Expo Go app and scan QR code

### Configuration Notes

- Environment variables must be prefixed with `EXPO_PUBLIC_` to be accessible in the client
- The app will throw an error if required environment variables are missing
- Make sure to configure your Supabase project URL and anon key

### Features

- Parent portal for viewing student information
- Real-time data synchronization with web application
- Secure authentication with Expo SecureStore
- Cross-platform compatibility (iOS, Android, Web) 