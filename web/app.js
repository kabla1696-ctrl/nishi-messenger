// ============ STATE ============
let currentUser = null;
let currentChat = null;
let currentUniverse = 'real';
let screenshotTrapActive = false;
let socket = null;
let userLocation = null;

// ============ PARTICLE BACKGROUND ============
function initParticles() {
  const canvas = document.getElementById('bg-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let particles = [];
  const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
  resize();
  window.addEventListener('resize', resize);

  class Particle {
    constructor() {
      this.reset();
    }
    reset() {
      this.x = Math.random() * canvas.width;
      this.y = Math.random() * canvas.height;
      this.size = Math.random() * 2 + 0.5;
      this.speedX = (Math.random() - 0.5) * 0.3;
      this.speedY = (Math.random() - 0.5) * 0.3;
      this.opacity = Math.random() * 0.5 + 0.1;
      this.color = Math.random() > 0.7 ? '108,99,255' : '224,64,251';
    }
    update() {
      this.x += this.speedX;
      this.y += this.speedY;
      if (this.x < 0 || this.x > canvas.width) this.speedX *= -1;
      if (this.y < 0 || this.y > canvas.height) this.speedY *= -1;
    }
    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${this.color},${this.opacity})`;
      ctx.fill();
    }
  }

  for (let i = 0; i < 40; i++) particles.push(new Particle());

  function connectParticles() {
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 120) {
          ctx.beginPath();
          ctx.strokeStyle = `rgba(108,99,255,${0.08 * (1 - dist / 120)})`;
          ctx.lineWidth = 0.5;
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.stroke();
        }
      }
    }
  }

  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => { p.update(); p.draw(); });
    connectParticles();
    requestAnimationFrame(animate);
  }
  animate();
}

// ============ TOAST SYSTEM ============
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// ============ INITIALIZATION ============
document.addEventListener('DOMContentLoaded', () => {
  initParticles();

  const savedUser = localStorage.getItem('nishi_user');
  if (savedUser) {
    currentUser = JSON.parse(savedUser);
    initApp();
  } else {
    setTimeout(() => showScreen('auth-screen'), 2200);
  }

  if (navigator.geolocation) {
    navigator.geolocation.watchPosition(
      (pos) => {
        userLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        const locEl = document.getElementById('drop-location');
        if (locEl) locEl.textContent = `${userLocation.lat.toFixed(4)}, ${userLocation.lng.toFixed(4)}`;
      },
      (err) => {
        userLocation = { lat: 23.8103, lng: 90.4125 };
      }
    );
  }
});

// ============ SOCKET ============
function initSocket() {
  socket = io(window.location.origin);

  socket.on('connect', () => {
    if (currentUser) socket.emit('user_online', currentUser.id);
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
      document.getElementById('typing-indicator').style.display = 'flex';
    }
  });

  socket.on('user_stop_typing', () => {
    document.getElementById('typing-indicator').style.display = 'none';
  });

  socket.on('screenshot_detected', () => {
    showToast('⚠️ Someone took a screenshot!', 'error');
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
    showToast('Please fill in all fields', 'error');
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
      showToast('Welcome to Nishi! 👻', 'success');
      initApp();
    } else {
      const loginRes = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone })
      });
      const loginData = await loginRes.json();
      if (loginData.success) {
        currentUser = loginData.user;
        localStorage.setItem('nishi_user', JSON.stringify(loginData.user));
        showToast('Welcome back! 👻', 'success');
        initApp();
      } else {
        showToast(data.error || 'Error occurred', 'error');
      }
    }
  } catch (err) {
    showToast('Could not connect to server', 'error');
  }
}

function logout() {
  localStorage.removeItem('nishi_user');
  currentUser = null;
  showScreen('auth-screen');
  showToast('Logged out', 'info');
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
          <h3>No chats yet</h3>
          <p>Tap + to start a new chat</p>
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
          <div class="chat-item-last">${chat.last_message || 'Start a new chat'}</div>
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
          <h3>No one here yet</h3>
          <p>They'll appear here when someone joins Nishi</p>
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
      openChat({ id: data.chatId, other_name: user.name, other_avatar: user.avatar, other_id: user.id });
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
          <h3>Start a conversation</h3>
          <p>Send your first message!</p>
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
  if (msg.is_screenshot_trap) messageDiv.classList.add('screenshot-trap');

  let content = msg.content;
  if (currentUniverse === 'decoy' && msg.decoy_content) {
    content = msg.decoy_content;
    messageDiv.classList.add('decoy');
  }

  messageDiv.innerHTML = `
    ${!isSent ? `<div style="font-size:11px;color:var(--text-tertiary);margin-bottom:3px;">${msg.sender_name || ''}</div>` : ''}
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
    content,
    type: 'text',
    isScreenshotTrap: screenshotTrapActive,
    decoyContent: screenshotTrapActive ? '🔒 Protected by Nishi' : null
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
  } else if (currentChat) {
    socket.emit('typing', { chatId: currentChat.id, userId: currentUser.id });
    clearTimeout(window.typingTimeout);
    window.typingTimeout = setTimeout(() => {
      socket.emit('stop_typing', { chatId: currentChat.id, userId: currentUser.id });
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
  showToast(screenshotTrapActive ? '📸 Screenshot Trap ON' : '📸 Screenshot Trap OFF', screenshotTrapActive ? 'warning' : 'info');
}

// ============ PARALLEL UNIVERSE ============
function toggleUniverse() {
  currentUniverse = currentUniverse === 'real' ? 'decoy' : 'real';
  const btn = document.getElementById('universe-btn');
  btn.classList.toggle('active', currentUniverse === 'decoy');
  btn.textContent = currentUniverse === 'real' ? '🌍' : '🎭';
  showToast(currentUniverse === 'real' ? '🌍 Real Universe' : '🎭 Decoy Universe', 'info');
  loadMessages();
}

// ============ GHOST DROP ============
async function createGhostDrop() {
  const content = document.getElementById('drop-content').value.trim();
  const expiry = document.getElementById('drop-expiry').value;
  const radius = document.getElementById('drop-radius').value;

  if (!content) { showToast('Write a message first!', 'error'); return; }
  if (!userLocation) { showToast('Getting location...', 'info'); return; }

  try {
    const res = await fetch('/api/ghost-drops', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: currentUser.id, content, latitude: userLocation.lat, longitude: userLocation.lng, radius: parseInt(radius), expiresIn: parseInt(expiry) })
    });
    const data = await res.json();
    if (data.success) {
      showToast('👻 Ghost Drop created!', 'success');
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
    list.innerHTML = '<h3 style="margin:0 12px 12px;font-size:16px;">📍 Active Drops</h3>';

    if (data.drops.length === 0) {
      list.innerHTML += `<div class="empty-state"><div class="empty-state-icon">🗺️</div><h3>No drops nearby</h3><p>Create one to get started!</p></div>`;
      return;
    }

    data.drops.forEach(drop => {
      const distance = userLocation ? calculateDistance(userLocation.lat, userLocation.lng, drop.latitude, drop.longitude) : '?';
      const card = document.createElement('div');
      card.className = 'drop-card';
      card.innerHTML = `
        <div class="drop-card-header"><span>👻 Ghost Drop</span><span class="drop-card-time">${formatTime(drop.created_at)}</span></div>
        <div class="drop-card-content">${drop.content}</div>
        <div class="drop-card-location">📍 ${distance}m away | ⏱️ ${drop.expires_at ? formatTime(drop.expires_at) : 'No expiry'}</div>
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
    body: JSON.stringify({ userId: currentUser.id, enabled, vanishThreshold: parseInt(threshold) })
  });
}

function toggleAmbient() {
  const enabled = document.getElementById('ambient-toggle').checked;
  fetch('/api/ambient', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: currentUser.id, activity: enabled ? 'active' : 'hidden' })
  });
}

function updateAmbientStatus(userId, activity) {
  console.log(`Ambient: ${userId} is ${activity}`);
}

// ============ UTILITIES ============
function formatTime(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now - date;
  if (diff < 60000) return 'now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
  return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
}

function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371e3;
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(Δφ/2)*Math.sin(Δφ/2) + Math.cos(φ1)*Math.cos(φ2)*Math.sin(Δλ/2)*Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return Math.round(R * c);
}

// ============ VIDEO/AUDIO CALL (WebRTC) ============
let localStream = null;
let remoteStream = null;
let peerConnection = null;
let currentCallType = null;
let callTimer = null;
let callSeconds = 0;
let isMuted = false;
let isVideoOff = false;
let incomingOffer = null;
let callPartnerId = null;

const rtcConfig = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:openrelay.metered.ca:80' }
  ]
};

// Start a call
async function startCall(type) {
  if (!currentChat || !currentUser) return;
  currentCallType = type;
  callPartnerId = currentChat.otherId;

  // Show call screen
  showCallScreen(type);
  document.getElementById('call-status-text').textContent = 'Calling...';
  document.getElementById('call-name-big').textContent = currentChat.otherName || 'Unknown';
  document.getElementById('call-avatar-big').textContent = currentChat.otherAvatar || '👤';
  document.getElementById('call-type-label').textContent = type === 'video' ? '📹 Video Call' : '📞 Audio Call';

  try {
    // Get local stream
    const constraints = {
      audio: true,
      video: type === 'video' ? { width: 640, height: 480, facingMode: 'user' } : false
    };
    localStream = await navigator.mediaDevices.getUserMedia(constraints);

    // Show local video if video call
    if (type === 'video') {
      document.getElementById('call-video-container').style.display = 'block';
      const localVideo = document.getElementById('local-video');
      localVideo.srcObject = localStream;
      localVideo.style.display = 'block';
    }

    // Create peer connection
    peerConnection = new RTCPeerConnection(rtcConfig);

    // Add local tracks
    localStream.getTracks().forEach(track => {
      peerConnection.addTrack(track, localStream);
    });

    // Handle remote stream
    remoteStream = new MediaStream();
    peerConnection.ontrack = (event) => {
      event.streams[0].getTracks().forEach(track => {
        remoteStream.addTrack(track);
      });
      if (type === 'video') {
        document.getElementById('remote-video').srcObject = remoteStream;
      }
    };

    // ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('ice_candidate', {
          to: callPartnerId,
          candidate: event.candidate,
          from: currentUser.id
        });
      }
    };

    // Connection state
    peerConnection.onconnectionstatechange = () => {
      if (peerConnection.connectionState === 'connected') {
        document.getElementById('call-status-text').textContent = 'Connected';
        startCallTimer();
      }
      if (peerConnection.connectionState === 'disconnected' || peerConnection.connectionState === 'failed') {
        endCall();
      }
    };

    // Create offer
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    // Send offer via Socket.IO
    if (socket) {
      socket.emit('call_offer', {
        to: callPartnerId,
        from: currentUser.id,
        offer: offer,
        type: type,
        callerName: currentUser.name,
        callerAvatar: currentUser.avatar
      });
    }

  } catch (err) {
    console.error('Call error:', err);
    document.getElementById('call-status-text').textContent = 'Call failed';
    setTimeout(endCall, 2000);
  }
}

// Listen for incoming calls
function setupCallListeners() {
  if (!socket) return;

  socket.on('call_offer', async (data) => {
    incomingOffer = data;
    // Show incoming call popup
    document.getElementById('incoming-call-popup').style.display = 'flex';
    document.getElementById('incoming-call-name').textContent = data.callerName || 'Someone';
    document.getElementById('incoming-call-avatar').textContent = data.callerAvatar || '👤';
    document.getElementById('incoming-call-type').textContent = data.type === 'video' ? '📹 Video Call' : '📞 Audio Call';
  });

  socket.on('call_answer', async (data) => {
    if (peerConnection && data.answer) {
      await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
      document.getElementById('call-status-text').textContent = 'Connected';
      startCallTimer();
    }
  });

  socket.on('ice_candidate', async (data) => {
    if (peerConnection && data.candidate) {
      await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
    }
  });

  socket.on('call_ended', () => {
    endCall();
  });
}

// Accept incoming call
async function acceptCall() {
  if (!incomingOffer) return;
  document.getElementById('incoming-call-popup').style.display = 'none';

  currentCallType = incomingOffer.type;
  callPartnerId = incomingOffer.from;

  showCallScreen(currentCallType);
  document.getElementById('call-status-text').textContent = 'Connecting...';
  document.getElementById('call-name-big').textContent = incomingOffer.callerName || 'Unknown';
  document.getElementById('call-avatar-big').textContent = incomingOffer.callerAvatar || '👤';
  document.getElementById('call-type-label').textContent = currentCallType === 'video' ? '📹 Video Call' : '📞 Audio Call';

  try {
    const constraints = {
      audio: true,
      video: currentCallType === 'video' ? { width: 640, height: 480, facingMode: 'user' } : false
    };
    localStream = await navigator.mediaDevices.getUserMedia(constraints);

    if (currentCallType === 'video') {
      document.getElementById('call-video-container').style.display = 'block';
      const localVideo = document.getElementById('local-video');
      localVideo.srcObject = localStream;
      localVideo.style.display = 'block';
    }

    peerConnection = new RTCPeerConnection(rtcConfig);
    localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

    remoteStream = new MediaStream();
    peerConnection.ontrack = (event) => {
      event.streams[0].getTracks().forEach(track => remoteStream.addTrack(track));
      if (currentCallType === 'video') {
        document.getElementById('remote-video').srcObject = remoteStream;
      }
    };

    peerConnection.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('ice_candidate', { to: callPartnerId, candidate: event.candidate, from: currentUser.id });
      }
    };

    peerConnection.onconnectionstatechange = () => {
      if (peerConnection.connectionState === 'connected') {
        document.getElementById('call-status-text').textContent = 'Connected';
        startCallTimer();
      }
      if (peerConnection.connectionState === 'disconnected' || peerConnection.connectionState === 'failed') endCall();
    };

    // Set remote description (offer) and create answer
    await peerConnection.setRemoteDescription(new RTCSessionDescription(incomingOffer.offer));
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);

    socket.emit('call_answer', {
      to: callPartnerId,
      from: currentUser.id,
      answer: answer
    });

    incomingOffer = null;
  } catch (err) {
    console.error('Accept call error:', err);
    endCall();
  }
}

// Decline call
function declineCall() {
  document.getElementById('incoming-call-popup').style.display = 'none';
  if (socket && incomingOffer) {
    socket.emit('call_ended', { to: incomingOffer.from });
  }
  incomingOffer = null;
}

// End call
function endCall() {
  // Stop all tracks
  if (localStream) {
    localStream.getTracks().forEach(t => t.stop());
    localStream = null;
  }
  if (peerConnection) {
    peerConnection.close();
    peerConnection = null;
  }
  remoteStream = null;

  // Notify other user
  if (socket && callPartnerId) {
    socket.emit('call_ended', { to: callPartnerId });
  }

  // Hide call screen
  document.getElementById('call-screen').style.display = 'none';
  document.getElementById('call-video-container').style.display = 'none';
  document.getElementById('remote-video').srcObject = null;
  document.getElementById('local-video').srcObject = null;
  document.getElementById('local-video').style.display = 'none';

  // Reset state
  clearInterval(callTimer);
  callSeconds = 0;
  isMuted = false;
  isVideoOff = false;
  callPartnerId = null;
  currentCallType = null;
}

// Toggle mute
function toggleMute() {
  if (!localStream) return;
  isMuted = !isMuted;
  localStream.getAudioTracks().forEach(t => t.enabled = !isMuted);
  document.getElementById('mute-btn').classList.toggle('muted', isMuted);
  document.getElementById('mute-btn').textContent = isMuted ? '🔇' : '🎤';
}

// Toggle video
function toggleVideo() {
  if (!localStream) return;
  isVideoOff = !isVideoOff;
  localStream.getVideoTracks().forEach(t => t.enabled = !isVideoOff);
  document.getElementById('video-toggle-btn').classList.toggle('muted', isVideoOff);
  document.getElementById('video-toggle-btn').textContent = isVideoOff ? '📷' : '📹';
}

// Show call screen
function showCallScreen(type) {
  document.getElementById('call-screen').style.display = 'block';
  if (type === 'audio') {
    document.getElementById('call-video-container').style.display = 'none';
  }
}

// Call timer
function startCallTimer() {
  callSeconds = 0;
  callTimer = setInterval(() => {
    callSeconds++;
    const mins = String(Math.floor(callSeconds / 60)).padStart(2, '0');
    const secs = String(callSeconds % 60).padStart(2, '0');
    document.getElementById('call-timer').textContent = `${mins}:${secs}`;
  }, 1000);
}
