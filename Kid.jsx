import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase, cloudEnabled } from '../lib/supabase';
import { checkContent, SAFE_APPS, SAFE_VIDEOS, domainOf, childReasonFor } from '../lib/filter';
import { GamesHub, MusicHub, LearnHub, FunZoneHub } from '../components/KidApps';
import { LogoMark } from '../components/Logo';
import { formatMinutes } from '../data/mock';

const KID_SESSION_KEY = 'safestep-kid-session-v1';
const KID_AWAY_FLAG = 'safestep-kid-away';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Fire an RPC that survives the tab being closed/hidden. Uses a keepalive
// fetch (default credentials mode passes Supabase CORS; sendBeacon is blocked
// because it forces credentials 'include' against a wildcard CORS origin).
function beaconRpc(fn, args) {
  try {
    fetch(`${supabaseUrl}/rest/v1/rpc/${fn}`, {
      method: 'POST',
      keepalive: true,
      headers: { 'Content-Type': 'application/json', apikey: supabaseKey },
      body: JSON.stringify(args),
    }).catch(() => {});
  } catch {
    /* best effort */
  }
}

function loadSession() {
  try {
    return JSON.parse(localStorage.getItem(KID_SESSION_KEY));
  } catch {
    return null;
  }
}

function saveSession(s) {
  localStorage.setItem(KID_SESSION_KEY, JSON.stringify(s));
}

export default function Kid() {
  const [params] = useSearchParams();
  const [session, setSession] = useState(loadSession);

  if (!cloudEnabled) {
    return (
      <Shell>
        <div className="mx-auto max-w-md rounded-3xl border border-white bg-white/80 p-8 text-center shadow-lg shadow-violet-100/50 backdrop-blur">
          <p className="text-3xl">🔌</p>
          <h1 className="mt-2 text-lg font-extrabold text-slate-900">SafeStep Kids</h1>
          <p className="mt-2 text-sm text-slate-500">
            The cloud backend is not configured on this installation. Add the Supabase environment
            variables to enable device pairing.
          </p>
        </div>
      </Shell>
    );
  }

  if (!session) return <PairScreen codeParam={params.get('code')} onPaired={(s) => { saveSession(s); setSession(s); }} />;
  return <KidHome session={session} onUnpair={() => { localStorage.removeItem(KID_SESSION_KEY); setSession(null); }} />;
}

