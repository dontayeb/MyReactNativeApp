#!/bin/bash

echo "🔧 Switching to Development (Expo Go) Configuration..."

# Backup current eas.json if it exists
if [ -f "eas.json" ]; then
    mv eas.json eas.json.backup
    echo "✅ Backed up eas.json to eas.json.backup"
fi

# Remove production-only dependencies
echo "📦 Removing production dependencies..."
npm uninstall expo-dev-client expo-updates 2>/dev/null || true

# Update app.json for Expo Go
echo "⚙️ Updating app.json for Expo Go..."
node -e "
const fs = require('fs');
const config = JSON.parse(fs.readFileSync('app.json', 'utf8'));

// Simplify for Expo Go
config.expo.ios = {
  supportsTablet: true
};
config.expo.android = {
  adaptiveIcon: {
    foregroundImage: './assets/adaptive-icon.png',
    backgroundColor: '#667eea'
  }
};

// Remove production-specific fields
delete config.expo.extra;
delete config.expo.owner;
delete config.expo.scheme;

fs.writeFileSync('app.json', JSON.stringify(config, null, 2));
"

# Clean install dependencies
echo "🧹 Cleaning and reinstalling dependencies..."
rm -rf node_modules package-lock.json
npm install

echo "🎉 Successfully switched to development (Expo Go) configuration!"
echo ""
echo "You can now run:"
echo "  npm start"
echo "  npx expo start --go"
echo "  npx expo start --tunnel"