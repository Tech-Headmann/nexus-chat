import { create } from 'zustand'
import { api, socket, connectSocket, disconnectSocket } from './api'

// Protected default channels that cannot be deleted
const DEFAULT_CHANNEL_IDS = ['ch_general','ch_vibes','ch_tech','ch_gaming','ch_random']

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

  _afterAuth: async (user) => {
    set({ me: user, authBusy: false })
    connectSocket(user.id)
    const [channels, friends, requests] = await Promise.all([
      api.channels(), api.friends(user.id), api.requests(user.id),
    ])
    set({ channels, friends, requests })
    get()._bindSocket()
  },

  /* ── Channels & messages ── */
  channels:       [],
  activeChannel:  null,
  activeDmUserId: null,
  messages:       [],
  typingUsers:    [],

  openChannel: async (channel) => {
    // Leave any voice call when switching channels
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

  createChannel: (name, icon) => {
    socket.emit('create_channel', { name, icon, description: '' })
  },

  deleteChannel: (channelId) => {
    socket.emit('delete_channel', { channelId })
  },

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

  /* ════════════════════════════════════════════════════════════════════════
     VOICE CALL STATE
     Uses WebRTC for peer-to-peer audio, Socket.IO for signaling only
  ════════════════════════════════════════════════════════════════════════ */
  voiceChannelId:  null,   // channel we're currently in
  voicePeers:      [],     // [{ userId, socketId, username, avatar, color, muted }]
  voiceMuted:      false,
  localStream:     null,   // our microphone MediaStream
  peerConnections: {},     // socketId → RTCPeerConnection

  joinVoice: async (channelId) => {
    const { me, peerConnections } = get()

    // Get microphone
    let stream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
    } catch (e) {
      get().showToast('Microphone access denied ❌', 'err')
      return
    }

    set({ voiceChannelId: channelId, localStream: stream, voicePeers: [], voiceMuted: false })

    // Tell server we joined — it responds with voice_peers (existing users)
    socket.emit('voice_join', { channelId })
  },

  leaveVoice: () => {
    const { voiceChannelId, localStream, peerConnections } = get()

    // Stop mic
    if (localStream) localStream.getTracks().forEach(t => t.stop())

    // Close all peer connections
    Object.values(peerConnections).forEach(pc => pc.close())

    if (voiceChannelId) socket.emit('voice_leave', { channelId: voiceChannelId })

    set({ voiceChannelId: null, localStream: null, voicePeers: [], peerConnections: {}, voiceMuted: false })
  },

  toggleMute: () => {
    const { localStream, voiceMuted, voiceChannelId } = get()
    if (!localStream) return
    const newMuted = !voiceMuted
    localStream.getAudioTracks().forEach(t => { t.enabled = !newMuted })
    set({ voiceMuted: newMuted })
    socket.emit('voice_mute', { channelId: voiceChannelId, muted: newMuted })
  },

  // Create a WebRTC peer connection to a remote peer
  _createPeerConnection: (targetSocketId) => {
    const { localStream, peerConnections, voiceChannelId } = get()

    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    })

    // Add our audio tracks
    if (localStream) {
      localStream.getTracks().forEach(track => pc.addTrack(track, localStream))
    }

    // When we get ICE candidates, send them to the peer
    pc.onicecandidate = (e) => {
      if (e.candidate) {
        socket.emit('voice_ice', { targetSocketId, candidate: e.candidate })
      }
    }

    // When we receive remote audio tracks, play them
    pc.ontrack = (e) => {
      const audio = new Audio()
      audio.srcObject = e.streams[0]
      audio.autoplay = true
      audio.play().catch(() => {})
    }

    pc.onconnectionstatechange = () => {
      if (['disconnected','failed','closed'].includes(pc.connectionState)) {
        set(s => {
          const pcs = { ...s.peerConnections }
          delete pcs[targetSocketId]
          return { peerConnections: pcs }
        })
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
      const { activeChannel } = get()
      if (activeChannel && msg.channel_id === activeChannel.id)
        set(s => ({ messages: [...s.messages, msg] }))
    })

    socket.on('online_update', (ids) => set({ onlineUsers: ids }))

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

    /* ── Voice signaling events ── */

    // Server tells us who is already in the voice room when we join
    // We initiate offers TO each of them
    socket.on('voice_peers', async (peers) => {
      const { _createPeerConnection, voiceChannelId } = get()
      for (const peer of peers) {
        const pc = _createPeerConnection(peer.socketId)
        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)
        socket.emit('voice_offer', { targetSocketId: peer.socketId, offer, channelId: voiceChannelId })
      }
      set(s => ({
        voicePeers: peers.map(p => ({ ...p, muted: false })),
      }))
    })

    // A new peer joined the room — they will send us an offer
    socket.on('voice_peer_joined', (peer) => {
      get()._createPeerConnection(peer.socketId)
      set(s => ({
        voicePeers: [...s.voicePeers.filter(p => p.socketId !== peer.socketId), { ...peer, muted: false }],
      }))
    })

    // We received an offer from a peer who was already in the room
    socket.on('voice_offer', async ({ offer, fromSocketId, channelId }) => {
      let { peerConnections, _createPeerConnection, voiceChannelId } = get()
      if (voiceChannelId !== channelId) return

      let pc = peerConnections[fromSocketId]
      if (!pc) pc = _createPeerConnection(fromSocketId)

      await pc.setRemoteDescription(new RTCSessionDescription(offer))
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)
      socket.emit('voice_answer', { targetSocketId: fromSocketId, answer, channelId })
    })

    // We received an answer to our offer
    socket.on('voice_answer', async ({ answer, fromSocketId }) => {
      const { peerConnections } = get()
      const pc = peerConnections[fromSocketId]
      if (pc) await pc.setRemoteDescription(new RTCSessionDescription(answer))
    })

    // ICE candidate from a peer
    socket.on('voice_ice', async ({ candidate, fromSocketId }) => {
      const { peerConnections } = get()
      const pc = peerConnections[fromSocketId]
      if (pc) {
        try { await pc.addIceCandidate(new RTCIceCandidate(candidate)) }
        catch (e) { /* ignore stale candidates */ }
      }
    })

    // A peer left the voice room
    socket.on('voice_peer_left', ({ socketId, userId }) => {
      const { peerConnections } = get()
      const pc = peerConnections[socketId]
      if (pc) { pc.close() }
      set(s => {
        const pcs = { ...s.peerConnections }
        delete pcs[socketId]
        return {
          peerConnections: pcs,
          voicePeers: s.voicePeers.filter(p => p.socketId !== socketId),
        }
      })
    })

    // Voice room state update (full peer list)
    socket.on('voice_room_update', ({ channelId, peers }) => {
      const { voiceChannelId, me } = get()
      // Update voice peers list, preserving mute state
      if (voiceChannelId === channelId) {
        set(s => ({
          voicePeers: peers
            .filter(p => p.userId !== me?.id)
            .map(p => ({
              ...p,
              muted: s.voicePeers.find(vp => vp.socketId === p.socketId)?.muted || false,
            })),
        }))
      }
    })

    // Peer muted/unmuted
    socket.on('voice_peer_muted', ({ userId, muted }) => {
      set(s => ({
        voicePeers: s.voicePeers.map(p => p.userId === userId ? { ...p, muted } : p),
      }))
    })
  },
}))
