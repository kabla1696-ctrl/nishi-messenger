# 🏗️ Nishi - System Architecture

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    MOBILE APP (Flutter)                  │
│  ┌─────────┐  ┌──────────┐  ┌───────────┐  ┌────────┐  │
│  │  Chat   │  │  Ghost   │  │ Parallel  │  │Ambient │  │
│  │ Screen  │  │  Drop    │  │ Universe  │  │Presence│  │
│  └────┬────┘  └────┬─────┘  └─────┬─────┘  └───┬────┘  │
│       │            │              │              │       │
│  ┌────┴────────────┴──────────────┴──────────────┴────┐  │
│  │              Socket.IO Client                      │  │
│  └─────────────────────┬──────────────────────────────┘  │
└────────────────────────┼────────────────────────────────┘
                         │
                         ▼
┌────────────────────────────────────────────────────────┐
│                    NGINX (Reverse Proxy)                │
│                    SSL Termination                      │
└────────────────────────┬───────────────────────────────┘
                         │
                         ▼
┌────────────────────────────────────────────────────────┐
│                   NODE.JS SERVER                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐  │
│  │   Auth   │  │  Chat    │  │  Ghost   │  │Ambient │  │
│  │ Service  │  │ Service  │  │  Drop    │  │Service │  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └───┬────┘  │
│       │             │             │              │       │
│  ┌────┴─────────────┴─────────────┴──────────────┴────┐ │
│  │              Socket.IO Server                      │ │
│  └─────────────────────┬──────────────────────────────┘ │
└────────────────────────┼───────────────────────────────┘
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│  PostgreSQL  │ │    Redis     │ │  Firebase    │
│  (Primary DB)│ │  (Cache/Pub) │ │  (Auth/Push) │
└──────────────┘ └──────────────┘ └──────────────┘
```

## Feature-Specific Architecture

### 📸 Screenshot Trap Flow
```
User A sends message → Stored in DB (is_screenshot_trapped: true)
         ↓
User B receives message → Displayed normally
         ↓
User B takes screenshot → OS detects screenshot event
         ↓
Flutter detects → Sends Socket.IO event to server
         ↓
Server notifies User A → "⚠️ Screenshot detected!"
         ↓
Decoy message shown to User B → Real message hidden
```

### 🗺️ Ghost Drop Flow
```
User A creates Ghost Drop
    ↓
Set: Message + GPS coords + Radius
    ↓
Stored in ghost_drops table
    ↓
User B enters geo-fence area
    ↓
Phone detects: GPS match + WiFi fingerprint
    ↓
Socket.IO event: "claim_drop"
    ↓
Server verifies location → Grants access
    ↓
Message decrypted + shown to User B
    ↓
Auto-delete after 7 days or after reading
```

### 🎭 Parallel Universe Flow
```
Chat exists with TWO versions
    ↓
User toggles: Real ↔ Decoy
    ↓
Socket.IO room: "chat:{id}:real" / "chat:{id}:decoy"
    ↓
Messages stored with universe: 'real' or 'decoy'
    ↓
Auto-switch trigger detected:
    - Proximity sensor → Someone nearby
    - Camera → Unfamiliar face
    - Keyword detected
    ↓
Instant universe switch → Seamless transition
```

### 🫥 Vanish Mode Proximity Flow
```
User A sends message → Stored with is_vanish_mode: true
         ↓
Message visible to User B
         ↓
Bluetooth LE scanning active
         ↓
Another device detected within radius
         ↓
Socket.IO event: "proximity_detected"
         ↓
Message auto-hides → Shows "🔒 Hidden"
         ↓
Device moves away → Socket.IO: "proximity_cleared"
         ↓
Message auto-reappears
```

### 🌫️ Ambient Presence Flow
```
Phone sensors active:
    - Accelerometer → Movement
    - GPS → Location
    - Light sensor → Environment
    - Audio → Activity detection
    ↓
ML Kit processes sensor data
    ↓
Determines: activity + environment
    ↓
Socket.IO event: "ambient_update"
    ↓
Server stores in ambient_states table
    ↓
Friend's phone receives update
    ↓
Subtle indicator shown in chat UI
```

## API Endpoints

### Auth
```
POST   /api/auth/register     - Register new user
POST   /api/auth/login        - Send OTP
POST   /api/auth/verify       - Verify OTP
POST   /api/auth/refresh      - Refresh token
```

### Chat
```
GET    /api/chats             - List user's chats
POST   /api/chats             - Create new chat
GET    /api/chats/:id         - Get chat details
GET    /api/chats/:id/messages - Get messages (paginated)
POST   /api/chats/:id/messages - Send message
DELETE /api/chats/:id/messages/:msgId - Delete message
```

### Ghost Drop
```
POST   /api/ghost-drops       - Create ghost drop
GET    /api/ghost-drops       - List my drops
GET    /api/ghost-drops/nearby - Get nearby drops
POST   /api/ghost-drops/:id/claim - Claim a drop
DELETE /api/ghost-drops/:id   - Delete a drop
```

### Parallel Universe
```
GET    /api/universe/:chatId  - Get universe status
POST   /api/universe/:chatId/switch - Switch universe
PUT    /api/universe/:chatId/triggers - Update triggers
```

### Ambient
```
PUT    /api/ambient/state     - Update my state
GET    /api/ambient/:userId   - Get friend's state
```

### Screenshot Trap
```
POST   /api/trap/report       - Report screenshot
GET    /api/trap/incidents    - Get my trapped incidents
PUT    /api/trap/decoy        - Update decoy message
```

## Socket.IO Events

### Client → Server
```
chat:join           - Join chat room
chat:message        - Send message
chat:typing         - Typing indicator
ghost:drop          - Create ghost drop
ghost:claim         - Claim ghost drop
universe:switch     - Switch universe
universe:message    - Send in specific universe
proximity:detected  - Proximity alert
proximity:clear     - Proximity cleared
ambient:update      - Update ambient state
screenshot:detected - Screenshot event
```

### Server → Client
```
chat:new_message    - New message received
chat:user_typing    - User is typing
chat:user_online    - User came online
chat:user_offline   - User went offline
ghost:new_drop      - New ghost drop nearby
ghost:drop_claimed  - Your drop was claimed
universe:switched   - Universe switched
proximity:alert     - Someone is nearby
ambient:friend_state - Friend's ambient update
trap:screenshot     - Screenshot detected alert
notification        - Push notification
```

## Security Model

```
┌─────────────────────────────────────────────┐
│           SECURITY LAYERS                    │
├─────────────────────────────────────────────┤
│ 1. Authentication: Firebase Auth + JWT      │
│ 2. Transport: TLS 1.3 (HTTPS/WSS)          │
│ 3. Message Encryption: Signal Protocol      │
│ 4. Storage Encryption: AES-256              │
│ 5. Biometric: Fingerprint/Face ID           │
│ 6. Screenshot Protection: OS-level detect   │
│ 7. Proximity: Bluetooth LE encrypted        │
│ 8. Data: Zero-knowledge architecture        │
└─────────────────────────────────────────────┘
```

## Scalability Plan

### Phase 1: 0-10K Users
- Single Node.js server
- PostgreSQL on same server
- Redis for caching
- Firebase for auth/push

### Phase 2: 10K-100K Users
- Load balancer (nginx)
- 2-3 Node.js servers
- PostgreSQL with read replicas
- Redis Cluster

### Phase 3: 100K+ Users
- Kubernetes cluster
- Microservices split
- CDN for media
- Global edge servers

---

*Architecture by Zidan ⚡*
