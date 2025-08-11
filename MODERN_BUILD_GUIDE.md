# Modern Build Guide for EasyWealthGuide

## Recommended Modern Approach

### Method 1: Use npx (Recommended)
```bash
# No global installation needed - always uses latest version
npx eas-cli login
npx eas-cli build --platform android --profile production

# Or for preview build
npx eas-cli build --platform android --profile preview
```

### Method 2: Local Project Installation
```bash
# Install as dev dependency in your project
npm install --save-dev @expo/eas-cli

# Use via npm scripts (add to package.json)
npm run build:android
npm run build:preview
```

### Method 3: Yarn Berry/pnpm (if you're using them)
```bash
# With yarn
yarn dlx @expo/eas-cli build --platform android --profile production

# With pnpm  
pnpm dlx @expo/eas-cli build --platform android --profile production
```

## Updated package.json Scripts

Add these scripts to your `package.json`:

```json
{
  "scripts": {
    "build:android": "eas build --platform android --profile production",
    "build:android:preview": "eas build --platform android --profile preview", 
    "build:android:dev": "eas build --platform android --profile development",
    "build:ios": "eas build --platform ios --profile production",
    "build:all": "eas build --platform all --profile production",
    "submit:android": "eas submit --platform android",
    "update": "eas update",
    "prebuild": "expo prebuild --clean"
  },
  "devDependencies": {
    "@expo/eas-cli": "latest"
  }
}
```

## Alternative: Local Development Build

If you want to build locally without EAS (faster for testing):

```bash
# Generate native code
npx expo prebuild --clean

# Build locally using Gradle (Android)
cd android
./gradlew assembleRelease

# Build locally using Xcode (iOS - macOS only)
cd ios
xcodebuild -workspace EasyWealthGuide.xcworkspace -scheme EasyWealthGuide archive
```

## Docker-based Build (Advanced)

For consistent builds across different machines:

```dockerfile
# Dockerfile.build
FROM node:18-alpine

RUN apk add --no-cache git

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .

# Build using EAS
RUN npx @expo/eas-cli build --platform android --profile production --non-interactive
```

## GitHub Actions CI/CD (Automated)

Create `.github/workflows/build.yml`:

```yaml
name: Build and Deploy

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Setup EAS
        uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}
          
      - name: Build Android
        run: |
          npx eas-cli build --platform android --profile production --non-interactive
```

## Troubleshooting Modern Builds

### Clear EAS Cache
```bash
npx eas-cli build --clear-cache --platform android --profile production
```

### Check EAS Status  
```bash
npx eas-cli build:list
npx eas-cli build:view [build-id]
```

### Local Debugging
```bash
# Check expo doctor
npx expo doctor

# Clear metro cache
npx expo r -c

# Clear node_modules  
rm -rf node_modules package-lock.json
npm install
```

## Recommended Workflow

1. **Development Testing**:
   ```bash
   npm run build:android:dev
   ```

2. **Internal Testing**:
   ```bash  
   npm run build:android:preview
   ```

3. **Production Release**:
   ```bash
   npm run build:android
   ```

4. **Submit to Store**:
   ```bash
   npm run submit:android
   ```

## Performance Tips

- Use `--local` flag for faster local builds (when available)
- Use `--auto-submit` to automatically submit to app store after build
- Use build profiles to optimize for different scenarios
- Cache node_modules in CI/CD for faster builds

This approach ensures you're always using the latest version and follows modern JavaScript tooling best practices!