import { useState, useEffect } from 'react'
import { useStore } from '../lib/store'
import { C } from '../lib/theme'
import { Avatar, Dot } from './Sidebar'
import { api } from '../lib/api'

export default function MembersPanel() {
  const { me, activeChannel, activeDmUserId, friends, onlineUsers, sendFriendRequest } = useStore()
  const [allUsers, setAllUsers] = useState([])

  useEffect(() => {
    api.users().then(setAllUsers).catch(() => {})
  }, [])

  const isOnline  = (id) => onlineUsers.includes(id)
  const isFriend  = (id) => friends.some(f => f.id === id)
  const isDm      = activeChannel && (activeChannel.is_dm === 1 || activeChannel.is_dm === true)

  if (!activeChannel) {
    return <div style={panel} />
  }

  // DM panel — show the other user's info
  if (isDm) {
    const dmFriend = friends.find(f => f.id === activeDmUserId)
    if (!dmFriend) return <div style={panel} />
    return (
      <div style={panel}>
        <div style={{ textAlign:'center', paddingTop:8 }}>
          <div style={{ position:'relative', display:'inline-block' }}>
            <Avatar avatar={dmFriend.avatar} color={dmFriend.color} size={56} radius={16} />
            <Dot online={isOnline(dmFriend.id)} bg={C.sidebar} />
          </div>
          <div style={{ fontFamily:"'Bricolage Grotesque',sans-serif", fontWeight:700, color:C.text, fontSize:14, marginTop:10 }}>{dmFriend.username}</div>
          <div style={{ fontSize:12, color: isOnline(dmFriend.id) ? C.emerald : C.sub, marginTop:4 }}>
            {isOnline(dmFriend.id) ? '● online' : '○ offline'}
          </div>
        </div>
      </div>
    )
  }

  // Channel panel — show all users
  const online  = allUsers.filter(u => isOnline(u.id))
  const offline = allUsers.filter(u => !isOnline(u.id))

  return (
    <div style={panel}>
      {online.length > 0 && (
        <>
          <SectionLabel>ONLINE — {online.length}</SectionLabel>
          {online.map(u => <MemberRow key={u.id} u={u} isMe={u.id === me?.id} isOnline sendFriendRequest={sendFriendRequest} isFriend={isFriend(u.id)} />)}
        </>
      )}
      {offline.length > 0 && (
        <>
          <SectionLabel style={{ marginTop:16 }}>OFFLINE — {offline.length}</SectionLabel>
          {offline.map(u => <MemberRow key={u.id} u={u} isMe={u.id === me?.id} isOnline={false} sendFriendRequest={sendFriendRequest} isFriend={isFriend(u.id)} />)}
        </>
      )}
    </div>
  )
}

function MemberRow({ u, isMe, isOnline, sendFriendRequest, isFriend }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8, padding:'5px 0', opacity: isOnline ? 1 : 0.4 }}>
      <div style={{ position:'relative' }}>
        <Avatar avatar={u.avatar} color={u.color} size={26} radius={8} />
        <Dot online={isOnline} bg={C.sidebar} />
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:12, color: isMe ? C.accent : C.text, fontWeight: isMe ? 600 : 400, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
          {isMe ? `${u.username} (you)` : u.username}
        </div>
      </div>
      {!isMe && !isFriend && (
        <button onClick={() => sendFriendRequest(u.id)} title="Add friend" style={{ background:'none', border:'none', color:C.sub, fontSize:13, opacity:0.5, padding:0 }}>➕</button>
      )}
      {!isMe && isFriend && (
        <span style={{ fontSize:11, color:C.emerald }}>✓</span>
      )}
    </div>
  )
}

function SectionLabel({ children, style }) {
  return <div style={{ fontSize:10, color:C.sub, textTransform:'uppercase', letterSpacing:1, fontWeight:700, marginBottom:8, fontFamily:"'Bricolage Grotesque',sans-serif", ...style }}>{children}</div>
}

const panel = { width:200, background:C.sidebar, borderLeft:`1px solid ${C.border}`, padding:14, overflowY:'auto', flexShrink:0 }
