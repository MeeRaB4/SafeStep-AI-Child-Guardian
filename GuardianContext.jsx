import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { supabase } from '../lib/supabase';
import { useAuth, DEMO_EMAIL } from './AuthContext';
import { uid, localDayKey } from '../data/mock';

const GuardianContext = createContext(null);

const ts = (iso) => new Date(iso).getTime();
const todayStr = () => new Date().toISOString().slice(0, 10);

// Fun Zone categories the parent can enable/disable from the dashboard.
const FUN_ZONE_KEYS = ['videos', 'games', 'coloring', 'learning'];
const normalizeFunZone = (v) =>
  FUN_ZONE_KEYS.reduce((acc, k) => ({ ...acc, [k]: v ? v[k] !== false : true }), {});

const mapActivity = (r) => ({
  id: r.id,
  ts: ts(r.ts),
  type: r.kind,
  title: r.title,
  url: r.url,
  category: r.category,
  status: r.status,
  approved: r.approved,
  reason: r.risk_reason,
  deviceId: r.device_id,
});

const mapAlert = (r) => ({
  id: r.id,
  activityId: r.activity_id,
  ts: ts(r.ts),
  status: r.status,
  severity: r.severity,
  reason: r.reason,
  resolvedAt: r.resolved_at ? ts(r.resolved_at) : null,
});

const mapDevice = (r) => ({
  id: r.id,
  name: r.name,
  code: r.code,
  deviceToken: r.device_token,
  lastSeen: r.last_seen ? ts(r.last_seen) : null,
  pairedAt: ts(r.created_at),
  kind: 'phone',
  status: r.last_seen && Date.now() - ts(r.last_seen) < 3 * 60 * 1000 ? 'connected' : 'offline',
});

const mapNotification = (r) => ({
  id: r.id,
  ts: ts(r.ts),
  text: r.text,
  read: r.read,
  kind: 'alert',
});

const defaultSettings = () => ({
  pin: '1234',
  dailyLimitMinutes: 120,
  bedtime: '21:00',
  autoBlock: true,
  safeSearch: true,
  youtubeRestricted: true,
  notifications: true,
  portalActive: true,
  funZone: { videos: true, games: true, coloring: true, learning: true },
  blockCategories: { adult: true, violence: true, gambling: true, scam: true, social: false },
});

const screenMinutesFrom = (usage) =>
  Math.round(
    usage.filter((u) => u.day === todayStr()).reduce((s, u) => s + u.seconds, 0) / 60
  );

const genCode = () => String(Math.floor(100000 + Math.random() * 900000));

// ---------------------------------------------------------------------------
// One-time seed so the demo account shows a living dashboard
// ---------------------------------------------------------------------------
async function seedDemoData(userId, childId, childName) {
  const { data: device } = await supabase
    .from('devices')
    .insert({ parent_id: userId, child_id: childId, name: `${childName || 'Kid'}'s iPad`, code: genCode() })
    .select()
    .single();

  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    days.push(d);
  }
  const usageRows = [];
  days.forEach((d, i) => {
    const base = i === 6 ? 0.6 : 1;
    usageRows.push(
      { device_id: device.id, child_id: childId, day: d, app: 'YouTube Kids', seconds: Math.round(2100 * base) },
      { device_id: device.id, child_id: childId, day: d, app: 'Games', seconds: Math.round(1500 * base) },
      { device_id: device.id, child_id: childId, day: d, app: 'Learning', seconds: Math.round(900 * base) }
    );
  });
  await supabase.from('usage').insert(usageRows);

  const now = Date.now();
  const min = 60000;
  const acts = [
    { kind: 'site', title: 'free-robux-generator-2026.xyz', url: 'free-robux-generator-2026.xyz', category: 'scam', status: 'awaiting', risk_reason: 'Known phishing site that steals account credentials. Flagged by SafeStep AI.', ago: 4 },
    { kind: 'video', title: 'Minecraft building tutorial', url: 'youtube.com/watch?v=minecraft-build', category: 'games', status: 'safe', ago: 16 },
    { kind: 'search', title: 'searched "how do volcanoes erupt"', url: 'kids search', category: 'education', status: 'safe', ago: 31 },
    { kind: 'app', title: 'YouTube Kids – opened', url: null, category: 'entertainment', status: 'safe', ago: 48 },
    { kind: 'site', title: 'casino-bonus-free-spins.net', url: 'casino-bonus-free-spins.net', category: 'gambling', status: 'blocked', risk_reason: 'Gambling site. Always blocked for child profiles.', ago: 67 },
    { kind: 'app', title: 'Learning: Fractions lesson ➗', url: null, category: 'education', status: 'safe', ago: 92 },
  ].map((a) => ({
    parent_id: userId,
    child_id: childId,
    device_id: device.id,
    kind: a.kind,
    title: a.title,
    url: a.url,
    category: a.category,
    status: a.status,
    risk_reason: a.risk_reason || null,
    ts: new Date(now - a.ago * min).toISOString(),
  }));
  const { data: inserted } = await supabase.from('activities').insert(acts).select();
  const awaiting = inserted?.find((a) => a.status === 'awaiting');
  const blockedAct = inserted?.find((a) => a.status === 'blocked');
  const alerts = [];
  if (awaiting)
    alerts.push({
      parent_id: userId, child_id: childId, activity_id: awaiting.id, status: 'pending',
      severity: 'high', reason: awaiting.risk_reason, ts: awaiting.ts,
    });
  if (blockedAct)
    alerts.push({
      parent_id: userId, child_id: childId, activity_id: blockedAct.id, status: 'denied',
      severity: 'medium', reason: blockedAct.risk_reason, ts: blockedAct.ts,
      resolved_at: new Date(now - 60 * min).toISOString(),
    });
  if (alerts.length) await supabase.from('alerts').insert(alerts);
}

