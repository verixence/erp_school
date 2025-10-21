#!/usr/bin/env bash

# EAS Build Pre-Install Hook
# This script runs before npm install on EAS Build servers

set -e

echo "🔧 EAS Pre-Install: Setting up build environment..."

# Set Node options for better memory management
export NODE_OPTIONS="--max-old-space-size=4096"

# Print environment info
echo "Node version: $(node --version)"
echo "npm version: $(npm --version)"
echo "Platform: $EAS_BUILD_PLATFORM"
echo "Profile: $EAS_BUILD_PROFILE"

# Clean npm cache to avoid corruption
echo "Cleaning npm cache..."
npm cache clean --force || true

echo "✅ Pre-install setup complete"
