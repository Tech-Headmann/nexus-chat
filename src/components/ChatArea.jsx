import { useEffect, useRef, useState } from 'react'
import { useStore } from '../lib/store'
import { C } from '../lib/theme'
import { Avatar } from './Sidebar'

export default function ChatArea() {
  const {
    me, messages, activeChannel, activeDmUserId, friends,
    onlineUsers, typingUsers, sendMessage, setTyping,
    channels, openChannel,
    voiceChannelId, joinVoice, leaveVoice, voicePeers,
  } = useStore()

  const [input,   setInput]   = useState('')
  const endRef                = useRef(null)
  const typingRef             = useRef(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = () => {
    const text = input.trim()
    if (!text) return
    sendMessage(text)
    setInput('')
    stopTyping()
  }

  const startTyping = () => {
    setTyping(true)
    clearTimeout(typingRef.current)
    typingRef.current = setTimeout(stopTyping, 2000)
  }

  const stopTyping = () => {
    setTyping(false)
    clearTimeout(typingRef.current)
  }

  const onKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const isOnline  = (id) => onlineUsers.includes(id)
  const dmFriend  = activeDmUserId ? friends.find(f => f.id === activeDmUserId) : null

  // Voice state for this channel
  const isDm           = activeChannel && (activeChannel.is_dm === 1 || activeChannel.is_dm === true)
  const isInThisVoice  = voiceChannelId === activeChannel?.id
  const voiceCount     = isInThisVoice ? voicePeers.length + 1 : 0

  /* ── Welcome screen ── */
  if (!activeChannel) {
    return (
      <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:C.bg, gap:12 }}>
        <div style={{ fontSize:56 }}>⚛</div>
        <div style={{ fontFamily:"'Bricolage Grotesque',sans-serif", fontWeight:800, fontSize:26, color:C.text }}>Welcome to NEXUS</div>
        <div style={{ fontSize:14, color:C.sub }}>Pick a channel to start chatting</div>
        <div style={{ display:'flex', gap:8, marginTop:8, flexWrap:'wrap', justifyContent:'center' }}>
          {channels.slice(0,5).map(ch => (
            <button key={ch.id} onClick={() => openChannel(ch)} style={{ padding:'9px 18px', background:C.card, border:`1px solid ${C.border}`, borderRadius:10, color:C.text, fontSize:13 }}>
              {ch.icon} #{ch.name}
            </button>
          ))}
        </div>
      </div>
    )
  }

  const chatTitle = isDm ? (dmFriend?.username || 'Direct Message') : `# ${activeChannel.name}`
  const chatSub   = isDm
    ? (isOnline(activeDmUserId) ? '● online' : '○ offline')
    : (activeChannel.description || '')

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', minWidth:0, background:C.bg }}>

      {/* ── Header ── */}
      <div style={{ padding:'11px 18px', borderBottom:`1px solid ${C.border}`, background:C.panel, display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          {isDm && dmFriend && (
            <div style={{ position:'relative' }}>
              <Avatar avatar={dmFriend.avatar} color={dmFriend.color} size={34} radius={11} />
              <div style={{ position:'absolute', bottom:-2, right:-2, width:10, height:10, borderRadius:'50%', background: isOnline(activeDmUserId) ? C.emerald : C.sub, border:`2px solid ${C.panel}` }} />
            </div>
          )}
          <div>
            <div style={{ fontFamily:"'Bricolage Grotesque',sans-serif", fontWeight:700, fontSize:16, color:C.text }}>{chatTitle}</div>
            <div style={{ fontSize:11, color: isDm ? (isOnline(activeDmUserId) ? C.emerald : C.sub) : C.sub }}>{chatSub}</div>
          </div>
        </div>

        {/* Right side — online count + voice button */}
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ display:'flex', alignItems:'center', gap:5 }}>
            <div style={{ width:7, height:7, borderRadius:'50%', background:C.emerald, boxShadow:`0 0 6px ${C.emerald}` }} />
            <div style={{ fontSize:11, color:C.sub }}>{onlineUsers.length} online</div>
          </div>

          {/* Voice call button — only for public channels */}
          {!isDm && (
            isInThisVoice ? (
              <button onClick={leaveVoice} style={voiceBtnActive} title="Leave voice call">
                🎙️ {voiceCount > 0 && <span style={{ fontSize:10 }}>{voiceCount}</span>}
                <span style={{ fontSize:11 }}>Leave</span>
              </button>
            ) : (
              <button onClick={() => joinVoice(activeChannel.id)} style={voiceBtn} title="Join voice call">
                🔊 <span style={{ fontSize:11 }}>Voice</span>
              </button>
            )
          )}
        </div>
      </div>

      {/* ── Voice bar — shown when others are in voice but you're not ── */}
      {!isDm && !isInThisVoice && voiceChannelId === null && (
        <VoicePreviewBar channelId={activeChannel.id} />
      )}

      {/* ── Messages ── */}
      <div style={{ flex:1, overflowY:'auto', padding:'16px 22px', display:'flex', flexDirection:'column' }}>
        {messages.length === 0 && (
          <div style={{ textAlign:'center', color:C.sub, fontSize:14, paddingTop:48 }}>
            No messages yet — say something! 👋
          </div>
        )}

        {messages.map((msg, i) => {
          const isMe    = msg.author_id === me.id
          const prev    = messages[i - 1]
          const grouped = prev && prev.author_id === msg.author_id
          const ts      = msg.created_at ? new Date(msg.created_at * 1000).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' }) : ''

          return (
            <div key={msg.id} style={{ display:'flex', flexDirection: isMe ? 'row-reverse' : 'row', gap:9, alignItems:'flex-end', marginTop: grouped ? 2 : 12, animation:'fadeUp .2s ease both' }}>
              {grouped
                ? <div style={{ width:34, flexShrink:0 }} />
                : <Avatar avatar={msg.avatar} color={msg.color} size={34} radius={11} />
              }
              <div style={{ maxWidth:'62%', display:'flex', flexDirection:'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                {!grouped && (
                  <div style={{ display:'flex', alignItems:'baseline', gap:6, flexDirection: isMe ? 'row-reverse' : 'row', marginBottom:3 }}>
                    <span style={{ fontFamily:"'Bricolage Grotesque',sans-serif", fontWeight:700, fontSize:12, color: msg.color || C.accent }}>
                      {isMe ? 'You' : msg.username}
                    </span>
                    <span style={{ fontSize:10, color:C.sub }}>{ts}</span>
                  </div>
                )}
                <div style={{
                  padding:'9px 14px', fontSize:14, lineHeight:1.55, color:C.text,
                  background:   isMe ? C.accent : C.card,
                  border:       `1px solid ${isMe ? 'transparent' : C.border}`,
                  borderRadius: isMe
                    ? (grouped ? '16px 4px 4px 16px' : '16px 4px 16px 16px')
                    : (grouped ? '4px 16px 16px 4px' : '4px 16px 16px 16px'),
                  boxShadow:    isMe ? `0 4px 20px ${C.accent}33` : 'none',
                  wordBreak:    'break-word',
                }}>
                  {msg.content}
                </div>
              </div>
            </div>
          )
        })}

        {typingUsers.length > 0 && (
          <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:8, color:C.sub, fontSize:12 }}>
            <div style={{ display:'flex', gap:3 }}>
              {[0,1,2].map(i => (
                <div key={i} style={{ width:5, height:5, borderRadius:'50%', background:C.sub, animation:`fadeUp .6s ${i*0.15}s ease infinite alternate` }} />
              ))}
            </div>
            {typingUsers.map(u => u.username).join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
          </div>
        )}

        <div ref={endRef} />
      </div>

      {/* ── Input ── */}
      <div style={{ padding:'12px 22px 14px', borderTop:`1px solid ${C.border}`, background:C.panel, flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, background:C.card, borderRadius:13, padding:'10px 14px', border:`1px solid ${C.border}` }}>
          <textarea
            rows={1}
            value={input}
            onChange={e => { setInput(e.target.value); startTyping() }}
            onKeyDown={onKey}
            onBlur={stopTyping}
            placeholder={`Message ${chatTitle}...`}
            style={{ flex:1, background:'none', border:'none', color:C.text, fontSize:14, outline:'none', lineHeight:1.5, maxHeight:120, overflowY:'auto' }}
          />
          <button onClick={handleSend} style={{ width:34, height:34, borderRadius:9, border:'none', fontSize:14, transition:'all .18s', background: input.trim() ? C.accent : C.card2, color: input.trim() ? '#fff' : C.sub, boxShadow: input.trim() ? `0 2px 14px ${C.accent}44` : 'none', flexShrink:0 }}>
            ➤
          </button>
        </div>
        <div style={{ fontSize:10, color:C.sub, marginTop:5, paddingLeft:2 }}>Enter to send · Shift+Enter for new line</div>
      </div>
    </div>
  )
}

/* ── Shows when other people are in voice but you haven't joined yet ── */
function VoicePreviewBar({ channelId }) {
  const { voiceChannelId: myVoice } = useStore()
  // Only show if no one is in voice (we can't easily peek without joining)
  // This bar appears only when actively in a different voice channel
  return null
}

const voiceBtn = {
  display:'flex', alignItems:'center', gap:5, padding:'5px 12px',
  background: C.card, border:`1px solid ${C.border}`, borderRadius:8,
  color:C.text, fontSize:14, cursor:'pointer', transition:'all .15s',
}

const voiceBtnActive = {
  display:'flex', alignItems:'center', gap:5, padding:'5px 12px',
  background: C.emerald+'22', border:`1px solid ${C.emerald}55`, borderRadius:8,
  color:C.emerald, fontSize:14, cursor:'pointer', animation:'fadeUp .5s ease infinite alternate',
}
