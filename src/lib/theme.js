// ── Built-in themes ──────────────────────────────────────────────────────────
export const THEMES = {
  dark:     { label:'Dark',      bg:'#080a0f', rail:'#0d0f17', sidebar:'#0f1219', panel:'#121520', card:'#181b26', card2:'#1d2030', text:'#e4e8f5', sub:'#8b92b0', border:'rgba(255,255,255,0.07)' },
  midnight: { label:'Midnight',  bg:'#0a0a14', rail:'#0f0f1e', sidebar:'#12122a', panel:'#151530', card:'#1a1a38', card2:'#1f1f40', text:'#dde0ff', sub:'#7b7faa', border:'rgba(150,150,255,0.08)' },
  slate:    { label:'Slate',     bg:'#0d1117', rail:'#161b22', sidebar:'#1a2030', panel:'#1e2535', card:'#232d3f', card2:'#2a3548', text:'#cdd9e5', sub:'#7a8fa8', border:'rgba(255,255,255,0.06)' },
  forest:   { label:'Forest',    bg:'#090e0c', rail:'#0d1610', sidebar:'#101a13', panel:'#131f17', card:'#182519', card2:'#1e2c1f', text:'#d4e8d4', sub:'#6a8f6a', border:'rgba(100,200,100,0.07)' },
  mocha:    { label:'Mocha',     bg:'#12100e', rail:'#1a1612', sidebar:'#1f1a15', panel:'#252018', card:'#2e2720', card2:'#352e26', text:'#e8ddd0', sub:'#9a8878', border:'rgba(255,200,150,0.07)' },
  amoled:   { label:'AMOLED',    bg:'#000000', rail:'#050505', sidebar:'#080808', panel:'#0d0d0d', card:'#111111', card2:'#161616', text:'#ffffff', sub:'#888888', border:'rgba(255,255,255,0.05)' },
  rose:     { label:'Rose Dark', bg:'#12080f', rail:'#1a0d17', sidebar:'#1f1020', panel:'#261428', card:'#2f1a30', card2:'#381f38', text:'#f0d8e8', sub:'#9a7090', border:'rgba(255,100,200,0.08)' },
  ocean:    { label:'Ocean',     bg:'#07101a', rail:'#0c1825', sidebar:'#0e1e2e', panel:'#112436', card:'#162c42', card2:'#1b344d', text:'#c8dff0', sub:'#6a90b0', border:'rgba(100,200,255,0.07)' },
  light:    { label:'Light',     bg:'#f0f2f5', rail:'#e2e5ea', sidebar:'#e8eaef', panel:'#ffffff', card:'#f5f6f8', card2:'#ebedf0', text:'#1a1d2e', sub:'#6b7280', border:'rgba(0,0,0,0.08)' },
  paper:    { label:'Paper',     bg:'#f7f3ee', rail:'#ede8e0', sidebar:'#e8e2d8', panel:'#faf8f4', card:'#f0ece4', card2:'#e8e2d8', text:'#2c2416', sub:'#8a7a68', border:'rgba(0,0,0,0.06)' },
}

// ── Accent colors ─────────────────────────────────────────────────────────────
export const ACCENTS = {
  indigo:  { label:'Indigo',  color:'#4f6ef7' },
  violet:  { label:'Violet',  color:'#8b5cf6' },
  sky:     { label:'Sky',     color:'#0ea5e9' },
  cyan:    { label:'Cyan',    color:'#06b6d4' },
  emerald: { label:'Emerald', color:'#10b981' },
  lime:    { label:'Lime',    color:'#84cc16' },
  amber:   { label:'Amber',   color:'#f59e0b' },
  orange:  { label:'Orange',  color:'#f97316' },
  rose:    { label:'Rose',    color:'#f43f5e' },
  pink:    { label:'Pink',    color:'#ec4899' },
  red:     { label:'Red',     color:'#ef4444' },
  teal:    { label:'Teal',    color:'#14b8a6' },
}

// ── Border radius presets ─────────────────────────────────────────────────────
export const RADIUS = {
  sharp:    { label:'Sharp',    val:4  },
  default:  { label:'Default',  val:12 },
  round:    { label:'Round',    val:20 },
  pill:     { label:'Pill',     val:999 },
}

// ── Message bubble styles ─────────────────────────────────────────────────────
export const MSG_STYLES = {
  bubbles:  { label:'Bubbles',  desc:'Classic colored bubbles' },
  compact:  { label:'Compact',  desc:'IRC-style, no bubbles' },
  cozy:     { label:'Cozy',     desc:'Spaced with subtle backgrounds' },
}

// ── Build the active C object ─────────────────────────────────────────────────
export function buildTheme(themeKey='dark', accentKey='indigo', customAccent=null) {
  const base   = THEMES[themeKey]   || THEMES.dark
  const accent = customAccent || (ACCENTS[accentKey]?.color || ACCENTS.indigo.color)
  return {
    ...base,
    accent,
    accentL:  accent + 'cc',
    emerald: '#34d399',
    rose:    '#fb7185',
    amber:   '#fbbf24',
  }
}

export let C = buildTheme()

export function applyTheme(themeKey, accentKey, customAccent=null) {
  const next = buildTheme(themeKey, accentKey, customAccent)
  Object.assign(C, next)
}

export const AVATARS   = ['🦋','🔮','⚡','🌊','🎭','🦊','🐉','🌸','🎯','🦄','🌙','🔥','🐬','🦅','🎪','🌿','🎸','🏔','🦁','🐺']
export const AV_COLS   = ['#4f6ef7','#f472b6','#fbbf24','#34d399','#a78bfa','#fb923c','#60a5fa','#f87171','#4ade80','#e879f9','#facc15','#fb7185','#38bdf8','#a3e635','#fb923c','#34d399','#818cf8','#f97316','#22d3ee','#a3e635']
export const CHAN_ICONS = ['✨','🌐','🎵','💻','🎮','🎨','📚','🔥','🚀','💡','🎯','🌿','🏔','🎸','🌙','🎬']

export const FONT_SIZES = {
  small:  { label:'Small',  base:12, msg:13 },
  medium: { label:'Medium', base:14, msg:14 },
  large:  { label:'Large',  base:15, msg:16 },
}
