import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AuthShell, AuthLogo } from './Login';

export default function Signup() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) return setError('Password must be at least 6 characters.');
    if (password !== confirm) return setError('Passwords do not match.');
    setBusy(true);
    const res = await signUp({ name, email, password });
    setBusy(false);
    if (res.ok) navigate('/app');
    else setError(res.error);
  };

  return (
    <AuthShell>
      <AuthLogo />
      <div className="rounded-3xl border border-white bg-white/80 p-8 shadow-2xl shadow-violet-100 backdrop-blur">
        <h1 className="text-xl font-extrabold text-slate-800">Create your account 🌸</h1>
        <p className="mt-1 text-sm text-slate-500">
          Free forever for the demo. You can set up your child's profile right after.
        </p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <label className="block">
            <span className="text-xs font-bold text-slate-500">Your name</span>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sarah Miller"
              className="mt-1 w-full rounded-2xl border-2 border-violet-100 bg-white px-4 py-3 text-sm outline-none transition focus:border-violet-300"
            />
          </label>
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
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs font-bold text-slate-500">Password</span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="6+ characters"
                className="mt-1 w-full rounded-2xl border-2 border-violet-100 bg-white px-4 py-3 text-sm outline-none transition focus:border-violet-300"
              />
            </label>
            <label className="block">
              <span className="text-xs font-bold text-slate-500">Confirm</span>
              <input
                type="password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Repeat it"
                className="mt-1 w-full rounded-2xl border-2 border-violet-100 bg-white px-4 py-3 text-sm outline-none transition focus:border-violet-300"
              />
            </label>
          </div>
          {error && (
            <p className="rounded-2xl bg-rose-50 px-4 py-2.5 text-xs font-semibold text-rose-500">{error}</p>
          )}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-2xl bg-violet-400 py-3 text-sm font-bold text-white shadow-lg shadow-violet-200 transition hover:bg-violet-500 disabled:opacity-50"
          >
            {busy ? 'Creating account…' : 'Create free account'}
          </button>
        </form>
        <p className="mt-6 text-center text-xs text-slate-400">
          Already have an account?{' '}
          <Link to="/login" className="font-bold text-violet-500 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
