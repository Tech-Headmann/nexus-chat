import { useState } from 'react'
import { useStore } from '../lib/store'
import { C, CHAN_ICONS } from '../lib/theme'
import { api } from '../lib/api'

/* ── Shared avatar ─────────────────────────────────────────────────────────── */
export function Avatar({ avatar, color, size = 30, radius = 9 }) {
  return (
    <div style={{
      width:size, height:size, borderRadius:radius,
      background:(color||C.accent)+'33',
      display:'flex', alignItems:'center', justifyContent:'center',
      fontSize:size*0.55, flexShrink:0,
    }}>
      {avatar || '🦋'}
    </div>
  )
}

export function Dot({ online, bg }) {
  const bgColor = bg || C.sidebar
  return (
    <div style={{
      position:'absolute', bottom:-2, right:-2,
      width:9, height:9, borderRadius:'50%',
      background: online ? C.emerald : C.sub,
      border:`2px solid ${bgColor}`,
    }} />
  )
}

/* ── Main Sidebar ──────────────────────────────────────────────────────────── */
export default function Sidebar({ view, setView }) {
  const {
    me, channels, friends, requests, onlineUsers,
    openChannel, openDm, createChannel, deleteChannel, canDeleteChannel,
    sendFriendRequest, acceptRequest, declineRequest,
    voiceChannelId, joinVoice,
    _themeVersion, // subscribe so re-renders when theme changes
  } = useStore()

  const [newChanOpen, setNewChanOpen] = useState(false)
  const [newChanName, setNewChanName] = useState('')
  const [newChanIcon, setNewChanIcon] = useState('✨')
  const [search,      setSearch]      = useState('')
  const [searchRes,   setSearchRes]   = useState(null)
  const [confirmDel,  setConfirmDel]  = useState(null)

  const incomingReqs = requests.filter(r => r.to_id === me?.id)
  const isOnline = (id) => onlineUsers.includes(id)

  const doSearch = async (q) => {
    setSearch(q)
    if (!q.trim()) { setSearchRes(null); return }
    const res = await api.search(q)
    setSearchRes(res.filter(u => u.id !== me?.id))
  }

  const submitNewChan = () => {
    if (!newChanName.trim()) return
    createChannel(newChanName, newChanIcon)
    setNewChanName(''); setNewChanIcon('✨'); setNewChanOpen(false)
  }

  const handleDelete = (ch) => {
    if (confirmDel === ch.id) {
      deleteChannel(ch.id)
      setConfirmDel(null)
    } else {
      setConfirmDel(ch.id)
      setTimeout(() => setConfirmDel(c => c === ch.id ? null : c), 3000)
    }
  }

  // All container styles computed at render time so C.* values are fresh
  const sidebarStyle = {
    width:234, background:C.sidebar, borderRight:`1px solid ${C.border}`,
    display:'flex', flexDirection:'column', overflowY:'auto', flexShrink:0,
  }
  const miniInp = {
    background:C.card2, border:`1px solid ${C.border}`, borderRadius:8,
    padding:'8px 10px', color:C.text, fontSize:13, outline:'none', boxSizing:'border-box',
  }
  const sideTitle = {
    fontFamily:"'Bricolage Grotesque',sans-serif", fontWeight:700,
    fontSize:15, color:C.text, marginBottom:14, marginTop:16,
  }

  return (
    <div style={sidebarStyle}>

      {/* ── CHANNELS VIEW ── */}
      {view === 'chat' && (
        <>
          {/* Section header */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 14px 5px', fontFamily:"'Bricolage Grotesque',sans-serif", fontWeight:700, fontSize:10, color:C.sub, letterSpacing:1, textTransform:'uppercase' }}>
            CHANNELS
            <button onClick={() => setNewChanOpen(v => !v)} title="New channel"
              style={{ background:'none', border:'none', color:C.sub, fontSize:20, lineHeight:1, padding:0, cursor:'pointer' }}>
              ＋
            </button>
          </div>

          {/* New channel form */}
          {newChanOpen && (
            <div style={{ margin:'0 8px 8px', background:C.card, borderRadius:10, padding:10, border:`1px solid ${C.border}` }}>
              <div style={{ display:'flex', flexWrap:'wrap', gap:4, marginBottom:8 }}>
                {CHAN_ICONS.map(ic => (
                  <button key={ic} onClick={() => setNewChanIcon(ic)} style={{
                    width:28, height:28, borderRadius:6, fontSize:15, cursor:'pointer',
                    background: newChanIcon===ic ? C.accent+'33' : 'transparent',
                    border:`2px solid ${newChanIcon===ic ? C.accent : 'transparent'}`,
                  }}>{ic}</button>
                ))}
              </div>
              <input
                placeholder="channel-name" value={newChanName}
                onChange={e => setNewChanName(e.target.value)}
                onKeyDown={e => e.key==='Enter' && submitNewChan()}
                style={{ ...miniInp, width:'100%' }}
              />
              <button onClick={submitNewChan} style={{ width:'100%', marginTop:6, padding:'7px 0', background:C.accent, border:'none', borderRadius:7, color:'#fff', fontFamily:"'Bricolage Grotesque',sans-serif", fontWeight:700, fontSize:12, cursor:'pointer' }}>
                Create Channel
              </button>
            </div>
          )}

          {/* Channel rows */}
          {channels.map(ch => {
            const canDel = canDeleteChannel(ch)
            const isDel  = confirmDel === ch.id
            const inVoice = voiceChannelId === ch.id
            return (
              <ChannelRow
                key={ch.id}
                ch={ch}
                canDel={canDel}
                isDel={isDel}
                inVoice={inVoice}
                onOpen={() => { openChannel(ch); setView('chat') }}
                onVoice={() => { joinVoice(ch.id); openChannel(ch); setView('chat') }}
                onDelete={() => handleDelete(ch)}
              />
            )
          })}

          {/* DMs */}
          {friends.length > 0 && (
            <>
              <div style={{ padding:'14px 14px 5px', fontFamily:"'Bricolage Grotesque',sans-serif", fontWeight:700, fontSize:10, color:C.sub, letterSpacing:1, textTransform:'uppercase' }}>
                DIRECT MESSAGES
              </div>
              {friends.map(f => (
                <SideItem key={f.id} onClick={() => { openDm(f.id); setView('chat') }}>
                  <div style={{ position:'relative', flexShrink:0, marginRight:8 }}>
                    <Avatar avatar={f.avatar} color={f.color} size={26} radius={7} />
                    <Dot online={isOnline(f.id)} bg={C.sidebar} />
                  </div>
                  <span style={{ fontSize:13, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', color:C.sub }}>{f.username}</span>
                </SideItem>
              ))}
            </>
          )}
        </>
      )}

      {/* ── DISCOVER ── */}
      {view === 'discover' && (
        <div style={{ padding:14 }}>
          <div style={sideTitle}>Find People</div>
          <input placeholder="Search username..." value={search} onChange={e => doSearch(e.target.value)} style={{ ...miniInp, width:'100%', marginBottom:12 }} />
          {searchRes === null
            ? <div style={{ fontSize:12, color:C.sub }}>Type to search users</div>
            : searchRes.length === 0
              ? <div style={{ fontSize:12, color:C.sub }}>No users found</div>
              : searchRes.map(u => (
                  <UserRow key={u.id} u={u} friends={friends} isOnline={isOnline(u.id)}
                    onAdd={() => sendFriendRequest(u.id)}
                    onDm={() => { openDm(u.id); setView('chat') }}
                  />
                ))
          }
        </div>
      )}

      {/* ── FRIENDS ── */}
      {view === 'friends' && (
        <div style={{ padding:14 }}>
          <div style={sideTitle}>Friends</div>
          {friends.length === 0
            ? <div style={{ fontSize:13, color:C.sub }}>No friends yet — use Discover 🔍</div>
            : friends.map(f => (
                <div key={f.id} style={{ display:'flex', alignItems:'center', gap:9, padding:'8px 0', borderBottom:`1px solid ${C.border}` }}>
                  <div style={{ position:'relative' }}>
                    <Avatar avatar={f.avatar} color={f.color} size={30} radius={9} />
                    <Dot online={isOnline(f.id)} bg={C.sidebar} />
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, color:C.text, fontWeight:600 }}>{f.username}</div>
                    <div style={{ fontSize:11, color: isOnline(f.id) ? C.emerald : C.sub }}>{isOnline(f.id) ? 'online' : 'offline'}</div>
                  </div>
                  <button onClick={() => { openDm(f.id); setView('chat') }} style={{ background:C.accent+'22', border:'none', borderRadius:7, padding:'4px 10px', color:C.accent, fontSize:11, fontWeight:600, cursor:'pointer' }}>DM</button>
                </div>
              ))
          }
        </div>
      )}

      {/* ── NOTIFICATIONS ── */}
      {view === 'notifs' && (
        <div style={{ padding:14 }}>
          <div style={sideTitle}>Notifications</div>
          {incomingReqs.length === 0
            ? <div style={{ fontSize:13, color:C.sub }}>All clear! 🎉</div>
            : incomingReqs.map(req => (
                <div key={req.id} style={{ background:C.card, borderRadius:12, padding:12, marginBottom:10, border:`1px solid ${C.border}` }}>
                  <div style={{ display:'flex', alignItems:'center', gap:9, marginBottom:10 }}>
                    <Avatar avatar={req.avatar} color={req.color} size={32} radius={10} />
                    <div>
                      <div style={{ fontSize:13, color:C.text, fontWeight:600 }}>{req.username}</div>
                      <div style={{ fontSize:11, color:C.sub }}>wants to be friends</div>
                    </div>
                  </div>
                  <div style={{ display:'flex', gap:6 }}>
                    <button onClick={() => acceptRequest(req.id, req.from_id)} style={{ flex:1, padding:'8px 0', background:C.emerald, border:'none', borderRadius:8, color:'#000', fontWeight:700, fontSize:12, cursor:'pointer' }}>✓ Accept</button>
                    <button onClick={() => declineRequest(req.id)} style={{ flex:1, padding:'8px 0', background:C.rose+'22', border:`1px solid ${C.rose}44`, borderRadius:8, color:C.rose, fontSize:12, cursor:'pointer' }}>✕ Decline</button>
                  </div>
                </div>
              ))
          }
        </div>
      )}
    </div>
  )
}

/* ── Channel row with delete + voice ──────────────────────────────────────── */
function ChannelRow({ ch, canDel, isDel, inVoice, onOpen, onVoice, onDelete }) {
  const [hover, setHover] = useState(false)
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display:'flex', alignItems:'center', gap:4,
        padding:'6px 8px 6px 12px', margin:'1px 6px', borderRadius:9,
        cursor:'pointer', transition:'all .12s',
        background: hover ? C.card : 'transparent',
        color: hover ? C.text : C.sub,
      }}
    >
      {/* Click area — open channel */}
      <div onClick={onOpen} style={{ display:'flex', alignItems:'center', flex:1, minWidth:0 }}>
        <span style={{ fontSize:14, marginRight:7, flexShrink:0 }}>{ch.icon}</span>
        <span style={{ fontSize:13, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
          # {ch.name}
        </span>
      </div>

      {/* Voice button */}
      {inVoice
        ? <span style={{ fontSize:12, color:C.emerald }} title="In voice">🎙️</span>
        : hover && (
            <button onClick={e => { e.stopPropagation(); onVoice() }} title="Join voice"
              style={{ background:'none', border:'none', fontSize:13, cursor:'pointer', padding:'0 2px', color:C.sub, opacity:0.7 }}>
              🔊
            </button>
          )
      }

      {/* Delete button — only rendered if canDel */}
      {canDel && hover && (
        <button
          onClick={e => { e.stopPropagation(); onDelete() }}
          title={isDel ? 'Click again to confirm' : 'Delete channel'}
          style={{
            fontSize:11, cursor:'pointer', padding:'2px 6px', borderRadius:5,
            fontWeight: isDel ? 700 : 400,
            color:      isDel ? C.rose : C.sub,
            background: isDel ? C.rose+'25' : 'none',
            border:     isDel ? `1px solid ${C.rose}55` : 'none',
          }}
        >
          {isDel ? '✕ sure?' : '🗑'}
        </button>
      )}
    </div>
  )
}

