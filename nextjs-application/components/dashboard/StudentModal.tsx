'use client';

import { useEffect, useState } from 'react';
import { LeaderboardRow, StudentStats } from '@/lib/types';
import { Avatar } from './Avatar';

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-muted/60 px-3 py-3 text-center">
      <div className="text-xl font-bold tabular-nums">{value}</div>
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
    </div>
  );
}

function Row({ label, value, icon }: { label: string; value: React.ReactNode; icon: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2.5 text-sm">
      <span className="text-muted-foreground">
        {icon} {label}
      </span>
      <span className="font-semibold tabular-nums">{value}</span>
    </div>
  );
}

export function StudentModal({
  row,
  onClose,
}: {
  row: LeaderboardRow;
  onClose: () => void;
}) {
  const [stats, setStats] = useState<StudentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    fetch(`/api/student-stats/${encodeURIComponent(row.leetcodeUsername)}`)
      .then((r) => r.json())
      .then((data) => {
        if (!active) return;
        if (data.data) setStats(data.data as StudentStats);
        else setError(data.error || 'No stats available');
      })
      .catch(() => active && setError('Failed to load stats'))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [row.leetcodeUsername]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-card p-6 shadow-xl ring-1 ring-foreground/10 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <Avatar src={row.userAvatar} name={row.name} className="h-12 w-12" />
          <div className="flex-1">
            <h2 className="text-lg font-bold leading-tight">{row.name}</h2>
            <p className="text-sm text-muted-foreground">{row.className}</p>
            <a
              href={`https://leetcode.com/u/${row.leetcodeUsername}/`}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-primary hover:underline"
            >
              @{row.leetcodeUsername} ↗
            </a>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {loading ? (
          <div className="py-10 text-center text-muted-foreground">Loading…</div>
        ) : error ? (
          <div className="py-10 text-center text-muted-foreground">{error}</div>
        ) : stats ? (
          <div className="mt-5 space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <Stat label="Total" value={stats.totalSolved} />
              <Stat label="Rating" value={Math.round(stats.contestRating || 0)} />
              <Stat label="LC Rank" value={(stats.ranking || 0).toLocaleString()} />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg bg-green-100 px-3 py-3 text-center">
                <div className="text-xl font-bold text-green-700">{stats.easySolved}</div>
                <div className="text-[11px] uppercase tracking-wide text-green-700/80">Easy</div>
              </div>
              <div className="rounded-lg bg-amber-100 px-3 py-3 text-center">
                <div className="text-xl font-bold text-amber-700">{stats.mediumSolved}</div>
                <div className="text-[11px] uppercase tracking-wide text-amber-700/80">Medium</div>
              </div>
              <div className="rounded-lg bg-red-100 px-3 py-3 text-center">
                <div className="text-xl font-bold text-red-700">{stats.hardSolved}</div>
                <div className="text-[11px] uppercase tracking-wide text-red-700/80">Hard</div>
              </div>
            </div>

            <div className="space-y-2">
              <Row icon="🔥" label="Current Streak" value={`${stats.streak} days`} />
              <Row icon="📅" label="Active Days" value={stats.activeDays} />
              <Row icon="🏆" label="Contests Attended" value={stats.contestsAttended} />
              <Row icon="🎖️" label="Badges" value={stats.badgeCount} />
              <Row icon="📈" label="Today's Progress" value={`+${stats.solvedToday}`} />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
