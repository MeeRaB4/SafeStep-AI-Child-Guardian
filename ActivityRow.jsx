import React from 'react';
import { TYPE_META } from '../data/mock';
import StatusBadge from './StatusBadge';
import { timeAgo } from '../data/mock';

export default function ActivityRow({ activity, showTime = true }) {
  const type = TYPE_META[activity.type] || TYPE_META.website;
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-violet-100 bg-white/80 p-3 backdrop-blur transition hover:border-violet-200 hover:shadow-md hover:shadow-violet-100/60">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-lg">
        {type.icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-800">
          {activity.title}
          {activity.approved && (
            <span className="ml-2 rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-bold text-violet-500">
              PARENT APPROVED
            </span>
          )}
        </p>
        <p className="truncate text-xs text-slate-400">
          {type.label} · {activity.url}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        {showTime && <span className="hidden text-xs text-slate-400 sm:block">{timeAgo(activity.ts)}</span>}
        <StatusBadge status={activity.status} />
      </div>
    </div>
  );
}
