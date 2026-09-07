import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogoFull } from '../components/Logo';

export function AuthShell({ children }) {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="absolute left-10 top-10 h-48 w-48 rounded-full bg-pink-200/50 blur-3xl" />
      <div className="absolute bottom-10 right-10 h-56 w-56 rounded-full bg-sky-200/50 blur-3xl" />
      <div className="absolute left-1/2 top-1/3 h-40 w-40 rounded-full bg-violet-200/40 blur-3xl" />
      <div className="relative w-full max-w-md">{children}</div>
    </div>
  );
}

export function AuthLogo() {
  return (
    <Link to="/" className="mb-6 flex items-center justify-center" aria-label="SafeStep home">
      <LogoFull className="h-36 w-auto drop-shadow-lg drop-shadow-sky-200" />
    </Link>
  );
}

export default function Login() {
  const { signIn, signInDemo } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    const res = await signIn({ email, password });
    setBusy(false);
    if (res.ok) navigate('/app');
    else setError(res.error);
  };

  const demo = async () => {
    setBusy(true);
    setError('');
    const res = await signInDemo();
    setBusy(false);
    if (res.ok) navigate('/app');
    else setError(res.error);
  };

  return (
    <AuthShell>
      <AuthLogo />
      <div className="rounded-3xl border border-white bg-white/80 p-8 shadow-2xl shadow-violet-100 backdrop-blur">
        <h1 className="text-xl font-extrabold text-slate-800">Welcome back 👋</h1>
        <p className="mt-1 text-sm text-slate-500">Sign in to your parent dashboard.</p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <label className="block">
            <span className="text-xs font-bold text-slate-500">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="mt-1 w-full rounded-2xl border-2 border-violet-100 bg-white px-4 py-3 text-sm outline-none transition focus:border-violet-300"
            />
          </label>
          <label className="block">
            <span className="text-xs font-bold text-slate-500">Password</span>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="mt-1 w-full rounded-2xl border-2 border-violet-100 bg-white px-4 py-3 text-sm outline-none transition focus:border-violet-300"
            />
          </label>
          {error && (
            <p className="rounded-2xl bg-rose-50 px-4 py-2.5 text-xs font-semibold text-rose-500">{error}</p>
          )}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-2xl bg-violet-400 py-3 text-sm font-bold text-white shadow-lg shadow-violet-200 transition hover:bg-violet-500 disabled:opacity-50"
          >
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <div className="my-5 flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-slate-300">
          <span className="h-px flex-1 bg-slate-200" /> or <span className="h-px flex-1 bg-slate-200" />
        </div>
        <button
          onClick={demo}
          disabled={busy}
          className="w-full rounded-2xl border-2 border-pink-200 bg-pink-50 py-3 text-sm font-bold text-pink-500 transition hover:bg-pink-100 disabled:opacity-50"
        >
          🎈 Explore with the demo account
        </button>
        <p className="mt-6 text-center text-xs text-slate-400">
          New to SafeStep?{' '}
          <Link to="/signup" className="font-bold text-violet-500 hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
