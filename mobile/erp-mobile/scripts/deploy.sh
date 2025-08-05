#!/bin/bash

# ERP School Mobile App Deployment Script
# This script helps automate the build and deployment process

set -e  # Exit on any error

echo "🚀 ERP School Mobile App Deployment Script"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if EAS CLI is installed
if ! command -v eas &> /dev/null; then
    print_error "EAS CLI is not installed. Please run: npm install -g eas-cli"
    exit 1
fi

# Check if user is logged in
if ! eas whoami &> /dev/null; then
    print_error "You are not logged in to EAS. Please run: eas login"
    exit 1
fi

print_success "EAS CLI is installed and you are logged in"

# Function to show build options
show_build_options() {
    echo ""
    echo "📱 Available Build Options:"
    echo "1. Preview Build (Android APK for testing)"
    echo "2. Production Build (Android AAB for Play Store)"
    echo "3. Production Build (iOS IPA for App Store)"
    echo "4. Production Build (Both platforms)"
    echo "5. Development Build (for Expo Go)"
    echo "6. Submit to App Stores"
    echo "7. Exit"
    echo ""
}

# Function to check project status
check_project_status() {
    print_status "Checking project status..."
    
    if ! eas project:info &> /dev/null; then
        print_warning "Project not initialized with EAS. Initializing now..."
        eas project:init
    fi
    
    print_success "Project status OK"
}

# Function to build preview
build_preview() {
    print_status "Building preview APK for Android..."
    eas build --platform android --profile preview --non-interactive
    print_success "Preview build completed! Check your EAS dashboard for the download link."
}

# Function to build production Android
build_production_android() {
    print_status "Building production AAB for Android (Google Play Store)..."
    eas build --platform android --profile production --non-interactive
    print_success "Production Android build completed!"
}

# Function to build production iOS
build_production_ios() {
    print_status "Building production IPA for iOS (App Store)..."
    print_warning "Note: This requires an Apple Developer Account"
    eas build --platform ios --profile production --non-interactive
    print_success "Production iOS build completed!"
}

# Function to build both platforms
build_production_both() {
    print_status "Building production builds for both platforms..."
    eas build --platform all --profile production --non-interactive
    print_success "Production builds for both platforms completed!"
}

# Function to build development
build_development() {
    print_status "Building development build..."
    eas build --platform all --profile development --non-interactive
    print_success "Development build completed!"
}

# Function to submit to app stores
submit_to_stores() {
    echo ""
    echo "📤 Submit Options:"
    echo "1. Submit Android to Google Play Store"
    echo "2. Submit iOS to App Store"
    echo "3. Submit both platforms"
    echo "4. Back to main menu"
    echo ""
    
    read -p "Choose an option (1-4): " submit_choice
    
    case $submit_choice in
        1)
            print_status "Submitting Android app to Google Play Store..."
            print_warning "Make sure you have configured your service account key"
            eas submit --platform android --profile production --non-interactive
            ;;
        2)
            print_status "Submitting iOS app to App Store..."
            print_warning "Make sure you have configured your Apple ID and App Store Connect"
            eas submit --platform ios --profile production --non-interactive
            ;;
        3)
            print_status "Submitting to both app stores..."
            eas submit --platform all --profile production --non-interactive
            ;;
        4)
            return
            ;;
        *)
            print_error "Invalid option"
            ;;
    esac
}

# Function to show build status
show_build_status() {
    print_status "Recent builds:"
    eas build:list --limit 5
}

# Pre-flight checks
preflight_checks() {
    print_status "Running pre-flight checks..."
    
    # Check if required files exist
    if [ ! -f "app.config.js" ]; then
        print_error "app.config.js not found"
        exit 1
    fi
    
    if [ ! -f "eas.json" ]; then
        print_error "eas.json not found"
        exit 1
    fi
    
    # Check if node_modules exists
    if [ ! -d "node_modules" ]; then
        print_warning "node_modules not found. Running npm install..."
        npm install
    fi
    
    print_success "Pre-flight checks passed"
}

# Main menu
main_menu() {
    while true; do
        show_build_options
        read -p "Choose an option (1-7): " choice
        
        case $choice in
            1)
                build_preview
                ;;
            2)
                build_production_android
                ;;
            3)
                build_production_ios
                ;;
            4)
                build_production_both
                ;;
            5)
                build_development
                ;;
            6)
                submit_to_stores
                ;;
            7)
                print_success "Goodbye! 👋"
                exit 0
                ;;
            *)
                print_error "Invalid option. Please choose 1-7."
                ;;
        esac
        
        echo ""
        echo "----------------------------------------"
        read -p "Press Enter to continue..."
    done
}

# Main execution
main() {
    check_project_status
    preflight_checks
    show_build_status
    main_menu
}

# Run the main function
main