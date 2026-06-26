'use client';

import { InstituteSummary } from '@/lib/types';

function VsBar({
  label,
  a,
  b,
}: {
  label: string;
  a: number;
  b: number;
}) {
  const total = a + b;
  const leftPct = total > 0 ? (a / total) * 100 : 50;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="font-medium tabular-nums">{a.toLocaleString()}</span>
        <span className="text-xs uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        <span className="font-medium tabular-nums">{b.toLocaleString()}</span>
      </div>
      <div className="relative flex h-3 overflow-hidden rounded-full bg-muted">
        <div className="bg-blue-600" style={{ width: `${leftPct}%` }} />
        <div className="flex-1 bg-violet-500" />
      </div>
    </div>
  );
}

export function InstituteVs({ institutes }: { institutes: InstituteSummary[] }) {
  const top = [...institutes]
    .sort((x, y) => y.memberCount - x.memberCount)
    .slice(0, 2);
  if (top.length < 2) return null;

  const [a, b] = top;
  const diff = Math.abs(a.allTime - b.allTime);
  const leader = a.allTime >= b.allTime ? a : b;

  return (
    <div className="rounded-xl bg-card p-6 ring-1 ring-foreground/10">
      <div className="mb-5 flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-blue-600" />
          <span className="font-semibold">{a.name}</span>
          <span className="text-muted-foreground">{a.memberCount} members</span>
        </div>
        <span className="text-amber-500 font-semibold">⚡ VS</span>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">{b.memberCount} members</span>
          <span className="font-semibold">{b.name}</span>
          <span className="h-2.5 w-2.5 rounded-full bg-violet-500" />
        </div>
      </div>

      <div className="space-y-4">
        <VsBar label="All Time" a={a.allTime} b={b.allTime} />
        <VsBar label="Today" a={a.today} b={b.today} />
        <VsBar label="This Week" a={a.week} b={b.week} />
      </div>

      <p className="mt-5 text-center text-sm text-muted-foreground">
        <span className="font-semibold text-foreground">{leader.name}</span>{' '}
        leads by{' '}
        <span className="font-semibold text-foreground">
          {diff.toLocaleString()}
        </span>{' '}
        problems
      </p>
    </div>
  );
}
