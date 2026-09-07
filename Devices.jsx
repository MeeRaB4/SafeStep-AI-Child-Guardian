import React, { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useGuardian } from '../context/GuardianContext';
import { timeAgo } from '../data/mock';

const KIND_ICONS = { tablet: '📱', laptop: '💻', phone: '📲', console: '🎮' };

const portalUrl = (code) => `${window.location.origin}/kid?code=${code}`;

export default function Devices() {
  const { state, addDevice, removeDevice } = useGuardian();
  const [pairingId, setPairingId] = useState(null);
  const [customName, setCustomName] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  // Auto-label: the default device name always follows the saved child name
  const childName = state.child?.name || 'Child';
  const deviceName = customName.trim() || `${childName}'s Phone`;

  const pairingDevice = state.devices.find((d) => d.id === pairingId);
  const justPaired = Boolean(pairingDevice?.lastSeen);

  useEffect(() => {
    if (justPaired) {
      const t = setTimeout(() => setPairingId(null), 3000);
      return () => clearTimeout(t);
    }
  }, [justPaired]);

  const startPairing = async () => {
    setBusy(true);
    const dev = await addDevice(deviceName);
    setBusy(false);
    if (dev) setPairingId(dev.id);
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(portalUrl(pairingDevice.code));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Devices</h1>
        <p className="text-sm text-slate-500">
          Pair {childName}'s device once with a QR or 6-digit code — pairing is permanent. New
          devices are auto-labeled <span className="font-semibold text-violet-500">{childName}'s Phone</span>,
          and the label follows the child name saved in Settings.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Paired devices */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Paired devices</h2>
          {state.devices.length === 0 && (
            <div className="rounded-3xl border-2 border-dashed border-violet-200 bg-white/70 p-8 text-center text-sm text-slate-400 backdrop-blur">
              No devices paired yet. Start pairing on the right →
            </div>
          )}
          {state.devices.map((d) => (
            <div key={d.id} className="flex items-center gap-3 rounded-3xl border border-white bg-white/80 p-4 shadow-lg shadow-violet-100/50 backdrop-blur">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-50 text-xl">
                {KIND_ICONS[d.kind] || '📱'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-slate-800">{d.name}</p>
                <p className="text-xs text-slate-400">
                  {d.lastSeen ? `active ${timeAgo(d.lastSeen)}` : 'waiting for first connection'} · paired {timeAgo(d.pairedAt)}
                </p>
              </div>
              <span
                className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                  d.status === 'connected' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    d.status === 'connected' ? 'animate-pulse bg-emerald-500' : 'bg-slate-400'
                  }`}
                />
                {d.status === 'connected' ? 'Connected' : 'Offline'}
              </span>
              <button
                onClick={() => removeDevice(d.id)}
                className="rounded-lg px-2 py-1 text-xs font-semibold text-slate-400 transition hover:bg-rose-50 hover:text-rose-500"
                title="Unpair device"
              >
                Unpair
              </button>
            </div>
          ))}

          <div className="rounded-3xl border-2 border-dashed border-violet-200 bg-violet-50/70 p-4 text-xs leading-relaxed text-violet-500 backdrop-blur">
            💡 On {childName}'s device, open the Kid Portal link (or scan the QR) and enter the
            6-digit code. Pairing happens <span className="font-bold">once and permanently</span> —
            every search, link, video and app they use in the portal then streams to this dashboard
            in real time.
          </div>
        </div>

        {/* Pairing flow */}
        <div className="rounded-3xl border border-white bg-white/80 p-6 shadow-lg shadow-violet-100/50 backdrop-blur">
          {!pairingDevice ? (
            <div className="flex h-full flex-col items-center justify-center py-8 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-violet-100 text-3xl">
                🔗
              </div>
              <h2 className="text-lg font-bold text-slate-900">Pair a new device</h2>
              <p className="mt-1 max-w-xs text-sm text-slate-500">
                Creates a secure QR + 6-digit code for {childName}'s device.
              </p>
              <input
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder={`${childName}'s Phone`}
                className="mt-4 w-56 rounded-xl border-2 border-violet-100 px-3 py-2 text-sm outline-none focus:border-violet-300"
              />
              <button
                onClick={startPairing}
                disabled={busy}
                className="mt-3 rounded-2xl bg-violet-400 px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-violet-200 transition hover:bg-violet-500 disabled:opacity-40"
              >
                {busy ? 'Creating…' : 'Start pairing'}
              </button>
            </div>
          ) : justPaired ? (
            <div className="flex h-full flex-col items-center justify-center py-8 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-3xl">
                ✅
              </div>
              <h2 className="text-lg font-bold text-emerald-700">Device paired!</h2>
              <p className="mt-1 text-sm text-slate-500">
                {pairingDevice.name} connected — activity is now streaming live.
              </p>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Secure pairing</h2>
                <button onClick={() => setPairingId(null)} className="text-xs font-semibold text-slate-400 hover:text-slate-600">
                  Cancel
                </button>
              </div>
              <div className="mt-4 flex flex-col items-center gap-5 sm:flex-row sm:items-start">
                <div className="flex flex-col items-center">
                  <div className="rounded-2xl bg-white p-2 shadow-inner ring-1 ring-violet-100">
                    <QRCodeSVG value={portalUrl(pairingDevice.code)} size={168} />
                  </div>
                  <p className="mt-2 text-[11px] text-slate-400">Scan with the child device camera</p>
                </div>
                <div className="flex-1 space-y-3">
                  <p className="text-xs leading-relaxed text-slate-500">
                    Or open the Kid Portal on their device and enter this code:
                  </p>
                  <p className="rounded-2xl bg-violet-50 py-3 text-center font-mono text-2xl font-bold tracking-[0.4em] text-violet-500 ring-1 ring-violet-200">
                    {pairingDevice.code}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={copyLink}
                      className="flex-1 rounded-2xl border-2 border-violet-100 bg-white/80 px-3 py-2 text-xs font-bold text-violet-500 transition hover:bg-violet-50"
                    >
                      {copied ? '✅ Copied!' : '📋 Copy portal link'}
                    </button>
                    <a
                      href={portalUrl(pairingDevice.code)}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 rounded-2xl border-2 border-sky-100 bg-sky-50/80 px-3 py-2 text-center text-xs font-bold text-sky-500 transition hover:bg-sky-100"
                    >
                      🧒 Open portal here
                    </a>
                  </div>
                  <p className="flex items-center justify-center gap-2 pt-2 text-xs font-semibold text-slate-400">
                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-violet-200 border-t-violet-400" />
                    Waiting for the child device to connect…
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
