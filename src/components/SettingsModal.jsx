import { useState } from 'react'
import { useStore } from '../lib/store'
import { C, THEMES, ACCENTS, FONT_SIZES } from '../lib/theme'
import { api } from '../lib/api'

const STATUS_OPTIONS = [
  { value:'online',    label:'Online',          color:'#34d399' },
  { value:'away',      label:'Away',            color:'#fbbf24' },
  { value:'dnd',       label:'Do Not Disturb',  color:'#fb7185' },
  { value:'invisible', label:'Invisible',       color:'#8b92b0' },
]

const SECTIONS = [
  { id:'appearance', label:'Appearance', icon:'🎨' },
  { id:'profile',    label:'Profile',    icon:'👤' },
  { id:'status',     label:'Status',     icon:'🟢' },
  { id:'sound',      label:'Sound',      icon:'🔔' },
  { id:'account',    label:'Account',    icon:'⚙️'  },
]

export default function SettingsModal() {
  const { me, settingsOpen, closeSettings, logout, prefs, updatePref, showToast, _themeVersion } = useStore()
  const [section,       setSection]       = useState('appearance')
  const [confirmLogout, setConfirmLogout] = useState(false)

  // Account management form state
  const [newUsername,   setNewUsername]   = useState('')
  const [usernamePass,  setUsernamePass]  = useState('')
  const [currentPass,   setCurrentPass]   = useState('')
  const [newPass,       setNewPass]       = useState('')
  const [confirmPass,   setConfirmPass]   = useState('')
  const [deletePass,    setDeletePass]    = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [acctBusy,      setAcctBusy]     = useState(false)
  const [acctMsg,       setAcctMsg]       = useState(null) // { text, ok }

  if (!settingsOpen || !me) return null

  const showMsg = (text, ok = true) => {
    setAcctMsg({ text, ok })
    setTimeout(() => setAcctMsg(null), 3500)
  }

  const doChangeUsername = async () => {
    if (!newUsername.trim()) return showMsg('Enter a new username', false)
    if (!usernamePass)       return showMsg('Enter your password to confirm', false)
    setAcctBusy(true)
    try {
      const { user } = await api.changeUsername(me.id, newUsername.trim(), usernamePass)
      useStore.setState({ me: user })
      setNewUsername(''); setUsernamePass('')
      showMsg('Username changed! ✓')
    } catch (e) { showMsg(e.message, false) }
    setAcctBusy(false)
  }

  const doChangePassword = async () => {
    if (!currentPass)         return showMsg('Enter your current password', false)
    if (newPass.length < 4)   return showMsg('New password must be 4+ characters', false)
    if (newPass !== confirmPass) return showMsg("Passwords don't match", false)
    setAcctBusy(true)
    try {
      await api.changePassword(me.id, currentPass, newPass)
      setCurrentPass(''); setNewPass(''); setConfirmPass('')
      showMsg('Password changed! ✓')
    } catch (e) { showMsg(e.message, false) }
    setAcctBusy(false)
  }

  const doDeleteAccount = async () => {
    if (!deletePass) return showMsg('Enter your password to confirm', false)
    setAcctBusy(true)
    try {
      await api.deleteAccount(me.id, deletePass)
      logout()
    } catch (e) { showMsg(e.message, false); setAcctBusy(false) }
  }

  // All styles computed at render time so they're always in sync with C
  const s = {
    overlay:   { position:'fixed', inset:0, background:'rgba(0,0,0,0.8)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center' },
    modal:     { width:700, maxWidth:'96vw', height:540, maxHeight:'92vh', background:C.panel, borderRadius:18, border:`1px solid ${C.border}`, boxShadow:'0 32px 80px rgba(0,0,0,0.7)', display:'flex', flexDirection:'column', overflow:'hidden', animation:'fadeUp .2s ease' },
    head:      { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 22px', borderBottom:`1px solid ${C.border}`, flexShrink:0, background:C.panel },
    body:      { display:'flex', flex:1, overflow:'hidden' },
    nav:       { width:168, background:C.sidebar, borderRight:`1px solid ${C.border}`, padding:'10px 8px', display:'flex', flexDirection:'column', gap:2, flexShrink:0 },
    content:   { flex:1, padding:'20px 24px', overflowY:'auto', background:C.panel },
    navBtn:    (active) => ({ display:'flex', alignItems:'center', gap:9, padding:'9px 12px', borderRadius:8, border:'none', cursor:'pointer', fontSize:13, fontFamily:"'Instrument Sans',sans-serif", textAlign:'left', transition:'all .12s', background: active ? C.accent+'22' : 'transparent', color: active ? C.accent : C.sub, borderLeft:`2px solid ${active ? C.accent : 'transparent'}` }),
    inp:       { width:'100%', background:C.card, border:`1px solid ${C.border}`, borderRadius:9, padding:'10px 12px', color:C.text, fontSize:13, outline:'none', boxSizing:'border-box', marginBottom:8 },
    btn:       (variant='primary') => ({ padding:'9px 18px', borderRadius:9, cursor:'pointer', fontSize:13, fontWeight:600, border:'none', transition:'all .15s', background: variant==='primary' ? C.accent : variant==='danger' ? C.rose : C.card2, color: variant==='ghost' ? C.sub : '#fff' }),
    toggle:    (on) => ({ width:40, height:22, borderRadius:11, border:'none', cursor:'pointer', transition:'all .2s', background: on ? C.accent : C.card2, position:'relative', flexShrink:0 }),
    toggleDot: (on) => ({ position:'absolute', top:3, left: on ? 21 : 3, width:16, height:16, borderRadius:'50%', background:'#fff', transition:'all .2s', boxShadow:'0 1px 3px rgba(0,0,0,0.3)' }),
    pill:      (active) => ({ padding:'7px 16px', borderRadius:8, cursor:'pointer', fontSize:13, border:`1px solid ${active ? C.accent : C.border}`, background: active ? C.accent : C.card, color: active ? '#fff' : C.sub, transition:'all .15s' }),
    label:     { fontFamily:"'Bricolage Grotesque',sans-serif", fontWeight:700, fontSize:11, color:C.sub, textTransform:'uppercase', letterSpacing:1, marginBottom:10, marginTop:18 },
    card:      { background:C.card, borderRadius:12, padding:14, border:`1px solid ${C.border}`, marginBottom:14 },
    row:       { display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom:`1px solid ${C.border}` },
    danger:    { background:C.rose+'12', borderRadius:12, padding:14, border:`1px solid ${C.rose}33`, marginTop:6 },
  }

  return (
    <div style={s.overlay} onClick={closeSettings}>
      <div style={s.modal} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={s.head}>
          <div style={{ fontFamily:"'Bricolage Grotesque',sans-serif", fontWeight:800, fontSize:18, color:C.text }}>Settings</div>
          <button onClick={closeSettings} style={{ background:'none', border:'none', color:C.sub, fontSize:20, cursor:'pointer', lineHeight:1 }}>✕</button>
        </div>

        <div style={s.body}>
          {/* Left nav */}
          <div style={s.nav}>
            {SECTIONS.map(sec => (
              <button key={sec.id} onClick={() => setSection(sec.id)} style={s.navBtn(section === sec.id)}>
                <span>{sec.icon}</span>{sec.label}
              </button>
            ))}
            <div style={{ flex:1 }} />
            {/* Logout in nav */}
            <button
              onClick={() => confirmLogout ? logout() : setConfirmLogout(true)}
              onMouseLeave={() => setTimeout(() => setConfirmLogout(false), 2500)}
              style={{ ...s.navBtn(false), color: confirmLogout ? C.rose : C.sub, background: confirmLogout ? C.rose+'18' : 'transparent', borderLeft:`2px solid ${confirmLogout ? C.rose : 'transparent'}` }}
            >
              <span>🚪</span>{confirmLogout ? 'Sure? Click again' : 'Log Out'}
            </button>
          </div>

          {/* Right content */}
          <div style={s.content}>

            {/* ── APPEARANCE ── */}
            {section === 'appearance' && (
              <div>
                <div style={s.label}>Theme</div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:4 }}>
                  {Object.entries(THEMES).map(([key, t]) => (
                    <button key={key} onClick={() => updatePref('theme', key)} style={{
                      padding:10, borderRadius:10, cursor:'pointer', position:'relative',
                      textAlign:'left', transition:'all .15s', background:t.panel,
                      border:`2px solid ${prefs.theme === key ? C.accent : t.border}`,
                      boxShadow: prefs.theme === key ? `0 0 0 1px ${C.accent}` : 'none',
                    }}>
                      <div style={{ display:'flex', gap:3, marginBottom:5 }}>
                        <div style={{ width:10, height:10, borderRadius:3, background:t.rail }} />
                        <div style={{ width:24, height:10, borderRadius:3, background:t.sidebar }} />
                        <div style={{ flex:1, height:10, borderRadius:3, background:t.bg }} />
                      </div>
                      <div style={{ fontSize:11, color:t.text, fontWeight: prefs.theme === key ? 700 : 400 }}>{t.label}</div>
                      {prefs.theme === key && <div style={{ position:'absolute', top:6, right:8, fontSize:10, color:C.accent }}>✓</div>}
                    </button>
                  ))}
                </div>

                <div style={s.label}>Accent Color</div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:4 }}>
                  {Object.entries(ACCENTS).map(([key, a]) => (
                    <button key={key} onClick={() => updatePref('accent', key)} title={a.label} style={{
                      width:34, height:34, borderRadius:10, background:a.color, cursor:'pointer',
                      border:`3px solid ${prefs.accent === key ? C.text : 'transparent'}`,
                      boxShadow: prefs.accent === key ? `0 0 0 2px ${a.color}` : 'none',
                      fontSize:14, transition:'all .15s', color:'#fff',
                    }}>
                      {prefs.accent === key ? '✓' : ''}
                    </button>
                  ))}
                </div>

                <div style={s.label}>Font Size</div>
                <div style={{ display:'flex', gap:8, marginBottom:4 }}>
                  {Object.entries(FONT_SIZES).map(([key, f]) => (
                    <button key={key} onClick={() => updatePref('fontSize', key)} style={s.pill(prefs.fontSize === key)}>
                      {f.label}
                    </button>
                  ))}
                </div>

                <div style={s.label}>Display Options</div>
                <ToggleRow label="Compact mode (IRC-style, less whitespace)" value={prefs.compactMode} onChange={v => updatePref('compactMode', v)} s={s} />
                <ToggleRow label="Show avatars in chat" value={prefs.showAvatars} onChange={v => updatePref('showAvatars', v)} s={s} />
              </div>
            )}

            {/* ── PROFILE ── */}
            {section === 'profile' && (
              <div>
                <div style={{ display:'flex', gap:14, alignItems:'center', marginBottom:20 }}>
                  <div style={{ width:64, height:64, borderRadius:18, background:me.color+'33', border:`2px solid ${me.color}66`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:32, flexShrink:0 }}>
                    {me.avatar}
                  </div>
                  <div>
                    <div style={{ fontFamily:"'Bricolage Grotesque',sans-serif", fontWeight:800, fontSize:18, color:C.text }}>{me.username}</div>
                    <div style={{ fontSize:12, color:C.sub, marginTop:3 }}>Member of NEXUS Chat</div>
                  </div>
                </div>
                <div style={s.card}>
                  <InfoRow label="Username" value={me.username} s={s} />
                  <InfoRow label="User ID"  value={me.id}       mono s={s} />
                  <InfoRow label="Avatar"   value={me.avatar}   s={s} />
                </div>
                <div style={{ fontSize:12, color:C.sub }}>Avatar and display color are set at registration and cannot be changed. To use a different avatar, create a new account.</div>
              </div>
            )}

            {/* ── STATUS ── */}
            {section === 'status' && (
              <div>
                <div style={s.label}>Your Status</div>
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {STATUS_OPTIONS.map(opt => (
                    <button key={opt.value} onClick={() => updatePref('status', opt.value)} style={{
                      display:'flex', alignItems:'center', gap:12, padding:'12px 14px',
                      background:   prefs.status === opt.value ? C.accent+'18' : C.card,
                      border:       `1px solid ${prefs.status === opt.value ? C.accent+'55' : C.border}`,
                      borderRadius:10, cursor:'pointer', textAlign:'left', transition:'all .15s',
                    }}>
                      <div style={{ width:12, height:12, borderRadius:'50%', background:opt.color, flexShrink:0 }} />
                      <div style={{ flex:1, fontSize:13, color:C.text, fontWeight: prefs.status === opt.value ? 600 : 400 }}>
                        {opt.label}
                      </div>
                      {prefs.status === opt.value && <span style={{ color:C.accent }}>✓</span>}
                    </button>
                  ))}
                </div>
                <div style={{ fontSize:11, color:C.sub, marginTop:12 }}>
                  Shown as a colored dot on your avatar in the sidebar.
                </div>
              </div>
            )}

            {/* ── SOUND ── */}
            {section === 'sound' && (
              <div>
                <div style={s.label}>Notifications</div>
                <ToggleRow label="Play a sound when new messages arrive" value={prefs.soundEnabled} onChange={v => updatePref('soundEnabled', v)} s={s} />
                <div style={{ ...s.card, marginTop:14 }}>
                  <div style={{ fontSize:12, color:C.sub }}>💡 To receive browser notifications while the tab is in the background, allow notifications for this site in your browser settings.</div>
                </div>
              </div>
            )}

            {/* ── ACCOUNT MANAGEMENT ── */}
            {section === 'account' && (
              <div>
                {acctMsg && (
                  <div style={{ padding:'10px 14px', borderRadius:9, marginBottom:14, fontSize:13, background: acctMsg.ok ? C.emerald+'22' : C.rose+'22', color: acctMsg.ok ? C.emerald : C.rose, border:`1px solid ${acctMsg.ok ? C.emerald+'55' : C.rose+'55'}` }}>
                    {acctMsg.text}
                  </div>
                )}

                {/* Change username */}
                <div style={s.label}>Change Username</div>
                <div style={s.card}>
                  <input placeholder="New username" value={newUsername} onChange={e => setNewUsername(e.target.value)} style={s.inp} />
                  <input placeholder="Current password to confirm" type="password" value={usernamePass} onChange={e => setUsernamePass(e.target.value)} onKeyDown={e => e.key==='Enter' && doChangeUsername()} style={{ ...s.inp, marginBottom:10 }} />
                  <button onClick={doChangeUsername} disabled={acctBusy} style={s.btn('primary')}>
                    {acctBusy ? 'Saving...' : 'Change Username'}
                  </button>
                </div>

                {/* Change password */}
                <div style={s.label}>Change Password</div>
                <div style={s.card}>
                  <input placeholder="Current password" type="password" value={currentPass} onChange={e => setCurrentPass(e.target.value)} style={s.inp} />
                  <input placeholder="New password (4+ characters)" type="password" value={newPass} onChange={e => setNewPass(e.target.value)} style={s.inp} />
                  <input placeholder="Confirm new password" type="password" value={confirmPass} onChange={e => setConfirmPass(e.target.value)} onKeyDown={e => e.key==='Enter' && doChangePassword()} style={{ ...s.inp, marginBottom:10 }} />
                  <button onClick={doChangePassword} disabled={acctBusy} style={s.btn('primary')}>
                    {acctBusy ? 'Saving...' : 'Change Password'}
                  </button>
                </div>

                {/* About */}
                <div style={s.label}>About</div>
                <div style={s.card}>
                  <InfoRow label="Username" value={me.username} s={s} />
                  <InfoRow label="User ID"  value={me.id}       mono s={s} />
                </div>

                {/* Danger zone */}
                <div style={s.label}>Danger Zone</div>
                <div style={s.danger}>
                  <div style={{ fontSize:13, color:C.text, marginBottom:10, fontWeight:600 }}>⚠️ Delete Account</div>
                  <div style={{ fontSize:12, color:C.sub, marginBottom:12 }}>
                    Permanently deletes your account and all your messages. This cannot be undone.
                  </div>
                  {confirmDelete ? (
                    <>
                      <input placeholder="Enter password to confirm" type="password" value={deletePass} onChange={e => setDeletePass(e.target.value)} onKeyDown={e => e.key==='Enter' && doDeleteAccount()} style={{ ...s.inp, borderColor: C.rose+'55', marginBottom:10 }} />
                      <div style={{ display:'flex', gap:8 }}>
                        <button onClick={doDeleteAccount} disabled={acctBusy} style={s.btn('danger')}>
                          {acctBusy ? 'Deleting...' : '🗑 Yes, delete my account'}
                        </button>
                        <button onClick={() => { setConfirmDelete(false); setDeletePass('') }} style={s.btn('ghost')}>
                          Cancel
                        </button>
                      </div>
                    </>
                  ) : (
                    <button onClick={() => setConfirmDelete(true)} style={{ ...s.btn('ghost'), border:`1px solid ${C.rose}55`, color:C.rose }}>
                      Delete My Account
                    </button>
                  )}
                </div>

                {/* Logout */}
                <div style={s.label}>Session</div>
                <button
                  onClick={() => confirmLogout ? logout() : setConfirmLogout(true)}
                  onMouseLeave={() => setTimeout(() => setConfirmLogout(false), 2500)}
                  style={{ ...s.btn(confirmLogout ? 'danger' : 'ghost'), border:`1px solid ${confirmLogout ? C.rose : C.border}`, color: confirmLogout ? '#fff' : C.sub }}
                >
                  🚪 {confirmLogout ? 'Click again to confirm logout' : 'Log Out'}
                </button>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Sub-components ── */
function ToggleRow({ label, value, onChange, s }) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 0', borderBottom:`1px solid ${C.border}` }}>
      <span style={{ fontSize:13, color:C.text }}>{label}</span>
      <button onClick={() => onChange(!value)} style={s.toggle(value)}>
        <div style={s.toggleDot(value)} />
      </button>
    </div>
  )
}

function InfoRow({ label, value, mono, s }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'5px 0', borderBottom:`1px solid ${C.border}`, gap:12 }}>
      <span style={{ fontSize:12, color:C.sub, flexShrink:0 }}>{label}</span>
      <span style={{ fontSize:12, color:C.text, fontFamily: mono ? 'monospace' : 'inherit', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{value}</span>
    </div>
  )
}
