import { useState, useRef } from 'react'
import { useStore } from '../lib/store'
import { C, CHAN_ICONS } from '../lib/theme'
import { api } from '../lib/api'

/* ── Avatar helper ─────────────────────────────────────────────────────────── */
export function Avatar({ avatar, avatarImg, color, size=32, radius=10 }) {
  if (avatarImg) {
    return (
      <div style={{ width:size, height:size, borderRadius:radius, overflow:'hidden', flexShrink:0, background:color+'22' }}>
        <img src={avatarImg} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
      </div>
    )
  }
  return (
    <div style={{ width:size, height:size, borderRadius:radius, background:(color||C.accent)+'33', display:'flex', alignItems:'center', justifyContent:'center', fontSize:size*0.52, flexShrink:0 }}>
      {avatar||'🦋'}
    </div>
  )
}

export function Dot({ online, bg }) {
  return (
    <div style={{ position:'absolute', bottom:-2, right:-2, width:10, height:10, borderRadius:'50%', background:online?C.emerald:C.sub, border:`2px solid ${bg||C.sidebar}` }} />
  )
}

const STATUS_COLORS = { online:'#34d399', away:'#fbbf24', dnd:'#fb7185', invisible:'#6b7280' }
const STATUS_ICONS  = { online:'●', away:'◐', dnd:'⊘', invisible:'○' }

