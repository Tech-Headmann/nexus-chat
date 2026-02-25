import { useState, useRef } from 'react'
import { useStore } from '../lib/store'
import { C, THEMES, ACCENTS, FONT_SIZES, RADIUS, MSG_STYLES, AVATARS, AV_COLS } from '../lib/theme'
import { api } from '../lib/api'

const STATUS_OPTIONS = [
  { value:'online',    label:'Online',          color:'#34d399' },
  { value:'away',      label:'Away',            color:'#fbbf24' },
  { value:'dnd',       label:'Do Not Disturb',  color:'#fb7185' },
  { value:'invisible', label:'Invisible',       color:'#6b7280' },
]

const SECTIONS = [
  { id:'profile',    label:'My Profile',    icon:'👤' },
  { id:'appearance', label:'Appearance',    icon:'🎨' },
  { id:'status',     label:'Status',        icon:'🟢' },
  { id:'sound',      label:'Sound',         icon:'🔔' },
  { id:'account',    label:'Account',       icon:'⚙️'  },
]

export default function SettingsModal() {
  const { me, settingsOpen, closeSettings, logout, prefs, updatePref, showToast, _themeVersion } = useStore()
  const [section,       setSection]       = useState('profile')
  const [confirmLogout, setConfirmLogout] = useState(false)

  // Profile state
  const [displayName,   setDisplayName]   = useState('')
  const [bio,           setBio]           = useState('')
  const [profileBusy,   setProfileBusy]   = useState(false)
  const [profileMsg,    setProfileMsg]     = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [selectedEmoji, setSelectedEmoji] = useState(null)
  const [selectedColor, setSelectedColor] = useState(null)
  const fileRef = useRef()

  // Account state
  const [newUsername,   setNewUsername]   = useState('')
  const [usernamePass,  setUsernamePass]  = useState('')
  const [currentPass,   setCurrentPass]   = useState('')
  const [newPass,       setNewPass]       = useState('')
  const [confirmPass,   setConfirmPass]   = useState('')
  const [deletePass,    setDeletePass]    = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [acctBusy,      setAcctBusy]     = useState(false)
  const [acctMsg,       setAcctMsg]       = useState(null)

  // Custom status text
  const [customStatus, setCustomStatus]   = useState(prefs?.customStatus || '')

  if (!settingsOpen || !me) return null

  const showMsg  = (text, ok=true) => { setProfileMsg({ text, ok }); setTimeout(() => setProfileMsg(null), 3500) }
  const showAcct = (text, ok=true) => { setAcctMsg({ text, ok });    setTimeout(() => setAcctMsg(null), 3500) }

  /* ── Profile actions ── */
  const onFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) return showMsg('Please select an image file', false)
    if (file.size > 3_000_000) return showMsg('Image must be under 3MB', false)
    const reader = new FileReader()
    reader.onload = ev => setAvatarPreview(ev.target.result)
    reader.readAsDataURL(file)
  }

  const saveProfile = async () => {
    setProfileBusy(true)
    try {
      let user = me
      // Upload image if one is selected
      if (avatarPreview) {
        const r = await api.uploadAvatar(me.id, avatarPreview)
        user = r.user
        useStore.setState({ me: { ...useStore.getState().me, ...r.user } })
        setAvatarPreview(null)
      }
      // Change emoji avatar if selected
      if (selectedEmoji) {
        // We store this via display update — update avatar field via a dedicated call
        // For now update display name which triggers user_updated broadcast
      }
      // Update display name
      if (displayName.trim() !== (me.display_name || '')) {
        const r = await api.updateDisplayName(me.id, displayName)
        useStore.setState({ me: { ...useStore.getState().me, ...r.user } })
      }
      // Update bio
      if (bio !== (me.bio || '')) {
        const r = await api.updateBio(me.id, bio)
        useStore.setState({ me: { ...useStore.getState().me, ...r.user } })
      }
      showMsg('Profile updated! ✓')
    } catch(e) { showMsg(e.message, false) }
    setProfileBusy(false)
  }

  /* ── Account actions ── */
  const doChangeUsername = async () => {
    if (!newUsername.trim()) return showAcct('Enter a new username', false)
    if (!usernamePass)       return showAcct('Enter your password to confirm', false)
    setAcctBusy(true)
    try {
      const { user } = await api.changeUsername(me.id, newUsername.trim(), usernamePass)
      useStore.setState({ me: { ...useStore.getState().me, ...user } })
      setNewUsername(''); setUsernamePass('')
      showAcct('Username changed! ✓')
    } catch(e) { showAcct(e.message, false) }
    setAcctBusy(false)
  }

  const doChangePassword = async () => {
    if (!currentPass)            return showAcct('Enter your current password', false)
    if (newPass.length < 4)      return showAcct('New password must be 4+ characters', false)
    if (newPass !== confirmPass)  return showAcct("Passwords don't match", false)
    setAcctBusy(true)
    try {
      await api.changePassword(me.id, currentPass, newPass)
      setCurrentPass(''); setNewPass(''); setConfirmPass('')
      showAcct('Password changed! ✓')
    } catch(e) { showAcct(e.message, false) }
    setAcctBusy(false)
  }

  const doDeleteAccount = async () => {
    if (!deletePass) return showAcct('Enter your password to confirm', false)
    setAcctBusy(true)
    try { await api.deleteAccount(me.id, deletePass); logout() }
    catch(e) { showAcct(e.message, false); setAcctBusy(false) }
  }

  const saveCustomStatus = () => {
    updatePref('customStatus', customStatus)
    showMsg('Status text saved! ✓')
  }

  /* ── Styles (all computed at render) ── */
  const s = {
    overlay:   { position:'fixed', inset:0, background:'rgba(0,0,0,0.82)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center' },
    modal:     { width:740, maxWidth:'96vw', height:560, maxHeight:'93vh', background:C.panel, borderRadius:16, border:`1px solid ${C.border}`, boxShadow:'0 32px 80px rgba(0,0,0,0.7)', display:'flex', flexDirection:'column', overflow:'hidden', animation:'fadeUp .2s ease' },
    head:      { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'15px 22px', borderBottom:`1px solid ${C.border}`, flexShrink:0 },
    body:      { display:'flex', flex:1, overflow:'hidden' },
    nav:       { width:172, background:C.sidebar, borderRight:`1px solid ${C.border}`, padding:'10px 8px', display:'flex', flexDirection:'column', gap:2, flexShrink:0, overflowY:'auto' },
    content:   { flex:1, padding:'20px 22px', overflowY:'auto', background:C.panel },
    navBtn:    (active) => ({ display:'flex', alignItems:'center', gap:9, padding:'9px 12px', borderRadius:8, border:'none', cursor:'pointer', fontSize:13, textAlign:'left', transition:'all .12s', background: active ? C.accent+'22' : 'transparent', color: active ? C.accent : C.sub, borderLeft:`2px solid ${active ? C.accent : 'transparent'}` }),
    inp:       { width:'100%', background:C.card, border:`1px solid ${C.border}`, borderRadius:9, padding:'10px 12px', color:C.text, fontSize:13, outline:'none', boxSizing:'border-box', marginBottom:8 },
    btn:       (v='primary') => ({ padding:'9px 18px', borderRadius:9, cursor:'pointer', fontSize:13, fontWeight:600, border:'none', transition:'all .15s', background: v==='primary'?C.accent : v==='danger'?C.rose : C.card2, color: v==='ghost'?C.sub : '#fff' }),
    toggle:    (on) => ({ width:40, height:22, borderRadius:11, border:'none', cursor:'pointer', transition:'all .2s', background: on?C.accent:C.card2, position:'relative', flexShrink:0 }),
    toggleDot: (on) => ({ position:'absolute', top:3, left: on?21:3, width:16, height:16, borderRadius:'50%', background:'#fff', transition:'all .2s' }),
    pill:      (active) => ({ padding:'7px 16px', borderRadius:8, cursor:'pointer', fontSize:13, border:`1px solid ${active?C.accent:C.border}`, background: active?C.accent:C.card, color: active?'#fff':C.sub, transition:'all .15s' }),
    label:     { fontFamily:"'Bricolage Grotesque',sans-serif", fontWeight:700, fontSize:11, color:C.sub, textTransform:'uppercase', letterSpacing:1, marginBottom:8, marginTop:16 },
    card:      { background:C.card, borderRadius:12, padding:14, border:`1px solid ${C.border}`, marginBottom:12 },
    danger:    { background:C.rose+'10', borderRadius:12, padding:14, border:`1px solid ${C.rose}30`, marginTop:6 },
    msgFb:     (ok) => ({ padding:'8px 12px', borderRadius:8, marginBottom:12, fontSize:13, background:ok?C.emerald+'20':C.rose+'20', color:ok?C.emerald:C.rose, border:`1px solid ${ok?C.emerald+'44':C.rose+'44'}` }),
  }

  const currentAvatarSrc = avatarPreview || me.avatar_img
  const isLight = ['light','paper'].includes(prefs?.theme)

  return (
    <div style={s.overlay} onClick={closeSettings}>
      <div style={s.modal} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={s.head}>
          <div style={{ fontFamily:"'Bricolage Grotesque',sans-serif", fontWeight:800, fontSize:17, color:C.text }}>Settings</div>
          <button onClick={closeSettings} style={{ background:'none', border:'none', color:C.sub, fontSize:20, cursor:'pointer', lineHeight:1 }}>✕</button>
        </div>

        <div style={s.body}>

          {/* Left nav */}
          <div style={s.nav}>
            {SECTIONS.map(sec => (
              <button key={sec.id} onClick={() => setSection(sec.id)} style={s.navBtn(section===sec.id)}>
                <span style={{ fontSize:15 }}>{sec.icon}</span>
                <span style={{ fontFamily:"'Instrument Sans',sans-serif" }}>{sec.label}</span>
              </button>
            ))}
            <div style={{ flex:1 }} />
            <div style={{ height:1, background:C.border, margin:'6px 4px' }} />
            <button
              onClick={() => confirmLogout ? logout() : setConfirmLogout(true)}
              onMouseLeave={() => setTimeout(() => setConfirmLogout(false), 2500)}
              style={{ ...s.navBtn(false), color: confirmLogout?C.rose:C.sub, background: confirmLogout?C.rose+'18':'transparent', borderLeft:`2px solid ${confirmLogout?C.rose:'transparent'}` }}
            >
              <span style={{ fontSize:15 }}>🚪</span>
              <span style={{ fontFamily:"'Instrument Sans',sans-serif" }}>{confirmLogout ? 'Confirm?' : 'Log Out'}</span>
            </button>
          </div>

          {/* Content */}
          <div style={s.content}>

            {/* ══ MY PROFILE ══ */}
            {section === 'profile' && (
              <div>
                {profileMsg && <div style={s.msgFb(profileMsg.ok)}>{profileMsg.text}</div>}

                {/* Avatar editor */}
                <div style={s.label}>Avatar</div>
                <div style={{ display:'flex', gap:16, alignItems:'flex-start', marginBottom:4 }}>

                  {/* Big avatar preview */}
                  <div style={{ flexShrink:0 }}>
                    <div style={{ width:80, height:80, borderRadius:20, overflow:'hidden', background:me.color+'33', border:`3px solid ${me.color}66`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:40, position:'relative', cursor:'pointer' }}
                      onClick={() => fileRef.current?.click()}>
                      {currentAvatarSrc
                        ? <img src={currentAvatarSrc} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                        : (selectedEmoji || me.avatar)
                      }
                      {/* Upload overlay */}
                      <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.45)', display:'flex', alignItems:'center', justifyContent:'center', opacity:0, transition:'opacity .2s', fontSize:22 }}
                        onMouseEnter={e => e.currentTarget.style.opacity=1}
                        onMouseLeave={e => e.currentTarget.style.opacity=0}>
                        📷
                      </div>
                    </div>
                    <input ref={fileRef} type="file" accept="image/*" style={{ display:'none' }} onChange={onFileChange} />
                  </div>

                  {/* Controls */}
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:12, color:C.sub, marginBottom:8 }}>Click the avatar to upload a photo, or pick an emoji below.</div>

                    <div style={{ display:'flex', gap:6, marginBottom:8 }}>
                      <button onClick={() => fileRef.current?.click()} style={{ ...s.btn('primary'), padding:'6px 14px', fontSize:12 }}>📷 Upload Photo</button>
                      {(avatarPreview || me.avatar_img) && (
                        <button onClick={async () => {
                          setAvatarPreview(null)
                          setProfileBusy(true)
                          try {
                            const r = await api.uploadAvatar(me.id, null)
                            useStore.setState({ me: { ...useStore.getState().me, ...r.user } })
                            showMsg('Photo removed')
                          } catch(e) { showMsg(e.message, false) }
                          setProfileBusy(false)
                        }} style={{ ...s.btn('ghost'), padding:'6px 14px', fontSize:12, border:`1px solid ${C.border}` }}>
                          Remove Photo
                        </button>
                      )}
                    </div>

                    {/* Emoji picker */}
                    <div style={{ display:'flex', flexWrap:'wrap', gap:3 }}>
                      {AVATARS.map(em => (
                        <button key={em} onClick={() => { setSelectedEmoji(em); setAvatarPreview(null) }} style={{ width:28, height:28, borderRadius:7, fontSize:15, cursor:'pointer', background: (selectedEmoji||me.avatar)===em ? C.accent+'33' : 'transparent', border:`1.5px solid ${(selectedEmoji||me.avatar)===em ? C.accent : 'transparent'}` }}>{em}</button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Profile color */}
                <div style={s.label}>Profile Color</div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:5, marginBottom:4 }}>
                  {AV_COLS.slice(0,12).map(col => (
                    <button key={col} onClick={() => setSelectedColor(col)} style={{ width:28, height:28, borderRadius:8, background:col, cursor:'pointer', border:`2.5px solid ${(selectedColor||me.color)===col ? C.text : 'transparent'}`, transition:'all .15s' }} />
                  ))}
                </div>

                {/* Display name */}
                <div style={s.label}>Display Name</div>
                <input
                  placeholder={me.username}
                  value={displayName !== '' ? displayName : (me.display_name || '')}
                  onChange={e => setDisplayName(e.target.value)}
                  maxLength={32}
                  style={s.inp}
                />
                <div style={{ fontSize:11, color:C.sub, marginTop:-4, marginBottom:10 }}>This is shown in place of your username. Leave blank to use username.</div>

                {/* Bio */}
                <div style={s.label}>Bio</div>
                <textarea
                  placeholder="Tell people a bit about yourself..."
                  value={bio !== '' ? bio : (me.bio || '')}
                  onChange={e => setBio(e.target.value)}
                  maxLength={190}
                  rows={3}
                  style={{ ...s.inp, resize:'none', lineHeight:1.5 }}
                />
                <div style={{ fontSize:11, color:C.sub, marginTop:-4, marginBottom:12 }}>{(bio || me.bio || '').length}/190</div>

                <button onClick={saveProfile} disabled={profileBusy} style={s.btn('primary')}>
                  {profileBusy ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            )}

            {/* ══ APPEARANCE ══ */}
            {section === 'appearance' && (
              <div>
                {/* Themes — 2-row grid */}
                <div style={s.label}>Theme</div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:6, marginBottom:4 }}>
                  {Object.entries(THEMES).map(([key, t]) => (
                    <button key={key} onClick={() => updatePref('theme', key)} style={{
                      padding:'8px 6px', borderRadius:9, cursor:'pointer', position:'relative', textAlign:'center',
                      transition:'all .15s', background:t.panel,
                      border:`2px solid ${prefs.theme===key ? C.accent : 'rgba(128,128,128,0.2)'}`,
                      boxShadow: prefs.theme===key ? `0 0 0 1px ${C.accent}` : 'none',
                    }}>
                      {/* Mini preview */}
                      <div style={{ display:'flex', gap:2, marginBottom:5, justifyContent:'center' }}>
                        <div style={{ width:8, height:8, borderRadius:2, background:t.rail }} />
                        <div style={{ width:14, height:8, borderRadius:2, background:t.sidebar }} />
                        <div style={{ flex:1, height:8, borderRadius:2, background:t.bg }} />
                      </div>
                      <div style={{ fontSize:10, color:t.text, fontWeight: prefs.theme===key ? 700 : 400, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{t.label}</div>
                      {prefs.theme===key && <div style={{ position:'absolute', top:4, right:5, fontSize:9, color:C.accent }}>✓</div>}
                    </button>
                  ))}
                </div>

                {/* Accent — preset swatches */}
                <div style={s.label}>Accent Color</div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:7, marginBottom:6 }}>
                  {Object.entries(ACCENTS).map(([key, a]) => (
                    <button key={key} onClick={() => { updatePref('accent', key); updatePref('customAccent', null) }} title={a.label} style={{
                      width:30, height:30, borderRadius:9, background:a.color, cursor:'pointer',
                      border:`3px solid ${prefs.accent===key && !prefs.customAccent ? '#fff' : 'transparent'}`,
                      boxShadow: prefs.accent===key && !prefs.customAccent ? `0 0 0 2px ${a.color}` : 'none',
                      fontSize:13, color:'#fff', fontWeight:700, transition:'all .15s',
                    }}>
                      {prefs.accent===key && !prefs.customAccent ? '✓' : ''}
                    </button>
                  ))}
                </div>

                {/* Custom accent with color picker */}
                <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', background:C.card, borderRadius:10, border:`1px solid ${C.border}`, marginBottom:4 }}>
                  <span style={{ fontSize:12, color:C.sub }}>Custom color:</span>
                  <input type="color" value={prefs.customAccent || C.accent} onChange={e => { updatePref('customAccent', e.target.value); updatePref('accent', 'custom') }}
                    style={{ width:36, height:28, borderRadius:6, border:'none', cursor:'pointer', background:'none', padding:0 }} />
                  <span style={{ fontSize:12, color:C.sub }}>{prefs.customAccent || 'none'}</span>
                  {prefs.customAccent && (
                    <button onClick={() => { updatePref('customAccent', null); updatePref('accent','indigo') }} style={{ marginLeft:'auto', fontSize:11, color:C.sub, background:'none', border:'none', cursor:'pointer' }}>Reset</button>
                  )}
                </div>

                {/* Font size */}
                <div style={s.label}>Font Size</div>
                <div style={{ display:'flex', gap:7, marginBottom:4 }}>
                  {Object.entries(FONT_SIZES).map(([key, f]) => (
                    <button key={key} onClick={() => updatePref('fontSize', key)} style={s.pill(prefs.fontSize===key)}>{f.label}</button>
                  ))}
                </div>

                {/* Border radius */}
                <div style={s.label}>Corner Style</div>
                <div style={{ display:'flex', gap:7, marginBottom:4 }}>
                  {Object.entries(RADIUS).map(([key, r]) => (
                    <button key={key} onClick={() => updatePref('radius', key)} style={{ ...s.pill(prefs.radius===key), borderRadius: Math.min(r.val, 10) }}>{r.label}</button>
                  ))}
                </div>

                {/* Message style */}
                <div style={s.label}>Message Style</div>
                <div style={{ display:'flex', gap:7, flexWrap:'wrap', marginBottom:4 }}>
                  {Object.entries(MSG_STYLES).map(([key, m]) => (
                    <button key={key} onClick={() => updatePref('msgStyle', key)} style={{ ...s.pill(prefs.msgStyle===key), display:'flex', flexDirection:'column', gap:1, padding:'8px 14px' }}>
                      <span>{m.label}</span>
                      <span style={{ fontSize:10, opacity:.6, fontWeight:400 }}>{m.desc}</span>
                    </button>
                  ))}
                </div>

                {/* Display toggles */}
                <div style={s.label}>Display</div>
                <ToggleRow label="Show avatars in chat" value={prefs.showAvatars} onChange={v => updatePref('showAvatars', v)} s={s} />
              </div>
            )}

            {/* ══ STATUS ══ */}
            {section === 'status' && (
              <div>
                <div style={s.label}>Online Status</div>
                <div style={{ display:'flex', flexDirection:'column', gap:7, marginBottom:12 }}>
                  {STATUS_OPTIONS.map(opt => (
                    <button key={opt.value} onClick={() => updatePref('status', opt.value)} style={{ display:'flex', alignItems:'center', gap:12, padding:'11px 14px', background: prefs.status===opt.value ? C.accent+'18' : C.card, border:`1px solid ${prefs.status===opt.value ? C.accent+'55' : C.border}`, borderRadius:10, cursor:'pointer', textAlign:'left', transition:'all .15s' }}>
                      <div style={{ width:12, height:12, borderRadius:'50%', background:opt.color, flexShrink:0 }} />
                      <div style={{ flex:1, fontSize:13, color:C.text, fontWeight: prefs.status===opt.value ? 600 : 400 }}>{opt.label}</div>
                      {prefs.status===opt.value && <span style={{ color:C.accent }}>✓</span>}
                    </button>
                  ))}
                </div>

                <div style={s.label}>Custom Status Text</div>
                <div style={{ display:'flex', gap:8 }}>
                  <input
                    placeholder="What's on your mind?"
                    value={customStatus}
                    onChange={e => setCustomStatus(e.target.value)}
                    onKeyDown={e => e.key==='Enter' && saveCustomStatus()}
                    maxLength={60}
                    style={{ ...s.inp, flex:1, marginBottom:0 }}
                  />
                  <button onClick={saveCustomStatus} style={s.btn('primary')}>Save</button>
                </div>
                <div style={{ fontSize:11, color:C.sub, marginTop:6 }}>Shown in place of your status label in the sidebar.</div>
              </div>
            )}

            {/* ══ SOUND ══ */}
            {section === 'sound' && (
              <div>
                <div style={s.label}>Notifications</div>
                <ToggleRow label="Message notification sounds" value={prefs.soundEnabled} onChange={v => updatePref('soundEnabled', v)} s={s} />
                <div style={{ ...s.card, marginTop:14, fontSize:12, color:C.sub }}>
                  💡 For background notifications, allow this site in your browser's notification settings.
                </div>
              </div>
            )}

            {/* ══ ACCOUNT ══ */}
            {section === 'account' && (
              <div>
                {acctMsg && <div style={s.msgFb(acctMsg.ok)}>{acctMsg.text}</div>}

                <div style={s.label}>Change Username</div>
                <div style={s.card}>
                  <input placeholder="New username" value={newUsername} onChange={e => setNewUsername(e.target.value)} style={s.inp} />
                  <input placeholder="Current password" type="password" value={usernamePass} onChange={e => setUsernamePass(e.target.value)} onKeyDown={e => e.key==='Enter' && doChangeUsername()} style={{ ...s.inp, marginBottom:10 }} />
                  <button onClick={doChangeUsername} disabled={acctBusy} style={s.btn('primary')}>{acctBusy ? 'Saving...' : 'Change Username'}</button>
                </div>

                <div style={s.label}>Change Password</div>
                <div style={s.card}>
                  <input placeholder="Current password" type="password" value={currentPass} onChange={e => setCurrentPass(e.target.value)} style={s.inp} />
                  <input placeholder="New password (4+ chars)" type="password" value={newPass} onChange={e => setNewPass(e.target.value)} style={s.inp} />
                  <input placeholder="Confirm new password" type="password" value={confirmPass} onChange={e => setConfirmPass(e.target.value)} onKeyDown={e => e.key==='Enter' && doChangePassword()} style={{ ...s.inp, marginBottom:10 }} />
                  <button onClick={doChangePassword} disabled={acctBusy} style={s.btn('primary')}>{acctBusy ? 'Saving...' : 'Change Password'}</button>
                </div>

                <div style={s.label}>Account Info</div>
                <div style={s.card}>
                  <InfoRow label="Username"     value={me.username}                                  s={s} />
                  <InfoRow label="Display Name" value={me.display_name || '(same as username)'}      s={s} />
                  <InfoRow label="User ID"      value={me.id}                                        s={s} mono />
                </div>

                <div style={s.label}>Danger Zone</div>
                <div style={s.danger}>
                  <div style={{ fontSize:13, color:C.text, fontWeight:600, marginBottom:6 }}>⚠️ Delete Account</div>
                  <div style={{ fontSize:12, color:C.sub, marginBottom:10 }}>Permanently deletes your account, messages, and friends. Cannot be undone.</div>
                  {confirmDelete ? (
                    <>
                      <input placeholder="Password to confirm" type="password" value={deletePass} onChange={e => setDeletePass(e.target.value)} onKeyDown={e => e.key==='Enter' && doDeleteAccount()} style={{ ...s.inp, borderColor:C.rose+'55', marginBottom:8 }} />
                      <div style={{ display:'flex', gap:8 }}>
                        <button onClick={doDeleteAccount} disabled={acctBusy} style={s.btn('danger')}>{acctBusy ? 'Deleting...' : '🗑 Delete my account'}</button>
                        <button onClick={() => { setConfirmDelete(false); setDeletePass('') }} style={{ ...s.btn('ghost'), border:`1px solid ${C.border}` }}>Cancel</button>
                      </div>
                    </>
                  ) : (
                    <button onClick={() => setConfirmDelete(true)} style={{ ...s.btn('ghost'), border:`1px solid ${C.rose}44`, color:C.rose }}>Delete My Account</button>
                  )}
                </div>

                <div style={{ marginTop:16 }}>
                  <button
                    onClick={() => confirmLogout ? logout() : setConfirmLogout(true)}
                    onMouseLeave={() => setTimeout(() => setConfirmLogout(false), 2500)}
                    style={{ ...s.btn(confirmLogout?'danger':'ghost'), border:`1px solid ${confirmLogout?C.rose:C.border}`, color: confirmLogout?'#fff':C.sub }}
                  >
                    🚪 {confirmLogout ? 'Click again to confirm' : 'Log Out'}
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  )
}

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
      <span style={{ fontSize:12, color:C.text, fontFamily: mono?'monospace':'inherit', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{value}</span>
    </div>
  )
}
