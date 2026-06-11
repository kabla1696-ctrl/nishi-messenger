// ============ STATE ============
let currentUser = null;
let currentChat = null;
let currentUniverse = 'real';
let screenshotTrapActive = false;
let socket = null;
let userLocation = null;

// ============ INITIALIZATION ============
document.addEventListener('DOMContentLoaded', () => {
  // Check for saved user
  const savedUser = localStorage.getItem('nishi_user');
  if (savedUser) {
    currentUser = JSON.parse(savedUser);
    initApp();
  } else {
    setTimeout(() => showScreen('auth-screen'), 2000);
  }

  // Get user location
  if (navigator.geolocation) {
    navigator.geolocation.watchPosition(
      (pos) => {
        userLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        const locEl = document.getElementById('drop-location');
        if (locEl) locEl.textContent = `${userLocation.lat.toFixed(4)}, ${userLocation.lng.toFixed(4)}`;
      },
      (err) => {
        console.log('Location error:', err);
        userLocation = { lat: 23.8103, lng: 90.4125 }; // Default: Dhaka
      }
    );
  }
});

// ============ SOCKET ============
function initSocket() {
  socket = io(window.location.origin);

  socket.on('connect', () => {
    console.log('🔌 Connected to server');
    if (currentUser) {
      socket.emit('user_online', currentUser.id);
    }
  });

  socket.on('new_message', (message) => {
    if (currentChat && message.chat_id === currentChat.id) {
      appendMessage(message);
      scrollToBottom();
    }
    updateChatList();
  });

  socket.on('user_typing', (data) => {
    if (currentChat && data.chatId === currentChat.id) {
      document.getElementById('typing-indicator').style.display = 'block';
    }
  });

  socket.on('user_stop_typing', (data) => {
    document.getElementById('typing-indicator').style.display = 'none';
  });

  socket.on('screenshot_detected', (data) => {
    alert('⚠️ সতর্কতা: কেউ আপনার মেসেজের screenshot নিয়েছে!');
  });

  socket.on('ambient_update', (data) => {
    updateAmbientStatus(data.userId, data.activity);
  });
}

// ============ AUTH ============
async function registerUser() {
  const name = document.getElementById('auth-name').value.trim();
  const phone = document.getElementById('auth-phone').value.trim();

  if (!name || !phone) {
    alert('সব field পূরণ করুন!');
    return;
  }

  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, phone })
    });

    const data = await res.json();

    if (data.success) {
      currentUser = data.user;
      localStorage.setItem('nishi_user', JSON.stringify(data.user));
      initApp();
    } else {
      // Try login
      const loginRes = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone })
      });

      const loginData = await loginRes.json();
      if (loginData.success) {
        currentUser = loginData.user;
        localStorage.setItem('nishi_user', JSON.stringify(loginData.user));
        initApp();
      } else {
        alert('Error: ' + (data.error || 'Unknown error'));
      }
    }
  } catch (err) {
    alert('Server সংযুক্ত হতে পারেনি!');
    console.error(err);
  }
}

function logout() {
  localStorage.removeItem('nishi_user');
  currentUser = null;
  showScreen('auth-screen');
}

// ============ APP INIT ============
function initApp() {
  initSocket();
  updateSettings();
  loadChats();
  showScreen('home-screen');
}

// ============ SCREEN NAVIGATION ============
function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(screenId).classList.add('active');

  if (screenId === 'home-screen') loadChats();
  if (screenId === 'contacts-screen') loadContacts();
  if (screenId === 'ghost-drop-screen') loadGhostDrops();
}

