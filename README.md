# ZoroBeamShare

<div align="center">

**A fast, beautiful, cross-platform nearby file sharing app.**  
Built with React Native · Liquid Glass UI · Wi-Fi + Bluetooth transfer

[![CI](https://github.com/THEZORTHIX/ZoroBeamShare/actions/workflows/ci.yml/badge.svg)](https://github.com/THEZORTHIX/ZoroBeamShare/actions/workflows/ci.yml)
![Platform](https://img.shields.io/badge/platform-Android%20%7C%20iOS-blue)
![React Native](https://img.shields.io/badge/React%20Native-0.75-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?logo=typescript)
![License](https://img.shields.io/badge/license-MIT-green)

</div>

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🔍 **Device Discovery** | Automatic UDP broadcast discovery over Wi-Fi LAN |
| 📁 **File & Folder Transfer** | Send any file type, multiple at once, with folder support |
| 📊 **Live Progress** | Real-time speed, ETA, and animated progress bars |
| 📋 **Clipboard Share** | Instantly beam clipboard text to any nearby device |
| 🔗 **QR Pairing** | Scan a QR code to connect instantly — no setup needed |
| 📜 **Transfer History** | Full chronological log grouped by date |
| 🌙 **Liquid Glass UI** | Translucent frosted glass design · Auto dark/light mode |
| 🔒 **Secure** | Encrypted transfers · No cloud · Fully offline |

---

## 📱 Screenshots

> _Screenshots coming soon — build the app to see it in action!_

---

## 🏗️ Architecture

```
ZoroBeamShare/
├── src/
│   ├── App.tsx                    # Root component & provider tree
│   ├── theme/
│   │   ├── index.ts               # Colors, spacing, typography constants
│   │   └── ThemeContext.tsx       # Dark/light mode provider
│   ├── components/
│   │   ├── GlassCard.tsx          # Frosted-glass surface primitive
│   │   ├── AmbientBackground.tsx  # Animated orb gradient backdrop
│   │   ├── BeamButton.tsx         # Spring-animated gradient button
│   │   ├── DeviceCard.tsx         # Nearby device tile with avatar
│   │   ├── TransferCard.tsx       # Live transfer progress card
│   │   └── IncomingRequestModal.tsx # Bottom-sheet accept/decline dialog
│   ├── screens/
│   │   ├── HomeScreen.tsx         # Radar, devices, send panel
│   │   ├── HistoryScreen.tsx      # Grouped transfer history
│   │   ├── QRPairScreen.tsx       # QR code display & scanner
│   │   └── SettingsScreen.tsx     # Device name, path, preferences
│   ├── navigation/
│   │   └── RootNavigator.tsx      # Glass bottom tab navigator
│   ├── store/
│   │   └── AppContext.tsx         # Global state (useReducer)
│   ├── services/
│   │   └── DiscoveryService.ts    # UDP beacon + TCP transfer engine
│   └── utils/
│       ├── types.ts               # TypeScript type definitions
│       ├── helpers.ts             # Formatting, icons, colors utils
│       └── storage.ts             # AsyncStorage persistence
└── .github/
    └── workflows/ci.yml           # CI: lint → build → release
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js ≥ 18
- React Native CLI
- Android Studio (for Android) or Xcode (for iOS)

### Install

```bash
git clone https://github.com/THEZORTHIX/ZoroBeamShare.git
cd ZoroBeamShare
npm install
```

### Run on Android

```bash
npm run android
```

### Run on iOS

```bash
cd ios && pod install && cd ..
npm run ios
```

---

## 🔌 How Transfer Works

```
Device A (Sender)                    Device B (Receiver)
─────────────────                    ─────────────────────
1. UDP Broadcast beacon ──────────► Receives beacon → adds Device A to list
2. User picks files                  User sees Device A card
3. Opens TCP connection ──────────► Transfer server accepts connection
4. Sends metadata JSON ──────────► Shows IncomingRequestModal
5. User accepts ◄────────────────── Accept signal sent back
6. Streams file bytes ───────────► Writes to savePath
7. Done! ✓                           Done! ✓
```

---

## 🛠️ Tech Stack

| Library | Purpose |
|---------|---------|
| React Native 0.75 | Cross-platform mobile framework |
| TypeScript | Type safety |
| React Navigation | Tab & stack navigation |
| react-native-linear-gradient | Gradient surfaces |
| react-native-blur | Glass blur effects |
| react-native-document-picker | File selection |
| react-native-fs | File system access |
| react-native-qrcode-svg | QR code generation |
| react-native-reanimated | Smooth animations |
| AsyncStorage | Persistent settings & history |

---

## 📄 License

MIT © [THEZORTHIX](https://github.com/THEZORTHIX)

---

<div align="center">
Built with ❤️ — fast, offline, and yours.
</div>
