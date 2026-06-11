# 🚀 Messenger App - Project Plan
## App Name: **Nishi** 👻

> *"Messages that live, breathe, and disappear."*

---

## 🎯 5 UNIQUE FEATURES

### 1. 📸 Screenshot Trap
- Detects screenshot/screen recording attempts
- Notifies sender immediately: "⚠️ Your message was screenshotted!"
- Shows DECOY message instead of real content
- Decoy is customizable (user sets fake messages)
- Works for: text, images, videos, voice messages

### 2. 🗺️ Ghost Drop
- User "plants" a message at a GPS location
- Message stays INVISIBLE until recipient physically arrives
- GPS + WiFi fingerprinting confirms arrival
- Message auto-deletes after being read OR after 7 days
- Supports: text, images, voice notes, location pins
- Map view shows all your Ghost Drops

### 3. 🎭 Parallel Universe Chat
- Each chat has TWO versions: Real + Decoy
- Real Universe: actual conversation
- Decoy Universe: safe/fake conversation
- One-tap instant switch between universes
- Auto-switch triggers:
  - Another person detected nearby (proximity sensor)
  - Camera detects unfamiliar face
  - Specific keyword spoken/typed
  - Shake gesture
- Both universes look 100% realistic

### 4. 🫥 Vanish Mode Proximity
- Messages AUTO-HIDE when someone enters proximity (3 feet)
- Uses: Bluetooth RSSI + WiFi signal strength + proximity sensor
- Message becomes "🔒 Hidden" - unreadable
- Person leaves → message auto-reappears
- Zero user effort - fully automatic
- Customizable proximity radius (1-10 feet)
- Works per-chat (different sensitivity per conversation)

### 5. 🌫️ Ambient Presence
- Shows what the other person is DOING without words
- Auto-detected via phone sensors:
  - 🌙 Night / ☀️ Day
  - 🌧️ Rain / ❄️ Cold
  - 🚶 Walking / 🏃 Running
  - 🚗 Driving
  - 🏠 At home / 🏢 At work
  - 📖 Reading / 🎵 Listening to music
  - 💤 Sleeping
  - 🍽️ Eating
- Subtle animated indicators on chat screen
- No manual input needed - 100% auto
- Creates "words-free connection"

---

## 🛠️ TECH STACK

### Frontend (Mobile App)
| Technology | Purpose |
|---|---|
| **Flutter** | Cross-platform (Android + iOS) |
| **Dart** | Programming language |
| **Riverpod** | State management |
| **GoRouter** | Navigation |
| **Firebase Messaging** | Push notifications |
| **Google Maps API** | Ghost Drop map view |

### Backend (Server)
| Technology | Purpose |
|---|---|
| **Node.js** | Runtime |
| **Express.js** | API framework |
| **Socket.IO** | Real-time messaging |
| **WebRTC** | Audio/Video calls |
| **PostgreSQL** | Primary database |
| **Redis** | Caching + pub/sub |
| **Firebase Auth** | Authentication |

### Key Services
| Service | Technology |
|---|---|
| **Proximity Detection** | Bluetooth LE + WiFi fingerprinting |
| **Face Detection** | Google ML Kit (on-device) |
| **Sentiment Analysis** | Google Cloud NLP |
| **Image Processing** | Sharp + Cloudinary |
| **File Storage** | AWS S3 / Firebase Storage |
| **Map Services** | Google Maps Platform |

### Security
| Feature | Technology |
|---|---|
| **E2E Encryption** | Signal Protocol |
| **End-to-End Encryption** | AES-256 |
| **Biometric Auth** | Fingerprint / Face ID |
| **Key Exchange** | Diffie-Hellman |

---

## 📁 PROJECT STRUCTURE