// ============ CHATS ============
async function loadChats() {
  if (!currentUser) return;

  try {
    const res = await fetch(`/api/chats/${currentUser.id}`);
    const data = await res.json();

    const chatList = document.getElementById('chat-list');
    chatList.innerHTML = '';

    if (data.chats.length === 0) {
      chatList.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">👻</div>
          <h3>কোনো চ্যাট নেই</h3>
          <p>নতুন চ্যাট শুরু করতে + বাটনে ক্লিক করুন</p>
        </div>
      `;
      return;
    }

    data.chats.forEach(chat => {
      const chatItem = document.createElement('div');
      chatItem.className = 'chat-item';
      chatItem.onclick = () => openChat(chat);
      chatItem.innerHTML = `
        <div class="chat-item-avatar">${chat.other_avatar || '👤'}</div>
        <div class="chat-item-info">
          <div class="chat-item-name">${chat.other_name || chat.name || 'Unknown'}</div>
          <div class="chat-item-last">${chat.last_message || 'নতুন চ্যাট শুরু করুন'}</div>
        </div>
        <div class="chat-item-time">${formatTime(chat.created_at)}</div>
      `;
      chatList.appendChild(chatItem);
    });
  } catch (err) {
    console.error('Load chats error:', err);
  }
}

async function openChat(chat) {
  currentChat = {
    id: chat.id,
    name: chat.other_name || 'Unknown',
    avatar: chat.other_avatar || '👤',
    otherId: chat.other_id
  };

  document.getElementById('chat-name').textContent = currentChat.name;
  document.getElementById('chat-avatar').textContent = currentChat.avatar;

  socket.emit('join_chat', currentChat.id);

  showScreen('chat-screen');
  await loadMessages();
}

// ============ CONTACTS ============
async function loadContacts() {
  try {
    const res = await fetch('/api/users');
    const data = await res.json();

    const contactsList = document.getElementById('contacts-list');
    contactsList.innerHTML = '';

    data.users.forEach(user => {
      if (user.id === currentUser.id) return;

      const contactItem = document.createElement('div');
      contactItem.className = 'contact-item';
      contactItem.onclick = () => startChat(user);
      contactItem.innerHTML = `
        <div class="chat-item-avatar">${user.avatar}</div>
        <div class="chat-item-info">
          <div class="chat-item-name">${user.name}</div>
          <div class="chat-item-last">${user.status}</div>
        </div>
      `;
      contactsList.appendChild(contactItem);
    });

    if (data.users.length <= 1) {
      contactsList.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">👥</div>
          <h3>কেউ নেই এখনো</h3>
          <p>অন্য কেউ Nishi-তে join করলে এখানে দেখা যাবে</p>
        </div>
      `;
    }
  } catch (err) {
    console.error('Load contacts error:', err);
  }
}

async function startChat(user) {
  try {
    const res = await fetch('/api/chats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: currentUser.id, otherUserId: user.id })
    });

    const data = await res.json();

    if (data.chatId) {
      openChat({
        id: data.chatId,
        other_name: user.name,
        other_avatar: user.avatar,
        other_id: user.id
      });
    }
  } catch (err) {
    console.error('Start chat error:', err);
  }
}

// ============ MESSAGES ============
async function loadMessages() {
  if (!currentChat) return;

  try {
    const res = await fetch(`/api/messages/${currentChat.id}`);
    const data = await res.json();

    const container = document.getElementById('messages-container');
    container.innerHTML = '';

    if (data.messages.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">💬</div>
          <h3>মেসেজ শুরু করুন</h3>
          <p>প্রথম মেসেজ পাঠান!</p>
        </div>
      `;
      return;
    }

    data.messages.forEach(msg => appendMessage(msg, false));
    scrollToBottom();
  } catch (err) {
    console.error('Load messages error:', err);
  }
}

function appendMessage(msg, animate = true) {
  const container = document.getElementById('messages-container');
  const isSent = msg.sender_id === currentUser.id;

  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${isSent ? 'sent' : 'received'}`;

  if (msg.is_screenshot_trap) {
    messageDiv.classList.add('screenshot-trap');
  }

  let content = msg.content;

  // Show decoy if screenshot trap triggered
  if (currentUniverse === 'decoy' && msg.decoy_content) {
    content = msg.decoy_content;
    messageDiv.classList.add('decoy');
  }

  messageDiv.innerHTML = `
    ${!isSent ? `<div style="font-size:12px;color:var(--text-secondary);margin-bottom:4px;">${msg.sender_name || ''}</div>` : ''}
    <div>${content}</div>
    <div class="message-time">${formatTime(msg.created_at)}</div>
  `;

  container.appendChild(messageDiv);
}

async function sendMessage() {
  const input = document.getElementById('message-input');
  const content = input.value.trim();

  if (!content || !currentChat) return;

  const messageData = {
    chatId: currentChat.id,
    senderId: currentUser.id,
    content: content,
    type: 'text',
    isScreenshotTrap: screenshotTrapActive,
    decoyContent: screenshotTrapActive ? '🔒 This message is protected by Nishi' : null
  };

  try {
    const res = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(messageData)
    });

    const data = await res.json();
    if (data.success) {
      input.value = '';
      screenshotTrapActive = false;
      document.getElementById('trap-btn').classList.remove('active');
    }
  } catch (err) {
    console.error('Send message error:', err);
  }
}

function handleKeyPress(e) {
  if (e.key === 'Enter') {
    sendMessage();
  } else {
    // Typing indicator
    socket.emit('typing', { chatId: currentChat?.id, userId: currentUser.id });
    clearTimeout(window.typingTimeout);
    window.typingTimeout = setTimeout(() => {
      socket.emit('stop_typing', { chatId: currentChat?.id, userId: currentUser.id });
    }, 2000);
  }
}

