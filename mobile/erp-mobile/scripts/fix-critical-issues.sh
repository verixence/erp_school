#!/bin/bash

# CampusHoster Mobile - Critical Issues Fix Script
# This script fixes the most critical production blockers
# Run time: ~30 minutes

set -e  # Exit on error

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "🚀 CampusHoster Mobile - Critical Issues Fix"
echo "============================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

cd "$PROJECT_ROOT"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: package.json not found. Are you in the mobile app directory?${NC}"
    exit 1
fi

echo -e "${YELLOW}📋 This script will fix:${NC}"
echo "1. Security: Keystore password exposure"
echo "2. Security: Add keystore to .gitignore"
echo "3. Dependencies: Update outdated packages"
echo "4. Network: Add offline detection"
echo "5. Monitoring: Install Sentry (you'll need to configure DSN)"
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
fi

# ============================================
# 1. FIX KEYSTORE SECURITY
# ============================================
echo ""
echo -e "${YELLOW}🔐 Step 1: Fixing keystore security...${NC}"

# Create gradle.properties if it doesn't exist
if [ ! -f "android/gradle.properties" ]; then
    echo "Creating android/gradle.properties..."
    cat > android/gradle.properties << 'EOF'
# Keystore credentials (DO NOT COMMIT THIS FILE)
RELEASE_STORE_PASSWORD=campushoster2025
RELEASE_KEY_PASSWORD=campushoster2025
RELEASE_KEY_ALIAS=campushoster-release
RELEASE_STORE_FILE=keystore/release.keystore
EOF
    echo -e "${GREEN}✅ Created android/gradle.properties${NC}"
else
    echo -e "${YELLOW}⚠️  android/gradle.properties already exists, skipping...${NC}"
fi

# Update .gitignore
echo "Updating .gitignore..."
if ! grep -q "android/gradle.properties" .gitignore; then
    echo "" >> .gitignore
    echo "# Android signing credentials" >> .gitignore
    echo "android/gradle.properties" >> .gitignore
    echo -e "${GREEN}✅ Added android/gradle.properties to .gitignore${NC}"
fi

if ! grep -q "android/app/keystore/" .gitignore; then
    echo "android/app/keystore/" >> .gitignore
    echo -e "${GREEN}✅ Added android/app/keystore/ to .gitignore${NC}"
fi

# Backup build.gradle
echo "Backing up android/app/build.gradle..."
cp android/app/build.gradle android/app/build.gradle.backup

# Update build.gradle to use environment variables
echo "Updating android/app/build.gradle..."
cat > /tmp/build.gradle.sed << 'EOF'
/signingConfigs {/,/^[[:space:]]*}/ {
    /release {/,/^[[:space:]]*}/ {
        s/storePassword 'campushoster2025'/storePassword project.findProperty("RELEASE_STORE_PASSWORD") ?: System.getenv("RELEASE_STORE_PASSWORD")/
        s/keyPassword 'campushoster2025'/keyPassword project.findProperty("RELEASE_KEY_PASSWORD") ?: System.getenv("RELEASE_KEY_PASSWORD")/
    }
}
EOF

# Note: Manual update required
echo -e "${YELLOW}⚠️  MANUAL ACTION REQUIRED:${NC}"
echo "Please update android/app/build.gradle lines 108-111:"
echo ""
echo "FROM:"
echo "    storePassword 'campushoster2025'"
echo "    keyPassword 'campushoster2025'"
echo ""
echo "TO:"
echo "    storePassword project.findProperty(\"RELEASE_STORE_PASSWORD\") ?: System.getenv(\"RELEASE_STORE_PASSWORD\")"
echo "    keyPassword project.findProperty(\"RELEASE_KEY_PASSWORD\") ?: System.getenv(\"RELEASE_KEY_PASSWORD\")"
echo ""

# ============================================
# 2. UPDATE PACKAGES
# ============================================
echo ""
echo -e "${YELLOW}📦 Step 2: Updating outdated packages...${NC}"

echo "Running expo install --check..."
npx expo install --check || true

echo "Fixing package versions..."
npx expo install @expo/vector-icons expo expo-constants react-native

echo -e "${GREEN}✅ Packages updated${NC}"

# ============================================
# 3. ADD OFFLINE DETECTION
# ============================================
echo ""
echo -e "${YELLOW}🌐 Step 3: Adding offline detection...${NC}"

echo "Installing @react-native-community/netinfo..."
npx expo install @react-native-community/netinfo

echo "Installing Sentry for error tracking..."
npx expo install @sentry/react-native

echo -e "${GREEN}✅ Packages installed${NC}"

# ============================================
# 4. CREATE ERROR BOUNDARY
# ============================================
echo ""
echo -e "${YELLOW}🛡️  Step 4: Creating global error boundary...${NC}"

mkdir -p src/components/common

cat > src/components/common/ErrorBoundary.tsx << 'EOF'
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { AlertCircle } from 'lucide-react-native';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    // TODO: Send to error tracking service (Sentry)
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <AlertCircle size={64} color="#EF4444" />
          <Text style={styles.title}>Oops! Something went wrong</Text>
          <Text style={styles.message}>
            We're sorry for the inconvenience. Please try restarting the app.
          </Text>
          <TouchableOpacity
            style={styles.button}
            onPress={() => this.setState({ hasError: false, error: null })}
          >
            <Text style={styles.buttonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#F9FAFB',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  message: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  button: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
EOF

echo -e "${GREEN}✅ Created ErrorBoundary component${NC}"

# ============================================
# 5. UPDATE QUERY PROVIDER
# ============================================
echo ""
echo -e "${YELLOW}⚡ Step 5: Updating QueryProvider with offline support...${NC}"

cat > src/contexts/QueryProvider.tsx << 'EOF'
import React, { useEffect } from 'react';
import { QueryClient, QueryClientProvider, onlineManager } from '@tanstack/react-query';
import NetInfo from '@react-native-community/netinfo';

// Configure online manager to use NetInfo
onlineManager.setEventListener(setOnline => {
  return NetInfo.addEventListener(state => {
    setOnline(!!state.isConnected);
  });
});

// Create query client with production-ready defaults
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Retry failed requests
      retry: 3,
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),

      // Handle offline scenarios
      networkMode: 'offlineFirst',

      // Cache for 5 minutes
      staleTime: 5 * 60 * 1000,

      // Refetch on reconnect
      refetchOnReconnect: true,
      refetchOnWindowFocus: false,
    },
    mutations: {
      // Retry mutations once
      retry: 1,
      networkMode: 'offlineFirst',
    },
  },
});

