import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGuardian } from '../context/GuardianContext';
import { useAuth, displayName } from '../context/AuthContext';

function Toggle({ checked, onChange, label, sub }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className="flex w-full items-center justify-between gap-4 rounded-2xl border border-violet-100 bg-white/80 p-3.5 text-left transition hover:border-violet-200"
    >
      <div>
        <p className="text-sm font-semibold text-slate-800">{label}</p>
        {sub && <p className="text-xs text-slate-400">{sub}</p>}
      </div>
      <span
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${
          checked ? 'bg-violet-400' : 'bg-slate-200'
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
            checked ? 'left-[22px]' : 'left-0.5'
          }`}
        />
      </span>
    </button>
  );
}

const BLOCKABLE = [
  { key: 'adult', label: 'Adult content', sub: 'Pornography and explicit material' },
  { key: 'violence', label: 'Violence & gore', sub: 'Graphic or disturbing media' },
  { key: 'gambling', label: 'Gambling', sub: 'Casinos, betting, loot-box sites' },
  { key: 'scam', label: 'Scams & phishing', sub: 'Fake giveaways, credential theft' },
  { key: 'social', label: 'Social media (all)', sub: 'Block social platforms entirely' },
];

export default function Settings() {
  const { state, updateSettings, updateChild, requirePin, resetDemo } = useGuardian();
  const { user, updateUsername, deleteAccount } = useAuth();
  const navigate = useNavigate();
  const s = state.settings;

  const [draft, setDraft] = useState({ ...s });
  const [child, setChild] = useState({ ...state.child });
  const [dirty, setDirty] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  // PIN change form
  const [curPin, setCurPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinMsg, setPinMsg] = useState(null); // {ok, text}

  // Parent username
  const [parentName, setParentName] = useState(displayName(user));
  const [nameMsg, setNameMsg] = useState(null); // {ok, text}
  const [nameSaving, setNameSaving] = useState(false);

  const patch = (p) => {
    setDraft((d) => ({ ...d, ...p }));
    setDirty(true);
  };

  // Full child-profile draft so updateChild never writes undefined fields
  const childDraft = (overrides = {}) => ({
    name: child.name,
    age: child.age,
    pin: s.pin,
    dailyLimitMinutes: draft.dailyLimitMinutes,
    bedtime: draft.bedtime,
    blockCategories: draft.blockCategories,
    ...overrides,
  });

  const save = () => {
    const name = (child.name || '').trim();
    if (!name) {
      setSaveError("Please enter your child's name before saving.");
      return;
    }
    requirePin(`Save safety settings for ${name}`, async () => {
      setSaving(true);
      setSaveError(null);
      const [settingsRes, childRes] = await Promise.all([
        updateSettings(draft),
        updateChild(childDraft({ name })),
      ]);
      setSaving(false);
      if (settingsRes.ok && childRes.ok) {
        setChild((c) => ({ ...c, name }));
        setDirty(false);
        setSavedFlash(true);
        setTimeout(() => setSavedFlash(false), 2500);
      } else {
        setSaveError(settingsRes.error || childRes.error || 'Could not save — please check your connection and try again.');
      }
    });
  };

  const changePin = (e) => {
    e.preventDefault();
    if (curPin !== s.pin) return setPinMsg({ ok: false, text: 'Current PIN is incorrect.' });
    if (!/^\d{4,8}$/.test(newPin)) return setPinMsg({ ok: false, text: 'New PIN must be 4\u20138 digits.' });
    if (newPin !== confirmPin) return setPinMsg({ ok: false, text: 'New PINs do not match.' });
    requirePin('Change parent PIN', async () => {
      const res = await updateChild(
        childDraft({ pin: newPin, dailyLimitMinutes: s.dailyLimitMinutes, bedtime: s.bedtime, blockCategories: s.blockCategories })
      );
      if (!res.ok) {
        setPinMsg({ ok: false, text: res.error || 'Could not update the PIN \u2014 please try again.' });
        return;
      }
      setCurPin('');
      setNewPin('');
      setConfirmPin('');
      setPinMsg({ ok: true, text: 'PIN updated successfully.' });
    });
  };
  
  const changeName = async (e) => {
    e.preventDefault();
    const trimmed = parentName.trim();
    if (!trimmed) return setNameMsg({ ok: false, text: 'Name cannot be empty.' });
    if (trimmed === displayName(user)) return setNameMsg({ ok: false, text: 'No changes to save.' });
    setNameSaving(true);
    setNameMsg(null);
    const res = await updateUsername(trimmed);
    setNameSaving(false);
    if (res.ok) {
      setNameMsg({ ok: true, text: 'Username updated successfully.' });
    } else {
      setNameMsg({ ok: false, text: res.error || 'Could not update your name.' });
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500">
          Saving safety settings or changing the PIN requires your parent PIN.
        </p>
      </div>

      <div className="rounded-2xl border border-sky-200 bg-sky-50/80 p-3.5 text-xs leading-relaxed text-sky-700">
        ℹ️ <span className="font-bold">What SafeStep monitors:</span> all activity inside the paired
        Kid Portal — videos, links, games, app time and screen time, streamed live to your
        dashboard — plus <span className="font-bold">instant alerts when your child leaves the portal</span>{' '}
        (switches to another app or tab). Browsing in other browsers/apps can't be seen by any
        website; full device-level control requires a native app (e.g. Google Family Link) —
        a possible future phase.
      </div>

      {savedFlash && (
        <div className="rounded-xl border-2 border-emerald-300 bg-emerald-50 p-3 text-sm font-semibold text-emerald-700 fade-up">
          ✅ Settings saved and synced to all paired devices.
        </div>
      )}

      {/* Parent profile */}
      <section className="rounded-3xl border border-white bg-white/80 p-5 shadow-lg shadow-violet-100/50 backdrop-blur">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-500">Your profile</h2>
        <form onSubmit={changeName} className="flex flex-wrap items-end gap-3">
          <label className="block flex-1 min-w-[200px]">
            <span className="text-xs font-semibold text-slate-500">Display name</span>
            <input
              value={parentName}
              onChange={(e) => {
                setParentName(e.target.value);
                setNameMsg(null);
              }}
              placeholder="Your name"
              className="mt-1 w-full rounded-xl border-2 border-violet-100 px-3 py-2 text-sm outline-none focus:border-violet-300"
            />
          </label>
          <button
            type="submit"
            disabled={nameSaving || !parentName.trim()}
            className="rounded-2xl bg-violet-400 px-5 py-2 text-sm font-bold text-white shadow-md shadow-violet-200 transition hover:bg-violet-500 disabled:opacity-40"
          >
            {nameSaving ? 'Saving…' : 'Update name'}
          </button>
          {nameMsg && (
            <span className={`text-xs font-semibold ${nameMsg.ok ? 'text-emerald-600' : 'text-rose-500'}`}>
              {nameMsg.text}
            </span>
          )}
        </form>
      </section>

      {/* Child profile */}
      <section className="rounded-3xl border border-white bg-white/80 p-5 shadow-lg shadow-violet-100/50 backdrop-blur">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-500">Child profile</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs font-semibold text-slate-500">Child's name</span>
            <input
              value={child.name}
              onChange={(e) => {
                setChild((c) => ({ ...c, name: e.target.value }));
                setDirty(true);
              }}
              className="mt-1 w-full rounded-xl border-2 border-violet-100 px-3 py-2 text-sm outline-none focus:border-violet-300"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-slate-500">Age (adjusts AI strictness)</span>
            <select
              value={child.age}
              onChange={(e) => {
                setChild((c) => ({ ...c, age: Number(e.target.value) }));
                setDirty(true);
              }}
              className="mt-1 w-full rounded-xl border-2 border-violet-100 px-3 py-2 text-sm outline-none focus:border-violet-300"
            >
              {[5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16].map((a) => (
                <option key={a} value={a}>
                  {a} years old
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {/* Screen time */}
      <section className="rounded-3xl border border-white bg-white/80 p-5 shadow-lg shadow-violet-100/50 backdrop-blur">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-500">Screen time</h2>
        <div className="space-y-5">
          <div>
            <div className="mb-1 flex justify-between text-sm">
              <span className="font-semibold text-slate-700">Daily limit</span>
              <span className="font-bold text-violet-500">
                {Math.floor(draft.dailyLimitMinutes / 60)}h {draft.dailyLimitMinutes % 60}m
              </span>
            </div>
            <input
              type="range"
              min={30}
              max={300}
              step={15}
              value={draft.dailyLimitMinutes}
              onChange={(e) => patch({ dailyLimitMinutes: Number(e.target.value) })}
              className="w-full accent-violet-400"
            />
          </div>
          <label className="block">
            <span className="text-xs font-semibold text-slate-500">Bedtime cutoff (devices pause)</span>
            <input
              type="time"
              value={draft.bedtime}
              onChange={(e) => patch({ bedtime: e.target.value })}
              className="mt-1 w-full rounded-xl border-2 border-violet-100 px-3 py-2 text-sm outline-none focus:border-violet-300 sm:w-48"
            />
          </label>
        </div>
      </section>

      {/* Protection controls */}
      <section className="rounded-3xl border border-white bg-white/80 p-5 shadow-lg shadow-violet-100/50 backdrop-blur">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-500">Protection controls</h2>
        <div className="space-y-2">
          <Toggle
            checked={draft.autoBlock}
            onChange={() => patch({ autoBlock: !draft.autoBlock })}
            label="Auto-block unsafe content"
            sub="Pause dangerous content instantly and notify you for review"
          />
          <Toggle
            checked={draft.safeSearch}
            onChange={() => patch({ safeSearch: !draft.safeSearch })}
            label="SafeSearch on search engines"
            sub="Filter explicit results on Google, Bing and others"
          />
          <Toggle
            checked={draft.youtubeRestricted}
            onChange={() => patch({ youtubeRestricted: !draft.youtubeRestricted })}
            label="YouTube restricted mode"
            sub="Hide mature and age-inappropriate videos"
          />
          <Toggle
            checked={draft.notifications}
            onChange={() => patch({ notifications: !draft.notifications })}
            label="Instant parent notifications"
            sub="Push an alert the moment something risky happens"
          />
        </div>
      </section>

      {/* Blocked categories */}
      <section className="rounded-3xl border border-white bg-white/80 p-5 shadow-lg shadow-violet-100/50 backdrop-blur">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-500">Blocked content</h2>
        <div className="space-y-2">
          {BLOCKABLE.map((c) => (
            <label
              key={c.key}
              className="flex cursor-pointer items-center gap-3 rounded-2xl border border-violet-100 p-3.5 transition hover:border-violet-200"
            >
              <input
                type="checkbox"
                checked={draft.blockCategories[c.key]}
                onChange={() =>
                  patch({ blockCategories: { ...draft.blockCategories, [c.key]: !draft.blockCategories[c.key] } })
                }
                className="h-4 w-4 accent-violet-400"
              />
              <div>
                <p className="text-sm font-semibold text-slate-800">{c.label}</p>
                <p className="text-xs text-slate-400">{c.sub}</p>
              </div>
            </label>
          ))}
        </div>
      </section>

      {/* Save */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={save}
          disabled={!dirty || saving}
          className="rounded-2xl bg-violet-400 px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-violet-200 transition hover:bg-violet-500 disabled:opacity-40"
        >
          {saving ? 'Saving…' : '🔐 Save settings (PIN required)'}
        </button>
        {dirty && !saving && <span className="text-xs text-amber-600">Unsaved changes</span>}
      </div>
      {saveError && (
        <div className="rounded-xl border-2 border-rose-300 bg-rose-50 p-3 text-sm font-semibold text-rose-600 fade-up">
          ⚠️ {saveError}
        </div>
      )}

      {/* PIN change */}
      <section className="rounded-3xl border border-white bg-white/80 p-5 shadow-lg shadow-violet-100/50 backdrop-blur">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-500">Change parent PIN</h2>
        <form onSubmit={changePin} className="grid gap-3 sm:grid-cols-3">
          {[
            ['Current PIN', curPin, setCurPin],
            ['New PIN', newPin, setNewPin],
            ['Confirm new PIN', confirmPin, setConfirmPin],
          ].map(([label, val, set]) => (
            <label key={label} className="block">
              <span className="text-xs font-semibold text-slate-500">{label}</span>
              <input
                type="password"
                inputMode="numeric"
                value={val}
                onChange={(e) => {
                  set(e.target.value.replace(/\D/g, '').slice(0, 8));
                  setPinMsg(null);
                }}
                className="mt-1 w-full rounded-xl border-2 border-violet-100 px-3 py-2 text-center font-mono tracking-widest outline-none focus:border-violet-300"
              />
            </label>
          ))}
          <div className="sm:col-span-3 flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={!curPin || !newPin || !confirmPin}
              className="rounded-2xl bg-violet-400 px-5 py-2 text-sm font-bold text-white shadow-md shadow-violet-200 transition hover:bg-violet-500 disabled:opacity-40"
            >
              Update PIN
            </button>
            {pinMsg && (
              <span className={`text-xs font-semibold ${pinMsg.ok ? 'text-emerald-600' : 'text-rose-500'}`}>
                {pinMsg.text}
              </span>
            )}
          </div>
        </form>
      </section>

      {/* Danger zone */}
      <section className="rounded-3xl border border-rose-200 bg-rose-50/50 p-5 backdrop-blur">
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-rose-400">Data controls</h2>
        <p className="mb-3 text-xs text-slate-500">
          Removes all recorded activity, alerts and usage history for {child.name}. Pairing codes
          and settings are kept.
        </p>
        <button
          onClick={() => {
            if (window.confirm(`Clear all activity data for ${child.name}? This cannot be undone.`)) resetDemo();
          }}
          className="rounded-2xl border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-500 transition hover:bg-rose-100"
        >
          🗑 Clear activity data
        </button>
      </section>

      {/* Delete account */}
      <section className="rounded-3xl border border-rose-300 bg-rose-50/80 p-5 backdrop-blur">
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-rose-500">Delete account</h2>
        <p className="mb-3 text-xs leading-relaxed text-slate-500">
          Permanently delete your account, all child profiles, paired devices, activity history,
          and settings. This action cannot be undone.
        </p>
        <button
          onClick={async () => {
            const confirmed = window.confirm(
              'Are you sure you want to permanently delete your SafeStep account? All data including child profiles, devices, and activity history will be lost forever. This cannot be undone.'
            );
            if (!confirmed) return;
            const doubleConfirm = window.confirm(
              'Final confirmation: Type YES in the next prompt to proceed with account deletion.'
            );
            if (!doubleConfirm) return;
            const res = await deleteAccount();
            if (res.ok) {
              navigate('/');
            } else {
              window.alert(`Could not delete account: ${res.error}`);
            }
          }}
          className="rounded-2xl bg-rose-500 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-rose-200 transition hover:bg-rose-600"
        >
          🗑 Delete my account permanently
        </button>
      </section>
    </div>
  );
}
