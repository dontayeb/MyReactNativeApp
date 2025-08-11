#!/bin/bash

echo "🔧 Switching to Production Build Configuration..."

# Check if eas.json.backup exists
if [ ! -f "eas.json.backup" ]; then
    echo "❌ eas.json.backup not found! Cannot switch to production."
    exit 1
fi

# Restore EAS configuration
mv eas.json.backup eas.json
echo "✅ Restored eas.json"

# Install production dependencies
echo "📦 Installing production dependencies..."
npx expo install expo-dev-client expo-updates

# Update app.json for production
echo "⚙️ Updating app.json for production builds..."

# Add back production configuration to app.json (bundle identifier, build numbers, etc.)
node -e "
const fs = require('fs');
const config = JSON.parse(fs.readFileSync('app.json', 'utf8'));
config.expo.ios = {
  ...config.expo.ios,
  bundleIdentifier: 'com.easywealthguide.app',
  buildNumber: '1'
};
config.expo.android = {
  ...config.expo.android,
  package: 'com.easywealthguide.app',
  versionCode: 1
};
config.expo.extra = {
  eas: {
    projectId: '7b1a4fe2-493e-4515-9480-82e7a61ce715'
  }
};
config.expo.owner = 'dontayeb';
config.expo.scheme = 'easywealthguide';
fs.writeFileSync('app.json', JSON.stringify(config, null, 2));
"

echo "🎉 Successfully switched to production build configuration!"
echo ""
echo "You can now run:"
echo "  npx eas build --platform android --profile production"
echo "  npx eas build --platform ios --profile production"