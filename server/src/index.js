const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const { Low } = require('lowdb');
const { JSONFile } = require('lowdb/node');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// Config
const PORT = 3000;
const JWT_SECRET = 'nishi-secret-key-2024';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../../web')));

// Database Setup (lowdb)
const file = path.join(__dirname, '../../db.json');
const adapter = new JSONFile(file);
const db = new Low(adapter, {});

async function initDB() {
  await db.read();
  // Initialize default data structure if empty
  if (!db.data) {
    db.data = {
      users: [],
      chats: [],
      chatMembers: [],
      messages: [],
      ghostDrops: [],
      parallelUniverses: [],
      screenshotTraps: [],
      ambientStates: [],
      proximitySettings: []
    };
    await db.write();
  }
  console.log('📦 Database loaded');
}

// Socket Users Map
const onlineUsers = new Map();

// ============ AUTH ROUTES ============

// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    await db.read();
    const { phone, name } = req.body;

    const existing = db.data.users.find(u => u.phone === phone);
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

    db.data.users.push(user);
    await db.write();

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ success: true, token, user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    await db.read();
    const { phone } = req.body;

    const user = db.data.users.find(u => u.phone === phone);
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
app.get('/api/users', async (req, res) => {
  try {
    await db.read();
    const users = db.data.users.map(u => ({
      id: u.id, name: u.name, avatar: u.avatar, status: u.status
    }));
    res.json({ users });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ CHAT ROUTES ============

// Create or get 1-on-1 chat
app.post('/api/chats', async (req, res) => {
  try {
    await db.read();
    const { userId, otherUserId } = req.body;

    // Check if chat already exists
    const existingMemberChats = db.data.chatMembers
      .filter(cm => cm.userId === userId || cm.userId === otherUserId)
      .map(cm => cm.chatId);

    const existingChat = db.data.chats.find(c =>
      !c.isGroup &&
      existingMemberChats.includes(c.id) &&
      db.data.chatMembers.filter(cm => cm.chatId === c.id).length === 2
    );

    if (existingChat) {
      return res.json({ chatId: existingChat.id });
    }

    // Create new chat
    const chatId = uuidv4();
    db.data.chats.push({ id: chatId, isGroup: 0, createdAt: new Date().toISOString() });
    db.data.chatMembers.push({ chatId, userId });
    db.data.chatMembers.push({ chatId, userId: otherUserId });
    await db.write();

    res.json({ success: true, chatId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user's chats
app.get('/api/chats/:userId', async (req, res) => {
  try {
    await db.read();
    const { userId } = req.params;

    const userChatIds = db.data.chatMembers
      .filter(cm => cm.userId === userId)
      .map(cm => cm.chatId);

    const chats = db.data.chats
      .filter(c => userChatIds.includes(c.id))
      .map(c => {
        const members = db.data.chatMembers.filter(cm => cm.chatId === c.id);
        const otherMember = members.find(m => m.userId !== userId);
        const otherUser = otherMember ? db.data.users.find(u => u.id === otherMember.userId) : null;

        const lastMsg = db.data.messages
          .filter(m => m.chatId === c.id)
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];

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
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({ chats });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ MESSAGE ROUTES ============

// Send message
app.post('/api/messages', async (req, res) => {
  try {
    await db.read();
    const { chatId, senderId, content, type, isScreenshotTrap, decoyContent } = req.body;

    const message = {
      id: uuidv4(),
      chatId,
      senderId,
      content,
      type: type || 'text',
      isScreenshotTrap: isScreenshotTrap ? 1 : 0,
      decoyContent: decoyContent || null,
      createdAt: new Date().toISOString()
    };

    db.data.messages.push(message);
    await db.write();

    // Emit to chat members
    io.to(chatId).emit('new_message', message);

    res.json({ success: true, message });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get messages for a chat
app.get('/api/messages/:chatId', async (req, res) => {
  try {
    await db.read();
    const { chatId } = req.params;

    const messages = db.data.messages
      .filter(m => m.chatId === chatId)
      .map(m => {
        const sender = db.data.users.find(u => u.id === m.senderId);
        return {
          ...m,
          senderName: sender ? sender.name : null,
          senderAvatar: sender ? sender.avatar : null
        };
      })
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    res.json({ messages });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ GHOST DROP ROUTES ============

// Create Ghost Drop
app.post('/api/ghost-drops', async (req, res) => {
  try {
    await db.read();
    const { userId, content, type, latitude, longitude, radius, expiresIn } = req.body;

    const drop = {
      id: uuidv4(),
      userId,
      content,
      type: type || 'text',
      latitude,
      longitude,
      radius: radius || 50,
      isClaimed: 0,
      claimedBy: null,
      expiresAt: expiresIn ? new Date(Date.now() + expiresIn * 60 * 60 * 1000).toISOString() : null,
      createdAt: new Date().toISOString()
    };

    db.data.ghostDrops.push(drop);
    await db.write();

    res.json({ success: true, drop });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all Ghost Drops
app.get('/api/ghost-drops', async (req, res) => {
  try {
    await db.read();
    const drops = db.data.ghostDrops.filter(d => !d.isClaimed);
    res.json({ drops });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Claim Ghost Drop
app.post('/api/ghost-drops/:id/claim', async (req, res) => {
  try {
    await db.read();
    const { id } = req.params;
    const { userId } = req.body;

    const drop = db.data.ghostDrops.find(d => d.id === id && !d.isClaimed);
    if (!drop) {
      return res.status(404).json({ error: 'Drop not found or already claimed' });
    }

    drop.isClaimed = 1;
    drop.claimedBy = userId;
    await db.write();

    res.json({ success: true, drop });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ PARALLEL UNIVERSE ROUTES ============

// Create Parallel Universe Message
app.post('/api/parallel-universe', async (req, res) => {
  try {
    await db.read();
    const { chatId, realContent, decoyContent } = req.body;

    const message = {
      id: uuidv4(),
      chatId,
      realContent,
      decoyContent,
      createdAt: new Date().toISOString()
    };

    db.data.parallelUniverses.push(message);
    await db.write();

    res.json({ success: true, id: message.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ SCREENSHOT TRAP ROUTES ============

// Report Screenshot
app.post('/api/screenshot-trap/report', async (req, res) => {
  try {
    await db.read();
    const { messageId, reporterId } = req.body;

    const trap = db.data.screenshotTraps.find(t => t.messageId === messageId);
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
app.post('/api/ambient', async (req, res) => {
  try {
    await db.read();
    const { userId, activity } = req.body;

    const existing = db.data.ambientStates.find(s => s.userId === userId);
    if (existing) {
      existing.activity = activity;
      existing.lastActive = new Date().toISOString();
    } else {
      db.data.ambientStates.push({
        userId,
        activity,
        lastActive: new Date().toISOString()
      });
    }

    await db.write();
    io.emit('ambient_update', { userId, activity });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ PROXIMITY ROUTES ============

// Update Proximity Settings
app.post('/api/proximity', async (req, res) => {
  try {
    await db.read();
    const { userId, enabled, vanishThreshold } = req.body;

    const existing = db.data.proximitySettings.find(s => s.userId === userId);
    if (existing) {
      existing.enabled = enabled ? 1 : 0;
      existing.vanishThreshold = vanishThreshold || 10;
    } else {
      db.data.proximitySettings.push({
        userId,
        enabled: enabled ? 1 : 0,
        vanishThreshold: vanishThreshold || 10
      });
    }

    await db.write();
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

initDB().then(() => {
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`
╔══════════════════════════════════════════╗
║                                          ║
║   👻 Nishi Messenger Server              ║
║   🚀 Running on port ${PORT}               ║
║   📱 Open in browser: localhost:${PORT}    ║
║                                          ║
╚══════════════════════════════════════════╝
    `);
  });
});
