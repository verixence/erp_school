# ERP School Mobile App

A unified mobile application for the ERP School platform, combining Teacher and Parent portals into one seamless mobile experience.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm/yarn
- Expo CLI: `npm install -g @expo/cli`
- iOS Simulator (for iOS development)
- Android Studio (for Android development)

### Installation

1. **Clone and navigate to the mobile app directory:**
   ```bash
   cd mobile/erp-mobile
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your Supabase credentials
   ```

4. **Start the development server:**
   ```bash
   npm start
   ```

5. **Run on device/simulator:**
   - Press `i` for iOS Simulator
   - Press `a` for Android Emulator  
   - Scan QR code with Expo Go app on physical device

## 🎯 Features

### 👨‍🏫 Teacher Portal
- **Dashboard**: Overview with stats, quick actions, and recent activity
- **Attendance Management**: Mark attendance for assigned classes
- **Timetable**: View personal teaching schedule
- **Homework Management**: Create, assign, and track homework
- **Marks Entry**: Enter examination marks
- **Exam Management**: Manage exam schedules and papers
- **Announcements**: Create and share announcements
- **Co-Scholastic**: Manage co-scholastic assessments
- **Community**: Participate in school community discussions
- **Feedback**: View feedback from students and parents
- **Gallery**: Upload and manage media content

### 👨‍👩‍👧‍👦 Parent Portal
- **Dashboard**: Multi-child overview with key metrics
- **Attendance Tracking**: Monitor children's daily attendance
- **Timetable**: View children's class schedules
- **Homework Tracker**: Track homework assignments and deadlines
- **Exam Results**: View exam schedules and results
- **Report Cards**: Download academic report cards
- **Announcements**: Stay updated with school announcements
- **Calendar**: View academic calendar and events
- **Community**: Engage with school community
- **Feedback**: Send feedback to school administration
- **Gallery**: Browse school event photos

### 🔔 Push Notifications
- Real-time notifications for important updates
- Role-specific notification preferences
- Support for foreground, background, and terminated app states

## 🛠 Technology Stack

- **Framework**: React Native with Expo SDK
- **Language**: TypeScript
- **Authentication**: Supabase Auth
- **Database**: Supabase PostgreSQL
- **State Management**: React Query
- **Navigation**: React Navigation v6
- **Styling**: TailwindCSS with NativeWind
- **Icons**: Lucide React Native
- **Notifications**: Expo Notifications

## 📱 Screenshots

*Screenshots will be added once the app is fully implemented*

## 🔧 Development

### Project Structure
```
src/
├── components/
│   ├── ui/           # Reusable UI components
│   ├── forms/        # Form components
│   └── common/       # Common components
├── screens/
│   ├── auth/         # Authentication screens
│   ├── teacher/      # Teacher portal screens
│   ├── parent/       # Parent portal screens
│   └── shared/       # Shared screens
├── navigation/       # Navigation configuration
├── services/         # API and external services
├── contexts/         # React contexts
├── hooks/           # Custom hooks
├── types/           # TypeScript definitions
└── utils/           # Utility functions
```

### Key Components

#### Authentication
- Role-based login system
- Automatic session management
- Secure token storage with AsyncStorage

#### Navigation
- Bottom tab navigation for main sections
- Stack navigation for detailed screens
- Role-based routing (Teacher vs Parent)

#### UI Components
- **Button**: Multiple variants with loading states
- **Card**: Flexible card components for content sections
- **Input**: Form inputs with validation and error handling
- **PlaceholderScreen**: Consistent placeholder for feature screens

### Environment Variables
```bash
EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 🚀 Deployment

### Development Build
```bash
npm run android  # Android development build
npm run ios      # iOS development build
npm run web      # Web development build
```

### Production Build with EAS
1. **Install EAS CLI:**
   ```bash
   npm install -g eas-cli
   ```

2. **Login to Expo:**
   ```bash
   eas login
   ```

3. **Configure EAS:**
   ```bash
   eas build:configure
   ```

4. **Build for production:**
   ```bash
   eas build --platform all --profile production
   ```

### App Store Deployment
- **iOS**: Submit to Apple App Store via App Store Connect
- **Android**: Submit to Google Play Store via Google Play Console

## 🧪 Testing

### Manual Testing
```bash
npm run test:manual  # Run manual test checklist
```

### Device Testing
- Test on multiple iOS devices (iPhone, iPad)
- Test on multiple Android devices (various screen sizes)
- Test push notifications on physical devices

## 📋 Roadmap

### Phase 1: Core Features (Week 1-2)
- [ ] Complete attendance system
- [ ] Implement homework management
- [ ] Add timetable functionality
- [ ] Build exam and results system

### Phase 2: Data Integration (Week 2-3)
- [ ] Connect to existing Supabase database
- [ ] Implement real-time data synchronization
- [ ] Add offline support for critical features

### Phase 3: Advanced Features (Week 3-4)
- [ ] File upload/download functionality
- [ ] Advanced calendar integration
- [ ] Enhanced push notification system
- [ ] Performance optimizations

### Phase 4: Production Ready (Week 4-5)
- [ ] Comprehensive testing
- [ ] UI/UX polish and animations
- [ ] App store submission
- [ ] Production deployment

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Commit changes: `git commit -am 'Add new feature'`
4. Push to branch: `git push origin feature/new-feature`
5. Submit a pull request

## 📄 License

This project is part of the ERP School platform. All rights reserved.

## 📞 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation in `/docs`

---

**Built with ❤️ for modern education management** 