```
nishi-app/
├── 📱 mobile/                    # Flutter mobile app
│   ├── lib/
│   │   ├── main.dart
│   │   ├── app/
│   │   │   ├── app.dart
│   │   │   └── routes.dart
│   │   ├── core/
│   │   │   ├── constants/
│   │   │   ├── theme/
│   │   │   ├── utils/
│   │   │   └── services/
│   │   │       ├── bluetooth_service.dart
│   │   │       ├── proximity_service.dart
│   │   │       ├── location_service.dart
│   │   │       ├── camera_service.dart
│   │   │       └── ambient_service.dart
│   │   ├── features/
│   │   │   ├── auth/
│   │   │   │   ├── screens/
│   │   │   │   ├── providers/
│   │   │   │   └── widgets/
│   │   │   ├── chat/
│   │   │   │   ├── screens/
│   │   │   │   ├── providers/
│   │   │   │   ├── widgets/
│   │   │   │   └── models/
│   │   │   ├── ghost_drop/
│   │   │   │   ├── screens/
│   │   │   │   ├── providers/
│   │   │   │   └── widgets/
│   │   │   ├── parallel_universe/
│   │   │   │   ├── screens/
│   │   │   │   ├── providers/
│   │   │   │   └── widgets/
│   │   │   ├── vanish_mode/
│   │   │   │   ├── services/
│   │   │   │   └── widgets/
│   │   │   ├── ambient/
│   │   │   │   ├── services/
│   │   │   │   └── widgets/
│   │   │   ├── screenshot_trap/
│   │   │   │   ├── services/
│   │   │   │   └── widgets/
│   │   │   └── settings/
│   │   └── shared/
│   │       ├── models/
│   │       ├── providers/
│   │       └── widgets/
│   ├── android/
│   ├── ios/
│   └── pubspec.yaml
│
├── 🔧 server/                    # Backend API
│   ├── src/
│   │   ├── index.js
│   │   ├── config/
│   │   │   └── database.js
│   │   ├── routes/
│   │   │   ├── auth.js
│   │   │   ├── chat.js
│   │   │   ├── ghostDrop.js
│   │   │   ├── parallelUniverse.js
│   │   │   └── ambient.js
│   │   ├── models/
│   │   │   ├── User.js
│   │   │   ├── Message.js
│   │   │   ├── Chat.js
│   │   │   ├── GhostDrop.js
│   │   │   └── ParallelUniverse.js
│   │   ├── services/
│   │   │   ├── socketService.js
│   │   │   ├── encryptionService.js
│   │   │   ├── proximityService.js
│   │   │   ├── ambientService.js
│   │   │   └── notificationService.js
│   │   ├── middleware/
│   │   │   ├── auth.js
│   │   │   └── encryption.js
│   │   └── utils/
│   ├── package.json
│   └── .env
│
├── 📊 database/                  # Database schemas
│   ├── migrations/
│   └── seeds/
│
└── 📝 docs/                      # Documentation
    ├── api.md
    ├── architecture.md
    └── features.md
```

---

## 🔄 DATABASE SCHEMA

### Users Table
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number VARCHAR(15) UNIQUE NOT NULL,
    display_name VARCHAR(100),
    avatar_url TEXT,
    status TEXT DEFAULT 'Hey there! I am using Nishi',
    is_online BOOLEAN DEFAULT false,
    last_seen TIMESTAMP,
    ambient_mode BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### Chats Table
```sql
CREATE TABLE chats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(20) NOT NULL, -- 'direct', 'group'
    created_at TIMESTAMP DEFAULT NOW()
);
```

### Chat Members Table
```sql
CREATE TABLE chat_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id UUID REFERENCES chats(id),
    user_id UUID REFERENCES users(id),
    role VARCHAR(20) DEFAULT 'member',
    joined_at TIMESTAMP DEFAULT NOW()
);
```

### Messages Table
```sql
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id UUID REFERENCES chats(id),
    sender_id UUID REFERENCES users(id),
    content TEXT,
    type VARCHAR(20) DEFAULT 'text', -- 'text', 'image', 'voice', 'video'
    universe VARCHAR(20) DEFAULT 'real', -- 'real' or 'decoy'
    is_screenshot_trapped BOOLEAN DEFAULT false,
    is_ghost_drop BOOLEAN DEFAULT false,
    is_vanish_mode BOOLEAN DEFAULT false,
    is_encrypted BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP
);
```

