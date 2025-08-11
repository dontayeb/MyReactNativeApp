# EasyWealthGuide

A comprehensive React Native mobile application for personal financial tracking and wealth management.

## Features

- **Multi-Currency Support**: Track assets and liabilities in different currencies with automatic conversion
- **Asset Management**: Monitor investments, properties, bank accounts, and other valuable assets
- **Debt Tracking**: Manage loans, credit cards, and other liabilities with payment schedules
- **Financial Dashboard**: Real-time net worth calculation and financial overview
- **Secure Data**: Client-side AES-256 encryption for sensitive financial information
- **Offline Support**: Encrypted offline data storage with sync capabilities
- **Profile Management**: Customizable user profiles with financial preferences

## Tech Stack

- **Framework**: React Native with Expo SDK 53
- **Development**: Expo Go for rapid testing and development
- **Database**: Supabase (PostgreSQL) with Row Level Security
- **Authentication**: Supabase Auth
- **Encryption**: Client-side AES-256 encryption
- **State Management**: React Context API
- **Navigation**: React Navigation
- **Build System**: EAS Build (for production)
- **Languages**: TypeScript, JavaScript

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Expo CLI
- EAS CLI (for building)

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd MyReactNativeApp
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   # Create .env file with your Supabase credentials
   # (See Environment Variables section below)
   ```

4. Start the development server:
   ```bash
   npm start
   # or
   npx expo start --go
   ```

5. **Test with Expo Go**:
   - Install Expo Go on your device from the App Store or Google Play
   - Scan the QR code displayed in your terminal or browser
   - Your app will load in Expo Go for instant testing

### Building for Production

To build for production, you'll need to restore the EAS Build configuration:

1. Restore EAS configuration:
   ```bash
   mv eas.json.backup eas.json
   npx expo install expo-dev-client
   ```

2. Configure EAS Build:
   ```bash
   npx eas build:configure
   ```

3. Build for production:
   ```bash
   npx eas build --platform android --profile production
   npx eas build --platform ios --profile production
   ```

## Environment Variables

Create a `.env` file with the following variables:

```
EXPO_PUBLIC_APP_ENV=development
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
EXPO_PUBLIC_APP_VERSION=1.0.0
```

## Project Structure

```
src/
├── components/          # Reusable UI components
├── contexts/           # React Context providers
├── navigation/         # Navigation configuration
├── screens/           # Screen components
│   ├── auth/          # Authentication screens
│   ├── dashboard/     # Dashboard screen
│   ├── assets/        # Asset management screens
│   ├── loans/         # Loan management screens
│   └── settings/      # Settings screens
├── services/          # API and service layer
├── utils/             # Utility functions
├── types/             # TypeScript type definitions
└── constants/         # App constants
```

## Key Features

### Currency Management
- Support for 66+ global currencies
- Automatic currency conversion for mixed-currency portfolios
- Smart default currency management
- Real-time exchange rate calculations

### Security
- Client-side encryption using AES-256
- Secure offline storage
- Row Level Security in database
- No sensitive data stored in plain text

### Offline Support
- Encrypted local data caching
- Automatic sync when online
- Offline-first architecture for core features

## Contributing

1. Create a feature branch from `develop`
2. Make your changes
3. Write tests if applicable
4. Submit a pull request

## License

Private - All rights reserved

## Support

For support and questions, contact [your-email@domain.com]