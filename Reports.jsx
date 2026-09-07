import React, { useMemo, useState } from 'react';
import { useGuardian } from '../context/GuardianContext';
import StatusBadge from '../components/StatusBadge';
import { formatMinutes, localDayKey } from '../data/mock';

const STACK_COLORS = {
  education: '#6ee7b7',
  entertainment: '#a78bfa',
  games: '#fcd34d',
  social: '#f9a8d4',
};

const APP_ICONS = {
  education: '📚',
  games: '🎮',
  entertainment: '🎬',
  social: '💬',
};

const dayStr = (d) => d.toISOString().slice(0, 10);
const DAY_LABEL = { 0: 'Sun', 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat' };

const DELETE_RANGES = [
  { key: 'yesterday', label: 'Yesterday' },
  { key: '7d', label: 'Last 7 Days' },
  { key: '30d', label: 'Last 30 Days' },
  { key: 'all', label: 'All History' },
];

const DAY = 86400000;

const windowFor = (key) => {
  const startToday = new Date();
  startToday.setHours(0, 0, 0, 0);
  if (key === 'yesterday') {
    return { fromTs: startToday.getTime() - DAY, toTs: startToday.getTime(), note: 'exactly yesterday' };
  }
  if (key === '7d' || key === '30d') {
    const days = key === '7d' ? 7 : 30;
    return {
      fromTs: startToday.getTime() - (days - 1) * DAY,
      toTs: Date.now(),
      note: `the last ${days} days (including today)`,
    };
  }
  return { fromTs: 0, toTs: Date.now(), note: 'every recorded day' };
};

function ConfirmDeleteModal({ target, counts, busy, onCancel, onConfirm }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-3xl border-2 border-rose-200 bg-white p-6 shadow-2xl fade-up">
        <p className="text-center text-4xl">🗑️</p>
        <h3 className="mt-2 text-center text-lg font-extrabold text-slate-900">
          Delete {target.label}?
        </h3>
        <p className="mt-2 text-center text-sm leading-relaxed text-slate-500">
          This permanently removes <span className="font-bold text-rose-500">{target.note}</span> —{' '}
          {counts.activities} activit{counts.activities === 1 ? 'y' : 'ies'}, {counts.alerts} alert
          {counts.alerts === 1 ? '' : 's'} and {counts.days} day{counts.days === 1 ? '' : 's'} of
          screen-time history.
        </p>
        <p className="mt-2 text-center text-xs text-slate-400">
          Deletions can't be undone. Today's dashboard keeps updating live afterwards.
        </p>
        <div className="mt-5 flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 rounded-2xl border-2 border-violet-100 px-4 py-2.5 text-sm font-bold text-slate-500 transition hover:bg-violet-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            className="flex-1 rounded-2xl bg-rose-400 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-rose-200 transition hover:bg-rose-500 disabled:opacity-40"
          >
            {busy ? 'Deleting…' : 'Delete permanently'}
          </button>
        </div>
      </div>
    </div>
  );
}

function classifyApp(name) {
  const n = (name || '').toLowerCase();
  if (n.includes('game')) return 'games';
  if (n.includes('learn') || n.includes('edu') || n.includes('read')) return 'education';
  if (n.includes('social') || n.includes('chat')) return 'social';
  return 'entertainment';
}

