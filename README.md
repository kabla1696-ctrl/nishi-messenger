# 👻 Nishi Messenger

> *"Messages that live, breathe, and disappear."*

A revolutionary messaging app with 5 unique features that no other app has.

---

## 🎯 Unique Features

### 1. 📸 Screenshot Trap
Detects when someone takes a screenshot of your messages and shows them a decoy message instead.

### 2. 🗺️ Ghost Drop
Plant hidden messages at GPS locations. Only visible when the recipient physically arrives there.

### 3. 🎭 Parallel Universe Chat
Each chat has two versions - Real and Decoy. Switch instantly with one tap.

### 4. 🫥 Vanish Mode Proximity
Messages auto-hide when someone enters your proximity. Zero effort privacy.

### 5. 🌫️ Ambient Presence
See what your friends are doing without words - walking, sleeping, reading, etc.

---

## 🛠️ Tech Stack

| Component | Technology |
|---|---|
| **Mobile** | Flutter (Android + iOS) |
| **Backend** | Node.js + Express |
| **Database** | PostgreSQL |
| **Cache** | Redis |
| **Real-time** | Socket.IO |
| **Auth** | Firebase Auth |
| **Maps** | Google Maps API |
| **Encryption** | Signal Protocol |

---

## 🚀 Quick Start

### Prerequisites
- Flutter SDK 3.0+
- Node.js 18+
- PostgreSQL 14+
- Redis 7+

### Backend Setup

```bash
# Navigate to server directory
cd server

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your database credentials

# Run database migrations
npm run migrate

# Start the server
npm run dev
```

### Mobile Setup

```bash
# Navigate to mobile directory
cd mobile

# Get dependencies
flutter pub get

# Run on Android
flutter run

# Run on iOS
flutter run -d ios
```

---

## 📁 Project Structure

```
Nishi-app/
├── 📱 mobile/                    # Flutter mobile app
│   ├── lib/
│   │   ├── core/                 # Core services and utilities
│   │   ├── features/             # Feature modules
│   │   └── shared/               # Shared widgets
│   └── pubspec.yaml
│
├── 🔧 server/                    # Backend API
│   ├── src/
│   │   ├── config/               # Configuration
│   │   ├── routes/               # API routes
│   │   ├── services/             # Business logic
│   │   └── middleware/           # Auth, etc.
│   └── package.json
│
├── 📊 database/                  # Database schemas
│   └── migrations/
│
└── 📝 docs/                      # Documentation
```

---

## 🔐 Security

- **End-to-End Encryption**: Signal Protocol
- **Screenshot Detection**: OS-level detection
- **Biometric Auth**: Fingerprint/Face ID
- **Zero-Knowledge**: Server never sees plaintext

---

## 📱 Screenshots

*(Coming soon)*

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

---

## 📄 License

This project is licensed under the MIT License.

---

## 👨‍💻 Developer

**Zidan** ⚡

Built with ❤️ for Abir

---

*Nishi Messenger - Where privacy meets innovation.*
