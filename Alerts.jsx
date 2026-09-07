import React, { useMemo } from 'react';
import { useGuardian } from '../context/GuardianContext';
import StatusBadge from '../components/StatusBadge';
import { TYPE_META, timeAgo } from '../data/mock';

function AlertCard({ alert, activity }) {
  const { resolveAlert, requirePin } = useGuardian();
  const type = TYPE_META[activity?.type] || TYPE_META.website;
  const pending = alert.status === 'pending';

  const approve = () =>
    requirePin(`Approve blocked content: "${activity?.title}"`, () =>
      resolveAlert(alert.id, 'approved')
    );
  const deny = () => resolveAlert(alert.id, 'denied');

  return (
    <div
      className={`rounded-3xl border-2 bg-white/80 p-5 shadow-lg shadow-violet-100/50 backdrop-blur transition ${
        pending ? 'border-amber-200 pulse-amber' : 'border-violet-100'
      }`}
    >
      <div className="flex flex-wrap items-start gap-3">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-xl ${
            alert.severity === 'high' ? 'bg-rose-100' : 'bg-amber-100'
          }`}
        >
          {type.icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-bold text-slate-900">{activity?.title || 'Unknown content'}</p>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                alert.severity === 'high' ? 'bg-rose-100 text-rose-500' : 'bg-amber-100 text-amber-600'
              }`}
            >
              {alert.severity} risk
            </span>
            <StatusBadge status={pending ? 'awaiting' : activity?.status || 'blocked'} size="xs" />
          </div>
          <p className="mt-0.5 text-xs text-slate-400">{activity?.url}</p>
          <p className="mt-2 rounded-2xl bg-violet-50/70 p-2.5 text-xs leading-relaxed text-slate-600">
            <span className="font-bold text-slate-700">🤖 AI analysis: </span>
            {alert.reason}
          </p>
          <p className="mt-1.5 text-[11px] text-slate-400">
            Detected {timeAgo(alert.ts)}
            {alert.resolvedAt && ` · resolved ${timeAgo(alert.resolvedAt)}`}
          </p>
        </div>
      </div>

      {pending ? (
        <div className="mt-4 flex gap-2 border-t border-violet-100 pt-4">
          <button
            onClick={approve}
            className="flex-1 rounded-2xl bg-emerald-400 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-emerald-200 transition hover:bg-emerald-500"
          >
            ✅ Approve (PIN required)
          </button>
          <button
            onClick={deny}
            className="flex-1 rounded-2xl bg-rose-400 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-rose-200 transition hover:bg-rose-500"
          >
            ⛔ Deny & keep blocked
          </button>
        </div>
      ) : (
        <p
          className={`mt-3 rounded-2xl px-3 py-2 text-center text-xs font-bold ${
            alert.status === 'approved' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-500'
          }`}
        >
          {alert.status === 'approved'
            ? '✅ You approved this content after PIN verification.'
            : '⛔ You denied this content — it stays blocked on all child devices.'}
        </p>
      )}
    </div>
  );
}

export default function Alerts() {
  const { state } = useGuardian();

  // Build a Map for O(1) activity lookups instead of O(n) find() per alert
  const activityMap = useMemo(() => {
    const m = new Map();
    state.activities.forEach((a) => m.set(a.id, a));
    return m;
  }, [state.activities]);

  const pending = useMemo(
    () => state.alerts.filter((a) => a.status === 'pending'),
    [state.alerts]
  );

  const resolved = useMemo(
    () => state.alerts.filter((a) => a.status !== 'pending'),
    [state.alerts]
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Alerts & Review</h1>
        <p className="text-sm text-slate-500">
          Content SafeStep automatically blocked. Approving requires your parent PIN.
        </p>
      </div>

      <section>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-500">
          Awaiting your decision
          {pending.length > 0 && (
            <span className="rounded-full bg-rose-400 px-2 py-0.5 text-[11px] font-bold text-white">
              {pending.length}
            </span>
          )}
        </h2>
        {pending.length === 0 ? (
          <div className="rounded-3xl border-2 border-dashed border-emerald-200 bg-emerald-50/80 p-8 text-center backdrop-blur">
            <p className="text-3xl">🎉</p>
            <p className="mt-2 text-sm font-semibold text-emerald-800">All clear!</p>
            <p className="text-xs text-emerald-600">
              No blocked content is waiting for review. When your child hits something risky in the
              Kid Portal, it appears here instantly.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {pending.map((al) => (
              <AlertCard
                key={al.id}
                alert={al}
                activity={activityMap.get(al.activityId)}
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">Review history</h2>
        {resolved.length === 0 ? (
          <p className="text-sm text-slate-400">No resolved alerts yet.</p>
        ) : (
          <div className="space-y-4">
            {resolved.map((al) => (
              <AlertCard
                key={al.id}
                alert={al}
                activity={activityMap.get(al.activityId)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
