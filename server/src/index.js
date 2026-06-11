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

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'nishi-secret-2024-xK9mP';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../../web')));

// Database
const adapter = new FileSync(path.join(__dirname, 'db.json'));
const db = low(adapter);

db.defaults({
  users: [], chats: [], chatMembers: [], messages: [],
  ghostDrops: [], parallelUniverses: [], screenshotTraps: [],
  ambientStates: [], proximitySettings: []
}).write();

console.log('Database loaded');

const onlineUsers = new Map();

// ============ AUTH ============
app.post('/api/auth/register', (req, res) => {
  try {
    const { name } = req.body;
    if (!name || name.trim().length === 0) return res.status(400).json({ error: 'Name is required' });

    const avatars = ['👤','👨','👩','🧑','👨‍💻','👩‍💻','🧑‍🎨','🚀'];
    const user = {
      id: uuidv4(), name: name.trim(),
      avatar: avatars[Math.floor(Math.random() * avatars.length)],
      status: 'Hey there! I am using Nishi',
      createdAt: new Date().toISOString()
    };
    db.get('users').push(user).write();
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ success: true, token, user });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/auth/login', (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'User ID required' });
    const user = db.get('users').find({ id: userId }).value();
    if (!user) return res.status(404).json({ error: 'User not found' });
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ success: true, token, user });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/users', (req, res) => {
  try {
    const users = db.get('users').value().map(u => ({
      id: u.id, name: u.name, avatar: u.avatar, status: u.status
    }));
    res.json({ users });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============ CHATS ============
app.post('/api/chats', (req, res) => {
  try {
    const { userId, otherUserId } = req.body;
    if (!userId || !otherUserId) return res.status(400).json({ error: 'userId and otherUserId required' });

    // Find existing 1-on-1 chat
    const userMemberships = db.get('chatMembers').filter(m => m.userId === userId || m.userId === otherUserId).value();
    const userChatIds = [...new Set(userMemberships.map(m => m.chatId))];
    
    for (const chatId of userChatIds) {
      const chat = db.get('chats').find({ id: chatId }).value();
      if (chat && !chat.isGroup) {
        const members = db.get('chatMembers').filter({ chatId }).value();
        if (members.length === 2) {
          return res.json({ chatId });
        }
      }
    }

    const chatId = uuidv4();
    db.get('chats').push({ id: chatId, isGroup: false, createdAt: new Date().toISOString() }).write();
    db.get('chatMembers').push({ chatId, userId }).write();
    db.get('chatMembers').push({ chatId, userId: otherUserId }).write();
    res.json({ success: true, chatId });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/chats/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const memberships = db.get('chatMembers').filter({ userId }).value();
    const userChatIds = memberships.map(m => m.chatId);

    const chats = userChatIds.map(chatId => {
      const chat = db.get('chats').find({ id: chatId }).value();
      if (!chat) return null;
      
      const members = db.get('chatMembers').filter({ chatId }).value();
      const otherMember = members.find(m => m.userId !== userId);
      const otherUser = otherMember ? db.get('users').find({ id: otherMember.userId }).value() : null;

      const msgs = db.get('messages').filter({ chatId }).value();
      const lastMsg = msgs.length > 0 ? msgs[msgs.length - 1] : null;

      return {
        id: chat.id, name: chat.name, isGroup: chat.isGroup,
        createdAt: chat.createdAt,
        lastMessage: lastMsg ? lastMsg.content : null,
        otherName: otherUser ? otherUser.name : null,
        otherAvatar: otherUser ? otherUser.avatar : null,
        otherId: otherUser ? otherUser.id : null
      };
    }).filter(Boolean).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

    res.json({ chats });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============ MESSAGES ============
app.post('/api/messages', (req, res) => {
  try {
    const { chatId, senderId, content, type, isScreenshotTrap, decoyContent } = req.body;
    if (!chatId || !senderId || !content) return res.status(400).json({ error: 'chatId, senderId, content required' });

    const message = {
      id: uuidv4(), chatId, senderId, content,
      type: type || 'text',
      isScreenshotTrap: isScreenshotTrap || false,
      decoyContent: decoyContent || null,
      createdAt: new Date().toISOString()
    };
    db.get('messages').push(message).write();
    io.to(chatId).emit('new_message', message);
    res.json({ success: true, message });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/messages/:chatId', (req, res) => {
  try {
    const { chatId } = req.params;
    const msgs = db.get('messages').filter({ chatId }).value();
    const messages = msgs.map(m => {
      const sender = db.get('users').find({ id: m.senderId }).value();
      return {
        ...m,
        senderName: sender ? sender.name : null,
        senderAvatar: sender ? sender.avatar : null
      };
    });
    res.json({ messages });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============ GHOST DROPS ============
app.post('/api/ghost-drops', (req, res) => {
  try {
    const { senderId, userId, content, type, lat, lng, latitude, longitude, radius, expiresIn } = req.body;
    const drop = {
      id: uuidv4(),
      userId: senderId || userId,
      content, type: type || 'text',
      latitude: latitude || lat, longitude: longitude || lng,
      radius: radius || 50,
      isClaimed: false, claimedBy: null,
      expiresAt: expiresIn ? new Date(Date.now() + expiresIn * 3600000).toISOString() : null,
      createdAt: new Date().toISOString()
    };
    db.get('ghostDrops').push(drop).write();
    res.json({ success: true, drop });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/ghost-drops', (req, res) => {
  try {
    const drops = db.get('ghostDrops').filter({ isClaimed: false }).value();
    res.json({ drops });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/ghost-drops/:id/claim', (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;
    const drop = db.get('ghostDrops').find({ id, isClaimed: false }).value();
    if (!drop) return res.status(404).json({ error: 'Drop not found or claimed' });
    db.get('ghostDrops').find({ id }).assign({ isClaimed: true, claimedBy: userId }).write();
    res.json({ success: true, drop });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============ PARALLEL UNIVERSE ============
app.post('/api/parallel-universe', (req, res) => {
  try {
    const { chatId, realContent, decoyContent } = req.body;
    const msg = { id: uuidv4(), chatId, realContent, decoyContent, createdAt: new Date().toISOString() };
    db.get('parallelUniverses').push(msg).write();
    res.json({ success: true, id: msg.id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============ SCREENSHOT TRAP ============
app.post('/api/screenshot-trap/report', (req, res) => {
  try {
    const { messageId, reporterId } = req.body;
    const trap = db.get('screenshotTraps').find({ messageId }).value();
    if (!trap) return res.json({ hasTrap: false });
    io.to(trap.userId).emit('screenshot_detected', { messageId, reporter: reporterId });
    res.json({ hasTrap: true, decoyContent: trap.decoyContent });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============ AMBIENT (both routes) ============
function handleAmbient(req, res) {
  try {
    const { userId, activity, mood, batteryLevel } = req.body;
    const existing = db.get('ambientStates').find({ userId }).value();
    const state = { userId, activity: activity || mood, batteryLevel, lastActive: new Date().toISOString() };
    if (existing) {
      db.get('ambientStates').find({ userId }).assign(state).write();
    } else {
      db.get('ambientStates').push(state).write();
    }
    io.emit('ambient_update', state);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
}
app.post('/api/ambient', handleAmbient);
app.post('/api/ambient/presence', handleAmbient);

// ============ PROXIMITY ============
app.post('/api/proximity', (req, res) => {
  try {
    const { userId, enabled, vanishThreshold } = req.body;
    const existing = db.get('proximitySettings').find({ userId }).value();
    const settings = { userId, enabled: !!enabled, vanishThreshold: vanishThreshold || 10 };
    if (existing) {
      db.get('proximitySettings').find({ userId }).assign(settings).write();
    } else {
      db.get('proximitySettings').push(settings).write();
    }
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============ SOCKET.IO ============
io.on('connection', (socket) => {
  console.log('Connected:', socket.id);

  socket.on('user_online', (userId) => {
    onlineUsers.set(userId, socket.id);
    socket.join(userId);
    io.emit('user_status', { userId, status: 'online' });
  });

  socket.on('join_chat', (chatId) => socket.join(chatId));

  socket.on('send_message', (data) => io.to(data.chatId).emit('new_message', data));

  socket.on('typing', (data) => socket.to(data.chatId).emit('user_typing', data));
  socket.on('stop_typing', (data) => socket.to(data.chatId).emit('user_stop_typing', data));


  // Video/Audio Call Signaling
  socket.on('call_offer', (data) => {
    const targetSocketId = onlineUsers.get(data.to);
    if (targetSocketId) {
      io.to(targetSocketId).emit('call_offer', data);
    }
  });

  socket.on('call_answer', (data) => {
    const targetSocketId = onlineUsers.get(data.to);
    if (targetSocketId) {
      io.to(targetSocketId).emit('call_answer', data);
    }
  });

  socket.on('ice_candidate', (data) => {
    const targetSocketId = onlineUsers.get(data.to);
    if (targetSocketId) {
      io.to(targetSocketId).emit('ice_candidate', data);
    }
  });

  socket.on('call_ended', (data) => {
    const targetSocketId = onlineUsers.get(data.to);
    if (targetSocketId) {
      io.to(targetSocketId).emit('call_ended', data);
    }
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

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Nishi server running on port ${PORT}`);
});