/* ── Generic sidebar clickable row ── */
function SideItem({ onClick, children }) {
  const [hover, setHover] = useState(false)
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display:'flex', alignItems:'center',
        padding:'7px 12px', margin:'1px 6px', borderRadius:9,
        cursor:'pointer', transition:'all .12s',
        background: hover ? C.card : 'transparent',
      }}
    >
      {children}
    </div>
  )
}

/* ── User search result row ── */
function UserRow({ u, friends, isOnline, onAdd, onDm }) {
  const isFriend = friends.some(f => f.id === u.id)
  return (
    <div style={{ display:'flex', alignItems:'center', gap:9, padding:'8px 0', borderBottom:`1px solid ${C.border}` }}>
      <div style={{ position:'relative' }}>
        <Avatar avatar={u.avatar} color={u.color} size={30} radius={9} />
        <Dot online={isOnline} bg={C.sidebar} />
      </div>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:13, color:C.text, fontWeight:600 }}>{u.username}</div>
        <div style={{ fontSize:11, color: isOnline ? C.emerald : C.sub }}>{isOnline ? 'online' : 'offline'}</div>
      </div>
      {isFriend
        ? <button onClick={onDm} style={{ width:28, height:28, borderRadius:7, background:C.accent+'22', border:'none', fontSize:13, cursor:'pointer' }}>💬</button>
        : <button onClick={onAdd} style={{ width:28, height:28, borderRadius:7, background:C.emerald+'22', border:`1px solid ${C.emerald}55`, fontSize:13, cursor:'pointer' }}>➕</button>
      }
    </div>
  )
}
