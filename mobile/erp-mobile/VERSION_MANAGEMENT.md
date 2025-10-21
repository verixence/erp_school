# Version Management Guide

Since we're using `app.config.js` (not `app.json`), the EAS `autoIncrement` feature is not supported. You need to manually increment versions before each production build.

## Current Version

- **Version Name**: 1.0.1
- **Version Code**: 2

## How to Increment Version for Production Build

Before running `eas build --platform android --profile production`, update the version in **TWO** files:

### 1. Update `android/app/build.gradle`

```gradle
defaultConfig {
    applicationId 'com.campushoster.mobile'
    minSdkVersion rootProject.ext.minSdkVersion
    targetSdkVersion rootProject.ext.targetSdkVersion
    versionCode 2          // INCREMENT THIS (2 -> 3 -> 4...)
    versionName "1.0.1"    // INCREMENT THIS (1.0.1 -> 1.0.2 -> 1.1.0...)
    ...
}
```

### 2. Update `app.config.js`

```javascript
export default {
  expo: {
    name: IS_PRODUCTION ? 'CampusHoster' : 'CampusHoster (Dev)',
    slug: 'campus-hoster',
    version: '1.0.1',  // INCREMENT THIS (matches versionName)
    // ...
    android: {
      // ...
      versionCode: 2,  // INCREMENT THIS (matches versionCode in build.gradle)
      // ...
    }
  }
}
```

## Version Numbering Guidelines

### Version Name (Semantic Versioning)
Format: `MAJOR.MINOR.PATCH`

- **MAJOR** (1.x.x): Breaking changes, major redesigns
- **MINOR** (x.1.x): New features, significant updates
- **PATCH** (x.x.1): Bug fixes, minor improvements

Examples:
- `1.0.0` → First release
- `1.0.1` → Bug fixes
- `1.1.0` → New feature added
- `2.0.0` → Major redesign

### Version Code
- **Always increment by 1** for each build uploaded to Play Store
- Must be unique and always increasing
- Never reuse a version code

Examples:
- First upload: `versionCode 1`
- Second upload: `versionCode 2`
- Third upload: `versionCode 3`

## Quick Version Update Script

You can use this helper script:

```bash
#!/bin/bash
# scripts/bump-version.sh

CURRENT_VERSION_CODE=$(grep -oP 'versionCode \K\d+' android/app/build.gradle)
NEXT_VERSION_CODE=$((CURRENT_VERSION_CODE + 1))

echo "Current version code: $CURRENT_VERSION_CODE"
echo "Next version code: $NEXT_VERSION_CODE"
read -p "Enter new version name (e.g., 1.0.2): " VERSION_NAME

# Update build.gradle
sed -i "" "s/versionCode $CURRENT_VERSION_CODE/versionCode $NEXT_VERSION_CODE/" android/app/build.gradle
sed -i "" "s/versionName \".*\"/versionName \"$VERSION_NAME\"/" android/app/build.gradle

# Update app.config.js
sed -i "" "s/version: '.*',/version: '$VERSION_NAME',/" app.config.js
sed -i "" "s/versionCode: $CURRENT_VERSION_CODE,/versionCode: $NEXT_VERSION_CODE,/" app.config.js

echo "✓ Updated to version $VERSION_NAME (code: $NEXT_VERSION_CODE)"
```

## Build Checklist

Before each production build:

- [ ] Update `versionCode` in `android/app/build.gradle`
- [ ] Update `versionName` in `android/app/build.gradle`
- [ ] Update `version` in `app.config.js`
- [ ] Update `versionCode` in `app.config.js` (android section)
- [ ] Commit changes: `git commit -am "Bump version to X.X.X"`
- [ ] Build: `eas build --platform android --profile production`

## Version History

| Version | Code | Date | Changes |
|---------|------|------|---------|
| 1.0.1   | 2    | 2025-01-21 | Initial production build with all fixes |
| 1.0.0   | 1    | -    | (Not released) |

## Common Mistakes to Avoid

❌ **Don't skip version codes**
- Wrong: 1 → 3 (skipped 2)
- Right: 1 → 2 → 3

❌ **Don't reuse version codes**
- Each build must have a unique, higher code

❌ **Don't forget to update both files**
- Must update both `build.gradle` and `app.config.js`

❌ **Don't use version codes for preview builds**
- Preview builds don't need version bumps
- Only increment for production builds going to Play Store

## Why autoIncrement Doesn't Work

From EAS documentation:
> The `autoIncrement` option is only supported when using `app.json` configuration. Since we're using `app.config.js` for dynamic configuration (environment-based package names, etc.), we must manage versions manually.

## Future: Migrate to app.json (Optional)

If you want auto-increment in the future:

1. Convert `app.config.js` to `app.json`
2. Handle environment logic differently (e.g., using EAS environment variables)
3. Enable `autoIncrement: true` in `eas.json`

For now, manual versioning is simpler and more controlled.
