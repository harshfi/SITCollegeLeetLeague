'use client';

import { LeaderboardRow } from '@/lib/types';
import { Avatar } from './Avatar';
import { cn } from '@/lib/utils';

const ICONS = ['🏆', '👑', '🥉']; // for display order [#2, #1, #3]

function PodiumCard({
  row,
  rank,
  icon,
  highlight,
  onSelect,
}: {
  row: LeaderboardRow;
  rank: number;
  icon: string;
  highlight: boolean;
  onSelect: (r: LeaderboardRow) => void;
}) {
  return (
    <button
      onClick={() => onSelect(row)}
      className={cn(
        'flex flex-col items-center rounded-xl bg-card px-6 py-5 text-center ring-1 ring-foreground/10 transition-shadow hover:shadow-md',
        highlight ? 'scale-105 shadow-md ring-amber-300' : ''
      )}
    >
      <div className="text-2xl leading-none">{icon}</div>
      <Avatar
        src={row.userAvatar}
        name={row.name}
        className="my-3 h-16 w-16 text-lg"
      />
      <div className="font-semibold leading-tight">{row.name}</div>
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
        {row.className}
      </div>
      <div className="mt-2 text-3xl font-bold">{row.total}</div>
      <div className="mt-2 flex gap-1.5 text-xs">
        <span className="rounded-full bg-green-100 px-2 py-0.5 text-green-700">
          {row.easy}
        </span>
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-700">
          {row.medium}
        </span>
        <span className="rounded-full bg-red-100 px-2 py-0.5 text-red-700">
          {row.hard}
        </span>
      </div>
      <span className="sr-only">Rank {rank}</span>
    </button>
  );
}

export function Podium({
  rows,
  onSelect,
}: {
  rows: LeaderboardRow[];
  onSelect: (r: LeaderboardRow) => void;
}) {
  const top3 = rows.slice(0, 3);
  if (top3.length === 0) return null;

  // Display order: 2nd, 1st (center, highlighted), 3rd
  const order = [top3[1], top3[0], top3[2]];
  const ranks = [2, 1, 3];

  return (
    <div className="flex items-end justify-center gap-4">
      {order.map((row, i) =>
        row ? (
          <PodiumCard
            key={row.studentId}
            row={row}
            rank={ranks[i]}
            icon={ICONS[i]}
            highlight={ranks[i] === 1}
            onSelect={onSelect}
          />
        ) : null
      )}
    </div>
  );
}
