# Correct Modern Build Commands for EasyWealthGuide

## The Right Package Name

The correct package name is `eas-cli`, not `@expo/eas-cli`.

## 🚀 **Modern Build Commands (Corrected)**

### **Option 1: Using npx (Recommended - No Installation)**
```bash
# Login to EAS
npx eas-cli login

# Build production app bundle
npx eas-cli build --platform android --profile production

# Or build preview APK for testing
npx eas-cli build --platform android --profile preview
```

### **Option 2: Using npm scripts (After installing dependencies)**
```bash
# Install dependencies (including eas-cli)
npm install

# Then build using npm scripts
npm run build:android:preview    # For testing APK
npm run build:android           # For production app bundle
```

### **Option 3: Alternative npx approaches**
```bash
# Using the full expo CLI (includes EAS)
npx @expo/cli install

# Then use expo commands
npx expo build --platform android
```

## 📱 **Quick Start Right Now**

Run these commands in order:

```bash
# 1. Check if everything is configured correctly
npx eas-cli doctor

# 2. Login to EAS (you'll need an Expo account)
npx eas-cli login

# 3. Build preview APK for testing
npx eas-cli build --platform android --profile preview
```

## 🔧 **If npx still doesn't work**

Try these alternatives:

### **Option A: Install locally in project**
```bash
npm install eas-cli
npx eas-cli build --platform android --profile preview
```

### **Option B: Use Expo CLI**
```bash
npx @expo/cli build --platform android
```

### **Option C: Manual Gradle build (fastest for testing)**
```bash
# Generate native code
npx expo prebuild --clean

# Build manually with Gradle
cd android
./gradlew assembleRelease

# Your APK will be in: android/app/build/outputs/apk/release/app-release.apk
```

## 🎯 **Recommended Approach for You**

Since you want to build immediately and test:

```bash
# Try this first (most modern)
npx eas-cli build --platform android --profile preview

# If that fails, try this
npm install eas-cli
npx eas-cli build --platform android --profile preview

# If EAS is having issues, build locally
npx expo prebuild --clean && cd android && ./gradlew assembleRelease
```

## ⚡ **Local Build Benefits**
- ✅ Faster (no cloud build queue)
- ✅ Works offline
- ✅ No EAS account needed
- ✅ Direct APK output for immediate testing

The local build command will create an APK in:
`android/app/build/outputs/apk/release/app-release.apk`

Try the corrected `npx eas-cli` command first!