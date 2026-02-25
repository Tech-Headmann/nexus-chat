import { useState } from 'react'
import { useStore } from '../lib/store'
import { C, AVATARS, AV_COLS } from '../lib/theme'

export default function AuthScreen() {
  const { register, login, authBusy, authErr } = useStore()

  const [tab,      setTab]      = useState('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [avatar,   setAvatar]   = useState(AVATARS[0])
  const [avColor,  setAvColor]  = useState(AV_COLS[0])
  const [localErr, setLocalErr] = useState('')

  const err = localErr || authErr

  const switchTab = (t) => { setTab(t); setLocalErr(''); setUsername(''); setPassword(''); setConfirm('') }

  const submit = () => {
    setLocalErr('')
    if (tab === 'register') {
      if (username.trim().length < 2) { setLocalErr('Username must be 2+ characters'); return }
      if (password.length < 4)        { setLocalErr('Password must be 4+ characters'); return }
      if (password !== confirm)        { setLocalErr("Passwords don't match"); return }
      register(username.trim(), password, avatar, avColor)
    } else {
      if (!username.trim() || !password) { setLocalErr('Fill in both fields'); return }
      login(username.trim(), password)
    }
  }

  return (
    <div style={{ minHeight:'100vh', background:C.bg, display:'flex', alignItems:'center', justifyContent:'center', position:'relative', overflow:'hidden' }}>
      {/* Glow orbs */}
      <div style={{ position:'fixed', width:500, height:500, borderRadius:'50%', background:`radial-gradient(circle, ${C.glow} 0%, transparent 70%)`, top:'0%', left:'30%', transform:'translate(-50%,-50%)', pointerEvents:'none' }} />
      <div style={{ position:'fixed', width:400, height:400, borderRadius:'50%', background:'radial-gradient(circle, rgba(167,78,249,0.07) 0%, transparent 70%)', bottom:'10%', right:'15%', pointerEvents:'none' }} />

      <div style={{ width:420, background:C.panel, borderRadius:20, padding:36, border:`1px solid ${C.border}`, boxShadow:'0 32px 80px rgba(0,0,0,0.7)', position:'relative', zIndex:1, maxHeight:'92vh', overflowY:'auto' }}>

        {/* Logo */}
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <div style={{ width:60, height:60, borderRadius:17, background:C.accent, display:'flex', alignItems:'center', justifyContent:'center', fontSize:28, margin:'0 auto', boxShadow:`0 8px 32px ${C.accent}55` }}>⚛</div>
          <div style={{ fontFamily:"'Bricolage Grotesque',sans-serif", fontWeight:800, fontSize:30, color:C.text, marginTop:12, letterSpacing:'-1px' }}>NEXUS</div>
          <div style={{ fontSize:13, color:C.sub, marginTop:4 }}>Real-time chat for real people</div>
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', gap:4, background:C.card, borderRadius:12, padding:4, marginBottom:24 }}>
          {['login','register'].map(t => (
            <button key={t} onClick={() => switchTab(t)} style={{ flex:1, padding:'9px 0', borderRadius:9, border:'none', fontFamily:"'Bricolage Grotesque',sans-serif", fontWeight:700, fontSize:13, transition:'all .2s', background: tab===t ? C.accent : 'transparent', color: tab===t ? '#fff' : C.sub }}>
              {t === 'login' ? 'Sign In' : 'Register'}
            </button>
          ))}
        </div>

        {/* Avatar picker */}
        {tab === 'register' && (
          <div style={{ marginBottom:18 }}>
            <div style={{ fontSize:10, color:C.sub, textTransform:'uppercase', letterSpacing:1, fontWeight:700, marginBottom:8, fontFamily:"'Bricolage Grotesque',sans-serif" }}>PICK YOUR AVATAR</div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6, justifyContent:'center' }}>
              {AVATARS.map((a, i) => {
                const col = AV_COLS[i % AV_COLS.length]
                return (
                  <button key={a} onClick={() => { setAvatar(a); setAvColor(col) }} style={{ width:36, height:36, borderRadius:10, fontSize:19, background: avatar===a ? col+'33' : C.card, border:`2px solid ${avatar===a ? col : 'transparent'}`, transition:'all .15s' }}>
                    {a}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Inputs */}
        <input placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} onKeyDown={e => e.key==='Enter' && submit()} style={inp} />
        <input placeholder="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key==='Enter' && submit()} style={{ ...inp, marginBottom: tab==='register' ? 10 : 0 }} />
        {tab === 'register' && (
          <input placeholder="Confirm password" type="password" value={confirm} onChange={e => setConfirm(e.target.value)} onKeyDown={e => e.key==='Enter' && submit()} style={{ ...inp, marginBottom:0 }} />
        )}

        {err && <div style={{ color:C.rose, fontSize:12, textAlign:'center', marginTop:10 }}>{err}</div>}

        <button onClick={submit} disabled={authBusy} style={{ width:'100%', padding:'13px 0', background:C.accent, border:'none', borderRadius:11, color:'#fff', fontFamily:"'Bricolage Grotesque',sans-serif", fontWeight:700, fontSize:14, marginTop:20, opacity: authBusy ? 0.6 : 1, boxShadow:`0 4px 20px ${C.accent}44` }}>
          {authBusy ? 'Please wait...' : tab === 'login' ? 'Sign In →' : 'Create Account →'}
        </button>

        <p style={{ textAlign:'center', fontSize:11, color:C.sub, marginTop:14, lineHeight:1.6 }}>
          🌐 Shared server — everyone connects to the same data
        </p>
      </div>
    </div>
  )
}

const inp = { width:'100%', background:'#181b26', border:'1px solid rgba(255,255,255,0.07)', borderRadius:10, padding:'11px 14px', color:'#e4e8f5', fontSize:14, marginBottom:10, outline:'none', boxSizing:'border-box', display:'block' }
