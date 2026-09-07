import React, { useState, useMemo } from 'react';
import { useGuardian } from '../context/GuardianContext';
import ActivityRow from '../components/ActivityRow';
import { STATUS_META, startOfLocalDay } from '../data/mock';

const TYPE_FILTERS = [
  { key: 'all', label: 'All types' },
  { key: 'website', label: '🌐 Websites' },
  { key: 'search', label: '🔎 Searches' },
  { key: 'video', label: '🎬 Videos' },
  { key: 'app', label: '📱 Apps' },
  { key: 'chat', label: '💬 Chats' },
];

export default function Activity() {
  const { state } = useGuardian();
  const [status, setStatus] = useState('all');
  const [type, setType] = useState('all');

  // Memoize filtering so it only reruns when activities or filters change.
  const todayStart = startOfLocalDay();

  const todays = useMemo(
    () => state.activities.filter((a) => a.ts >= todayStart),
    [state.activities, todayStart]
  );

  const filtered = useMemo(
    () => todays.filter((a) => {
      if (status !== 'all' && a.status !== status) return false;
      if (type !== 'all' && a.type !== type) return false;
      return true;
    }),
    [todays, status, type]
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Live Activity</h1>
          <p className="text-sm text-slate-500">
            Today only ({new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' })},
            00:00 → now) — earlier days are archived in{' '}
            <a href="/app/reports" className="font-semibold text-violet-500 hover:underline">
              Reports
            </a>
            .
          </p>
        </div>
        <span className="rounded-full bg-violet-50 px-3 py-1.5 text-xs font-bold text-violet-500 ring-1 ring-violet-200">
          {todays.length} event{todays.length === 1 ? '' : 's'} today
        </span>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(STATUS_META).map(([key, meta]) => (
            <button
              key={key}
              onClick={() => setStatus(status === key ? 'all' : key)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ring-1 transition ${
                status === key ? meta.cls + ' ring-2' : 'bg-white/80 text-slate-500 ring-violet-100 hover:bg-violet-50'
              }`}
            >
              {meta.label}
            </button>
          ))}
        </div>
        <span className="mx-1 hidden h-5 w-px bg-violet-200 sm:block" />
        <div className="flex flex-wrap gap-1.5">
          {TYPE_FILTERS.map((t) => (
            <button
              key={t.key}
              onClick={() => setType(t.key)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ring-1 transition ${
                type === t.key
                  ? 'bg-violet-400 text-white ring-violet-400 shadow-sm shadow-violet-200'
                  : 'bg-white/80 text-slate-500 ring-violet-100 hover:bg-violet-50'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="space-y-2">
        {filtered.length === 0 && (
          <div className="rounded-3xl border-2 border-dashed border-violet-200 bg-white/70 p-10 text-center text-sm text-slate-400 backdrop-blur">
            Nothing here yet for today — the feed clears itself at midnight and only shows fresh
            activity. Once your child uses the paired Kid Portal, their searches, videos and apps
            stream in here live.
          </div>
        )}
        {filtered.map((a) => (
          <div key={a.id} className="fade-up">
            <ActivityRow activity={a} />
          </div>
        ))}
      </div>
    </div>
  );
}
