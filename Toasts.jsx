import React from 'react';
import { useGuardian } from '../context/GuardianContext';

const KIND_STYLES = {
  alert: 'border-rose-200 bg-rose-50',
  success: 'border-emerald-200 bg-emerald-50',
  info: 'border-sky-200 bg-sky-50',
};

const KIND_ICONS = { alert: '🚨', success: '✅', info: 'ℹ️' };

export default function Toasts() {
  const { toasts, dismissToast } = useGuardian();
  if (!toasts.length) return null;
  return (
    <div className="pointer-events-none fixed right-4 top-4 z-40 flex w-80 flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`toast-enter pointer-events-auto rounded-2xl border-2 p-3 shadow-lg shadow-violet-100/50 ${
            KIND_STYLES[t.kind] || KIND_STYLES.info
          }`}
        >
          <div className="flex items-start gap-2">
            <span className="text-lg">{KIND_ICONS[t.kind] || 'ℹ️'}</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-slate-900">{t.title}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-slate-600">{t.body}</p>
            </div>
            <button
              onClick={() => dismissToast(t.id)}
              className="text-slate-400 hover:text-slate-600"
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
