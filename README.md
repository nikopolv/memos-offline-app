# Memos Offline App

A cross-platform mobile app for [Memos](https://usememos.com) with full offline support.

## Features

- 📱 **Cross-platform**: Android, iOS, macOS
- 📴 **Offline-first**: Write and read memos without internet
- 🔄 **Auto-sync**: Automatically syncs when connection is restored
- 🏷️ **Tags**: Full tag support with filtering
- 🔍 **Search**: Local full-text search
- 🌙 **Dark mode**: Follows system theme
- 📌 **Pinned memos**: Quick access to important notes
- 📤 **Native share target**: Share text/links from other apps directly into a new memo

## Tech Stack

- **Framework**: React Native + Expo
- **Storage**: SQLite (expo-sqlite)
- **State**: Zustand
- **Sync**: Background fetch + NetInfo
- **UI**: React Native Paper (Material Design 3)

## Getting Started

```bash
# Install dependencies
npm install

# Start development (Expo Go)
npx expo start

# Share-target testing requires a native dev client
npx expo prebuild --clean
npx expo run:android
npx expo run:ios

# Build Android APK (EAS)
npm run build:android:apk

# Build iOS (EAS)
eas build --platform ios --profile production

# Build macOS (Catalyst via EAS)
eas build --platform ios --profile macos
```

## Configuration

Create a `.env` file:

```
MEMOS_URL=https://your-memos-instance.com
```

Or configure in-app on first launch.

## License

MIT
