// ---------------------------------------------------------------------------
// Shared metadata + formatting helpers.
// (Activity data now lives in Supabase; the Kid portal generates it live.)
// ---------------------------------------------------------------------------

let counter = 0;
export const uid = (prefix = 'id') =>
  `${prefix}_${Date.now().toString(36)}_${(counter++).toString(36)}${Math.random()
    .toString(36)
    .slice(2, 6)}`;

export const TYPE_META = {
  website: { icon: '🌐', label: 'Website' },
  site: { icon: '🌐', label: 'Website' },
  search: { icon: '🔎', label: 'Search' },
  video: { icon: '🎬', label: 'Video' },
  app: { icon: '📱', label: 'App' },
  chat: { icon: '💬', label: 'Chat' },
};

export const CATEGORY_META = {
  education: { label: 'Education', color: '#6ee7b7' },
  entertainment: { label: 'Entertainment', color: '#a78bfa' },
  games: { label: 'Games', color: '#fcd34d' },
  social: { label: 'Social Media', color: '#f9a8d4' },
  video: { label: 'Video', color: '#7dd3fc' },
  gambling: { label: 'Gambling', color: '#fda4af' },
  violence: { label: 'Violence', color: '#fb7185' },
  adult: { label: 'Adult Content', color: '#fda4af' },
  scam: { label: 'Scam / Phishing', color: '#fdba74' },
  drugs: { label: 'Drugs', color: '#fda4af' },
  chat: { label: 'Chat / Strangers', color: '#c4b5fd' },
  general: { label: 'General', color: '#94a3b8' },
};

export function timeAgo(t) {
  const diff = Math.max(0, Date.now() - t);
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h ${m % 60 ? `${m % 60} m ` : ''}ago`;
  return `${Math.floor(h / 24)} d ago`;
}

// Local-day helpers — the dashboard/live feed show the current day only
// (00:00 → now); older days are archived date-wise in Reports.
export const localDayKey = (t = Date.now()) => {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;
};

export const startOfLocalDay = (t = Date.now()) => {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

export function formatMinutes(mins) {
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  if (h === 0) return `${m}m`;
  return `${h}h ${m.toString().padStart(2, '0')}m`;
}

export const STATUS_META = {
  safe: { label: 'Safe', cls: 'bg-emerald-50 text-emerald-600 ring-emerald-200', dot: 'bg-emerald-400' },
  monitored: { label: 'Monitored', cls: 'bg-sky-50 text-sky-600 ring-sky-200', dot: 'bg-sky-400' },
  blocked: { label: 'Blocked', cls: 'bg-rose-50 text-rose-500 ring-rose-200', dot: 'bg-rose-400' },
  awaiting: { label: 'Awaiting Approval', cls: 'bg-amber-50 text-amber-600 ring-amber-200', dot: 'bg-amber-400' },
};
