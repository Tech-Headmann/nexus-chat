// ── Built-in themes ──────────────────────────────────────────────────────────
export const THEMES = {
  dark: {
    label: 'Dark',
    bg:      '#080a0f',
    rail:    '#0d0f17',
    sidebar: '#0f1219',
    panel:   '#121520',
    card:    '#181b26',
    card2:   '#1d2030',
    text:    '#e4e8f5',
    sub:     '#8b92b0',
    border:  'rgba(255,255,255,0.07)',
    glow:    'rgba(79,110,247,0.15)',
  },
  midnight: {
    label: 'Midnight',
    bg:      '#0a0a14',
    rail:    '#0f0f1e',
    sidebar: '#12122a',
    panel:   '#151530',
    card:    '#1a1a38',
    card2:   '#1f1f40',
    text:    '#dde0ff',
    sub:     '#7b7faa',
    border:  'rgba(150,150,255,0.08)',
    glow:    'rgba(100,80,255,0.15)',
  },
  slate: {
    label: 'Slate',
    bg:      '#0d1117',
    rail:    '#161b22',
    sidebar: '#1a2030',
    panel:   '#1e2535',
    card:    '#232d3f',
    card2:   '#2a3548',
    text:    '#cdd9e5',
    sub:     '#7a8fa8',
    border:  'rgba(255,255,255,0.06)',
    glow:    'rgba(79,110,247,0.12)',
  },
  forest: {
    label: 'Forest',
    bg:      '#090e0c',
    rail:    '#0d1610',
    sidebar: '#101a13',
    panel:   '#131f17',
    card:    '#182519',
    card2:   '#1e2c1f',
    text:    '#d4e8d4',
    sub:     '#6a8f6a',
    border:  'rgba(100,200,100,0.07)',
    glow:    'rgba(52,211,153,0.12)',
  },
  light: {
    label: 'Light',
    bg:      '#f0f2f5',
    rail:    '#e2e5ea',
    sidebar: '#e8eaef',
    panel:   '#ffffff',
    card:    '#f5f6f8',
    card2:   '#ebedf0',
    text:    '#1a1d2e',
    sub:     '#6b7280',
    border:  'rgba(0,0,0,0.08)',
    glow:    'rgba(79,110,247,0.08)',
  },
}

// ── Accent colors ─────────────────────────────────────────────────────────────
export const ACCENTS = {
  indigo:  { label:'Indigo',  color:'#4f6ef7' },
  violet:  { label:'Violet',  color:'#8b5cf6' },
  sky:     { label:'Sky',     color:'#0ea5e9' },
  rose:    { label:'Rose',    color:'#f43f5e' },
  emerald: { label:'Emerald', color:'#10b981' },
  amber:   { label:'Amber',   color:'#f59e0b' },
  pink:    { label:'Pink',    color:'#ec4899' },
  orange:  { label:'Orange',  color:'#f97316' },
}

// ── Build the active C object from stored prefs ────────────────────────────────
export function buildTheme(themeKey = 'dark', accentKey = 'indigo') {
  const base   = THEMES[themeKey]   || THEMES.dark
  const accent = ACCENTS[accentKey] || ACCENTS.indigo
  return {
    ...base,
    accent:  accent.color,
    accentL: accent.color + 'cc',
    emerald: '#34d399',
    rose:    '#fb7185',
    amber:   '#fbbf24',
  }
}

// Default export for components that don't need dynamic themes
export let C = buildTheme()

// Call this whenever theme changes — updates C in place so all components re-read it
export function applyTheme(themeKey, accentKey) {
  const next = buildTheme(themeKey, accentKey)
  Object.assign(C, next)
}

export const AVATARS    = ['🦋','🔮','⚡','🌊','🎭','🦊','🐉','🌸','🎯','🦄','🌙','🔥','🐬','🦅','🎪','🌿','🎸','🏔','🦁','🐺']
export const AV_COLS    = ['#4f6ef7','#f472b6','#fbbf24','#34d399','#a78bfa','#fb923c','#60a5fa','#f87171','#4ade80','#e879f9','#facc15','#fb7185','#38bdf8','#a3e635','#fb923c','#34d399','#818cf8','#f97316','#22d3ee','#a3e635']
export const CHAN_ICONS  = ['✨','🌐','🎵','💻','🎮','🎨','📚','🔥','🚀','💡','🎯','🌿','🏔','🎸','🌙','🎬']

// Font size scale
export const FONT_SIZES = {
  small:  { label:'Small',  base:12, msg:13 },
  medium: { label:'Medium', base:14, msg:14 },
  large:  { label:'Large',  base:15, msg:16 },
}
