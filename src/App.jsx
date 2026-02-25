import { useState } from 'react'
import { useStore } from './lib/store'
import { C } from './lib/theme'
import AuthScreen    from './components/AuthScreen'
import Sidebar       from './components/Sidebar'
import ChatArea      from './components/ChatArea'
import MembersPanel  from './components/MembersPanel'
import VoiceCall     from './components/VoiceCall'
import SettingsModal from './components/SettingsModal'

const NAV = [
  { v:'chat',     icon:'💬', tip:'Channels & DMs' },
  { v:'discover', icon:'🔍', tip:'Find People'    },
  { v:'friends',  icon:'👥', tip:'Friends'        },
  { v:'notifs',   icon:'🔔', tip:'Notifications'  },
]

const STATUS_COLORS = {
  online:    '#34d399',
  away:      '#fbbf24',
  dnd:       '#fb7185',
  invisible: '#8b92b0',
}

export default function App() {
  // _themeVersion forces re-render when theme changes
  const { me, toast, requests, prefs, openSettings, _themeVersion } = useStore()
  const [view, setView] = useState('chat')

  if (!me) return <AuthScreen />

  const pendingReqs = requests.filter(r => r.to_id === me.id).length
  const statusColor = STATUS_COLORS[prefs?.status] || STATUS_COLORS.online

  return (
    <div style={{ display:'flex', height:'100vh', overflow:'hidden', background:C.bg }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position:'fixed', top:18, left:'50%', transform:'translateX(-50%)',
          padding:'10px 22px', borderRadius:30, fontSize:13, fontWeight:600,
          zIndex:9999, whiteSpace:'nowrap', color:'#fff',
          background: toast.type === 'err' ? C.rose : C.accent,
          boxShadow:'0 8px 32px rgba(0,0,0,0.5)',
          animation:'toastIn .3s ease', pointerEvents:'none',
        }}>
          {toast.msg}
        </div>
      )}

      {/* Settings modal */}
      <SettingsModal />

      {/* ── Icon Rail ── */}
      <div style={{
        width:62, background:C.rail, flexShrink:0,
        display:'flex', flexDirection:'column', alignItems:'center',
        padding:'14px 0 10px', gap:6,
        borderRight:`1px solid ${C.border}`,
      }}>

        {/* Logo */}
        <div style={{
          width:38, height:38, borderRadius:12, background:C.accent,
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:17, marginBottom:10, boxShadow:`0 4px 20px ${C.accent}55`,
        }}>⚛</div>
        <div style={{ width:28, height:1, background:C.border, marginBottom:4 }} />

        {/* Nav buttons */}
        {NAV.map(item => (
          <button
            key={item.v}
            title={item.tip}
            onClick={() => setView(item.v)}
            style={{
              width:38, height:38, border:'none', fontSize:18,
              transition:'all .2s', position:'relative',
              display:'flex', alignItems:'center', justifyContent:'center',
              background: view === item.v ? C.accent : C.card,
              color: C.text,
              borderRadius: view === item.v ? 14 : 22,
              cursor:'pointer',
            }}
          >
            {item.icon}
            {item.v === 'notifs' && pendingReqs > 0 && (
              <div style={{
                position:'absolute', top:1, right:1,
                width:15, height:15, background:C.rose, borderRadius:'50%',
                fontSize:9, display:'flex', alignItems:'center', justifyContent:'center',
                color:'#fff', fontWeight:800,
              }}>
                {pendingReqs}
              </div>
            )}
          </button>
        ))}

        <div style={{ flex:1 }} />

        {/* Settings gear button */}
        <button
          onClick={openSettings}
          title="Settings"
          style={{
            width:38, height:38, border:`1px solid ${C.border}`,
            fontSize:17, background:C.card2, borderRadius:12,
            display:'flex', alignItems:'center', justifyContent:'center',
            marginBottom:8, cursor:'pointer', color:C.text,
            transition:'all .2s',
          }}
        >
          ⚙️
        </button>

        {/* My avatar + status dot */}
        <button
          onClick={openSettings}
          title="Profile & Settings"
          style={{ background:'none', border:'none', cursor:'pointer', padding:0, display:'flex', flexDirection:'column', alignItems:'center', gap:3 }}
        >
          <div style={{ position:'relative' }}>
            <div style={{
              width:36, height:36, borderRadius:11,
              background: me.color + '33',
              border: `2px solid ${me.color}66`,
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:18,
            }}>
              {me.avatar}
            </div>
            <div style={{
              position:'absolute', bottom:-2, right:-2,
              width:12, height:12, borderRadius:'50%',
              background: statusColor,
              border: `2px solid ${C.rail}`,
              boxShadow: `0 0 5px ${statusColor}`,
            }} />
          </div>
          <div style={{ fontSize:9, color:C.sub, maxWidth:52, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
            {me.username}
          </div>
        </button>

      </div>

      {/* ── Main panels ── */}
      <Sidebar view={view} setView={setView} />
      <ChatArea />
      <MembersPanel />
      <VoiceCall />
    </div>
  )
}
