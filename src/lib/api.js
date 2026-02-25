import { io } from 'socket.io-client'

const SERVER = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001'

async function apiFetch(path, options = {}) {
  const res = await fetch(SERVER + path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Server error')
  return data
}

export const api = {
  register:       (body)         => apiFetch('/api/register', { method:'POST', body:JSON.stringify(body) }),
  login:          (body)         => apiFetch('/api/login',    { method:'POST', body:JSON.stringify(body) }),
  channels:       ()             => apiFetch('/api/channels'),
  messages:       (channelId)    => apiFetch(`/api/channels/${channelId}/messages`),
  users:          ()             => apiFetch('/api/users'),
  search:         (q)            => apiFetch(`/api/users/search?q=${encodeURIComponent(q)}`),
  friends:        (userId)       => apiFetch(`/api/users/${userId}/friends`),
  requests:       (userId)       => apiFetch(`/api/users/${userId}/requests`),
  openDm:         (userA, userB) => apiFetch('/api/dm', { method:'POST', body:JSON.stringify({ userA, userB }) }),

  // Account management
  changeUsername: (userId, newUsername, password) =>
    apiFetch('/api/account/username', { method:'POST', body:JSON.stringify({ userId, newUsername, password }) }),
  changePassword: (userId, currentPassword, newPassword) =>
    apiFetch('/api/account/password', { method:'POST', body:JSON.stringify({ userId, currentPassword, newPassword }) }),
  deleteAccount:  (userId, password) =>
    apiFetch('/api/account/delete', { method:'POST', body:JSON.stringify({ userId, password }) }),
  uploadAvatar:   (userId, imageDataUrl) =>
    apiFetch('/api/account/avatar', { method:'POST', body:JSON.stringify({ userId, imageDataUrl }) }),
  updateDisplayName: (userId, displayName) =>
    apiFetch('/api/account/displayname', { method:'POST', body:JSON.stringify({ userId, displayName }) }),
  updateBio: (userId, bio) =>
    apiFetch('/api/account/bio', { method:'POST', body:JSON.stringify({ userId, bio }) }),
}

export const socket = io(SERVER, { autoConnect: false })

export function connectSocket(userId) {
  socket.connect()
  socket.emit('auth', { userId })
}

export function disconnectSocket() {
  socket.disconnect()
}
