// ============ NISHI 3D APP ============
let currentUser = null;
let currentChat = null;
let users = [];
let socket = null;
let localStream = null;
let remoteStream = null;
let peerConnection = null;
let callPartnerId = null;
let callTimer = null;
let callSeconds = 0;
let isMuted = false;
let isVideoOff = false;
let incomingOffer = null;

const rtcConfig = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:openrelay.metered.ca:80' }
  ]
};

// ============ INIT ============
window.addEventListener('DOMContentLoaded', () => {
  initParticles();
  const saved = localStorage.getItem('nishi_user');
  if (saved) {
    currentUser = JSON.parse(saved);
    enterApp();
  }
});

// ============ AUTH ============
function login() {
  const name = document.getElementById('auth-name').value.trim();
  if (!name) { showToast('Please enter your name', 'error'); return; }

  fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name })
  })
  .then(r => r.json())
  .then(data => {
    if (data.success) {
      currentUser = data.user;
      localStorage.setItem('nishi_user', JSON.stringify(currentUser));
      enterApp();
    } else {
      showToast(data.error || 'Error', 'error');
    }
  })
  .catch(() => showToast('Connection failed', 'error'));
}

function enterApp() {
  showScreen('home-screen');
  document.getElementById('profile-name').textContent = currentUser.name;
  document.getElementById('profile-avatar').textContent = currentUser.avatar || '👻';
  initSocket();
  loadUsers();
}

function logout() {
  localStorage.removeItem('nishi_user');
  currentUser = null;
  showScreen('auth-screen');
  if (socket) socket.disconnect();
}

// ============ SOCKET ============
function initSocket() {
  socket = io();
  socket.on('connect', () => {
    socket.emit('user_online', currentUser.id);
    setupCallListeners();
  });
  socket.on('new_message', (msg) => {
    if (currentChat && msg.chatId === currentChat.id) {
      appendMessage(msg);
    }
  });
  socket.on('user_typing', (data) => {
    if (currentChat && data.userId === currentChat.otherId) {
      document.getElementById('chat-status').textContent = 'typing...';
    }
  });
  socket.on('user_stop_typing', () => {
    document.getElementById('chat-status').textContent = 'online';
  });
}

// ============ USERS ============
function loadUsers() {
  fetch('/api/users')
    .then(r => r.json())
    .then(data => {
      users = (data.users || []).filter(u => u.id !== currentUser.id);
      renderUsers();
    });
}

function renderUsers() {
  const grid = document.getElementById('users-list');
  if (users.length === 0) {
    grid.innerHTML = '<div class="empty-state-3d"><div class="emoji">👻</div><h3>No one here yet</h3><p>Be the first to join Nishi!</p></div>';
    return;
  }
  grid.innerHTML = users.map(u => `
    <div class="user-card-3d" onclick="openChat('${u.id}', '${escapeHtml(u.name)}', '${u.avatar || '👤'}')">
      <div class="user-avatar-3d">${u.avatar || '👤'}</div>
      <div class="user-name-3d">${escapeHtml(u.name)}</div>
      <div class="user-status-3d">${escapeHtml(u.status || '')}</div>
    </div>
  `).join('');
}

// ============ CHAT ============
function openChat(userId, name, avatar) {
  fetch('/api/chats', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: currentUser.id, otherUserId: userId })
  })
  .then(r => r.json())
  .then(data => {
    if (data.chatId) {
      currentChat = { id: data.chatId, otherId: userId, otherName: name, otherAvatar: avatar };
      showScreen('chat-screen');
      document.getElementById('chat-name').textContent = name;
      document.getElementById('chat-avatar').textContent = avatar;
      document.getElementById('chat-status').textContent = 'online';
      loadMessages();
    }
  });
}

function loadMessages() {
  if (!currentChat) return;
  fetch(`/api/messages/${currentChat.id}`)
    .then(r => r.json())
    .then(data => {
      const container = document.getElementById('messages-container');
      container.innerHTML = '';
      (data.messages || []).forEach(m => appendMessage(m, false));
      container.scrollTop = container.scrollHeight;
    });
}