function WeeklyChart({ days }) {
  const max = Math.max(1, ...days.map((d) => d.minutes)) * 1.15;
  return (
    <div className="flex h-56 items-end gap-3">
      {days.map((d) => (
        <div key={d.day} className="group flex flex-1 flex-col items-center gap-1.5">
          <span className="text-xs font-bold text-slate-600 opacity-0 transition group-hover:opacity-100">
            {formatMinutes(d.minutes)}
          </span>
          <div
            className="flex w-full max-w-12 flex-col-reverse overflow-hidden rounded-lg transition group-hover:scale-x-105"
            style={{ height: `${(d.minutes / max) * 100}%`, minHeight: d.minutes > 0 ? 8 : 2 }}
          >
            {Object.entries(STACK_COLORS).map(([key, color]) =>
              d[key] > 0 ? (
                <div
                  key={key}
                  title={`${key}: ${formatMinutes(d[key])}`}
                  style={{ height: `${(d[key] / d.minutes) * 100}%`, background: color }}
                />
              ) : null
            )}
          </div>
          <span className="text-xs font-medium text-slate-400">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

const WORST = { awaiting: 3, blocked: 2, monitored: 1, safe: 0 };

export default function Reports() {
  const { state, deleteHistory } = useGuardian();
  const [range, setRange] = useState('weekly');
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const { days, topApps, topSites } = useMemo(() => {
    const dates = [];
    for (let i = 6; i >= 0; i--) dates.push(new Date(Date.now() - i * 86400000));

    const allDays = dates.map((date, i) => {
      const iso = dayStr(date);
      const rows = state.usage.filter((u) => u.day === iso);
      const entry = {
        day: iso,
        label: i === 6 ? 'Today' : DAY_LABEL[date.getDay()],
        minutes: Math.round(rows.reduce((s, u) => s + u.seconds, 0) / 60),
        education: 0,
        entertainment: 0,
        games: 0,
        social: 0,
      };
      rows.forEach((u) => {
        entry[classifyApp(u.app)] += u.seconds / 60;
      });
      ['education', 'entertainment', 'games', 'social'].forEach((k) => {
        entry[k] = Math.round(entry[k]);
      });
      return entry;
    });

    // Top apps: sum usage seconds per app over the last 7 days
    const appMap = new Map();
    state.usage.forEach((u) => {
      if (!dates.some((d) => dayStr(d) === u.day)) return;
      appMap.set(u.app, (appMap.get(u.app) || 0) + u.seconds);
    });
    const apps = [...appMap.entries()]
      .map(([name, seconds]) => ({
        name,
        minutes: Math.round(seconds / 60),
        cat: classifyApp(name),
      }))
      .sort((a, b) => b.minutes - a.minutes)
      .slice(0, 5);

    // Top sites: group website activities by domain/title
    const siteMap = new Map();
    state.activities
      .filter((a) => a.type === 'site' || a.type === 'website')
      .forEach((a) => {
        const key = a.title || a.url || 'unknown';
        const cur = siteMap.get(key) || { name: key, visits: 0, worst: 'safe' };
        cur.visits += 1;
        if ((WORST[a.status] ?? 0) > (WORST[cur.worst] ?? 0)) cur.worst = a.status;
        siteMap.set(key, cur);
      });
    const sites = [...siteMap.values()].sort((a, b) => b.visits - a.visits).slice(0, 8);

    return { days: allDays, topApps: apps, topSites: sites };
  }, [state.usage, state.activities]);

  const shown = range === 'daily' ? days.slice(-1) : days;
  const total = shown.reduce((s, d) => s + d.minutes, 0);
  const daysWithData = shown.filter((d) => d.minutes > 0).length;
  const avg = daysWithData ? Math.round(total / daysWithData) : 0;
  const withinLimit = shown.filter((d) => d.minutes <= state.settings.dailyLimitMinutes).length;
  const blocked = state.activities.filter((a) => a.status === 'blocked' || a.status === 'awaiting').length;
  const maxApp = topApps[0]?.minutes || 1;

  // History archived date-wise — each past day with its screen time,
  // activity count and blocked count (dashboard/live activity show today only).
  const historyDays = useMemo(() => {
    const map = new Map();
    state.activities.forEach((a) => {
      const k = localDayKey(a.ts);
      const e = map.get(k) || { activities: 0, blocked: 0 };
      e.activities += 1;
      if (a.status === 'blocked' || a.status === 'awaiting') e.blocked += 1;
      map.set(k, e);
    });
    state.usage.forEach((u) => {
      const e = map.get(u.day) || { activities: 0, blocked: 0 };
      e.minutes = (e.minutes || 0) + u.seconds / 60;
      map.set(u.day, e);
    });
    return [...map.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .slice(0, 14)
      .map(([day, e]) => ({
        day,
        activities: e.activities,
        blocked: e.blocked,
        minutes: Math.round(e.minutes || 0),
      }));
  }, [state.activities, state.usage]);

  const deleteCounts = useMemo(() => {
    if (!pendingDelete) return { activities: 0, alerts: 0, days: 0 };
    const { fromTs, toTs } = windowFor(pendingDelete.key);
    const inRange = (t) => t >= fromTs && t < toTs;
    const fromDay = new Date(fromTs).toISOString().slice(0, 10);
    const toDay = new Date(toTs).toISOString().slice(0, 10);
    return {
      activities: state.activities.filter((a) => inRange(a.ts)).length,
      alerts: state.alerts.filter((a) => inRange(a.ts)).length,
      days: new Set(
        state.usage.filter((u) => u.day >= fromDay && u.day <= toDay).map((u) => u.day)
      ).size,
    };
  }, [pendingDelete, state.activities, state.alerts, state.usage]);

  const confirmDelete = async () => {
    if (!pendingDelete || deleting) return;
    setDeleting(true);
    const res = await deleteHistory(pendingDelete.key);
    setDeleting(false);
    if (res.ok) setPendingDelete(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Reports</h1>
          <p className="text-sm text-slate-500">Screen-time and online-behavior insights for {state.child.name}.</p>
        </div>
        <div className="flex rounded-2xl border border-violet-100 bg-white/80 p-1 shadow-md shadow-violet-100/50 backdrop-blur">
          {['daily', 'weekly'].map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`rounded-xl px-4 py-1.5 text-sm font-semibold capitalize transition ${
                range === r ? 'bg-violet-400 text-white shadow-md shadow-violet-200' : 'text-slate-500 hover:text-violet-500'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-3xl border border-white bg-white/80 p-4 shadow-lg shadow-violet-100/50 backdrop-blur">
          <p className="text-xs font-medium text-slate-400">Total screen time</p>
          <p className="mt-1 text-xl font-extrabold text-slate-900">{formatMinutes(total)}</p>
        </div>
        <div className="rounded-3xl border border-white bg-white/80 p-4 shadow-lg shadow-violet-100/50 backdrop-blur">
          <p className="text-xs font-medium text-slate-400">Daily average</p>
          <p className="mt-1 text-xl font-extrabold text-slate-900">{formatMinutes(avg)}</p>
        </div>
        <div className="rounded-3xl border border-white bg-white/80 p-4 shadow-lg shadow-violet-100/50 backdrop-blur">
          <p className="text-xs font-medium text-slate-400">Limit compliance</p>
          <p className="mt-1 text-xl font-extrabold text-emerald-600">
            {daysWithData === 0 ? 'No data yet' : `${withinLimit}/${daysWithData} days within limit`}
          </p>
        </div>
        <div className="rounded-3xl border border-white bg-white/80 p-4 shadow-lg shadow-violet-100/50 backdrop-blur">
          <p className="text-xs font-medium text-slate-400">Threats stopped</p>
          <p className="mt-1 text-xl font-extrabold text-rose-400">{blocked}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Chart */}
        <div className="rounded-3xl border border-white bg-white/80 p-5 shadow-lg shadow-violet-100/50 backdrop-blur lg:col-span-2">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-slate-900">
              Screen time {range === 'daily' ? 'today by category' : 'this week'}
            </h2>
            <div className="flex flex-wrap gap-3">
              {Object.entries(STACK_COLORS).map(([key, color]) => (
                <span key={key} className="flex items-center gap-1 text-[11px] font-medium capitalize text-slate-500">
                  <span className="h-2 w-2 rounded-full" style={{ background: color }} />
                  {key}
                </span>
              ))}
            </div>
          </div>
          {total === 0 ? (
            <div className="flex h-56 items-center justify-center rounded-2xl border-2 border-dashed border-violet-100 text-sm text-slate-400">
              No screen time recorded yet — usage appears here once the Kid Portal is in use.
            </div>
          ) : (
            <WeeklyChart days={shown} />
          )}
        </div>

        {/* Top apps */}
        <div className="rounded-3xl border border-white bg-white/80 p-5 shadow-lg shadow-violet-100/50 backdrop-blur">
          <h2 className="mb-3 text-sm font-bold text-slate-900">Top apps this week</h2>
          {topApps.length === 0 ? (
            <p className="text-xs text-slate-400">
              App usage is tracked while your child plays in the Kid Portal.
            </p>
          ) : (
            <div className="space-y-3">
              {topApps.map((app) => (
                <div key={app.name} className="flex items-center gap-3">
                  <span className="text-lg">{APP_ICONS[app.cat]}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between text-xs">
                      <span className="truncate font-semibold text-slate-700">{app.name}</span>
                      <span className="text-slate-400">{formatMinutes(app.minutes)}</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-violet-50">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${(app.minutes / maxApp) * 100}%`, background: STACK_COLORS[app.cat] }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Top sites */}
      <div className="rounded-3xl border border-white bg-white/80 p-5 shadow-lg shadow-violet-100/50 backdrop-blur">
        <h2 className="mb-3 text-sm font-bold text-slate-900">Most visited websites</h2>
        {topSites.length === 0 ? (
          <p className="text-xs text-slate-400">Websites your child opens in the Kid Portal will be listed here.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-violet-100 text-xs uppercase tracking-wide text-slate-400">
                  <th className="py-2 pr-4 font-semibold">Website</th>
                  <th className="py-2 pr-4 font-semibold">Visits</th>
                  <th className="py-2 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {topSites.map((s) => (
                  <tr key={s.name} className="border-b border-violet-50 last:border-0">
                    <td className="max-w-60 truncate py-2.5 pr-4 font-medium text-slate-700">{s.name}</td>
                    <td className="py-2.5 pr-4 text-slate-500">{s.visits}</td>
                    <td className="py-2.5">
                      <StatusBadge status={s.worst} size="xs" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* History by date */}
      <div className="rounded-3xl border border-white bg-white/80 p-5 shadow-lg shadow-violet-100/50 backdrop-blur">
        <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-slate-900">History by date</h2>
          <span className="text-[11px] font-semibold text-violet-400">
            Archived daily at midnight · dashboard shows today only
          </span>
        </div>
        {historyDays.length === 0 ? (
          <p className="mt-2 text-xs text-slate-400">
            Each day rolls over into this archive at midnight — screen time, activities and blocked
            counts, organized date-wise.
          </p>
        ) : (
          <div className="mt-2 divide-y divide-violet-50">
            {historyDays.map((d) => (
              <div key={d.day} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="rounded-xl bg-violet-50 px-2 py-1 text-xs font-extrabold text-violet-500">
                    📅 {new Date(`${d.day}T00:00:00`).toLocaleDateString(undefined, {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                  {d.day === localDayKey() && (
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
                      TODAY · LIVE
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <span className="font-bold text-slate-700">{formatMinutes(d.minutes)}</span>
                  <span>{d.activities} activit{d.activities === 1 ? 'y' : 'ies'}</span>
                  <span className={d.blocked > 0 ? 'font-bold text-rose-400' : ''}>
                    {d.blocked} blocked
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* History controls */}
      <div className="rounded-3xl border-2 border-rose-100 bg-rose-50/40 p-5 backdrop-blur">
        <h2 className="text-sm font-bold uppercase tracking-wide text-rose-400">History controls</h2>
        <p className="mb-3 mt-1 text-xs text-slate-500">
          Delete archived history for {state.child.name}. Pairing codes and settings are kept — only
          recorded activity, alerts and usage are removed.
        </p>
        <div className="flex flex-wrap gap-2">
          {DELETE_RANGES.map((r) => (
            <button
              key={r.key}
              onClick={() => setPendingDelete({ ...r, ...windowFor(r.key) })}
              className="rounded-2xl border border-rose-200 bg-white px-4 py-2 text-xs font-semibold text-rose-500 transition hover:bg-rose-100"
            >
              🗑 Delete {r.label}
            </button>
          ))}
        </div>
      </div>

      {pendingDelete && (
        <ConfirmDeleteModal
          target={pendingDelete}
          counts={deleteCounts}
          busy={deleting}
          onCancel={() => setPendingDelete(null)}
          onConfirm={confirmDelete}
        />
      )}
    </div>
  );
}
