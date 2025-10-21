#!/bin/bash

# Version Bump Script for CampusHoster Mobile
# Automatically increments version code and updates version name

set -e

cd "$(dirname "$0")/.."

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}📦 Version Bump Utility${NC}"
echo ""

# Get current version from build.gradle
CURRENT_VERSION_CODE=$(grep -oE 'versionCode [0-9]+' android/app/build.gradle | grep -oE '[0-9]+')
CURRENT_VERSION_NAME=$(grep -oE 'versionName "[0-9.]+"' android/app/build.gradle | grep -oE '[0-9.]+')

echo "Current Version:"
echo "  - Version Name: $CURRENT_VERSION_NAME"
echo "  - Version Code: $CURRENT_VERSION_CODE"
echo ""

# Calculate next version code
NEXT_VERSION_CODE=$((CURRENT_VERSION_CODE + 1))

# Ask for version name
echo -e "${YELLOW}Enter new version name (or press Enter to auto-increment patch):${NC}"
echo "  Examples: 1.0.2 (patch), 1.1.0 (minor), 2.0.0 (major)"
read -p "> " VERSION_NAME

# Auto-increment patch if no input
if [ -z "$VERSION_NAME" ]; then
    # Extract major, minor, patch
    IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT_VERSION_NAME"
    PATCH=$((PATCH + 1))
    VERSION_NAME="$MAJOR.$MINOR.$PATCH"
    echo "Auto-incremented to: $VERSION_NAME"
fi

echo ""
echo "New Version:"
echo "  - Version Name: $VERSION_NAME"
echo "  - Version Code: $NEXT_VERSION_CODE"
echo ""

# Confirm
read -p "Apply these changes? (y/N): " CONFIRM
if [[ ! $CONFIRM =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 0
fi

echo ""
echo "Updating files..."

# Update android/app/build.gradle
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    sed -i '' "s/versionCode $CURRENT_VERSION_CODE/versionCode $NEXT_VERSION_CODE/" android/app/build.gradle
    sed -i '' "s/versionName \"$CURRENT_VERSION_NAME\"/versionName \"$VERSION_NAME\"/" android/app/build.gradle

    # Update app.config.js
    sed -i '' "s/version: '$CURRENT_VERSION_NAME'/version: '$VERSION_NAME'/" app.config.js
    sed -i '' "s/versionCode: $CURRENT_VERSION_CODE,/versionCode: $NEXT_VERSION_CODE,/" app.config.js
else
    # Linux
    sed -i "s/versionCode $CURRENT_VERSION_CODE/versionCode $NEXT_VERSION_CODE/" android/app/build.gradle
    sed -i "s/versionName \"$CURRENT_VERSION_NAME\"/versionName \"$VERSION_NAME\"/" android/app/build.gradle

    # Update app.config.js
    sed -i "s/version: '$CURRENT_VERSION_NAME'/version: '$VERSION_NAME'/" app.config.js
    sed -i "s/versionCode: $CURRENT_VERSION_CODE,/versionCode: $NEXT_VERSION_CODE,/" app.config.js
fi

echo -e "${GREEN}✓${NC} Updated android/app/build.gradle"
echo -e "${GREEN}✓${NC} Updated app.config.js"
echo ""

# Show git diff
echo "Changes:"
git diff android/app/build.gradle app.config.js

echo ""
echo -e "${GREEN}✅ Version bumped successfully!${NC}"
echo ""
echo "Next steps:"
echo "  1. Review changes above"
echo "  2. Commit: git commit -am 'Bump version to $VERSION_NAME'"
echo "  3. Build:  eas build --platform android --profile production"