export function GuardianProvider({ children }) {
  const { user } = useAuth();
  const [state, setState] = useState(() => ({
    loading: true,
    child: null,
    settings: defaultSettings(),
    screenTimeToday: 0,
    activities: [],
    alerts: [],
    usage: [],
    devices: [],
    notifications: [],
    today: localDayKey(),
  }));
  const [toasts, setToasts] = useState([]);
  const [pinRequest, setPinRequest] = useState(null);
  const pinCallbackRef = useRef(null);

  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const pushToast = useCallback((toast) => {
    const id = uid('toast');
    setToasts((t) => [...t, { id, ...toast }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 6000);
  }, []);

  const dismissToast = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const addNotification = useCallback((text, kind = 'info') => {
    setState((s) => ({
      ...s,
      notifications: [{ id: uid('ntf'), ts: Date.now(), read: false, kind, text }, ...s.notifications].slice(0, 30),
    }));
  }, []);

  // ------------------------------------------------------------------
  // Initial load
  // ------------------------------------------------------------------
  useEffect(() => {
    if (!user) return undefined;
    let cancelled = false;

    (async () => {
      let child = (
        await supabase.from('children').select('*').eq('parent_id', user.id).limit(1).maybeSingle()
      ).data;
      if (!child) {
        // The demo account ships with a named child so the UI reads nicely
        const seed = user.email === DEMO_EMAIL ? { name: 'Emma', age: 8 } : {};
        child = (await supabase.from('children').insert({ parent_id: user.id, ...seed }).select()).data?.[0];
      }
      let settingsRow = (
        await supabase.from('parent_settings').select('*').eq('parent_id', user.id).maybeSingle()
      ).data;
      if (!settingsRow) {
        settingsRow = (await supabase.from('parent_settings').insert({ parent_id: user.id }).select()).data?.[0];
      }

      const [acts, alrs, devs, usage, ntfs] = await Promise.all([
        supabase.from('activities').select('*').eq('parent_id', user.id).order('ts', { ascending: false }).limit(200),
        supabase.from('alerts').select('*').eq('parent_id', user.id).order('ts', { ascending: false }).limit(100),
        supabase.from('devices').select('*').eq('parent_id', user.id).order('created_at'),
        supabase.from('usage').select('*').eq('child_id', child.id),
        supabase.from('notifications').select('*').eq('parent_id', user.id).order('ts', { ascending: false }).limit(30),
      ]);

      if (cancelled) return;

      if (user.email === DEMO_EMAIL && (acts.data || []).length === 0) {
        await seedDemoData(user.id, child.id, child.name);
        const [a2, al2, d2, u2, n2] = await Promise.all([
          supabase.from('activities').select('*').eq('parent_id', user.id).order('ts', { ascending: false }).limit(200),
          supabase.from('alerts').select('*').eq('parent_id', user.id).order('ts', { ascending: false }).limit(100),
          supabase.from('devices').select('*').eq('parent_id', user.id).order('created_at'),
          supabase.from('usage').select('*').eq('child_id', child.id),
          supabase.from('notifications').select('*').eq('parent_id', user.id).order('ts', { ascending: false }).limit(30),
        ]);
        if (cancelled) return;
        apply(a2.data, al2.data, d2.data, u2.data, n2.data);
      } else {
        apply(acts.data, alrs.data, devs.data, usage.data, ntfs.data);
      }

      function apply(a, al, d, u, n) {
        const usageRows = u || [];
        setState((s) => ({
          ...s,
          loading: false,
          today: localDayKey(),
          child: { id: child.id, name: child.name, age: child.age, avatar: '🧒', whitelist: child.whitelist || [] },
          settings: {
            ...defaultSettings(),
            pin: child.pin,
            dailyLimitMinutes: child.daily_limit_min,
            bedtime: child.bedtime,
            autoBlock: settingsRow?.auto_block ?? true,
            safeSearch: settingsRow?.safe_search ?? true,
            youtubeRestricted: settingsRow?.youtube_restricted ?? true,
            notifications: settingsRow?.notifications ?? true,
            portalActive: settingsRow?.portal_active ?? true,
            funZone: normalizeFunZone(settingsRow?.fun_zone),
            blockCategories: {
              adult: (child.blocked_categories || []).includes('adult'),
              violence: (child.blocked_categories || []).includes('violence'),
              gambling: (child.blocked_categories || []).includes('gambling'),
              scam: (child.blocked_categories || []).includes('scam'),
              social: (child.blocked_categories || []).includes('social'),
            },
          },
          activities: (a || []).map(mapActivity),
          alerts: (al || []).map(mapAlert),
          devices: (d || []).map(mapDevice),
          usage: usageRows,
          notifications: (n || []).map(mapNotification),
          screenTimeToday: screenMinutesFrom(usageRows),
        }));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  // ------------------------------------------------------------------
  // Realtime subscriptions
  // ------------------------------------------------------------------
  useEffect(() => {
    if (!user) return undefined;

    const upsert = (rows, row, map) => {
      const m = map(row);
      const i = rows.findIndex((x) => x.id === m.id);
      if (i === -1) return [m, ...rows];
      const next = [...rows];
      next[i] = m;
      return next;
    };

    const chan = supabase
      .channel(`parent-${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activities', filter: `parent_id=eq.${user.id}` }, (p) => {
        setState((s) => ({ ...s, activities: upsert(s.activities, p.new, mapActivity) }));
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'activities', filter: `parent_id=eq.${user.id}` }, (p) => {
        setState((s) => ({ ...s, activities: upsert(s.activities, p.new, mapActivity) }));
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'alerts', filter: `parent_id=eq.${user.id}` }, (p) => {
        const al = mapAlert(p.new);
        const alert = p.new;
        // Fetch the flagged activity so the toast carries its real title
        supabase.from('activities').select('title').eq('id', alert.activity_id).maybeSingle().then(({ data: act }) => {
          const msg = `🚨 SafeStep blocked "${act?.title || 'new content'}". Your review is needed.`;
          if (stateRef.current.settings.notifications) {
            pushToast({ kind: 'alert', title: 'Unsafe content blocked', body: msg });
          }
          addNotification(msg, 'alert');
        });
        setState((s) => ({ ...s, alerts: upsert(s.alerts, p.new, mapAlert) }));
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'alerts', filter: `parent_id=eq.${user.id}` }, (p) => {
        setState((s) => ({ ...s, alerts: upsert(s.alerts, p.new, mapAlert) }));
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'devices', filter: `parent_id=eq.${user.id}` }, (p) => {
        setState((s) => ({ ...s, devices: upsert(s.devices, p.new, mapDevice) }));
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'devices', filter: `parent_id=eq.${user.id}` }, (p) => {
        setState((s) => ({ ...s, devices: upsert(s.devices, p.new, mapDevice) }));
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `parent_id=eq.${user.id}` }, (p) => {
        const n = mapNotification(p.new);
        setState((s) => ({ ...s, notifications: [n, ...s.notifications.filter((x) => x.id !== n.id)].slice(0, 30) }));
        if (stateRef.current.settings.notifications) {
          pushToast({ kind: 'alert', title: 'Notification from child device', body: n.text });
        }
      })
      // Keep the saved child profile live across tabs/devices
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'children', filter: `parent_id=eq.${user.id}` }, (p) => {
        const c = p.new;
        setState((s) => ({
          ...s,
          child: { ...s.child, id: c.id, name: c.name, age: c.age, whitelist: c.whitelist || [] },
          settings: {
            ...s.settings,
            pin: c.pin,
            dailyLimitMinutes: c.daily_limit_min,
            bedtime: c.bedtime,
            blockCategories: {
              adult: (c.blocked_categories || []).includes('adult'),
              violence: (c.blocked_categories || []).includes('violence'),
              gambling: (c.blocked_categories || []).includes('gambling'),
              scam: (c.blocked_categories || []).includes('scam'),
              social: (c.blocked_categories || []).includes('social'),
            },
          },
        }));
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'parent_settings', filter: `parent_id=eq.${user.id}` }, (p) => {
        const r = p.new;
        setState((s) => ({
          ...s,
          settings: {
            ...s.settings,
            autoBlock: r.auto_block,
            safeSearch: r.safe_search,
            youtubeRestricted: r.youtube_restricted,
            notifications: r.notifications,
            portalActive: r.portal_active,
            funZone: normalizeFunZone(r.fun_zone),
          },
        }));
      })
      .subscribe();

    // usage changes: only refetch when the event concerns this child, and
    // fetch only today's row to keep the query lightweight.
    const usageChan = supabase
      .channel(`usage-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'usage' }, async (p) => {
        const childId = stateRef.current.child?.id;
        const row = p.new || p.old;
        if (!childId || !row || row.child_id !== childId) return;
        const { data } = await supabase
          .from('usage')
          .select('*')
          .eq('child_id', childId)
          .eq('day', todayStr());
        const rows = data || [];
        setState((s) => ({ ...s, usage: rows, screenTimeToday: screenMinutesFrom(rows) }));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(chan);
      supabase.removeChannel(usageChan);
    };
  }, [user, pushToast, addNotification]);

  // ------------------------------------------------------------------
  // Activity + usage polling fallback — realtime may miss inserts made
  // by SECURITY DEFINER RPCs (kid_event, kid_heartbeat). A lightweight
  // poll every 10 s guarantees the parent dashboard stays in sync.
  // ------------------------------------------------------------------
  useEffect(() => {
    if (!user) return undefined;
    const poll = setInterval(async () => {
      const childId = stateRef.current.child?.id;
      if (!childId) return;
      const [actRes, usageRes] = await Promise.all([
        supabase
          .from('activities')
          .select('*')
          .eq('parent_id', user.id)
          .order('ts', { ascending: false })
          .limit(200),
        supabase
          .from('usage')
          .select('*')
          .eq('child_id', childId)
          .eq('day', todayStr()),
      ]);
      // Merge activities
      if (actRes.data) {
        const mapped = actRes.data.map(mapActivity);
        const currentIds = new Set(stateRef.current.activities.map((a) => a.id));
        const hasNew = mapped.some((a) => !currentIds.has(a.id));
        if (hasNew || mapped.length !== stateRef.current.activities.length) {
          setState((s) => ({ ...s, activities: mapped }));
        }
      }
      // Merge usage (screen time)
      if (usageRes.data) {
        const rows = usageRes.data;
        const mins = screenMinutesFrom(rows);
        if (mins !== stateRef.current.screenTimeToday || rows.length !== stateRef.current.usage.length) {
          setState((s) => ({ ...s, usage: rows, screenTimeToday: mins }));
        }
      }
    }, 10000);
    return () => clearInterval(poll);
  }, [user]);

  // ------------------------------------------------------------------
  // Midnight rollover — Dashboard & Live Activity show only the current
  // day (00:00 → now). When the local date flips we refetch so yesterday
  // is archived date-wise in Reports and the new day starts clean.
  // ------------------------------------------------------------------
  const refreshData = useCallback(async () => {
    const childId = stateRef.current.child?.id;
    if (!childId || !user) return;
    const [acts, alrs, usage] = await Promise.all([
      supabase.from('activities').select('*').eq('parent_id', user.id).order('ts', { ascending: false }).limit(200),
      supabase.from('alerts').select('*').eq('parent_id', user.id).order('ts', { ascending: false }).limit(100),
      supabase.from('usage').select('*').eq('child_id', childId),
    ]);
    setState((s) => ({
      ...s,
      activities: (acts.data || []).map(mapActivity),
      alerts: (alrs.data || []).map(mapAlert),
      usage: usage.data || [],
      screenTimeToday: screenMinutesFrom(usage.data || []),
    }));
  }, [user]);

  useEffect(() => {
    const id = setInterval(() => {
      const day = localDayKey();
      if (day !== stateRef.current.today) {
        setState((s) => ({ ...s, today: day }));
        refreshData();
      }
    }, 20000);
    return () => clearInterval(id);
  }, [refreshData]);

  // ------------------------------------------------------------------
  // Alert resolution + live unlock broadcast to the child device
  // ------------------------------------------------------------------
  const resolveAlert = useCallback(
    async (alertId, decision) => {
      const s = stateRef.current;
      const alert = s.alerts.find((a) => a.id === alertId);
      if (!alert || alert.status !== 'pending') return;
      const activity = s.activities.find((a) => a.id === alert.activityId);

      setState((st) => ({
        ...st,
        alerts: st.alerts.map((a) => (a.id === alertId ? { ...a, status: decision, resolvedAt: Date.now() } : a)),
        activities: st.activities.map((a) =>
          a.id === alert.activityId
            ? { ...a, status: decision === 'approved' ? 'safe' : 'blocked', approved: decision === 'approved' }
            : a
        ),
      }));

      await supabase.from('alerts').update({ status: decision, resolved_at: new Date().toISOString() }).eq('id', alertId);
      await supabase
        .from('activities')
        .update({ status: decision === 'approved' ? 'safe' : 'blocked', approved: decision === 'approved' })
        .eq('id', alert.activityId);

      const device = s.devices.find((d) => d.id === activity?.deviceId);
      if (device?.deviceToken) {
        // Kid portal listens on device-<token> for instant unlock
        const push = supabase.channel(`device-${device.deviceToken}`);
        push.subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await push.send({ type: 'broadcast', event: 'decision', payload: { activity_id: alert.activityId, decision } });
            setTimeout(() => supabase.removeChannel(push), 500);
          }
        });
      }

      const verb = decision === 'approved' ? 'approved ✅' : 'denied ⛔';
      addNotification(`You ${verb} the blocked content after PIN verification.`, 'success');
      pushToast({
        kind: decision === 'approved' ? 'success' : 'info',
        title: decision === 'approved' ? 'Content approved' : 'Content denied',
        body:
          decision === 'approved'
            ? "The child's device has been granted access. Dashboard updated."
            : 'Access stays blocked on all child devices.',
      });
    },
    [addNotification, pushToast]
  );

  // ------------------------------------------------------------------
  // PIN gate
  // ------------------------------------------------------------------
  const requirePin = useCallback((title, callback) => {
    pinCallbackRef.current = callback;
    setPinRequest({ title });
  }, []);
  
  const verifyPin = useCallback((pin) => {
    const ok = pin === stateRef.current.settings.pin;
    if (ok) {
      const cb = pinCallbackRef.current;
      pinCallbackRef.current = null;
      setPinRequest(null);
      if (cb) cb();
    }
    return ok;
  }, []);

  const cancelPin = useCallback(() => {
    pinCallbackRef.current = null;
    setPinRequest(null);
  }, []);

  // ------------------------------------------------------------------
  // Settings & child profile (cloud writes, verified + rollback on error)
  // ------------------------------------------------------------------
  // Best-effort push of profile changes to every paired kid device; the
  // kid portal also polls, so this only makes updates feel instant.
  const broadcastToDevices = useCallback((event, payload) => {
    stateRef.current.devices.forEach((d) => {
      if (!d.deviceToken) return;
      const push = supabase.channel(`device-${d.deviceToken}`);
      push.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          push.send({ type: 'broadcast', event, payload });
          setTimeout(() => supabase.removeChannel(push), 500);
        }
      });
    });
  }, []);

  const updateSettings = useCallback(
    async (patch) => {
      const prevSettings = stateRef.current.settings;
      setState((s) => ({ ...s, settings: { ...s.settings, ...patch } }));
      const { error } = await supabase
        .from('parent_settings')
        .update({
          auto_block: patch.autoBlock,
          safe_search: patch.safeSearch,
          youtube_restricted: patch.youtubeRestricted,
          notifications: patch.notifications,
        })
        .eq('parent_id', user.id);
      if (error) {
        console.error('SafeStep: could not save safety settings:', error.message);
        const rollback = {};
        Object.keys(patch).forEach((k) => {
          rollback[k] = prevSettings[k];
        });
        setState((s) => ({ ...s, settings: { ...s.settings, ...rollback } }));
        pushToast({
          kind: 'alert',
          title: 'Save failed',
          body: `Safety settings could not be saved: ${error.message}`,
        });
        return { ok: false, error: error.message };
      }
      return { ok: true };
    },
    [user, pushToast]
  );

  const updateChild = useCallback(
    async (childDraft) => {
      const childRow = stateRef.current.child;
      if (!childRow?.id) {
        pushToast({
          kind: 'alert',
          title: 'Save failed',
          body: 'The child profile is still loading — try again in a moment.',
        });
        return { ok: false, error: 'Child profile not loaded yet.' };
      }
      const blocked = Object.entries(childDraft.blockCategories || {})
        .filter(([, v]) => v)
        .map(([k]) => k);
      const prevChild = stateRef.current.child;
      const prevSettings = stateRef.current.settings;
      const childPatch = {
        name: childDraft.name,
        age: childDraft.age,
        ...(childDraft.whitelist !== undefined ? { whitelist: childDraft.whitelist } : {}),
      };
      setState((s) => ({
        ...s,
        child: { ...s.child, ...childPatch },
        settings: {
          ...s.settings,
          pin: childDraft.pin,
          dailyLimitMinutes: childDraft.dailyLimitMinutes,
          bedtime: childDraft.bedtime,
          blockCategories: childDraft.blockCategories,
        },
      }));
      const row = {
        name: childDraft.name,
        age: childDraft.age,
        pin: childDraft.pin,
        daily_limit_min: childDraft.dailyLimitMinutes,
        bedtime: childDraft.bedtime,
        blocked_categories: blocked,
      };
      if (childDraft.whitelist !== undefined) row.whitelist = childDraft.whitelist;
      const { error } = await supabase.from('children').update(row).eq('id', childRow.id);
      if (error) {
        console.error('SafeStep: could not save child profile:', error.message);
        setState((s) => ({
          ...s,
          child: {
            ...s.child,
            name: prevChild.name,
            age: prevChild.age,
            whitelist: prevChild.whitelist || [],
          },
          settings: {
            ...s.settings,
            pin: prevSettings.pin,
            dailyLimitMinutes: prevSettings.dailyLimitMinutes,
            bedtime: prevSettings.bedtime,
            blockCategories: prevSettings.blockCategories,
          },
        }));
        pushToast({
          kind: 'alert',
          title: 'Save failed',
          body: `${childDraft.name || 'Child'}'s profile could not be saved: ${error.message}`,
        });
        return { ok: false, error: error.message };
      }
      // Auto-label follow-through: paired devices that were named with the
      // "[Child]'s …" pattern (e.g. "Emma's Phone") are relabeled to the new
      // name, so the Devices page always shows the saved child name. Custom
      // device names are left untouched.
      const oldName = (prevChild.name || '').trim();
      const newName = (childDraft.name || '').trim();
      if (oldName && newName && oldName !== newName) {
        const oldPrefix = `${oldName}'s `;
        const newPrefix = `${newName}'s `;
        const toRename = stateRef.current.devices.filter((d) => (d.name || '').startsWith(oldPrefix));
        if (toRename.length > 0) {
          const renamed = toRename.map((d) => ({ ...d, name: newPrefix + d.name.slice(oldPrefix.length) }));
          setState((s) => ({
            ...s,
            devices: s.devices.map((d) => renamed.find((r) => r.id === d.id) || d),
          }));
          await Promise.all(
            renamed.map((d) => supabase.from('devices').update({ name: d.name }).eq('id', d.id))
          );
        }
      }
      // Nudge paired kid devices so the new name/age shows up instantly
      broadcastToDevices('child', { name: childDraft.name, age: childDraft.age });
      return { ok: true };
    },
    [pushToast, broadcastToDevices]
  );

  const extendTime = useCallback(
    async (minutes) => {
      const child = stateRef.current.child;
      if (!child?.id) return;
      const prevLimit = stateRef.current.settings.dailyLimitMinutes;
      const next = (prevLimit || 0) + minutes;
      setState((s) => ({ ...s, settings: { ...s.settings, dailyLimitMinutes: next } }));
      const { error } = await supabase.from('children').update({ daily_limit_min: next }).eq('id', child.id);
      if (error) {
        console.error('SafeStep: could not extend screen time:', error.message);
        setState((s) => ({ ...s, settings: { ...s.settings, dailyLimitMinutes: prevLimit } }));
        pushToast({ kind: 'alert', title: 'Could not extend time', body: error.message });
        return;
      }
      pushToast({ kind: 'success', title: 'Screen time extended', body: `+${minutes} minutes granted on the child device.` });
    },
    [pushToast]
  );

  // ------------------------------------------------------------------
  // Portal activate/deactivate — one-time pairing stays; this toggle only
  // connects/disconnects the live data stream.
  // ------------------------------------------------------------------
  const togglePortal = useCallback(
    async () => {
      const prev = stateRef.current.settings.portalActive;
      const next = !prev;
      setState((s) => ({ ...s, settings: { ...s.settings, portalActive: next } }));
      const { error } = await supabase
        .from('parent_settings')
        .update({ portal_active: next })
        .eq('parent_id', user.id);
      if (error) {
        setState((s) => ({ ...s, settings: { ...s.settings, portalActive: prev } }));
        pushToast({ kind: 'alert', title: 'Could not update the portal', body: error.message });
        return;
      }
      broadcastToDevices('portal', { active: next });
      pushToast({
        kind: next ? 'success' : 'info',
        title: next ? 'Portal activated 🟢' : 'Portal deactivated 🔴',
        body: next
          ? 'The live data stream reconnected — activity flows again on paired devices.'
          : 'Live data stream disconnected. Pairing is kept — re-activate anytime.',
      });
    },
    [user, pushToast, broadcastToDevices]
  );

  // ------------------------------------------------------------------
  // Fun Zone categories (curated videos / mini games / coloring / learning)
  // ------------------------------------------------------------------
  const setFunZone = useCallback(
    async (category, enabled) => {
      const prev = stateRef.current.settings.funZone;
      const next = { ...prev, [category]: enabled };
      setState((s) => ({ ...s, settings: { ...s.settings, funZone: next } }));
      const { error } = await supabase
        .from('parent_settings')
        .update({ fun_zone: next })
        .eq('parent_id', user.id);
      if (error) {
        setState((s) => ({ ...s, settings: { ...s.settings, funZone: prev } }));
        pushToast({ kind: 'alert', title: 'Could not save Fun Zone', body: error.message });
        return;
      }
      broadcastToDevices('funzone', { funZone: next });
    },
    [user, pushToast, broadcastToDevices]
  );

  // ------------------------------------------------------------------
  // “Allow once” for a blocked activity (used by the AI Assistant chat)
  // ------------------------------------------------------------------
  const approveActivity = useCallback(
    async (activityId) => {
      const s = stateRef.current;
      const activity = s.activities.find((a) => a.id === activityId);
      if (!activity) return;
      setState((st) => ({
        ...st,
        activities: st.activities.map((a) =>
          a.id === activityId ? { ...a, status: 'safe', approved: true } : a
        ),
      }));
      await supabase.from('activities').update({ status: 'safe', approved: true }).eq('id', activityId);
      const device = s.devices.find((d) => d.id === activity.deviceId);
      if (device?.deviceToken) {
        const push = supabase.channel(`device-${device.deviceToken}`);
        push.subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await push.send({ type: 'broadcast', event: 'decision', payload: { activity_id: activityId, decision: 'approved' } });
            setTimeout(() => supabase.removeChannel(push), 500);
          }
        });
      }
      pushToast({
        kind: 'success',
        title: 'Allowed once',
        body: `“${activity.title}” is unlocked on the child device.`,
      });
    },
    [pushToast]
  );

  // ------------------------------------------------------------------
  // Whitelist — a domain the parent always allows on the Kid Portal
  // ------------------------------------------------------------------
  const whitelistDomain = useCallback(
    async (domain, activityId = null) => {
      const childRow = stateRef.current.child;
      if (!childRow?.id) return { ok: false, error: 'Child profile not loaded yet.' };
      const clean = (domain || '').toLowerCase().trim();
      if (!clean) return { ok: false, error: 'No site to whitelist.' };
      const prev = childRow.whitelist || [];
      if (!prev.includes(clean)) {
        const next = [...prev, clean];
        setState((s) => ({ ...s, child: { ...s.child, whitelist: next } }));
        const { error } = await supabase.from('children').update({ whitelist: next }).eq('id', childRow.id);
        if (error) {
          setState((s) => ({ ...s, child: { ...s.child, whitelist: prev } }));
          pushToast({ kind: 'alert', title: 'Whitelist failed', body: error.message });
          return { ok: false, error: error.message };
        }
        broadcastToDevices('whitelist', { whitelist: next });
        pushToast({
          kind: 'success',
          title: 'Whitelisted ✅',
          body: `${clean} is now always allowed on the Kid Portal.`,
        });
      }
      if (activityId) await approveActivity(activityId);
      return { ok: true };
    },
    [pushToast, broadcastToDevices, approveActivity]
  );

  // ------------------------------------------------------------------
  // History deletion — yesterday / last 7 days / last 30 days / everything
  // ------------------------------------------------------------------
  const deleteHistory = useCallback(
    async (rangeKey) => {
      const childId = stateRef.current.child?.id;
      if (!childId || !user) return { ok: false, error: 'Data not loaded yet.' };

      const startToday = new Date();
      startToday.setHours(0, 0, 0, 0);
      const DAY = 86400000;
      let fromTs;
      let toTs;
      let label;
      if (rangeKey === 'yesterday') {
        fromTs = startToday.getTime() - DAY;
        toTs = startToday.getTime();
        label = "yesterday's history";
      } else if (rangeKey === '7d' || rangeKey === '30d') {
        const days = rangeKey === '7d' ? 7 : 30;
        fromTs = startToday.getTime() - (days - 1) * DAY;
        toTs = Date.now();
        label = `the last ${days} days (including today)`;
      } else {
        fromTs = 0;
        toTs = Date.now();
        label = 'all history';
      }

      const fromIso = new Date(fromTs).toISOString();
      const toIso = new Date(toTs).toISOString();
      const fromDay = new Date(fromTs).toISOString().slice(0, 10);
      const toDay = new Date(toTs).toISOString().slice(0, 10);
      const tsInRange = (t) => t >= fromTs && t < toTs;

      // Optimistic local removal for an instant UI refresh
      setState((s) => {
        const usageLeft = s.usage.filter((u) => u.day < fromDay || u.day > toDay);
        return {
          ...s,
          activities: s.activities.filter((a) => !tsInRange(a.ts)),
          alerts: s.alerts.filter((a) => !tsInRange(a.ts)),
          notifications: s.notifications.filter((n) => !tsInRange(n.ts)),
          usage: usageLeft,
          screenTimeToday: screenMinutesFrom(usageLeft),
        };
      });

      const results = await Promise.all([
        supabase.from('activities').delete().eq('parent_id', user.id).gte('ts', fromIso).lt('ts', toIso),
        supabase.from('alerts').delete().eq('parent_id', user.id).gte('ts', fromIso).lt('ts', toIso),
        supabase.from('notifications').delete().eq('parent_id', user.id).gte('ts', fromIso).lt('ts', toIso),
        supabase.from('usage').delete().eq('child_id', childId).gte('day', fromDay).lte('day', toDay),
      ]);
      const failed = results.find((r) => r.error);
      if (failed) {
        pushToast({ kind: 'alert', title: 'Delete failed', body: failed.error.message });
        refreshData();
        return { ok: false, error: failed.error.message };
      }
      pushToast({
        kind: 'success',
        title: 'History deleted 🗑',
        body: `Removed ${label} — reports and dashboard updated instantly.`,
      });
      return { ok: true };
    },
    [user, pushToast, refreshData]
  );

  const markNotificationsRead = useCallback(() => {
    setState((s) => ({ ...s, notifications: s.notifications.map((n) => ({ ...n, read: true })) }));
    supabase
      .from('notifications')
      .update({ read: true })
      .eq('parent_id', user.id)
      .eq('read', false)
      .then(({ error }) => {
        if (error) console.error('SafeStep: could not mark notifications read:', error.message);
      });
  }, [user]);

  const clearNotifications = useCallback(() => {
    setState((s) => ({ ...s, notifications: [] }));
    supabase
      .from('notifications')
      .delete()
      .eq('parent_id', user.id)
      .then(({ error }) => {
        if (error) console.error('SafeStep: could not clear notifications:', error.message);
      });
  }, [user]);

  // ------------------------------------------------------------------
  // Devices (real pairing codes)
  // ------------------------------------------------------------------
  const addDevice = useCallback(
    async (name) => {
      const code = genCode();
      const { data } = await supabase
        .from('devices')
        .insert({ parent_id: user.id, child_id: stateRef.current.child.id, name, code })
        .select()
        .single();
      if (data) {
        setState((s) => ({ ...s, devices: [...s.devices, mapDevice(data)] }));
        pushToast({ kind: 'success', title: 'Pairing code ready 🔗', body: `Code ${code} — open it on the child device.` });
      }
      return data;
    },
    [user, pushToast]
  );

  const removeDevice = useCallback((deviceId) => {
    setState((s) => ({ ...s, devices: s.devices.filter((d) => d.id !== deviceId) }));
    supabase
      .from('devices')
      .delete()
      .eq('id', deviceId)
      .then(({ error }) => {
        if (error) console.error('SafeStep: could not remove device:', error.message);
      });
  }, []);

  const resetDemo = useCallback(async () => {
    const childId = stateRef.current.child?.id;
    if (!childId) return;
    await supabase.from('alerts').delete().eq('child_id', childId);
    await supabase.from('activities').delete().eq('child_id', childId);
    await supabase.from('usage').delete().eq('child_id', childId);
    pushToast({ kind: 'info', title: 'Data cleared', body: 'All activity data was removed. New child activity will appear live.' });
  }, [pushToast]);

  const value = useMemo(
    () => ({
      state,
      toasts,
      pinRequest,
      resolveAlert,
      requirePin,
      verifyPin,
      cancelPin,
      updateSettings,
      updateChild,
      extendTime,
      togglePortal,
      setFunZone,
      approveActivity,
      whitelistDomain,
      deleteHistory,
      markNotificationsRead,
      clearNotifications,
      addDevice,
      removeDevice,
      resetDemo,
      dismissToast,
    }),
    [state, toasts, pinRequest, resolveAlert, requirePin, verifyPin, cancelPin, updateSettings, updateChild, extendTime, togglePortal, setFunZone, approveActivity, whitelistDomain, deleteHistory, markNotificationsRead, clearNotifications, addDevice, removeDevice, resetDemo, dismissToast]
  );

  return <GuardianContext.Provider value={value}>{children}</GuardianContext.Provider>;
}

export function useGuardian() {
  const ctx = useContext(GuardianContext);
  if (!ctx) throw new Error('useGuardian must be used inside GuardianProvider');
  return ctx;
}