function Shell({ children }) {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute -top-24 -left-24 h-96 w-96 rounded-full bg-pink-200/50 blur-3xl" />
      <div className="pointer-events-none absolute top-1/3 -right-24 h-96 w-96 rounded-full bg-sky-200/50 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 left-1/3 h-96 w-96 rounded-full bg-violet-200/50 blur-3xl" />
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center p-6">
        {children}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pairing screen
// ---------------------------------------------------------------------------

function PairScreen({ codeParam, onPaired }) {
  const [code, setCode] = useState(codeParam || '');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(Boolean(codeParam));

  const pair = async (value) => {
    setBusy(true);
    setError(null);
    const { data, error: rpcErr } = await supabase.rpc('kid_pair', { pair_code: value.trim() });
    setBusy(false);
    if (rpcErr || !data?.ok) {
      setError(rpcErr?.message || data?.error || 'Could not pair. Check the code and try again.');
      return;
    }
    onPaired({
      token: data.device_token,
      child: data.child,
      settings: data.settings,
      usedMin: Number(data.used_min) || 0,
      limitMin: Number(data.limit_min) || 120,
    });
  };

  useEffect(() => {
    if (codeParam) pair(codeParam);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Shell>
      <div className="w-full max-w-md rounded-3xl border border-white bg-white/80 p-8 text-center shadow-lg shadow-violet-100/50 backdrop-blur">
        <div className="flex justify-center"><LogoMark className="h-16 w-16" /></div>
        <h1 className="mt-3 text-2xl font-extrabold text-slate-900">SafeStep Kids</h1>
        <p className="mt-1 text-sm text-slate-500">
          Hi! 👋 This is your safe corner of the internet. Ask a grown-up for the pairing code.
        </p>
        <form
          onSubmit={(e) => { e.preventDefault(); pair(code); }}
          className="mt-6 space-y-3"
        >
          <input
            value={code}
            onChange={(e) => { setCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setError(null); }}
            inputMode="numeric"
            placeholder="6-digit code"
            className="w-full rounded-2xl border-2 border-violet-100 bg-white/90 px-4 py-3 text-center font-mono text-2xl tracking-[0.4em] text-violet-500 outline-none focus:border-violet-300"
          />
          {error && <p className="text-xs font-semibold text-rose-500">{error}</p>}
          <button
            type="submit"
            disabled={code.length !== 6 || busy}
            className="w-full rounded-2xl bg-violet-400 px-6 py-3 text-sm font-bold text-white shadow-md shadow-violet-200 transition hover:bg-violet-500 disabled:opacity-40"
          >
            {busy ? 'Pairing…' : 'Start exploring 🚀'}
          </button>
        </form>
      </div>
    </Shell>
  );
}

// ---------------------------------------------------------------------------
// Kid home
// ---------------------------------------------------------------------------

function KidHome({ session, onUnpair }) {
  const [child, setChild] = useState(session.child);
  const [settings, setSettings] = useState(session.settings);
  const [usedMin, setUsedMin] = useState(session.usedMin || 0);
  const [limitMin, setLimitMin] = useState(session.limitMin || 120);
  const [locked, setLocked] = useState(false);
  const [paused, setPaused] = useState(() => session.settings?.portal_active === false);
  const [viewer, setViewer] = useState(null);   // {kind, ...}
  const [blocked, setBlocked] = useState(null); // {activityId, title, url, category, reason, decision}
  const [currentApp, setCurrentApp] = useState(null);
  const [link, setLink] = useState('');
  const [clock, setClock] = useState('');
  const [removeOpen, setRemoveOpen] = useState(false);
  const [removePin, setRemovePin] = useState('');
  const [removeMsg, setRemoveMsg] = useState(null);
  const [removeBusy, setRemoveBusy] = useState(false);

  const blockedRef = useRef(blocked);
  blockedRef.current = blocked;
  const viewerRef = useRef(viewer);
  viewerRef.current = viewer;

  // Returned to the portal after leaving (flag set on the hidden side)
  useEffect(() => {
    if (localStorage.getItem(KID_AWAY_FLAG)) {
      localStorage.removeItem(KID_AWAY_FLAG);
      supabase.rpc('kid_event', {
        token: session.token,
        payload: { kind: 'app', title: 'Came back to the SafeStep portal', category: 'general', status: 'safe' },
      }).then(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the stored session fresh (child profile, settings, limits) so a
  // reload — or the next visit — shows the latest info the parent saved.
  useEffect(() => {
    saveSession({ ...session, child, settings, usedMin, limitMin });
  }, [session, child, settings, usedMin, limitMin]);

  // Clock
  useEffect(() => {
    const tick = () =>
      setClock(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    tick();
    const id = setInterval(tick, 10000);
    return () => clearInterval(id);
  }, []);

  const applyDecision = (activityId, decision) => {
    const b = blockedRef.current;
    if (!b || b.activityId !== activityId) return;
    if (decision === 'approved') {
      setBlocked(null);
      setViewer({ kind: 'site', title: b.title, url: b.url || '', note: '✅ Approved by your grown-up!' });
    } else {
      setBlocked({ ...b, decision: 'denied' });
    }
  };
  const applyDecisionRef = useRef(applyDecision);
  applyDecisionRef.current = applyDecision;

  // Live unlock broadcast + poll fallback + heartbeat
  useEffect(() => {
    const chan = supabase
      .channel(`device-${session.token}`)
      .on('broadcast', { event: 'decision' }, ({ payload }) =>
        applyDecisionRef.current(payload.activity_id, payload.decision)
      )
      .on('broadcast', { event: 'child' }, ({ payload }) => {
        // The parent saved a new child profile — apply it instantly
        if (payload?.name) setChild((c) => ({ ...c, name: payload.name, age: payload.age ?? c.age }));
      })
      .on('broadcast', { event: 'portal' }, ({ payload }) => {
        // Portal activate/deactivate from the parent dashboard
        setPaused(payload?.active === false);
      })
      .on('broadcast', { event: 'funzone' }, ({ payload }) => {
        if (payload?.funZone) setSettings((s) => ({ ...s, fun_zone: payload.funZone }));
      })
      .on('broadcast', { event: 'whitelist' }, ({ payload }) => {
        if (payload?.whitelist) setSettings((s) => ({ ...s, whitelist: payload.whitelist }));
      })
      .subscribe();

    const poll = setInterval(async () => {
      const { data } = await supabase.rpc('kid_poll', { token: session.token });
      if (!data?.ok) return;
      if (data.child?.name) setChild(data.child);
      setSettings(data.settings);
      setLimitMin(Number(data.limit_min) || 120);
      setUsedMin(Number(data.used_min) || 0);
      setLocked(Boolean(data.locked));
      setPaused(data.settings?.portal_active === false);
      (data.decisions || []).forEach((d) => {
        if (d.status !== 'awaiting') applyDecisionRef.current(d.activity_id, d.approved ? 'approved' : 'denied');
      });
    }, 8000);

    const beat = setInterval(async () => {
      if (document.visibilityState !== 'visible') return;
      const { data } = await supabase.rpc('kid_heartbeat', {
        token: session.token,
        secs: 30,
        app: currentAppRef.current || 'Portal',
      });
      if (!data?.ok) return;
      setPaused(Boolean(data.paused));
      if (data.paused) return;
      setUsedMin(Number(data.used_min) || 0);
      setLimitMin(Number(data.limit_min) || 120);
      setLocked(Boolean(data.locked));
    }, 30000);

    // Portal-leave detection: log when the child switches away and when they
    // come back. Uses sendBeacon-style keepalive because normal requests are
    // cancelled when the tab hides.
    const onVis = () => {
      if (document.visibilityState === 'hidden' && !awayRef.current) {
        awayRef.current = true;
        localStorage.setItem(KID_AWAY_FLAG, '1');
        const when = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        beaconRpc('kid_event', {
          token: session.token,
          payload: { kind: 'app', title: 'Left the SafeStep portal (switched app/tab)', category: 'general', status: 'monitored' },
        });
        beaconRpc('kid_notice', {
          token: session.token,
          message: `👀 ${childRef.current.name} left the SafeStep portal at ${when} (opened another app or tab).`,
        });
      } else if (document.visibilityState === 'visible' && awayRef.current) {
        awayRef.current = false;
        localStorage.removeItem(KID_AWAY_FLAG);
        supabase.rpc('kid_event', {
          token: session.token,
          payload: { kind: 'app', title: 'Came back to the SafeStep portal', category: 'general', status: 'safe' },
        }).then(() => {});
      }
    };
    document.addEventListener('visibilitychange', onVis);

    return () => {
      supabase.removeChannel(chan);
      clearInterval(poll);
      clearInterval(beat);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [session.token]);

  const awayRef = useRef(false);
  const childRef = useRef(child);
  childRef.current = child;

  const currentAppRef = useRef(null);
  const openApp = (app) => {
    setCurrentApp(app.name);
    currentAppRef.current = app.name;
    logEvent({
      kind: 'app',
      title: `${app.name} – opened`,
      category: app.id === 'learn' ? 'education' : app.id === 'games' ? 'games' : 'entertainment',
      status: 'safe',
    });
    setViewer({ kind: 'app', app });
  };

  const logEvent = (payload) =>
    supabase.rpc('kid_event', { token: session.token, payload }).then(({ data, error }) => {
      if (error) console.error('SafeStep: could not record activity:', error.message);
      return { data, error };
    });

  const runCheck = (args) =>
    checkContent({
      ...args,
      age: child.age,
      blockedCategories: settings.blocked_categories || [],
      autoBlock: settings.auto_block,
      whitelist: settings.whitelist || [],
    });

  const doLink = (e) => {
    e.preventDefault();
    const url = link.trim();
    if (!url || locked) return;
    setLink('');
    const res = runCheck({ type: 'site', text: url, url });
    if (res.flagged && res.status === 'awaiting') {
      logEvent({
        kind: 'site', title: domainOf(url), url, category: res.category,
        status: 'awaiting', severity: res.severity, reason: res.reason,
      }).then(({ data }) => {
        setBlocked({ activityId: data?.activity_id, title: domainOf(url), url, category: res.category, reason: res.reason });
      });
      return;
    }
    logEvent({ kind: 'site', title: domainOf(url), url, category: res.category, status: res.status });
    setViewer({
      kind: 'site',
      title: domainOf(url),
      url,
      monitored: res.status === 'monitored',
      whitelisted: res.whitelisted,
    });
  };

  const openVideo = (v) => {
    logEvent({ kind: 'video', title: v.title, url: `youtube.com/watch?v=${v.id}`, category: 'video', status: 'safe' });
    setViewer({ kind: 'video', video: v });
  };

  const pct = Math.min(100, Math.round((usedMin / Math.max(1, limitMin)) * 100));
  const remaining = Math.max(0, limitMin - usedMin);

  // Remove-guard: only a parent with the PIN can take SafeStep off this device
  const tryRemove = async (e) => {
    e.preventDefault();
    if (removeBusy) return;
    setRemoveBusy(true);
    setRemoveMsg(null);
    const { data } = await supabase.rpc('kid_check_pin', { token: session.token, pin: removePin });
    setRemoveBusy(false);
    if (data?.ok) {
      await logEvent({ kind: 'app', title: 'SafeStep removed from this device (parent PIN verified)', category: 'general', status: 'monitored' });
      onUnpair();
      return;
    }
    setRemovePin('');
    setRemoveMsg('That PIN is not right. Your parents have been told. 📣');
    await supabase.rpc('kid_notice', {
      token: session.token,
      message: `⚠️ Someone tried to remove SafeStep from ${child.name}'s device without the parent PIN.`,
    });
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute -top-24 -left-24 h-96 w-96 rounded-full bg-pink-200/50 blur-3xl" />
      <div className="pointer-events-none absolute top-1/3 -right-24 h-96 w-96 rounded-full bg-sky-200/50 blur-3xl" />

      <div className="relative z-10 mx-auto max-w-3xl space-y-5 p-5">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-white bg-white/80 p-4 shadow-lg shadow-violet-100/50 backdrop-blur">
          <div className="flex items-center gap-3">
            <LogoMark className="h-10 w-10" />
            <div>
              <p className="text-sm font-extrabold text-slate-900">Hi, {child.name}! 🌈</p>
              <p className="text-[11px] text-slate-400">Your safe internet · {clock}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs font-bold text-violet-500">{formatMinutes(remaining)} left</p>
              <div className="mt-1 h-1.5 w-28 overflow-hidden rounded-full bg-violet-50">
                <div
                  className={`h-full rounded-full ${pct >= 100 ? 'bg-rose-400' : pct >= 75 ? 'bg-amber-300' : 'bg-emerald-400'}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
            <button onClick={() => { setRemoveOpen(true); setRemoveMsg(null); setRemovePin(''); }} className="text-[11px] font-semibold text-slate-400 hover:text-slate-600" title="Remove SafeStep (parent PIN required)">
              🔒
            </button>
          </div>
        </div>

        {locked ? (
          <div className="rounded-3xl border border-white bg-white/80 p-10 text-center shadow-lg shadow-violet-100/50 backdrop-blur">
            <p className="text-5xl">🌙</p>
            <h2 className="mt-3 text-xl font-extrabold text-slate-900">Time's up for today!</h2>
            <p className="mt-2 text-sm text-slate-500">
              You used all {formatMinutes(limitMin)} of your screen time. Great job today — see you tomorrow! 💜
            </p>
          </div>
        ) : (
          <>
            {/* Apps */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {SAFE_APPS.map((app) => (
                <button
                  key={app.id}
                  onClick={() => openApp(app)}
                  className="rounded-3xl border border-white bg-white/80 p-4 text-center shadow-lg shadow-violet-100/50 backdrop-blur transition hover:-translate-y-0.5 hover:bg-white"
                >
                  <span className="text-3xl">{app.icon}</span>
                  <p className="mt-1.5 text-xs font-bold text-slate-700">{app.name}</p>
                </button>
              ))}
            </div>

            {/* Open a link */}
            <form onSubmit={doLink} className="flex gap-2">
              <input
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="🌐 Paste a website link to open it safely…"
                className="flex-1 rounded-2xl border-2 border-violet-100 bg-white/90 px-4 py-3 text-sm outline-none focus:border-violet-300"
              />
              <button type="submit" className="rounded-2xl bg-sky-400 px-5 py-3 text-sm font-bold text-white shadow-md shadow-sky-200 hover:bg-sky-500">
                Open
              </button>
            </form>

            <p className="text-center text-[11px] text-slate-400">
              Everything you do here is shared with your parent so they can keep you safe. 💜
            </p>
          </>
        )}
      </div>

      {/* Viewer overlay */}
      {viewer && !locked && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-3xl border border-white bg-white p-5 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-bold text-slate-800">
                {viewer.kind === 'video' && `🎬 ${viewer.video.title}`}
                {viewer.kind === 'app' && `${viewer.app.icon} ${viewer.app.name}`}
                {viewer.kind === 'site' && `🌐 ${viewer.title}`}
              </p>
              <button
                onClick={() => { setViewer(null); setCurrentApp(null); currentAppRef.current = null; }}
                className="rounded-xl bg-violet-50 px-3 py-1.5 text-xs font-bold text-violet-500 hover:bg-violet-100"
              >
                Close ✕
              </button>
            </div>

            {viewer.note && <p className="mb-3 rounded-2xl bg-emerald-50 p-2.5 text-xs font-semibold text-emerald-700">{viewer.note}</p>}
            {viewer.whitelisted && (
              <p className="mb-3 rounded-2xl bg-emerald-50 p-2.5 text-xs font-semibold text-emerald-700">
                ✅ Your grown-up said this site is always okay!
              </p>
            )}
            {viewer.monitored && (
              <p className="mb-3 rounded-2xl bg-sky-50 p-2.5 text-xs font-semibold text-sky-600">
                👀 Your parent can see this activity — that's how SafeStep keeps you safe.
              </p>
            )}

            {viewer.kind === 'video' && (
              <div className="aspect-video overflow-hidden rounded-2xl bg-slate-900">
                <iframe
                  className="h-full w-full"
                  src={`https://www.youtube-nocookie.com/embed/${viewer.video.id}`}
                  title={viewer.video.title}
                  allow="autoplay; encrypted-media; picture-in-picture"
                  allowFullScreen
                />
              </div>
            )}

            {viewer.kind === 'app' && viewer.app.id === 'ytkids' && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {SAFE_VIDEOS.map((v) => (
                  <button key={v.id} onClick={() => openVideo(v)} className="rounded-2xl border border-violet-100 bg-violet-50/60 p-3 text-left transition hover:bg-violet-100">
                    <span className="text-2xl"></span>
                    <p className="mt-1 text-xs font-bold text-slate-700">{v.title}</p>
                  </button>
                ))}
              </div>
            )}
            {viewer.kind === 'app' && viewer.app.id === 'funzone' && (
              <FunZoneHub
                enabled={settings.fun_zone}
                onEvent={(t) => logEvent({ kind: 'app', title: `Fun Zone: ${t}`, category: 'games', status: 'safe' })}
                onVideo={openVideo}
              />
            )}
            {viewer.kind === 'app' && viewer.app.id === 'games' && (
              <GamesHub onEvent={(t) => logEvent({ kind: 'app', title: `Games: ${t}`, category: 'games', status: 'safe' })} />
            )}
            {viewer.kind === 'app' && viewer.app.id === 'music' && (
              <MusicHub onEvent={(t) => logEvent({ kind: 'app', title: `Music: ${t}`, category: 'entertainment', status: 'safe' })} />
            )}
            {viewer.kind === 'app' && viewer.app.id === 'learn' && (
              <LearnHub
                onEvent={(t) => logEvent({ kind: 'app', title: `Learning: ${t}`, category: 'education', status: 'safe' })}
                onVideo={openVideo}
              />
            )}

            {viewer.kind === 'site' && (
              <div className="rounded-2xl border border-violet-100 bg-violet-50/60 p-6 text-center">
                <p className="text-4xl">🌐</p>
                <p className="mt-2 text-sm font-bold text-slate-800">{viewer.title}</p>
                <p className="mt-1 text-xs text-slate-500">
                  Logged as a safe visit. Some websites don't allow showing inside SafeStep, so your
                  grown-up can see the visit in their dashboard instead.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Blocked overlay — friendly, age-appropriate AI reason for the child */}
      {blocked && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border-2 border-rose-200 bg-white p-7 text-center shadow-2xl">
            <p className="text-5xl">{blocked.decision === 'denied' ? '⛔' : '🛡️'}</p>
            <h2 className="mt-3 text-lg font-extrabold text-slate-900">
              {blocked.decision === 'denied' ? 'Your grown-up said no' : 'Hold on a second!'}
            </h2>
            <p className="mt-1 text-sm font-semibold text-slate-700">{blocked.title}</p>
            <p className="mt-2 rounded-2xl bg-rose-50 p-3 text-xs leading-relaxed text-rose-500">
              {childReasonFor(blocked.category)}
            </p>
            {blocked.decision !== 'denied' ? (
              <p className="mt-3 text-xs text-slate-500">
                ⏳ We asked your grown-up to approve it. You can wait here — it will open automatically
                if they say yes.
              </p>
            ) : (
              <p className="mt-3 text-xs text-slate-500">That's okay — there's lots more fun stuff to explore! 💜</p>
            )}
            <button
              onClick={() => setBlocked(null)}
              className="mt-4 rounded-2xl bg-violet-400 px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-violet-200 hover:bg-violet-500"
            >
              {blocked.decision === 'denied' ? 'Back to my safe space' : 'Go back'}
            </button>
          </div>
        </div>
      )}

      {/* Paused overlay — the parent deactivated the live data stream */}
      {paused && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl border border-white bg-white p-8 text-center shadow-2xl">
            <p className="text-5xl">⏸️</p>
            <h2 className="mt-3 text-lg font-extrabold text-slate-900">SafeStep is taking a break</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">
              Your grown-up paused the portal for now. It wakes up all by itself when they turn it
              back on — no need to touch anything! 💜
            </p>
            <p className="mt-4 flex items-center justify-center gap-2 text-xs font-semibold text-violet-400">
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-violet-200 border-t-violet-400" />
              Checking every few seconds…
            </p>
          </div>
        </div>
      )}

      {/* Remove-guard overlay */}
      {removeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl border-2 border-violet-200 bg-white p-7 text-center shadow-2xl">
            <p className="text-4xl">🔒</p>
            <h2 className="mt-3 text-lg font-extrabold text-slate-900">Grown-ups only!</h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              SafeStep can only be removed by a parent. If you try to take it off without the PIN,
              your parents will be notified.
            </p>
            <form onSubmit={tryRemove} className="mt-4 space-y-3">
              <input
                value={removePin}
                onChange={(e) => { setRemovePin(e.target.value.replace(/\D/g, '').slice(0, 8)); setRemoveMsg(null); }}
                type="password"
                inputMode="numeric"
                placeholder="Parent PIN"
                className="w-full rounded-2xl border-2 border-violet-100 bg-white/90 px-4 py-3 text-center font-mono text-xl tracking-[0.3em] outline-none focus:border-violet-300"
              />
              {removeMsg && <p className="text-xs font-semibold text-rose-500">{removeMsg}</p>}
              <button
                type="submit"
                disabled={removePin.length < 4 || removeBusy}
                className="w-full rounded-2xl bg-rose-400 px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-rose-200 transition hover:bg-rose-500 disabled:opacity-40"
              >
                {removeBusy ? 'Checking…' : 'Remove SafeStep'}
              </button>
              <button
                type="button"
                onClick={() => setRemoveOpen(false)}
                className="w-full rounded-2xl border-2 border-violet-100 px-6 py-2.5 text-sm font-bold text-violet-500 transition hover:bg-violet-50"
              >
                Go back 💜
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