interface QueryProviderProps {
  children: React.ReactNode;
}

export const QueryProvider: React.FC<QueryProviderProps> = ({ children }) => {
  useEffect(() => {
    // Log online/offline status changes
    const unsubscribe = NetInfo.addEventListener(state => {
      console.log('Network status:', state.isConnected ? 'Online' : 'Offline');
    });

    return () => unsubscribe();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};
EOF

echo -e "${GREEN}✅ Updated QueryProvider with offline support${NC}"

# ============================================
# 6. ADD OFFLINE INDICATOR
# ============================================
echo ""
echo -e "${YELLOW}📡 Step 6: Creating offline indicator component...${NC}"

cat > src/components/common/OfflineIndicator.tsx << 'EOF'
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNetInfo } from '@react-native-community/netinfo';
import { WifiOff } from 'lucide-react-native';

export const OfflineIndicator: React.FC = () => {
  const netInfo = useNetInfo();

  if (netInfo.isConnected !== false) {
    return null;
  }

  return (
    <View style={styles.container}>
      <WifiOff size={16} color="#FFFFFF" />
      <Text style={styles.text}>No Internet Connection</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#EF4444',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 8,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
EOF

echo -e "${GREEN}✅ Created OfflineIndicator component${NC}"

# ============================================
# 7. ADD PROGUARD RULES
# ============================================
echo ""
echo -e "${YELLOW}🔒 Step 7: Adding ProGuard rules...${NC}"

cat >> android/app/proguard-rules.pro << 'EOF'

# ============================================
# Production Rules for CampusHoster Mobile
# ============================================

# Supabase
-keep class io.supabase.** { *; }
-keep class com.supabase.** { *; }

# React Native
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
-dontwarn com.facebook.react.**

# Async Storage
-keep class com.reactnativecommunity.asyncstorage.** { *; }

# Expo modules
-keep class expo.modules.** { *; }

# React Navigation
-keep class com.swmansion.reanimated.** { *; }
-keep class com.th3rdwave.safeareacontext.** { *; }

# Sentry
-keep class io.sentry.** { *; }
-dontwarn io.sentry.**

# Keep native methods
-keepclassmembers class * {
    native <methods>;
}
EOF

echo -e "${GREEN}✅ Added ProGuard rules${NC}"

# ============================================
# 8. ENABLE BUILD OPTIMIZATIONS
# ============================================
echo ""
echo -e "${YELLOW}⚡ Step 8: Enabling build optimizations...${NC}"

if ! grep -q "android.enableMinifyInReleaseBuilds" android/gradle.properties; then
    echo "" >> android/gradle.properties
    echo "# Production optimizations" >> android/gradle.properties
    echo "android.enableMinifyInReleaseBuilds=true" >> android/gradle.properties
    echo "android.enableShrinkResourcesInReleaseBuilds=true" >> android/gradle.properties
    echo -e "${GREEN}✅ Enabled code minification and resource shrinking${NC}"
else
    echo -e "${YELLOW}⚠️  Build optimizations already configured${NC}"
fi

# ============================================
# SUMMARY
# ============================================
echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}✅ Critical fixes applied successfully!${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo -e "${YELLOW}📋 MANUAL STEPS REQUIRED:${NC}"
echo ""
echo "1. Update android/app/build.gradle (lines 108-111)"
echo "   Replace hardcoded passwords with:"
echo "   storePassword project.findProperty(\"RELEASE_STORE_PASSWORD\")"
echo ""
echo "2. Update App.tsx to include ErrorBoundary and OfflineIndicator:"
echo ""
echo "   import { ErrorBoundary } from './src/components/common/ErrorBoundary';"
echo "   import { OfflineIndicator } from './src/components/common/OfflineIndicator';"
echo ""
echo "   export default function App() {"
echo "     return ("
echo "       <ErrorBoundary>"
echo "         <SafeAreaProvider>"
echo "           <OfflineIndicator />"
echo "           <AppNavigator />"
echo "         </SafeAreaProvider>"
echo "       </ErrorBoundary>"
echo "     );"
echo "   }"
echo ""
echo "3. Configure Sentry (create account at sentry.io):"
echo "   - Get your DSN"
echo "   - Add to App.tsx:"
echo ""
echo "   import * as Sentry from '@sentry/react-native';"
echo ""
echo "   Sentry.init({"
echo "     dsn: 'your-sentry-dsn',"
echo "     environment: process.env.NODE_ENV,"
echo "   });"
echo ""
echo "4. Commit your changes:"
echo "   git add ."
echo "   git commit -m \"fix: critical security and reliability improvements\""
echo ""
echo -e "${YELLOW}📦 NEXT STEPS:${NC}"
echo "1. Test the app: npm start"
echo "2. Build preview: eas build --platform android --profile preview"
echo "3. Test offline scenarios"
echo "4. Review PRODUCTION_READINESS_REPORT.md for remaining items"
echo ""
echo -e "${GREEN}Done! 🎉${NC}"
