import { useState } from 'react'
import { useStore } from './lib/store'
import { C } from './lib/theme'
import AuthScreen  from './components/AuthScreen'
import Sidebar     from './components/Sidebar'
import ChatArea    from './components/ChatArea'
import MembersPanel from './components/MembersPanel'

const NAV = [
  { v:'chat',     icon:'💬', tip:'Channels & DMs' },
  { v:'discover', icon:'🔍', tip:'Find People'    },
  { v:'friends',  icon:'👥', tip:'Friends'        },
  { v:'notifs',   icon:'🔔', tip:'Notifications'  },
]

export default function App() {
  const { me, toast, requests } = useStore()
  const [view, setView] = useState('chat')

  // Not logged in → show auth screen
  if (!me) return <AuthScreen />

  const pendingReqs = requests.filter(r => r.to_id === me.id).length

  return (
    <div style={{ display:'flex', height:'100vh', overflow:'hidden', background:'#080a0f' }}>

      {/* Toast notification */}
      {toast && (
        <div style={{ position:'fixed', top:18, left:'50%', transform:'translateX(-50%)', padding:'10px 22px', borderRadius:30, fontSize:13, fontWeight:600, zIndex:9999, whiteSpace:'nowrap', color:'#fff', background: toast.type === 'err' ? C.rose : C.accent, boxShadow:'0 8px 32px rgba(0,0,0,0.5)', animation:'toastIn .3s ease' }}>
          {toast.msg}
        </div>
      )}

      {/* ── Icon Rail ── */}
      <div style={{ width:62, background:C.rail, display:'flex', flexDirection:'column', alignItems:'center', padding:'14px 0 12px', gap:6, borderRight:`1px solid ${C.border}`, flexShrink:0 }}>
        {/* Logo */}
        <div style={{ width:38, height:38, borderRadius:12, background:C.accent, display:'flex', alignItems:'center', justifyContent:'center', fontSize:17, marginBottom:10, boxShadow:`0 4px 20px ${C.accent}55` }}>⚛</div>
        <div style={{ width:28, height:1, background:C.border, marginBottom:4 }} />

        {/* Nav buttons */}
        {NAV.map(item => (
          <button key={item.v} title={item.tip} onClick={() => setView(item.v)} style={{ width:38, height:38, border:'none', fontSize:18, transition:'all .2s', position:'relative', display:'flex', alignItems:'center', justifyContent:'center', background: view===item.v ? C.accent : C.card, borderRadius: view===item.v ? 14 : 22 }}>
            {item.icon}
            {item.v === 'notifs' && pendingReqs > 0 && (
              <div style={{ position:'absolute', top:1, right:1, width:15, height:15, background:C.rose, borderRadius:'50%', fontSize:9, display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:800 }}>
                {pendingReqs}
              </div>
            )}
          </button>
        ))}

        <div style={{ flex:1 }} />

        {/* My avatar */}
        <div style={{ textAlign:'center' }}>
          <div style={{ width:36, height:36, borderRadius:11, background:me.color+'33', border:`2px solid ${me.color}66`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, margin:'0 auto' }}>
            {me.avatar}
          </div>
          <div style={{ fontSize:9, color:C.sub, marginTop:3, maxWidth:52, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
            {me.username}
          </div>
        </div>
      </div>

      {/* ── Sidebar ── */}
      <Sidebar view={view} setView={setView} />

      {/* ── Chat ── */}
      <ChatArea />

      {/* ── Members ── */}
      <MembersPanel />
    </div>
  )
}
