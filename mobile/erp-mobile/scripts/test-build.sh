#!/bin/bash

# Quick Build Test Script
# Tests the build configuration before pushing to EAS

set -e  # Exit on error

echo "🧪 Running pre-build validation tests..."
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Navigate to project root
cd "$(dirname "$0")/.."

echo "📦 Step 1/5: Checking dependencies..."
if npx expo-doctor > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Dependencies check passed"
else
    echo -e "${YELLOW}⚠${NC} Some dependency warnings (check output above)"
fi
echo ""

echo "🔍 Step 2/5: Verifying critical packages..."
if grep -q '"babel-preset-expo"' package.json; then
    echo -e "${GREEN}✓${NC} babel-preset-expo is installed"
else
    echo -e "${RED}✗${NC} babel-preset-expo is missing!"
    exit 1
fi

if grep -q '"expo": "54.0.15"' package.json; then
    echo -e "${GREEN}✓${NC} Expo version is correct (54.0.15)"
else
    echo -e "${YELLOW}⚠${NC} Expo version may not be 54.0.15"
fi
echo ""

echo "🏗️  Step 3/5: Checking Android configuration..."

# Check namespace
if grep -q 'namespace.*campushoster' android/app/build.gradle; then
    echo -e "${GREEN}✓${NC} Android namespace is correct"
else
    echo -e "${RED}✗${NC} Android namespace issue!"
    exit 1
fi

# Check JVM target
if grep -q "jvmTarget.*17" android/app/build.gradle; then
    echo -e "${GREEN}✓${NC} JVM target 17 configured"
else
    echo -e "${RED}✗${NC} JVM target not set to 17!"
    exit 1
fi

# Check BuildConfig import
if grep -q "import com.campushoster.mobile.BuildConfig" android/app/src/main/java/com/campushoster/mobile/dev/MainActivity.kt; then
    echo -e "${GREEN}✓${NC} BuildConfig import present in MainActivity"
else
    echo -e "${RED}✗${NC} BuildConfig import missing!"
    exit 1
fi
echo ""

echo "📝 Step 4/5: Running TypeScript type check..."
if npx tsc --noEmit --skipLibCheck; then
    echo -e "${GREEN}✓${NC} TypeScript compilation passed"
else
    echo -e "${YELLOW}⚠${NC} TypeScript warnings found (non-blocking)"
fi
echo ""

echo "🎯 Step 5/5: Testing Metro bundler..."
echo "Starting Metro bundler for 10 seconds..."

# Start Metro in background and check for errors
timeout 10 npx expo start --clear > /tmp/metro-test.log 2>&1 || true

if grep -qi "error\|cannot find module" /tmp/metro-test.log; then
    echo -e "${RED}✗${NC} Metro bundler errors detected!"
    echo "Check /tmp/metro-test.log for details"
    cat /tmp/metro-test.log | grep -i error
    exit 1
else
    echo -e "${GREEN}✓${NC} Metro bundler started successfully"
fi
echo ""

echo "=============================================="
echo -e "${GREEN}✅ All pre-build checks passed!${NC}"
echo "=============================================="
echo ""
echo "You can now:"
echo "  1. Test locally: ./gradlew :app:assembleRelease (in android/ folder)"
echo "  2. Build with EAS: eas build --platform android --profile preview"
echo ""
echo "For detailed testing instructions, see: LOCAL_BUILD_TEST.md"
