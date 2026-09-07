import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useGuardian } from '../context/GuardianContext';
import ActivityRow from '../components/ActivityRow';
import { formatMinutes, CATEGORY_META, timeAgo, startOfLocalDay } from '../data/mock';

const FUN_CATEGORIES = [
  { key: 'videos', icon: '🎬', label: 'Cartoon videos' },
  { key: 'games', icon: '🎮', label: 'Mini games' },
  { key: 'coloring', icon: '🎨', label: 'Coloring' },
  { key: 'learning', icon: '📚', label: 'Learning' },
];

function StatCard({ icon, label, value, sub, tone = 'indigo' }) {
  const tones = {
    indigo: 'bg-violet-100 text-violet-500',
    emerald: 'bg-emerald-50 text-emerald-500',
    red: 'bg-rose-100 text-rose-400',
    amber: 'bg-amber-50 text-amber-500',
    sky: 'bg-sky-50 text-sky-500',
  };
  return (
    <div className="rounded-3xl border border-white bg-white/80 p-4 shadow-lg shadow-violet-100/50 backdrop-blur">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl text-lg ${tones[tone]}`}>
          {icon}
        </div>
        <div>
          <p className="text-xs font-medium text-slate-400">{label}</p>
          <p className="text-lg font-extrabold text-slate-900">{value}</p>
        </div>
      </div>
      {sub && <p className="mt-2 text-[11px] text-slate-400">{sub}</p>}
    </div>
  );
}

export default function Dashboard() {
  const { state, extendTime, setFunZone } = useGuardian();

  // Memoize expensive computations so they only recalculate when their
  // dependencies change (activities, alerts, settings).
  const todayStart = startOfLocalDay();

  const today = useMemo(
    () => state.activities.filter((a) => a.ts >= todayStart),
    [state.activities, todayStart]
  );

  const appsUsed = useMemo(
    () => new Set(today.filter((a) => a.type === 'app').map((a) => a.title)).size,
    [today]
  );

  const sitesVisited = useMemo(
    () => new Set(today.filter((a) => a.type === 'website' || a.type === 'site').map((a) => a.url || a.title)).size,
    [today]
  );

  const blockedCount = useMemo(
    () => today.filter((a) => a.status === 'blocked' || a.status === 'awaiting').length,
    [today]
  );

  const pending = useMemo(
    () => state.alerts.filter((a) => a.status === 'pending'),
    [state.alerts]
  );

  const limit = state.settings.dailyLimitMinutes;
  const pct = Math.min(100, Math.round((state.screenTimeToday / limit) * 100));
  const funZone = state.settings.funZone || {};

  // Category split of today's activity
  const { catEntries, catTotal } = useMemo(() => {
    const counts = today.reduce((acc, a) => {
      acc[a.category] = (acc[a.category] || 0) + 1;
      return acc;
    }, {});
    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const total = entries.reduce((s, [, c]) => s + c, 0) || 1;
    return { catEntries: entries, catTotal: total };
  }, [today]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Good afternoon 👋</h1>
          <p className="text-sm text-slate-500">
            Here is what {state.child.name} has been up to online today.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={`${window.location.origin}/kid`}
            target="_blank"
            rel="noreferrer"
            className="rounded-2xl bg-violet-400 px-3 py-2 text-xs font-semibold text-white shadow-md shadow-violet-200 transition hover:bg-violet-500"
          >
            🧒 Open Kid Portal
          </a>
          <Link
            to="/app/devices"
            className="rounded-2xl border-2 border-violet-100 bg-white/80 px-3 py-2 text-xs font-semibold text-slate-500 shadow-sm transition hover:bg-violet-50 hover:text-violet-500"
          >
            🔗 Pair a child device
          </Link>
        </div>
      </div>

      {/* Pending alert banner */}
      {pending.length > 0 && (
        <Link
          to="/app/alerts"
          className="pulse-amber flex items-center gap-3 rounded-3xl border-2 border-amber-200 bg-amber-50/90 p-4 backdrop-blur transition hover:bg-amber-100/90"
        >
          <span className="text-2xl">🚨</span>
          <div className="flex-1">
            <p className="text-sm font-bold text-amber-900">
              {pending.length} blocked item{pending.length > 1 ? 's' : ''} awaiting your approval
            </p>
            <p className="text-xs text-amber-700">
              SafeStep AI paused unsafe content. Tap to review — PIN required.
            </p>
          </div>
          <span className="rounded-2xl bg-amber-300 px-3 py-1.5 text-xs font-bold text-amber-900 shadow-sm">
            Review now →
          </span>
        </Link>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          icon="⏱"
          label="Screen time today"
          value={formatMinutes(state.screenTimeToday)}
          sub={`${pct}% of the ${formatMinutes(limit)} daily limit`}
          tone={pct >= 100 ? 'red' : pct >= 75 ? 'amber' : 'indigo'}
        />
        <StatCard icon="📱" label="Apps used" value={appsUsed} sub="Across paired devices" tone="sky" />
        <StatCard icon="🌐" label="Websites visited" value={sitesVisited} sub="SafeSearch enforced" tone="emerald" />
        <StatCard
          icon="🚫"
          label="Blocked items"
          value={blockedCount}
          sub={`${pending.length} awaiting approval`}
          tone="red"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Live activity */}
        <div className="lg:col-span-2">
          <div className="rounded-3xl border border-white bg-white/80 p-5 shadow-lg shadow-violet-100/50 backdrop-blur">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                </span>
                Current activity
              </h2>
              <Link to="/app/activity" className="text-xs font-semibold text-violet-500 hover:underline">
                View all →
              </Link>
            </div>
            <div className="space-y-2">
              {today.length === 0 && (
                <div className="rounded-2xl border-2 border-dashed border-violet-200 p-6 text-center text-sm text-slate-400">
                  No activity yet today — the feed starts clean every day at midnight. Pair your
                  child's device on the{' '}
                  <Link to="/app/devices" className="font-semibold text-violet-500 hover:underline">
                    Devices page
                  </Link>{' '}
                  and searches, videos and apps will stream in here live.
                </div>
              )}
              {today.slice(0, 6).map((a) => (
                <div key={a.id} className="fade-up">
                  <ActivityRow activity={a} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Screen time gauge */}
          <div className="rounded-3xl border border-white bg-white/80 p-5 shadow-lg shadow-violet-100/50 backdrop-blur">
            <h2 className="text-sm font-bold text-slate-900">Daily screen-time limit</h2>
            <div className="mt-4 flex items-center justify-center">
              <div
                className="relative h-32 w-32 rounded-full"
                style={{
                  background: `conic-gradient(${
                    pct >= 100 ? '#fb7185' : pct >= 75 ? '#fbbf24' : '#a78bfa'
                  } ${pct * 3.6}deg, #e2e8f0 0deg)`,
                }}
              >
                <div className="absolute inset-2 flex flex-col items-center justify-center rounded-full bg-white">
                  <span className="text-xl font-extrabold text-slate-900">{pct}%</span>
                  <span className="text-[10px] text-slate-400">of daily limit</span>
                </div>
              </div>
            </div>
            <p className="mt-3 text-center text-xs text-slate-500">
              {state.screenTimeToday >= limit
                ? '⛔ Limit reached — devices paused for today.'
                : `${formatMinutes(limit - state.screenTimeToday)} remaining until bedtime cutoff at ${state.settings.bedtime}.`}
            </p>
            <button
              onClick={() => extendTime(15)}
              className="mt-3 w-full rounded-2xl border-2 border-violet-100 bg-white px-4 py-2 text-xs font-bold text-violet-500 transition hover:bg-violet-50"
            >
              ➕ Grant +15 min today
            </button>
          </div>

          {/* Category breakdown */}
          <div className="rounded-3xl border border-white bg-white/80 p-5 shadow-lg shadow-violet-100/50 backdrop-blur">
            <h2 className="mb-3 text-sm font-bold text-slate-900">Today by category</h2>
            {catEntries.length === 0 && (
              <p className="text-xs text-slate-400">Category breakdown appears once activity starts.</p>
            )}
            <div className="space-y-2.5">
              {catEntries.map(([cat, count]) => {
                const meta = CATEGORY_META[cat] || { label: cat, color: '#94a3b8' };
                const w = Math.round((count / catTotal) * 100);
                return (
                  <div key={cat}>
                    <div className="mb-1 flex justify-between text-xs">
                      <span className="font-medium text-slate-600">{meta.label}</span>
                      <span className="text-slate-400">{w}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-violet-50">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${w}%`, background: meta.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Fun Zone controls */}
          <div className="rounded-3xl border border-white bg-white/80 p-5 shadow-lg shadow-violet-100/50 backdrop-blur">
            <h2 className="text-sm font-bold text-slate-900">Fun Zone controls</h2>
            <p className="mt-0.5 text-xs text-slate-400">
              Curated videos, games, coloring and learning inside {state.child.name}'s portal.
            </p>
            <div className="mt-3 space-y-1">
              {FUN_CATEGORIES.map((c) => {
                const on = funZone[c.key] !== false;
                return (
                  <button
                    key={c.key}
                    onClick={() => setFunZone(c.key, !on)}
                    className="flex w-full items-center justify-between gap-3 rounded-xl px-2 py-1.5 transition hover:bg-violet-50"
                  >
                    <span className="text-xs font-semibold text-slate-600">
                      {c.icon} {c.label}
                    </span>
                    <span
                      className={`relative h-5 w-9 shrink-0 rounded-full transition ${
                        on ? 'bg-emerald-400' : 'bg-slate-200'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${
                          on ? 'left-[18px]' : 'left-0.5'
                        }`}
                      />
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Recent notifications */}
          <div className="rounded-3xl border border-white bg-white/80 p-5 shadow-lg shadow-violet-100/50 backdrop-blur">
            <h2 className="mb-3 text-sm font-bold text-slate-900">Recent alerts</h2>
            {state.notifications.length === 0 && (
              <p className="text-xs text-slate-400">Nothing yet — alerts land here the moment SafeStep blocks something.</p>
            )}
            <div className="space-y-2">
              {state.notifications.slice(0, 4).map((n) => (
                <p key={n.id} className="text-xs leading-relaxed text-slate-600">
                  {n.text}
                  <span className="ml-1 text-slate-400">· {timeAgo(n.ts)}</span>
                </p>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
