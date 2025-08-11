# Development Workflow Guide

This document explains how to efficiently switch between development and production configurations using Git and scripts.

## Configuration Modes

### Development Mode (Current)
- **Purpose**: Rapid development and testing
- **Tool**: Expo Go app on your device
- **Benefits**: Instant reload, no build time
- **Configuration**: Simplified app.json, no native dependencies

### Production Mode
- **Purpose**: Production builds and app store deployment
- **Tool**: EAS Build with custom development client
- **Benefits**: Native modules, production features
- **Configuration**: Full app.json with native identifiers

## Quick Commands

### For Development (Expo Go)
```bash
npm start                    # Start Expo Go development server
npm run tunnel              # Start with tunnel (for remote testing)
npm run start:clear         # Start with cleared cache
```

### Switch to Production Mode
```bash
npm run switch:production   # Switch to production configuration
npm run build:android       # Build for Android (switches automatically)
npm run build:ios          # Build for iOS (switches automatically)
```

### Switch Back to Development Mode
```bash
npm run switch:development  # Switch back to Expo Go configuration
```

## Git-Based Workflow Options

### Option 1: Branch-Based (Recommended for Teams)
```bash
# Create production branch
git checkout -b production
npm run switch:production
git add . && git commit -m "feat: production build configuration"

# Switch between modes
git checkout develop        # Development mode (Expo Go)
git checkout production     # Production mode (EAS Build)
```

### Option 2: Stash-Based (Quick Testing)
```bash
# Save current state and switch to production
git stash push -m "expo-go-config"
npm run switch:production

# Build and test...

# Switch back to development
git stash pop
```

### Option 3: Script-Based (Current Setup)
```bash
# Just use the scripts - Git handles the changes
npm run switch:production   # Switch to production
npm run switch:development  # Switch back to development
```

## What Each Script Does

### `switch:production`
1. ✅ Restores `eas.json` from backup
2. ✅ Installs production dependencies (`expo-dev-client`, `expo-updates`)
3. ✅ Updates `app.json` with native identifiers and EAS project ID
4. ✅ Ready for EAS builds

### `switch:development`
1. ✅ Backs up `eas.json` to `eas.json.backup`
2. ✅ Removes production-only dependencies
3. ✅ Simplifies `app.json` for Expo Go compatibility
4. ✅ Clean dependency installation
5. ✅ Ready for Expo Go development

## File State Management

### Development Mode Files
```
├── app.json (simplified for Expo Go)
├── eas.json.backup (production config saved)
├── package.json (Expo Go dependencies)
└── No native directories
```

### Production Mode Files
```
├── app.json (full production config)
├── eas.json (EAS build configuration)
├── package.json (production dependencies)
└── Native directories generated during build
```

## Best Practices

### 1. Always Commit Before Switching
```bash
git add . && git commit -m "feat: save current changes"
npm run switch:production
```

### 2. Use Descriptive Branch Names
```bash
git checkout -b feature/payment-reminders  # Development
git checkout -b build/v1.0.0-production    # Production testing
```

### 3. Keep Production Config Updated
```bash
# When updating EAS configuration
npm run switch:production
# Make changes to eas.json
git add eas.json && git commit -m "update: EAS build configuration"
```

### 4. Test Both Modes
```bash
# Test in Expo Go
npm start
# Scan QR code and test

# Test production build
npm run build:preview
# Install and test APK
```

## Troubleshooting

### "Script not executable" Error
```bash
chmod +x scripts/switch-to-*.sh
```

### "Module not found" After Switching
```bash
# Clean install dependencies
rm -rf node_modules package-lock.json
npm install
```

### Git Conflicts When Switching
```bash
# Stash changes before switching
git stash push -m "temporary changes"
npm run switch:production
# Make changes, then restore
git stash pop
```

## Advantages of This Approach

✅ **Fast Development**: Expo Go for instant testing
✅ **Easy Switching**: One command to change modes  
✅ **Git History**: All changes are tracked
✅ **Team Friendly**: Clear workflow for collaborators
✅ **Production Ready**: Proper build configuration when needed
✅ **Rollback Safe**: Can always return to previous state

This workflow gives you the best of both worlds: rapid Expo Go development with easy access to production builds when needed.