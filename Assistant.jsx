import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useGuardian } from '../context/GuardianContext';
import { formatMinutes, CATEGORY_META } from '../data/mock';
import { domainOf, parentReasonFor } from '../lib/filter';

const suggestionsFor = (name) => [
  'Summarize today',
  'How much screen time is left?',
  'What was blocked recently?',
  `Is ${name} safe online today?`,
  'Give me safety recommendations',
];

const greetingFor = (name) =>
  `Hi! I'm your SafeStep AI guardian assistant 🤖 I watch over ${name}'s online activity 24/7. Ask me anything — a daily summary, screen time, blocked content, or safety advice. When ${name} hits something unsafe, my reasoning appears right here.`;

function buildAnswer(q, state) {
  const t = q.toLowerCase();
  const { child, settings, activities, screenTimeToday } = state;
  const pending = state.alerts.filter((a) => a.status === 'pending');
  const blocked = activities.filter((a) => a.status === 'blocked' || a.status === 'awaiting');
  const remaining = Math.max(0, settings.dailyLimitMinutes - screenTimeToday);

  if (/(summar|report|how.*day|daily|overview)/.test(t)) {
    return (
      `Here is ${child.name}'s day so far 📋\n\n` +
      `• Screen time: ${formatMinutes(screenTimeToday)} of the ${formatMinutes(settings.dailyLimitMinutes)} limit\n` +
      `• ${activities.length} activities inspected by SafeStep AI\n` +
      `• ${blocked.length} item(s) blocked or paused, ${pending.length} awaiting your approval\n` +
      `• Mostly educational and gaming content — overall a healthy session. ✅\n\n` +
      (pending.length > 0
        ? `⚠️ You have ${pending.length} blocked item(s) waiting for review — see the reasoning cards above or in Alerts & Review.`
        : `No urgent items need your attention right now.`)
    );
  }
  if (/(screen.?time|time left|limit|remaining)/.test(t)) {
    return remaining > 0
      ? `${child.name} has used ${formatMinutes(screenTimeToday)} today. There are ${formatMinutes(remaining)} left before the daily limit of ${formatMinutes(settings.dailyLimitMinutes)} is reached. Devices auto-pause at ${settings.bedtime} bedtime.`
      : `⛔ ${child.name} has reached today's screen-time limit (${formatMinutes(settings.dailyLimitMinutes)}). Devices are paused. You can raise the limit in Settings (PIN required).`;
  }
  if (/(block|denied|flag|unsafe|risk|whitelist|allow)/.test(t)) {
    if (blocked.length === 0)
      return 'Nothing has been blocked yet today. All inspected content was safe or monitored. ✅';
    const lines = blocked
      .slice(0, 5)
      .map(
        (a) =>
          `• "${a.title}" — ${a.status === 'awaiting' ? 'awaiting your approval ⏳' : 'blocked ⛔'}\n  ↳ ${a.reason || 'Flagged by SafeStep AI.'}`
      )
      .join('\n');
    return (
      `SafeStep blocked or paused ${blocked.length} item(s):\n\n${lines}\n\n` +
      `Use the reasoning cards in this chat to “Allow once” (PIN required) or “Whitelist” the site so it is always allowed.`
    );
  }
  if (/(safe|safety|ok|okay|worried|risk score)/.test(t)) {
    const score = pending.length > 0 ? 78 : blocked.length > 2 ? 84 : 96;
    return (
      `Overall safety score today: ${score}/100 ${score >= 90 ? '🟢' : '🟡'}\n\n` +
      `${child.name} mostly visited educational and age-appropriate content. ` +
      (pending.length > 0
        ? `However, ${pending.length} suspicious item(s) are paused and waiting for your decision — please review them.`
        : `All suspicious content was handled automatically. No action needed right now.`)
    );
  }
  if (/(recommend|advice|suggest|tip|improve)/.test(t)) {
    return (
      `My recommendations for ${child.name} (age ${child.age}) 💡\n\n` +
      `1. Keep "Auto-block unsafe content" enabled — it stopped phishing attempts this week.\n` +
      `2. Weekend screen time runs ~30% higher; consider a slightly higher weekend limit instead of daily battles.\n` +
      `3. Talk with ${child.name} about "free Robux/gems" scams — they were targeted twice this week.\n` +
      `4. SafeSearch and YouTube restricted mode are both ON. Good — keep them that way for age ${child.age}.`
    );
  }
  if (/(app|website|visit|used)/.test(t)) {
    const apps = activities.filter((a) => a.type === 'app').slice(0, 4);
    return apps.length
      ? `Apps ${child.name} used recently:\n\n${apps.map((a) => `• ${a.title}`).join('\n')}`
      : `No app activity recorded yet in this session.`;
  }
  if (/(hello|hi|hey)/.test(t)) {
    return `Hello! 👋 I'm the SafeStep AI assistant. Ask me about ${child.name}'s screen time, blocked content, today's summary, or safety recommendations.`;
  }
  return (
    `I can help with questions about ${child.name}'s online safety. Try asking:\n\n` +
    `• "Summarize today"\n• "How much screen time is left?"\n• "What was blocked recently?"\n• "Give me safety recommendations"`
  );
}

