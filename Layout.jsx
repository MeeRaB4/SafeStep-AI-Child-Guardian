import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useGuardian } from '../context/GuardianContext';
import { useAuth, displayName } from '../context/AuthContext';
import PinModal from './PinModal';
import Toasts from './Toasts';
import { LogoMark } from './Logo';
import { timeAgo, formatMinutes } from '../data/mock';

const NAV = [
  { to: '/app', label: 'Dashboard', icon: '🏠', end: true },
  { to: '/app/activity', label: 'Live Activity', icon: '📡' },
  { to: '/app/alerts', label: 'Alerts & Review', icon: '🚨' },
  { to: '/app/assistant', label: 'AI Assistant', icon: '🤖' },
  { to: '/app/reports', label: 'Reports', icon: '📊' },
  { to: '/app/devices', label: 'Devices', icon: '📱' },
  { to: '/app/settings', label: 'Settings', icon: '⚙️' },
];

export default function Layout() {
  const { state, markNotificationsRead, clearNotifications } = useGuardian();
  const { user, signOut, cloudEnabled } = useAuth();
  const navigate = useNavigate();
  const [bellOpen, setBellOpen] = useState(false);

  if (state.loading || !state.child) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <LogoMark className="mx-auto h-14 w-14 animate-pulse" />
          <p className="mt-3 text-sm font-semibold text-slate-400">Loading your family data…</p>
        </div>
      </div>
    );
  }

  const parentName = displayName(user);
  const unread = state.notifications.filter((n) => !n.read).length;
  const pending = state.alerts.filter((a) => a.status === 'pending').length;
  const limit = state.settings.dailyLimitMinutes;
  const pct = Math.min(100, Math.round((state.screenTimeToday / limit) * 100));

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 flex w-60 flex-col border-r border-violet-100 bg-white/60 backdrop-blur-xl">
        <div className="flex items-center gap-2.5 px-5 py-5">
          <LogoMark className="h-10 w-10" />
          <div>
            <p className="text-base font-extrabold leading-tight text-slate-800">SafeStep</p>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-violet-400">
              AI Child Guardian
            </p>
          </div>
        </div>

        <nav className="mt-2 flex-1 space-y-1 px-3">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold transition ${
                  isActive
                    ? 'bg-violet-100 text-violet-600 shadow-sm shadow-violet-100'
                    : 'text-slate-500 hover:bg-violet-50 hover:text-violet-500'
                }`
              }
            >
              <span className="text-base">{item.icon}</span>
              <span className="flex-1">{item.label}</span>
              {item.to === '/app/alerts' && pending > 0 && (
                <span className="rounded-full bg-rose-400 px-1.5 py-0.5 text-[10px] font-bold text-white">
                  {pending}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="m-3 rounded-2xl bg-gradient-to-br from-violet-50 to-pink-50 p-3 ring-1 ring-inset ring-violet-100">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{state.child.avatar}</span>
            <div>
              <p className="text-sm font-bold text-slate-700">{state.child.name}</p>
              <p className="flex items-center gap-1 text-[11px] font-semibold text-emerald-500">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                Protection active
              </p>
            </div>
          </div>
          <div className="mt-3">
            <div className="mb-1 flex justify-between text-[10px] font-semibold text-slate-400">
              <span>Screen time today</span>
              <span>
                {formatMinutes(state.screenTimeToday)} / {formatMinutes(limit)}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-violet-100">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  pct >= 100 ? 'bg-rose-400' : pct >= 75 ? 'bg-amber-300' : 'bg-violet-300'
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        </div>
      </aside>

      {/* Main area */}
      <div className="ml-60 flex min-h-screen flex-1 flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-violet-100 bg-white/60 px-6 py-3 backdrop-blur-xl">
          {cloudEnabled ? (
            <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-emerald-600">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
              Live · synced
            </span>
          ) : (
            <span className="rounded-full bg-amber-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-amber-500">
              Backend not configured
            </span>
          )}
          <div className="flex-1" />
          <span className="hidden text-xs font-medium text-slate-400 sm:block">
            Protecting {state.child.name}, age {state.child.age}
          </span>
          <div className="relative">
            <button
              onClick={() => {
                setBellOpen((o) => !o);
                if (!bellOpen && unread > 0) setTimeout(markNotificationsRead, 1200);
              }}
              className="relative flex h-9 w-9 items-center justify-center rounded-full bg-violet-50 text-lg transition hover:bg-violet-100"
              aria-label="Notifications"
            >
              🔔
              {unread > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-400 px-1 text-[10px] font-bold text-white">
                  {unread}
                </span>
              )}
            </button>
            {bellOpen && (
              <div className="absolute right-0 mt-2 w-80 rounded-3xl border border-violet-100 bg-white/95 p-2 shadow-xl shadow-violet-100 backdrop-blur">
                <div className="flex items-center justify-between px-3 py-2">
                  <p className="text-xs font-bold uppercase tracking-wide text-violet-300">
                    Notifications
                  </p>
                  {state.notifications.length > 0 && (
                    <button
                      onClick={clearNotifications}
                      className="text-[11px] font-semibold text-rose-400 transition hover:text-rose-500"
                    >
                      Clear all
                    </button>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {state.notifications.length === 0 && (
                    <p className="px-3 py-4 text-sm text-slate-400">No notifications yet.</p>
                  )}
                  {state.notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`rounded-2xl px-3 py-2 text-sm ${
                        n.read ? 'text-slate-500' : 'bg-violet-50 font-medium text-slate-700'
                      }`}
                    >
                      <p className="leading-snug">{n.text}</p>
                      <p className="mt-0.5 text-[10px] text-slate-400">{timeAgo(n.ts)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          {/* Account */}
          <div className="flex items-center gap-2 rounded-full bg-violet-50 py-1 pl-1 pr-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-violet-300 to-pink-300 text-xs font-extrabold text-white">
              {parentName.charAt(0).toUpperCase()}
            </span>
            <span className="hidden max-w-24 truncate text-xs font-bold text-slate-600 md:block">
              {parentName}
            </span>
            <button
              onClick={() => {
                signOut();
                navigate('/');
              }}
              className="rounded-full px-2 py-1 text-[11px] font-bold text-violet-400 transition hover:bg-violet-100 hover:text-violet-600"
              title="Sign out"
            >
              Sign out
            </button>
          </div>
        </header>

        <main className="flex-1 p-6" onClick={() => bellOpen && setBellOpen(false)}>
          <Outlet />
        </main>
      </div>

      <PinModal />
      <Toasts />
    </div>
  );
}