/* ── Main Sidebar ──────────────────────────────────────────────────────────── */
export default function Sidebar({ view, setView }) {
  const {
    me, channels, friends, requests, onlineUsers,
    openChannel, openDm, createChannel, deleteChannel, canDeleteChannel,
    sendFriendRequest, acceptRequest, declineRequest,
    voiceChannelId, joinVoice, prefs, openSettings,
    _themeVersion,
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
    setSearchRes((await api.search(q)).filter(u => u.id !== me?.id))
  }

  const submitNewChan = () => {
    if (!newChanName.trim()) return
    createChannel(newChanName, newChanIcon)
    setNewChanName(''); setNewChanIcon('✨'); setNewChanOpen(false)
  }

  const handleDelete = (ch) => {
    if (confirmDel === ch.id) { deleteChannel(ch.id); setConfirmDel(null) }
    else { setConfirmDel(ch.id); setTimeout(() => setConfirmDel(c => c===ch.id ? null : c), 3000) }
  }

  return (
    <div style={{ width:240, background:C.sidebar, display:'flex', flexDirection:'column', flexShrink:0, overflow:'hidden', borderRight:`1px solid ${C.border}` }}>

      {/* ── Server name header (like Discord) ── */}
      <div style={{ padding:'14px 16px 12px', borderBottom:`1px solid ${C.border}`, display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
        <div style={{ fontFamily:"'Bricolage Grotesque',sans-serif", fontWeight:800, fontSize:15, color:C.text, letterSpacing:'-0.3px' }}>
          ⚛ NEXUS
        </div>
        {/* Notification badge for view switcher */}
        <div style={{ display:'flex', gap:4 }}>
          {[
            { v:'chat',     icon:'💬', tip:'Channels' },
            { v:'discover', icon:'🔍', tip:'Discover' },
            { v:'friends',  icon:'👥', tip:'Friends' },
            { v:'notifs',   icon:'🔔', tip:'Notifs',  badge: incomingReqs.length },
          ].map(item => (
            <button key={item.v} title={item.tip} onClick={() => setView(item.v)} style={{
              width:28, height:28, borderRadius:8, border:'none', fontSize:14,
              position:'relative', display:'flex', alignItems:'center', justifyContent:'center',
              background: view===item.v ? C.accent+'33' : 'transparent',
              color: view===item.v ? C.accent : C.sub, cursor:'pointer', transition:'all .15s',
            }}>
              {item.icon}
              {item.badge > 0 && <div style={{ position:'absolute', top:-2, right:-2, width:14, height:14, background:C.rose, borderRadius:'50%', fontSize:8, display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:800 }}>{item.badge}</div>}
            </button>
          ))}
        </div>
      </div>

      {/* ── Scrollable content ── */}
      <div style={{ flex:1, overflowY:'auto', padding:'8px 0' }}>

        {/* CHANNELS */}
        {view === 'chat' && (
          <>
            {/* Section header */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 16px 4px', color:C.sub }}>
              <span style={{ fontSize:11, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', fontFamily:"'Bricolage Grotesque',sans-serif" }}>
                Text Channels
              </span>
              <button onClick={() => setNewChanOpen(v=>!v)} title="New channel" style={{ background:'none', border:'none', color:C.sub, fontSize:18, lineHeight:1, cursor:'pointer', padding:0, display:'flex', alignItems:'center' }}>＋</button>
            </div>

            {/* New channel form */}
            {newChanOpen && (
              <div style={{ margin:'4px 8px 8px', background:C.card, borderRadius:10, padding:10, border:`1px solid ${C.border}` }}>
                <div style={{ display:'flex', flexWrap:'wrap', gap:3, marginBottom:7 }}>
                  {CHAN_ICONS.map(ic => (
                    <button key={ic} onClick={() => setNewChanIcon(ic)} style={{ width:26, height:26, borderRadius:5, fontSize:13, cursor:'pointer', background: newChanIcon===ic ? C.accent+'33' : 'transparent', border:`1.5px solid ${newChanIcon===ic ? C.accent : 'transparent'}` }}>{ic}</button>
                  ))}
                </div>
                <input placeholder="channel-name" value={newChanName} onChange={e => setNewChanName(e.target.value)} onKeyDown={e => e.key==='Enter' && submitNewChan()} style={{ width:'100%', background:C.card2, border:`1px solid ${C.border}`, borderRadius:7, padding:'7px 10px', color:C.text, fontSize:12, outline:'none', boxSizing:'border-box' }} />
                <button onClick={submitNewChan} style={{ width:'100%', marginTop:6, padding:'6px 0', background:C.accent, border:'none', borderRadius:6, color:'#fff', fontWeight:700, fontSize:12, cursor:'pointer' }}>Create</button>
              </div>
            )}

            {/* Channel list */}
            {channels.map(ch => (
              <ChannelRow
                key={ch.id}
                ch={ch}
                canDel={canDeleteChannel(ch)}
                isDel={confirmDel === ch.id}
                inVoice={voiceChannelId === ch.id}
                onOpen={() => { openChannel(ch); setView('chat') }}
                onVoice={() => { joinVoice(ch.id); openChannel(ch) }}
                onDelete={() => handleDelete(ch)}
              />
            ))}

            {/* DMs section */}
            {friends.length > 0 && (
              <>
                <div style={{ display:'flex', alignItems:'center', padding:'14px 16px 4px', color:C.sub }}>
                  <span style={{ fontSize:11, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', fontFamily:"'Bricolage Grotesque',sans-serif" }}>Direct Messages</span>
                </div>
                {friends.map(f => (
                  <DmRow key={f.id} f={f} isOnline={isOnline(f.id)} onOpen={() => { openDm(f.id); setView('chat') }} />
                ))}
              </>
            )}
          </>
        )}

        {/* DISCOVER */}
        {view === 'discover' && (
          <div style={{ padding:'8px 10px' }}>
            <div style={{ fontFamily:"'Bricolage Grotesque',sans-serif", fontWeight:700, fontSize:14, color:C.text, marginBottom:12, padding:'6px 6px 0' }}>Find People</div>
            <input placeholder="Search username..." value={search} onChange={e => doSearch(e.target.value)} style={{ width:'100%', background:C.card, border:`1px solid ${C.border}`, borderRadius:8, padding:'8px 10px', color:C.text, fontSize:13, outline:'none', boxSizing:'border-box', marginBottom:8 }} />
            {searchRes === null ? <div style={{ fontSize:12, color:C.sub, padding:'0 4px' }}>Type to search</div>
            : searchRes.length === 0 ? <div style={{ fontSize:12, color:C.sub, padding:'0 4px' }}>No users found</div>
            : searchRes.map(u => (
                <UserSearchRow key={u.id} u={u} friends={friends} isOnline={isOnline(u.id)}
                  onAdd={() => sendFriendRequest(u.id)} onDm={() => { openDm(u.id); setView('chat') }} />
              ))
            }
          </div>
        )}

        {/* FRIENDS */}
        {view === 'friends' && (
          <div style={{ padding:'8px 10px' }}>
            <div style={{ fontFamily:"'Bricolage Grotesque',sans-serif", fontWeight:700, fontSize:14, color:C.text, marginBottom:10, padding:'6px 6px 0' }}>Friends</div>
            {friends.length === 0
              ? <div style={{ fontSize:13, color:C.sub, padding:'4px' }}>No friends yet — use Discover 🔍</div>
              : friends.map(f => (
                  <div key={f.id} style={{ display:'flex', alignItems:'center', gap:9, padding:'7px 6px', borderRadius:8, marginBottom:2 }}>
                    <div style={{ position:'relative', flexShrink:0 }}>
                      <Avatar avatar={f.avatar} avatarImg={f.avatar_img} color={f.color} size={32} radius={10} />
                      <Dot online={isOnline(f.id)} bg={C.sidebar} />
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:13, color:C.text, fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{f.display_name || f.username}</div>
                      <div style={{ fontSize:11, color: isOnline(f.id) ? C.emerald : C.sub }}>{isOnline(f.id) ? 'online' : 'offline'}</div>
                    </div>
                    <button onClick={() => { openDm(f.id); setView('chat') }} style={{ background:C.accent+'22', border:'none', borderRadius:6, padding:'4px 8px', color:C.accent, fontSize:11, cursor:'pointer' }}>DM</button>
                  </div>
                ))
            }
          </div>
        )}

        {/* NOTIFICATIONS */}
        {view === 'notifs' && (
          <div style={{ padding:'8px 10px' }}>
            <div style={{ fontFamily:"'Bricolage Grotesque',sans-serif", fontWeight:700, fontSize:14, color:C.text, marginBottom:10, padding:'6px 6px 0' }}>Notifications</div>
            {incomingReqs.length === 0
              ? <div style={{ fontSize:13, color:C.sub, padding:'4px' }}>All clear! 🎉</div>
              : incomingReqs.map(req => (
                  <div key={req.id} style={{ background:C.card, borderRadius:10, padding:10, marginBottom:8, border:`1px solid ${C.border}` }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                      <Avatar avatar={req.avatar} avatarImg={req.avatar_img} color={req.color} size={30} radius={9} />
                      <div>
                        <div style={{ fontSize:13, color:C.text, fontWeight:600 }}>{req.username}</div>
                        <div style={{ fontSize:11, color:C.sub }}>wants to be friends</div>
                      </div>
                    </div>
                    <div style={{ display:'flex', gap:5 }}>
                      <button onClick={() => acceptRequest(req.id, req.from_id)} style={{ flex:1, padding:'6px 0', background:C.emerald, border:'none', borderRadius:7, color:'#000', fontWeight:700, fontSize:12, cursor:'pointer' }}>✓ Accept</button>
                      <button onClick={() => declineRequest(req.id)} style={{ flex:1, padding:'6px 0', background:C.rose+'22', border:`1px solid ${C.rose}44`, borderRadius:7, color:C.rose, fontSize:12, cursor:'pointer' }}>✕ Decline</button>
                    </div>
                  </div>
                ))
            }
          </div>
        )}
      </div>

      {/* ── Discord-style user bar at bottom ── */}
      <UserBar me={me} prefs={prefs} onlineUsers={onlineUsers} openSettings={openSettings} />
    </div>
  )
}

/* ── Discord-style user bar ───────────────────────────────────────────────── */
function UserBar({ me, prefs, openSettings }) {
  const { logout, updatePref, voiceMuted, toggleMute, voiceChannelId } = useStore()
  const [showStatusMenu, setShowStatusMenu] = useState(false)

  if (!me) return null

  const status      = prefs?.status || 'online'
  const statusColor = STATUS_COLORS[status]
  const displayName = me.display_name || me.username

  const statusOptions = [
    { v:'online',    label:'Online',          color:STATUS_COLORS.online  },
    { v:'away',      label:'Away',            color:STATUS_COLORS.away    },
    { v:'dnd',       label:'Do Not Disturb',  color:STATUS_COLORS.dnd     },
    { v:'invisible', label:'Invisible',       color:STATUS_COLORS.invisible },
  ]

  return (
    <div style={{ borderTop:`1px solid ${C.border}`, background:C.card2, flexShrink:0, position:'relative' }}>

      {/* Status quick-menu */}
      {showStatusMenu && (
        <div style={{ position:'absolute', bottom:'100%', left:8, right:8, background:C.panel, border:`1px solid ${C.border}`, borderRadius:10, padding:6, boxShadow:'0 -8px 32px rgba(0,0,0,0.4)', zIndex:100 }}>
          <div style={{ fontSize:10, color:C.sub, padding:'3px 8px 6px', fontWeight:700, letterSpacing:'0.05em', textTransform:'uppercase' }}>Set Status</div>
          {statusOptions.map(opt => (
            <button key={opt.v} onClick={() => { updatePref('status', opt.v); setShowStatusMenu(false) }} style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'8px 10px', borderRadius:7, border:'none', cursor:'pointer', background: status===opt.v ? C.accent+'22' : 'transparent', textAlign:'left', transition:'all .1s' }}>
              <div style={{ width:10, height:10, borderRadius:'50%', background:opt.color, flexShrink:0 }} />
              <span style={{ fontSize:13, color: status===opt.v ? C.accent : C.text }}>{opt.label}</span>
              {status===opt.v && <span style={{ marginLeft:'auto', color:C.accent, fontSize:12 }}>✓</span>}
            </button>
          ))}
          <div style={{ height:1, background:C.border, margin:'4px 0' }} />
          <button onClick={() => { openSettings(); setShowStatusMenu(false) }} style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'8px 10px', borderRadius:7, border:'none', cursor:'pointer', background:'transparent', textAlign:'left', color:C.sub, fontSize:13 }}>
            ⚙️ Settings
          </button>
        </div>
      )}

      {/* Main bar */}
      <div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 10px' }}>

        {/* Avatar + name — click for status menu */}
        <button
          onClick={() => setShowStatusMenu(v => !v)}
          style={{ display:'flex', alignItems:'center', gap:8, flex:1, minWidth:0, background:'none', border:'none', cursor:'pointer', padding:'3px 4px', borderRadius:8, textAlign:'left', transition:'background .15s' }}
        >
          {/* Avatar with status ring */}
          <div style={{ position:'relative', flexShrink:0 }}>
            <Avatar avatar={me.avatar} avatarImg={me.avatar_img} color={me.color} size={34} radius={10} />
            {/* Status dot */}
            <div style={{ position:'absolute', bottom:-2, right:-2, width:13, height:13, borderRadius:'50%', background:statusColor, border:`2.5px solid ${C.card2}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:7, color:'#fff', fontWeight:900 }}>
              {STATUS_ICONS[status]}
            </div>
          </div>

          {/* Name + status text */}
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:13, fontWeight:700, color:C.text, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', lineHeight:1.3 }}>
              {displayName}
            </div>
            <div style={{ fontSize:11, color:statusColor, lineHeight:1.2 }}>
              {prefs?.customStatus || status.charAt(0).toUpperCase() + status.slice(1)}
            </div>
          </div>
        </button>

        {/* Mute button (if in voice) */}
        {voiceChannelId && (
          <button onClick={toggleMute} title={voiceMuted ? 'Unmute' : 'Mute'} style={{ width:30, height:30, borderRadius:8, border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, background: voiceMuted ? C.rose+'22' : C.card, color: voiceMuted ? C.rose : C.sub, flexShrink:0, transition:'all .15s' }}>
            {voiceMuted ? '🔇' : '🎙️'}
          </button>
        )}

        {/* Settings button */}
        <button onClick={openSettings} title="Settings" style={{ width:30, height:30, borderRadius:8, border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, background:C.card, color:C.sub, flexShrink:0, transition:'all .15s' }}>
          ⚙️
        </button>
      </div>
    </div>
  )
}

/* ── Channel row ─────────────────────────────────────────────────────────── */
function ChannelRow({ ch, canDel, isDel, inVoice, onOpen, onVoice, onDelete }) {
  const [hover, setHover] = useState(false)
  return (
    <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ display:'flex', alignItems:'center', padding:'5px 8px 5px 14px', margin:'1px 6px', borderRadius:6, cursor:'pointer', transition:'all .1s', background: hover ? C.card : 'transparent', color: hover ? C.text : C.sub, gap:3 }}>
      <div onClick={onOpen} style={{ display:'flex', alignItems:'center', flex:1, minWidth:0, gap:0 }}>
        <span style={{ fontSize:16, marginRight:6, flexShrink:0, opacity:.7 }}>{ch.icon}</span>
        <span style={{ fontSize:14, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}># {ch.name}</span>
      </div>
      {inVoice
        ? <span style={{ fontSize:11, color:C.emerald }} title="In voice">🎙️</span>
        : hover && <button onClick={e => { e.stopPropagation(); onVoice() }} title="Join voice" style={{ background:'none', border:'none', fontSize:13, cursor:'pointer', color:C.sub, opacity:.7, padding:'0 2px' }}>🔊</button>
      }
      {canDel && hover && (
        <button onClick={e => { e.stopPropagation(); onDelete() }} style={{ fontSize:11, cursor:'pointer', padding:'1px 5px', borderRadius:4, fontWeight: isDel ? 700 : 400, color: isDel ? C.rose : C.sub, background: isDel ? C.rose+'22' : 'none', border: isDel ? `1px solid ${C.rose}44` : 'none' }}>
          {isDel ? '✕?' : '🗑'}
        </button>
      )}
    </div>
  )
}

/* ── DM row ─────────────────────────────────────────────────────────────── */
function DmRow({ f, isOnline, onOpen }) {
  const [hover, setHover] = useState(false)
  return (
    <div onClick={onOpen} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ display:'flex', alignItems:'center', gap:9, padding:'5px 8px 5px 14px', margin:'1px 6px', borderRadius:6, cursor:'pointer', background: hover ? C.card : 'transparent', transition:'all .1s' }}>
      <div style={{ position:'relative', flexShrink:0 }}>
        <Avatar avatar={f.avatar} avatarImg={f.avatar_img} color={f.color} size={28} radius={9} />
        <Dot online={isOnline} bg={C.sidebar} />
      </div>
      <span style={{ fontSize:14, color: hover ? C.text : C.sub, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
        {f.display_name || f.username}
      </span>
    </div>
  )
}

/* ── User search row ─────────────────────────────────────────────────────── */
function UserSearchRow({ u, friends, isOnline, onAdd, onDm }) {
  const isFriend = friends.some(f => f.id === u.id)
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 6px', borderBottom:`1px solid ${C.border}` }}>
      <div style={{ position:'relative' }}>
        <Avatar avatar={u.avatar} avatarImg={u.avatar_img} color={u.color} size={30} radius={9} />
        <Dot online={isOnline} bg={C.sidebar} />
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:13, color:C.text, fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{u.display_name || u.username}</div>
        <div style={{ fontSize:11, color: isOnline ? C.emerald : C.sub }}>{isOnline ? 'online' : 'offline'}</div>
      </div>
      {isFriend
        ? <button onClick={onDm} style={{ width:28, height:28, borderRadius:7, background:C.accent+'22', border:'none', fontSize:14, cursor:'pointer' }}>💬</button>
        : <button onClick={onAdd} style={{ width:28, height:28, borderRadius:7, background:C.emerald+'22', border:`1px solid ${C.emerald}44`, fontSize:14, cursor:'pointer' }}>➕</button>
      }
    </div>
  )
}
