import { useState, useEffect } from 'react'
import { useStore } from '../lib/store'
import { C, CHAN_ICONS } from '../lib/theme'
import { api } from '../lib/api'

/* ── Shared avatar component ── */
export function Avatar({ avatar, color, size = 30, radius = 9 }) {
  return (
    <div style={{ width:size, height:size, borderRadius:radius, background:(color||C.accent)+'33', display:'flex', alignItems:'center', justifyContent:'center', fontSize:size*0.55, flexShrink:0 }}>
      {avatar || '🦋'}
    </div>
  )
}

/* ── Status dot ── */
export function Dot({ online, bg = C.sidebar }) {
  return (
    <div style={{ position:'absolute', bottom:-2, right:-2, width:9, height:9, borderRadius:'50%', background: online ? C.emerald : C.sub, border:`2px solid ${bg}` }} />
  )
}

export default function Sidebar({ view, setView }) {
  const { me, channels, friends, requests, onlineUsers, openChannel, openDm, createChannel, sendFriendRequest, acceptRequest, declineRequest } = useStore()

  const [newChanOpen, setNewChanOpen] = useState(false)
  const [newChanName, setNewChanName] = useState('')
  const [newChanIcon, setNewChanIcon] = useState('✨')
  const [search,      setSearch]      = useState('')
  const [searchRes,   setSearchRes]   = useState(null)

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

  return (
    <div style={{ width:234, background:C.sidebar, borderRight:`1px solid ${C.border}`, display:'flex', flexDirection:'column', overflowY:'auto', flexShrink:0 }}>

      {/* ── CHAT VIEW ── */}
      {view === 'chat' && (
        <>
          <SectionHead label="CHANNELS">
            <button onClick={() => setNewChanOpen(v => !v)} style={addBtn} title="New channel">＋</button>
          </SectionHead>

          {newChanOpen && (
            <div style={{ margin:'0 8px 8px', background:C.card, borderRadius:10, padding:10, border:`1px solid ${C.border}` }}>
              <div style={{ display:'flex', flexWrap:'wrap', gap:4, marginBottom:8 }}>
                {CHAN_ICONS.map(ic => (
                  <button key={ic} onClick={() => setNewChanIcon(ic)} style={{ width:28, height:28, borderRadius:6, fontSize:15, background: newChanIcon===ic ? C.accent+'33' : 'transparent', border:`2px solid ${newChanIcon===ic ? C.accent : 'transparent'}` }}>
                    {ic}
                  </button>
                ))}
              </div>
              <input placeholder="channel-name" value={newChanName} onChange={e => setNewChanName(e.target.value)} onKeyDown={e => e.key==='Enter' && submitNewChan()} style={miniInp} />
              <button onClick={submitNewChan} style={{ width:'100%', marginTop:6, padding:'7px 0', background:C.accent, border:'none', borderRadius:7, color:'#fff', fontFamily:"'Bricolage Grotesque',sans-serif", fontWeight:700, fontSize:12 }}>
                Create
              </button>
            </div>
          )}

          {channels.map(ch => (
            <SideItem key={ch.id} onClick={() => { openChannel(ch); setView('chat') }}>
              <span style={{ fontSize:14, marginRight:7, flexShrink:0 }}>{ch.icon}</span>
              <span style={{ fontSize:13, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}># {ch.name}</span>
            </SideItem>
          ))}

          {friends.length > 0 && (
            <>
              <SectionHead label="DIRECT MESSAGES" />
              {friends.map(f => (
                <SideItem key={f.id} onClick={() => { openDm(f.id); setView('chat') }}>
                  <div style={{ position:'relative', flexShrink:0, marginRight:8 }}>
                    <Avatar avatar={f.avatar} color={f.color} size={26} radius={7} />
                    <Dot online={isOnline(f.id)} bg={C.sidebar} />
                  </div>
                  <span style={{ fontSize:13, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{f.username}</span>
                </SideItem>
              ))}
            </>
          )}
        </>
      )}

      {/* ── DISCOVER VIEW ── */}
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
                    onDm={() => { openDm(u.id); setView('chat') }} />
                ))
          }
        </div>
      )}

      {/* ── FRIENDS VIEW ── */}
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
                  <button onClick={() => { openDm(f.id); setView('chat') }} style={{ background:C.accent+'22', border:'none', borderRadius:7, padding:'4px 10px', color:C.accent, fontSize:11, fontWeight:600 }}>DM</button>
                </div>
              ))
          }
        </div>
      )}

      {/* ── NOTIFICATIONS VIEW ── */}
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
                    <button onClick={() => acceptRequest(req.id, req.from_id)} style={{ flex:1, padding:'8px 0', background:C.emerald, border:'none', borderRadius:8, color:'#000', fontWeight:700, fontSize:12 }}>✓ Accept</button>
                    <button onClick={() => declineRequest(req.id)} style={{ flex:1, padding:'8px 0', background:C.rose+'22', border:`1px solid ${C.rose}44`, borderRadius:8, color:C.rose, fontSize:12 }}>✕ Decline</button>
                  </div>
                </div>
              ))
          }
        </div>
      )}
    </div>
  )
}

function SectionHead({ label, children }) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 14px 5px', fontFamily:"'Bricolage Grotesque',sans-serif", fontWeight:700, fontSize:10, color:C.sub, letterSpacing:1, textTransform:'uppercase' }}>
      {label}{children}
    </div>
  )
}

function SideItem({ onClick, children }) {
  const [hover, setHover] = useState(false)
  return (
    <div onClick={onClick} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ display:'flex', alignItems:'center', padding:'7px 12px', margin:'1px 6px', borderRadius:9, cursor:'pointer', background: hover ? C.card : 'transparent', color: hover ? C.text : C.sub, transition:'all .12s', fontSize:13 }}>
      {children}
    </div>
  )
}

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
      <div style={{ display:'flex', gap:4 }}>
        {isFriend
          ? <button onClick={onDm} style={{ width:28, height:28, borderRadius:7, background:C.accent+'22', border:'none', fontSize:13 }}>💬</button>
          : <button onClick={onAdd} style={{ width:28, height:28, borderRadius:7, background:C.emerald+'22', border:`1px solid ${C.emerald}55`, fontSize:13 }}>➕</button>
        }
      </div>
    </div>
  )
}

const addBtn  = { background:'none', border:'none', color:C.sub, fontSize:20, lineHeight:1, padding:0 }
const miniInp = { background:C.card2, border:`1px solid ${C.border}`, borderRadius:8, padding:'8px 10px', color:C.text, fontSize:13, outline:'none', boxSizing:'border-box' }
const sideTitle = { fontFamily:"'Bricolage Grotesque',sans-serif", fontWeight:700, fontSize:15, color:C.text, marginBottom:14, marginTop:16 }