/**
 * AI block-reasoning card: a contextual, age-appropriate explanation of why
 * SafeStep blocked something, with "Allow once" / "Whitelist" actions.
 */
function BlockCard({ activityId }) {
  const { state, resolveAlert, approveActivity, whitelistDomain, requirePin } = useGuardian();
  const activity = state.activities.find((a) => a.id === activityId);
  if (!activity) return null;

  const pendingAlert = state.alerts.find((a) => a.activityId === activity.id && a.status === 'pending');
  const resolved = activity.status === 'safe' || activity.approved;
  const catMeta = CATEGORY_META[activity.category] || { label: activity.category, color: '#94a3b8' };
  const domain = domainOf(activity.url || activity.title || '');

  const allowOnce = () =>
    requirePin(`Allow "${activity.title}" once`, () => {
      if (pendingAlert) resolveAlert(pendingAlert.id, 'approved');
      else approveActivity(activity.id);
    });

  const whitelist = () =>
    requirePin(`Whitelist ${domain}`, () => whitelistDomain(domain, activity.id));

  return (
    <div className="w-full max-w-[80%] rounded-2xl rounded-bl-md border-2 border-rose-100 bg-white p-4 fade-up">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-xl bg-rose-50 px-2 py-1 text-sm">🛡️</span>
        <p className="text-sm font-bold text-slate-900">Blocked attempt</p>
        <span
          className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase"
          style={{ background: `${catMeta.color}33`, color: '#9f1239' }}
        >
          {catMeta.label}
        </span>
      </div>
      <p className="mt-1.5 truncate text-sm font-semibold text-slate-700">{activity.title}</p>
      <p className="mt-1.5 rounded-xl bg-violet-50/70 p-2.5 text-xs leading-relaxed text-slate-600">
        <span className="font-bold text-slate-700">🤖 Why SafeStep blocked it: </span>
        {parentReasonFor({ category: activity.category, age: state.child.age, reason: activity.reason })}
      </p>
      {resolved ? (
        <p className="mt-2.5 rounded-xl bg-emerald-50 px-3 py-2 text-center text-[11px] font-bold text-emerald-600">
          ✅ You allowed this content — it is open on the child device.
        </p>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={allowOnce}
            className="flex-1 rounded-xl bg-emerald-400 px-3 py-2 text-xs font-bold text-white shadow-sm shadow-emerald-200 transition hover:bg-emerald-500"
          >
            ✅ Allow once
          </button>
          <button
            onClick={whitelist}
            className="flex-1 rounded-xl border-2 border-violet-200 bg-white px-3 py-2 text-xs font-bold text-violet-500 transition hover:bg-violet-50"
          >
            📋 Whitelist {domain ? `(${domain})` : 'site'}
          </button>
        </div>
      )}
    </div>
  );
}

