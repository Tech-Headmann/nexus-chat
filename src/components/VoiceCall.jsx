import { useStore } from '../lib/store'
import { C } from '../lib/theme'
import { Avatar } from './Sidebar'

export default function VoiceCall() {
  const { me, voiceChannelId, voicePeers, voiceMuted, channels, leaveVoice, toggleMute } = useStore()

  if (!voiceChannelId) return null

  const channel = channels.find(c => c.id === voiceChannelId)
  const totalInCall = voicePeers.length + 1 // +1 for ourselves

  return (
    <div style={panel}>
      {/* Header */}
      <div style={header}>
        <div style={{ display:'flex', alignItems:'center', gap:7 }}>
          <div style={liveDot} />
          <div>
            <div style={{ fontFamily:"'Bricolage Grotesque',sans-serif", fontWeight:700, fontSize:12, color:C.text }}>
              Voice · #{channel?.name || '...'}
            </div>
            <div style={{ fontSize:10, color:C.emerald }}>{totalInCall} in call</div>
          </div>
        </div>
        <button onClick={leaveVoice} title="Leave call" style={leaveBtn}>✕</button>
      </div>

      {/* Participants */}
      <div style={{ padding:'8px 10px', display:'flex', flexDirection:'column', gap:4 }}>
        {/* Me */}
        <Participant
          avatar={me.avatar}
          color={me.color}
          username={me.username}
          muted={voiceMuted}
          isMe
        />
        {/* Others */}
        {voicePeers.map(peer => (
          <Participant
            key={peer.socketId}
            avatar={peer.avatar}
            color={peer.color}
            username={peer.username}
            muted={peer.muted}
          />
        ))}
      </div>

      {/* Controls */}
      <div style={controls}>
        <button onClick={toggleMute} title={voiceMuted ? 'Unmute' : 'Mute'} style={{
          ...ctrlBtn,
          background: voiceMuted ? C.rose + '33' : C.card2,
          border: `1px solid ${voiceMuted ? C.rose + '66' : C.border}`,
          color: voiceMuted ? C.rose : C.text,
        }}>
          {voiceMuted ? '🔇' : '🎙️'}
          <span style={{ fontSize:10, marginTop:2 }}>{voiceMuted ? 'Muted' : 'Mic On'}</span>
        </button>
        <button onClick={leaveVoice} title="Leave call" style={{ ...ctrlBtn, background: C.rose + '22', border:`1px solid ${C.rose}44`, color:C.rose }}>
          📵
          <span style={{ fontSize:10, marginTop:2 }}>Leave</span>
        </button>
      </div>
    </div>
  )
}

function Participant({ avatar, color, username, muted, isMe }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
      <div style={{ position:'relative' }}>
        <Avatar avatar={avatar} color={color} size={26} radius={8} />
        {muted && (
          <div style={{ position:'absolute', bottom:-2, right:-2, width:12, height:12, borderRadius:'50%', background:C.card, display:'flex', alignItems:'center', justifyContent:'center', fontSize:8 }}>🔇</div>
        )}
      </div>
      <div style={{ flex:1, fontSize:12, color:C.text, fontWeight: isMe ? 600 : 400 }}>
        {isMe ? `${username} (you)` : username}
      </div>
      {!muted && (
        <div style={{ display:'flex', gap:2, alignItems:'center' }}>
          {[1,2,3].map(i => (
            <div key={i} style={{ width:2, height: i*4, borderRadius:2, background:C.emerald, opacity:0.7, animation:`fadeUp .8s ${i*0.1}s ease infinite alternate` }} />
          ))}
        </div>
      )}
    </div>
  )
}

const panel    = { position:'fixed', bottom:80, left:72, width:200, background:C.panel, borderRadius:14, border:`1px solid ${C.border}`, boxShadow:'0 8px 32px rgba(0,0,0,0.6)', zIndex:200, overflow:'hidden' }
const header   = { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 12px', background:C.emerald+'12', borderBottom:`1px solid ${C.border}` }
const liveDot  = { width:8, height:8, borderRadius:'50%', background:C.emerald, boxShadow:`0 0 8px ${C.emerald}`, animation:'fadeUp .8s ease infinite alternate' }
const leaveBtn = { background:'none', border:'none', color:C.sub, fontSize:14, cursor:'pointer', padding:2, lineHeight:1 }
const controls = { display:'flex', gap:6, padding:'8px 10px', borderTop:`1px solid ${C.border}` }
const ctrlBtn  = { flex:1, display:'flex', flexDirection:'column', alignItems:'center', padding:'7px 4px', borderRadius:8, cursor:'pointer', fontSize:18, fontFamily:"'Instrument Sans',sans-serif", gap:1 }
