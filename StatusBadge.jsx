import React from 'react';
import { STATUS_META } from '../data/mock';

export default function StatusBadge({ status, size = 'sm' }) {
  const meta = STATUS_META[status] || STATUS_META.monitored;
  const sizing = size === 'xs' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs';
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-semibold ring-1 ${meta.cls} ${sizing}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  );
}
