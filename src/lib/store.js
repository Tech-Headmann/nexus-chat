import { create } from 'zustand'
import { api, socket, connectSocket, disconnectSocket } from './api'
import { applyTheme, C } from './theme'

const DEFAULT_CHANNEL_IDS = ['ch_general','ch_vibes','ch_tech','ch_gaming','ch_random']

// Load saved prefs from localStorage
function loadPrefs() {
  try {
    return JSON.parse(localStorage.getItem('nexus_prefs') || '{}')
  } catch { return {} }
}
function savePrefs(prefs) {
  try { localStorage.setItem('nexus_prefs', JSON.stringify(prefs)) } catch {}
}

const savedPrefs = loadPrefs()

// Apply saved theme immediately on load
if (savedPrefs.theme || savedPrefs.accent) {
  applyTheme(savedPrefs.theme || 'dark', savedPrefs.accent || 'indigo')
}

export const useStore = create((set, get) => ({

  /* ── Auth ── */
  me:       null,
  authBusy: false,
  authErr:  '',

  register: async (username, password, avatar, color) => {
    set({ authBusy: true, authErr: '' })
    try {
      const { user } = await api.register({ username, password, avatar, color })
      await get()._afterAuth(user)
    } catch (e) { set({ authErr: e.message, authBusy: false }) }
  },

  login: async (username, password) => {
    set({ authBusy: true, authErr: '' })
    try {
      const { user } = await api.login({ username, password })
      await get()._afterAuth(user)
    } catch (e) { set({ authErr: e.message, authBusy: false }) }
  },

  logout: () => {
    const { leaveVoice, voiceChannelId } = get()
    if (voiceChannelId) leaveVoice()
    disconnectSocket()
    set({
      me: null, channels: [], messages: [], friends: [],
      requests: [], onlineUsers: [], activeChannel: null,
      activeDmUserId: null, typingUsers: [], _bound: false,
      voiceChannelId: null, localStream: null, voicePeers: [], peerConnections: {},
    })
  },

  _afterAuth: async (user) => {
    set({ me: user, authBusy: false })
    connectSocket(user.id)
    const [channels, friends, requests] = await Promise.all([
      api.channels(), api.friends(user.id), api.requests(user.id),
    ])
    set({ channels, friends, requests })
    get()._bindSocket()
  },

  /* ── Settings / Prefs ── */
  prefs: {
    theme:        savedPrefs.theme      || 'dark',
    accent:       savedPrefs.accent     || 'indigo',
    fontSize:     savedPrefs.fontSize   || 'medium',
    compactMode:  savedPrefs.compactMode ?? false,
    showAvatars:  savedPrefs.showAvatars ?? true,
    soundEnabled: savedPrefs.soundEnabled ?? true,
    status:       savedPrefs.status     || 'online',  // online | away | dnd | invisible
  },
  settingsOpen: false,

  openSettings:  () => set({ settingsOpen: true }),
  closeSettings: () => set({ settingsOpen: false }),

  updatePref: (key, value) => {
    const prefs = { ...get().prefs, [key]: value }
    set({ prefs })
    savePrefs(prefs)
    if (key === 'theme' || key === 'accent') {
      applyTheme(prefs.theme, prefs.accent)
      // Force re-render by bumping a counter
      set(s => ({ _themeVersion: (s._themeVersion || 0) + 1 }))
    }
  },
  _themeVersion: 0,

  /* ── Channels & messages ── */
  channels:       [],
  activeChannel:  null,
  activeDmUserId: null,
  messages:       [],
  typingUsers:    [],

  openChannel: async (channel) => {
    const { voiceChannelId, leaveVoice } = get()
    if (voiceChannelId && voiceChannelId !== channel.id) leaveVoice()
    socket.emit('join_channel', { channelId: channel.id })
    set({ activeChannel: channel, activeDmUserId: null, messages: [], typingUsers: [] })
    const msgs = await api.messages(channel.id)
    set({ messages: msgs })
  },

  openDm: async (friendId) => {
    const { me } = get()
    set({ messages: [], typingUsers: [] })
    const { channel, messages } = await api.openDm(me.id, friendId)
    socket.emit('join_channel', { channelId: channel.id })
    set({ activeChannel: channel, activeDmUserId: friendId, messages })
  },

  sendMessage: (content) => {
    const { activeChannel } = get()
    if (!activeChannel || !content.trim()) return
    socket.emit('send_message', { channelId: activeChannel.id, content })
  },

  setTyping: (isTyping) => {
    const { activeChannel } = get()
    if (activeChannel) socket.emit('typing', { channelId: activeChannel.id, isTyping })
  },

  createChannel: (name, icon) => socket.emit('create_channel', { name, icon, description: '' }),

  deleteChannel: (channelId) => socket.emit('delete_channel', { channelId }),

  canDeleteChannel: (channel) => {
    const { me } = get()
    if (!channel || !me) return false
    if (DEFAULT_CHANNEL_IDS.includes(channel.id)) return false
    return channel.created_by === me.id
  },

  /* ── Friends ── */
  friends:     [],
  requests:    [],
  onlineUsers: [],

  sendFriendRequest: (toId)              => socket.emit('send_friend_request', { toId }),
  acceptRequest:     (requestId, fromId) => socket.emit('accept_request', { requestId, fromId }),
  declineRequest:    (requestId)         => socket.emit('decline_request', { requestId }),

  /* ── Toast ── */
  toast: null,
  showToast: (msg, type = 'ok') => {
    set({ toast: { msg, type } })
    setTimeout(() => set({ toast: null }), 3000)
  },

  /* ── Voice call ── */
  voiceChannelId:  null,
  voicePeers:      [],
  voiceMuted:      false,
  localStream:     null,
  peerConnections: {},

  joinVoice: async (channelId) => {
    let stream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
    } catch {
      get().showToast('Microphone access denied ❌', 'err')
      return
    }
    set({ voiceChannelId: channelId, localStream: stream, voicePeers: [], voiceMuted: false })
    socket.emit('voice_join', { channelId })
  },

  leaveVoice: () => {
    const { voiceChannelId, localStream, peerConnections } = get()
    if (localStream) localStream.getTracks().forEach(t => t.stop())
    Object.values(peerConnections).forEach(pc => pc.close())
    if (voiceChannelId) socket.emit('voice_leave', { channelId: voiceChannelId })
    set({ voiceChannelId: null, localStream: null, voicePeers: [], peerConnections: {}, voiceMuted: false })
  },

  toggleMute: () => {
    const { localStream, voiceMuted, voiceChannelId } = get()
    if (!localStream) return
    const muted = !voiceMuted
    localStream.getAudioTracks().forEach(t => { t.enabled = !muted })
    set({ voiceMuted: muted })
    socket.emit('voice_mute', { channelId: voiceChannelId, muted })
  },

  _createPeerConnection: (targetSocketId) => {
    const { localStream, voiceChannelId } = get()
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    })
    if (localStream) localStream.getTracks().forEach(t => pc.addTrack(t, localStream))
    pc.onicecandidate = e => {
      if (e.candidate) socket.emit('voice_ice', { targetSocketId, candidate: e.candidate })
    }
    pc.ontrack = e => {
      const audio = new Audio()
      audio.srcObject = e.streams[0]
      audio.autoplay = true
      audio.play().catch(() => {})
    }
    pc.onconnectionstatechange = () => {
      if (['disconnected','failed','closed'].includes(pc.connectionState)) {
        set(s => { const p = { ...s.peerConnections }; delete p[targetSocketId]; return { peerConnections: p } })
      }
    }
    set(s => ({ peerConnections: { ...s.peerConnections, [targetSocketId]: pc } }))
    return pc
  },

  /* ── Socket bindings ── */
  _bound: false,
  _bindSocket: () => {
    if (get()._bound) return
    set({ _bound: true })

    socket.on('new_message', (msg) => {
      const { activeChannel, prefs } = get()
      if (activeChannel && msg.channel_id === activeChannel.id) {
        set(s => ({ messages: [...s.messages, msg] }))
        // Notification sound
        if (prefs.soundEnabled && msg.author_id !== get().me?.id) {
          try {
            const ctx = new AudioContext()
            const osc = ctx.createOscillator()
            const gain = ctx.createGain()
            osc.connect(gain); gain.connect(ctx.destination)
            osc.frequency.value = 880; gain.gain.value = 0.05
            osc.start(); osc.stop(ctx.currentTime + 0.08)
          } catch {}
        }
      }
    })

    socket.on('online_update', (ids) => set({ onlineUsers: ids }))

    // Server deleted our account → force logout
    socket.on('account_deleted', () => get().logout())

    // Someone changed their username → update their name in messages/friends lists
    socket.on('user_updated', (user) => {
      set(s => ({
        friends:  s.friends.map(f  => f.id === user.id ? { ...f, username: user.username } : f),
        messages: s.messages.map(m => m.author_id === user.id ? { ...m, username: user.username } : m),
        me:       s.me?.id === user.id ? { ...s.me, username: user.username } : s.me,
      }))
    })

    socket.on('channel_created', (chan) => {
      set(s => ({ channels: [...s.channels.filter(c => c.id !== chan.id), chan] }))
    })

    socket.on('channel_deleted', ({ channelId }) => {
      const { activeChannel } = get()
      set(s => ({
        channels:      s.channels.filter(c => c.id !== channelId),
        activeChannel: activeChannel?.id === channelId ? null : activeChannel,
        messages:      activeChannel?.id === channelId ? [] : s.messages,
      }))
    })

    socket.on('friend_request', (req) => {
      set(s => ({ requests: [...s.requests.filter(r => r.id !== req.id), req] }))
      get().showToast(`Friend request from ${req.username}! 👋`)
    })

    socket.on('request_sent',    () => get().showToast('Friend request sent! 📨'))

    socket.on('friend_added', (friend) => {
      set(s => ({
        friends:  [...s.friends.filter(f => f.id !== friend.id), friend],
        requests: s.requests.filter(r => r.from_id !== friend.id),
      }))
      get().showToast(`You and ${friend.username} are now friends! 🎉`)
    })

    socket.on('request_declined', ({ requestId }) => {
      set(s => ({ requests: s.requests.filter(r => r.id !== requestId) }))
    })

    socket.on('user_typing', ({ userId, username, isTyping }) => {
      set(s => ({
        typingUsers: isTyping
          ? [...s.typingUsers.filter(u => u.userId !== userId), { userId, username }]
          : s.typingUsers.filter(u => u.userId !== userId),
      }))
      if (isTyping) setTimeout(() =>
        set(s => ({ typingUsers: s.typingUsers.filter(u => u.userId !== userId) }))
      , 3000)
    })

    socket.on('error', (msg) => get().showToast(msg, 'err'))

    /* Voice signaling */
    socket.on('voice_peers', async (peers) => {
      const { _createPeerConnection, voiceChannelId } = get()
      for (const peer of peers) {
        const pc = _createPeerConnection(peer.socketId)
        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)
        socket.emit('voice_offer', { targetSocketId: peer.socketId, offer, channelId: voiceChannelId })
      }
      set(() => ({ voicePeers: peers.map(p => ({ ...p, muted: false })) }))
    })

    socket.on('voice_peer_joined', (peer) => {
      get()._createPeerConnection(peer.socketId)
      set(s => ({ voicePeers: [...s.voicePeers.filter(p => p.socketId !== peer.socketId), { ...peer, muted: false }] }))
    })

    socket.on('voice_offer', async ({ offer, fromSocketId, channelId }) => {
      const { peerConnections, _createPeerConnection, voiceChannelId } = get()
      if (voiceChannelId !== channelId) return
      let pc = peerConnections[fromSocketId]
      if (!pc) pc = _createPeerConnection(fromSocketId)
      await pc.setRemoteDescription(new RTCSessionDescription(offer))
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)
      socket.emit('voice_answer', { targetSocketId: fromSocketId, answer, channelId })
    })

    socket.on('voice_answer', async ({ answer, fromSocketId }) => {
      const pc = get().peerConnections[fromSocketId]
      if (pc) await pc.setRemoteDescription(new RTCSessionDescription(answer))
    })

    socket.on('voice_ice', async ({ candidate, fromSocketId }) => {
      const pc = get().peerConnections[fromSocketId]
      if (pc) try { await pc.addIceCandidate(new RTCIceCandidate(candidate)) } catch {}
    })

    socket.on('voice_peer_left', ({ socketId }) => {
      const pc = get().peerConnections[socketId]
      if (pc) pc.close()
      set(s => {
        const p = { ...s.peerConnections }; delete p[socketId]
        return { peerConnections: p, voicePeers: s.voicePeers.filter(p => p.socketId !== socketId) }
      })
    })

    socket.on('voice_room_update', ({ channelId, peers }) => {
      const { voiceChannelId, me } = get()
      if (voiceChannelId === channelId) {
        set(s => ({
          voicePeers: peers
            .filter(p => p.userId !== me?.id)
            .map(p => ({ ...p, muted: s.voicePeers.find(v => v.socketId === p.socketId)?.muted || false })),
        }))
      }
    })

    socket.on('voice_peer_muted', ({ userId, muted }) => {
      set(s => ({ voicePeers: s.voicePeers.map(p => p.userId === userId ? { ...p, muted } : p) }))
    })
  },
}))
