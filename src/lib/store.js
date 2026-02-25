import { create } from 'zustand'
import { api, socket, connectSocket, disconnectSocket } from './api'

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
    } catch (e) {
      set({ authErr: e.message, authBusy: false })
    }
  },

  login: async (username, password) => {
    set({ authBusy: true, authErr: '' })
    try {
      const { user } = await api.login({ username, password })
      await get()._afterAuth(user)
    } catch (e) {
      set({ authErr: e.message, authBusy: false })
    }
  },

  _afterAuth: async (user) => {
    set({ me: user, authBusy: false })
    connectSocket(user.id)
    const [channels, friends, requests] = await Promise.all([
      api.channels(),
      api.friends(user.id),
      api.requests(user.id),
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

  /* ── Friends ── */
  friends:     [],
  requests:    [],
  onlineUsers: [],

  sendFriendRequest: (toId)               => socket.emit('send_friend_request', { toId }),
  acceptRequest:     (requestId, fromId)  => socket.emit('accept_request', { requestId, fromId }),
  declineRequest:    (requestId)          => socket.emit('decline_request', { requestId }),

  /* ── Toast ── */
  toast: null,
  showToast: (msg, type = 'ok') => {
    set({ toast: { msg, type } })
    setTimeout(() => set({ toast: null }), 3000)
  },

  /* ── Socket events ── */
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
      set(s => ({
        channels: [...s.channels.filter(c => c.id !== chan.id), chan]
      }))
    })

    socket.on('friend_request', (req) => {
      set(s => ({ requests: [...s.requests.filter(r => r.id !== req.id), req] }))
      get().showToast(`Friend request from ${req.username}! 👋`)
    })

    socket.on('request_sent', () => get().showToast('Friend request sent! 📨'))

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
      if (isTyping) {
        setTimeout(() =>
          set(s => ({ typingUsers: s.typingUsers.filter(u => u.userId !== userId) }))
        , 3000)
      }
    })

    socket.on('error', (msg) => get().showToast(msg, 'err'))
  },
}))