function scrollToBottom() {
  const container = document.getElementById('messages-container');
  container.scrollTop = container.scrollHeight;
}

// ============ SCREENSHOT TRAP ============
function toggleScreenshotTrap() {
  screenshotTrapActive = !screenshotTrapActive;
  const btn = document.getElementById('trap-btn');
  btn.classList.toggle('active', screenshotTrapActive);

  if (screenshotTrapActive) {
    alert('📸 Screenshot Trap চালু!\nএই মেসেজ screenshot নিলে প্রাপককে decoy দেখাবে।');
  }
}

// ============ PARALLEL UNIVERSE ============
function toggleUniverse() {
  currentUniverse = currentUniverse === 'real' ? 'decoy' : 'real';
  const btn = document.getElementById('universe-btn');
  btn.classList.toggle('active', currentUniverse === 'decoy');
  btn.textContent = currentUniverse === 'real' ? '🌍' : '🎭';

  alert(currentUniverse === 'real' ? '🌍 Real Universe' : '🎭 Decoy Universe');
  loadMessages();
}

// ============ GHOST DROP ============
async function createGhostDrop() {
  const content = document.getElementById('drop-content').value.trim();
  const expiry = document.getElementById('drop-expiry').value;
  const radius = document.getElementById('drop-radius').value;

  if (!content) {
    alert('মেসেজ লিখুন!');
    return;
  }

  if (!userLocation) {
    alert('অবস্থান পাওয়া যায়নি!');
    return;
  }

  try {
    const res = await fetch('/api/ghost-drops', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: currentUser.id,
        content: content,
        latitude: userLocation.lat,
        longitude: userLocation.lng,
        radius: parseInt(radius),
        expiresIn: parseInt(expiry)
      })
    });

    const data = await res.json();
    if (data.success) {
      alert('👻 Ghost Drop তৈরি হয়েছে!');
      document.getElementById('drop-content').value = '';
      loadGhostDrops();
    }
  } catch (err) {
    console.error('Create ghost drop error:', err);
  }
}

async function loadGhostDrops() {
  try {
    const res = await fetch('/api/ghost-drops');
    const data = await res.json();

    const list = document.getElementById('ghost-drops-list');
    list.innerHTML = '<h3 style="margin-bottom:15px;">📍 Active Ghost Drops</h3>';

    if (data.drops.length === 0) {
      list.innerHTML += `
        <div class="empty-state">
          <div class="empty-state-icon">🗺️</div>
          <h3>কোনো Ghost Drop নেই</h3>
          <p>নতুন Ghost Drop তৈরি করুন!</p>
        </div>
      `;
      return;
    }

    data.drops.forEach(drop => {
      const distance = userLocation
        ? calculateDistance(userLocation.lat, userLocation.lng, drop.latitude, drop.longitude)
        : '?';

      const card = document.createElement('div');
      card.className = 'drop-card';
      card.innerHTML = `
        <div class="drop-card-header">
          <span>👻 Ghost Drop</span>
          <span class="drop-card-time">${formatTime(drop.created_at)}</span>
        </div>
        <div class="drop-card-content">${drop.content}</div>
        <div class="drop-card-location">
          📍 ${distance}m দূরে | ⏱️ ${drop.expires_at ? formatTime(drop.expires_at) : 'সীমাহীন'}
        </div>
      `;
      list.appendChild(card);
    });
  } catch (err) {
    console.error('Load ghost drops error:', err);
  }
}

// ============ SETTINGS ============
function updateSettings() {
  if (!currentUser) return;
  document.getElementById('settings-name').textContent = currentUser.name;
  document.getElementById('settings-phone').textContent = currentUser.phone;
}

function toggleVanishMode() {
  const enabled = document.getElementById('vanish-toggle').checked;
  const threshold = document.getElementById('vanish-threshold').value;

  fetch('/api/proximity', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: currentUser.id,
      enabled: enabled,
      vanishThreshold: parseInt(threshold)
    })
  });
}

function toggleAmbient() {
  const enabled = document.getElementById('ambient-toggle').checked;
  fetch('/api/ambient', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: currentUser.id,
      activity: enabled ? 'active' : 'hidden'
    })
  });
}

function updateAmbientStatus(userId, activity) {
  // Update UI if needed
  console.log(`Ambient: ${userId} is ${activity}`);
}

// ============ UTILITIES ============
function formatTime(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now - date;

  if (diff < 60000) return 'এখনই';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}মি আগে`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}ঘ আগে`;

  return date.toLocaleDateString('bn-BD', { day: 'numeric', month: 'short' });
}

function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371e3;
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lng2 - lng1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}
