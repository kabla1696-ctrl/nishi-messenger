const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// Config
const PORT = process.env.PORT || 3000;
const JWT_SECRET = 'nishi-secret-key-2024';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../web')));

// Database Setup (lowdb v1)
const adapter = new FileSync(path.join(__dirname, 'db.json'));
const db = low(adapter);

// Set defaults
db.defaults({
  users: [],
  chats: [],
  chatMembers: [],
  messages: [],
  ghostDrops: [],
  parallelUniverses: [],
  screenshotTraps: [],
  ambientStates: [],
  proximitySettings: []
}).write();

console.log('📦 Database loaded');

// Socket Users Map
const onlineUsers = new Map();

// ============ AUTH ROUTES ============

// Register
app.post('/api/auth/register', (req, res) => {
  try {
    const { phone, name } = req.body;

    const existing = db.get('users').find({ phone }).value();
    if (existing) {
      return res.status(400).json({ error: 'Phone already registered' });
    }

    const avatars = ['👤', '👨', '👩', '🧑', '👨‍💻', '👩‍💻', '🧑‍🎨', '👨‍🚀'];
    const user = {
      id: uuidv4(),
      phone,
      name,
      avatar: avatars[Math.floor(Math.random() * avatars.length)],
      status: 'Hey there! I am using Nishi',
      createdAt: new Date().toISOString()
    };

    db.get('users').push(user).write();

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ success: true, token, user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Login
app.post('/api/auth/login', (req, res) => {
  try {
    const { phone } = req.body;

    const user = db.get('users').find({ phone }).value();
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ success: true, token, user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all users
app.get('/api/users', (req, res) => {
  try {
    const users = db.get('users').map(u => ({
      id: u.id, name: u.name, avatar: u.avatar, status: u.status
    })).value();
    res.json({ users });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ CHAT ROUTES ============

// Create or get 1-on-1 chat
app.post('/api/chats', (req, res) => {
  try {
    const { userId, otherUserId } = req.body;

    // Get user's chat IDs
    const userChatIds = db.get('chatMembers')
      .filter(cm => cm.userId === userId || cm.userId === otherUserId)
      .map(cm => cm.chatId)
      .value();

    // Find existing 1-on-1 chat
    const existingChat = db.get('chats')
      .filter(c => !c.isGroup && userChatIds.includes(c.id))
      .find(c => {
        const members = db.get('chatMembers').filter({ chatId: c.id }).value();
        return members.length === 2;
      })
      .value();

    if (existingChat) {
      return res.json({ chatId: existingChat.id });
    }

    // Create new chat
    const chatId = uuidv4();
    db.get('chats').push({ id: chatId, isGroup: false, createdAt: new Date().toISOString() }).write();
    db.get('chatMembers').push({ chatId, userId }).write();
    db.get('chatMembers').push({ chatId, userId: otherUserId }).write();

    res.json({ success: true, chatId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user's chats
app.get('/api/chats/:userId', (req, res) => {
  try {
    const { userId } = req.params;

    const userChatIds = db.get('chatMembers')
      .filter({ userId })
      .map('chatId')
      .value();

    const chats = db.get('chats')
      .filter(c => userChatIds.includes(c.id))
      .map(c => {
        const members = db.get('chatMembers').filter({ chatId: c.id }).value();
        const otherMember = members.find(m => m.userId !== userId);
        const otherUser = otherMember ? db.get('users').getById(otherMember.userId).value() : null;

        const lastMsg = db.get('messages')
          .filter({ chatId: c.id })
          .sortBy('createdAt')
          .last()
          .value();

        return {
          id: c.id,
          name: c.name,
          isGroup: c.isGroup,
          createdAt: c.createdAt,
          lastMessage: lastMsg ? lastMsg.content : null,
          otherName: otherUser ? otherUser.name : null,
          otherAvatar: otherUser ? otherUser.avatar : null,
          otherId: otherUser ? otherUser.id : null
        };
      })
      .sortBy('createdAt')
      .reverse()
      .value();

    res.json({ chats });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ MESSAGE ROUTES ============

// Send message
app.post('/api/messages', (req, res) => {
  try {
    const { chatId, senderId, content, type, isScreenshotTrap, decoyContent } = req.body;

    const message = {
      id: uuidv4(),
      chatId,
      senderId,
      content,
      type: type || 'text',
      isScreenshotTrap: isScreenshotTrap || false,
      decoyContent: decoyContent || null,
      createdAt: new Date().toISOString()
    };

    db.get('messages').push(message).write();

    // Emit to chat members
    io.to(chatId).emit('new_message', message);

    res.json({ success: true, message });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get messages for a chat
app.get('/api/messages/:chatId', (req, res) => {
  try {
    const { chatId } = req.params;

    const messages = db.get('messages')
      .filter({ chatId })
      .map(m => {
        const sender = db.get('users').getById(m.senderId).value();
        return {
          ...m,
          senderName: sender ? sender.name : null,
          senderAvatar: sender ? sender.avatar : null
        };
      })
      .sortBy('createdAt')
      .value();

    res.json({ messages });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ GHOST DROP ROUTES ============

// Create Ghost Drop
app.post('/api/ghost-drops', (req, res) => {
  try {
    const { userId, content, type, latitude, longitude, radius, expiresIn } = req.body;

    const drop = {
      id: uuidv4(),
      userId,
      content,
      type: type || 'text',
      latitude,
      longitude,
      radius: radius || 50,
      isClaimed: false,
      claimedBy: null,
      expiresAt: expiresIn ? new Date(Date.now() + expiresIn * 60 * 60 * 1000).toISOString() : null,
      createdAt: new Date().toISOString()
    };

    db.get('ghostDrops').push(drop).write();

    res.json({ success: true, drop });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all Ghost Drops
app.get('/api/ghost-drops', (req, res) => {
  try {
    const drops = db.get('ghostDrops').filter({ isClaimed: false }).value();
    res.json({ drops });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Claim Ghost Drop
app.post('/api/ghost-drops/:id/claim', (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    const drop = db.get('ghostDrops').find({ id, isClaimed: false }).value();
    if (!drop) {
      return res.status(404).json({ error: 'Drop not found or already claimed' });
    }

    db.get('ghostDrops').find({ id }).assign({ isClaimed: true, claimedBy: userId }).write();

    res.json({ success: true, drop });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ PARALLEL UNIVERSE ROUTES ============

// Create Parallel Universe Message
app.post('/api/parallel-universe', (req, res) => {
  try {
    const { chatId, realContent, decoyContent } = req.body;

    const message = {
      id: uuidv4(),
      chatId,
      realContent,
      decoyContent,
      createdAt: new Date().toISOString()
    };

    db.get('parallelUniverses').push(message).write();

    res.json({ success: true, id: message.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ SCREENSHOT TRAP ROUTES ============

// Report Screenshot
app.post('/api/screenshot-trap/report', (req, res) => {
  try {
    const { messageId, reporterId } = req.body;

    const trap = db.get('screenshotTraps').find({ messageId }).value();
    if (!trap) {
      return res.json({ hasTrap: false });
    }

    // Notify the sender
    io.to(trap.userId).emit('screenshot_detected', { messageId, reporter: reporterId });

    res.json({ hasTrap: true, decoyContent: trap.decoyContent });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ AMBIENT PRESENCE ROUTES ============

// Update Ambient State
app.post('/api/ambient', (req, res) => {
  try {
    const { userId, activity } = req.body;

    const existing = db.get('ambientStates').find({ userId }).value();
    if (existing) {
      db.get('ambientStates').find({ userId }).assign({ activity, lastActive: new Date().toISOString() }).write();
    } else {
      db.get('ambientStates').push({
        userId,
        activity,
        lastActive: new Date().toISOString()
      }).write();
    }

    io.emit('ambient_update', { userId, activity });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ PROXIMITY ROUTES ============

// Update Proximity Settings
app.post('/api/proximity', (req, res) => {
  try {
    const { userId, enabled, vanishThreshold } = req.body;

    const existing = db.get('proximitySettings').find({ userId }).value();
    if (existing) {
      db.get('proximitySettings').find({ userId }).assign({
        enabled: !!enabled,
        vanishThreshold: vanishThreshold || 10
      }).write();
    } else {
      db.get('proximitySettings').push({
        userId,
        enabled: !!enabled,
        vanishThreshold: vanishThreshold || 10
      }).write();
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ SOCKET.IO ============

io.on('connection', (socket) => {
  console.log('🔌 User connected:', socket.id);

  socket.on('user_online', (userId) => {
    onlineUsers.set(userId, socket.id);
    socket.join(userId);
    io.emit('user_status', { userId, status: 'online' });
  });

  socket.on('join_chat', (chatId) => {
    socket.join(chatId);
  });

  socket.on('send_message', (data) => {
    io.to(data.chatId).emit('new_message', data);
  });

  socket.on('typing', (data) => {
    socket.to(data.chatId).emit('user_typing', data);
  });

  socket.on('stop_typing', (data) => {
    socket.to(data.chatId).emit('user_stop_typing', data);
  });

  socket.on('disconnect', () => {
    for (const [userId, socketId] of onlineUsers.entries()) {
      if (socketId === socket.id) {
        onlineUsers.delete(userId);
        io.emit('user_status', { userId, status: 'offline' });
        break;
      }
    }
  });
});

// ============ START SERVER ============

server.listen(PORT, '0.0.0.0', () => {
  console.log(`
╔══════════════════════════════════════════╗
║                                          ║
║   👻 Nishi Messenger Server              ║
║   🚀 Running on port ${PORT}               ║
║                                          ║
╚══════════════════════════════════════════╝
  `);
});