### Ghost Drops Table
```sql
CREATE TABLE ghost_drops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID REFERENCES users(id),
    chat_id UUID REFERENCES chats(id),
    message_id UUID REFERENCES messages(id),
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    radius_meters INTEGER DEFAULT 50,
    is_claimed BOOLEAN DEFAULT false,
    claimed_by UUID REFERENCES users(id),
    claimed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP
);
```

### Parallel Universes Table
```sql
CREATE TABLE parallel_universes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id UUID REFERENCES chats(id),
    real_messages_count INTEGER DEFAULT 0,
    decoy_messages_count INTEGER DEFAULT 0,
    auto_switch_enabled BOOLEAN DEFAULT true,
    switch_triggers JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);
```

### Proximity Settings Table
```sql
CREATE TABLE proximity_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    chat_id UUID REFERENCES chats(id),
    enabled BOOLEAN DEFAULT true,
    radius_feet INTEGER DEFAULT 3,
    auto_hide BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### Ambient States Table
```sql
CREATE TABLE ambient_states (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    activity VARCHAR(50), -- 'walking', 'driving', 'sleeping', etc.
    environment VARCHAR(50), -- 'rain', 'night', 'cold', etc.
    battery_level INTEGER,
    is_moving BOOLEAN DEFAULT false,
    updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🎨 UI/UX DESIGN

### Color Palette
```dart
// Primary Colors
const Color NishiPurple = Color(0xFF6C63FF);    // Main brand
const Color ghostWhite = Color(0xFFF8F9FA);        // Background
const Color shadowBlack = Color(0xFF1A1A2E);       // Dark mode
const Color vanishGray = Color(0xFF9E9E9E);        // Hidden messages
const Color ambientGreen = Color(0xFF4CAF50);       // Presence indicator
const Color trapRed = Color(0xFFFF5252);            // Screenshot alert
const Color dropBlue = Color(0xFF2196F3);           // Ghost Drop
const Color universeOrange = Color(0xFFFF9800);     // Parallel Universe
```

### Key Screens
1. **Splash Screen** - Nishi logo with ghost animation
2. **Auth Screen** - Phone number + OTP
3. **Home Screen** - Chat list with ambient indicators
4. **Chat Screen** - Main conversation with universe toggle
5. **Ghost Drop Map** - Interactive map with drop pins
6. **Settings** - Feature toggles and customization
7. **Profile** - User info and ambient status

---

## 📅 DEVELOPMENT TIMELINE

### Phase 1: Foundation (Week 1-2)
- [ ] Project setup (Flutter + Node.js)
- [ ] Database schema creation
- [ ] User authentication (phone + OTP)
- [ ] Basic chat functionality
- [ ] Real-time messaging with Socket.IO

### Phase 2: Core Features (Week 3-4)
- [ ] Screenshot Trap implementation
- [ ] Parallel Universe Chat
- [ ] Vanish Mode Proximity
- [ ] Message encryption (E2E)

### Phase 3: Advanced Features (Week 5-6)
- [ ] Ghost Drop with GPS
- [ ] Ambient Presence system
- [ ] Map integration
- [ ] Push notifications

### Phase 4: Polish & Launch (Week 7-8)
- [ ] UI/UX refinement
- [ ] Performance optimization
- [ ] Security audit
- [ ] Beta testing
- [ ] App store submission

---

## 💰 ESTIMATED COSTS

| Item | Cost (Monthly) |
|---|---|
| AWS/GCP Server | $50-100 |
| Firebase | $25 |
| Google Maps API | $200 (1000 requests/day free) |
| Domain + SSL | $15 |
| **Total** | **~$300/month** |

---

## 🚀 MVP (Minimum Viable Product)

**MVP Features:**
1. ✅ User registration + login
2. ✅ 1-on-1 messaging
3. ✅ Screenshot Trap
4. ✅ Basic Parallel Universe
5. ✅ Vanish Mode Proximity

**Post-MVP:**
- Ghost Drop
- Ambient Presence
- Group chats
- Audio/Video calls

---

*Project created by Zidan ⚡*
*Date: 2026-06-11*
