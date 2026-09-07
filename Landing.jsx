import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogoMark } from '../components/Logo';

const FEATURES = [
  {
    icon: '🤖',
    bg: 'bg-violet-100',
    title: 'AI activity summaries',
    text: 'Ask the assistant anything — it turns your child\'s online day into a clear, friendly summary.',
  },
  {
    icon: '🚨',
    bg: 'bg-rose-100',
    title: 'Instant threat detection',
    text: 'Suspicious links, searches and videos are detected the moment they appear — before they load.',
  },
  {
    icon: '⏸️',
    bg: 'bg-amber-100',
    title: 'Auto-pause & notify',
    text: 'Unsafe content is paused automatically and you get a gentle notification to review it.',
  },
  {
    icon: '🔐',
    bg: 'bg-emerald-100',
    title: 'PIN-protected decisions',
    text: 'Approving blocked content or changing safety settings always requires your parent PIN.',
  },
  {
    icon: '⏰',
    bg: 'bg-sky-100',
    title: 'Healthy screen time',
    text: 'Daily limits, bedtime cutoffs and beautiful reports keep screen habits balanced.',
  },
  {
    icon: '📱',
    bg: 'bg-pink-100',
    title: 'Easy device pairing',
    text: 'Pair any device in seconds with a QR code — protection follows your child everywhere.',
  },
];

const STEPS = [
  { n: '1', title: 'Create your account', text: 'Sign up free and set your child\'s age and daily limits.' },
  { n: '2', title: 'Pair their devices', text: 'Scan a QR code and SafeStep starts watching quietly in the background.' },
  { n: '3', title: 'Relax — we\'ll tap you when needed', text: 'Only real risks reach you. Approve or deny with your PIN in seconds.' },
];

