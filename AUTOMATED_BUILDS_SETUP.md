# Automated APK Builds Setup

This project now supports automated production APK builds using GitHub Actions and EAS Build.

## Setup Required

### 1. EAS Account Setup
1. Install EAS CLI: `npm install -g @expo/eas-cli`
2. Login to your Expo account: `eas login`
3. Configure the project: `eas build:configure`

### 2. GitHub Secrets Setup
Add the following secret to your GitHub repository:

- `EXPO_TOKEN`: Your Expo access token
  - Generate at: https://expo.dev/accounts/[your-account]/settings/access-tokens
  - Add to: Repository Settings → Secrets and variables → Actions

## Available Workflows

### 1. Manual Build Trigger (`build-apk.yml`)
- **Trigger**: Manual dispatch from GitHub Actions tab
- **Options**: 
  - `preview` - Builds APK for testing
  - `production` - Builds app bundle for Play Store
- **Artifacts**: Downloads APK/AAB file for 30 days

### 2. Automatic PR Builds (`build-on-pr.yml`)
- **Trigger**: Pull requests to main/develop branches
- **Builds**: Preview APK automatically
- **Comments**: Adds build status to PR

## Usage

### Manual Build
1. Go to GitHub Actions tab
2. Select "Build Production APK" workflow
3. Click "Run workflow"
4. Choose build type (preview/production)
5. Download APK from artifacts when complete

### Automatic Builds
- Preview APKs build automatically on PRs
- Check PR comments for build status
- Download from EAS dashboard

## Local Testing
You can still build locally using:
```bash
npm run build:preview    # For testing APK
npm run build:android    # For production bundle
```

## Troubleshooting

### Common Issues
1. **EXPO_TOKEN missing**: Add the secret to GitHub repository
2. **EAS project not configured**: Run `eas build:configure` locally first
3. **Build fails**: Check EAS dashboard for detailed logs

### Getting Help
- EAS Build docs: https://docs.expo.dev/build/introduction/
- GitHub Actions: https://docs.expo.dev/eas-update/github-actions/