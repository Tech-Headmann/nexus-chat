import { useStore } from './lib/store'
import { C } from './lib/theme'
import AuthScreen    from './components/AuthScreen'
import Sidebar       from './components/Sidebar'
import ChatArea      from './components/ChatArea'
import MembersPanel  from './components/MembersPanel'
import VoiceCall     from './components/VoiceCall'
import SettingsModal from './components/SettingsModal'
import { useState } from 'react'

export default function App() {
  const { me, toast, _themeVersion } = useStore()
  const [view, setView] = useState('chat')

  if (!me) return <AuthScreen />

  return (
    <div style={{ display:'flex', height:'100vh', overflow:'hidden', background:C.bg }}>

      {/* Toast notification */}
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

      <SettingsModal />

      <Sidebar view={view} setView={setView} />
      <ChatArea />
      <MembersPanel />
      <VoiceCall />
    </div>
  )
}