export default function Landing() {
  const { signInDemo } = useAuth();
  const navigate = useNavigate();

  const tryDemo = async () => {
    await signInDemo();
    navigate('/app');
  };

  return (
    <div className="min-h-screen overflow-x-hidden">
      {/* Nav */}
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2.5">
          <LogoMark className="h-10 w-10" />
          <div>
            <p className="text-base font-extrabold leading-tight text-slate-800">SafeStep</p>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-violet-400">
              AI Child Guardian
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/login"
            className="rounded-full px-4 py-2 text-sm font-semibold text-violet-500 transition hover:bg-violet-50"
          >
            Sign in
          </Link>
          <Link
            to="/signup"
            className="rounded-full bg-violet-400 px-5 py-2 text-sm font-bold text-white shadow-md shadow-violet-200 transition hover:bg-violet-500"
          >
            Get started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <header className="mx-auto grid max-w-6xl items-center gap-12 px-6 pb-20 pt-12 lg:grid-cols-2">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-pink-100 px-3 py-1 text-xs font-bold text-pink-500">
            ✨ AI-powered parenting, made gentle
          </span>
          <h1 className="mt-5 text-4xl font-extrabold leading-tight text-slate-800 sm:text-5xl">
            Keep their online world{' '}
            <span className="bg-gradient-to-r from-pink-400 via-violet-400 to-sky-400 bg-clip-text text-transparent">
              soft and safe
            </span>
          </h1>
          <p className="mt-5 max-w-md text-lg leading-relaxed text-slate-500">
            SafeStep watches over your child's links, searches and videos with friendly AI — pausing
            anything risky and asking you only when it matters.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/signup"
              className="rounded-2xl bg-violet-400 px-7 py-3.5 text-sm font-bold text-white shadow-lg shadow-violet-200 transition hover:-translate-y-0.5 hover:bg-violet-500"
            >
              Create free account →
            </Link>
            <button
              onClick={tryDemo}
              className="rounded-2xl border-2 border-violet-200 bg-white/70 px-7 py-3.5 text-sm font-bold text-violet-500 transition hover:-translate-y-0.5 hover:bg-violet-50"
            >
              🎈 Try the live demo
            </button>
          </div>
          <p className="mt-4 text-xs text-slate-400">No credit card. Your data stays in your browser.</p>
        </div>

        {/* Mock dashboard preview */}
        <div className="relative">
          <div className="absolute -left-8 -top-8 h-40 w-40 rounded-full bg-pink-200/60 blur-3xl" />
          <div className="absolute -bottom-8 -right-8 h-48 w-48 rounded-full bg-sky-200/60 blur-3xl" />
          <div className="relative rounded-3xl border border-white bg-white/80 p-5 shadow-2xl shadow-violet-100 backdrop-blur">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">👧</span>
                <div>
                  <p className="text-sm font-bold text-slate-700">Emma · age 9</p>
                  <p className="text-[11px] text-emerald-500">● Protection active</p>
                </div>
              </div>
              <span className="rounded-full bg-violet-100 px-3 py-1 text-[11px] font-bold text-violet-500">
                1h 26m today
              </span>
            </div>
            <div className="mt-4 space-y-2">
              <div className="flex items-center gap-2.5 rounded-2xl bg-emerald-50 p-3">
                <span>🌐</span>
                <p className="flex-1 text-xs font-semibold text-slate-600">khanacademy.org · Fractions</p>
                <span className="rounded-full bg-emerald-200/70 px-2 py-0.5 text-[10px] font-bold text-emerald-700">Safe</span>
              </div>
              <div className="flex items-center gap-2.5 rounded-2xl bg-sky-50 p-3">
                <span>🎬</span>
                <p className="flex-1 text-xs font-semibold text-slate-600">Minecraft building tutorial</p>
                <span className="rounded-full bg-sky-200/70 px-2 py-0.5 text-[10px] font-bold text-sky-700">Monitored</span>
              </div>
              <div className="flex items-center gap-2.5 rounded-2xl bg-rose-50 p-3">
                <span>🚨</span>
                <p className="flex-1 text-xs font-semibold text-slate-600">free-robux-generator.xyz</p>
                <span className="rounded-full bg-rose-200/70 px-2 py-0.5 text-[10px] font-bold text-rose-600">Blocked</span>
              </div>
              <div className="flex items-center gap-2.5 rounded-2xl bg-amber-50 p-3">
                <span>💬</span>
                <p className="flex-1 text-xs font-semibold text-slate-600">Message from unknown adult</p>
                <span className="rounded-full bg-amber-200/70 px-2 py-0.5 text-[10px] font-bold text-amber-700">Awaiting you</span>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <span className="flex-1 rounded-xl bg-emerald-300/80 py-2 text-center text-xs font-bold text-emerald-900">✅ Approve</span>
              <span className="flex-1 rounded-xl bg-rose-300/80 py-2 text-center text-xs font-bold text-rose-900">⛔ Deny</span>
            </div>
          </div>
        </div>
      </header>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="text-center text-3xl font-extrabold text-slate-800">Everything a calm parent needs</h2>
        <p className="mx-auto mt-3 max-w-lg text-center text-slate-500">
          Six gentle guardrails that work together, all in one pastel dashboard.
        </p>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-3xl border border-white bg-white/70 p-6 shadow-lg shadow-violet-100/50 backdrop-blur transition hover:-translate-y-1 hover:shadow-xl hover:shadow-violet-100"
            >
              <div className={`flex h-12 w-12 items-center justify-center rounded-2xl text-2xl ${f.bg}`}>
                {f.icon}
              </div>
              <h3 className="mt-4 text-base font-bold text-slate-800">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="rounded-3xl bg-gradient-to-br from-violet-100 via-pink-50 to-sky-100 p-10">
          <h2 className="text-center text-3xl font-extrabold text-slate-800">Up and running in minutes</h2>
          <div className="mt-10 grid gap-8 sm:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n} className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white text-lg font-extrabold text-violet-400 shadow-md shadow-violet-200">
                  {s.n}
                </div>
                <h3 className="mt-4 text-sm font-bold text-slate-800">{s.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-500">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-3xl px-6 py-16 text-center">
        <h2 className="text-3xl font-extrabold text-slate-800">Ready for softer screen time?</h2>
        <p className="mt-3 text-slate-500">Join SafeStep today — your child explores, you breathe easy.</p>
        <div className="mt-7 flex justify-center gap-3">
          <Link
            to="/signup"
            className="rounded-2xl bg-violet-400 px-8 py-3.5 text-sm font-bold text-white shadow-lg shadow-violet-200 transition hover:bg-violet-500"
          >
            Get started free
          </Link>
          <button
            onClick={tryDemo}
            className="rounded-2xl border-2 border-violet-200 bg-white/70 px-8 py-3.5 text-sm font-bold text-violet-500 transition hover:bg-violet-50"
          >
            Explore the demo
          </button>
        </div>
      </section>

      <footer className="border-t border-violet-100 bg-white/60 py-8 text-center text-xs text-slate-400">
        🛡️ SafeStep – AI Child Guardian · Demo product. All monitoring data is simulated.
      </footer>
    </div>
  );
}