function appendMessage(msg, scroll = true) {
  const container = document.getElementById('messages-container');
  const sent = msg.senderId === currentUser.id;
  const div = document.createElement('div');
  div.className = `msg-3d ${sent ? 'msg-sent' : 'msg-received'}`;
  let html = '';
  if (!sent) html += `<div class="msg-sender">${escapeHtml(msg.senderName || '')}</div>`;
  html += `<div>${escapeHtml(msg.content)}</div>`;
  html += `<div class="msg-time">${timeAgo(msg.createdAt)}</div>`;
  div.innerHTML = html;
  container.appendChild(div);
  if (scroll) container.scrollTop = container.scrollHeight;
}

function sendMessage() {
  const input = document.getElementById('message-input');
  const content = input.value.trim();
  if (!content || !currentChat) return;
  input.value = '';

  fetch('/api/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chatId: currentChat.id,
      senderId: currentUser.id,
      content: content,
      type: 'text'
    })
  })
  .then(r => r.json())
  .then(data => {
    if (data.message) appendMessage(data.message);
  });
}

// ============ CALLING ============
async function startCall(type) {
  if (!currentChat) return;
  callPartnerId = currentChat.otherId;
  showCallScreen(type);

  try {
    localStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: type === 'video' ? { width: 640, height: 480, facingMode: 'user' } : false
    });

    if (type === 'video') {
      document.getElementById('local-video').srcObject = localStream;
      document.getElementById('local-video').style.display = 'block';
    }

    peerConnection = new RTCPeerConnection(rtcConfig);
    localStream.getTracks().forEach(t => peerConnection.addTrack(t, localStream));

    remoteStream = new MediaStream();
    peerConnection.ontrack = (e) => {
      e.streams[0].getTracks().forEach(t => remoteStream.addTrack(t));
      if (type === 'video') {
        document.getElementById('remote-video').srcObject = remoteStream;
        document.getElementById('remote-video').style.display = 'block';
      }
    };

    peerConnection.onicecandidate = (e) => {
      if (e.candidate && socket) {
        socket.emit('ice_candidate', { to: callPartnerId, candidate: e.candidate, from: currentUser.id });
      }
    };

    peerConnection.onconnectionstatechange = () => {
      if (peerConnection.connectionState === 'connected') {
        document.getElementById('call-status-text').textContent = 'Connected';
        startCallTimer();
      }
      if (['disconnected', 'failed'].includes(peerConnection.connectionState)) endCall();
    };

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    socket.emit('call_offer', {
      to: callPartnerId, from: currentUser.id, offer,
      type, callerName: currentUser.name, callerAvatar: currentUser.avatar
    });
  } catch (err) {
    showToast('Call failed: ' + err.message, 'error');
    endCall();
  }
}

function setupCallListeners() {
  if (!socket) return;
  socket.on('call_offer', async (data) => {
    incomingOffer = data;
    document.getElementById('incoming-call').style.display = 'flex';
    document.getElementById('incoming-name').textContent = data.callerName || 'Someone';
    document.getElementById('incoming-avatar').textContent = data.callerAvatar || '👤';
    document.getElementById('incoming-type').textContent = data.type === 'video' ? '📹 Video Call' : '📞 Audio Call';
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
  socket.on('call_ended', () => endCall());
}

async function acceptCall() {
  if (!incomingOffer) return;
  document.getElementById('incoming-call').style.display = 'none';
  callPartnerId = incomingOffer.from;
  showCallScreen(incomingOffer.type);

  try {
    localStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: incomingOffer.type === 'video' ? { width: 640, height: 480, facingMode: 'user' } : false
    });

    if (incomingOffer.type === 'video') {
      document.getElementById('local-video').srcObject = localStream;
      document.getElementById('local-video').style.display = 'block';
    }

    peerConnection = new RTCPeerConnection(rtcConfig);
    localStream.getTracks().forEach(t => peerConnection.addTrack(t, localStream));

    remoteStream = new MediaStream();
    peerConnection.ontrack = (e) => {
      e.streams[0].getTracks().forEach(t => remoteStream.addTrack(t));
      if (incomingOffer.type === 'video') {
        document.getElementById('remote-video').srcObject = remoteStream;
        document.getElementById('remote-video').style.display = 'block';
      }
    };

    peerConnection.onicecandidate = (e) => {
      if (e.candidate && socket) {
        socket.emit('ice_candidate', { to: callPartnerId, candidate: e.candidate, from: currentUser.id });
      }
    };

    peerConnection.onconnectionstatechange = () => {
      if (peerConnection.connectionState === 'connected') {
        document.getElementById('call-status-text').textContent = 'Connected';
        startCallTimer();
      }
      if (['disconnected', 'failed'].includes(peerConnection.connectionState)) endCall();
    };

    await peerConnection.setRemoteDescription(new RTCSessionDescription(incomingOffer.offer));
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    socket.emit('call_answer', { to: callPartnerId, from: currentUser.id, answer });
    incomingOffer = null;
  } catch (err) { endCall(); }
}