export default function Assistant() {
  const { state } = useGuardian();
  const [messages, setMessages] = useState(() => [
    { role: 'ai', text: greetingFor(state.child.name), auto: true },
  ]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  // Track which blocked items already have a reasoning card in the chat
  const seenBlocksRef = useRef(new Set());
  const seededRef = useRef(false);

  // Instant refresh: re-render the auto-generated greeting when the saved
  // child name changes (Settings → Child profile). Chat history is kept.
  const greetedNameRef = useRef(state.child.name);
  useEffect(() => {
    if (greetedNameRef.current === state.child.name) return;
    greetedNameRef.current = state.child.name;
    setMessages((m) =>
      m[0]?.auto ? [{ ...m[0], text: greetingFor(state.child.name) }, ...m.slice(1)] : m
    );
  }, [state.child.name]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  // AI block reasoning: seed the latest blocked items when the chat opens and
  // push a new card live every time SafeStep blocks something else.
  useEffect(() => {
    const blockedNow = state.activities.filter((a) => a.status === 'awaiting' || a.status === 'blocked');
    const fresh = blockedNow.filter((a) => !seenBlocksRef.current.has(a.id));
    if (!fresh.length) return;
    const isFirst = !seededRef.current;
    seededRef.current = true;
    const toAdd = isFirst ? fresh.slice(0, 3) : fresh;
    toAdd.forEach((a) => seenBlocksRef.current.add(a.id));
    setMessages((m) => [
      ...m,
      ...toAdd.map((activity) => ({ role: 'ai', type: 'block', activityId: activity.id })),
    ]);
  }, [state.activities]);

  const suggestions = useMemo(() => suggestionsFor(state.child.name), [state.child.name]);

  const send = (raw) => {
    const text = (raw ?? input).trim();
    if (!text || typing) return;
    setMessages((m) => [...m, { role: 'user', text }]);
    setInput('');
    setTyping(true);
    setTimeout(() => {
      setMessages((m) => [...m, { role: 'ai', text: buildAnswer(text, stateRef.current) }]);
      setTyping(false);
    }, 900 + Math.random() * 700);
  };

  return (
    <div className="mx-auto flex h-[calc(100vh-8.5rem)] max-w-3xl flex-col">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-300 to-violet-300 text-xl shadow-md shadow-violet-200">
          🤖
        </div>
        <div>
          <h1 className="text-lg font-extrabold text-slate-900">AI Safety Assistant</h1>
          <p className="flex items-center gap-1.5 text-xs text-emerald-600">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
            Analyzing {state.child.name}'s activity in real time
          </p>
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto rounded-3xl border border-violet-100 bg-white/80 p-4 shadow-lg shadow-violet-100/50 backdrop-blur">
        {messages.map((m, i) =>
          m.type === 'block' ? (
            <div key={i} className="flex justify-start">
              <BlockCard activityId={m.activityId} />
            </div>
          ) : (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[80%] whitespace-pre-line rounded-2xl px-4 py-2.5 text-sm leading-relaxed fade-up ${
                  m.role === 'user'
                    ? 'rounded-br-md bg-violet-400 text-white'
                    : 'rounded-bl-md bg-violet-50 text-slate-800'
                }`}
              >
                {m.text}
              </div>
            </div>
          )
        )}
        {typing && (
          <div className="flex justify-start">
            <div className="flex items-center gap-1 rounded-2xl rounded-bl-md bg-violet-50 px-4 py-3">
              <span className="typing-dot h-2 w-2 rounded-full bg-violet-300" />
              <span className="typing-dot h-2 w-2 rounded-full bg-violet-300" />
              <span className="typing-dot h-2 w-2 rounded-full bg-violet-300" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {suggestions.map((s) => (
          <button
            key={s}
            onClick={() => send(s)}
            className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-medium text-violet-500 transition hover:bg-violet-100"
          >
            {s}
          </button>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="mt-3 flex gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`Ask about ${state.child.name}'s online activity…`}
          className="flex-1 rounded-2xl border-2 border-violet-100 bg-white/90 px-4 py-3 text-sm outline-none transition focus:border-violet-300"
        />
        <button
          type="submit"
          disabled={!input.trim() || typing}
          className="rounded-2xl bg-violet-400 px-5 py-3 text-sm font-bold text-white shadow-md shadow-violet-200 transition hover:bg-violet-500 disabled:opacity-40"
        >
          Send
        </button>
      </form>
    </div>
  );
}