function declineCall() {
  document.getElementById('incoming-call').style.display = 'none';
  if (socket && incomingOffer) socket.emit('call_ended', { to: incomingOffer.from });
  incomingOffer = null;
}

function endCall() {
  if (localStream) localStream.getTracks().forEach(t => t.stop());
  if (peerConnection) peerConnection.close();
  localStream = null; remoteStream = null; peerConnection = null;
  if (socket && callPartnerId) socket.emit('call_ended', { to: callPartnerId });
  document.getElementById('call-screen').style.display = 'none';
  document.getElementById('remote-video').srcObject = null;
  document.getElementById('local-video').srcObject = null;
  document.getElementById('local-video').style.display = 'none';
  document.getElementById('remote-video').style.display = 'none';
  clearInterval(callTimer); callSeconds = 0; callPartnerId = null;
}

function toggleMute() {
  if (!localStream) return;
  isMuted = !isMuted;
  localStream.getAudioTracks().forEach(t => t.enabled = !isMuted);
  document.getElementById('mute-btn').textContent = isMuted ? '🔇' : '🎤';
}

function toggleVideo() {
  if (!localStream) return;
  isVideoOff = !isVideoOff;
  localStream.getVideoTracks().forEach(t => t.enabled = !isVideoOff);
  document.getElementById('video-toggle-btn').textContent = isVideoOff ? '📷' : '📹';
}

function showCallScreen(type) {
  document.getElementById('call-screen').style.display = 'flex';
  document.getElementById('call-status-text').textContent = 'Calling...';
  document.getElementById('call-name-big').textContent = currentChat?.otherName || 'Unknown';
  document.getElementById('call-avatar-big').textContent = currentChat?.otherAvatar || '👤';
}

function startCallTimer() {
  callSeconds = 0;
  callTimer = setInterval(() => {
    callSeconds++;
    const m = String(Math.floor(callSeconds / 60)).padStart(2, '0');
    const s = String(callSeconds % 60).padStart(2, '0');
    document.getElementById('call-timer').textContent = `${m}:${s}`;
  }, 1000);
}

// ============ UI ============
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function showToast(msg, type = 'info') {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = 'toast-3d show';
  if (type === 'error') toast.style.background = 'rgba(255,59,48,0.9)';
  else toast.style.background = 'rgba(108,99,255,0.9)';
  setTimeout(() => toast.className = 'toast-3d', 3000);
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return 'now';
  if (diff < 3600) return Math.floor(diff / 60) + 'm';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h';
  return Math.floor(diff / 86400) + 'd';
}

function escapeHtml(text) {
  if (!text) return '';
  const d = document.createElement('div');
  d.textContent = text;
  return d.innerHTML;
}

// ============ PARTICLES ============
function initParticles() {
  const canvas = document.getElementById('particles');
  const ctx = canvas.getContext('2d');
  let particles = [];

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  for (let i = 0; i < 60; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      r: Math.random() * 2 + 1,
      color: `rgba(${Math.random() > 0.5 ? '108,99,255' : '224,64,251'},${Math.random() * 0.4 + 0.1})`
    });
  }

  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
      if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();
    });
    requestAnimationFrame(animate);
  }
  animate();
}
